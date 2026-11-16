// Read-only audit probes. Run `npm run build -w backend` before this script.
// Compare the working tree build with the contract. Does not modify application data.
const { processSnapshot } = require('../../packages/data-core/dist/index.js');
const { projectPreview } = require('../../backend/dist/modules/processing/preview-projection.js');
const { restoreSummary } = require('../../backend/dist/modules/history/restore-summary.js');
const { parseCreatePreview } = require('../../backend/dist/modules/processing/dto/processing.validation.js');
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const rowId = '00000000-0000-4000-8000-000000000003';
const column = (id, position) => ({ columnId: id, position, name: id, logicalType: 'number', format: null, lineage: null });
const base = { columns: [column(a, 0)], rows: [{ rowId, position: 0, cells: { [a]: { kind: 'number', value: 7 } } }] };
const added = { columns: [...base.columns, column(b, 1)], rows: [{ ...base.rows[0], cells: { ...base.rows[0].cells, [b]: { kind: 'number', value: 1 } } }] };
const specification = { method: 'one_hot', parameters: { keepSource: true, missingCategory: false, asCategory: true }, scope: { type: 'columns', columnIds: [a] }, statisticsScope: { type: 'whole-columns' } };
const preview = projectPreview(base, added, specification).summary;
const restored = restoreSummary(added, base);
const allMissing = { ...base, rows: [{ ...base.rows[0], cells: { [a]: { kind: 'null', value: null } } }] };
const dropped = processSnapshot(allMissing, { method: 'drop_missing_columns', parameters: { condition: 'all' }, scope: { type: 'dataset' }, statisticsScope: { type: 'whole-columns' } });
let ordinalStatus;
try {
  parseCreatePreview({ baseVersionId: '0123456789abcdef01234567', specification: { method: 'ordinal', scope: { type: 'columns', columnIds: [a] }, parameters: { keepSource: false, mapping: Array.from({ length: 5001 }, (_, i) => ({ value: { kind: 'text', value: String(i) }, label: i })) } } });
  ordinalStatus = 200;
} catch (error) { ordinalStatus = error.getStatus(); }
const observations = [
  { id: 'D21-preview-added-column', expected: 0, actual: preview.updatedCellCount, detail: 'Only a column was added; original cell is unchanged.' },
  { id: 'D21-restore-removed-column', expected: 0, actual: restored.updatedCellCount, detail: 'Only a column was removed; common cell is unchanged.' },
  { id: 'drop-last-column-code', expected: 'LAST_COLUMN', actual: dropped.errors[0]?.code, detail: 'API.md requires LAST_COLUMN when removing all columns.' },
  { id: 'ordinal-mapping-limit-status', expected: 413, actual: ordinalStatus, detail: '5001 distinct entries; API.md requires 413 above 5000.' },
].map(item => ({ ...item, matchesContract: item.actual === item.expected }));
console.log(JSON.stringify({ baseCommit: 'b7e33f60d1f4d99e8747576d0dc9b98b9b51a769', scope: 'working tree including remediation', observations }, null, 2));
if(observations.some(item=>!item.matchesContract))process.exitCode=1;
