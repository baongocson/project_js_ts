import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root=fileURLToPath(new URL('../src/',import.meta.url));
const errors=[];
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);
  return entry.isDirectory() ? entry.name==='test'?[]:files(file) : file.endsWith('.ts')?[file]:[];
});}
for(const file of files(root)){
  const name=path.relative(root,file).replaceAll('\\','/');
  const service=file.endsWith('.service.ts'),controller=file.endsWith('.controller.ts'),repository=file.endsWith('.repository.ts');
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){
    if(ts.isImportDeclaration(node)){
      const specifier=node.moduleSpecifier.text;
      const clause=node.importClause,bindings=clause?.namedBindings;
      const runtime=!clause?.isTypeOnly&&(!bindings||!ts.isNamedImports(bindings)||bindings.elements.some(item=>!item.isTypeOnly));
      if(runtime&&(service||controller)&&specifier==='@nestjs/mongoose')errors.push(`Kết nối database phải nằm trong repository: ${name}`);
      if(runtime&&controller&&(/repository$/.test(specifier)||specifier==='mongoose'||specifier==='mongodb'))errors.push(`Controller phải gọi service: ${name} -> ${specifier}`);
      if(runtime&&repository&&/\.(service|controller)$/.test(specifier))errors.push(`Repository không gọi ngược service/controller: ${name} -> ${specifier}`);
    }
    if((service||controller)&&ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='collection'){
      errors.push(`Truy vấn collection phải nằm trong repository: ${name}`);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log('Kiến trúc backend đạt: controller → service → repository; database nằm trong repository.');
