import { InputValidator } from './validation';
export type ResourceParamsDto = Partial<Record<'projectId'|'datasetId'|'versionId'|'previewId'|'rowId'|'columnId', string>>;
export function resourceParams(keys: readonly string[]) {
  return (input: unknown): ResourceParamsDto => {
    const v = new InputValidator(); const obj = v.object(input, 'params', keys);
    for (const key of keys) v.id(obj[key], key, key === 'rowId' || key === 'columnId' ? 'uuid' : 'objectId');
    return v.finish(obj as ResourceParamsDto);
  };
}
export function parseIdempotencyKey(input: unknown): string {
  const v = new InputValidator();
  if (typeof input !== 'string' || input.length < 1 || input.length > 128 || !input.trim()) v.issue('Idempotency-Key', 'Cần Idempotency-Key dài 1–128 ký tự, không chỉ khoảng trắng');
  return v.finish(input as string);
}
