/* src/ 與 index.html 要同一份:apply.py 把 src/ 的每一段塞進 index.html,之後
   改的卻都直接改在 index.html 上。兩邊一漂,下次有人跑 apply.py 就把改好的
   覆蓋回舊的;而 test-tabs / test-trim / test-mascot 跑的是 src/ 那份,測的
   不是上線的那份。這支測試把每一段抓出來逐字比,漂了就紅。
   用法:node test/test-src.js [index.html] */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TARGET=process.argv[2]||path.join(ROOT,'index.html');
const html=fs.readFileSync(TARGET,'utf8');
let pass=0, fail=0;
const ok=(c,m,extra)=>{ if(c){pass++;console.log('  ✓ '+m);} else {fail++;console.log('  ✗ '+m+(extra?' — '+extra:''));} };
const RE=/\/\*!ui-pack:([A-Za-z0-9._-]+):start\*\/\n?([\s\S]*?)\/\*!ui-pack:\1:end\*\//g;
const blocks=new Map(); let m;
while((m=RE.exec(html))) blocks.set(m[1], m[2]);
console.log('\n[src] index.html 裡的補強包區塊 vs src/');
ok(blocks.size>=10,'index.html 裡找得到補強包區塊('+blocks.size+' 段)');
for(const [name,body] of blocks){
  /* 內嵌字型那一版(ink.css)不進 index.html;進去的是連結版 ink-linked.css。 */
  const file=name==='ink.css'?'src/ink-linked.css':'src/'+name;
  const p=path.join(ROOT,file);
  if(!fs.existsSync(p)){ ok(false,file+' 存在'); continue; }
  const src=fs.readFileSync(p,'utf8').split('\n')
    .filter(l=>!/^\/\*!ui-pack:[A-Za-z0-9._-]+:(start|end)\*\/\s*$/.test(l)).join('\n');
  const a=src.trim(), b=body.trim();
  let at=-1; if(a!==b){ const n=Math.min(a.length,b.length); for(let i=0;i<n;i++) if(a[i]!==b[i]){at=i;break;} if(at<0) at=n; }
  ok(a===b, file+' 與 index.html 裡那一段逐字相同', a===b?'':'第一個差異在第 '+(b.slice(0,at).split('\n').length)+' 行:'+JSON.stringify(b.slice(at,at+60)));
}
/* 內嵌字型版只能和連結版差在字型那幾行:檔頭說明不比,@font-face 之後把
   src:url(…) 那幾行拿掉,其餘要逐字相同。 */
{
  const after=f=>{ const ls=fs.readFileSync(path.join(ROOT,f),'utf8').split('\n');
    const i=ls.findIndex(l=>/@font-face/.test(l)); return ls.slice(i<0?0:i).filter(l=>!/src:url\(/.test(l)).join('\n'); };
  ok(after('src/ink-linked.css')===after('src/ink.css'),'src/ink.css(字型內嵌版)除了字型那幾行,其餘和 ink-linked.css 一樣');
}
console.log('\n── '+pass+' pass / '+fail+' fail ──');
process.exit(fail?1:0);
