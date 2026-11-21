import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { type LocalAnalytics } from '../../features/offline';
import { AnimatedNumber } from '../../shared/ui/AnimatedNumber';

const integer = new Intl.NumberFormat('vi-VN');
const percentage = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 2 });

function QualityCharts({ data }: { data: LocalAnalytics }) {
  const filled = data.cells - data.missing;
  const missingRate = data.cells ? data.missing / data.cells : null;
  const fillRate = data.cells ? filled / data.cells : null;
  const largest = Math.max(1, ...data.types.map(([, count]) => count));
  return <div className="neon-chart-grid">
    <article className="panel neon-chart" data-testid="analytics-donut">
      <h3>Phân bố ô dữ liệu</h3>
      {missingRate === null ? <p className="muted">Chưa có ô để tính tỷ lệ.</p> : <>
        <svg viewBox="0 0 180 180" className="quality-ring" aria-hidden="true">
          <circle className="neon-donut-base" cx="90" cy="90" r="70" pathLength="100" strokeDasharray="100 100"><title>{percentage.format(filled / data.cells)} ô có giá trị</title></circle>
          {missingRate > 0 && <circle className="neon-donut-value" cx="90" cy="90" r="70" pathLength="100"
            strokeDasharray={missingRate * 100 + ' 100'}><title>{percentage.format(missingRate)} ô thiếu</title></circle>}
        </svg>
        <ul className="neon-legend">
          {([['Ô có giá trị', filled], ['Ô thiếu', data.missing]] as const).map(([label, count]) => <li key={label}>
            <button type="button" className="chart-target"><i aria-hidden="true"/>{label} <strong>{percentage.format(count / data.cells)}</strong>
              <span className="chart-tooltip">{integer.format(count)} / {integer.format(data.cells)} ô</span>
            </button>
          </li>)}
        </ul>
      </>}
    </article>
    <article className="panel neon-chart" data-testid="analytics-bars">
      <h3>Số cột theo kiểu dữ liệu</h3>
      {data.types.length === 0 ? <p className="muted">Chưa có cột dữ liệu.</p> :
        <ul className="neon-bars">
          {data.types.map(([label, count]) => <li key={label}><button className="chart-target" type="button">
            <span>{label}</span><span className="neon-bar-track"><i style={{ '--bar-width': count / largest * 100 + '%' } as CSSProperties}/></span>
            <strong>{integer.format(count)}</strong><span className="chart-tooltip">{integer.format(count)} cột · {label}</span>
          </button></li>)}
        </ul>}
    </article>
    <article className="panel neon-chart" data-testid="analytics-gauge">
      <h3>Tỷ lệ điền dữ liệu</h3>
      {fillRate === null ? <p className="muted">Chưa có ô để tính tỷ lệ.</p> : <>
        <svg viewBox="0 0 180 114" className="quality-ring" aria-hidden="true">
          <path className="gauge-track" d="M15 95 A75 75 0 0 1 165 95" pathLength="100" />
          {fillRate > 0 && <path className="gauge-value" d="M15 95 A75 75 0 0 1 165 95" pathLength="100"
            strokeDasharray={fillRate * 100 + ' 100'} />}
        </svg>
        <p className="neon-gauge-number"><AnimatedNumber value={fillRate} format={percentage.format} /></p>
        <p className="muted">{integer.format(filled)} / {integer.format(data.cells)} ô có giá trị</p>
      </>}
    </article>
  </div>;
}

export default function DashboardAnalytics() {
  const data=useDashboardAnalytics();
  const kpis = [
    ['Projects có CSV', data?.projects],
    ['Dataset local', data?.projects],
    ['Dòng hiện tại', data?.rows],
    ['Phiên bản đã lưu', data?.versions],
    ['Thao tác xử lý', data?.operations],
    ['Ô thiếu', data?.missing],
  ] as const;
  return <section className="dashboard-analytics" aria-labelledby="local-analytics-title">
    <h2 id="local-analytics-title">Tổng quan dữ liệu trên thiết bị</h2>
    <p className="muted">Mỗi project local có một dataset CSV. Biểu đồ lấy từ snapshot hiện tại, với lịch sử phiên bản đọc từ bản lưu trên thiết bị.</p>
    <div className="stat-grid neon-kpis">{kpis.map(([label, value]) => <div key={label}>
      <strong>{value === undefined ? '—' : <AnimatedNumber value={value} format={integer.format} />}</strong><span>{label}</span>
    </div>)}</div>
    {data ? <>{!data.projects && <p className="muted">Chưa có CSV local. <Link to="/offline">Nhập dữ liệu offline</Link></p>}<QualityCharts data={data} /></> :
      <p className="muted" aria-live="polite">{data === null ? 'Không đọc được dữ liệu trên thiết bị.' : 'Đang đọc snapshot trên thiết bị…'}</p>}
  </section>;
}
