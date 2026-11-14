// Fails CI when an explicit TypeScript `any` type occurs in application source.
// String-literal business options such as 'any' are intentionally allowed.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourceDirs = [path.join(root, 'backend', 'src'), path.join(root, 'frontend', 'src')];
const failures = [];
let fileCount = 0;

function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
    fileCount += 1;
    const content = fs.readFileSync(full, 'utf8');
    const scriptKind = entry.name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const ast = ts.createSourceFile(full, content, ts.ScriptTarget.Latest, true, scriptKind);
    function inspect(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const p = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        failures.push(`${path.relative(root, full)}:${p.line + 1}:${p.character + 1}`);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
}
for (const folder of sourceDirs) walk(folder);
if (failures.length) {
  process.stderr.write(`Explicit TypeScript any types detected:\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`PASS no-explicit-any: ${fileCount} TS/TSX source files checked.\n`);
}
