import { Types } from 'mongoose';
import type { Column } from '@dashboard/data-core';
import type { WorkspaceStateDto } from '../../modules/projects/dto/workspace.dto';
import type { ImportOptionsDto } from '../../modules/datasets/dto/import-options.dto';
export interface ProjectRecord { _id: Types.ObjectId; ownerId: Types.ObjectId; name: string; lifecycle: 'empty' | 'ready' | 'deleting'; writeEpoch: number; createdAt: Date; updatedAt: Date }
export interface WorkspaceRecord extends WorkspaceStateDto { _id: Types.ObjectId; projectId: Types.ObjectId; boundVersionId: Types.ObjectId | null; revision: number; updatedAt: Date }
export interface DatasetRecord { _id: Types.ObjectId; projectId: Types.ObjectId; originalFile: { name: string; byteSize: number; sha256: string; importedAt: Date; storageKey: string }; importOptions: ImportOptionsDto; currentVersionId: Types.ObjectId | null; revision: number; lifecycle: 'importing' | 'ready'; createdAt: Date; updatedAt: Date }
export interface VersionRecord { _id: Types.ObjectId; datasetId: Types.ObjectId; versionNumber: number | null; parentVersionId: Types.ObjectId | null; restoredFromVersionId: Types.ObjectId | null; state: 'building' | 'staged' | 'published' | 'discarding'; rowCount: number; columnCount: number; encodedByteSize: number; contentHash: string | null; createdAt: Date; publishedAt: Date | null }
export interface ColumnRecord extends Column { _id: Types.ObjectId; versionId: Types.ObjectId }
