/* 把整份 index.html 真的跑起來,看補強有沒有生效。
   前面那幾支測的是「函式回傳什麼」,這一支測的是「開起來長什麼樣」——
   手寫體不見的那次,前面全過,只有這一支抓得到。
   canvas 在 jsdom 沒有實作,那幾個錯誤是預期的,不算失敗。 */
const {JSDOM, VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TARGET=process.argv[2]||path.join(ROOT,'deploy/index.html');

const errs=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>errs.push((e.detail?e.detail.message:e.message)||''));
vc.on('error',(...a)=>errs.push(a.join(' ')));

const dom=new JSDOM(fs.readFileSync(TARGET,'utf8'),
  {runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
   url:'https://sandyliu3056.github.io/UPS-reconciliation/'});
const W=dom.window;
W.fetch=()=>Promise.reject(new Error('offline'));

let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

setTimeout(()=>{
  const D=W.document, R=D.documentElement;
  const V=n=>R.style.getPropertyValue(n);
  const real=errs.filter(e=>!/getContext|setTransform|Not implemented/.test(e));

  console.log('\n[1] \u958b\u5f97\u8d77\u4f86');
  ok(real.length===0, '\u9664\u4e86 canvas\uff0c\u6c92\u6709\u5225\u7684\u932f'+(real.length?'\uff1a'+real[0].slice(0,90):''));
  ok(R.classList.contains('ink'), 'html \u6302\u4e0a\u4e86 ink');

  console.log('\n[2] \u624b\u5beb\u9ad4\u771f\u7684\u4e0a\u4e86');
  const bad=v=>/var\(--/.test(v);   /* \u9084\u5305\u8457\u672a\u89e3\u6790\u7684 var() \u5c31\u662f\u58de\u7684 */
  ['--titlefam','--dispfam','--bodyfam'].forEach(k=>{
    const v=V(k);
    ok(!!v, k+' \u6709\u503c');
    ok(!bad(v), k+' \u88e1\u6c92\u6709\u6b98\u7559\u7684 var()\uff1a'+v);
  });
  ok(/Caveat Hand/.test(V('--titlefam')), '\u6a19\u984c\u662f Caveat');
  ok(/Patrick Hand/.test(V('--bodyfam')), '\u5167\u6587\u662f Patrick Hand');

  console.log('\n[3] \u7b46\u89f8\u771f\u7684\u4e0a\u4e86');
  ok(V('--wob')==='url(#wobble-wet)', '\u6fd5\u7684\u7b46');
  ok(!!D.getElementById('wobble-wet')&&!!D.getElementById('wobble-damp'), '\u5169\u652f\u6ffe\u93e1\u5728 DOM \u88e1');
  ok(!!D.getElementById('inkPaper'), '\u6574\u9762\u7684\u7d19\u5728');

  console.log('\n[4] \u5176\u4ed6\u88dc\u5f37');
  ok(D.querySelectorAll('#rateSide .setnav-tabs[data-g=fill] button').length===4, '04 \u56db\u500b\u5b50\u9801');
  ok(typeof W.fmArt==='function'&&W.fmArt('transit',600,120).indexOf('fm-sh')>=0,
     '\u6d41\u7a0b\u5716\u63d2\u756b\u662f\u65b0\u7684');
  const nav01=D.querySelector('#tabs button[data-p="general"] [data-i18n="tab.general"]');
  ok(!!nav01&&nav01.textContent.trim()==='Pricing Configuration',
     '01 \u6539\u540d\uff1a'+(nav01?nav01.textContent.trim():'?'));
  ok(!/General Setting/.test(D.getElementById('tabs').textContent), '\u5074\u6b04\u4e0a\u6c92\u6709 General Setting \u4e86');
  const navTxt=D.getElementById('tabs').textContent;
  ['Customer Management','Channel & Surcharge Catalog','Channel & Surcharge Rates','WMS / TMS Import','UPS Invoice Import']
    .forEach(n=>ok(navTxt.indexOf(n)>=0, '\u5074\u6b04\uff1a'+n));
  const sub=D.getElementById('rateSide').textContent;
  ['1. Rate Levels','2. Charge Code Mapping','3. System Settings','1. Customer Directory','2. Surcharge Catalog','3. Demand Periods',
   '1. Base Rates','2. Surcharge Rates','3. Dimensional Rules','4. Demand Rates']
    .forEach(n=>ok(sub.indexOf(n)>=0, '\u5b50\u9801\uff1a'+n));
  ok(D.querySelectorAll('.mzwrap').length===13, '13 \u96bb\u90fd\u5728\u9801\u4e0a');

  console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
  process.exit(fail?1:0);
},1800);
