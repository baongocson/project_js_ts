import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Scatter3D } from '../../src/features/analysis/components/Scatter3D';
import type { ScatterPoint } from '../../src/features/analysis/types';
import '../../src/index.css';

const count=Math.min(10000,Math.max(1,Number(new URLSearchParams(location.search).get('count'))||100));
const points:ScatterPoint[]=Array.from({length:count},(_,i)=>({rowId:`r-${i}`,x:i,y:Math.sin(i)*50,z:Math.cos(i)*50,missingCount:i%10===0?1:0,isOutlier:i%20===0,outlierColumnIds:i%20===0?['x']:[]}));
const swapped = points.map(point => ({ ...point, x: point.z, z: point.x }));
const axes = [{columnId:'x',min:0,max:count-1},{columnId:'y',min:-50,max:50},{columnId:'z',min:-50,max:50}];
const swappedAxes = [axes[2], axes[1], axes[0]];
function Fixture(){
  const [swap, setSwap] = useState(false);
  const [selected,setSelected]=useState<string>(),[mode,setMode]=useState<'normal'|'missing'|'outlier'>('normal');
  return <main><h1>Fixture visualization · {count} điểm thử</h1><p>Chỉ dữ liệu kiểm thử, không phải kết quả phân tích thực tế.</p>
    <label>Màu điểm kiểm thử<select value={mode} onChange={event=>setMode(event.target.value as typeof mode)}><option>normal</option><option>missing</option><option>outlier</option></select></label>
    <button type="button" onClick={() => setSwap(value => !value)}>Đổi phép chiếu X/Z</button>
    <Scatter3D points={swap ? swapped : points} axes={swap ? swappedAxes : axes} labels={swap ? ['z','y','x'] : ['x','y','z']} colorMode={mode} selected={selected} onSelect={setSelected}/>
    <output aria-label="Dòng đã chọn">{selected??'Chưa chọn'}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
