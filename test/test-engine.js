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

setTimeout(()=>{
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
    const exp=Number((rateAt(40)-rateAt(6)).toFixed(2));
    ok(A.bw===40,'合約計費重被 AHS 最低計費重拉到 40',A.bw);
    ok(wA.length===1&&near(wA[0].amt,exp),'運費短收 = 費率@40 − 費率@6 = '+exp,wA);
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

  console.log('\n── '+pass+' pass / '+fail+' fail ──');
  process.exit(fail?1:0);
}, 900);
