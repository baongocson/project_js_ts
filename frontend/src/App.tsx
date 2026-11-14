import { useEffect, useMemo, useRef, useState } from 'react';
import { getHealth } from './lib/api-client';
import { PointCloud } from './features/offline/PointCloud';
import { activeVersion, createProject, parseCsv, previewTransform, publishVersion, readLocalProject, restoreVersion, saveLocalProject } from './features/offline/model';
import type { LocalProject, PreviewResult, Transformation } from './features/offline/model';

const demoCsv = `age,bmi,bp,score\n25,21.6,118,42\n36,25.2,130,67\n49,29.1,146,88\n31,23.4,124,59\n55,30.5,151,91\n41,27.2,136,74\n27,20.9,112,35\n63,32.1,158,96\n38,26.3,129,64\n46,28.5,140,82`;
export default function App() {
  const [project, setProject] = useState<LocalProject | null>(null);
  const [backend, setBackend] = useState('Đang kiểm tra kết nối');
  const [error, setError] = useState('');
  const persistQueue = useRef<Promise<void>>(Promise.resolve());
  const [page, setPage] = useState(1);
  const [axis, setAxis] = useState<[number, number, number]>([0, 1, 2]);
  const [method, setMethod] = useState<'trim' | 'fill'>('fill');
  const [column, setColumn] = useState(0);
  const [fillValue, setFillValue] = useState('0');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const current = useMemo(() => project ? activeVersion(project) : null, [project]);
  const table = current?.table;
  useEffect(() => {
    readLocalProject().then(result => { if (result) setProject(result); }).catch(err => setError(String(err)));
    const health = () => {
      const controller = new AbortController();
      getHealth(controller.signal).then(data => setBackend(`Backend hoạt động · MongoDB: ${data.database}`)).catch(() => setBackend('Backend không khả dụng · đang xử lý cục bộ'));
      return controller;
    };
    const initial = health();
    const interval = window.setInterval(() => health(), 10000);
    return () => { initial.abort(); window.clearInterval(interval); };
  }, []);
  const commit = (next: LocalProject) => {
    setProject(next); setPreview(null); setPage(1);
    // Serialize IndexedDB writes so slower earlier saves cannot overwrite a newer version.
    persistQueue.current = persistQueue.current.catch(() => undefined).then(() => saveLocalProject(next));
    void persistQueue.current.catch(err => setError(`Không lưu được bản cục bộ: ${String(err)}`));
  };
  const importText = (text: string, name: string) => {
    try {
      const next = createProject(name, parseCsv(text));
      const lastAxis = Math.max(0, next.versions[0].table.columns.length - 1);
      setAxis([0, Math.min(1, lastAxis), Math.min(2, lastAxis)]);
      commit(next); setError('');
    }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };
  const action: Transformation = method === 'trim' ? { kind: 'trim', column } : { kind: 'fill', column, value: fillValue };
  const previewNow = () => {
    if (!table) return;
    try { setPreview(previewTransform(table, action)); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };
  const pageCount = table ? Math.max(1, Math.ceil(table.rows.length / 10)) : 1;
  return <main className="dashboard">
    <header className="topbar"><div><p className="eyebrow">DATA MINING · 3D</p><h1>Dashboard khai phá dữ liệu</h1><p className="muted">Bản demo offline-first: nhập CSV, trực quan hóa, Preview, Apply và lịch sử cục bộ.</p></div><div className="status"><span>{backend}</span><small>Chưa kết nối đồng bộ MongoDB · thay đổi đang lưu trong trình duyệt</small></div></header>
    {error && <div className="error" role="alert">{error} <button type="button" onClick={() => setError('')}>Đóng</button></div>}
    <section className="panel"><div className="sectionhead"><h2>01 · Dữ liệu và Project</h2><span className="muted">CSV UTF-8 · giới hạn 16 MB</span></div><div className="actions"><label className="filebutton">Nhập file CSV<input type="file" accept=".csv,text/csv" onChange={event => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.size > 16_000_000) { setError('CSV vượt quá 16.000.000 byte'); event.currentTarget.value = ''; return; } file.text().then(text => importText(text, file.name)).catch(err => setError(String(err))); event.currentTarget.value = ''; }}/></label><button type="button" onClick={() => importText(demoCsv, 'Dataset minh họa')}>Nạp dữ liệu mẫu</button>{project && <span className="muted">Project: {project.name} · V{current?.number} · {project.pendingSync ? 'Chưa đồng bộ' : 'Đã đồng bộ'}</span>}</div></section>
    {!table ? <section className="panel empty"><h2>Chưa có Dataset</h2><p>Chọn CSV từ máy hoặc mở dữ liệu mẫu để bắt đầu. Dữ liệu được lưu vào IndexedDB và vẫn sử dụng được nếu Backend ngắt.</p></section> : <>
      <div className="metrics"><div><small>Số dòng</small><strong>{table.rows.length}</strong></div><div><small>Số cột</small><strong>{table.columns.length}</strong></div><div><small>Ô thiếu</small><strong>{table.rows.flat().filter(cell => cell.trim() === '' || cell.trim().toLowerCase() === 'n/a').length}</strong></div><div><small>Phiên bản</small><strong>V{current?.number}</strong></div></div>
      <div className="workspace"><section className="panel"><div className="sectionhead"><h2>02 · Bảng dữ liệu</h2><span className="muted">10 dòng/trang</span></div><div className="tablewrap"><table><thead><tr><th>#</th>{table.columns.map((title, index) => <th key={index}>{title}</th>)}</tr></thead><tbody>{table.rows.slice((page - 1) * 10, page * 10).map((row, index) => <tr key={(page - 1) * 10 + index}><td>{(page - 1) * 10 + index + 1}</td>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || <em>∅</em>}</td>)}</tr>)}</tbody></table></div><div className="pages"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Sau</button></div></section>
      <section className="panel"><div className="sectionhead"><h2>03 · Không gian 3D</h2><span className="muted">Canvas, ma trận quay và phép chiếu phối cảnh</span></div><div className="axes">{(['X', 'Y', 'Z'] as const).map((label, i) => <label key={label}>{label}<select value={axis[i]} onChange={event => setAxis(previous => previous.map((value, index) => index === i ? Number(event.target.value) : value) as [number, number, number])}>{table.columns.map((col, index) => <option key={index} value={index}>{col}</option>)}</select></label>)}</div><PointCloud table={table} x={axis[0]} y={axis[1]} z={axis[2]}/></section></div>
      <div className="workspace"><section className="panel"><h2>04 · Xử lý dữ liệu</h2><div className="formrow"><label>Phương pháp<select value={method} onChange={event => { setMethod(event.target.value as 'trim' | 'fill'); setPreview(null); }}><option value="fill">Điền ô thiếu bằng giá trị nhập</option><option value="trim">Loại khoảng trắng hai đầu</option></select></label><label>Cột<select value={column} onChange={event => { setColumn(Number(event.target.value)); setPreview(null); }}>{table.columns.map((title, index) => <option value={index} key={index}>{title}</option>)}</select></label>{method === 'fill' && <label>Giá trị thay thế<input value={fillValue} onChange={event => { setFillValue(event.target.value); setPreview(null); }}/></label>}</div><div className="actions"><button type="button" onClick={previewNow}>Xem trước (Preview)</button>{preview && <button type="button" disabled={preview.changed === 0} onClick={() => { if (project) commit(publishVersion(project, preview.after, method === 'trim' ? `trim: ${table.columns[column]}` : `fill_missing: ${table.columns[column]}`)); }}>Áp dụng (Apply) → V{project ? project.versions.length + 1 : 2}</button>}</div>{preview && <div className="preview"><h3>Preview: {preview.changed} ô thay đổi</h3><table><thead><tr><th>Dòng</th><th>Trước</th><th>Sau</th></tr></thead><tbody>{preview.samples.map(sample => <tr key={sample.row}><td>{sample.row}</td><td>{sample.before || '∅'}</td><td>{sample.after || '∅'}</td></tr>)}</tbody></table>{preview.changed === 0 && <p className="muted">Không có ô cần sửa.</p>}</div>}</section>
      <section className="panel"><h2>05 · History & Restore</h2><p className="muted">Lịch sử này lưu trong IndexedDB. Chưa phải kết quả từ History API / MongoDB.</p><div className="history">{[...(project?.versions ?? [])].reverse().map(version => <div className="historyitem" key={version.id}><div><strong>V{version.number}</strong> · {version.action}<small>{new Date(version.createdAt).toLocaleString('vi-VN')}</small></div><button type="button" disabled={version.id === current?.id} onClick={() => { if (project) commit(restoreVersion(project, version.id)); }}>Restore</button></div>)}</div></section></div>
    </>}
    <footer>Trạng thái: demo local-first · Backend API và đồng bộ Atlas chưa triển khai · Không sử dụng dữ liệu mẫu làm bằng chứng DB hoạt động.</footer>
  </main>;
}
