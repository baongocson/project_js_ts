import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProcessingSpecification } from '@dashboard/data-core';
import { projectStore, type LocalProject } from '../project-store';
import { createLocalProject, editLocalProject, restoreLocalProject, ProjectApi, syncLocalProject } from '../project-sync';

const presets:Record<string,Record<string,unknown>>={
  edit_cell:{value:{kind:'text',value:'mới'}},remove_duplicates:{keep:'first'},strip_html:{decodeEntities:true},normalize_whitespace:{mode:'trim'},uppercase:{},lowercase:{},replace_value:{from:{kind:'text',value:'a'},to:{kind:'text',value:'b'},match:'exact'},convert_number:{decimalSeparator:'.',allowThousands:false},convert_text:{format:'canonical'},convert_date:{inputFormat:'YYYY-MM-DD'},convert_datetime:{inputFormat:'ISO8601',timezone:'UTC'},convert_boolean:{trueValues:['true','1'],falseValues:['false','0'],caseSensitive:false},fill_mean:{},fill_median:{},fill_mode:{tieBreak:'typed-ascending'},fill_max:{},fill_constant:{value:{kind:'number',value:0}},drop_missing_rows:{condition:'any'},drop_missing_columns:{condition:'any'},clip_iqr:{factor:1.5},clip_zscore:{threshold:3},scale_minmax:{rangeMin:0,rangeMax:1},standardize:{},log1p:{},square:{},one_hot:{keepSource:false,missingCategory:false,asCategory:false},ordinal:{mapping:[],keepSource:false},
};
const apiBase=(import.meta.env.VITE_API_BASE_URL||'/api/v1').replace(/\/$/,'');
export function OfflineWorkspace(){
  const [projects,setProjects]=useState<LocalProject[]>([]),[selected,setSelected]=useState('');
  const [file,setFile]=useState<File>(),[name,setName]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[token,setToken]=useState(''),[account,setAccount]=useState('');
  const [method,setMethod]=useState('normalize_whitespace'),[parameters,setParameters]=useState(JSON.stringify(presets.normalize_whitespace)),[column,setColumn]=useState(''),[row,setRow]=useState('');
  const [message,setMessage]=useState('Sẵn sàng lưu CSV và xử lý khi mất mạng'),[busy,setBusy]=useState(false);
  const [restoreTarget,setRestoreTarget]=useState('0');
  const current=projects.find(project=>project.id===selected)??projects[0];
  async function reload(id?:string){const all=await projectStore.list();setProjects(all);if(id)setSelected(id);}
  useEffect(()=>{void projectStore.list().then(setProjects).catch(error=>setMessage(String(error)));if('serviceWorker' in navigator)void navigator.serviceWorker.register('/offline-worker.js').catch(error=>setMessage(String(error)));},[]);
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('Đang thực hiện…');try{await work();}catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function authenticate(kind:'register'|'login'|'refresh'|'logout'){
    const response=await fetch(`${apiBase}/auth/${kind}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='login'||kind==='register'?{email,password}:{})});
    const result=await response.json().catch(()=>({})) as {accessToken?:string;user?:{email:string};error?:{message:string}};
    if(!response.ok)throw new Error(result.error?.message??`HTTP ${response.status}`);
    if(kind==='logout'){setToken('');setAccount('');setMessage('Đã đăng xuất; dữ liệu offline vẫn được giữ trên máy');}
    else if(result.accessToken){const access=result.accessToken;const me=await new ProjectApi(()=>access).request('users/me');setToken(access);setAccount(String(me.email));setPassword('');setMessage('Đã đăng nhập');}
    else setMessage('Đã đăng ký; chọn Đăng nhập để tiếp tục');
  }
  return <main>
    <Link to="/">Về trang chủ</Link><h1>Dữ liệu offline và đồng bộ</h1>
    <p>CSV gốc và thay đổi được lưu trên thiết bị này. Chỉ báo đồng bộ khi server xác nhận; bản local được giữ khi có xung đột.</p>
    <p role="status" aria-live="polite">{message}</p>
    <section><h2>Tài khoản đồng bộ</h2><p>{account?`Tài khoản: ${account}`:'Chưa đăng nhập'}</p>
      <label>Email <input type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>Mật khẩu <input type="password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('register'))}>Đăng ký</button>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('login'))}>Đăng nhập</button>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('refresh'))}>Khôi phục phiên</button>
      <button disabled={busy} onClick={()=>void action(()=>authenticate('logout'))}>Đăng xuất</button>
      <button disabled={busy||!token} onClick={()=>void action(async()=>{
        if(!window.confirm('Xóa tài khoản và dữ liệu server? Bản offline chưa đồng bộ sẽ được giữ trên thiết bị.'))return;
        await new ProjectApi(()=>token).request('users/me',{method:'DELETE'});
        setToken('');setAccount('');setMessage('Đã xóa tài khoản server; dữ liệu offline được giữ và không chuyển sang tài khoản khác');
      })}>Xóa tài khoản server</button>
    </section>
    <section><h2>Tạo dữ liệu offline</h2>
      <label>Tên project <input value={name} onChange={event=>setName(event.target.value)}/></label>
      <label>File CSV <input type="file" accept=".csv,text/csv" onChange={event=>setFile(event.target.files?.[0])}/></label>
      <button disabled={busy||!file} onClick={()=>void action(async()=>{const project=await createLocalProject(file!,name);await reload(project.id);setMessage('Đã lưu CSV offline');})}>Lưu offline</button>
      <label>Project đã lưu <select value={current?.id??''} onChange={event=>setSelected(event.target.value)}>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
    </section>
    {current&&<>
      <section><h2>{current.name}</h2><p data-testid="sync-state">{current.status} · {current.cursor}/{current.operations.length} thao tác xác nhận</p>
        {current.error&&<p role="alert">{current.error} — bản local và khóa retry vẫn được giữ.</p>}
        {current.projectId&&<p>Project server: <span data-testid="server-project">{current.projectId}</span></p>}
        {current.datasetId&&<p>Dataset server: <span data-testid="server-dataset">{current.datasetId}</span></p>}
        <button disabled={busy||!token} onClick={()=>void action(async()=>{const result=await syncLocalProject(current.id,new ProjectApi(()=>token));await reload(current.id);setMessage(result.status==='synced'?'Đã đồng bộ và xác minh dữ liệu server':`Chưa đồng bộ: ${result.error}`);})}>Đồng bộ lên server</button>
      </section>
      <section><h2>Xử lý bản local</h2>
        <label>Phương pháp <select value={method} onChange={event=>{setMethod(event.target.value);setParameters(JSON.stringify(presets[event.target.value]));}}>{Object.keys(presets).map(item=><option key={item}>{item}</option>)}</select></label>
        <label>Cột <select value={column||current.snapshot.columns[0]?.columnId||''} onChange={event=>setColumn(event.target.value)}>{current.snapshot.columns.map(item=><option key={item.columnId} value={item.columnId}>{item.name}</option>)}</select></label>
        {method==='edit_cell'&&<label>Dòng <select value={row||current.snapshot.rows[0]?.rowId||''} onChange={event=>setRow(event.target.value)}>{current.snapshot.rows.map(item=><option key={item.rowId} value={item.rowId}>{item.position+1}</option>)}</select></label>}
        <label>Tham số xử lý (JSON) <textarea value={parameters} onChange={event=>setParameters(event.target.value)}/></label>
        <button disabled={busy} onClick={()=>void action(async()=>{
          const columnId=column||current.snapshot.columns[0].columnId;
          const scope=method==='remove_duplicates'?{type:'dataset'}:method==='edit_cell'?{type:'cell',columnId,rowId:row||current.snapshot.rows[0]?.rowId}:{type:'columns',columnIds:[columnId]};
          const specification={method,parameters:JSON.parse(parameters) as unknown,scope,statisticsScope:{type:'whole-columns'}} as ProcessingSpecification;
          await editLocalProject(current.id,specification);await reload(current.id);setMessage('Đã lưu thay đổi offline');
        })}>Áp dụng offline</button>
      </section>
      <section><h2>Bảng dữ liệu local</h2><p>{current.snapshot.rows.length} dòng · {current.snapshot.columns.length} cột · hiển thị 100 dòng đầu</p>
        <div style={{overflowX:'auto'}}><table><thead><tr>{current.snapshot.columns.map(item=><th key={item.columnId}>{item.name}</th>)}</tr></thead><tbody>{current.snapshot.rows.slice(0,100).map(item=><tr key={item.rowId}>{current.snapshot.columns.map(col=><td key={col.columnId}>{String(item.cells[col.columnId]?.value??'∅')}</td>)}</tr>)}</tbody></table></div>
      </section>
      {current.operations.length>0&&<section><h2>Lịch sử local</h2>
        <label>Phiên bản khôi phục <select value={restoreTarget} onChange={event=>setRestoreTarget(event.target.value)}><option value="0">CSV ban đầu</option>{current.operations.slice(0,-1).map((operation,index)=><option key={operation.id} value={index+1}>Bước {index+1} · {operation.kind}</option>)}</select></label>
        <button disabled={busy} onClick={()=>void action(async()=>{await restoreLocalProject(current.id,Number(restoreTarget));await reload(current.id);setMessage('Đã lưu restore offline');})}>Khôi phục offline</button>
      </section>}
    </>}
  </main>;
}
