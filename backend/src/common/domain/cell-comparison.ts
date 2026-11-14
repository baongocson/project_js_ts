import type { CellInputDto } from '../dto/cell.dto';
import type { RowFilterDto } from '../../modules/projects/dto/workspace.dto';
import { missingKind,sameCell } from './cell-policy';
const ranks:Record<CellInputDto['kind'],number>={number:0,date:1,datetime:2,boolean:3,text:4,null:5};
function compareText(a:string,b:string):number {
 const left=Array.from(a),right=Array.from(b);
 for(let i=0;i<Math.min(left.length,right.length);i++) {const difference=left[i].codePointAt(0)!-right[i].codePointAt(0)!;if(difference)return Math.sign(difference);}
 return Math.sign(left.length-right.length);
}
export function compareCells(a:CellInputDto,b:CellInputDto,direction:'asc'|'desc'='asc'):number {
 const aMissing=missingKind(a)!==undefined,bMissing=missingKind(b)!==undefined;
 if(aMissing||bMissing)return aMissing===bMissing?0:aMissing?1:-1;
 let result=0;
 if(a.kind!==b.kind)result=Math.sign(ranks[a.kind]-ranks[b.kind]);
 else if(a.kind==='text'&&b.kind==='text')result=compareText(a.value,b.value);
 else if(a.value!==b.value)result=a.value!<b.value!?-1:1;
 return direction==='asc'?result:-result;
}
export function matchesCellFilter(cell:CellInputDto,filter:RowFilterDto):boolean {
 const missing=missingKind(cell)!==undefined;
 if(filter.op==='isMissing')return missing;
 if(filter.op==='isNotMissing')return !missing;
 if(!('value' in filter))return false;
 if(filter.op==='eq')return sameCell(cell,filter.value);
 if(filter.op==='ne')return !sameCell(cell,filter.value);
 if(missing||missingKind(filter.value)!==undefined)return false;
 if(filter.op==='contains')return cell.kind==='text'&&filter.value.kind==='text'&&cell.value.toLowerCase().includes(filter.value.value.toLowerCase());
 if(cell.kind!==filter.value.kind||!['number','date','datetime'].includes(cell.kind))return false;
 const order=compareCells(cell,filter.value);
 return filter.op==='lt'?order<0:filter.op==='lte'?order<=0:filter.op==='gt'?order>0:order>=0;
}
