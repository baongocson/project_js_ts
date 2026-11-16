/** Arithmetic-only log1p: native Math.log1p may differ by an ULP between
 * browser/Node V8 builds. Exact typed replay must use the same arithmetic. */
export function deterministicLog1p(x:number):number{
  if(x===0)return x;
  if(x<=-1||!Number.isFinite(x))return NaN;
  if(x>-5.551115123125783e-17&&x<5.551115123125783e-17)return x;
  const series=(z:number)=>{
    const squared=z*z;let term=z,sum=z;
    for(let denominator=3;denominator<=65;denominator+=2){term*=squared;sum+=term/denominator;}
    return 2*sum;
  };
  if(x>-0.5&&x<0.5)return series(x/(2+x));
  const y=1+x,view=new DataView(new ArrayBuffer(8));
  view.setFloat64(0,y,false);const high=view.getUint32(0,false);
  let exponent=((high>>>20)&0x7ff)-1023;
  view.setUint32(0,(high&0xfffff)|0x3ff00000,false);let mantissa=view.getFloat64(0,false);
  if(mantissa>1.4142135623730951){mantissa/=2;exponent++;}
  const logarithm=series((mantissa-1)/(mantissa+1));
  const correction=(x-(y-1))/y;
  return exponent*0.6931471803691238+(logarithm+exponent*1.9082149292705877e-10+correction);
}
