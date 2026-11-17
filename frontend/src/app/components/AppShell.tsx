import { useEffect,useState,type PropsWithChildren } from 'react';
import { Link,NavLink } from 'react-router-dom';
import { useSession } from '../../features/auth';
export function AppShell({children}:PropsWithChildren){
  const current=useSession(),[online,setOnline]=useState(navigator.onLine);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return <><a className="skip-link" href="#content">Đến nội dung</a><header className="app-header"><Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">D</span><span>Dashboard <strong>3D</strong></span></Link><span className="app-tagline">Explore · Prepare · Understand</span><nav aria-label="Điều hướng chính"><NavLink to="/projects">Projects online</NavLink><NavLink to="/offline">Dữ liệu offline</NavLink><NavLink to="/system">Kết nối</NavLink><NavLink to={current.user?'/profile':'/login'}>{current.user?.displayName||current.user?.email||'Đăng nhập'}</NavLink></nav></header>
    <div className="connection-bar">{!online||current.status==='offline'?'Chế độ local · Dữ liệu trên thiết bị được giữ nguyên':current.status==='loading'?'Đang khôi phục phiên…':current.user?'Đã xác thực · '+current.user.email:'Chưa đăng nhập · Bạn vẫn có thể làm việc offline'}</div><div id="content" tabIndex={-1}>{children}</div></>;
}
