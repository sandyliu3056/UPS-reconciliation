/* 孤兒 CSS 變數的守門員。
   一個 var(--x) 只要沒有人定義 --x,那一整條宣告在計算時就是無效的 ——
   瀏覽器不會報錯,也不會用 var() 的備援值,它直接把那個屬性丟掉。
   font-family:var(--bodyfam) 裡的 --bodyfam 若含有沒定義的 var(),
   整個手寫體就這樣安靜地消失。這一支就是為了那次而寫的。 */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TARGET=process.argv[2]||path.join(ROOT,'deploy/index.html');

const src=fs.readFileSync(TARGET,'utf8');
let pass=0,fail=0;
const ok=(c,m)=>{ c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m)); };

/* 定義:樣式表裡的 --x: ,加上程式用 setProperty("--x", ...) 設的 */
const defined=new Set();
for(const m of src.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
for(const m of src.matchAll(/setProperty\(\s*["'](--[a-zA-Z0-9-]+)["']/g)) defined.add(m[1]);

/* 引用:樣式表與程式碼裡所有的 var(--x) */
const used=new Set();
for(const m of src.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) used.add(m[1]);

/* var(--x, 備援) 有寫備援的可以放過 —— 沒定義時會走備援,不會整條失效。 */
const withFallback=new Set();
for(const m of src.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*,/g)) withFallback.add(m[1]);

console.log(`\n\u5b9a\u7fa9 ${defined.size} \u500b\uff0c\u5f15\u7528 ${used.size} \u500b`);
const orphans=[...used].filter(v=>!defined.has(v)&&!withFallback.has(v)).sort();
orphans.forEach(v=>{
  const at=src.split('\n').findIndex(l=>l.includes('var('+v));
  console.log(`  \u2717 ${v}  \u5f15\u7528\u65bc\u7b2c ${at+1} \u884c\uff0c\u4f46\u6c92\u6709\u4eba\u5b9a\u7fa9\uff0c\u4e5f\u6c92\u5beb\u5099\u63f4`);
});
ok(orphans.length===0, orphans.length? orphans.length+' \u500b\u5b64\u5152\u8b8a\u6578'
   : '\u6bcf\u4e00\u500b var(--x) \u90fd\u6709\u5b9a\u7fa9\u6216\u5099\u63f4');

/* 手寫體那三個變數要真的指到內嵌／連結進來的字型家族 */
const FACES=[...src.matchAll(/@font-face\{[^}]*font-family:\s*"([^"]+)"/g)].map(m=>m[1]);
ok(FACES.includes("Caveat Hand")&&FACES.includes("Patrick Hand"),
   '\u5169\u652f\u624b\u5beb\u5b57\u9ad4\u90fd\u6709 @font-face\uff1a'+FACES.join(' / '));
const stacks=[...src.matchAll(/setProperty\("--(?:titlefam|dispfam|bodyfam)",\s*([A-Za-z_$][\w$]*)\)/g)];
ok(stacks.length===3, '\u4e09\u500b\u5b57\u9ad4\u8b8a\u6578\u90fd\u6709\u88ab\u8a2d\u5230');
const HB=src.match(/var HAND_BODY\s*=\s*'([^']+)'/);
const HD=src.match(/var HAND_DISP\s*=\s*'([^']+)'/);
ok(!!HB&&!!HD, '\u627e\u5f97\u5230\u5169\u500b\u5b57\u9ad4\u5806\u758a');
[["HAND_BODY",HB],["HAND_DISP",HD]].forEach(([n,m])=>{
  if(!m) return;
  const bad=[...m[1].matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)]
    .map(x=>x[1]).filter(v=>!defined.has(v));
  ok(bad.length===0, n+' \u88e1\u6c92\u6709\u6c92\u5b9a\u7fa9\u7684 var()'+(bad.length?'\uff1a'+bad.join(','):''));
  const fam=m[1].match(/"([^"]+)"/);
  ok(fam&&FACES.includes(fam[1]), n+' \u7684\u7b2c\u4e00\u9078\u662f\u771f\u7684\u6709\u8f09\u9032\u4f86\u7684\u5b57\u9ad4\uff1a'+(fam?fam[1]:'?'));
});

console.log(`\n\u2500\u2500 ${pass} pass / ${fail} fail \u2500\u2500`);
process.exit(fail?1:0);
