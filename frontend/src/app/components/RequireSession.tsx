import type { PropsWithChildren } from 'react';
import { Link,Navigate,useLocation } from 'react-router-dom';
import { useSession } from '../../features/auth';
export function RequireSession({children}:PropsWithChildren){
  const current=useSession(),location=useLocation();
  if(current.status==='loading')return <main><p role="status">Đang khôi phục phiên…</p></main>;
  if(current.status==='offline')return <main><h1>Không kết nối được server</h1><p>Dữ liệu offline vẫn có thể mở trên thiết bị.</p><Link to="/offline">Mở dữ liệu offline</Link></main>;
  if(!current.user)return <Navigate to="/login" replace state={{from:location.pathname}}/>;
  return children;
}
