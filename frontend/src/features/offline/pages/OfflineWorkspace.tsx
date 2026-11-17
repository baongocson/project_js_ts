import { useEffect,useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImportWizard } from '../../datasets';
import { localVersion } from '../processing-adapter';
import { projectStore, type LocalProject } from '../project-store';
import { createLocalProject, restoreLocalProject, ProjectApi, syncLocalProject } from '../project-sync';
import { AccountActions, session, useSession } from '../../auth';
import { LocalWorkspacePane } from '../components/LocalWorkspacePane';
import { BackupImporter,ProjectRecovery } from '../components/ProjectRecovery';
import { SyncCenter } from '../components/SyncCenter';
import { subscribeProjectProgress } from '../project-events';
import { inspectLocalAccount,withLocalAccountLock } from '../account-safety';
import { requestJson } from '../../../shared/api';

export function OfflineWorkspace(){
  const currentSession=useSession(),id=useId();
  const [projects,setProjects]=useState<LocalProject[]>([]),[selected,setSelected]=useState('');
  const [name,setName]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const token=session.accessToken()??'',account=currentSession.user?.email??'';
  const [message,setMessage]=useState('Sẵn sàng lưu CSV và xử lý khi mất mạng'),[busy,setBusy]=useState(false);
  const [restoreTarget,setRestoreTarget]=useState('0');
  const current=projects.find(project=>project.id===selected)??projects[0];
  async function reload(id?:string){const all=await projectStore.list();setProjects(all);if(id)setSelected(id);}
  useEffect(()=>{void projectStore.list().then(setProjects).catch(error=>setMessage(String(error)));if('serviceWorker' in navigator)void navigator.serviceWorker.register('/offline-worker.js').catch(error=>setMessage(String(error)));},[]);
  useEffect(()=>subscribeProjectProgress(event=>{if(event.removed)void projectStore.list().then(setProjects).catch(error=>setMessage(String(error)));}),[]);
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('Đang thực hiện…');try{await work();}catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function authenticate(kind:'register'|'login'|'refresh'){
    if(kind==='register'){await requestJson('auth/register',{method:'POST',auth:false,credentials:'include',json:{email,password}});setMessage('Đã đăng ký; chọn Đăng nhập để tiếp tục');}
    else {if(kind==='login')await session.login({email,password});else await session.recover();setPassword('');setMessage('Đã đăng nhập');}
  }
  return <main className="workspace local-workspace">
    <Link to="/">Về trang chủ</Link><h1>Dữ liệu offline và đồng bộ</h1>
    <p>CSV gốc và thay đổi được lưu trên thiết bị này. Chỉ báo đồng bộ khi server xác nhận; bản local được giữ khi có xung đột.</p>
    <p role="status" aria-live="polite">{message}</p>
    <section><h2>Tài khoản đồng bộ</h2><p>{account?`Tài khoản: ${account}`:'Chưa đăng nhập'}</p>
      <label>Email <input type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>Mật khẩu <input type="password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('register'))}>Đăng ký</button>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('login'))}>Đăng nhập</button>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('refresh'))}>Khôi phục phiên</button>
      <AccountActions inspectLocal={inspectLocalAccount} withAccountLock={withLocalAccountLock} disabled={busy} deleteLabel="Xóa tài khoản server" onComplete={async (_action,notice)=>{await reload();setMessage(notice);}}/>
    </section>
    <section><h2>Tạo dữ liệu offline</h2>
      <label>Tên project <input value={name} onChange={event=>setName(event.target.value)}/></label>
      <ImportWizard local disabled={busy} onImportLocal={async(file,options,key)=>{const project=await createLocalProject(file,name,options,key);await reload(project.id);setMessage('Đã lưu CSV offline');}}/>
      <label htmlFor={`${id}-project`}>Project đã lưu</label><select id={`${id}-project`} value={current?.id??''} onChange={event=>{setSelected(event.target.value);}}>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <button disabled={busy} onClick={()=>void action(async()=>{await reload();setMessage('Đã tải lại dữ liệu local');})}>Tải lại dữ liệu local</button>
    </section>
    <BackupImporter onImported={async project=>{await reload(project.id);setMessage('Đã phục hồi backup trên thiết bị; chưa gửi lên server');}}/>
    {current&&<>
      <SyncCenter project={current} busy={busy} authenticated={!!token} onReload={()=>reload(current.id)} onMessage={setMessage} onSync={()=>void action(async()=>{const result=await syncLocalProject(current.id,new ProjectApi(()=>token));await reload(current.id);setMessage(result.status==='synced'?'Đã đồng bộ và xác minh dữ liệu server':`Chưa đồng bộ: ${result.error}`);})}/>
      <ProjectRecovery project={current} onChanged={()=>reload(current.id)} onRemoved={()=>reload()} onMessage={setMessage}/>
      <div className="local-project-heading"><p className="eyebrow">LOCAL WORKSPACE</p><h2>Workspace · {current.name}</h2><p>{current.snapshot.rows.length} dòng · {current.snapshot.columns.length} cột · Lưu trên thiết bị</p></div>
      <LocalWorkspacePane key={`${current.id}:${localVersion(current)}`} project={current} onApplied={async()=>{await reload(current.id);setMessage('Đã lưu thay đổi offline');}}
        history={<section><h2>Lịch sử local</h2>{current.operations.length>0?<>
        <label>Phiên bản khôi phục <select value={restoreTarget} onChange={event=>setRestoreTarget(event.target.value)}><option value="0">CSV ban đầu</option>{current.operations.slice(0,-1).map((operation,index)=><option key={operation.id} value={index+1}>Bước {index+1} · {operation.kind}</option>)}</select></label>
        <button disabled={busy} onClick={()=>void action(async()=>{await restoreLocalProject(current.id,Number(restoreTarget));await reload(current.id);setMessage('Đã lưu restore offline');})}>Khôi phục offline</button>
        <ol className="history-list">{current.operations.map((operation,index)=><li key={operation.id}>Bước {index+1} · {operation.kind==='process'?operation.specification.method:'Khôi phục phiên bản'}</li>)}</ol>
        </>:<p>CSV gốc đã được lưu. Chưa có thao tác xử lý.</p>}</section>}/>

    </>}
  </main>;
}
