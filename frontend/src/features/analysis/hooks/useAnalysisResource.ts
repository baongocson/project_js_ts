import { useEffect, useState } from 'react';

export type {AnalysisSettings} from '../types';
type Loader<T>=(signal:AbortSignal)=>Promise<T>;
export function useResource<T>(load:Loader<T>,keepPrevious=false){
  const [generation,setGeneration]=useState(0),[result,setResult]=useState<{load:Loader<T>;generation:number;data?:T;error?:string}>();
  useEffect(()=>{const abort=new AbortController();void Promise.resolve().then(()=>load(abort.signal)).then(data=>{if(!abort.signal.aborted)setResult({load,generation,data});}).catch(error=>{if(!abort.signal.aborted)setResult({load,generation,error:error instanceof Error?error.message:'Không đọc được phân tích'});});return()=>abort.abort();},[load,generation]);
  const current=result?.load===load&&result.generation===generation?result:undefined;
  return {data:current?.data??(keepPrevious?result?.data:undefined),error:current?.error,busy:!current,retry:()=>setGeneration(value=>value+1)};
}
