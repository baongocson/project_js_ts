import { InputValidator } from '../../../common/validation/validation';
import type { LogicalType } from '../../../common/dto/cell.dto';
export interface ImportOptionsDto {
  encoding: 'utf-8'; delimiter: ',' | ';' | '\t'; headerPolicy: 'first-row'; missingPolicy: 'default-v1';
  columnTypes?: { position: number; logicalType: LogicalType }[];
}
export function parseImportOptions(input: unknown): ImportOptionsDto {
  const v = new InputValidator();
  let decoded = input;
  if (typeof input === 'string') {
    try { decoded = JSON.parse(input); } catch { v.issue('importOptions', 'JSON không hợp lệ'); }
  }
  const obj = v.object(decoded === undefined ? {} : decoded, 'importOptions', ['encoding','delimiter','headerPolicy','missingPolicy','columnTypes']);
  const result = {
    encoding: obj.encoding === undefined ? 'utf-8' : obj.encoding,
    delimiter: obj.delimiter === undefined ? ',' : obj.delimiter === 'tab' ? '\t' : obj.delimiter,
    headerPolicy: obj.headerPolicy === undefined ? 'first-row' : obj.headerPolicy,
    missingPolicy: obj.missingPolicy === undefined ? 'default-v1' : obj.missingPolicy,
    ...(obj.columnTypes === undefined ? {} : { columnTypes: obj.columnTypes }),
  };
  v.enumeration(result.encoding, 'importOptions.encoding', ['utf-8']);
  v.enumeration(result.delimiter, 'importOptions.delimiter', [',',';','\t']);
  v.enumeration(result.headerPolicy, 'importOptions.headerPolicy', ['first-row']);
  v.enumeration(result.missingPolicy, 'importOptions.missingPolicy', ['default-v1']);
  if (obj.columnTypes !== undefined) {
    if (!Array.isArray(obj.columnTypes)) v.issue('importOptions.columnTypes', 'Phải là danh sách');
    else {
      v.integer(obj.columnTypes.length, 'importOptions.columnTypes', 0, 1000);
      const seen = new Set<unknown>();
      obj.columnTypes.forEach((entry, i) => {
        const path = `importOptions.columnTypes.${i}`;
        const column = v.object(entry, path, ['position','logicalType']);
        v.integer(column.position, `${path}.position`, 0, 999);
        v.enumeration(column.logicalType, `${path}.logicalType`, ['number','text','date','datetime','boolean','mixed']);
        if (seen.has(column.position)) v.issue(`${path}.position`, 'Cột không được trùng');
        seen.add(column.position);
      });
    }
  }
  return v.finish(result as ImportOptionsDto);
}

export interface CsvUploadDto {originalname:string;mimetype:string;size:number;buffer:Uint8Array}
export interface ImportDatasetRequestDto {file:CsvUploadDto;importOptions?:Partial<ImportOptionsDto>}
