import type { ScatterProps } from './types';

/** One transform for points and axis ticks. Bounds come from the entire version, not the sample. */
export function scatterModel(points:ScatterProps['points'],axes?:ScatterProps['axes']){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const point of points)[point.x,point.y,point.z].forEach((value,i)=>{min[i]=Math.min(min[i],value);max[i]=Math.max(max[i],value);});
  axes?.forEach((axis,i)=>{if(axis.min!==null&&axis.max!==null){min[i]=axis.min;max[i]=axis.max;}});
  const coordinate=(value:number,axis:number)=>{
    const scale=Math.max(Math.abs(min[axis]),Math.abs(max[axis]),1),span=max[axis]/scale-min[axis]/scale;
    return span?((value/scale-min[axis]/scale)/span-.5)*8:0;
  };
  const ticks=min.map((lower,axis)=>!Number.isFinite(lower)?[]:lower===max[axis]?[{value:lower,position:0}]:Array.from({length:5},(_,i)=>{
    const t=i/4,value=lower*(1-t)+max[axis]*t;return {value,position:coordinate(value,axis)};
  }));
  return {min,max,ticks,points:points.map(source=>({source,position:[source.x,source.y,source.z].map((value,i)=>coordinate(value,i)) as [number,number,number]}))};
}
