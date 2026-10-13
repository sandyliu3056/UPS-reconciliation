/* 引擎的數字測試:把整份 index.html 在 jsdom 裡跑起來,餵小 fixture 給
   ingest → shipmentsOf → priceShipment → reconRun,金額對到分。
   前面那幾支測的是外觀;算錢的規則以前只有 repo 外的守門腳本在守,容器一重置就沒了。
   追蹤號故意不用 1Z 開頭(pre-commit 擋真追蹤號的形狀),帳單號用 INV1 這種。 */
const {JSDOM, VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TARGET=process.argv[2]||path.join(ROOT,'index.html');

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
const ok=(c,m,d)=>{ c?(pass++,console.log('  ✓ '+m)):(fail++,console.log('  ✗ '+m+(d!==undefined?' — '+JSON.stringify(d).slice(0,400):''))); };
const near=(a,b,eps=0.011)=>Math.abs((+a||0)-(+b||0))<eps;
/* 在頁面那個 realm 裡跑一段函式,結果用 JSON 帶回來(top-level const 只有 eval 看得到)。 */
const inPage=(fn,args)=>JSON.parse(W.eval('JSON.stringify(('+fn.toString()+')('+JSON.stringify(args||{})+'))'));
/* 非同步的版本:頁面端回一個 Promise,等它完成再把結果帶回來。 */
const inPageAsync=async(fn,args)=>JSON.parse(JSON.stringify(await W.eval('(('+fn.toString()+')('+JSON.stringify(args||{})+'))')));

/* ---- 共用費率:線性運費表、固定附加費 ---- */
const ZONES=[2,3,4,5,6,7,8];
const rateAt=w=>Number((2.485+0.59328*w).toFixed(2));
const baseTable=svc=>({service:svc, residential:String(svc==='Ground Residential'),
  columns:['Weight',...ZONES.map(z=>'Zone '+z)],
  rows:Array.from({length:150},(_,i)=>{const w=i+1; return [String(w),...ZONES.map(()=>rateAt(w).toFixed(2))];})});
const zoneMap=v=>Object.fromEntries(ZONES.map(z=>[String(z),v]));
const accOf=o=>{ const A={}; for(const ch of ['Ground Commercial','Ground Residential']) for(const [k,v] of Object.entries(o)) A[k+'|||'+ch]=(typeof v==='number'&&k.startsWith('AHS')||k==='Large Package')?zoneMap(v):v; return A; };
const H=['Invoice Date','Invoice Number','Account Number','Transaction Date','Lead Shipment Number',
 'Tracking Number','Entered Weight','Billed Weight','Billed Weight Type','Package Dimensions','Zone',
 'Charge Category Code','Charge Category Detail Code','Charge Classification Code',
 'Charge Description Code','Charge Description','Net Amount','Detail Keyed Dimensions','Declared Value'];
const q=v=>{ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const csvOf=rows=>[H,...rows].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';

/* 頁面端:套設定、跑對帳,回傳要比的數字。 */
function runRecon(P){
  setMe({id:'u1',user:'s',name:'S',role:'admin'}); cfgPush=async()=>true;
  const raw=JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  raw.customers=[{code:'CG',name:'Demo',level:'L1'}];
  raw.rate_levels={active:'L1', list:[{id:'L1', name:'JL'}], cfg:{}};
  raw.base_rate_tables=P.tables;
  raw.accessorial_rate_table=Object.assign({},raw.accessorial_rate_table,P.acc);
  raw.global_rules.fuel_percent='24';
  raw.global_rules.scc_audit_fee='1.65';
  applyConfig(JSON.stringify(raw),'t.json',false);
  ROWS=ingest(P.csv).rows; SHIPS=shipmentsOf(ROWS); RATED=SHIPS.map(x=>priceShipment(CFG,x));
  const res=reconRun(P.tpl);
  const o=(res.orders||[])[0]||{};
  const pr=RATED[0]||{};
  const items=((res.rebill&&res.rebill.items)||[]).map(x=>({kind:x.kind,charge:x.charge,seg:x.seg||'',desc:x.desc||'',
    amt:x.amt,billed:x.billed,fuel:x.fuel,total:x.total,unset:!!x.unset}));
  return {bw:pr.bw&&pr.bw.billable, mainAcc:pr.acc||{}, rtnAcc:(pr.rtn&&pr.rtn.acc)||null, npbAcc:(pr.npb&&pr.npb.acc)||null,
    mainDims:SHIPS[0]&&SHIPS[0].dims, rtnDims:SHIPS[0]&&SHIPS[0].rtnSeg&&SHIPS[0].rtnSeg.dims,
    rep:(o.fees&&o.fees.rep)||{}, rtnRep:(o.fees&&o.fees.rtnRep)||{}, npbRep:(o.fees&&o.fees.npbRep)||{},
    wtRate:o.fees&&o.fees.wtRate, inv:o.inv, amt:o.amt, cost:o.cost, items, grand:res.rebill&&res.rebill.grand,
    mainBase:pr.base||0, npbBase:(pr.npb&&pr.npb.base)||0};
}
const TABLES=[baseTable('Ground Commercial'),baseTable('Ground Residential')];
const tplOf=(trks,chg,extra)=>[Object.assign({ln:2,order:'K1',trks,cus:'CG',amt:20,src:'TMS',zone:'8',chan:'Ground',chg},extra||{})];
const FAM=/Additional Handling|Large Package/;

setTimeout(async()=>{
  const real=errs.filter(e=>!/getContext|setTransform|Not implemented/.test(e));
  ok(real.length===0,'頁面開得起來，除了 canvas 沒有別的錯'+(real.length?'：'+real[0].slice(0,80):''));

  /* ===== [1] 計費重差額:客戶 6 磅、合約 40 磅(UPS 開過 AHL → AHS 最低計費重),沒有運費更正 ===== */
  console.log('\n[1] 計費重差額');
  {
    const T='TWT1';
    const L=(cat,det,cls,code,desc,net,ent,bil,bwt,dimsC)=>['2026-07-18','INV1','A1','2026-07-10',T,T,ent==null?'':ent,bil==null?'':bil,bwt||'',dimsC||'','008',cat,det,cls,code,desc,net.toFixed(2),'50x11x3',''];
    const shapeA=[L('SHP','ISS','FRT','003','Ground Commercial',10.22,2.4,15,''),
      L('SHP','ISS','ACC','AHL','Addl. Handling longest side',6.07),
      L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.85),
      L('ADJ','SCC','FRT','003','Shipping Charge Correction Ground',0.00,0,0,'08','48x9x3'),
      L('ADJ','SCC','ACC','AHL','Shipping Charge Correction Addl. Handling longest side',-6.07),
      L('ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',-1.06)];
    const acc=accOf({'AHS Dimension':6.08,'AHS Weight':6.08,'Large Package':57.20,'DAS Commercial':1.35,'Residential Surcharge':2.60});
    const chg={'Base Rate':7.46,'Additional Handling + Large Package Surcharge':6.08,'Fuel Surcharge':3.05,'Service Fee':0.20};
    const go=(extra,rows,c)=>inPage(runRecon,{tables:TABLES,acc,csv:csvOf(rows||shapeA),tpl:tplOf([T],c||chg,extra)});
    const A=go({wt:6});
    const wA=A.items.filter(x=>x.charge==='Base Rate'&&x.kind==='short');
    /* 補的是 min(重量差, 合約運費 − 實收):這裡客戶收的 7.46 比費率@6(6.04)高,所以是後者 */
    const exp=Number(Math.min(rateAt(40)-rateAt(6), rateAt(40)-7.46).toFixed(2));
    ok(A.bw===40,'合約計費重被 AHS 最低計費重拉到 40',A.bw);
    ok(wA.length===1&&near(wA[0].amt,exp),'運費短收 = min(費率@40 − 費率@6, 費率@40 − 實收 7.46) = '+exp,wA);
    ok(wA.length===1&&/6 → 40 lb/.test(wA[0].desc),'說明寫計費重 6 → 40 lb',wA);
    ok(wA.length===1&&near(wA[0].fuel,Math.round(exp*24)/100),'帶燃油 24%',wA);
    ok(A.items.some(x=>x.kind==='refund'&&near(x.amt,-6.08)),'AHL 被沖掉：合併欄收的 6.08 照舊退',A.items);
    ok(A.items.filter(x=>x.charge==='Base Rate').length===1,'運費只有這一列',A.items);
    ok(!go({wt:40}).items.some(x=>x.charge==='Base Rate'),'客戶重量等於合約計費重：不開');
    ok(!go({}).items.some(x=>x.charge==='Base Rate'),'模板沒填重量：不比');
    ok(!go({wt:39}).items.some(x=>x.charge==='Base Rate'),'差額不到門檻：不開');
    const shapeSCC=[L('SHP','ISS','FRT','003','Ground Commercial',10.22,5,15,''),
      L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.45),
      L('ADJ','SCC','FRT','003','Shipping Charge Correction Ground',3.59,5,21,'09','50x8x3'),
      L('ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',0.86)];
    const E=go({wt:6},shapeSCC,{'Base Rate':7.46,'Fuel Surcharge':1.79,'Service Fee':0.20});
    const scc=E.items.find(x=>x.charge==='Shipping Charge Correction');
    ok(scc&&near(scc.amt,Number((rateAt(21)-7.46).toFixed(2)))&&!E.items.some(x=>x.charge==='Base Rate'),
       '有運費更正：更正那一列 = 最後運費 − 已收，計費重差額不另開',E.items);
    ok(E.items.some(x=>x.kind==='audit'&&near(x.amt,1.65)),'更正收一筆稽核費 1.65',E.items);
    /* 客戶照自己的重量收得比費率表高:補的不能超過「合約運費 − 實收」 */
    const Hh=go({wt:6},null,{'Base Rate':9.00,'Fuel Surcharge':2.16,'Service Fee':0.20});
    const wH=Hh.items.filter(x=>x.charge==='Base Rate'&&x.kind==='short');
    ok(wH.length===1&&near(wH[0].amt,Number((rateAt(40)-9.00).toFixed(2)))&&near(wH[0].billed,9.00),'實收 9.00 高於費率@6：補 min(重量差, 合約運費 − 實收) = '+(rateAt(40)-9.00).toFixed(2),wH);
    const Hc=go({wt:6},null,{'Base Rate':25.90,'Fuel Surcharge':6.22,'Service Fee':0.20});
    ok(!Hc.items.some(x=>x.charge==='Base Rate'),'實收 25.90 已接近合約運費 26.22：差 0.32 不到門檻，不開',Hc.items);
    const G=go({wt:6},null,{'Additional Handling + Large Package Surcharge':6.08,'Fuel Surcharge':1.46});
    const gB=G.items.filter(x=>x.charge==='Base Rate');
    ok(gB.length===1&&gB[0].kind==='miss'&&near(gB[0].amt,rateAt(40)),'運費整筆沒收：照舊整筆補一列，不是差額',gB);
  }

  /* ===== [2] 家族沖抵分段抵:出貨段 AHS-Dimension 4.50、第二段運送 AHS-Packaging 8.31 ===== */
  console.log('\n[2] 合併欄先抵原出貨段，再抵第二段運送');
  {
    const T='TNPB1';
    const L=(cat,det,cls,code,desc,net,ent,bil)=>['2026-07-25','INV1','A1','2026-07-16',T,T,ent==null?'':ent,bil==null?'':bil,'','','005',cat,det,cls,code,desc,net.toFixed(2),'50x20x8',''];
    const rows=[L('SHP','ISS','FRT','003','Ground Residential',6.99,20,23),
      L('SHP','ISS','ACC','RES','Residential Surcharge',1.62),
      L('SHP','ISS','ACC','RDR','Delivery Area Surcharge',1.64),
      L('SHP','ISS','ACC','AHG','Additional Handling - Length+Girth',4.50),
      L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.56),
      L('ADJ','CLB','FRT','003','Not Previously Billed Ground Commercial',8.33,20,23),
      L('ADJ','CLB','ACC','AHP','Not Previously Billed Additional Handling',4.99),
      L('ADJ','CLB','ACC','NPF','Not Previously Billed Missing PLD Fee',4.70),
      L('ADJ','CLB','ACC','SCF','Not Previously Billed Shipping Correction Fee',1.65),
      L('ADJ','CLB','FSC','FSC','Not Previously Billed Fuel Surcharge',2.35)];
    const acc=accOf({'AHS Dimension':4.50,'AHS Weight':6.08,'AHS Packaging':8.31,'Large Package':57.20,
      'Residential Surcharge':2.60,'DAS Residential':1.97,'DAS Commercial':1.35,'Missing PLD Fee':4.70});
    const go=(ahs,extra)=>inPage(runRecon,{tables:TABLES,acc,csv:csvOf(rows.concat(extra||[])),tpl:tplOf([T],{'Base Rate':7.27,'Residential Surcharge':2.60,
      'Additional Handling + Large Package Surcharge':ahs,'Delivery Area / Remote Area Surcharge':1.97,'Fuel Surcharge':3.65,'Service Fee':0.20},{wt:23,zone:'2',amt:20.19})});
    const A=go(4.50); const fa=A.items.filter(x=>FAM.test(x.charge));
    ok(near(A.mainAcc['AHS Dimension'],4.50)&&A.npbAcc&&near(A.npbAcc['AHS Packaging'],8.31),'形狀對：出貨段 Dimension 4.50、第二段 Packaging 8.31',{m:A.mainAcc,n:A.npbAcc});
    ok(near(A.npbRep['Additional Handling Surcharge - Packaging'],8.31),'第二段的份額記下來了',A.npbRep);
    ok(!fa.some(x=>/Dimension/.test(x.charge)),'Dimension 不開列（客戶收的 4.50 抵在它身上）',fa);
    ok(fa.some(x=>/Packaging/.test(x.charge)&&x.kind==='miss'&&near(x.amt,8.31)),'第二段的 Packaging 整筆漏收 8.31',fa);
    ok(near(fa.reduce((a,x)=>a+x.amt,0),8.31),'家族補收合計 = 12.81 − 4.50 = 8.31',fa);
    ok(!A.items.some(x=>/paid \$0\.00|已收 \$0\.00/.test(x.desc)),'沒有「合併欄已收 $0.00」',A.items);
    ok(A.items.some(x=>/Missing PLD/.test(x.charge))&&A.items.some(x=>/Shipping Correction Fee/.test(x.charge)),'NPF / SCF 照舊補收',A.items);
    const B=go(3.00); const fb=B.items.filter(x=>FAM.test(x.charge));
    ok(fb.some(x=>/Dimension/.test(x.charge)&&x.kind==='short'&&near(x.amt,1.50)&&near(x.billed,3.00)),'收 3.00：Dimension 短收 1.50、已收 3.00',fb);
    ok(fb.some(x=>/Packaging/.test(x.charge)&&x.kind==='miss'&&near(x.amt,8.31)),'收 3.00：Packaging 仍整筆漏收',fb);
    ok(!go(12.81).items.some(x=>FAM.test(x.charge)),'收 12.81：家族一列都不開');
    /* 第二段運送的運費:自己一列(客戶從來沒收過),主段的運費差額照舊、不重複 */
    const nb=A.items.filter(x=>x.seg==='npb');
    ok(A.npbBase>0&&nb.length===1&&nb[0].charge==='Base Rate'&&nb[0].kind==='miss'&&near(nb[0].amt,A.npbBase)&&near(nb[0].fuel,Math.round(A.npbBase*24)/100),
       '第二段運送的運費自己一列，金額 = 第二段照客戶費率的運費、帶燃油',{npbBase:A.npbBase,nb});
    ok(near(A.rep['Base Rate']-A.npbBase,A.mainBase),'應收的 Base Rate = 主段 + 第二段',{rep:A.rep['Base Rate'],main:A.mainBase,npb:A.npbBase});
    const wr=A.items.filter(x=>x.charge==='Base Rate'&&x.kind==='short');
    ok(wr.length===1&&near(wr[0].amt,Number((rateAt(58)-rateAt(23)).toFixed(2))),'主段的計費重差額（23 → 58）照舊、不含第二段',wr);
    /* 同單另有運費更正:更正那一列 = 主段最後運費 − 已收(不含第二段),第二段仍自己一列 */
    const S=go(4.50,[L('ADJ','SCC','FRT','003','Shipping Charge Correction Ground',0.50,20,25),
                     L('ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',0.12)]);
    const sc=S.items.find(x=>x.charge==='Shipping Charge Correction'), nb2=S.items.filter(x=>x.seg==='npb');
    ok(sc&&near(sc.amt,Number((S.mainBase-7.27).toFixed(2))),'有更正：更正列 = 主段最後運費 − 已收，不含第二段',{sc,mainBase:S.mainBase});
    ok(nb2.length===1&&near(nb2[0].amt,S.npbBase)&&!S.items.some(x=>x.charge==='Base Rate'&&x.kind==='short'),'有更正：第二段仍自己一列，計費重差額不另開',S.items);
  }

  /* ===== [3] 跨三期:出貨+更正(130 剛好在門檻)、退件回程、修回程的更正(大包裹) ===== */
  console.log('\n[3] 修回程的更正單，大包裹判在回程');
  {
    const T='TEN1';
    const L=(inv,date,cat,det,cls,code,desc,net,ent,bil,bwt,dimsC)=>[date,inv,'A1','2026-07-29',T,T,ent==null?'':ent,bil==null?'':bil,bwt||'',dimsC||'','008',cat,det,cls,code,desc,net.toFixed(2),'68x25x4',''];
    const rows=[
      L('INV1','2026-08-08','SHP','ISS','FRT','003','Ground Residential',14.54,5.9,23,'02'),
      L('INV1','2026-08-08','SHP','ISS','ACC','RES','Residential Surcharge',1.62),
      L('INV1','2026-08-08','SHP','ISS','ACC','AHG','Additional Handling - Length+Girth',6.07),
      L('INV1','2026-08-08','SHP','ISS','FSC','FSC','Fuel Surcharge',4.08),
      L('INV1','2026-08-08','ADJ','SCC','FRT','003','Shipping Charge Correction Ground',6.47,23,38,'09','70x23x7'),
      L('INV1','2026-08-08','ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',1.19),
      L('INV2','2026-08-15','RTN','','FRT','003','Ground Undeliverable Return',14.05,0,38,'02'),
      L('INV2','2026-08-15','RTN','','ACC','RDC','Delivery Area Surcharge',1.12),
      L('INV2','2026-08-15','RTN','','ACC','AHG','Additional Handling - Length+Girth',6.07),
      L('INV2','2026-08-15','RTN','','FSC','FSC','Fuel Surcharge',3.98),
      L('INV3','2026-08-22','ADJ','SCC','FRT','003','Shipping Charge Correction Ground Undeliverable Return',12.90,38,90,'09','70x24x7'),
      L('INV3','2026-08-22','ADJ','SCC','ACC','LPS','Shipping Charge Correction Large Package Surcharge - Length + Girth',42.90),
      L('INV3','2026-08-22','ADJ','SCC','ACC','AHG','Shipping Charge Correction Additional Handling - Length+Girth',-6.07),
      L('INV3','2026-08-22','ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',9.31)];
    const acc=accOf({'AHS Dimension':6.08,'AHS Weight':6.08,'Large Package':57.20,'DAS Commercial':1.35,'Residential Surcharge':2.60});
    const A=inPage(runRecon,{tables:TABLES,acc,csv:csvOf(rows),tpl:tplOf([T],{'Base Rate':16.13,'Residential Surcharge':2.60,
      'Additional Handling + Large Package Surcharge':6.08,'Fuel Surcharge':5.88,'Service Fee':0.20},{amt:30.89})});
    ok(A.mainDims&&A.mainDims.w===23&&A.rtnDims&&A.rtnDims.w===24,'主段尺寸 70x23x7、回程 70x24x7（修回程的更正量的）',{m:A.mainDims,r:A.rtnDims});
    ok(near(A.mainAcc['AHS Dimension'],6.08)&&!A.mainAcc['Large Package'],'主段額外處理 6.08、沒有大包裹（130 剛好在門檻，UPS 也沒收）',A.mainAcc);
    ok(A.rtnAcc&&near(A.rtnAcc['Large Package'],57.20),'回程大包裹 57.20',A.rtnAcc);
    ok(near(A.rep['Large Package Surcharge'],57.20)&&near(A.rtnRep['Large Package Surcharge'],57.20),'應收含大包裹 57.20，記在回程',{rep:A.rep,rtn:A.rtnRep});
    const lps=A.items.filter(x=>x.charge==='Large Package Surcharge'&&x.amt>0.004);
    ok(lps.length===1&&near(lps[0].amt,57.20)&&lps[0].seg==='rtn'&&near(lps[0].fuel,13.73),'補收清單：退件回程 大包裹 57.20 一列、燃油 13.73',A.items);
    ok(!A.items.some(x=>!(Math.abs(x.amt)>0.004)),'沒有金額 0 的隱形列',A.items.filter(x=>!(Math.abs(x.amt)>0.004)));
    ok(!A.items.some(x=>x.charge==='Additional Handling + Large Package Surcharge'),'合併欄本身沒有再開一列');
    ok(A.inv==='INV1 / INV2 / INV3','這一單記下三張帳單號',A.inv);
  }

  /* ===== [4] 保價:UPS 沒開 EVS 就不算;有開才算 ===== */
  console.log('\n[4] 保價');
  {
    const T='TDV1';
    const L=(cls,code,desc,net,ent,bil,dv)=>['2026-08-01','INV1','A1','2026-07-22',T,T,ent==null?'':ent,bil==null?'':bil,'','','006','SHP','ISS',cls,code,desc,net.toFixed(2),'20x12x8',dv==null?'':dv];
    const acc=accOf({'AHS Dimension':6.08,'Residential Surcharge':2.60});
    const chg={'Base Rate':14.31,'Declared Value':20.40,'Fuel Surcharge':7.90,'Service Fee':0.20};
    const A=inPage(runRecon,{tables:TABLES,acc,csv:csvOf([L('FRT','003','Ground Commercial',12.47,28,28),L('FSC','FSC','Fuel Surcharge',2.20)]),tpl:tplOf([T],chg,{wt:28,zone:'6',amt:42.81})});
    ok(!('Declared Value' in A.mainAcc),'UPS 沒開保價：應收沒有保價這一項',A.mainAcc);
    ok(!A.items.some(x=>/Declared Value/.test(x.charge)),'客戶收的保價不退也不補（當毛利）',A.items);
    ok(!A.items.some(x=>x.charge==='Base Rate'),'重量三邊都 28 磅：沒有運費列',A.items);
    const B=inPage(runRecon,{tables:TABLES,acc,csv:csvOf([L('FRT','003','Ground Commercial',12.47,28,28),L('ACC','EVS','Declared Value',8.50,0,0,500),L('FSC','FSC','Fuel Surcharge',2.20)]),tpl:tplOf([T],chg,{wt:28,zone:'6',amt:42.81})});
    ok(near(B.mainAcc['Declared Value'],8.50),'UPS 有開保價：應收照 UPS 實收 8.50（無合約費率時）',B.mainAcc);
  }

  /* ===== [5] 對帳存檔失敗要講出來:跳紅字、不把「上一次」指到沒存進去的那一份、寫入中擋關分頁 ===== */
  console.log('\n[5] 對帳存檔失敗');
  {
    const T='TDV1';
    const chg={'Base Rate':14.31,'Fuel Surcharge':3.43,'Service Fee':0.20};
    const R=await inPageAsync(function(P){
      const res=reconRun(P.tpl);
      const toasts=[]; const realToast=window.toast; window.toast=(m,ok)=>{ toasts.push({m:String(m),ok:!!ok}); };
      const realPut=window.idbRunPut;
      try{ localStorage.removeItem(reconLastKey()); }catch(e){}
      window.idbRunPut=()=>Promise.reject(new Error('QuotaExceededError'));
      const p1=reconRunSave(P.tpl,res,'t.xlsx');
      const out={guardDuring:HIST_WRITES.size, unloadDuring:typeof window.onbeforeunload==='function'};
      return p1.then(()=>{
        out.toastsAfterFail=toasts.slice(); out.lastAfterFail=localStorage.getItem(reconLastKey());
        out.guardAfter=HIST_WRITES.size; out.unloadAfter=!!window.onbeforeunload; out.runKey=RECON_RUN_KEY;
        return reconRunSave(P.tpl,res,'t.xlsx');
      }).then(()=>{
        out.toastsAfterRepeat=toasts.length;
        window.idbRunPut=()=>Promise.resolve(true); RECON_RUNS=[];
        return reconRunSave(P.tpl,res,'t.xlsx');
      }).then(()=>{
        out.lastAfterOk=localStorage.getItem(reconLastKey()); out.toastsAfterOk=toasts.length; out.errCleared=RECON_SAVE_ERR;
        window.idbRunPut=realPut; window.toast=realToast;
        return out;
      });
    },{tpl:tplOf([T],chg,{wt:28,zone:'6',amt:17.94})});
    ok(R.guardDuring>=1&&R.unloadDuring,'寫入中：擋關分頁（HIST_WRITES）',R);
    ok(R.toastsAfterFail.length===1&&!R.toastsAfterFail[0].ok&&/QuotaExceededError/.test(R.toastsAfterFail[0].m),'存失敗：跳一次紅字，帶錯誤訊息',R.toastsAfterFail);
    ok(R.lastAfterFail===null&&!!R.runKey,'存失敗：「上一次對帳」不指向沒存進去的那一份，畫面的 key 照設',{last:R.lastAfterFail,key:R.runKey});
    ok(R.guardAfter===0&&!R.unloadAfter,'寫完：關分頁的擋放開',R);
    ok(R.toastsAfterRepeat===1,'同一個錯再發生：不再重複跳',R.toastsAfterRepeat);
    ok(!!R.lastAfterOk&&R.toastsAfterOk===1&&R.errCleared==='','存成功：記下「上一次」、沒有紅字、錯誤記號清掉',{last:R.lastAfterOk,n:R.toastsAfterOk,err:R.errCleared});
  }

  /* ===== [6] 負向更正:UPS 把運費改低 / Zone 改低,客戶收過的要退,不收稽核費 ===== */
  console.log('\n[6] 負向更正');
  {
    const T='TNEG1';
    const L=(cat,det,cls,code,desc,net,ent,bil,bwt,zone)=>['2026-07-18','INV1','A1','2026-07-10',T,T,ent==null?'':ent,bil==null?'':bil,bwt||'','',zone||'008',cat,det,cls,code,desc,net.toFixed(2),'20x12x8',''];
    const acc=accOf({'AHS Dimension':6.08,'Residential Surcharge':2.60});
    /* 運費改低:出貨 15 磅,更正改成 10 磅、運費退 2.50 */
    const rowsScc=[L('SHP','ISS','FRT','003','Ground Commercial',10.22,5,15),
      L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.45),
      L('ADJ','SCC','FRT','003','Shipping Charge Correction Ground',-2.50,5,10,'09'),
      L('ADJ','SCC','FSC','FSC','Shipping Charge Correction Fuel Surcharge',-0.60)];
    const A=inPage(runRecon,{tables:TABLES,acc,csv:csvOf(rowsScc),tpl:tplOf([T],{'Base Rate':14.31,'Fuel Surcharge':3.43,'Service Fee':0.20},{wt:15,amt:17.94})});
    const ov=A.items.filter(x=>x.kind==='over'&&x.charge==='Shipping Charge Correction');
    const want=Number((A.rep['Base Rate']-14.31).toFixed(2));
    ok(want<0,'重算的最後運費低於客戶收的 14.31（差 '+want+'）',{rep:A.rep['Base Rate']});
    ok(ov.length===1&&near(ov[0].amt,want)&&near(ov[0].billed,14.31),'開一列「多收」= 最後運費 − 已收（負數）',ov);
    ok(ov.length===1&&ov[0].fuel<-0.004&&near(ov[0].fuel,Math.round(want*24)/100),'燃油跟著退',ov);
    ok(!A.items.some(x=>x.kind==='audit'),'退錢的更正不收稽核費',A.items);
    ok(!A.items.some(x=>x.charge==='Base Rate'),'計費重差額那一列不開（這單有更正）',A.items);
    /* Zone 改低:費率表各 Zone 不同(每 Zone 差 0.50),出貨 Zone 8、更正成 Zone 6 */
    const zTable=svc=>({service:svc, residential:String(svc==='Ground Residential'),
      columns:['Weight',...ZONES.map(z=>'Zone '+z)],
      rows:Array.from({length:150},(_,i)=>{const w=i+1; return [String(w),...ZONES.map(z=>(rateAt(w)+(z-2)*0.5).toFixed(2))];})});
    const rowsZone=[L('SHP','ISS','FRT','003','Ground Commercial',12.00,10,10,'','008'),
      L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.88),
      L('ADJ','ZONE','FRT','003','Zone Adjustment',-1.20,10,10,'','006'),
      L('ADJ','ZONE','FSC','FSC','Zone Adjustment Fuel Surcharge',-0.29)];
    const Z=inPage(runRecon,{tables:[zTable('Ground Commercial'),zTable('Ground Residential')],acc,csv:csvOf(rowsZone),
      tpl:tplOf([T],{'Base Rate':11.50,'Fuel Surcharge':2.76,'Service Fee':0.20},{wt:10,zone:'8',amt:14.46})});
    const rf=Z.items.find(x=>x.kind==='refund'&&x.charge==='Base Rate'), zr=Z.items.find(x=>x.kind==='zone'&&x.charge==='Base Rate');
    ok(near(Z.rep['Base Rate'],rateAt(Z.bw)+2.0),'重算照更正後的 Zone 6 算運費（Zone 6 ＝ 表價 +2.00）',{rep:Z.rep['Base Rate'],bw:Z.bw,want:rateAt(Z.bw)+2.0});
    ok(rf&&near(rf.amt,-11.50)&&zr&&near(zr.amt,Z.rep['Base Rate']),'Zone 改低：退原收的 11.50、照 Zone 6 補 '+(rateAt(Z.bw)+2.0).toFixed(2)+'，淨額為負',{rf,zr});
    ok(!Z.items.some(x=>x.kind==='audit'),'Zone 改低不收稽核費',Z.items);
  }

  /* ===== [7] 計價丟出例外:那一單不重算、要講出來,不能悄悄變成「重算 0、全部漏收」 ===== */
  console.log('\n[7] 計價例外');
  {
    const L=(trk,cat,det,cls,code,desc,net,ent,bil)=>['2026-07-18','INV1','A1','2026-07-10',trk,trk,ent==null?'':ent,bil==null?'':bil,'','','008',cat,det,cls,code,desc,net.toFixed(2),'',''];
    const rows=[L('TER1','SHP','ISS','FRT','003','Ground Commercial',12.00,10,10),L('TER1','SHP','ISS','FSC','FSC','Fuel Surcharge',2.88),
                L('TER2','SHP','ISS','FRT','003','Ground Commercial',12.00,10,10),L('TER2','SHP','ISS','FSC','FSC','Fuel Surcharge',2.88)];
    const acc=accOf({'AHS Dimension':6.08,'AHS Weight':6.08,'Large Package':57.20,'DAS Commercial':1.35,'Residential Surcharge':2.60});
    const chg={'Base Rate':11.50,'Fuel Surcharge':2.76};
    const tpl=[{ln:2,order:'K1',trks:['TER1'],cus:'CG',amt:14.26,src:'TMS',zone:'8',chan:'Ground',chg},
               {ln:3,order:'K2',trks:['TER2'],cus:'CG',amt:14.26,src:'TMS',zone:'8',chan:'Ground',chg}];
    const E=inPage(function(P){
      setMe({id:'u1',user:'s',name:'S',role:'admin'}); cfgPush=async()=>true;
      const raw=JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      raw.customers=[{code:'CG',name:'Demo',level:'L1'}];
      raw.rate_levels={active:'L1', list:[{id:'L1', name:'JL'}], cfg:{}};
      raw.base_rate_tables=P.tables;
      raw.accessorial_rate_table=Object.assign({},raw.accessorial_rate_table,P.acc);
      raw.global_rules.fuel_percent='24';
      raw.global_rules.scc_audit_fee='1.65';
      applyConfig(JSON.stringify(raw),'t.json',false);
      ROWS=ingest(P.csv).rows; SHIPS=shipmentsOf(ROWS);
      const orig=priceShipment;
      RATED=SHIPS.map(x=>orig(CFG,x));
      priceShipment=function(cfg,s){ if(String(s.tracking)===P.bad) throw new Error('boom '+P.bad); return orig(cfg,s); };
      let res; try{ res=reconRun(P.tpl); } finally{ priceShipment=orig; }
      const pick=o=>({order:o.order, block:o.block, rep:o.rep, gap:o.gap, pgap:o.pgap, cost:o.cost, err:o.priceErr||''});
      return {orders:(res.orders||[]).map(pick), priceErrs:res.priceErrs||[],
        cus:(res.cus||[]).map(a=>({code:a.code, orders:a.orders, errs:a.errs, rep:a.rep, gap:a.gap, pgap:a.pgap, amt:a.amt})),
        tot:{rep:res.tot.rep, gap:res.tot.gap, pgap:res.tot.pgap, blocked:res.tot.blocked, orders:res.tot.orders},
        chg:(res.chg||[]).map(c=>({name:c.name, rep:c.rep, ups:c.ups, billed:c.billed})),
        items:((res.rebill&&res.rebill.items)||[]).map(x=>({order:x.order, charge:x.charge, amt:x.amt}))};
    },{tables:TABLES,acc,csv:csvOf(rows),tpl,bad:'TER2'});
    const k1=E.orders.find(o=>o.order==='K1')||{}, k2=E.orders.find(o=>o.order==='K2')||{};
    ok(k1.block===''&&k1.rep>0,'沒出錯的那一單照常重算',k1);
    ok(k2.block==='err'&&k2.rep===null&&k2.gap===null&&k2.pgap===null&&/boom TER2/.test(k2.err),'出錯的那一單:標 err、重算與兩個差異留空、訊息記著',k2);
    ok(E.priceErrs.length===1&&E.priceErrs[0].trk==='TER2'&&E.priceErrs[0].order==='K2','結果帶著出錯清單(追蹤號、單號、訊息)',E.priceErrs);
    const c=E.cus[0]||{};
    ok(c.orders===2&&c.errs===1&&near(c.rep,k1.rep)&&near(c.gap,k1.rep-k1.cost)&&near(c.pgap,14.26-k1.rep),'客戶層的重算與差異只照算得出來的那一單',c);
    ok(E.tot.blocked===1&&near(E.tot.rep,k1.rep)&&near(E.tot.gap,k1.rep-k1.cost),'合計:出錯的單算「擋下來」,重算只加另一單',E.tot);
    const br=E.chg.find(x=>x.name==='Base Rate')||{};
    ok(near(br.ups,12.00)&&near(br.billed,11.50),'逐項表三邊都只有沒出錯的那一單(UPS 12.00,不是 24.00)',br);
    ok(!E.items.some(x=>x.order==='K2'),'出錯的單不進補收清單',E.items);
    /* 畫面:擋下來的那一塊要講出哪幾筆、什麼訊息(設定、帳單、貨件都還是上一段留下的)。 */
    const banner=inPage(function(P){
      try{
        const orig=priceShipment;
        priceShipment=function(cfg,s){ if(String(s.tracking)===P.bad) throw new Error('boom '+P.bad); return orig(cfg,s); };
        let res; try{ res=reconRun(P.tpl); } finally{ priceShipment=orig; }
        RECON={res, list:P.tpl, src:'TMS'}; RECON_VIEW='res';
        renderRecon();
        const w=document.querySelector('#reconWarn');
        return {hidden:w.hidden, text:w.textContent};
      }catch(e){ return {err:String((e&&e.stack)||e).slice(0,300)}; }
    },{tpl,bad:'TER2'});
    ok(!banner.err&&!banner.hidden&&/hit an error while pricing/.test(banner.text)&&/TER2/.test(banner.text)&&/boom TER2/.test(banner.text),'畫面上講出來:哪幾筆、什麼訊息',banner);
  }

  /* ===== [8] Void:UPS 開了又整筆沖掉,淨額 0 —— 這一件沒有走,不向客戶計價 ===== */
  console.log('\n[8] Void 沖銷');
  {
    const T='TVD1';
    const L=(cat,det,cls,code,desc,net,ent,bil)=>['2026-07-18','INV1','A1','2026-07-10',T,T,ent==null?'':ent,bil==null?'':bil,'','','008',cat,det,cls,code,desc,net.toFixed(2),'',''];
    const acc=accOf({'AHS Dimension':6.08,'AHS Weight':6.08,'Large Package':57.20,'DAS Commercial':1.35,'Residential Surcharge':2.60});
    const chg={'Base Rate':11.50,'Fuel Surcharge':2.76};
    const full=[L('SHP','ISS','FRT','003','Ground Commercial',12.00,10,10),L('SHP','ISS','FSC','FSC','Fuel Surcharge',2.88),
                L('ADJ','VOD','FRT','003','Void Shipment',-12.00,10,10),L('ADJ','VOD','FSC','FSC','Void Shipment Fuel Surcharge',-2.88)];
    const V=inPage(runRecon,{tables:TABLES,acc,csv:csvOf(full),tpl:tplOf([T],chg,{wt:10,amt:14.26})});
    ok(V.mainBase===0&&!(V.rep['Base Rate']>0)&&!(V.rep['Fuel Surcharge']>0),'整筆沖銷、淨額 0:運費與燃油都不計價',{base:V.mainBase,rep:V.rep});
    ok(near(V.cost,0),'UPS 那一側 0',V.cost);
    ok(!V.items.some(x=>x.amt>0.004),'沒有任何一列補收(UPS 一毛都沒收)',V.items);
    /* 部分沖銷(淨額不為零)照原價計。 */
    const part=full.slice(0,3);
    const Pp=inPage(runRecon,{tables:TABLES,acc,csv:csvOf(part),tpl:tplOf([T],chg,{wt:10,amt:14.26})});
    ok(near(Pp.mainBase,rateAt(10)),'只沖掉一部分、淨額不為零:仍照原價計',{base:Pp.mainBase,want:rateAt(10)});
  }

  console.log('\n── '+pass+' pass / '+fail+' fail ──');
  process.exit(fail?1:0);
}, 900);
