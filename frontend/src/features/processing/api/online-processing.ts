

import type { Cell } from '@dashboard/data-core';

import { requestJson } from '../../../shared/api';
import { processingApi } from './processing-api';

import type { ProcessingAdapter } from '../types';

import type { AiSuggestions } from '../ai-suggestions';

export function onlineProcessing(datasetId:string,versionId:string):ProcessingAdapter{
  return {
    suggestions:async(group,signal,batch=0)=>{
      const data=await requestJson<AiSuggestions>(`datasets/${datasetId}/versions/${versionId}/ai/suggestions`,{method:'POST',json:{group,batch},signal,replay:'safe'});
      if(data.versionId!==versionId)throw new Error('Gợi ý thuộc phiên bản dữ liệu khác; hãy tải lại.');
      return data;
    },
    preview:(spec,key)=>processingApi.preview(datasetId,versionId,spec,key),
    get:(id,page)=>processingApi.get(datasetId,id,page),
    apply:(id,key)=>processingApi.apply(datasetId,id,key),
    categories:async column=>{
      const values:Cell[]=[];
      for(let page=1;;page++){
        const data=await requestJson<{items:{value:Cell|null;isMissing:boolean}[];totalCategories:number;totalPages:number}>(`datasets/${datasetId}/versions/${versionId}/analysis/columns/${column}/value-counts?page=${page}&limit=100&includeMissing=false`);
        if(data.totalCategories>5000)throw new Error('Vượt 5000 category; không thể tạo mapping ordinal');
        values.push(...data.items.filter(item=>!item.isMissing&&item.value).map(item=>item.value!));
        if(page>=data.totalPages)return values;
      }
    },
  };
}
