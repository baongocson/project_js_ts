import { cellKey, missingKind, type Cell, type Column, type Snapshot } from '@dashboard/data-core';
import type { SummaryQueryDto, DistributionQueryDto, CorrelationQueryDto, Points3dQueryDto, ValueCountsQueryDto } from './dto/analysis-query.dto';
import type { AnalysisSummaryResponseDto, DistributionResponseDto, CorrelationResponseDto, Points3dResponseDto, ValueCountsResponseDto, OutlierColumnDto } from './dto/analysis-response.dto';

function quantile(sorted: readonly number[], fraction: number): number {
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
function finiteNumbers(snapshot: Snapshot, id: string): number[] {
  const numbers: number[] = [];
  for (const row of snapshot.rows) {
    const cell = row.cells[id];
    if (cell?.kind === 'number' && Number.isFinite(cell.value)) numbers.push(cell.value);
  }
  return numbers;
}
function compareTyped(left: Cell, right: Cell): number {
  const rank: Record<Cell['kind'], number> = { number: 0, date: 1, datetime: 2, boolean: 3, text: 4, null: 5 };
  if (left.kind !== right.kind) return rank[left.kind] - rank[right.kind];
  if (left.kind === 'number' && right.kind === 'number') return Math.sign(left.value - right.value);
  if (left.kind === 'boolean' && right.kind === 'boolean') return Number(left.value) - Number(right.value);
  const a = String(left.value), b = String(right.value);
  const ac = Array.from(a), bc = Array.from(b);
  for (let i = 0; i < Math.min(ac.length, bc.length); i++) {
    const difference = ac[i].codePointAt(0)! - bc[i].codePointAt(0)!;
    if (difference) return Math.sign(difference);
  }
  return Math.sign(ac.length - bc.length);
}
function nonMissing(cell: Cell | undefined): cell is Cell { return cell !== undefined && missingKind(cell) === undefined; }
function outlierBounds(values: readonly number[], method: 'iqr' | 'zscore', threshold: number): {lower:number;upper:number} | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  if (sorted[0] === sorted[sorted.length-1]) return null;
  if (method === 'iqr') {
    const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75), spread = q3-q1;
    return {lower:q1-threshold*spread, upper:q3+threshold*spread};
  }
  const avg = values.reduce((s,v)=>s+v,0)/values.length;
  const variance = values.reduce((s,v)=>s+(v-avg)**2,0)/values.length;
  if (!Number.isFinite(variance) || variance === 0) return null;
  const std = Math.sqrt(variance);
  return {lower:avg-threshold*std,upper:avg+threshold*std};
}
function outlierFor(snapshot: Snapshot, column: Column, method: 'iqr' | 'zscore', threshold: number): OutlierColumnDto {
  if (column.logicalType !== 'number') return {columnId:column.columnId,count:0,lower:null,upper:null,status:'not_applicable',reason:'non_numeric'};
  const values = finiteNumbers(snapshot,column.columnId);
  if (!values.length) return {columnId:column.columnId,count:0,lower:null,upper:null,status:'not_applicable',reason:'all_missing'};
  const bounds = outlierBounds(values,method,threshold);
  if (!bounds) return {columnId:column.columnId,count:0,lower:null,upper:null,status:'not_applicable',reason:'constant_column'};
  return {columnId:column.columnId,count:values.filter(n=>n<bounds.lower||n>bounds.upper).length,...bounds,status:'ok',reason:null};
}
export function analyzeSummary(snapshot: Snapshot, versionId: string, originalByteSize: number, query: SummaryQueryDto): AnalysisSummaryResponseDto {
  const rowCount = snapshot.rows.length, columnCount = snapshot.columns.length;
  const missingByColumn = snapshot.columns.map(column=>{
    const count = snapshot.rows.filter(row=>!nonMissing(row.cells[column.columnId])).length;
    return {columnId:column.columnId,count,rate:rowCount?count/rowCount:null};
  });
  const missingCount = missingByColumn.reduce((sum,col)=>sum+col.count,0);
  const seen = new Set<string>();let duplicateRowCount=0;
  for (const row of snapshot.rows) {
    const key=JSON.stringify(snapshot.columns.map(col=>{const cell=row.cells[col.columnId];return cell?cellKey(cell):'missing-key';}));
    if (seen.has(key)) duplicateRowCount++;else seen.add(key);
  }
  const outlierIds = query.outlierColumnIds ?? snapshot.columns.filter(col=>col.logicalType==='number').map(col=>col.columnId);
  return {versionId,originalByteSize,rowCount,columnCount,missingCount,missingRate:rowCount*columnCount?missingCount/(rowCount*columnCount):null,
    missingByColumn,duplicateRowCount,outliersByColumn:outlierIds.map(id=>outlierFor(snapshot,snapshot.columns.find(col=>col.columnId===id)!,query.outlierMethod,query.outlierThreshold)),
    datatypes:snapshot.columns.map(col=>({columnId:col.columnId,logicalType:col.logicalType}))};
}
export function analyzeDistribution(snapshot: Snapshot, column: Column, query: DistributionQueryDto): DistributionResponseDto {
  const missingCount = snapshot.rows.filter(row=>!nonMissing(row.cells[column.columnId])).length;
  const result: DistributionResponseDto = {columnId:column.columnId,logicalType:column.logicalType,missingCount,histogram:[],histogramStatus:'not_applicable',outlierBounds:null,outlierStatus:'not_applicable',reason:'non_numeric'};
  if (column.logicalType!=='number') return result;
  const values=finiteNumbers(snapshot,column.columnId);
  if (!values.length) return {...result,reason:'all_missing'};
  let min=Infinity,max=-Infinity;for(const value of values){if(value<min)min=value;if(value>max)max=value;}
  if (min===max) return {...result,histogram:[{lowerBound:min,upperBound:max,count:values.length}],histogramStatus:'constant_column',reason:'constant_column'};
  const span=(max-min)/query.bins;
  // Avoid Math.max(...values) on large datasets; this code below uses the same min/max in a bounded scan.
  const counts = Array<number>(query.bins).fill(0);
  for(const value of values) counts[Math.min(query.bins-1,Math.floor((value-min)/(max-min)*query.bins))]++;
  const histogram=counts.map((count,i)=>({lowerBound:min+i*span,upperBound:i===query.bins-1?max:min+(i+1)*span,count}));
  const bounds=outlierBounds(values,query.outlierMethod,query.threshold);
  return {...result,histogram,histogramStatus:'ok',outlierBounds:bounds?{...bounds,count:values.filter(n=>n<bounds.lower||n>bounds.upper).length}:null,
    outlierStatus:bounds?'ok':'not_applicable',reason:bounds?null:'constant_column'};
}
export function analyzeCorrelation(snapshot: Snapshot, _query: CorrelationQueryDto): CorrelationResponseDto {
  const columns=snapshot.columns.map(col=>({columnId:col.columnId,name:col.name,logicalType:col.logicalType}));
  const matrix:(number|null)[][]=columns.map(()=>Array<number|null>(columns.length).fill(null));
  const validPairCounts=columns.map(()=>Array<number>(columns.length).fill(0));
  const naReasons:CorrelationResponseDto['naReasons']=[];
  for(let i=0;i<columns.length;i++) for(let j=i;j<columns.length;j++) {
    const a=columns[i],b=columns[j];let value:number|null=null;
    let reason: 'non_numeric'|'insufficient_pairs'|'constant_column' | null=null;
    if(a.logicalType!=='number'||b.logicalType!=='number') reason='non_numeric';
    else {
      let n=0;
      // Welford covariance for better stability on large offsets.
      let meanX=0,meanY=0,m2x=0,m2y=0,cov=0;
      for(const row of snapshot.rows){
        const x=row.cells[a.columnId], y=row.cells[b.columnId];
        if(x?.kind!=='number'||y?.kind!=='number'||!Number.isFinite(x.value)||!Number.isFinite(y.value))continue;
        n++;const dx=x.value-meanX;meanX+=dx/n;const dy=y.value-meanY;meanY+=dy/n;
        m2x+=dx*(x.value-meanX);m2y+=dy*(y.value-meanY);cov+=dx*(y.value-meanY);
      }
      validPairCounts[i][j]=validPairCounts[j][i]=n;
      if(n<2)reason='insufficient_pairs';
      else if(m2x<=0||m2y<=0)reason='constant_column';
      else {value=Math.max(-1,Math.min(1,cov/Math.sqrt(m2x*m2y)));if(!Number.isFinite(value)){value=null;reason='constant_column';}}
    }
    matrix[i][j]=matrix[j][i]=value;
    if(reason){naReasons.push({rowColumnId:a.columnId,columnColumnId:b.columnId,reason});if(i!==j)naReasons.push({rowColumnId:b.columnId,columnColumnId:a.columnId,reason});}
  }
  return {columns,matrix,validPairCounts,naReasons};
}
function hashRowId(id:string):number { let hash=2166136261;for(let i=0;i<id.length;i++){hash^=id.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0; }
export function analyzePoints3d(snapshot: Snapshot, query: Points3dQueryDto): Points3dResponseDto {
  const ids=[query.xColumnId,query.yColumnId,query.zColumnId];
  const outlierIds=query.outlierColumnIds??snapshot.columns.filter(col=>col.logicalType==='number').map(col=>col.columnId);
  const bounds=new Map(outlierIds.map(id=>[id,outlierBounds(finiteNumbers(snapshot,id),query.outlierMethod,query.threshold)]));
  let hiddenMissingCoordsCount=0,hiddenInvalidCoordsCount=0;
  const eligible:Points3dResponseDto['points']=[];
  for(const row of snapshot.rows){
    const coordinates=ids.map(id=>row.cells[id]);
    if(coordinates.some(cell=>!nonMissing(cell))){hiddenMissingCoordsCount++;continue;}
    if(coordinates.some(cell=>cell?.kind!=='number'||!Number.isFinite(cell.value))){hiddenInvalidCoordsCount++;continue;}
    const [x,y,z]=coordinates.map(cell=>(cell as {kind:'number';value:number}).value);
    const flagged=outlierIds.filter(id=>{const cell=row.cells[id],bound=bounds.get(id);return cell?.kind==='number'&&bound!==null&&bound!==undefined&&(cell.value<bound.lower||cell.value>bound.upper);});
    eligible.push({rowId:row.rowId,x,y,z,missingCount:snapshot.columns.filter(col=>!nonMissing(row.cells[col.columnId])).length,isOutlier:flagged.length>0,outlierColumnIds:flagged});
  }
  const applied=eligible.length>query.maxPoints;
  const points=applied?[...eligible].sort((a,b)=>hashRowId(a.rowId)-hashRowId(b.rowId)||a.rowId.localeCompare(b.rowId)).slice(0,query.maxPoints):eligible;
  return {points,hiddenMissingCoordsCount,hiddenInvalidCoordsCount,sampling:{applied,totalEligible:eligible.length,returned:points.length,method:'stable-rowid'}};
}
export function analyzeValueCounts(snapshot: Snapshot, columnId: string, query: ValueCountsQueryDto): ValueCountsResponseDto {
  const groups=new Map<string,{value:Cell;count:number}>();let missingCount=0;
  for(const row of snapshot.rows){
    const cell=row.cells[columnId];if(!nonMissing(cell)){missingCount++;continue;}
    const key=cellKey(cell);const current=groups.get(key);
    if(current)current.count++;else groups.set(key,{value:{kind:cell.kind,value:cell.value} as Cell,count:1});
  }
  const values=[...groups.values()].sort((a,b)=>query.sort==='-count'?(b.count-a.count||compareTyped(a.value,b.value)):compareTyped(a.value,b.value));
  const totalRows=snapshot.rows.length;
  const items:ValueCountsResponseDto['items']=values.map(item=>({value:item.value,isMissing:false,count:item.count,rate:totalRows?item.count/totalRows:null}));
  if(query.includeMissing&&missingCount)items.push({value:null,isMissing:true,count:missingCount,rate:totalRows?missingCount/totalRows:null});
  if(query.sort==='-count')items.sort((a,b)=>b.count-a.count||(a.isMissing?1:b.isMissing?-1:compareTyped(a.value as Cell,b.value as Cell)));
  const totalCategories=items.length;
  return {columnId,items:items.slice((query.page-1)*query.limit,query.page*query.limit),page:query.page,limit:query.limit,totalCategories,totalPages:Math.ceil(totalCategories/query.limit),missingCount,totalRows};
}
