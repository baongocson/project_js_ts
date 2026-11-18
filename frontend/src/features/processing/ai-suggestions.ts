import type { ProcessingSpecification } from '@dashboard/data-core';
import type { ProcessingGroup } from '../../shared/ui';
import { makeSpecification, methodGroups } from './methods';

export interface AiSuggestion { id: string; specification: ProcessingSpecification; evidence: string; caution: string; reason: string }
export interface AiSuggestions {
  versionId: string; group: ProcessingGroup; columnIds: string[]; columnCount: number; model: string; generatedAt: string; rowCount: number;
  candidateCount: number; reviewedCandidateCount: number; batch: number; totalBatches: number; nextBatch: number | null; suggestions: AiSuggestion[];
}
export type SuggestionsFetcher = (group: ProcessingGroup, signal: AbortSignal, batch?: number) => Promise<AiSuggestions>;
/** Follow every batch; never mark a partial/failed scan as complete. */
export async function scanSuggestions(fetcher: SuggestionsFetcher, group: ProcessingGroup, columnIds: string[], signal: AbortSignal, onProgress: (data: AiSuggestions) => void): Promise<void> {
  let batch = 0, previous: AiSuggestions | undefined;
  const seen = new Set<string>();
  for (;;) {
    signal.throwIfAborted();
    const data = await fetcher(group, signal, batch);
    signal.throwIfAborted();
    if (data.group !== group || data.batch !== batch || JSON.stringify(data.columnIds) !== JSON.stringify(columnIds)
      || data.columnCount !== columnIds.length || !Number.isSafeInteger(data.totalBatches) || data.totalBatches < 1
      || !Number.isSafeInteger(data.candidateCount) || data.candidateCount < 0
      || !Number.isSafeInteger(data.reviewedCandidateCount) || data.reviewedCandidateCount < 0 || data.reviewedCandidateCount > data.candidateCount
      || (data.nextBatch === null && data.reviewedCandidateCount !== data.candidateCount)
      || (data.nextBatch !== null && data.reviewedCandidateCount >= data.candidateCount)
      || (previous && data.reviewedCandidateCount <= previous.reviewedCandidateCount)
      || data.nextBatch !== (batch + 1 < data.totalBatches ? batch + 1 : null)
      || (previous && (data.versionId !== previous.versionId || data.candidateCount !== previous.candidateCount || data.totalBatches !== previous.totalBatches))) throw new Error('Ngữ cảnh phân tích AI đã thay đổi; hãy phân tích lại dataset.');
    for (const suggestion of data.suggestions) { if (seen.has(suggestion.id)) throw new Error('AI trả gợi ý trùng giữa các lượt phân tích.'); seen.add(suggestion.id); }
    previous = { ...data, suggestions: [...(previous?.suggestions ?? []), ...data.suggestions] };
    onProgress(previous);
    if (data.nextBatch === null) return;
    batch = data.nextBatch;
  }
}
/** Revalidate at the UI boundary before touching form state or creating a preview. */
export function suggestionSpecification(suggestion: AiSuggestion, group: ProcessingGroup, availableColumns: string[]): ProcessingSpecification {
  const spec = suggestion.specification;
  if (!methodGroups[group].includes(spec.method)) throw new Error('Gợi ý không thuộc nhóm xử lý hiện tại.');
  if (spec.scope.type === 'cell') throw new Error('Gợi ý phải áp dụng cho cột hoặc dataset.');
  if (spec.scope.type === 'dataset' && spec.method !== 'remove_duplicates') throw new Error('Gợi ý chỉ được mở rộng toàn dataset khi xét dòng trùng.');
  if (spec.scope.type === 'columns' && spec.scope.columnIds.some(id => !availableColumns.includes(id))) throw new Error('Cột gợi ý không còn hợp lệ.');
  return makeSpecification(spec.method, spec.parameters, spec.scope);
}
