import { openProjectDatabase } from './project-store';
export async function workspaceTransaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>){
  const db=await openProjectDatabase();
  try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('workspaces',mode),request=work(tx.objectStore('workspaces'));let value:T;request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Không lưu được workspace local'));});}finally{db.close();}
}
