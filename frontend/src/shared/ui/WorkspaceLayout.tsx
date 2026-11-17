import { useId, useState, type ReactNode } from 'react';
import { WorkspacePreviewContext } from './workspace-preview';

export const workspaceTabs = [
  ['collection', 'Collection', 'Khám phá dữ liệu'],
  ['cleaning', 'Cleaning', 'Làm sạch'],
  ['missing', 'Missing', 'Giá trị thiếu'],
  ['outliers', 'Outliers', 'Ngoại lệ'],
  ['scaling', 'Scaling', 'Co giãn dữ liệu'],
  ['transformation', 'Transformation', 'Biến đổi'],
  ['encoding', 'Encoding', 'Mã hóa'],
  ['history', 'History', 'Lịch sử phiên bản'],
] as const;
export type WorkspaceTab = typeof workspaceTabs[number][0];
export type ProcessingGroup = Exclude<WorkspaceTab, 'collection' | 'history'>;

/** Presentation slots keep feature orchestration in app/the owning local workspace. */
export function WorkspaceLayout({ activeTab, onTab, navigationLocked = false, analysis, processing, table, history }:
  { activeTab: WorkspaceTab; onTab(tab: WorkspaceTab): void; navigationLocked?: boolean;
    analysis: ReactNode; processing: ReactNode; table: ReactNode; history: ReactNode }) {
  const id = useId();
  const [previewHost,setPreviewHost] = useState<HTMLDivElement | null>(null);
  const current = workspaceTabs.find(([key]) => key === activeTab)!;
  return <WorkspacePreviewContext value={previewHost}><div className="workspace-layout">
    <nav className="section-tabs" aria-label="Các bước xử lý dữ liệu">
      {workspaceTabs.map(([key, name, description], index) => <button key={key} type="button" data-step={key}
        aria-current={activeTab === key ? 'page' : undefined} aria-controls={`${id}-panel`}
        disabled={navigationLocked && activeTab !== key} onClick={() => onTab(key)}>
        <span className="step-index">{String(index + 1).padStart(2, '0')}</span><span>{name}<small>{description}</small></span>
      </button>)}
    </nav>
    <div className="workspace-stage"><div><p className="eyebrow">{current[0] === 'collection' ? 'IMPORT & EXPLORE' : current[0] === 'history' ? 'VERSION HISTORY' : 'PREPROCESSING'}</p>
      <h2>{activeTab === 'history' ? 'Nhật ký thay đổi' : current[2]}</h2></div><span className="badge">{current[1]}</span></div>
    {navigationLocked && <p className="notice" role="note">Đang xử lý hoặc chưa rõ kết quả Apply. Hoàn tất kiểm tra trước khi đổi bước.</p>}
    <div id={`${id}-panel`}>
      {activeTab === 'history' ? history : <>
        <div className={activeTab === 'collection' ? 'collection-overview' : 'product-grid'}>
          <div className="workspace-analysis">{analysis}</div>
          {activeTab !== 'collection' && <div className="workspace-method">{processing}</div>}
        </div>
        {table}
        <div ref={setPreviewHost} className="workspace-preview-host"/>
      </>}
    </div>
  </div></WorkspacePreviewContext>;
}
