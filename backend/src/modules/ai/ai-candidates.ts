import { analyzeSummary, cellKey, missingKind, type ProcessingSpecification, type Snapshot } from '@dashboard/data-core';
import type { AiGroup } from './ai.contract';

export interface AiCandidate { id: string; specification: ProcessingSpecification; evidence: string; caution: string }
/** Scan every column and row of the immutable version, independently of manual form selection. */
export function buildCandidates(snapshot: Snapshot, group: AiGroup) {
  const summary = analyzeSummary(snapshot, '', 0, { outlierMethod: 'iqr', outlierThreshold: 1.5, outlierColumnIds: group === 'outliers' ? snapshot.columns.filter(c => c.logicalType === 'number').map(c => c.columnId) : [] });
  const candidates: AiCandidate[] = [];
  const add = (specification: Omit<ProcessingSpecification, 'statisticsScope'>, evidence: string, caution = 'Kiểm tra Preview và ý nghĩa nghiệp vụ trước khi áp dụng.') => {
    candidates.push({ id: `suggestion-${candidates.length + 1}`, specification: { ...specification, statisticsScope: { type: 'whole-columns' } } as ProcessingSpecification, evidence, caution });
  };
  for (const column of snapshot.columns) {
    const scope = { type: 'columns' as const, columnIds: [column.columnId] };
    const cells = snapshot.rows.map(row => row.cells[column.columnId]).filter(cell => cell && missingKind(cell) === undefined);
    const texts = cells.filter(cell => cell.kind === 'text').map(cell => String(cell.value));
    const numbers = cells.filter(cell => cell.kind === 'number').map(cell => Number(cell.value));
    const missing = summary.missingByColumn.find(c => c.columnId === column.columnId)!.count;
    const distinct = new Set(cells.map(cellKey)).size;
    if (group === 'cleaning') {
      const html = texts.filter(value => /<\/?[a-z][^>]*>/i.test(value)).length;
      const whitespace = texts.filter(value => value.trim() !== value || /\s{2,}/.test(value)).length;
      if (column.logicalType === 'text' && html) add({ method: 'strip_html', parameters: { decodeEntities: true }, scope }, `${html}/${snapshot.rows.length} ô có dấu hiệu thẻ HTML.`, 'Chỉ bỏ HTML khi cần nội dung văn bản; cú pháp giống thẻ có thể là dữ liệu hợp lệ.');
      if (column.logicalType === 'text' && whitespace) add({ method: 'normalize_whitespace', parameters: { mode: 'collapse' }, scope }, `${whitespace}/${snapshot.rows.length} ô có khoảng trắng dư.`, 'Khoảng trắng có thể có ý nghĩa trong mã nguồn hoặc văn bản định dạng.');
      if (column.logicalType === 'text' && texts.length && texts.length === cells.length) {
        const safeNumber = texts.every(value => /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && (!Number.isInteger(Number(value)) || Number.isSafeInteger(Number(value))));
        if (safeNumber) add({ method: 'convert_number', parameters: { decimalSeparator: '.', allowThousands: false }, scope }, `${texts.length} giá trị không thiếu có dạng số, không có số 0 đầu hoặc số nguyên vượt độ chính xác.`, 'Mã định danh có thể cần giữ text dù chỉ chứa chữ số.');
      }
      if (column.logicalType === 'mixed') add({ method: 'convert_text', parameters: { format: 'canonical' }, scope }, 'Cột đang có kiểu mixed.', 'Chuyển sang text làm thay đổi cách tính toán và sắp xếp; không phục hồi được định dạng nguồn đã mất.');
    }
    if (group === 'missing' && missing && cells.length) {
      if (column.logicalType === 'number') {
        add({ method: 'fill_median', parameters: {}, scope }, `${missing}/${snapshot.rows.length} ô thiếu trong cột số.`, 'Điền trung vị có thể làm giảm biến thiên; cần xem cơ chế thiếu và mục tiêu phân tích.');
        add({ method: 'fill_mean', parameters: {}, scope }, `${missing}/${snapshot.rows.length} ô thiếu trong cột số.`, 'Trung bình nhạy với ngoại lệ; với dữ liệu huấn luyện cần tránh rò rỉ giữa train/test.');
      } else add({ method: 'fill_mode', parameters: { tieBreak: 'typed-ascending' }, scope }, `${missing}/${snapshot.rows.length} ô thiếu; có ${distinct} giá trị khác nhau.`, 'Điền mode làm tăng tần suất nhóm phổ biến, có thể gây lệch phân phối.');
    }
    if (group === 'outliers' && column.logicalType === 'number') {
      const outlier = summary.outliersByColumn.find(c => c.columnId === column.columnId)!;
      if (outlier.count) add({ method: 'clip_iqr', parameters: { factor: 1.5 }, scope }, `${outlier.count} giá trị ngoài biên IQR [${outlier.lower}, ${outlier.upper}].`, 'Ngoại lệ có thể là quan sát hợp lệ; chỉ giới hạn sau khi kiểm tra nghiệp vụ.');
    }
    if (group === 'scaling' && column.logicalType === 'number' && distinct > 1) {
      add({ method: 'scale_minmax', parameters: { rangeMin: 0, rangeMax: 1 }, scope }, `${numbers.length} giá trị số, ${distinct} giá trị khác nhau.`, 'Dùng khi tác vụ cần thang [0,1]; nhạy với cực trị và cần tránh rò rỉ train/test.');
      add({ method: 'standardize', parameters: {}, scope }, 'Cột số không hằng.', 'Chỉ dùng khi tác vụ cần chuẩn hóa thang đo; không mặc nhiên cải thiện mọi mô hình.');
    }
    if (group === 'transformation') {
      if (column.logicalType === 'number' && numbers.length && numbers.every(n => n >= 0) && distinct > 1) add({ method: 'log1p', parameters: {}, scope }, 'Các giá trị số không thiếu đều không âm, cột không hằng.', 'Cân nhắc khi muốn nén thang đo; không tự kết luận phân phối lệch chỉ từ điều kiện không âm.');
      if (column.logicalType === 'text' && texts.some(text => /\s/.test(text.trim()))) add({ method: 'tfidf', parameters: { lowercase: true, minDf: 1, maxFeatures: 100, norm: 'l2', sublinearTf: false, keepSource: true }, scope }, 'Cột text có nội dung nhiều từ.', 'Dùng cho tác vụ văn bản; có thể sinh nhiều cột và cần tách train/test trước khi học từ vựng.');
    }
    if (group === 'encoding' && column.logicalType !== 'number' && distinct >= 2 && distinct <= 20 && distinct < cells.length) add({ method: 'one_hot', parameters: { keepSource: true, missingCategory: false, asCategory: false }, scope }, `Cột có ${distinct} giá trị khác nhau trên ${cells.length} ô không thiếu.`, 'Dùng cho biến phân loại không có thứ tự; tên hoặc mã định danh không mặc nhiên là đặc trưng phù hợp.');
  }
  if (group === 'cleaning' && summary.duplicateRowCount) {
    add({ method: 'remove_duplicates', parameters: { keep: 'first' }, scope: { type: 'dataset' } }, `${summary.duplicateRowCount} dòng trùng toàn bộ giá trị trên tất cả cột.`, 'Áp dụng toàn dataset. Dòng trùng có thể là sự kiện lặp hợp lệ.');
  }
  return { rowCount: snapshot.rows.length, columnCount: snapshot.columns.length, candidates };
}
