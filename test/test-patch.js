const {JSDOM}=require('jsdom'), fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const P=r=>path.join(ROOT,r);
/* 預設驗 deploy/index.html;要驗別的檔就 node test-xxx.js /path/to/index.html */
const TARGET=process.argv[2]||P('deploy/index.html');

const html=fs.readFileSync(TARGET,'utf8');
const patch=fs.readFileSync(P('src/ui-patch.js'),'utf8');

const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,
  url:'https://sandyliu3056.github.io/UPS-reconciliation/'});
const W=dom.window, D=W.document;
let pass=0, fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };
const sleep=ms=>new Promise(r=>W.setTimeout(r,ms));

// 真的把補強那段跑進這份頁面裡
W.eval(patch);

(async()=>{
console.log('\n[1] ESC \u95dc\u7a97');
const bgs=[...D.querySelectorAll('.modalbg')];
ok(bgs.length===25, `\u627e\u5230 ${bgs.length} \u500b\u8996\u7a97\uff08\u9810\u671f 25\uff09`);
ok(bgs.every(b=>b.querySelector('.modalhd .mx')), '\u6bcf\u500b\u8996\u7a97\u90fd\u6709 .mx \u95dc\u9589\u9215');

let clicks=[];
bgs.forEach(b=>{ b.querySelector('.modalhd .mx').addEventListener('click',()=>{
  clicks.push(b.id); b.classList.remove('on'); }); });

const esc=()=>D.dispatchEvent(new W.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));

const a=D.getElementById('dvBg');
a.classList.add('on'); await sleep(0); esc();
ok(clicks.length===1&&clicks[0]==='dvBg', 'ESC \u95dc\u6389 dvBg\uff08\u8d70\u5b83\u81ea\u5df1\u7684 \u2715\uff09');
ok(!a.classList.contains('on'), 'dvBg \u5df2\u95dc');

clicks=[];
const p1=D.getElementById('dynBg'), p2=D.getElementById('dynAddBg');
p1.classList.add('on'); await sleep(0);
p2.classList.add('on'); await sleep(0);
esc();
ok(clicks.length===1&&clicks[0]==='dynAddBg', '\u758a\u5728\u4e00\u8d77\u6642\u53ea\u95dc\u6700\u4e0a\u5c64\uff08dynAddBg\uff09');
ok(p1.classList.contains('on'), '\u4e0b\u9762\u90a3\u5c64 dynBg \u9084\u958b\u8457');
esc();
ok(clicks.length===2&&clicks[1]==='dynBg', '\u518d\u4e00\u4e0b\u624d\u95dc dynBg');

clicks=[];
esc();
ok(clicks.length===0, '\u6c92\u6709\u8996\u7a97\u6642 ESC \u4e0d\u505a\u4e8b');

// 反向順序:後開的寫在 DOM 前面,仍然要先關後開的那個
clicks=[];
const q2=D.getElementById('stBg'), q1=D.getElementById('modalBg');
q2.classList.add('on'); await sleep(0);
q1.classList.add('on'); await sleep(0);   // modalBg 在 DOM 裡比較前面,但後開
esc();
ok(clicks[0]==='modalBg', '\u4ee5\u6253\u958b\u5148\u5f8c\u5224\u65b7\uff0c\u4e0d\u662f DOM \u9806\u5e8f');
esc();

console.log('\n[2] \u641c\u5c0b\u5ef6\u5f8c');
const cs=D.getElementById('codeSearch');
ok(!!cs, '\u627e\u5230 #codeSearch');
let n=0; cs.oninput=()=>n++;
for(let i=0;i<10;i++) cs.dispatchEvent(new W.Event('input',{bubbles:true}));
ok(n===0, '\u9023\u6572\u5341\u4e0b\uff0c\u7576\u4e0b\u4e00\u6b21\u90fd\u6c92\u91cd\u756b\uff08\u539f\u672c\u662f\u5341\u6b21\uff09');
await sleep(260);
ok(n===1, '\u505c\u624b\u4e4b\u5f8c\u53ea\u91cd\u756b\u4e00\u6b21');

// 重新繫結之後仍然有效(#sysSearch 在 renderOnOff 裡每次重畫都會重綁)
let m=0; cs.oninput=()=>m++;
for(let i=0;i<6;i++) cs.dispatchEvent(new W.Event('input',{bubbles:true}));
ok(m===0, '\u91cd\u65b0\u7e6b\u7d50 oninput \u4e4b\u5f8c\uff0c\u5ef6\u5f8c\u9084\u5728');
await sleep(260);
ok(m===1, '\u91cd\u65b0\u7e6b\u7d50\u5f8c\u4e5f\u53ea\u91cd\u756b\u4e00\u6b21');

// Enter 立刻送出
let k=0; cs.oninput=()=>k++;
cs.dispatchEvent(new W.Event('input',{bubbles:true}));
cs.dispatchEvent(new W.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
ok(k===1, 'Enter \u4e0d\u7b49\uff0c\u99ac\u4e0a\u67e5');
await sleep(260);
ok(k===1, 'Enter \u4e4b\u5f8c\u4e0d\u6703\u518d\u88dc\u4e00\u767c');

// 沒列進來的輸入框不受影響
const df=D.getElementById('dashFind');
if(df){ let z=0; df.oninput=()=>z++;
  df.dispatchEvent(new W.Event('input',{bubbles:true}));
  ok(z===1, '#dashFind \u4e0d\u5728\u540d\u55ae\u88e1\uff0c\u7dad\u6301\u5373\u6642'); }

console.log('\n[3] \u8868\u982d\u6392\u5e8f');
const t=D.getElementById('tAnaCus');
ok(!!t&&t.classList.contains('sortable'), 'tAnaCus \u5df2\u6302\u4e0a\u6392\u5e8f');
const tb=t.tBodies[0];
tb.innerHTML=`
 <tr><td>C003</td><td>\u4e19</td><td>L1</td><td class="num">5</td><td class="num">$1,200.00</td><td class="num">$900.00</td><td class="num">$300.00</td><td class="num">25.0%</td></tr>
 <tr><td>C001</td><td>\u7532</td><td>L2</td><td class="num">9</td><td class="num">$900.00</td><td class="num">$950.00</td><td class="num">($50.00)</td><td class="num">-5.6%</td></tr>
 <tr><td>C002</td><td>\u4e59</td><td>L1</td><td class="num">7</td><td class="num">$3,400.00</td><td class="num">$2,000.00</td><td class="num">$1,400.00</td><td class="num">41.2%</td></tr>`;
const th=t.tHead.rows[t.tHead.rows.length-1].cells;
const col=[...th].findIndex(h=>/Margin|\u6bdb\u5229/i.test(h.textContent));
const use = col>=0?col:7;
const codes=()=>[...tb.rows].map(r=>r.cells[0].textContent);
th[use].dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
ok(codes().join()==='C002,C003,C001', '\u7b2c\u4e00\u4e0b\uff1a\u5927\u5230\u5c0f\uff08\u542b\u62ec\u865f\u8ca0\u6578\uff09');
th[use].dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
ok(codes().join()==='C001,C003,C002', '\u7b2c\u4e8c\u4e0b\uff1a\u5c0f\u5230\u5927');
th[use].dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
ok(codes().join()==='C003,C001,C002', '\u7b2c\u4e09\u4e0b\uff1a\u56de\u5230\u539f\u672c\u7684\u9806\u5e8f');
ok(!th[use].dataset.dir, '\u56de\u539f\u9806\u5e8f\u6642\u7bad\u982d\u62ff\u6389');
th[0].dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
ok(codes().join()==="C001,C002,C003", "\u6587\u5b57\u6b04\u7b2c\u4e00\u4e0b\u662f A\u5230Z");
ok(!th[use].dataset.dir, '\u63db\u4e00\u6b04\u6392\uff0c\u5148\u524d\u90a3\u6b04\u7684\u7bad\u982d\u6d88\u5931');

// 空狀態那一列不能被排進去
tb.innerHTML=`<tr><td colspan="8" class="empty">\u9084\u6c92\u6709\u8cc7\u6599</td></tr>`;
th[0].dispatchEvent(new W.MouseEvent('click',{bubbles:true}));
ok(tb.rows.length===1&&tb.rows[0].cells[0].className==='empty', '\u7a7a\u72c0\u614b\u4e0d\u53d7\u5f71\u97ff');

console.log('\n[4] \u9996\u6b04\u51cd\u7d50');
const pin=['tRecon','tReconChg','tHist','tSize','tAnaCus','tAnaLvl'];
pin.forEach(id=>{ const e=D.getElementById(id);
  ok(!!e&&e.classList.contains('pinfirst'), id+' \u5df2\u91d8\u4f4f\u9996\u6b04'); });

console.log('\n[5] \u6c92\u6709\u640d\u5230\u539f\u672c\u7684\u6771\u897f');
ok(D.querySelectorAll('table').length===31, '\u8868\u683c\u6578\u91cf\u6c92\u8b8a\uff0831\uff09');
ok(D.querySelectorAll('.modalbg').length===25, '\u8996\u7a97\u6578\u91cf\u6c92\u8b8a\uff0825\uff09');
ok(D.querySelectorAll('[data-i18n]').length>0, 'i18n \u6a19\u8a18\u9084\u5728');

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
})();
