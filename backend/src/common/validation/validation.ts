import { BadRequestException } from '@nestjs/common';
import type { CellInputDto, ValidationIssueDto } from '../dto/cell.dto';
export type RecordValue = Record<string, unknown>;
export class InputValidator {
  readonly issues: ValidationIssueDto[] = [];
  issue(path: string, message: string) { this.issues.push({ path, code: 'INVALID_VALUE', message }); }
  object(value: unknown, path: string, allowed: readonly string[]): RecordValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { this.issue(path, 'Phải là object, không được null'); return {}; }
    const result = value as RecordValue;
    for (const key of Object.keys(result)) if (!allowed.includes(key)) this.issue(path ? `${path}.${key}` : key, 'Trường không được hỗ trợ');
    return result;
  }
  enumeration(value: unknown, path: string, values: readonly unknown[]) { if (!values.includes(value)) this.issue(path, 'Giá trị không được hỗ trợ'); }
  number(value: unknown, path: string, positive = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (positive && value <= 0)) this.issue(path, 'Phải là số hữu hạn' + (positive ? ' lớn hơn 0' : ''));
  }
  integer(value: unknown, path: string, min: number, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) this.issue(path, 'Số nguyên ngoài phạm vi hợp lệ');
  }
  id(value: unknown, path: string, kind: 'uuid' | 'objectId' = 'uuid') {
    const pattern = kind === 'uuid' ? /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i : /^[0-9a-f]{24}$/i;
    if (typeof value !== 'string' || !pattern.test(value)) this.issue(path, 'Định danh không hợp lệ');
  }
  ids(value: unknown, path: string, min = 1) {
    if (!Array.isArray(value)) { this.issue(path, 'Phải là danh sách ID'); return; }
    this.integer(value.length, path, min, 1000);
    value.forEach((id, i) => this.id(id, `${path}.${i}`));
    if (new Set(value.map(id => typeof id === 'string' ? id.toLowerCase() : id)).size !== value.length) this.issue(path, 'ID không được trùng');
  }
  cell(value: unknown, path: string): CellInputDto {
    const cell = this.object(value, path, ['kind', 'value']);
    this.enumeration(cell.kind, `${path}.kind`, ['text', 'number', 'date', 'datetime', 'boolean', 'null']);
    if (!Object.hasOwn(cell, 'value')) this.issue(`${path}.value`, 'Thiếu giá trị');
    if (cell.kind === 'null' && cell.value !== null) this.issue(`${path}.value`, 'Kind null phải có value=null');
    if (cell.kind === 'text' && (typeof cell.value !== 'string' || /[\uD800-\uDFFF]/u.test(cell.value))) this.issue(`${path}.value`, 'Phải là chuỗi Unicode hợp lệ');
    if (cell.kind === 'number') {
      this.number(cell.value, `${path}.value`);
      if (typeof cell.value === 'number' && Number.isInteger(cell.value) && !Number.isSafeInteger(cell.value)) this.issue(`${path}.value`, 'Số nguyên vượt độ chính xác; hãy giữ text');
    }
    if (cell.kind === 'boolean' && typeof cell.value !== 'boolean') this.issue(`${path}.value`, 'Phải là boolean');
    if (cell.kind === 'date') {
      const date = cell.value;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) this.issue(`${path}.value`, 'Ngày không hợp lệ');
    }
    if (cell.kind === 'datetime') {
      const date = cell.value;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString() !== date) this.issue(`${path}.value`, 'Datetime phải là ISO UTC milliseconds hợp lệ');
    }
    return cell as CellInputDto;
  }
  finish<T>(result: T): T {
    if (this.issues.length) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: { issues: this.issues } });
    return normalizeResourceIds(result);
  }
}

const scalarIds = new Set(['projectId','datasetId','versionId','previewId','rowId','columnId','baseVersionId','boundVersionId','expectedCurrentVersionId','xColumnId','yColumnId','zColumnId']);
const arrayIds = new Set(['columnIds','outlierColumnIds']);
function normalizeResourceIds<T>(input:T):T {
  function visit(value:unknown,key=''):unknown {
    if(typeof value==='string')return scalarIds.has(key)?value.toLowerCase():value;
    if(Array.isArray(value))return arrayIds.has(key)?value.map(x=>typeof x==='string'?x.toLowerCase():x):value.map(x=>visit(x));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,k)]));
    return value;
  }
  return visit(input) as T;
}
