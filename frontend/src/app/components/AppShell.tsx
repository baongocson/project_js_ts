import { useEffect,useState,type PropsWithChildren } from 'react';
import { Link,NavLink } from 'react-router-dom';
import { useSession } from '../../features/auth';
import { ThemeSwitcher } from './ThemeSwitcher';
export function AppShell({children}:PropsWithChildren){
  const current=useSession(),[online,setOnline]=useState(navigator.onLine),[expanded,setExpanded]=useState(false);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return <div className="analytics-shell"><a className="skip-link" href="#content">Đến nội dung</a><header className="app-header"><Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">D</span><span>Dashboard <strong>3D</strong></span></Link><span className="app-tagline">NEON ANALYTICS / Explore · Prepare · Understand</span><ThemeSwitcher/><Link className="shell-account" to={current.user?'/profile':'/login'}>{current.user?.displayName||current.user?.email||'Đăng nhập'}</Link></header>
    <aside className="shell-sidebar"><button className="button secondary shell-nav-toggle" type="button" aria-expanded={expanded} aria-controls="shell-navigation" onClick={()=>setExpanded(value=>!value)}>Điều hướng {expanded?'−':'+'}</button>
      <nav id="shell-navigation" className={expanded?'is-expanded':''} aria-label="Điều hướng chính">
        <p className="eyebrow">WORKSPACE</p>
        <NavLink to="/projects" onClick={()=>setExpanded(false)}><span aria-hidden="true">▦</span>Projects online</NavLink>
        <NavLink to="/offline" onClick={()=>setExpanded(false)}><span aria-hidden="true">◈</span>Dữ liệu offline</NavLink>
        <NavLink to="/system" onClick={()=>setExpanded(false)}><span aria-hidden="true">⌁</span>Kết nối</NavLink>
        <NavLink to={current.user?'/profile':'/login'} onClick={()=>setExpanded(false)}><span aria-hidden="true">◎</span>{current.user?'Hồ sơ':'Đăng nhập'}</NavLink>
      </nav><p className="sidebar-note">Dữ liệu của bạn.<br/>Góc nhìn mới.</p></aside>
    <div className="shell-body"><div className="connection-bar"><span className={`connection-dot ${online?'is-online':''}`} aria-hidden="true"/>{!online||current.status==='offline'?'Chế độ local · Dữ liệu trên thiết bị được giữ nguyên':current.status==='loading'?'Đang khôi phục phiên…':current.user?'Đã xác thực · '+current.user.email:'Chưa đăng nhập · Bạn vẫn có thể làm việc offline'}</div><div id="content" tabIndex={-1}>{children}</div></div></div>;
}
