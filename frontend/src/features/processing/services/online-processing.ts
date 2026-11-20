

import type { Cell } from '@dashboard/data-core';


import { processingApi } from '../api/processing-api';

import type { ProcessingAdapter } from '../types';



export function onlineProcessing(datasetId:string,versionId:string):ProcessingAdapter{
  return {
    suggestions:async(group,signal,batch=0)=>{
      const data=await processingApi.suggestions(datasetId,versionId,group,batch,signal);
      if(data.versionId!==versionId)throw new Error('Gợi ý thuộc phiên bản dữ liệu khác; hãy tải lại.');
      return data;
    },
    preview:(spec,key)=>processingApi.preview(datasetId,versionId,spec,key),
    get:(id,page)=>processingApi.get(datasetId,id,page),
    apply:(id,key)=>processingApi.apply(datasetId,id,key),
    categories:async column=>{
      const values:Cell[]=[];
      for(let page=1;;page++){
        const data=await processingApi.categoryPage(datasetId,versionId,column,page);
        if(data.totalCategories>5000)throw new Error('Vượt 5000 category; không thể tạo mapping ordinal');
        values.push(...data.items.filter(item=>!item.isMissing&&item.value).map(item=>item.value!));
        if(page>=data.totalPages)return values;
      }
    },
  };
}
