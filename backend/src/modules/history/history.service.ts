import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { ProcessingSpecificationDto } from '../processing/dto/processing.dto';
import type { ImportOptionsDto } from '../datasets/dto/import-options.dto';
import type { OperationDto } from '../processing/dto/processing-response.dto';
import type { CommittedOperation } from '../processing/operation-writer.service';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';
import { DatasetsRepository } from '../datasets/datasets.repository';
import { DatasetsService } from '../datasets/datasets.service';
import { SnapshotPublisherService } from '../datasets/snapshot-publisher.service';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { assertRestoreTarget } from './restore-policy';
import { restoreSummary } from './restore-summary';
import { HistoryRepository } from './history.repository';
import type { HistoryQueryDto, RestoreVersionDto } from './dto/history.dto';
import type { HistoryResponseDto, RestoreVersionResponseDto } from './dto/history-response.dto';

function publicOperation(operation: CommittedOperation): OperationDto {
  const shared = {
    _id: operation._id.toHexString(), actorId: operation.actorId.toHexString(),
    resultVersionId: operation.resultVersionId.toHexString(), summary: operation.summary,
    createdAt: operation.createdAt.toISOString(),
  };
  if (operation.kind === 'import') return {
    ...shared, kind: 'import', baseVersionId: null,
    specification: operation.specification as { importOptions: ImportOptionsDto; fileSha256: string },
  };
  if (operation.kind === 'restore') return {
    ...shared, kind: 'restore', baseVersionId: operation.baseVersionId!.toHexString(),
    // MongoDB schema stores the restore target as BSON ObjectId; HTTP exposes hex string.
    specification: { targetVersionId: (operation.specification as { targetVersionId: Types.ObjectId }).targetVersionId.toHexString() },
  };
  return {
    ...shared, kind: 'process', baseVersionId: operation.baseVersionId!.toHexString(),
    specification: operation.specification as ProcessingSpecificationDto & { engineVersion: string },
  };
}

@Injectable()
export class HistoryService {
  constructor(
    private readonly repository: HistoryRepository,
    private readonly ownership: OwnershipService,
    private readonly datasetRecords: DatasetsRepository,
    private readonly datasets: DatasetsService,
    private readonly publisher: SnapshotPublisherService,
    private readonly receipts: IdempotencyService,
  ) {}

  async listOperations(principal: Principal, datasetId: string, query: HistoryQueryDto): Promise<HistoryResponseDto> {
    await this.ownership.dataset(datasetId, principal);
    const { items, total } = await this.repository.list(datasetId, query);
    return { items: items.map(publicOperation), page: query.page, limit: query.limit, total };
  }

  async restore(principal: Principal, datasetId: string, versionId: string, body: RestoreVersionDto, key: string): Promise<RestoreVersionResponseDto> {
    const ownerDataset = await this.ownership.dataset(datasetId, principal, true);
    const projectId = ownerDataset.projectId.toHexString();
    body = { expectedCurrentVersionId: body.expectedCurrentVersionId.toLowerCase() };
    // Receipt before stale/no-op checks: repeat of a successful restore must return the identical response.
    const claim = await this.receipts.claim(principal, projectId, `v1.datasets.${datasetId}.versions.restore`, key, { targetVersionId: versionId, ...body });
    if (claim.replay) return claim.body as RestoreVersionResponseDto;
    return this.receipts.run(claim.lease, async () => {
      const dataset = await this.datasetRecords.byId(datasetId);
      // A target must be published and belong to this exact dataset; no cross-dataset restore.
      const target = await this.datasetRecords.version(datasetId, versionId);
      const currentVersionId = dataset.currentVersionId?.toHexString();
      if (dataset.lifecycle !== 'ready' || !currentVersionId || currentVersionId !== body.expectedCurrentVersionId)
        throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản hiện tại đã thay đổi' });
      assertRestoreTarget({ _id: target.version._id.toHexString(), datasetId: target.version.datasetId.toHexString(), state: target.version.state }, datasetId, currentVersionId);
      const revision = dataset.revision;
      const [before, restored] = await Promise.all([
        this.datasets.readSnapshot(principal, datasetId, currentVersionId!),
        this.datasets.readSnapshot(principal, datasetId, versionId),
      ]);
      const summary = restoreSummary(before, restored);
      // Candidate is private until the BE-2 transactional publisher commits it.
      const candidateVersionId = await this.publisher.prepare(claim.lease, datasetId, currentVersionId!, restored, versionId);
      return this.publisher.publish(claim.lease, {
        datasetId, candidateVersionId, expectedCurrentVersionId: currentVersionId!, expectedRevision: revision,
        // processingOperations.specification.targetVersionId requires BSON ObjectId.
        kind: 'restore', specification: { targetVersionId: new Types.ObjectId(versionId) }, summary,
      }, (versionNumber, operationId, createdAt): RestoreVersionResponseDto => ({
        operation: { _id: operationId, kind: 'restore', baseVersionId: currentVersionId!, resultVersionId: candidateVersionId, createdAt: createdAt.toISOString() },
        newVersion: { _id: candidateVersionId, versionNumber, parentVersionId: currentVersionId!, restoredFromVersionId: versionId },
      }), async () => {});
    });
  }
}
