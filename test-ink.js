const {JSDOM}=require('jsdom'), fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const P=r=>path.join(ROOT,r);
/* 預設驗 deploy/index.html;要驗別的檔就 node test-ink.js /path/to/index.html */
const TARGET=process.argv[2]||P('deploy/index.html');

const html=fs.readFileSync(TARGET,'utf8');
const ink=fs.readFileSync(P('src/ink.js'),'utf8');

const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,
  url:'https://sandyliu3056.github.io/UPS-reconciliation/'});
const W=dom.window, D=W.document, R=D.documentElement;
let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

/* 假的 applyFonts / applyBrand,行為和真的一樣:用行內樣式寫變數。
   包不包得住,看的就是這裡。 */
let fontsRan=0, brandRan=0;
W.applyFonts=function(){ fontsRan++;
  R.style.setProperty('--bodyfam','SANS'); R.style.setProperty('--titlefam','SANS');
  R.style.setProperty('--dispfam','SANS'); };
W.applyBrand=function(){ brandRan++;
  R.style.setProperty('--wob','none'); R.style.setProperty('--wob2','none');
  R.style.setProperty('--titlefill','var(--tab)');
  R.style.setProperty('--titlestroke','0'); };

W.eval(ink);
const V=n=>R.style.getPropertyValue(n);

(async()=>{
await new Promise(r=>{ if(D.readyState!=='loading') return r();
  D.addEventListener('DOMContentLoaded',()=>r()); W.setTimeout(r,500); });

console.log('\n[1] \u5b57\u9ad4');
const face=D.querySelectorAll('style')[0].textContent;
const embedded=/base64,[A-Za-z0-9+/]{5000,}/.test(face);
const linked=/url\("caveat\.woff2"\)/.test(face)&&/url\("patrick-hand\.woff2"\)/.test(face);
ok((face.match(/@font-face/g)||[]).length===2, '\u5169\u652f\u624b\u5beb\u5b57\u9ad4\u90fd\u5728');
ok(embedded||linked, '\u5b57\u9ad4\u4f86\u6e90\u660e\u78ba\uff1a'+(embedded?'\u5167\u5d4c data URI':'\u9023\u7d50\u540c\u5c64\u7684 woff2'));
if(linked){
  ok(fs.existsSync(path.join(path.dirname(TARGET),'caveat.woff2'))
    &&fs.existsSync(path.join(path.dirname(TARGET),'patrick-hand.woff2')),
    '\u5169\u500b\u5b57\u578b\u6a94\u771f\u7684\u5728 index.html \u540c\u4e00\u5c64');
}
ok(/Caveat Hand/.test(V('--titlefam')), '\u6a19\u984c\u662f Caveat');
ok(/Patrick Hand/.test(V('--bodyfam'))&&/Patrick Hand/.test(V('--dispfam')),
   '\u5167\u6587\u8207\u5074\u6b04\u662f Patrick Hand');

console.log('\n[2] \u4e00\u500b\u5916\u89c0\uff0c\u6c92\u6709\u958b\u95dc');
ok(R.classList.contains('ink'), 'html \u6302\u4e0a\u4e86 ink');
ok(!D.getElementById('inkSel'), '\u6a19\u984c\u5217\u6c92\u6709\u591a\u51fa\u9078\u55ae');
ok(D.querySelectorAll('.titlebar .ctrls select').length===5, '\u539f\u672c\u4e94\u9846\u9078\u55ae\u539f\u5c01\u4e0d\u52d5');
ok(!/ink-full|ink-body|ink-paint/.test(face), '\u6a23\u5f0f\u88e1\u6c92\u6709\u6b98\u7559\u7684\u5206\u6bb5 class');

console.log('\n[3] \u6de1\u8272 chrome');
ok(!/background-blend-mode:overlay/.test(face),
   'overlay \u6df7\u5408\u5df2\u62ff\u6389\uff08\u5b83\u628a\u6df1\u8272\u5e95\u63d0\u4eae\uff0c\u5b57\u5c31\u4e0d\u898b\u4e86\uff09');
ok(/--chrome-ink:color-mix/.test(face)&&/--chrome-ink-2:color-mix/.test(face),
   '\u5074\u6b04\u8207\u8868\u982d\u5404\u81ea\u4e00\u7d44\u58a8\u8272');
ok(/html\.ink \.nav\{/.test(face.replace(/\s+/g,''))||/html\.ink\.nav\{/.test(face.replace(/\s+/g,'')),
   '\u5074\u6b04\u6709\u88ab\u91cd\u65b0\u4e0a\u8272');
ok(/--titlefill/.test(ink)&&V('--titlefill')==='var(--chrome-ink)',
   '\u6a19\u984c\u5b57\u8ddf\u8457\u63db\u6210\u6df1\u8272');

console.log('\n[4] \u7b46\u89f8');
ok(V('--wob')==='url(#wobble-wet)'&&V('--wob2')==='url(#wobble-damp)', '\u7528\u7684\u662f\u6fd5\u7684\u7b46');
ok(!!D.getElementById('wobble-wet')&&!!D.getElementById('wobble-damp'), '\u5169\u652f\u6fd5\u6ffe\u93e1\u5df2\u639b\u9032 defs');
const wet=D.getElementById('wobble-wet');
ok(wet.parentNode.classList.contains('defs'), '\u639b\u5728\u539f\u672c\u90a3\u500b defs \u88e1');
ok(wet.getAttribute('width')==='128%', '\u6ffe\u93e1\u7bc4\u570d\u653e\u5927\uff0c\u908a\u4e0d\u6703\u88ab\u88c1');
ok(!!wet.querySelector('feGaussianBlur'), '\u4f4d\u79fb\u52a0\u6a21\u7cca\uff0c\u4e0d\u53ea\u662f\u6296');
const pap=D.getElementById('inkPaper');
ok(!!pap&&pap.parentNode===R, '\u6574\u9762\u7684\u7d19\u6302\u5728 html \u4e0d\u662f body\uff08body \u6709 zoom\uff09');
ok(pap.getAttribute('aria-hidden')==='true', '\u7d19\u5c0d\u8b80\u5c4f\u662f\u96b1\u5f62\u7684');

console.log('\n[5] \u5305\u4f4f\u539f\u672c\u90a3\u5169\u652f');
const f0=fontsRan,b0=brandRan;
W.applyFonts(); W.applyBrand();
ok(fontsRan===f0+1&&brandRan===b0+1, '\u539f\u672c\u7684 applyFonts / applyBrand \u7167\u8dd1');
ok(/Caveat Hand/.test(V('--titlefam')), '\u63db\u914d\u8272\u5f8c\u624b\u5beb\u9ad4\u6c92\u88ab\u6d17\u6389');
ok(V('--wob')==='url(#wobble-wet)', '\u63db\u5834\u666f\u5f8c\u7b46\u89f8\u6c92\u88ab\u95dc\u6389');
ok(V('--titlefill')==='var(--chrome-ink)', '\u63db\u5834\u666f\u5f8c\u6a19\u984c\u5b57\u8272\u6c92\u88ab\u6539\u56de\u53bb');

console.log('\n[6] \u5b57\u7d1a');
const px=k=>{ const m=face.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{[^}]*font-size:([\\d.]+)px')); return m?+m[1]:null; };
ok(px('html.ink body')>=15, '\u5167\u6587 \u2265 15px\uff08\u539f\u672c 14\uff09');
ok(px('html.ink .lf>h3')>=19, '\u6bb5\u843d\u6a19\u984c \u2265 19px');
ok(px('html.ink .nav button')>=14.5, '\u5074\u6b04 \u2265 14.5px');

console.log('\n[7] \u6c92\u640d\u5230\u539f\u672c\u7684\u6771\u897f');
ok(D.querySelectorAll('.sketch').length===57&&D.querySelectorAll('.sketch-soft').length===16,
   '57 \u500b .sketch\u300116 \u500b .sketch-soft \u90fd\u5728');
ok(D.querySelectorAll('table').length===28&&D.querySelectorAll('.modalbg').length===25,
   '\u8868\u683c 28\u3001\u8996\u7a97 25\uff0c\u6c92\u8b8a');
ok(D.querySelectorAll('[data-i18n]').length===547, 'i18n \u6a19\u8a18 547 \u500b\uff0c\u6c92\u8b8a');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
