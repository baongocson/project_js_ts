import type { RowFilterDto } from '../../projects/dto/workspace.dto';
export interface RowsQueryDto { page: number; limit: number; sort?: { columnId: string; direction: 'asc' | 'desc' }; filters: RowFilterDto[] }
