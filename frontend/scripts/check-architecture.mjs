import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const configPath = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
const normalize = value => path.resolve(value).replaceAll('\\', '/');
const sourceRoot = normalize(root);
const relative = file => path.relative(root, file).replaceAll('\\', '/');

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(file) : /\.tsx?$/.test(file) ? [normalize(file)] : [];
  });
}

const files = listFiles(root);
const graph = new Map(files.map(file => [file, []]));
const errors = [];

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function checkSpecifier(specifier) {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return;
    const resolved = ts.resolveModuleName(specifier.text, file, options, ts.sys).resolvedModule;
    if (!resolved) return; // tsc reports unresolved TypeScript imports; CSS is outside this graph.
    const target = normalize(resolved.resolvedFileName);
    if (!target.startsWith(`${sourceRoot}/`)) return;
    graph.get(file).push(target);
    const from = relative(file).split('/')[0];
    const to = relative(target).split('/')[0];
    const allowed = {
      app: ['app', 'features', 'shared'],
      features: ['features', 'shared'],
      shared: ['shared'],
    };
    if (allowed[from] && !allowed[from].includes(to)) {
      errors.push(`Import ngược tầng: ${relative(file)} -> ${relative(target)}`);
    }
    // A feature's consumers use its public index, never its internal API/hooks/pages.
    const targetParts = relative(target).split('/');
    const sourceParts = relative(file).split('/');
    const sameFeature = from === 'features' && sourceParts[1] === targetParts[1];
    if (to === 'features' && !sameFeature && targetParts.length > 2 &&
        !(targetParts.length === 3 && targetParts[2] === 'index.ts')) {
      errors.push(`Import sâu vào feature: ${relative(file)} -> ${relative(target)}`);
    }
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) checkSpecifier(node.moduleSpecifier);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      checkSpecifier(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const visited = new Set();
const active = new Set();
function findCycles(file, chain = []) {
  if (active.has(file)) {
    errors.push(`Vòng import: ${[...chain.slice(chain.indexOf(file)), file].map(relative).join(' -> ')}`);
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const target of graph.get(file) || []) findCycles(target, [...chain, file]);
  active.delete(file);
  visited.add(file);
}
for (const file of files) findCycles(file);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Kiến trúc đạt: ${files.length} file, đúng chiều import, không có vòng phụ thuộc.`);
}
