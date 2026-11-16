import { Link, Route, Routes } from 'react-router-dom';
import { SystemOverviewPage } from './pages';

export function AppRouter() {
  return (
    <Routes>
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
