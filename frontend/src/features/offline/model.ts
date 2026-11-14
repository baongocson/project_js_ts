/** Browser-first demo engine. These versions are LOCAL ONLY until a server sync protocol is implemented. */
export type Cell = string;
export interface DataTable { columns: string[]; rows: Cell[][] }
export interface LocalVersion { id: string; number: number; createdAt: string; action: string; table: DataTable }
export interface LocalProject { id: string; name: string; versions: LocalVersion[]; currentVersionId: string; pendingSync: boolean }
export type Transformation = { kind: 'trim'; column: number } | { kind: 'fill'; column: number; value: string };
export interface PreviewResult { changed: number; before: DataTable; after: DataTable; samples: { row: number; before: string; after: string }[] }

function parseRecord(text: string, delimiter: string): string[][] {
  const output: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (!quoted && field.length === 0) quoted = true;
      else if (quoted) quoted = false;
      else throw new Error(`Dấu ngoặc kép sai tại vị trí ${i + 1}`);
    } else if (character === delimiter && !quoted) {
      record.push(field); field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      output.push(record);
      record = []; field = '';
    } else { field += character; }
  }
  if (quoted) throw new Error('CSV có dấu ngoặc kép chưa đóng');
  if (field !== '' || record.length > 0) { record.push(field); output.push(record); }
  return output;
}

export function parseCsv(text: string): DataTable {
  if (new TextEncoder().encode(text).byteLength > 16_000_000) throw new Error('CSV vượt quá 16.000.000 byte');
  const clean = text.replace(/^\uFEFF/, '');
  const first = clean.split(/\r?\n/, 1)[0];
  const delimiter = (first.match(/;/g) ?? []).length > (first.match(/,/g) ?? []).length ? ';' : ',';
  const records = parseRecord(clean, delimiter);
  if (records.length < 2) throw new Error('CSV cần hàng tiêu đề và ít nhất một hàng dữ liệu');
  const columns = records[0].map(column => column.trim());
  if (columns.some(column => column.length === 0)) throw new Error('Tên cột không được rỗng');
  if (columns.length > 1000) throw new Error('CSV vượt quá 1.000 cột');
  if (new Set(columns).size !== columns.length) throw new Error('Tên cột phải duy nhất');
  const rows = records.slice(1);
  const bad = rows.findIndex(row => row.length !== columns.length);
  if (bad !== -1) throw new Error(`Dòng ${bad + 2} có ${rows[bad].length} ô, yêu cầu ${columns.length}`);
  return { columns, rows };
}

export function previewTransform(table: DataTable, action: Transformation): PreviewResult {
  if (!Number.isInteger(action.column) || action.column < 0 || action.column >= table.columns.length) throw new Error('Cột không hợp lệ');
  const samples: PreviewResult['samples'] = [];
  let changed = 0;
  const rows = table.rows.map((row, index) => {
    const before = row[action.column];
    const after = action.kind === 'trim' ? before.trim() : (before.trim() === '' || before.trim().toLowerCase() === 'n/a' ? action.value : before);
    if (before !== after) {
      changed += 1;
      if (samples.length < 5) samples.push({ row: index + 1, before, after });
      const next = [...row]; next[action.column] = after; return next;
    }
    return [...row];
  });
  return { changed, before: table, after: { columns: [...table.columns], rows }, samples };
}

export function createProject(name: string, table: DataTable): LocalProject {
  const id = crypto.randomUUID();
  const version: LocalVersion = { id: crypto.randomUUID(), number: 1, createdAt: new Date().toISOString(), action: 'import', table };
  return { id, name, versions: [version], currentVersionId: version.id, pendingSync: true };
}
export function activeVersion(project: LocalProject): LocalVersion {
  const found = project.versions.find(version => version.id === project.currentVersionId);
  if (!found) throw new Error('Không tìm thấy phiên bản hiện tại');
  return found;
}
export function publishVersion(project: LocalProject, table: DataTable, action: string): LocalProject {
  const version: LocalVersion = { id: crypto.randomUUID(), number: project.versions.length + 1, createdAt: new Date().toISOString(), action, table };
  return { ...project, versions: [...project.versions, version], currentVersionId: version.id, pendingSync: true };
}
export function restoreVersion(project: LocalProject, versionId: string): LocalProject {
  const target = project.versions.find(version => version.id === versionId);
  if (!target) throw new Error('Phiên bản cần khôi phục không tồn tại');
  const snapshot = { columns: [...target.table.columns], rows: target.table.rows.map(row => [...row]) };
  return publishVersion(project, snapshot, `restore từ V${target.number}`);
}

const STORAGE_DB = 'dashboard3d-browser-demo-v1';
const STORAGE_STORE = 'projects';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORAGE_STORE)) request.result.createObjectStore(STORAGE_STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở IndexedDB'));
  });
}
export async function readLocalProject(): Promise<LocalProject | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, 'readonly');
    const req = tx.objectStore(STORAGE_STORE).get('current');
    req.onsuccess = () => resolve((req.result as LocalProject | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error('Không đọc được IndexedDB'));
    tx.oncomplete = () => db.close();
  });
}
export async function saveLocalProject(project: LocalProject): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE_STORE, 'readwrite');
    tx.objectStore(STORAGE_STORE).put(project, 'current');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Không lưu được IndexedDB')); };
  });
}
