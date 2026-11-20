import { type Snapshot, type Column, type CsvOptions, type ProcessingSpecification } from '@dashboard/data-core';

import { SyncHttpError } from '../types';
import { requestJson, ApiError } from '../../../shared/api';

export type Json=Record<string,unknown>;
export function object(value:unknown):Json{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('SERVER_RESPONSE_INVALID');return value as Json;}
export function objectId(value:unknown):string{if(typeof value!=='string'||! /^[a-f0-9]{24}$/i.test(value))throw new Error('SERVER_RECEIPT_ID_INVALID');return value.toLowerCase();}
export class ProjectApi {
  private owner:string|undefined;
  constructor(private readonly token:()=>string){}
  bindOwner(userId:string){if(this.owner&&this.owner!==userId)throw new SyncHttpError(403,'SYNC_ACCOUNT_MISMATCH','Tài khoản đã đổi trong lần đồng bộ');this.owner=userId;}
  async request(path:string,options:RequestInit={}):Promise<Json>{
    const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${this.token()}`);
    try{return await requestJson<Json>(path,{...options,headers,expectedUserId:this.owner})??{};}
    catch(error){if(error instanceof ApiError)throw new SyncHttpError(error.status,error.code,error.message,error.retryAfter);throw error;}
  }
  post(path:string,body:unknown,key:string){return this.request(path,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});}
  me(){return this.request('users/me');}
  detail(projectId:string){return this.request(`projects/${projectId}`);}
  create(name:string,key:string){return this.post('projects',{name},key);}
  importSource(projectId:string,source:Uint8Array,fileName:string,options:CsvOptions|undefined,key:string){
    const form=new FormData();form.set('importOptions',JSON.stringify(options??{}));form.set('file',new Blob([new Uint8Array(source)],{type:'text/csv'}),fileName);
    return this.request(`projects/${projectId}/datasets`,{method:'POST',headers:{'Idempotency-Key':key},body:form});
  }
  preview(dataset:string,version:string,specification:ProcessingSpecification,key:string){return this.post(`datasets/${dataset}/previews`,{baseVersionId:version,specification},key);}
  previewPage(dataset:string,preview:string,page:number){return this.request(`datasets/${dataset}/previews/${preview}?page=${page}&limit=100`);}
  apply(dataset:string,previewId:string|undefined,key:string){return this.post(`datasets/${dataset}/operations`,{previewId},key);}
  restore(dataset:string,target:string,expectedCurrentVersionId:string|undefined,key:string){return this.post(`datasets/${dataset}/versions/${target}/restore`,{expectedCurrentVersionId},key);}
  async snapshot(dataset:string,version:string):Promise<Snapshot>{
    const meta=await this.request(`datasets/${dataset}/versions/${version}`);
    const rows:Snapshot['rows']=[];let total:number|undefined;
    for(let page=1;total===undefined||rows.length<total;page++){
      const result=await this.request(`datasets/${dataset}/versions/${version}/rows?page=${page}&limit=100`);
      if(!Array.isArray(result.rows)||!Number.isSafeInteger(result.totalRows))throw new Error('SERVER_ROWS_INVALID');
      if(total!==undefined&&total!==result.totalRows)throw new Error('SERVER_ROWS_CHANGED');
      total=Number(result.totalRows);
      if(total>rows.length&&!result.rows.length)throw new Error('SERVER_ROWS_INCOMPLETE');
      rows.push(...result.rows as Snapshot['rows']);
    }
    return {columns:meta.columns as Column[],rows};
  }
}
