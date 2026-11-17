import { Injectable } from '@nestjs/common';
import { DatasetsRepository } from '../datasets/datasets.repository';

/** All reads are of published immutable versions; ownership is verified by AnalysisService. */
@Injectable()
export class AnalysisRepository {
  constructor(private readonly datasets: DatasetsRepository) {}
  async load(datasetId: string, versionId: string) {
    const [dataset, snapshot] = await Promise.all([
      this.datasets.byId(datasetId), this.datasets.snapshot(datasetId, versionId),
    ]);
    return {snapshot, originalByteSize: dataset.originalFile.byteSize};
  }
}
