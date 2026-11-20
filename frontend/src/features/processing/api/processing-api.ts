import type { Cell } from '@dashboard/data-core';
import type { AiSuggestions, SuggestionsFetcher } from '../ai-suggestions';
import type { ProcessingSpecification } from '@dashboard/data-core';
import { requestJson } from '../../../shared/api';
import type { Preview,PreviewPage } from '../types';
export const processingApi={
  suggestions:(dataset:string,version:string,group:Parameters<SuggestionsFetcher>[0],batch:number,signal?:AbortSignal)=>requestJson<AiSuggestions>(`datasets/${dataset}/versions/${version}/ai/suggestions`,{method:'POST',json:{group,batch},signal,replay:'safe'}),
  categoryPage:(dataset:string,version:string,column:string,page:number)=>requestJson<{items:{value:Cell|null;isMissing:boolean}[];totalCategories:number;totalPages:number}>(`datasets/${dataset}/versions/${version}/analysis/columns/${column}/value-counts?page=${page}&limit=100&includeMissing=false`),
  preview:(dataset:string,version:string,specification:ProcessingSpecification,key:string)=>requestJson<Preview>(`datasets/${dataset}/previews`,{method:'POST',json:{baseVersionId:version,specification},headers:{'Idempotency-Key':key}}),
  get:(dataset:string,preview:string,page:number,signal?:AbortSignal)=>requestJson<PreviewPage>(`datasets/${dataset}/previews/${preview}?page=${page}&limit=50`,{signal}),
  apply:(dataset:string,previewId:string,key:string)=>requestJson<{dataset:{currentVersionId:string;revision:number}}>(`datasets/${dataset}/operations`,{method:'POST',json:{previewId},headers:{'Idempotency-Key':key}}),
};
