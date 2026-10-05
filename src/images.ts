// Bounded container validation, not full image decoding or malware inspection.
export function imageType(b:Uint8Array):string {
 const fail=()=>{throw new Error('Foto inválida: usar PNG o JPEG con estructura completa.');};
 if(b.length<20) return fail();
 if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)) {
  const d=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=8,ihdr=false,idat=false,end=false,palette=false,color=-1,depth=0,afterIDAT=false;
  while(p+12<=b.length){let n=d.getUint32(p);if(n>3*1024*1024||p+n+12>b.length) return fail();let t=String.fromCharCode(...b.slice(p+4,p+8));let crc=0xffffffff;for(let i=p+4;i<p+8+n;i++){crc^=b[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}if(((crc^0xffffffff)>>>0)!==d.getUint32(p+8+n))return fail();
   if(!ihdr&&t!=='IHDR')return fail();
   if(t==='IHDR'){if(ihdr||n!==13)return fail();ihdr=true;const w=d.getUint32(p+8),h=d.getUint32(p+12);depth=b[p+16];color=b[p+17];const ds:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};if(!w||!h||w*h>25000000||!ds[color]?.includes(depth)||b[p+18]||b[p+19]||b[p+20]>1)return fail();}
   else if(t==='PLTE'){if(palette||idat||color===0||color===4||!n||n%3||n>768||(color===3&&n/3>2**depth))return fail();palette=true;}
   else if(t==='IDAT'){if(afterIDAT||(color===3&&!palette))return fail();idat=true;}
   else if(t==='IEND'){if(n||!idat||p+12!==b.length)return fail();end=true;}
   else {if(idat)afterIDAT=true;if(t.charCodeAt(0)<97)return fail();}
   p+=n+12;
  }if(!end||p!==b.length)return fail();return 'image/png';
 }
 if(b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217){let p=2,frame=false,scan=false;while(p<b.length-2){if(b[p++]!==255)return fail();while(b[p]===255)p++;let m=b[p++];if(m===0||m===216||m===217)return fail();if(m===1||m>=208&&m<=215)continue;if(p+2>b.length)return fail();let n=(b[p]<<8)|b[p+1];if(n<2||p+n>b.length)return fail();if([192,193,194].includes(m)){if(n<8||frame)return fail();const h=(b[p+3]<<8)|b[p+4],w=(b[p+5]<<8)|b[p+6];if(!w||!h||w*h>25000000)return fail();frame=true;}if(m===218){if(!frame||n<6)return fail();scan=true;p+=n;while(p<b.length-2){if(b[p]===255){if(b[p+1]===0||b[p+1]>=208&&b[p+1]<=215){p+=2;continue;}break;}p++;}continue;}p+=n;}if(frame&&scan&&p===b.length-2)return 'image/jpeg';}return fail();
}
