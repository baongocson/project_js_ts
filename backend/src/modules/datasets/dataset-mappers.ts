import type { Column } from '@dashboard/data-core';
import type { DatasetRecord } from '../../infrastructure/database/be2-records';
export function publicColumn(column: Column): Column {
  return { columnId: column.columnId, name: column.name, position: column.position, logicalType: column.logicalType, format: column.format, lineage: column.lineage };
}
export function publicDataset(dataset: DatasetRecord) {
  const { name, byteSize, sha256: hash, importedAt } = dataset.originalFile;
  return { _id: dataset._id.toHexString(), currentVersionId: dataset.currentVersionId!.toHexString(), revision: dataset.revision, originalFile: { name, byteSize, sha256: hash, importedAt: importedAt.toISOString() } };
}
