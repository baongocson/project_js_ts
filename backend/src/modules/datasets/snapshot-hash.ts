import type { Column } from '@dashboard/data-core';
import { canonicalRequest } from '../../common/domain/canonical-request';
import { sha256 } from '../../infrastructure/idempotency/idempotency.service';
import { publicColumn } from './dataset-mappers';
/** Normalize public schema shape and JSON key order, independent of caller/BSON order. */
export function snapshotContentHash(columns: Column[], chunkHashes: string[]): string {
  const schema: unknown = JSON.parse(JSON.stringify(columns.map(publicColumn)));
  return sha256(canonicalRequest(schema) + ':' + chunkHashes.join(':'));
}
