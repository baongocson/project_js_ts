import type { OfflineWorkspaceModel } from '../hooks/useOfflineWorkspace';

import { Link } from 'react-router-dom';
import { ImportWizard } from '../../datasets';
import { localVersion } from '../processing-adapter';

import { AccountActions } from '../../auth';
import { LocalWorkspacePane } from './LocalWorkspacePane';
import { BackupImporter, ProjectRecovery } from './ProjectRecovery';
import { SyncCenter } from './SyncCenter';

import { inspectLocalAccount, withLocalAccountLock } from '../account-safety';

export function OfflineWorkspaceView(model:OfflineWorkspaceModel){
  const {id,projects,setSelected,name,setName,email,setEmail,password,setPassword,token,account,message,setMessage,busy,restoreTarget,setRestoreTarget,current,reload,action,authenticate,onAccountComplete,importLocalCsv,reloadLocalProjects,onBackupImported,syncSelectedProject,onLocalApplied,restoreSelectedVersion}=model;

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
      <AccountActions inspectLocal={inspectLocalAccount} withAccountLock={withLocalAccountLock} disabled={busy} deleteLabel="Xóa tài khoản server" onComplete={onAccountComplete}/>
    </section>
    <section><h2>Tạo dữ liệu offline</h2>
      <label>Tên project <input value={name} onChange={event=>setName(event.target.value)}/></label>
      <ImportWizard local disabled={busy} onImportLocal={importLocalCsv}/>
      <label htmlFor={`${id}-project`}>Project đã lưu</label><select id={`${id}-project`} value={current?.id??''} onChange={event=>{setSelected(event.target.value);}}>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <button disabled={busy} onClick={reloadLocalProjects}>Tải lại dữ liệu local</button>
    </section>
    <BackupImporter onImported={onBackupImported}/>
    {current&&<>
      <SyncCenter project={current} busy={busy} authenticated={!!token} onReload={()=>reload(current.id)} onMessage={setMessage} onSync={syncSelectedProject}/>
      <ProjectRecovery project={current} onChanged={()=>reload(current.id)} onRemoved={()=>reload()} onMessage={setMessage}/>
      <div className="local-project-heading"><p className="eyebrow">LOCAL WORKSPACE</p><h2>Workspace · {current.name}</h2><p>{current.snapshot.rows.length} dòng · {current.snapshot.columns.length} cột · Lưu trên thiết bị</p></div>
      <LocalWorkspacePane key={`${current.id}:${localVersion(current)}`} project={current} onApplied={onLocalApplied}
        history={<section><h2>Lịch sử local</h2>{current.operations.length>0?<>
        <label>Phiên bản khôi phục <select value={restoreTarget} onChange={event=>setRestoreTarget(event.target.value)}><option value="0">CSV ban đầu</option>{current.operations.slice(0,-1).map((operation,index)=><option key={operation.id} value={index+1}>Bước {index+1} · {operation.kind}</option>)}</select></label>
        <button disabled={busy} onClick={restoreSelectedVersion}>Khôi phục offline</button>
        <ol className="history-list">{current.operations.map((operation,index)=><li key={operation.id}>Bước {index+1} · {operation.kind==='process'?operation.specification.method:'Khôi phục phiên bản'}</li>)}</ol>
        </>:<p>CSV gốc đã được lưu. Chưa có thao tác xử lý.</p>}</section>}/>

    </>}
  </main>;
}