export interface ProjectNameDto { name: string }
export interface ListProjectsQueryDto { page: number; limit: number; lifecycle?: 'empty' | 'ready'; sort: '-updatedAt' | 'updatedAt' | '-createdAt' | 'createdAt' | 'name' | '-name' }
