/* 每一頁那一隻的回歸。畫出來的 SVG 當 XML 解析;掛的位置用真的頁面查。 */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');
const TARGET=process.argv[2]||path.join(ROOT,'deploy/index.html');
let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

const dom=new JSDOM(fs.readFileSync(TARGET,'utf8'),{runScripts:'outside-only',pretendToBeVisual:true});
const W=dom.window, D=W.document;
W.eval(fs.readFileSync(path.join(ROOT,'src/mascot.js'),'utf8'));

(async()=>{
await new Promise(r=>{ if(D.readyState!=='loading') return r();
  D.addEventListener('DOMContentLoaded',()=>r()); W.setTimeout(r,500); });

console.log('\n[1] \u6bcf\u4e00\u9801\u90fd\u6709\u4e00\u96bb');
const all=[...D.querySelectorAll('.mzwrap')];
ok(all.length===12, '\u5171 '+all.length+' \u96bb\uff0812 \u500b\u4f4d\u7f6e\uff09');
const want={'p-setting':'cat','p-code':'cat','p-chan':'cat','p-demand':'cat','p-files':'cat',
  'p-analysis':'cat','p-admin':'cat','p-rules':'dog','p-ratefill':'dog','p-hist':'dog'};
Object.entries(want).forEach(([id,kind])=>{
  const s=D.querySelector('#'+id+' .mzwrap svg');
  ok(!!s&&s.classList.contains('mz-'+kind), id+' \u2192 '+kind);
});
ok(!!D.querySelector('#cusPane .mzwrap svg.mz-dog')&&!!D.querySelector('#reconPane .mzwrap svg.mz-dog'),
   'p-cus \u5169\u500b pane \u5404\u4e00\u96bb\u67ef\u57fa');
ok(D.querySelectorAll('#p-cus .mzwrap').length===2, 'p-cus \u525b\u597d\u5169\u96bb');

console.log('\n[2] \u639b\u5728\u6a19\u984c\u4e0a\uff0c\u4e0d\u52d5\u7248\u9762');
ok(all.every(w=>/^(H3|DIV)$/.test(w.parentNode.tagName)&&(w.parentNode.tagName==='H3'||w.parentNode.classList.contains('subhd'))),
   '\u5168\u90e8\u639b\u5728 h3 \u6216 .subhd \u88e1');
ok(all.every(w=>w.parentNode.closest('.lf')), '\u5168\u90e8\u5728\u67d0\u5f35\u5361\u7684\u6a19\u984c\u4e0a');
const css=[...D.querySelectorAll('style')].map(s=>s.textContent).join('');
ok(/\.mzwrap\{position:absolute/.test(css)&&/pointer-events:none/.test(css), '\u7d55\u5c0d\u5b9a\u4f4d\u3001\u4e0d\u5403\u6ed1\u9f20');
ok(/prefers-reduced-motion:reduce\)\{\s*\.mz \.mz-eyes/.test(css.replace(/\n/g,' ')), '\u6e1b\u5c11\u52d5\u614b\u6642\u5168\u95dc');

console.log('\n[3] \u756b\u51fa\u4f86\u7684\u662f\u5408\u6cd5\u7684 SVG');
Object.keys(W.PAGE_MASCOT||{}).length; 
const keys=['p-setting','p-code','p-cus','p-chan','p-rules','p-demand','p-ratefill','p-files','recon','p-analysis','p-hist','p-admin'];
let xmlOk=0;
keys.forEach(k=>{
  const svg=W.mascot?W.mascot(k):null; if(!svg) return;
  const doc=new JSDOM(svg,{contentType:"application/xml"}).window.document;
  if(!doc.querySelector('parsererror')) xmlOk++;
});
ok(typeof W.mascot!=='function'||xmlOk===keys.length, 'XML \u89e3\u6790\u5168\u904e\uff08'+xmlOk+'/'+keys.length+'\uff09');
ok(all.every(w=>w.querySelector('.mz-eyes')&&w.querySelector('.mz-head')&&w.querySelector('.mz-prop')),
   '\u6bcf\u96bb\u90fd\u6709\u773c\u775b\u3001\u982d\u3001\u9053\u5177\u4e09\u500b\u52d5\u756b\u7d44');
ok([...D.querySelectorAll('.mz-cat')].every(c=>c.querySelector('.pt')&&c.querySelector('ellipse[fill="#4f86c6"]')),
   '\u8c93\u6709\u6d77\u8c79\u8272\u8033\u6735\u8207\u85cd\u773c\u775b');
ok([...D.querySelectorAll('.mz-dog')].every(d=>d.querySelector('.mz-flop')&&d.querySelector('.collar')),
   '\u72d7\u6709\u5782\u8033\u8207\u7d05\u9805\u5708');

console.log('\n[4] \u91cd\u8dd1\u4e0d\u758a');
W.eval(fs.readFileSync(path.join(ROOT,'src/mascot.js'),'utf8'));
await new Promise(r=>W.setTimeout(r,20));
ok(D.querySelectorAll('.mzwrap').length===12, '\u9084\u662f 12 \u96bb');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
