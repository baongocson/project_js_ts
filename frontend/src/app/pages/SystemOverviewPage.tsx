import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../../shared';
import { useBackendHealth } from '../hooks';

const DashboardAnalytics = lazy(() => import('../components/DashboardAnalytics'));

export function SystemOverviewPage() {
  const status = useBackendHealth();
  return (
    <main className="dashboard-overview">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div>
          <h1 id="dashboard-title">Không gian phân tích dữ liệu</h1>
          <p className="muted">Nhập CSV, khám phá dữ liệu trong không gian 3D và theo dõi từng phiên bản khi xử lý.</p>
        </div>
        <div className="toolbar">
          <Link className="button" to="/projects">Mở Projects</Link>
          <Link className="button secondary" to="/offline">Mở dữ liệu offline và đồng bộ</Link>
        </div>
      </section>
      <Suspense fallback={<section className="loading-panel" aria-live="polite">Đang mở tổng quan dữ liệu…</section>}>
        <DashboardAnalytics />
      </Suspense>
      <div className="dashboard-overview-grid">
        <Section aria-label="Trạng thái backend">
          <h2>Kết nối hệ thống</h2>
          <p className="notice" role="status">{status}</p>
        </Section>
        <Section>
          <h2>Luồng làm việc</h2>
          <ol className="dashboard-workflow">
            <li>Nhập CSV vào project</li>
            <li>Khám phá dữ liệu, xem trước và áp dụng xử lý</li>
            <li>Xem lịch sử và khôi phục phiên bản</li>
          </ol>
        </Section>
      </div>
    </main>
  );
}
