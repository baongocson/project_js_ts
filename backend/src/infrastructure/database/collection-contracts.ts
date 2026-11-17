import { Schema, SchemaTypeOptions, IndexDefinition } from 'mongoose';
import type { IndexDescription } from 'mongodb';

// One source for Mongoose models and server-side BSON validators. The latter also
// protect writes made with the native driver, bulk updates and Atlas tools.
type Shape = { bsonType?: string | string[]; properties?: Record<string, Shape>; required?: string[]; items?: Shape; [key: string]: unknown };
const str = (extra: Partial<Shape> = {}): Shape => ({ bsonType: 'string', ...extra });
const num = (min?: number, max?: number): Shape => ({ bsonType: ['int', 'long', 'double', 'decimal'], ...(min === undefined ? {} : { minimum: min }), ...(max === undefined ? {} : { maximum: max }) });
const integer = (min = 0, max = Number.MAX_SAFE_INTEGER): Shape => ({ ...num(min, max), multipleOf: 1 });
const bool: Shape = { bsonType: 'bool' };
const date: Shape = { bsonType: 'date' };
const oid: Shape = { bsonType: 'objectId' };
const uuid = str({ pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' });
const hash = str({ pattern: '^[0-9a-f]{64}$' });
const enumeration = (...values: string[]): Shape => str({ enum: values });
const nullable = (shape: Shape): Shape => ({ ...shape, bsonType: [...(Array.isArray(shape.bsonType) ? shape.bsonType : [shape.bsonType!]), 'null'], ...(shape.enum ? { enum: [...shape.enum as unknown[], null] } : {}) });
const arr = (items: Shape, extra: Partial<Shape> = {}): Shape => ({ bsonType: 'array', items, ...extra });
const obj = (properties: Record<string, Shape>, optional: string[] = []): Shape => {
  const required = Object.keys(properties).filter(k => !optional.includes(k));
  return { bsonType: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false };
};
// Parameters vary by method; the existing method-specific DTO validator remains
// authoritative. This is intentional extensibility, not a catch-all document.
const parameters: Shape = { bsonType: 'object' };
const logicalType = enumeration('number', 'text', 'date', 'datetime', 'boolean', 'mixed');
const cell: Shape = { oneOf: [obj({ kind: enumeration('text','date','datetime'), value: str() }), obj({ kind: enumeration('number'), value: num() }), obj({ kind: enumeration('boolean'), value: bool }), obj({ kind: enumeration('null'), value: { bsonType: 'null' } })] };
const category: Shape = { oneOf: [cell, obj({ isMissing: { bsonType: 'bool', enum: [true] } })] };
const format = obj({ inputFormat: str(), timezone: str(), decimalSeparator: enumeration('.', ','), allowThousands: bool }, ['inputFormat', 'timezone', 'decimalSeparator', 'allowThousands']);
const lineage = obj({ sourceColumnId: uuid, category }, ['category']);
const columnFields = { columnId: uuid, name: str(), position: integer(), logicalType, format: nullable(format), lineage: nullable(lineage) };
const counts = obj({ rowCount: integer(), columnCount: integer(0, 1000) });
const statistics = obj({ columnId: uuid, validCount: integer(), missingCount: integer(), mean: num(), median: num(), mode: cell, min: num(), max: num(), std: num(0), q1: num(), q3: num(), lower: num(), upper: num() }, ['mean', 'median', 'mode', 'min', 'max', 'std', 'q1', 'q3', 'lower', 'upper']);
const summary = obj({ before: counts, after: counts, insertedRowCount: integer(), deletedRowCount: integer(), updatedRowCount: integer(), updatedCellCount: integer(), addedColumnCount: integer(), removedColumnCount: integer(), typeChangedColumnCount: integer(), metadataChangedColumnCount: integer(), usedStatistics: arr(statistics) });
const diagnostic = obj({ code: str(), message: str(), rowId: uuid, columnId: uuid, path: str() }, ['rowId', 'columnId', 'path']);
const diagnostics = obj({ errorCount: integer(), warningCount: integer(), errors: arr(diagnostic, { maxItems: 100 }), warnings: arr(diagnostic, { maxItems: 100 }), truncated: bool });
const importOptions = obj({ encoding: enumeration('utf-8'), delimiter: enumeration(',', ';', '\t'), headerPolicy: enumeration('first-row'), missingPolicy: enumeration('default-v1'), columnTypes: arr(obj({ position: integer(0, 999), logicalType }), { maxItems: 1000 }) }, ['columnTypes']);
const methods = ['edit_cell','remove_duplicates','strip_html','normalize_whitespace','convert_number','convert_text','convert_date','convert_datetime','convert_boolean','uppercase','lowercase','replace_value','fill_mean','fill_median','fill_mode','fill_max','fill_constant','drop_missing_rows','drop_missing_columns','clip_iqr','clip_zscore','scale_minmax','standardize','log1p','square','one_hot','ordinal','tfidf'];
const scope: Shape = { oneOf: [obj({ type: enumeration('cell'), rowId: uuid, columnId: uuid }), obj({ type: enumeration('columns'), columnIds: arr(uuid, { minItems: 1, maxItems: 1000, uniqueItems: true }) }), obj({ type: enumeration('dataset') })] };
const specification = obj({ method: enumeration(...methods), engineVersion: str({ minLength: 1 }), parameters, scope, statisticsScope: obj({ type: enumeration('whole-columns') }) });
const operationSpecification: Shape = { oneOf: [specification, obj({ importOptions, fileSha256: hash }), obj({ targetVersionId: oid })] };
const filter: Shape = { oneOf: [obj({ columnId: uuid, op: enumeration('isMissing', 'isNotMissing') }), obj({ columnId: uuid, op: enumeration('eq','ne','lt','lte','gt','gte','contains'), value: cell })] };
const chartConfig = obj({ xColumnId: nullable(uuid), yColumnId: nullable(uuid), zColumnId: nullable(uuid), colorMode: enumeration('normal','missing','outlier'), outlierColumnIds: arr(uuid, { uniqueItems: true, maxItems: 1000 }), outlierMethod: enumeration('iqr','zscore'), threshold: { ...num(0), exclusiveMinimum: true } });
const selection = obj({ columnIds: arr(uuid, { uniqueItems: true, maxItems: 1000 }), cell: nullable(obj({ rowId: uuid, columnId: uuid })) });
const tableState = obj({ filters: arr(filter), sort: nullable(obj({ columnId: uuid, direction: enumeration('asc','desc') })), page: integer(1), pageSize: integer(1, 100) });

export interface CollectionContract { name: string; schema: Schema; validator: Record<string, unknown>; indexes: IndexDescription[] }
const contracts: CollectionContract[] = [];
function mongooseField(shape: Shape): SchemaTypeOptions<unknown> {
  const types = Array.isArray(shape.bsonType) ? shape.bsonType : [shape.bsonType];
  const type = types.find(t => t !== 'null');
  const options: Record<string, unknown> = {};
  if (type === 'object' && shape.properties) options.type = new Schema(Object.fromEntries(Object.entries(shape.properties).map(([k, v]) => [k, mongooseField(v)])), { _id: false, strict: 'throw', minimize: false, suppressReservedKeysWarning: true });
  else if (type === 'array') { options.type = [mongooseField(shape.items!)]; options.default = undefined; }
  else options.type = ({ string: String, bool: Boolean, date: Date, objectId: Schema.Types.ObjectId, binData: Buffer, int: Number, long: Number, double: Number, decimal: Number } as Record<string, unknown>)[type!] ?? Schema.Types.Mixed;
  // BSON validator enforces required, nullable, enums and bounds on every write.
  return options as SchemaTypeOptions<unknown>;
}
function define(name: string, fields: Record<string, Shape>, indexes: IndexDescription[], extra: Record<string, unknown> = {}) {
  const jsonSchema = obj({ _id: oid, ...fields });
  const schema = new Schema(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, mongooseField(v)])), { collection: name, strict: 'throw', versionKey: false, autoIndex: false, autoCreate: false, minimize: false });
  if (name === 'users') {
    schema.path('preferences').default(() => ({ theme: 'system' }));
    schema.path('preferences.theme').default('system');
    schema.path('emailNormalized').set((value: string) => typeof value === 'string' ? value.trim().toLowerCase() : value);
  }
  for (const { key, ...options } of indexes) schema.index(key as IndexDefinition, options);
  contracts.push({ name, schema, validator: { $jsonSchema: jsonSchema, ...extra }, indexes });
}
const unique = (key: IndexDescription['key'], name: string, extra = {}): IndexDescription => ({ key, name, unique: true, ...extra });
const index = (key: IndexDescription['key'], name: string): IndexDescription => ({ key, name });
define('users', { email: str({ minLength: 1, maxLength: 254 }), emailNormalized: str({ minLength: 1, maxLength: 254, pattern: '^[\\x00-\\x7F]+$' }), passwordHash: str({ minLength: 1 }), displayName: nullable(str({ minLength: 1, maxLength: 100 })), preferences: obj({ theme: enumeration('light','dark','system') }), lifecycle: enumeration('active','deleting'), writeEpoch: integer(), createdAt: date, updatedAt: date }, [unique({ emailNormalized: 1 }, 'uq_users_email')], { $expr: { $eq: ['$emailNormalized', { $toLower: { $trim: { input: '$email' } } }] } });
define('authSessions', { userId: oid, refreshTokenHash: str({ minLength: 1 }), rotationCounter: integer(), expiresAt: date, revokedAt: nullable(date), createdAt: date, lastUsedAt: date }, [unique({ refreshTokenHash: 1 }, 'uq_sessions_refresh'), index({ userId: 1, revokedAt: 1 }, 'ix_sessions_user'), { key: { expiresAt: 1 }, name: 'ttl_sessions_expiry', expireAfterSeconds: 0 }]);
define('projects', { ownerId: oid, name: str({ minLength: 1, maxLength: 100 }), lifecycle: enumeration('empty','ready','deleting'), writeEpoch: integer(), createdAt: date, updatedAt: date }, [index({ ownerId: 1, updatedAt: -1, _id: -1 }, 'ix_projects_owner_updated')]);
define('workspaces', { projectId: oid, boundVersionId: nullable(oid), revision: integer(), activeTab: enumeration('collection','cleaning','missing','outliers','scaling','transformation','encoding','history'), chartConfig, selection, tableState, updatedAt: date }, [unique({ projectId: 1 }, 'uq_workspaces_project')]);
define('datasets', { projectId: oid, originalFile: obj({ name: str(), byteSize: integer(1, 16_000_000), sha256: hash, importedAt: date, storageKey: str({ minLength: 1 }) }), importOptions, currentVersionId: nullable(oid), revision: integer(), lifecycle: enumeration('importing','ready'), createdAt: date, updatedAt: date }, [unique({ projectId: 1 }, 'uq_datasets_project'), index({ currentVersionId: 1 }, 'ix_datasets_current')]);
define('datasetVersions', { datasetId: oid, versionNumber: nullable(integer(1)), parentVersionId: nullable(oid), restoredFromVersionId: nullable(oid), state: enumeration('building','staged','published','discarding'), rowCount: integer(), columnCount: integer(1, 1000), encodedByteSize: integer(0, 100 * 1024 * 1024), contentHash: nullable(hash), createdAt: date, publishedAt: nullable(date) }, [unique({ datasetId: 1, versionNumber: 1 }, 'uq_versions_published_number', { partialFilterExpression: { state: 'published' } }), index({ datasetId: 1, publishedAt: -1, _id: -1 }, 'ix_versions_history'), index({ state: 1, createdAt: 1 }, 'ix_versions_cleanup')], { $or: [{ state: { $ne: 'published' } }, { versionNumber: { $type: 'number' }, publishedAt: { $type: 'date' }, contentHash: { $type: 'string' } }] });
define('versionColumns', { versionId: oid, ...columnFields }, [unique({ versionId: 1, columnId: 1 }, 'uq_columns_id'), unique({ versionId: 1, position: 1 }, 'uq_columns_position')]);
define('dataChunks', { versionId: oid, chunkIndex: integer(), payload: { bsonType: 'binData' }, byteLength: integer(1, 4 * 1024 * 1024), sha256: hash, codecVersion: str({ minLength: 1 }) }, [unique({ versionId: 1, chunkIndex: 1 }, 'uq_chunks_index')], { $expr: { $eq: ['$byteLength', { $binarySize: '$payload' }] } });
define('processingPreviews', { datasetId: oid, baseVersionId: oid, baseRevision: integer(), candidateVersionId: nullable(oid), specification, specHash: hash, status: enumeration('building','ready','invalid','applied','expired'), summary, schemaChanges: obj({ added: arr(obj(columnFields)), removed: arr(obj(columnFields)), modified: arr(obj({ columnId: uuid, before: obj(columnFields), after: obj(columnFields) })) }), diagnostics, createdAt: date, expiresAt: date }, [index({ datasetId: 1, createdAt: -1 }, 'ix_previews_dataset'), unique({ candidateVersionId: 1 }, 'uq_previews_candidate', { partialFilterExpression: { candidateVersionId: { $type: 'objectId' } } }), index({ status: 1, expiresAt: 1 }, 'ix_previews_cleanup')], { $expr: { $lte: [{ $add: [{ $size: '$diagnostics.errors' }, { $size: '$diagnostics.warnings' }] }, 100] } });
define('previewChanges', { previewId: oid, rowId: uuid, ordinal: integer(), changeKind: enumeration('updated','deleted','inserted'), beforePosition: nullable(integer()), afterPosition: nullable(integer()) }, [unique({ previewId: 1, rowId: 1 }, 'uq_changes_row'), unique({ previewId: 1, ordinal: 1 }, 'uq_changes_ordinal')]);
define('processingOperations', { datasetId: oid, actorId: oid, baseVersionId: nullable(oid), resultVersionId: oid, kind: enumeration('import','process','restore'), specification: operationSpecification, summary, idempotencyDigest: hash, createdAt: date }, [unique({ resultVersionId: 1 }, 'uq_operations_result'), unique({ datasetId: 1, kind: 1, idempotencyDigest: 1 }, 'uq_operations_request'), index({ datasetId: 1, createdAt: -1, _id: -1 }, 'ix_operations_history')]);
define('idempotencyRecords', { userId: oid, projectId: nullable(oid), actionScope: str({ minLength: 1 }), keyDigest: hash, requestHash: hash, status: enumeration('pending','succeeded','failed'), response: nullable(obj({ statusCode: integer(100, 599), body: {} }, ['body'])), leaseUntil: nullable(date), leaseToken: nullable(uuid), createdAt: date, updatedAt: date }, [unique({ userId: 1, actionScope: 1, keyDigest: 1 }, 'uq_receipts_request'), index({ projectId: 1 }, 'ix_receipts_project'), index({ status: 1, leaseUntil: 1 }, 'ix_receipts_lease')]);

export const COLLECTION_CONTRACTS: readonly CollectionContract[] = contracts;
