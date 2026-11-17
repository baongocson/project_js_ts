import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { SystemOverviewPage } from './pages';
import { OfflineWorkspace } from '../features/offline';
import { inspectLocalAccount,withLocalAccountLock } from '../features/offline';
import { AuthPage,ProfilePage } from '../features/auth';
import { ProjectsPage } from '../features/projects';
import { RequireSession } from './components/RequireSession';
import { WorkspacePage } from './pages/WorkspacePage';

export function AppRouter() {
  const location=useLocation();
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" mode="login"/>}/>
      <Route path="/register" element={<AuthPage key="register" mode="register"/>}/>
      <Route path="/profile" element={<RequireSession><ProfilePage inspectLocal={inspectLocalAccount} withAccountLock={withLocalAccountLock}/></RequireSession>}/>
      <Route path="/projects" element={<RequireSession><ProjectsPage/></RequireSession>}/>
      <Route path="/projects/:projectId" element={<RequireSession><WorkspacePage key={location.pathname}/></RequireSession>}/>
      <Route path="/local/projects" element={<OfflineWorkspace/>}/>
      <Route path="/system" element={<SystemOverviewPage/>}/>
      <Route path="/offline" element={<OfflineWorkspace />} />
      <Route path="/" element={<SystemOverviewPage />} />
      <Route path="*" element={
        <main>
          <h1>Không tìm thấy trang</h1>
          <Link to="/">Về trang chủ</Link>
        </main>
      } />
    </Routes>
  );
}
