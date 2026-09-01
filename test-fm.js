/* 流程圖精修的回歸。跑真的 fmArt / fmGrpHeader,把輸出當 XML 解析 ——
   重複屬性、沒關的標籤這種錯,瀏覽器會吞掉,XML 解析器不會。 */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');

let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

const dom=new JSDOM('<!DOCTYPE html><svg class="defs"></svg><svg id="fmMap"></svg>',
  {runScripts:'outside-only',pretendToBeVisual:true});
const W=dom.window, D=W.document;
W.esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* 假的 fmArt / fmBuild,只為了讓補強有東西可以包 */
W.fmArt=()=>""; W.fmGrpHeader=()=>""; W.FM_BUILT=false;
let builtWith=null;
W.fmBuild=function(){ builtWith=D.getElementById("fmMap"); };
W.eval(fs.readFileSync(path.join(ROOT,'src/fm.js'),'utf8'));

const KEYS=["order","erp","wms","tms","tender","transit","dlv","bill","recon","fin"];

console.log('\n[1] \u5341\u500b\u7ad9\u90fd\u756b\u5f97\u51fa\u4f86');
const arts={};
KEYS.forEach(k=>{ arts[k]=W.fmArt(k,600,120); });
ok(KEYS.every(k=>arts[k].length>120), '\u5341\u500b\u7ad9\u90fd\u6709\u5167\u5bb9');
ok(W.fmArt("nosuch",0,0)==="", '\u6c92\u6709\u7684 key \u56de\u7a7a\u5b57\u4e32');

console.log('\n[2] \u756b\u51fa\u4f86\u7684\u662f\u5408\u6cd5\u7684 SVG');
KEYS.forEach(k=>{
  const doc=new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg">${arts[k]}</svg>`,
    {contentType:"application/xml"}).window.document;
  const bad=doc.querySelector("parsererror");
  ok(!bad, k+' \u89e3\u6790\u901a\u904e');
});

console.log('\n[3] \u4e09\u968e\u7dda\u5bec');
const all=KEYS.map(k=>arts[k]).join("");
const widths=[...new Set([...all.matchAll(/stroke-width="([\d.]+)"/g)].map(m=>m[1]))]
  .map(Number).sort((a,b)=>a-b);
/* 核可的線寬:三個主階 + 綠勾與虛線路線用的 2.1 + 膠帶那條色帶 3.4。
   多出任何一個就是又開始各畫各的了。 */
const ALLOWED=[1.05,1.5,2.1,2.2,3.4];
const extra=widths.filter(w=>!ALLOWED.includes(w));
ok(extra.length===0, '\u7dda\u5bec\u5c31\u90a3 '+widths.length+' \u7a2e\uff08\u539f\u672c\u4e5d\u7a2e\uff09\uff1a'+widths.join(' / ')+(extra.length?'\uff1b\u591a\u51fa '+extra.join(' / '):''));
ok(widths.includes(2.2)&&widths.includes(1.5)&&widths.includes(1.05),
   '\u4e09\u500b\u4e3b\u968e 2.2 / 1.5 / 1.05 \u90fd\u5728');
KEYS.forEach(k=>{
  const dup=/(stroke-width="[\d.]+"[^>]*stroke-width=)/.test(arts[k]);
  if(dup) ok(false, k+' \u6709\u91cd\u8907\u7684 stroke-width \u5c6c\u6027');
});
ok(KEYS.every(k=>!/(stroke-width="[\d.]+"[^>]*stroke-width=)/.test(arts[k])),
   '\u6c92\u6709\u91cd\u8907\u5c6c\u6027');

console.log('\n[4] \u5f71\u5b50\u8ddf\u8457\u5716\u793a\u5bec\u5ea6\u8d70');
const rx=KEYS.map(k=>{ const m=arts[k].match(/class="fm-sh"[^>]*rx="([\d.]+)"/); return m?+m[1]:null; });
ok(rx.every(v=>v!==null), '\u6bcf\u4e00\u7ad9\u90fd\u6709\u81ea\u5df1\u7684\u5f71\u5b50');
ok(new Set(rx).size>=4, '\u5bec\u5ea6\u4e0d\u662f\u5168\u90e8\u4e00\u6a23\uff08'+new Set(rx).size+' \u7a2e\uff09');
ok(rx[KEYS.indexOf("wms")]>rx[KEYS.indexOf("tms")], '\u5009\u5eab\u7684\u5f71\u5b50\u6bd4\u5716\u91d8\u5bec');

console.log('\n[5] \u5206\u7d44\u6a19\u984c\u7684\u7bc4\u570d\u7dda');
const g=W.fmGrpHeader(285,"ORDER & FULFILLMENT");
ok(/fm-grph/.test(g)&&/<text/.test(g), '\u7d50\u69cb\u8ddf\u539f\u672c\u4e00\u6a23');
ok(/stroke="var\(--fm-line\)"/.test(g), '\u591a\u4e86\u4e00\u689d\u7bc4\u570d\u7dda');
ok(/&amp;/.test(g), '\u6a19\u984c\u6709\u9003\u812b\uff08& \u4e0d\u6703\u628a XML \u5f04\u58de\uff09');
ok(!/stroke="var\(--fm-line\)"/.test(W.fmGrpHeader(600,"UNKNOWN GROUP")),
   '\u4e0d\u8a8d\u5f97\u7684\u6a19\u984c\u5c31\u4e0d\u756b\u7dda\uff0c\u4e0d\u6703\u756b\u932f\u4f4d\u7f6e');

console.log('\n[6] \u756b\u5b8c\u4e4b\u5f8c\u5c31\u5730\u6539 DOM');
const svg=D.getElementById("fmMap");
svg.innerHTML=`<path class="fm-rail" d="M0 0 H10"/><path class="fm-dash" d="M0 0 H10"/>
  <g class="fm-st"><text class="fm-tick" x="30" y="-32" text-anchor="middle">\u2713</text></g>`;
W.FM_BUILT=true;
W.fmBuild();
ok(svg.querySelectorAll("path.fm-shoulder").length===1, '\u8def\u80a9\u57ab\u4e0a\u4f86\u4e86');
ok(svg.querySelector("path.fm-shoulder").getAttribute("d")==="M0 0 H10",
   '\u8def\u80a9\u7684\u7dda\u5f62\u8ddf\u8def\u9762\u4e00\u6a21\u4e00\u6a23\uff08cloneNode\uff09');
ok(svg.querySelector("path.fm-shoulder").nextSibling===svg.querySelector("path.fm-rail"),
   '\u57ab\u5728\u8def\u9762\u5e95\u4e0b\uff0c\u4e0d\u662f\u84cb\u5728\u4e0a\u9762');
ok(!svg.querySelector("text.fm-tick"), '\u6d6e\u5728\u534a\u7a7a\u7684 \u2713 \u5df2\u63db\u6389');
const tick=svg.querySelector("g.fm-tick");
ok(!!tick&&tick.querySelector("circle")&&tick.querySelector("path"), '\u6539\u6210\u6709\u5e95\u7684\u5713\u5f62\u5fbd\u7ae0');
ok(tick.getAttribute("class")==="fm-tick",
   'class \u6c92\u6539 \u2014\u2014 .fm-st.done .fm-tick \u90a3\u689d\u958b\u95dc\u7167\u6a23\u7ba1\u5f97\u5230');
W.fmBuild();
ok(svg.querySelectorAll("path.fm-shoulder").length===1, '\u518d\u756b\u4e00\u6b21\u4e0d\u6703\u758a\u7b2c\u4e8c\u689d\u8def\u80a9');
ok(svg.querySelectorAll("g.fm-tick").length===1, '\u5fbd\u7ae0\u4e5f\u4e0d\u6703\u758a');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
