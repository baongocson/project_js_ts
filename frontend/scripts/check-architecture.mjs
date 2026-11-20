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

// Required feature folders must contain implementations, not only placeholder barrels.
for (const feature of fs.readdirSync(path.join(root, 'features'), { withFileTypes: true }).filter(entry => entry.isDirectory())) {
  // Local-only features need no HTTP API. Services are optional for simple CRUD.
  for (const folder of ['hooks', 'components', 'pages']) {
    const directory = path.join(root, 'features', feature.name, folder);
    if (!fs.existsSync(directory) || !fs.readdirSync(directory).some(name => /\.tsx?$/.test(name) && name !== 'index.ts')) {
      errors.push(`Thiếu triển khai trong thư mục bắt buộc: features/${feature.name}/${folder}`);
    }
  }
}

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function checkSpecifier(specifier, runtime = true) {
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
    const sourceLayer = from === 'features' ? sourceParts[2] : sourceParts[1];
    const targetLayer = to === 'features' ? targetParts[2] : targetParts[1];
    if (runtime && (sameFeature || from === 'app' && to === 'app')) {
      const forbidden = {
        services: ['hooks', 'components', 'pages'],
        api: ['services', 'repositories', 'hooks', 'components', 'pages'],
        repositories: ['services', 'api', 'hooks', 'components', 'pages'],
        domain: ['services', 'api', 'repositories', 'hooks', 'components', 'pages'],
        components: ['api', 'services', 'repositories'],
        pages: ['api', 'services', 'repositories'],
      };
      if (forbidden[sourceLayer]?.includes(targetLayer)) {
        errors.push(`Sai trách nhiệm tầng: ${relative(file)} -> ${relative(target)}`);
      }
    }
    if (to === 'features' && !sameFeature && targetParts.length > 2 &&
        !(targetParts.length === 3 && targetParts[2] === 'index.ts')) {
      errors.push(`Import sâu vào feature: ${relative(file)} -> ${relative(target)}`);
    }
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const parts = relative(file).split('/');
      const layer = parts[0] === 'features' ? parts[2] : parts[1];
      const bindings = node.importClause?.namedBindings;
      const importsRequest = !node.importClause?.isTypeOnly && bindings && ts.isNamedImports(bindings) &&
        bindings.elements.some(item => !item.isTypeOnly && (item.propertyName ?? item.name).text === 'requestJson');
      if (parts[0] !== 'shared' && layer !== 'api' && importsRequest) {
        errors.push(`HTTP client chỉ được gọi từ api: ${relative(file)}`);
      }
      if (['services', 'repositories', 'api', 'domain'].includes(layer) &&
          ['react', 'react-dom', 'react-router-dom'].includes(node.moduleSpecifier.text) && !node.importClause?.isTypeOnly &&
          (!bindings || !ts.isNamedImports(bindings) || bindings.elements.some(item => !item.isTypeOnly))) {
        errors.push(`Tầng ${layer} không phụ thuộc React: ${relative(file)}`);
      }
    }
    if (ts.isCallExpression(node) &&
        (ts.isIdentifier(node.expression) && node.expression.text === 'fetch' ||
         ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'fetch') &&
        relative(file) !== 'shared/api/http-client.ts') {
      errors.push(`fetch phải tập trung tại HTTP client: ${relative(file)}`);
    }
    if (ts.isImportDeclaration(node) && relative(file).startsWith('features/')) {
      const folder = relative(file).split('/')[2];
      const bindings = node.importClause?.namedBindings;
      if (['components', 'pages'].includes(folder) && bindings && ts.isNamedImports(bindings) &&
          bindings.elements.some(item => !node.importClause.isTypeOnly && !item.isTypeOnly && item.name.text === 'requestJson')) {
        errors.push(`Gọi HTTP phải qua api/hook, không đặt trong giao diện: ${relative(file)}`);
      }
      if (folder === 'pages' && node.moduleSpecifier.text === 'react' && bindings && ts.isNamedImports(bindings) &&
          bindings.elements.some(item => ['useState', 'useEffect', 'useReducer'].includes(item.name.text))) {
        errors.push(`State/effect nghiệp vụ phải đặt trong hooks: ${relative(file)}`);
      }
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const runtime = ts.isImportDeclaration(node)
        ? !clause?.isTypeOnly && (!bindings || !ts.isNamedImports(bindings) || bindings.elements.some(item => !item.isTypeOnly))
        : !node.isTypeOnly;
      checkSpecifier(node.moduleSpecifier, runtime);
    }
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
