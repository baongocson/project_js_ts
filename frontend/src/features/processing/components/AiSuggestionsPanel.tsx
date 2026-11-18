import { useEffect, useRef, useState } from 'react';
import type { Column, ProcessingSpecification } from '@dashboard/data-core';
import { Button, Feedback, type ProcessingGroup } from '../../../shared/ui';
import type { ProcessingAdapter } from '../types';
import { labels } from '../methods';
import { scanSuggestions, suggestionSpecification, type AiSuggestions, type AiSuggestion } from '../ai-suggestions';

export function AiSuggestionsPanel({ adapter, group, columns, locked, onPreview }: {
  adapter: ProcessingAdapter; group: ProcessingGroup; columns: Column[]; locked: boolean;
  onPreview(specification: ProcessingSpecification): void;
}) {
  const [state, setState] = useState<{ context: string; data?: AiSuggestions; error?: string; loading?: boolean; stopped?: boolean }>();
  const [visibleCount, setVisibleCount] = useState(10);
  const columnIds = columns.map(column => column.columnId);
  const context = JSON.stringify({ group, columnIds });
  const current = useRef(context);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => { current.current = context; return () => { controller.current?.abort(); }; }, [context, adapter]);
  const visible = state?.context === context ? state : undefined;
  async function suggest() {
    if (!adapter.suggestions) return;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setVisibleCount(10); setState({ context, loading: true });
    try {
      await scanSuggestions(adapter.suggestions, group, columnIds, abort.signal, data => {
        if (!abort.signal.aborted && current.current === context) setState({ context, loading: true, data });
      });
      if (!abort.signal.aborted && current.current === context) setState(value => value?.context === context ? { ...value, loading: false } : value);
    } catch (error) {
      if (!abort.signal.aborted && current.current === context) setState(value => ({ ...value, context, loading: false, error: error instanceof Error ? error.message : 'Không lấy được gợi ý AI.' }));
    }
  }
  function stop() {
    controller.current?.abort();
    setState(value => value?.context === context ? { ...value, loading: false, stopped: true } : value);
  }
  function preview(suggestion: AiSuggestion) {
    try { onPreview(suggestionSpecification(suggestion, group, columnIds)); }
    catch (error) { setState(value => ({ ...value, context, error: error instanceof Error ? error.message : 'Gợi ý không hợp lệ.' })); }
  }
  return <aside className="ai-suggestions" aria-label="Gợi ý AI">
    <h3>Gợi ý AI · Qwen3 4B</h3>
    <p>AI tự rà soát toàn bộ {columns.length.toLocaleString('vi-VN')} cột và gợi ý phương pháp phù hợp với tab hiện tại. Bạn không cần chọn cột hoặc phương pháp trước.</p>
    <p className="muted">Gợi ý không tự thay đổi dữ liệu; bạn xem Preview và quyết định Apply.</p>
    {!adapter.suggestions ? <p>Gợi ý AI hiện hỗ trợ dataset trên server khi đã đăng nhập. Bản local vẫn xử lý thủ công bình thường.</p> : <>
      <p className="muted">Chỉ thống kê được gửi tới mô hình local; không gửi tên cột hoặc nội dung ô.</p>
      <Button variant="secondary" disabled={locked || visible?.loading || !columns.length} onClick={() => void suggest()}>Phân tích toàn bộ dataset</Button>
      {visible?.loading && <Button variant="secondary" onClick={stop}>Dừng phân tích AI</Button>}
      <div aria-live="polite">
        {visible?.loading && <p>{visible.data ? `Đang xét lượt ${Math.min(visible.data.batch + 2, visible.data.totalBatches)}/${visible.data.totalBatches}…` : 'Đang đọc toàn bộ dataset và phân tích lượt đầu…'} Bạn vẫn có thể xử lý thủ công.</p>}
        {visible?.error && <Feedback error>{visible.error}</Feedback>}
        {visible?.stopped && <p>Đã dừng phân tích AI. Những phần chưa xét chưa có kết luận; bạn có thể phân tích lại.</p>}
        {visible?.data && <>
          <p className="muted">{visible.data.model} · Đã rà soát {visible.data.rowCount.toLocaleString('vi-VN')} dòng, {visible.data.columnCount.toLocaleString('vi-VN')} cột · AI đã xét {visible.data.reviewedCandidateCount}/{visible.data.candidateCount} ứng viên · {visible.data.suggestions.length} gợi ý</p>
          {!visible.loading && visible.data.nextBatch !== null && <p>Phân tích chưa hoàn tất. Các gợi ý hiện có chỉ thuộc phần đã xét; bấm phân tích lại để rà soát đầy đủ.</p>}
          {!visible.loading && visible.data.nextBatch === null && <p>Đã hoàn tất phân tích tất cả ứng viên của tab này trên toàn dataset.</p>}
          {!visible.loading && visible.data.nextBatch === null && !visible.data.suggestions.length && <p>Chưa có gợi ý phù hợp từ các phương pháp được xét cho tab này. Bạn có thể chọn phương pháp thủ công.</p>}
          <ul className="ai-suggestion-list">{visible.data.suggestions.slice(0, visibleCount).map(suggestion => <li key={suggestion.id}>
            <h4>{labels[suggestion.specification.method]} · {suggestion.specification.scope.type === 'columns' ? suggestion.specification.scope.columnIds.map(id => columns.find(c => c.columnId === id)?.name ?? id).join(', ') : 'Toàn dataset'}</h4>
            <p>{suggestion.reason}</p><p><strong>Bằng chứng:</strong> {suggestion.evidence}</p><p><strong>Cân nhắc:</strong> {suggestion.caution}</p>
            <Button variant="secondary" disabled={locked || visible.loading} onClick={() => preview(suggestion)}>Xem trước gợi ý</Button>
          </li>)}</ul>
          {visible.data.suggestions.length > visibleCount && <Button variant="secondary" onClick={() => setVisibleCount(count => count + 10)}>Hiện thêm gợi ý ({visible.data.suggestions.length - visibleCount})</Button>}
        </>}
      </div>
    </>}
  </aside>;
}
