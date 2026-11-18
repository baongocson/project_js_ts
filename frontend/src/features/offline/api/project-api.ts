import { type Snapshot, type Column } from '@dashboard/data-core';

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
