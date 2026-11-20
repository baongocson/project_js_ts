import { useId, useRef, useState, type FormEvent } from 'react';
import type { LogicalType, Snapshot } from '@dashboard/data-core';
import { optionsFor,errorMessage,readImportSource,previewImport,importDataset } from '../services/import-service';

import { type ImportOptions } from '../api/datasets-api';

type Props={disabled?:boolean}&({local?:false;projectId:string;onImported():Promise<void>}|{local:true;onImportLocal(file:File,options:ImportOptions,key:string):Promise<void>});
export type ImportWizardProps = Props;
export function useImportWizard(props:Props){
  const id=useId(),input=useRef<HTMLInputElement>(null),inspection=useRef(0);
  const [file,setFile]=useState<File>(),[delimiter,setDelimiter]=useState<ImportOptions['delimiter']>(','),[preview,setPreview]=useState<Snapshot>(),[inferred,setInferred]=useState<Snapshot>(),[source,setSource]=useState<Uint8Array>();
  const [overrides,setOverrides]=useState<Record<number,LogicalType>>({}),[error,setError]=useState(''),[working,setWorking]=useState(false),[inspecting,setInspecting]=useState(false);
  const pending=useRef<{file:File;payload:string;key:string}|undefined>(undefined),submitting=useRef(false);
  const busy=working||!!props.disabled;
  async function inspect(next:File|undefined,separator:ImportOptions['delimiter']){
    const stamp=++inspection.current;setFile(next);setDelimiter(separator);setPreview(undefined);setInferred(undefined);setSource(undefined);setOverrides({});setError('');if(!next){setInspecting(false);return;}setInspecting(true);
    try{const bytes=await readImportSource(next);if(stamp!==inspection.current)return;const snapshot=previewImport(bytes,{delimiter:separator});setSource(bytes);setInferred(snapshot);setPreview(snapshot);}
    catch(error){if(stamp===inspection.current)setError(errorMessage(error));}
    finally{if(stamp===inspection.current)setInspecting(false);}
  }
  function override(position:number,type:string){
    if(!source)return;const next={...overrides};if(type)next[position]=type as LogicalType;else delete next[position];setOverrides(next);setError('');
    try{setPreview(previewImport(source,optionsFor(delimiter,next)));}catch(error){setPreview(undefined);setError(errorMessage(error));}
  }
  async function submit(event:FormEvent){
    event.preventDefault();if(!file||!preview||busy||inspecting||submitting.current)return;submitting.current=true;setWorking(true);setError('');
    const options=optionsFor(delimiter,overrides),payload=JSON.stringify(options);if(pending.current?.file!==file||pending.current.payload!==payload)pending.current={file,payload,key:crypto.randomUUID()};
    try{
      if(props.local){await props.onImportLocal(file,options,pending.current.key);setFile(undefined);setPreview(undefined);setInferred(undefined);setSource(undefined);setOverrides({});if(input.current)input.current.value='';}
      else{await importDataset(props.projectId,file,options,pending.current.key);await props.onImported();}
      pending.current=undefined;
    }catch(error){setError(errorMessage(error));}
    finally{submitting.current=false;setWorking(false);}
  }

  return {props,id,input,file,delimiter,preview,inferred,overrides,error,working,inspecting,busy,inspect,override,submit};
}
export type ImportWizardModel = ReturnType<typeof useImportWizard>;
