import { useId, useState, type CSSProperties } from 'react';
import { cellKey, type DistributionResult, type ValueCountItem, type ValueCountsResult } from '@dashboard/data-core';
import { CellDisplay } from '../../datasets';
import { Button, Feedback } from '../../../shared/ui';
import { useDistribution, type DistributionProps } from '../hooks/useDistribution';

const number = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 7 });
const percentage = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 2 });
const percent = (rate: number | null) => rate === null ? '—' : percentage.format(rate);
const labelOf = (item: ValueCountItem) => item.isMissing ? 'Nhóm missing' : String(item.value.value);
const keyOf = (item: ValueCountItem) => item.isMissing ? 'missing' : cellKey(item.value);
const details = (label: string, count: number, total: number) =>
  `${label} · ${number.format(count)} dòng · ${percent(total ? count / total : null)}`;

function useChartHighlight() {
  const [hover, setHover] = useState<string>();
  const [focus, setFocus] = useState<string>();
  const [pinned, setPinned] = useState<string>();
  return {
    active: hover ?? focus ?? pinned,
    bind: (key: string) => ({
      onPointerEnter: (event: React.PointerEvent) => { if (event.pointerType !== 'touch') setHover(key); },
      onPointerLeave: () => setHover(value => value === key ? undefined : value),
      onFocus: (event: React.FocusEvent) => { if (event.currentTarget.matches(':focus-visible')) setFocus(key); },
      onBlur: () => setFocus(value => value === key ? undefined : value),
      onClick: () => setPinned(value => value === key ? undefined : key),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') { setFocus(undefined); setPinned(undefined); setHover(undefined); }
      },
    }),
  };
}

function Histogram({ distribution }: { distribution: DistributionResult }) {
  const { histogram, histogramStatus, missingCount } = distribution;
  const unavailable = histogramStatus === 'constant_column' ? 'cột hằng' :
    distribution.reason === 'all_missing' ? 'toàn bộ giá trị thiếu' : 'cột không phải number';
  const total = histogram.reduce((sum, bin) => sum + bin.count, 0);
  const max = Math.max(1, ...histogram.map(bin => bin.count));
  const interaction = useChartHighlight();
  const entries = histogram.map((bin, index) => ({
    key: String(index),
    label: `${number.format(bin.lowerBound)} đến ${number.format(bin.upperBound)}`,
    count: bin.count,
  }));
  const active = entries.find(entry => entry.key === interaction.active);
  return <article className="summary-chart analysis-chart-card">
    <h3>Histogram · Phân phối toàn cột</h3>
    <p className="muted">{histogramStatus === 'ok' ? `Tỷ lệ trên ${number.format(total)} dòng thuộc các khoảng số` : `Histogram: N/A — ${unavailable}`} · Missing: {missingCount}</p>
    {entries.length > 0 && <>
      <p className="analysis-chart-detail" role={active ? 'tooltip' : undefined}>{active ? details(active.label, active.count, total) : `Trục dọc: số dòng · Đỉnh thang: ${number.format(max)}`}</p>
      <div className="analysis-histogram-scroll">
        <div className="analysis-histogram neon-interaction" role="group" aria-label="Histogram phân phối toàn cột"
          data-interacting={Boolean(active)} style={{ '--bins': entries.length } as CSSProperties}>
          {entries.map(entry => <button type="button" key={entry.key} className="analysis-bin"
            data-active={active?.key === entry.key} aria-label={details(entry.label, entry.count, total)}
            {...interaction.bind(entry.key)}>
            <span className="analysis-bar-ink" style={{ '--extent': entry.count / max * 100 + '%' } as CSSProperties} />
          </button>)}
        </div>
      </div>
      <div className="analysis-axis"><span>{number.format(histogram[0].lowerBound)}</span><span>{number.format(histogram.at(-1)!.upperBound)}</span></div>
      <details><summary>Số liệu histogram</summary><div className="data-table"><table><thead><tr><th>Từ</th><th>Đến</th><th>Số dòng</th></tr></thead><tbody>
        {histogram.map((bin, index) => <tr key={index}><td>{number.format(bin.lowerBound)}</td><td>{number.format(bin.upperBound)}</td><td>{bin.count}</td></tr>)}
      </tbody></table></div></details>
    </>}
  </article>;
}

type Group = { key: string; label: string; count: number };
function FrequencyCharts({ counts, top, includeMissing }: { counts: ValueCountsResult; top?: ValueCountsResult; includeMissing: boolean }) {
  const interaction = useChartHighlight();
  const total = counts.totalRows;
  const max = Math.max(1, ...counts.items.map(item => item.count));
  const groups: Group[] = top?.items.map(item => ({ key: keyOf(item), label: labelOf(item), count: item.count })) ?? [];
  if (top && includeMissing && top.missingCount) groups.push({ key: 'missing', label: 'Nhóm missing', count: top.missingCount });
  const other = top ? top.totalRows - top.missingCount - top.items.reduce((sum, item) => sum + item.count, 0) : 0;
  if (other > 0) groups.push({ key: 'other', label: 'Khác', count: other });
  const inDonut = new Set(groups.map(group => group.key));
  function donutKey(key: string) { return inDonut.has(key) ? key : key !== 'missing' && other > 0 ? 'other' : undefined; }
  const activeDonut = interaction.active && (interaction.active === 'other' ? 'other' : donutKey(interaction.active));
  const activeItem = counts.items.find(item => keyOf(item) === interaction.active);
  const hasActiveBar = Boolean(activeItem || (interaction.active === 'other' &&
    counts.items.some(item => donutKey(keyOf(item)) === 'other')));
  const activeGroup = groups.find(group => group.key === activeDonut);
  let offset = 0;
  const segments: Array<Group & { length: number; offset: number; index: number }> = [];
  for (const [index, group] of groups.entries()) {
    const length = group.count / total * 100;
    segments.push({ ...group, length, offset, index });
    offset += length;
  }
  return <div className="analysis-frequency-grid">
    <article className="summary-chart analysis-chart-card">
      <h3>Tần suất trên trang hiện tại</h3>
      <p className="muted">Tối đa 20 nhóm · Tỷ lệ trên toàn bộ {number.format(total)} dòng.</p>
      <p className="analysis-chart-detail" role={activeItem || activeGroup ? 'tooltip' : undefined}>{activeItem
        ? details(labelOf(activeItem), activeItem.count, total)
        : activeGroup ? details(activeGroup.label, activeGroup.count, total) : 'Chọn một cột để xem chi tiết.'}</p>
      {counts.items.length ? <ul className="analysis-frequency-bars neon-interaction" aria-label="Biểu đồ tần suất giá trị" data-interacting={hasActiveBar}>
        {counts.items.map(item => {
          const key = keyOf(item);
          return <li key={key}><button type="button" className="analysis-frequency-bar" aria-label={details(labelOf(item), item.count, total)}
            data-active={interaction.active === key || (interaction.active === 'other' && donutKey(key) === 'other')}
            {...interaction.bind(key)}>
            <span className="analysis-bar-label">{labelOf(item)}</span>
            <span className="analysis-bar-track"><span className="analysis-bar-ink" style={{ '--extent': item.count / max * 100 + '%' } as CSSProperties} /></span>
            <strong>{number.format(item.count)}</strong>
          </button></li>;
        })}
      </ul> : <p>Không có category.</p>}
    </article>
    <article className="summary-chart analysis-chart-card">
      <h3>Nhóm phổ biến nhất</h3>
      <p className="muted">Top 7 nhóm theo tần suất · Tỷ lệ trên toàn bộ {number.format(total)} dòng.</p>
      {top && total && groups.length ? <>
        <svg viewBox="0 0 180 180" className="analysis-donut neon-interaction" aria-label="Donut tần suất toàn cột"
          data-interacting={Boolean(activeDonut)}>
          <circle cx="90" cy="90" r="68" className="analysis-donut-track" />
          {segments.map(segment => <circle key={segment.key} cx="90" cy="90" r="68" pathLength="100"
            className="analysis-donut-segment" data-active={activeDonut === segment.key}
            style={{ '--slice': 'var(--analysis-slice-' + (segment.index % 9) + ')' } as CSSProperties}
            strokeDasharray={`${segment.length} 100`} strokeDashoffset={-segment.offset}
            {...interaction.bind(segment.key)}><title>{details(segment.label, segment.count, total)}</title></circle>)}
        </svg>
        <p className="analysis-chart-detail" role={activeGroup ? 'tooltip' : undefined}>{activeGroup ? details(activeGroup.label, activeGroup.count, total) : 'Chọn một nhóm để xem chi tiết.'}</p>
        <ul className="analysis-donut-legend neon-interaction" data-interacting={Boolean(activeDonut)}>
          {segments.map(segment => <li key={segment.key}><button type="button" className="analysis-legend-button"
            data-active={activeDonut === segment.key} {...interaction.bind(segment.key)}>
            <i aria-hidden="true" style={{ background: 'var(--analysis-slice-' + (segment.index % 9) + ')' }} />
            <span>{segment.label}</span><strong>{percent(segment.count / total)}</strong>
          </button></li>)}
        </ul>
      </> : <p>{top ? 'Không có nhóm để vẽ Donut.' : 'Đang đọc tần suất toàn cột…'}</p>}
      {!includeMissing && counts.missingCount > 0 && <p className="muted">Đã ẩn {counts.missingCount} dòng missing ({percent(total ? counts.missingCount / total : null)}). Mẫu số vẫn gồm các dòng này.</p>}
    </article>
  </div>;
}

export function DistributionBlock(props: DistributionProps) {
  const { columns, column, setColumn, bins, setBins, page, setPage, sort, setSort, includeMissing, setIncludeMissing,
    resource, distribution, counts, top } = useDistribution(props);
  const id = useId();
  if (!columns.length) return null;
  return <div className="analysis-distribution" data-testid="analysis-distribution">
    <div className="summary-chart">
      <h3>Phân phối và tần suất</h3>
      <div className="analysis-chart-options">
        <div><label htmlFor={id + "-column"}>Cột phân phối</label><select id={id + "-column"} value={column} onChange={event => { setColumn(event.target.value); setPage(1); }}>
          {columns.map(item => <option key={item.columnId} value={item.columnId}>{item.name}</option>)}
        </select></div>
        <div><label htmlFor={id + "-bins"}>Số khoảng histogram</label><select id={id + "-bins"} value={bins} onChange={event => setBins(Number(event.target.value))}>
          {[5, 10, 20, 50, 100].map(value => <option key={value}>{value}</option>)}
        </select></div>
        <div><label htmlFor={id + "-sort"}>Sắp xếp category</label><select id={id + "-sort"} value={sort} onChange={event => { setSort(event.target.value as typeof sort); setPage(1); }}>
          <option value="-count">Tần suất giảm dần</option><option value="value">Giá trị typed</option>
        </select></div>
        <label className="check"><input type="checkbox" checked={includeMissing} onChange={event => { setIncludeMissing(event.target.checked); setPage(1); }} />Gồm nhóm missing</label>
      </div>
    </div>
    {resource.error && <><Feedback error>{resource.error}</Feedback><Button variant="secondary" onClick={resource.retry}>Thử lại phân tích</Button></>}
    {top.error && <><Feedback error>{top.error}</Feedback><Button variant="secondary" onClick={top.retry}>Thử lại Donut</Button></>}
    {resource.busy && <p aria-live="polite">Đang phân tích toàn bộ phiên bản…</p>}
    {distribution && <>
      <Histogram distribution={distribution} />
      <p className="muted">Ngưỡng outlier của cột: {distribution.outlierBounds
        ? `${distribution.outlierBounds.count} · [${number.format(distribution.outlierBounds.lower)}, ${number.format(distribution.outlierBounds.upper)}]`
        : 'N/A'}</p>
    </>}
    {counts && <>
      <FrequencyCharts counts={counts} top={top.data} includeMissing={includeMissing} />
      <article className="summary-chart">
        <h3>Bảng tần suất</h3>
        <div className="data-table"><table><thead><tr><th>Giá trị</th><th>Kiểu</th><th>Số dòng</th><th>Tỷ lệ toàn dataset</th></tr></thead><tbody>
          {counts.items.map(item => <tr key={keyOf(item)}><td>{item.isMissing ? 'Nhóm missing' : <CellDisplay cell={item.value} />}</td>
            <td>{item.isMissing ? 'missing' : item.value.kind}</td><td>{item.count}</td><td>{percent(item.rate)}</td></tr>)}
        </tbody></table></div>
        <div className="pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Category trước</Button>
          <span>Trang {page}/{Math.max(1, counts.totalPages)} · {counts.totalCategories} category · {counts.totalRows} dòng</span>
          <Button variant="secondary" disabled={page >= counts.totalPages} onClick={() => setPage(page + 1)}>Category sau</Button></div>
      </article>
    </>}
  </div>;
}
