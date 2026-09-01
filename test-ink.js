const {JSDOM}=require('jsdom'), fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const P=r=>path.join(ROOT,r);
/* 預設驗 deploy/index.html;要驗別的檔就 node test-xxx.js /path/to/index.html */
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
  R.style.setProperty('--wob','none'); R.style.setProperty('--wob2','none'); };
let fillRan=0; W.fillSelects=function(){ fillRan++; };
W.LANG=1;

W.eval(ink);
const V=n=>R.style.getPropertyValue(n);
const sel=()=>D.getElementById('inkSel');
const pick=v=>{ sel().value=v; sel().dispatchEvent(new W.Event('change',{bubbles:true})); };

(async()=>{
await new Promise(r=>{ if(D.readyState!=='loading') return r();
  D.addEventListener('DOMContentLoaded',()=>r()); W.setTimeout(r,500); });
console.log('readyState:',D.readyState);
console.log('\n[1] \u5b57\u9ad4');
ok(D.querySelectorAll('style')[0].textContent.match(/@font-face/g).length===2,
   '\u5169\u652f\u624b\u5beb\u5b57\u9ad4\u5df2\u5167\u5d4c');
ok(/Caveat Hand/.test(D.querySelectorAll('style')[0].textContent)
   &&/Patrick Hand/.test(D.querySelectorAll('style')[0].textContent), 'Caveat / Patrick Hand \u90fd\u5728');
const face=D.querySelectorAll('style')[0].textContent;
const embedded=/base64,[A-Za-z0-9+/]{5000,}/.test(face);
const linked=/url\("caveat\.woff2"\)/.test(face)&&/url\("patrick-hand\.woff2"\)/.test(face);
ok(embedded||linked, '\u5b57\u9ad4\u4f86\u6e90\u660e\u78ba\uff1a'+(embedded?'\u5167\u5d4c data URI':'\u9023\u7d50\u540c\u5c64\u7684 woff2'));
if(linked){
  ok(fs.existsSync(path.join(path.dirname(TARGET),'caveat.woff2'))
    &&fs.existsSync(path.join(path.dirname(TARGET),'patrick-hand.woff2')),
    '\u5169\u500b\u5b57\u578b\u6a94\u771f\u7684\u5728 index.html \u540c\u4e00\u5c64');
}

console.log('\n[2] \u56db\u6bb5\u958b\u95dc');
ok(!!sel()&&sel().options.length===5, '\u6a19\u984c\u5217\u591a\u4e86\u4e00\u9846\u9078\u55ae\uff0c\u4e94\u500b\u9078\u9805');
ok(D.querySelectorAll('.titlebar .ctrls select').length===6, '\u539f\u672c\u4e94\u9846\u9084\u5728\uff0c\u73fe\u5728\u516d\u9846');
ok(R.classList.contains('ink')&&R.classList.contains('ink-paint'), '\u9810\u8a2d\u662f\u6c34\u5f69');

pick('off');
ok(!R.classList.contains('ink')&&!R.classList.contains('ink-full')&&!R.classList.contains('ink-paint'), '\u95dc\uff1a\u4e09\u500b class \u90fd\u62ff\u6389');
W.applyFonts();
ok(V('--bodyfam')==='SANS'&&V('--titlefam')==='SANS', '\u95dc\uff1a\u5b57\u9ad4\u4ea4\u9084\u7d66 applyFonts');

pick('title');
ok(R.classList.contains('ink')&&!R.classList.contains('ink-body'), '\u624b\u5beb\u6a19\u984c\uff1a\u4e0d\u52d5\u5167\u6587');
ok(/Caveat Hand/.test(V('--titlefam')), '\u624b\u5beb\u6a19\u984c\uff1a\u6a19\u984c\u662f Caveat');
ok(/Patrick Hand/.test(V('--dispfam')), '\u624b\u5beb\u6a19\u984c\uff1a\u5074\u6b04\u662f Patrick Hand');
ok(V('--bodyfam')==='SANS', '\u624b\u5beb\u6a19\u984c\uff1a\u5167\u6587\u7dad\u6301\u9ed1\u9ad4');

pick('all');
ok(R.classList.contains('ink-body'), '\u624b\u5beb\u5168\u90e8\uff1aink-body \u4e0a\u4f86\u4e86');
ok(/Patrick Hand/.test(V('--bodyfam')), '\u624b\u5beb\u5168\u90e8\uff1a\u5167\u6587\u4e5f\u63db\u4e86');
ok(!R.classList.contains('ink-full'), '\u624b\u5beb\u5168\u90e8\uff1a\u4e0d\u52d5\u7b46\u89f8');
W.applyBrand();
ok(V('--wob')==='none', '\u624b\u5beb\u5168\u90e8\uff1a\u6296\u7dda\u4ea4\u9084\u7d66 applyBrand');

pick('full');
ok(R.classList.contains('ink-full'), '\u624b\u7e6a\uff1aink-full \u4e0a\u4f86\u4e86');
W.applyBrand();
ok(V('--wob')==='url(#wobble)'&&V('--wob2')==='url(#wobble-soft)',
   '\u624b\u7e6a\uff1aapplyBrand \u95dc\u6389\u4e4b\u5f8c\u53c8\u88ab\u6253\u958b');

console.log('\n[3] \u5305\u4f4f\u539f\u672c\u90a3\u5169\u652f');
const f0=fontsRan, b0=brandRan;
W.applyFonts(); W.applyBrand();
ok(fontsRan===f0+1&&brandRan===b0+1, '\u539f\u672c\u7684 applyFonts / applyBrand \u7167\u8dd1');
ok(/Caveat Hand/.test(V('--titlefam')), '\u63db\u914d\u8272\u5f8c\u624b\u5beb\u9ad4\u6c92\u88ab\u6d17\u6389');
ok(V('--wob')==='url(#wobble)', '\u63db\u5834\u666f\u5f8c\u6296\u7dda\u6c92\u88ab\u95dc\u6389');
const fr=fillRan; W.fillSelects();
ok(fillRan===fr+1, 'fillSelects \u7167\u8dd1');
ok(sel().options.length===5&&sel().value==='full', '\u63db\u8a9e\u8a00\u5f8c\u9078\u55ae\u9084\u5728\u3001\u9078\u9805\u4e0d\u8b8a');

console.log('\n[4] \u8a18\u4f4f\u9078\u64c7');
ok(W.localStorage.getItem('ups_recon_ink')==='full', '\u5b58\u9032 localStorage');
pick('title');
ok(W.localStorage.getItem('ups_recon_ink')==='title', '\u6539\u4e86\u4e5f\u8ddf\u8457\u5b58');

console.log('\n[6] \u6c34\u5f69');
pick('paint');
ok(R.classList.contains('ink-paint')&&R.classList.contains('ink-full')
   &&R.classList.contains('ink-body'), '\u6c34\u5f69\uff1a\u4e09\u500b class \u90fd\u4e0a\u4f86');
W.applyBrand();
ok(V('--wob')==='url(#wobble-wet)'&&V('--wob2')==='url(#wobble-damp)',
   '\u6c34\u5f69\uff1a\u63db\u6210\u6fd5\u7684\u7b46');
ok(!!D.getElementById('wobble-wet')&&!!D.getElementById('wobble-damp'),
   '\u5169\u652f\u6fd5\u6ffe\u93e1\u5df2\u639b\u9032 defs');
const wet=D.getElementById('wobble-wet');
ok(wet.parentNode.classList.contains('defs'), '\u639b\u5728\u539f\u672c\u90a3\u500b defs \u88e1\uff0c\u4e0d\u662f\u53e6\u958b\u4e00\u500b');
ok(wet.getAttribute('width')==='128%', '\u6ffe\u93e1\u7bc4\u570d\u653e\u5927\uff0c\u908a\u4e0d\u6703\u88ab\u88c1');
ok(wet.querySelector('feGaussianBlur')&&wet.querySelector('feDisplacementMap'),
   '\u4f4d\u79fb\u52a0\u6a21\u7cca\uff0c\u4e0d\u53ea\u662f\u6296');
const pap=D.getElementById('inkPaper');
ok(!!pap, '\u6574\u9762\u7684\u7d19\u5df2\u639b\u4e0a');
ok(pap.parentNode===R, '\u639b\u5728 html \u4e0d\u662f body\uff08body \u6709 zoom\uff09');
ok(pap.getAttribute('aria-hidden')==='true', '\u7d19\u5c0d\u8b80\u5c4f\u662f\u96b1\u5f62\u7684');
pick('full');
ok(!R.classList.contains('ink-paint')&&R.classList.contains('ink-full'),
   '\u6536\u56de\u624b\u7e6a\uff1aink-paint \u62ff\u6389\uff0cink-full \u7559\u8457');
W.applyBrand();
ok(V('--wob')==='url(#wobble)', '\u6536\u56de\u624b\u7e6a\uff1a\u7b46\u4e5f\u4e7e\u56de\u4f86');
pick('off');
ok(!R.classList.contains('ink-paint')&&!R.classList.contains('ink-full'),
   '\u5168\u95dc\uff1a\u6c34\u5f69\u4e5f\u8ddf\u8457\u95dc');
ok(!!D.getElementById('inkPaper'), '\u7d19\u9084\u5728 DOM \u88e1\uff0c\u7531 CSS \u6c7a\u5b9a\u770b\u4e0d\u770b\u5f97\u5230');
pick('paint');

console.log('\n[5] \u6c92\u640d\u5230\u539f\u672c\u7684\u6771\u897f');
ok(D.querySelectorAll('.sketch').length===57&&D.querySelectorAll('.sketch-soft').length===16,
   '57 \u500b .sketch\u300116 \u500b .sketch-soft \u90fd\u5728');
ok(D.querySelectorAll('#wobble').length===1&&D.querySelectorAll('#wobble-soft').length===1,
   '\u5169\u500b\u6296\u7dda\u6ffe\u93e1\u90fd\u5728');
ok(D.querySelectorAll('table').length===28&&D.querySelectorAll('.modalbg').length===25,
   '\u8868\u683c 28\u3001\u8996\u7a97 25\uff0c\u6c92\u8b8a');
ok(D.querySelectorAll('[data-i18n]').length===547, 'i18n \u6a19\u8a18 547 \u500b\uff0c\u6c92\u8b8a');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
