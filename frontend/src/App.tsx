import { useEffect, useState } from 'react';
import { getHealth } from './lib/api-client';
export default function App() {
  const [status, setStatus] = useState('Đang kiểm tra…');
  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal).then(data => setStatus(`Đã kết nối · MongoDB: ${data.database}`)).catch(error => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Chưa kết nối API'); });
    return () => controller.abort();
  }, []);
  return <main><p className="eyebrow">DASHBOARD 3D</p><h1>Không gian phân tích dữ liệu</h1><p>Khung dự án React + Vite đã sẵn sàng.</p><section aria-label="Trạng thái backend"><h2>Kết nối hệ thống</h2><p role="status">{status}</p></section><section><h2>Luồng triển khai đầu tiên</h2><p>Đăng nhập → Tạo project → Import CSV → Bảng dữ liệu → Preview → Apply → Lịch sử → Restore</p><p>Các chức năng nghiệp vụ đang được xây dựng.</p></section></main>;
}
