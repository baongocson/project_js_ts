import { InputValidator } from '../../common/validation/validation';

export const AI_GROUPS = ['cleaning', 'missing', 'outliers', 'scaling', 'transformation', 'encoding'] as const;
export type AiGroup = typeof AI_GROUPS[number];
export const AI_BATCH_SIZE = 12;
export interface SuggestionRequest { group: AiGroup; batch: number }
export function parseSuggestionRequest(input: unknown): SuggestionRequest {
  const v = new InputValidator(), obj = v.object(input, '', ['group', 'batch']);
  v.enumeration(obj.group, 'group', AI_GROUPS);
  const batch = obj.batch === undefined ? 0 : obj.batch;
  v.integer(batch, 'batch', 0, 1000);
  return v.finish({ group: obj.group as AiGroup, batch: batch as number });
}
