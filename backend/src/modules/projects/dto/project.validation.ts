import { InputValidator } from '../../../common/validation/validation';
import { queryObject, queryPage, queryEnum } from '../../../common/validation/query.validation';
import type { ProjectNameDto, ListProjectsQueryDto } from './project.dto';
export function parseProjectName(input: unknown): ProjectNameDto {
  const v = new InputValidator(); const obj = v.object(input, '', ['name']);
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name || Array.from(name).length > 100) v.issue('name', 'Tên project phải dài 1–100 ký tự Unicode sau trim');
  return v.finish({ name });
}
export function parseListProjects(input: unknown): ListProjectsQueryDto {
  const v = new InputValidator(); const obj = queryObject(v, input, ['page', 'limit', 'lifecycle', 'sort']);
  const result = { ...queryPage(v, obj, 10),
    sort: queryEnum(v, obj.sort, 'sort', ['-updatedAt', 'updatedAt', '-createdAt', 'createdAt', 'name', '-name'], '-updatedAt'),
    ...(obj.lifecycle === undefined ? {} : { lifecycle: queryEnum(v, obj.lifecycle, 'lifecycle', ['empty', 'ready']) }),
  };
  return v.finish(result as ListProjectsQueryDto);
}
