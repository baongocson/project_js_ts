import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { importCsv, processSnapshot, projectPreview, ENGINE_VERSION, type Snapshot } from '@dashboard/data-core';
import { ProcessingPanel, type ProcessingAdapter, type PreviewPage } from '../../src/features/processing';
import type { ProcessingGroup } from '../../src/shared/ui';
import '../../src/index.css';

let index = 0;
const original = importCsv(new TextEncoder().encode('other,description\nplain, <b>Hello</b> \nnext,world\n'), { delimiter: ',' }, () => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`);
const mode = new URLSearchParams(location.search).get('mode');
function Fixture() {
  const [snapshot, setSnapshot] = useState<Snapshot>(original), [group, setGroup] = useState<ProcessingGroup>('cleaning');
  const [previewCount, setPreviewCount] = useState(0), [applyCount, setApplyCount] = useState(0), [version, setVersion] = useState(1);
  const adapter = useMemo(() => {
    let candidate: Snapshot | undefined, page: PreviewPage;
    const value: ProcessingAdapter = {
      preview: async spec => {
        setPreviewCount(n => n + 1); const result = processSnapshot(snapshot, spec); candidate = result.snapshot;
        const projection = projectPreview(snapshot, candidate, spec);
        page = { preview: { previewId: 'preview', status: 'ready', canApply: result.canApply, baseVersionId: `v${version}`, candidateVersionId: 'candidate', engineVersion: ENGINE_VERSION, specHash: 'fixture', summary: projection.summary, schemaChanges: projection.schemaChanges, diagnostics: { errors: [], warnings: [], errorCount: 0, warningCount: 0, truncated: false }, expiresAt: new Date(Date.now() + 60000).toISOString() }, changes: projection.changes.map(change => ({ ...change, beforeCells: snapshot.rows.find(r => r.rowId === change.rowId)?.cells ?? null, afterCells: candidate!.rows.find(r => r.rowId === change.rowId)?.cells ?? null, diffColumnIds: snapshot.columns.map(c => c.columnId) })), page: 1, limit: 50, totalChanges: projection.changes.length, totalPages: 1 };
        return page.preview;
      },
      get: async () => page,
      apply: async () => { setApplyCount(n => n + 1); setSnapshot(candidate!); setVersion(n => n + 1); },
      categories: async () => [],
      suggestions: mode === 'offline' ? undefined : async (selectedGroup, _signal, batch = 0) => {
        await new Promise(resolve => setTimeout(resolve, mode === 'slow' ? 500 : 30));
        if (mode === 'error' || mode === 'partial' && batch > 0) throw new Error('Không kết nối được Ollama.');
        const multiple = mode === 'multi' || mode === 'partial';
        return { versionId: `v${version}`, group: selectedGroup, columnIds: snapshot.columns.map(c => c.columnId), columnCount: snapshot.columns.length, candidateCount: multiple ? 13 : mode === 'empty' ? 0 : 1, reviewedCandidateCount: multiple ? batch ? 13 : 12 : mode === 'empty' ? 0 : 1, batch, totalBatches: multiple ? 2 : 1, nextBatch: multiple && !batch ? 1 : null, model: 'qwen3:4b', generatedAt: new Date().toISOString(), rowCount: snapshot.rows.length,
          suggestions: mode === 'empty' ? [] : [{ id: `fixture-html-${batch}`, reason: 'Cân nhắc bỏ HTML.', evidence: '1/2 ô có dấu hiệu HTML.', caution: 'Kiểm tra nội dung trước khi áp dụng.', specification: { method: 'strip_html', parameters: { decodeEntities: true }, scope: { type: 'columns', columnIds: [snapshot.columns[1].columnId] }, statisticsScope: { type: 'whole-columns' } } }] };
      },
    }; return value;
  }, [snapshot, version]);
  return <main className="workspace"><h1>Kiểm tra gợi ý AI</h1><button onClick={() => setGroup('missing')}>Chuyển Missing</button><button onClick={() => setVersion(n => n + 1)}>Chuyển phiên bản</button><p data-testid="preview-count">Preview: {previewCount}</p><p data-testid="apply-count">Apply: {applyCount}</p><pre data-testid="source">{String(snapshot.rows[0].cells[snapshot.columns[1].columnId].value)}</pre>
    <ProcessingPanel key={`${group}:${version}`} adapter={adapter} group={group} columns={snapshot.columns} onApplied={async () => {}}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
