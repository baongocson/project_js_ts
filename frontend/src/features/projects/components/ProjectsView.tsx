import type { ProjectsModel } from '../hooks/useProjects';

import { Link } from 'react-router-dom';

import { Button, Field, Feedback, Dialog } from '../../../shared/ui';

export function ProjectsView(model:ProjectsModel){
  const { page, setPage, sort, setSort, data, loading, error, name, setName, busy, deleting, setDeleting, renaming, setRenaming, rename, setRename, create, renameProject, deleteProject }=model;

return <main><div className="page-heading"><div><p className="eyebrow">KHÔNG GIAN LÀM VIỆC</p><h1>Projects</h1><p className="muted">Quản lý dữ liệu và các phiên bản phân tích trên server.</p></div><Link className="button secondary" to="/offline">Làm việc offline</Link></div>
    <form className="panel inline-form" onSubmit={event=>{void create(event);}}><Field label="Tên project mới" value={name} onChange={event=>setName(event.target.value)} disabled={busy} maxLength={200}/><Button type="submit" disabled={busy}>{busy?'Đang tạo…':'Tạo project'}</Button></form>
    <div className="toolbar"><label htmlFor="project-sort">Sắp xếp</label><select id="project-sort" value={sort} onChange={event=>{setSort(event.target.value);setPage(1);}}><option value="-updatedAt">Cập nhật mới nhất</option><option value="updatedAt">Cập nhật cũ nhất</option><option value="name">Tên A → Z</option><option value="-name">Tên Z → A</option><option value="-createdAt">Tạo mới nhất</option></select></div>
    {error&&<Feedback error>{error}</Feedback>}{loading&&<div className="loading-panel" role="status">Đang tải projects…<span className="skeleton-line" aria-hidden="true"/></div>}
    {!loading&&data?.items.length===0&&<section className="empty-state"><h2>Chưa có project</h2><p>Tạo project để bắt đầu nhập CSV và phân tích.</p></section>}
    <div className="project-grid">{!loading&&data?.items.map(project=><article className="project-card" key={project._id}><span className={`badge ${project.lifecycle}`}>{project.lifecycle==='ready'?'Có dữ liệu':'Trống'}</span><h2><Link to={`/projects/${project._id}`}>{project.name}</Link></h2><p className="muted">Cập nhật {new Date(project.updatedAt).toLocaleString('vi-VN')}</p><div className="actions"><Link className="button" to={`/projects/${project._id}`}>Mở workspace</Link><Button variant="secondary" onClick={()=>{setRenaming(project);setRename(project.name);}}>Đổi tên</Button><Button variant="danger" onClick={()=>setDeleting(project)}>Xóa</Button></div></article>)}</div>
    {data&&<div className="pagination"><Button variant="secondary" disabled={page===1||loading} onClick={()=>setPage(value=>value-1)}>Trang trước</Button><span>Trang {page} / {Math.max(1,Math.ceil(data.total/12))} · {data.total} project</span><Button variant="secondary" disabled={page*12>=data.total||loading} onClick={()=>setPage(value=>value+1)}>Trang sau</Button></div>}
    {renaming&&<Dialog title="Đổi tên project" onClose={()=>setRenaming(undefined)} busy={busy}><Field label="Tên project" value={rename} onChange={event=>setRename(event.target.value)}/>{error&&<Feedback error>{error}</Feedback>}<Button disabled={busy||!rename.trim()||Array.from(rename.trim()).length>100} onClick={renameProject}>Lưu tên</Button></Dialog>}
    {deleting&&<Dialog title="Xóa project?" onClose={()=>setDeleting(undefined)} busy={busy}><p>Xóa “{deleting.name}” cùng dataset, phiên bản và lịch sử trên server. Bản offline trên thiết bị được giữ để bạn tự quyết định.</p>{error&&<Feedback error>{error}</Feedback>}<Button variant="danger" disabled={busy} onClick={deleteProject}>Xác nhận xóa project</Button></Dialog>}
  </main>;
}