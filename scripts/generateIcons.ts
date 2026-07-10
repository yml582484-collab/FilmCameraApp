/**
 * 胶片相机 App 图标生成器（优化版）
 * 运行: npx tsx scripts/generateIcons.ts
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// PNG 编码器
// ============================================================
function makeCRC32(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
}
function crc32(b: Uint8Array, t: Uint32Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type: string, data: Uint8Array, ct: Uint32Array): Uint8Array {
  const lb = new Uint8Array(4);
  lb[0] = (data.length >>> 24) & 0xFF; lb[1] = (data.length >>> 16) & 0xFF;
  lb[2] = (data.length >>> 8) & 0xFF; lb[3] = data.length & 0xFF;
  const ta = new Uint8Array([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)]);
  const out = new Uint8Array(12 + data.length);
  out.set(lb, 0); out.set(ta, 4); out.set(data, 8);
  const cat = new Uint8Array(4 + data.length); cat.set(ta, 0); cat.set(data, 4);
  const cv = crc32(cat, ct);
  out[8 + data.length] = (cv >>> 24) & 0xFF; out[9 + data.length] = (cv >>> 16) & 0xFF;
  out[10 + data.length] = (cv >>> 8) & 0xFF; out[11 + data.length] = cv & 0xFF;
  return out;
}
function encodePNG(w: number, h: number, px: Uint8Array): Buffer {
  const ct = makeCRC32();
  const sig = new Uint8Array([137,80,78,71,13,10,26,10]);
  const ihdr = new Uint8Array(13);
  ihdr[0]=(w>>>24)&0xFF;ihdr[1]=(w>>>16)&0xFF;ihdr[2]=(w>>>8)&0xFF;ihdr[3]=w&0xFF;
  ihdr[4]=(h>>>24)&0xFF;ihdr[5]=(h>>>16)&0xFF;ihdr[6]=(h>>>8)&0xFF;ihdr[7]=h&0xFF;
  ihdr[8]=8;ihdr[9]=6;
  const str = w*4+1, raw = new Uint8Array(h*str);
  for (let y=0;y<h;y++){raw[y*str]=0;raw.set(px.subarray(y*w*4,(y+1)*w*4),y*str+1);}
  const parts=[sig,chunk('IHDR',ihdr,ct),chunk('IDAT',raw,ct),chunk('IEND',new Uint8Array(0),ct)];
  const total = parts.reduce((s,p)=>s+p.length,0), result=new Uint8Array(total);
  let off=0; for(const p of parts){result.set(p,off);off+=p.length;}
  return Buffer.from(result);
}

// ============================================================
// 高性能 Canvas（整数坐标，无抗锯齿）
// ============================================================
class Ctx {
  px: Uint8Array; w: number; h: number;
  constructor(w:number,h:number){this.w=w;this.h=h;this.px=new Uint8Array(w*h*4);this.clear(10,10,12);}
  clear(r:number,g:number,b:number){for(let i=0;i<this.px.length;i+=4){this.px[i]=r;this.px[i+1]=g;this.px[i+2]=b;this.px[i+3]=255;}}
  p(x:number,y:number,r:number,g:number,b:number,a:number=255){
    if(x<0||x>=this.w||y<0||y>=this.h)return;
    const i=(Math.round(y)*this.w+Math.round(x))*4;
    this.px[i]=r;this.px[i+1]=g;this.px[i+2]=b;this.px[i+3]=a;
  }
  fillRect(x,y,w,h,r,g,b,a=255){const x0=Math.max(0,Math.round(x)),y0=Math.max(0,Math.round(y)),x1=Math.min(this.w-1,Math.round(x+w)),y1=Math.min(this.h-1,Math.round(y+h));
    for(let py=y0;py<=y1;py++)for(let px=x0;px<=px1;px++){const i=(py*this.w+px)*4;this.px[i]=r;this.px[i+1]=g;this.px[i+2]=b;this.px[i+3]=a;}}
  // 快速实心圆（Bresenham 改进）
  fc(cx,cy,rad,r,g,b,a=255){
    const rr=rad*rad,x0=Math.round(cx-rad),x1=Math.round(cx+rad),y0=Math.round(cy-rad),y1=Math.round(cy+rad);
    for(let y=y0;y<=y1;y++){const dy=y-cy,dy2=dy*dy,xr=Math.sqrt(Math.max(0,rr-dy2)),lx=Math.round(cx-xr),rx=Math.round(cx+xr);
      for(let x=lx;x<=rx;x++){const i=(y*this.w+x)*4;this.px[i]=r;this.px[i+1]=g;this.px[i+2]=b;this.px[i+3]=a;}}
  }
  // 圆环
  ring(cx,cy,or,ir,r,g,b,a=255){
    const orr=or*or,irr=ir*ir,y0=Math.max(0,Math.round(cy-or)),y1=Math.min(this.h-1,Math.round(cy+or));
    for(let y=y0;y<=y1;y++){const dy=y-cy,dy2=dy*dy;
      if(dy2<=orr){const xr=Math.sqrt(orr-dy2),lx=Math.round(cx-xr),rx=Math.round(cx+xr);
        for(let x=lx;x<=rx;x++){const d=(x-cx)**2+dy2;if(d>=irr){const i=(y*this.w+x)*4;this.px[i]=r;this.px[i+1]=g;this.px[i+2]=b;this.px[i+3]=a;}}}}
  }
  // 角标
  corner(margin,size,thick,r,g,b,a=200){
    const L=margin,T=margin,R=this.w-margin-1,B=this.h-margin-1;
    this.fillRect(L,T,size,thick,r,g,b,a);this.fillRect(L,T,thick,size,r,g,b,a);
    this.fillRect(R-size+1,T,size,thick,r,g,b,a);this.fillRect(R-thick+1,T,thick,size,r,g,b,a);
    this.fillRect(L,B-thick+1,size,thick,r,g,b,a);this.fillRect(L,B-size+1,thick,size,r,g,b,a);
    this.fillRect(R-size+1,B-thick+1,size,thick,r,g,b,a);this.fillRect(R-thick+1,B-size+1,thick,size,r,g,b,a);
  }
  png(){return encodePNG(this.w,this.h,this.px);}
}

// ============================================================
// 图标绘制
// ============================================================

/** 主图标：深色背景 + 金色快门按钮 + 取景框角标 */
function mainIcon(s:number):Buffer{
  const c=new Ctx(s,s),cx=s/2,cy=s/2,sc=s/256;

  // 径向渐变背景（3层圆）
  c.fc(cx,cy,s*0.50,14,14,18);
  c.fc(cx,cy,s*0.46,10,10,14);
  c.fc(cx,cy,s*0.42,7,7,10);

  // 取景框四角
  c.corner(Math.round(70*sc),Math.round(56*sc),Math.round(5*sc),212,165,116,180);

  // 快门按钮三层结构
  const R=66*sc;
  // 外圈金色
  c.ring(cx,cy,R,R-4*sc,212,165,116,240);
  // 中圈银灰
  c.ring(cx,cy,R-6*sc,R-17*sc,175,172,168,230);
  // 内核白
  c.fc(cx,cy,R-22*sc,245,243,240);

  // 中心反光点
  c.fc(cx,cy-R*0.28,4*sc,255,255,255,160);

  return c.png();
}

/** 启动图 */
function splashIcon(s:number):Buffer{
  const c=new Ctx(s,s),cx=s/2,cy=s/2,m=Math.round(s*0.07),cs=Math.round(s*0.13);

  c.clear(8,8,10);
  c.corner(m,cs,Math.round(s*0.009),212,165,116,150);

  const R=s*0.115;
  c.ring(cx,cy,R,R-R*0.07,212,165,116,200);
  c.ring(cx,cy,R*0.82,R*0.74,170,168,165,180);
  c.fc(cx,cy,R*0.65,242,240,237);

  return c.png();
}

/** Favicon */
function favIcon(s:number):Buffer{
  const c=new Ctx(s,s),cx=s/2,cy=s/2,R=s*0.38;
  c.clear(10,10,12);
  c.ring(cx,cy,R,R*0.75,212,165,116,255);
  c.ring(cx,cy,R*0.65,R*0.48,180,178,175,255);
  c.fc(cx,cy,R*0.48,245,243,240);
  return c.png();
}

/** Android 前景（透明背景）*/
function androidFg(s:number):Buffer{
  const c=new Ctx(s,s),cx=s/2,cy=s/2;
  // 全透明
  for(let i=3;i<c.px.length;i+=4)c.px[i]=0;
  const safe=s*0.166,area=s/2-safe,R=area*0.72;
  c.ring(cx,cy,R,R-R*0.04,212,165,116,255);
  c.ring(cx,cy,R*0.8,R*0.71,175,172,168,255);
  c.fc(cx,cy,R*0.62,244,242,239);
  return c.png();
}

/** Android 背景 */
function androidBg(s:number):Buffer{
  const c=new Ctx(s,s);
  c.clear(12,12,15);
  return c.png();
}

/** Android 单色 */
function androidMono(s:number):Buffer{
  const c=new Ctx(s,s),cx=s/2,cy=s/2,R=s*0.36;
  for(let i=3;i<c.px.length;i+=4)c.px[i]=0;
  c.ring(cx,cy,R,R-s*0.04,255,255,255,255);
  c.ring(cx,cy,R*0.65,R*0.58,255,255,255,255);
  return c.png();
}

// ============================================================
// 执行
// ============================================================
const dir=resolve(__dirname,'..','assets');
console.log('\u{1F3A5} Generating film camera icons...\n');

const jobs=[
  ['icon.png',1024,mainIcon],
  ['splash-icon.png',1024,splashIcon],
  ['favicon.png',64,favIcon],
  ['android-icon-foreground.png',432,androidFg],
  ['android-icon-background.png',432,androidBg],
  ['android-icon-monochrome.png',432,androidMono],
];

for(const[name,sz,fn]of jobs){
  const t=Date.now(),png=fn(sz);
  writeFileSync(resolve(dir,name),png);
  console.log(`  \u2705 ${name} (${sz}x${sz}) ${(png.length/1024).toFixed(1)}KB ${Date.now()-t}ms`);
}
console.log('\n\u{1F389} Done!');
