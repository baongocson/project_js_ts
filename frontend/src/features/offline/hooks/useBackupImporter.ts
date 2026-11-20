import { useState } from 'react';

import { type LocalProject } from '../repositories/project-store';
import { importProjectBackup, parseProjectBackup } from '../services/project-backup';

export type BackupImporterProps = {onImported(project:LocalProject):Promise<void>};
export function useBackupImporter({onImported}:{onImported(project:LocalProject):Promise<void>}){
  const [file,setFile]=useState<File>(),[preview,setPreview]=useState<LocalProject>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function inspect(next?:File){setFile(next);setPreview(undefined);setError('');if(!next)return;setBusy(true);try{setPreview(await parseProjectBackup(await next.text()));}catch(error){setError(error instanceof Error?error.message:'Không đọc được backup');}finally{setBusy(false);}}
  async function restore(){if(!file||busy)return;setBusy(true);setError('');try{const project=await importProjectBackup(file);await onImported(project);setPreview(undefined);setFile(undefined);}catch(error){setError(error instanceof Error?error.message:'Không phục hồi được backup');}finally{setBusy(false);}}

  return {preview,error,busy,inspect,restore};
}
export type BackupImporterModel = ReturnType<typeof useBackupImporter>;
