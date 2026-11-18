import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { processSnapshot } from '@dashboard/data-core';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';
import { AnalysisRepository } from '../analysis/analysis.repository';
import { buildCandidates } from './ai-candidates';
import { AI_BATCH_SIZE, type SuggestionRequest } from './ai.contract';
import { OllamaService } from './ollama.service';

@Injectable()
export class AiService {
  constructor(private readonly ownership: OwnershipService, private readonly repository: AnalysisRepository, private readonly ollama: OllamaService) {}
  async suggest(principal: Principal, datasetId: string, versionId: string, request: SuggestionRequest, signal?: AbortSignal) {
    await this.ownership.dataset(datasetId, principal);
    await this.ownership.version(datasetId, versionId);
    if (!this.ollama.enabled) throw new ServiceUnavailableException({ code: 'AI_DISABLED', message: 'Chức năng gợi ý AI đang tắt.' });
    const { snapshot } = await this.repository.load(datasetId, versionId);
    signal?.throwIfAborted();
    const profile = buildCandidates(snapshot, request.group);
    const totalBatches = Math.max(1, Math.ceil(profile.candidates.length / AI_BATCH_SIZE));
    if (request.batch >= totalBatches) throw new BadRequestException({ code: 'AI_BATCH_INVALID', message: 'Lượt phân tích AI không tồn tại trong phiên bản dataset.' });
    // Every candidate is reachable; the UI follows nextBatch instead of truncating at the first 12.
    const offset = request.batch * AI_BATCH_SIZE;
    const candidates = profile.candidates.slice(offset, offset + AI_BATCH_SIZE);
    const choices = candidates.length ? await this.ollama.rank(request.group, profile.rowCount, candidates, signal) : [];
    signal?.throwIfAborted();
    const suggestions = choices.flatMap(choice => {
      const candidate = candidates.find(c => c.id === choice.id)!;
      // Dry-run is ephemeral. No publisher, history, outbox, or write repository is invoked.
      const result = processSnapshot(snapshot, candidate.specification);
      return result.canApply && !result.errors.length ? [{ ...candidate, reason: choice.reason }] : [];
    });
    return { versionId, group: request.group, columnIds: snapshot.columns.map(c => c.columnId), columnCount: profile.columnCount,
      model: this.ollama.model, generatedAt: new Date().toISOString(), rowCount: profile.rowCount,
      candidateCount: profile.candidates.length, reviewedCandidateCount: offset + candidates.length,
      batch: request.batch, totalBatches, nextBatch: request.batch + 1 < totalBatches ? request.batch + 1 : null, suggestions };
  }
}
