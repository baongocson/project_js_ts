import { Link, Route, Routes } from 'react-router-dom';
import { SystemOverviewPage } from './pages';
import { OfflineWorkspace } from '../features/offline';

export function AppRouter() {
  return (
    <Routes>
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
