import type { Column,Row,LogicalType } from '@dashboard/data-core';
import { requestJson } from '../../../shared/api';
export interface ImportOptions {delimiter:','|';'|'\t';columnTypes?:{position:number;logicalType:LogicalType}[]}
export interface Metadata {version:{_id:string;versionNumber:number;rowCount:number;columnCount:number};columns:Column[]}
export interface RowsResult {rows:Row[];page:number;limit:number;totalRows:number;filteredRows:number;totalPages:number}
export const datasetsApi={
  metadata:(dataset:string,version:string,signal?:AbortSignal)=>requestJson<Metadata>(`datasets/${dataset}/versions/${version}`,{signal}),
  rows:(dataset:string,version:string,query:URLSearchParams,signal?:AbortSignal)=>requestJson<RowsResult>(`datasets/${dataset}/versions/${version}/rows?${query}`,{signal}),
  row:(dataset:string,version:string,rowId:string,signal?:AbortSignal)=>requestJson<{row:Row}>(`datasets/${dataset}/versions/${version}/rows/${rowId}`,{signal}),
  import:(project:string,file:File,options:ImportOptions,key:string)=>{
    const form=new FormData();form.set('file',file);form.set('importOptions',JSON.stringify(options));
    return requestJson<{dataset:{_id:string;currentVersionId:string}}>(`projects/${project}/datasets`,{method:'POST',body:form,headers:{'Idempotency-Key':key}});
  },
};
