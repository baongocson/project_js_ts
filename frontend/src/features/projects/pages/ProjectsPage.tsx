import { useEffect,useRef,useState,type FormEvent } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { ApiError } from '../../../shared/api';
import { Button,Field,Feedback,Dialog } from '../../../shared/ui';
import { projectsApi } from '../api/projects-api';
import type { Project,Page } from '../types';

export function ProjectsPage(){
  const navigate=useNavigate();
  const [page,setPage]=useState(1),[sort,setSort]=useState('-updatedAt'),[revision,setRevision]=useState(0);
  const [data,setData]=useState<Page<Project>>(),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState<Project>();
  const [renaming,setRenaming]=useState<Project>(),[rename,setRename]=useState('');
  const pending=useRef<{name:string;key:string}|undefined>(undefined),working=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    void(async()=>{setLoading(true);setError('');try{setData(await projectsApi.list(new URLSearchParams({page:String(page),limit:'12',sort}),controller.signal));}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Không tải được project');}finally{if(!controller.signal.aborted)setLoading(false);}})();
    return()=>controller.abort();
  },[page,sort,revision]);
  async function create(event:FormEvent){
    event.preventDefault();if(working.current)return;
    const value=name.trim();if(!value||Array.from(value).length>100){setError('Tên project cần dài 1–100 ký tự');return;}
    if(pending.current?.name!==value)pending.current={name:value,key:crypto.randomUUID()};
    working.current=true;setBusy(true);setError('');
    try{const result=await projectsApi.create(value,pending.current.key);pending.current=undefined;await navigate(`/projects/${result.project._id}`);}
    catch(error){setError(error instanceof Error?error.message:'Không tạo được project');if(error instanceof ApiError&&error.status<500&&error.code!=='IDEMPOTENCY_PENDING')pending.current=undefined;}
    finally{working.current=false;setBusy(false);}
  }
  async function mutate(work:()=>Promise<unknown>){if(working.current)return;working.current=true;setBusy(true);setError('');try{await work();setRenaming(undefined);setDeleting(undefined);setRevision(value=>value+1);}catch(error){setError(error instanceof Error?error.message:'Không hoàn tất yêu cầu');}finally{working.current=false;setBusy(false);}}
  return <main><div className="page-heading"><div><p className="eyebrow">KHÔNG GIAN LÀM VIỆC</p><h1>Projects</h1><p className="muted">Quản lý dữ liệu và các phiên bản phân tích trên server.</p></div><Link className="button secondary" to="/offline">Làm việc offline</Link></div>
    <form className="panel inline-form" onSubmit={event=>{void create(event);}}><Field label="Tên project mới" value={name} onChange={event=>setName(event.target.value)} disabled={busy} maxLength={200}/><Button type="submit" disabled={busy}>{busy?'Đang tạo…':'Tạo project'}</Button></form>
    <div className="toolbar"><label htmlFor="project-sort">Sắp xếp</label><select id="project-sort" value={sort} onChange={event=>{setSort(event.target.value);setPage(1);}}><option value="-updatedAt">Cập nhật mới nhất</option><option value="updatedAt">Cập nhật cũ nhất</option><option value="name">Tên A → Z</option><option value="-name">Tên Z → A</option><option value="-createdAt">Tạo mới nhất</option></select></div>
    {error&&<Feedback error>{error}</Feedback>}{loading&&<p role="status">Đang tải projects…</p>}
    {!loading&&data?.items.length===0&&<section className="empty-state"><h2>Chưa có project</h2><p>Tạo project để bắt đầu nhập CSV và phân tích.</p></section>}
    <div className="project-grid">{!loading&&data?.items.map(project=><article className="project-card" key={project._id}><span className={`badge ${project.lifecycle}`}>{project.lifecycle==='ready'?'Có dữ liệu':'Trống'}</span><h2><Link to={`/projects/${project._id}`}>{project.name}</Link></h2><p className="muted">Cập nhật {new Date(project.updatedAt).toLocaleString('vi-VN')}</p><div className="actions"><Link className="button" to={`/projects/${project._id}`}>Mở workspace</Link><Button variant="secondary" onClick={()=>{setRenaming(project);setRename(project.name);}}>Đổi tên</Button><Button variant="danger" onClick={()=>setDeleting(project)}>Xóa</Button></div></article>)}</div>
    {data&&<div className="pagination"><Button variant="secondary" disabled={page===1||loading} onClick={()=>setPage(value=>value-1)}>Trang trước</Button><span>Trang {page} / {Math.max(1,Math.ceil(data.total/12))} · {data.total} project</span><Button variant="secondary" disabled={page*12>=data.total||loading} onClick={()=>setPage(value=>value+1)}>Trang sau</Button></div>}
    {renaming&&<Dialog title="Đổi tên project" onClose={()=>setRenaming(undefined)} busy={busy}><Field label="Tên project" value={rename} onChange={event=>setRename(event.target.value)}/>{error&&<Feedback error>{error}</Feedback>}<Button disabled={busy||!rename.trim()||Array.from(rename.trim()).length>100} onClick={()=>void mutate(()=>projectsApi.rename(renaming._id,rename.trim()))}>Lưu tên</Button></Dialog>}
    {deleting&&<Dialog title="Xóa project?" onClose={()=>setDeleting(undefined)} busy={busy}><p>Xóa “{deleting.name}” cùng dataset, phiên bản và lịch sử trên server. Bản offline trên thiết bị được giữ để bạn tự quyết định.</p>{error&&<Feedback error>{error}</Feedback>}<Button variant="danger" disabled={busy} onClick={()=>void mutate(()=>projectsApi.delete(deleting._id))}>Xác nhận xóa project</Button></Dialog>}
  </main>;
}
