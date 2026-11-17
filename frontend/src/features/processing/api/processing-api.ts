import type { ProcessingSpecification } from '@dashboard/data-core';
import { requestJson } from '../../../shared/api';
import type { Preview,PreviewPage } from '../types';
export const processingApi={
  preview:(dataset:string,version:string,specification:ProcessingSpecification,key:string)=>requestJson<Preview>(`datasets/${dataset}/previews`,{method:'POST',json:{baseVersionId:version,specification},headers:{'Idempotency-Key':key}}),
  get:(dataset:string,preview:string,page:number,signal?:AbortSignal)=>requestJson<PreviewPage>(`datasets/${dataset}/previews/${preview}?page=${page}&limit=50`,{signal}),
  apply:(dataset:string,previewId:string,key:string)=>requestJson<{dataset:{currentVersionId:string;revision:number}}>(`datasets/${dataset}/operations`,{method:'POST',json:{previewId},headers:{'Idempotency-Key':key}}),
};
