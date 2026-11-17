import type { Cell,ProcessingSummary,SchemaChanges } from '@dashboard/data-core';
export interface Diagnostics {errorCount:number;warningCount:number;errors:{code:string;message:string;rowId?:string;columnId?:string}[];warnings:{code:string;message:string;rowId?:string;columnId?:string}[];truncated:boolean}
export interface Preview {previewId:string;status:'ready'|'invalid'|'applied';canApply:boolean;baseVersionId:string;candidateVersionId:string|null;engineVersion:string;specHash:string;summary:ProcessingSummary;schemaChanges:SchemaChanges;diagnostics:Diagnostics;expiresAt:string}
export interface PreviewChange {rowId:string;ordinal:number;changeKind:'updated'|'deleted'|'inserted';beforePosition:number|null;afterPosition:number|null;beforeCells:Record<string,Cell>|null;afterCells:Record<string,Cell>|null;diffColumnIds:string[]}
export interface PreviewPage {preview:Preview;changes:PreviewChange[];page:number;limit:number;totalChanges:number;totalPages:number}
/** A local adapter can prove that Apply was rejected before any write. */
export class PreviewRejected extends Error {}
