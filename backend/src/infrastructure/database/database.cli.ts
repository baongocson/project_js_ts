import { openDatabase } from './database.connection';
import { provisionDatabase, verifyDatabase } from './database.provision';

async function main() {
  const action = process.argv[2];
  if (!['provision', 'verify'].includes(action)) throw new Error('Expected provision or verify');
  const connection = await openDatabase();
  try {
    if (action === 'provision') await provisionDatabase(connection);
    await verifyDatabase(connection);
    console.log(`Database ${connection.name}: connected; 12 collection validators and all declared indexes verified.`);
  } finally { await connection.close(); }
}
main().catch(error => {
  // Driver errors may contain the connection string or document values.
  console.error(`Database command failed (${error?.code ?? error?.name ?? 'unknown'}). Check Atlas access, configuration and index compatibility.`);
  process.exitCode = 1;
});
