import { Section } from '../../shared';
import { useBackendHealth } from '../hooks';
import { Link } from 'react-router-dom';

export function SystemOverviewPage() {
  const status = useBackendHealth();
  return (
    <main>
      <p className="eyebrow">DASHBOARD 3D</p>
      <h1>Không gian phân tích dữ liệu</h1>
      <Link to="/offline">Mở dữ liệu offline và đồng bộ</Link>
      <p>Khung dự án React + Vite đã sẵn sàng.</p>
      <Section aria-label="Trạng thái backend">
        <h2>Kết nối hệ thống</h2>
        <p role="status">{status}</p>
      </Section>
      <Section>
        <h2>Luồng triển khai đầu tiên</h2>
        <p>Đăng nhập → Tạo project → Import CSV → Bảng dữ liệu → Preview → Apply → Lịch sử → Restore</p>
        <p>Các chức năng nghiệp vụ đang được xây dựng.</p>
      </Section>
    </main>
  );
}
