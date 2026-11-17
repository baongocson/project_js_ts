import type { Column,WorkspaceState } from '@dashboard/data-core';
export interface Project { _id:string;name:string;lifecycle:'empty'|'ready';createdAt?:string;updatedAt:string }
export type { RowFilter } from '@dashboard/data-core';
export interface Workspace extends WorkspaceState {_id:string;revision:number;boundVersionId:string|null;updatedAt:string}
export interface Dataset { _id:string;currentVersionId:string;revision:number;originalFile:{name:string;byteSize:number;sha256:string;importedAt:string} }
export interface Adjustment { code:string;path:string;reason:string }
export interface ProjectDetail { project:Project;workspace:Workspace;dataset:Dataset|null;workspaceAdjusted:boolean;adjustments:Adjustment[] }
export interface Page<T> { items:T[];page:number;limit:number;total:number }
export interface VersionMetadata { version:{_id:string;versionNumber:number;rowCount:number;columnCount:number;encodedByteSize:number};columns:Column[] }
