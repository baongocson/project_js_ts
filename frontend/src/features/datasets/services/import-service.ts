import { DataError, importCsv, type LogicalType } from '@dashboard/data-core';
import { ApiError } from '../../../shared/api';
import { datasetsApi, type ImportOptions } from '../api/datasets-api';
export function optionsFor(delimiter:ImportOptions['delimiter'],overrides:Record<number,LogicalType>):ImportOptions{return {delimiter,...(Object.keys(overrides).length?{columnTypes:Object.entries(overrides).map(([position,logicalType])=>({position:Number(position),logicalType}))}:{})};}
export function errorMessage(error:unknown){
  const message=error instanceof Error?error.message:'Không đọc được CSV';
  if(!(error instanceof ApiError||error instanceof DataError))return message;
  const issues=(error.details as {issues?:{code?:string;recordIndex?:number;lineStart?:number;lineEnd?:number;columnPosition?:number;message?:string}[]}|undefined)?.issues;
  return message+(issues?.length?' · '+issues.map(issue=>`${issue.code??''} · Record ${issue.recordIndex??'—'}, dòng ${issue.lineStart??'—'}–${issue.lineEnd??'—'}, cột ${issue.columnPosition??'—'}: ${issue.message??''}`).join('; '):'');
}

export async function readImportSource(file:File){
  if(file.size>16_000_000)throw new Error('CSV vượt 16.000.000 byte');
  return new Uint8Array(await file.arrayBuffer());
}
export function previewImport(source:Uint8Array,options:ImportOptions){
  return importCsv(source,options,()=>crypto.randomUUID());
}
export const importDataset = datasetsApi.import;
