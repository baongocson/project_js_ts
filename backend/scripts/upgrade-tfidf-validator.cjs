// Add only the TF-IDF enum value to the two processing validators. No data/index changes.
const { isDeepStrictEqual } = require('node:util');
const { openDatabase } = require('../dist/infrastructure/database/database.connection');
const { COLLECTION_CONTRACTS } = require('../dist/infrastructure/database/collection-contracts');
const { verifyDatabase } = require('../dist/infrastructure/database/database.provision');
function withoutTfidf(value) {
  if (Array.isArray(value)) return value.filter(item => item !== 'tfidf').map(withoutTfidf);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,withoutTfidf(item)]));
  return value;
}
async function main() {
  const connection = await openDatabase();
  try {
    const db = connection.db, changes = [];
    // Inspect both before making either change; refuse unrelated schema drift.
    for (const name of ['processingPreviews','processingOperations']) {
      const expected = COLLECTION_CONTRACTS.find(contract => contract.name === name).validator;
      const [actual] = await db.listCollections({name},{nameOnly:false}).toArray();
      if (!actual || actual.options?.validationLevel !== 'strict' || actual.options?.validationAction !== 'error') throw new Error('SCHEMA_DRIFT');
      if (isDeepStrictEqual(actual.options.validator,expected)) continue;
      if (!isDeepStrictEqual(actual.options.validator,withoutTfidf(expected))) throw new Error('SCHEMA_DRIFT');
      changes.push({name,validator:expected});
    }
    for (const change of changes) await db.command({collMod:change.name,validator:change.validator,validationLevel:'strict',validationAction:'error'});
    await verifyDatabase(connection);
    console.log(`TF-IDF validators upgraded: ${changes.length}; all 12 collection contracts verified. Documents and indexes unchanged.`);
  } finally { await connection.close(); }
}
main().catch(error => {console.error(`TF-IDF upgrade failed (${error?.code ?? error?.name ?? 'unknown'}). Check configuration or unrelated schema drift; no document deletion is performed.`);process.exitCode=1;});
