import type { Connection } from 'mongoose';
import { COLLECTION_CONTRACTS } from './collection-contracts';

// Add/update validators and create declared indexes. Never syncIndexes/drop an
// index or delete records: index conflicts and existing duplicates fail visibly.
export async function provisionDatabase(connection: Connection) {
  const db = connection.db!;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  for (const contract of COLLECTION_CONTRACTS) {
    if (existing.has(contract.name)) {
      await db.command({ collMod: contract.name, validator: contract.validator, validationLevel: 'strict', validationAction: 'error' });
    } else {
      await db.createCollection(contract.name, { validator: contract.validator, validationLevel: 'strict', validationAction: 'error' });
    }
    await db.collection(contract.name).createIndexes(contract.indexes);
  }
}

export async function verifyDatabase(connection: Connection) {
  const db = connection.db!;
  for (const contract of COLLECTION_CONTRACTS) {
    const [info] = await db.listCollections({ name: contract.name }, { nameOnly: false }).toArray();
    if (!info || info.options?.validationLevel !== 'strict' || info.options?.validationAction !== 'error' || stable(info.options.validator) !== stable(contract.validator)) throw new Error(`Missing/outdated validator: ${contract.name}. Run db:provision.`);
    const indexes = await db.collection(contract.name).listIndexes().toArray();
    for (const expected of contract.indexes) {
      const actual = indexes.find(i => i.name === expected.name);
      if (!actual || JSON.stringify(actual.key) !== JSON.stringify(expected.key) || Boolean(actual.unique) !== Boolean(expected.unique) || actual.expireAfterSeconds !== expected.expireAfterSeconds || stable(actual.partialFilterExpression) !== stable(expected.partialFilterExpression)) throw new Error(`Missing/outdated index: ${contract.name}.${expected.name}. Run db:provision.`);
    }
  }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
  return JSON.stringify(value);
}
