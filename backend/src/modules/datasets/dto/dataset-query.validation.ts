import { InputValidator } from '../../../common/validation/validation';
import { parseFilters, queryObject, queryPage } from '../../../common/validation/query.validation';
import type { RowsQueryDto } from './dataset-query.dto';
export function parseRowsQuery(input: unknown): RowsQueryDto {
 const v = new InputValidator(); const obj = queryObject(v, input, ['page', 'limit', 'sort', 'filters']);
 let sort: RowsQueryDto['sort'];
 if (obj.sort !== undefined) {
   if (typeof obj.sort !== 'string') v.issue('sort', 'Sort phải là chuỗi columnId:direction');
   else { const parts = obj.sort.split(':'); v.id(parts[0], 'sort.columnId'); v.enumeration(parts[1], 'sort.direction', ['asc', 'desc']);
     if (parts.length !== 2) v.issue('sort', 'Sort chỉ nhận một cột');
     sort = { columnId: parts[0], direction: parts[1] as 'asc' | 'desc' };
   }
 }
 let filters: unknown = [];
 if (obj.filters !== undefined) {
   if (typeof obj.filters !== 'string') v.issue('filters', 'Filter phải là JSON trong query');
   else { try { filters = JSON.parse(obj.filters); } catch { v.issue('filters', 'JSON filter không hợp lệ'); } }
 }
 return v.finish({ ...queryPage(v, obj, 10), ...(sort ? { sort } : {}), filters: parseFilters(v, filters) });
}
