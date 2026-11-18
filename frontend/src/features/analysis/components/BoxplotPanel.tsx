import { useBoxplot, type BoxplotProps } from '../hooks/useBoxplot';

import { Feedback } from '../../../shared/ui';

export function BoxplotPanel(props:BoxplotProps){
  const {numbers,chosen,setChosen,data,error,box,x,f}=useBoxplot(props);

return <div className="summary-chart boxplot-panel" data-testid="boxplot-panel"><h3>Outlier Boxplot · 1,5 × IQR</h3>
    <label htmlFor="boxplot-column">Cột boxplot</label><select id="boxplot-column" value={chosen} onChange={event=>setChosen(event.target.value)}>{numbers.map(column=><option key={column.columnId} value={column.columnId}>{column.name}</option>)}</select>
    {!numbers.length?<p>Chưa có cột number để vẽ boxplot.</p>:box===undefined?<p>Đang tải thống kê toàn cột…</p>:box===null?<p>Không có giá trị số hợp lệ.</p>:<>
      <svg viewBox="0 0 640 190" role="img" aria-label={`Boxplot ${numbers.find(column=>column.columnId===chosen)?.name}`} className="boxplot-chart">
        <line x1="45" x2="595" y1="135" y2="135" stroke="var(--muted)"/>
        <line x1={x(box.lowerWhisker)} x2={x(box.upperWhisker)} y1="75" y2="75" stroke="var(--text)"/>
        {[box.lowerWhisker,box.upperWhisker].map((value,index)=><line key={index} x1={x(value)} x2={x(value)} y1="50" y2="100" stroke="var(--text)"/>)}
        <rect x={x(box.q1)-1} y="42" width={Math.max(2,x(box.q3)-x(box.q1))} height="66" fill="#29998244" stroke="var(--accent)"/>
        <line x1={x(box.median)} x2={x(box.median)} y1="42" y2="108" stroke="#ce5363" strokeWidth="3"/>
        {box.outliers.map((item,index)=><circle key={item.rowId} cx={x(item.value)} cy={65+index%3*10} r="4" fill="#c8495a"><title>{f(item.value)}</title></circle>)}
        <text x="45" y="165" fill="var(--text)">{f(box.min)}</text><text x="595" y="165" textAnchor="end" fill="var(--text)">{f(box.max)}</text>
      </svg>
      <dl className="box-statistics">{[['Q1',box.q1],['Median',box.median],['Q3',box.q3],['Râu dưới',box.lowerWhisker],['Râu trên',box.upperWhisker]].map(([name,value])=><div key={String(name)}><dt>{name}</dt><dd>{f(Number(value))}</dd></div>)}</dl>
      <p>{box.outlierCount} outlier · Missing: {data?.missingCount}{box.truncated?' · Hiển thị tối đa 100 dấu outlier, tổng đếm giữ nguyên.':''}</p>
    </>}{error&&<Feedback error>{error}</Feedback>}
  </div>;
}
