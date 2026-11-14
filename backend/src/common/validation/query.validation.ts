import { InputValidator, type RecordValue } from './validation';
import type { RowFilterDto } from '../../modules/projects/dto/workspace.dto';
export function queryObject(v: InputValidator, input: unknown, keys: readonly string[]): RecordValue {
  return v.object(input === undefined ? {} : input, 'query', keys);
}
export function queryInteger(v: InputValidator, value: unknown, path: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) { v.issue(path, 'Phải là tham số số nguyên dương'); return fallback; }
  const parsed = Number(value); v.integer(parsed, path, 1, max); return parsed;
}
export function queryNumber(v: InputValidator, value: unknown, path: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(value)) { v.issue(path, 'Phải là tham số số hữu hạn'); return fallback; }
  const parsed = Number(value); v.number(parsed, path, true); return parsed;
}
export function queryEnum(v: InputValidator, value: unknown, path: string, allowed: readonly string[], fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  v.enumeration(value, path, allowed); return value as string;
}
export function queryPage(v: InputValidator, obj: RecordValue, defaultLimit: number) {
  return { page: queryInteger(v, obj.page, 'page', 1), limit: queryInteger(v, obj.limit, 'limit', defaultLimit, 100) };
}
export function parseFilters(v: InputValidator, input: unknown, path = 'filters'): RowFilterDto[] {
  if (!Array.isArray(input)) { v.issue(path, 'Phải là danh sách điều kiện'); return []; }
  v.integer(input.length, path, 0, 20);
  input.forEach((entry, index) => {
    const p = `${path}.${index}`; const filter = v.object(entry, p, ['columnId', 'op', 'value']);
    v.id(filter.columnId, p + '.columnId');
    v.enumeration(filter.op, p + '.op', ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'contains', 'isMissing', 'isNotMissing']);
    if (filter.op === 'isMissing' || filter.op === 'isNotMissing') {
      if (Object.hasOwn(filter, 'value')) v.issue(p + '.value', 'Kiểm tra missing không nhận value');
    } else {
      const value = v.cell(filter.value, p + '.value');
      if (filter.op === 'contains' && value.kind !== 'text') v.issue(p + '.value', 'Contains chỉ áp dụng text');
      if (['lt', 'lte', 'gt', 'gte'].includes(filter.op as string) && !['number', 'date', 'datetime'].includes(value.kind)) v.issue(p + '.value', 'So thứ tự chỉ áp dụng number/date/datetime');
    }
  });
  return input as RowFilterDto[];
}
export function queryColumnIds(v: InputValidator, input: unknown, path: string): string[] | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== 'string' || !input) { v.issue(path, 'Phải là danh sách UUID phân cách bằng dấu phẩy'); return []; }
  const ids = input.split(','); v.ids(ids, path); return ids;
}

export function parseEmptyQuery(input:unknown):Record<string,never> {
 const v=new InputValidator();return v.finish(queryObject(v,input,[]) as Record<string,never>);
}
