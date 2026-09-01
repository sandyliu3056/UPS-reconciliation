# UPS Reconciliation — UI 補強包

給 `sandyliu3056/UPS-reconciliation` 的介面補強。兩部分:一是操作上確實少掉的
東西,二是手寫字與繪畫感的外觀。全部後掛,既有的繫結一行都不改,拆得掉。

以 GitHub `main` 上的 `index.html`(904,229 字元)為基準。

---

## 一分鐘部署

把 `deploy/` 裡的三個檔複製到 repo 根目錄,覆蓋原本的 `index.html`:

```
cp deploy/index.html deploy/caveat.woff2 deploy/patrick-hand.woff2  /path/to/UPS-reconciliation/
cd /path/to/UPS-reconciliation
git add -A && git commit -m "UI: ESC/搜尋/排序/凍結首欄 + 手寫字與繪畫感" && git push
```

`deploy/index.html` 已經套好,是從 GitHub main 建的。

**本機版本比 GitHub 新就不要用這個檔** —— 改走下面的套用腳本,它動的是你手上
那一份。

---

## 套用到你自己的 index.html

```
cd /path/to/UPS-reconciliation
python3 /path/to/pack/apply.py                 # 套用
python3 /path/to/pack/apply.py --check         # 只看狀態
python3 /path/to/pack/apply.py --remove        # 拆掉,回到原樣
python3 /path/to/pack/apply.py --embed-fonts   # 字型內嵌成單檔
```

腳本的規矩:

- 動任何一個字之前先備份成 `index.html.bak-YYYYmmdd-HHMMSS`
- 不做整份字串取代。只在第一個 `</style>` 前、最後一個 `</script>` 前插入,
  每一段用 `/*!ui-pack:名稱:start*/` 與 `:end` 夾住
- 重複執行不會疊第二份,已套過的會先移掉再套
- `--remove` 之後與原檔逐位元組相同（已驗證）
- 插入前檢查來源裡沒有 `</script` 或 `</style` 的字面標籤 —— 這一項是踩過坑
  才加的:註解裡寫到那個標籤會把區塊提早關掉,後面幾千字全被當成 markup 解析,
  靜態檢查看不出來

## 驗

```
npm install          # jsdom
npm test             # 八套一起跑,172 項
```

也可以指定要驗哪一份:

```
node test/test-patch.js /path/to/UPS-reconciliation/index.html
node test/test-ink.js   /path/to/UPS-reconciliation/index.html
```

用 jsdom 載入真的頁面,不是假的 DOM 物件。除了功能,也會比對元素清單有沒有被改壞
（表格 28、視窗 25、`.sketch` 57、i18n 標記 547)。

`test-vars.js` 與 `test-boot.js` 是踩過坑才加的。一個 `var(--x)` 只要沒有人定義
`--x`,那一整條宣告在計算時就是**無效的** —— 瀏覽器不會報錯,也不會用 `var()` 的
備援值,它直接把那個屬性丟掉。`--bodyfam` 的值裡含了一個沒定義的 `var()`,
整個手寫體就這樣安靜地消失,而當時前面五支測試全過:它們測的是「函式回傳什麼」,
沒有人把整份檔案真的跑起來看。

- `test-vars.js` 掃全檔,列出所有引用了卻沒人定義、也沒寫備援的 `var(--x)`
- `test-boot.js` 用 `runScripts:'dangerously'` 把整份 index.html 開起來,
  讀 `--titlefam` / `--bodyfam` 的實際值,只要裡面還殘留 `var(--` 就算失敗

---

## 內容

### 功能

| 項目 | 原本 | 之後 |
|---|---|---|
| ESC 關窗 | 25 個視窗只有 2 個吃 ESC | 全部;疊窗時只關最上層 |
| 搜尋 | 10 個搜尋框每敲一字整張表重畫 | 停手 180ms 才畫,Enter 不等 |
| 表頭排序 | 沒有 | 4 張看數字的表可排,第三下回原順序 |
| 首欄凍結 | 沒有 | 6 張寬表往右捲時第一欄釘住 |
| 斑馬紋 | 規則存在但兩色相同,等於沒畫 | 修好（可刪的獨立區塊) |
| 側欄／表頭對比 | 六組配色只有兩組過 AA | 六組全過 |
| 流程圖線寬 | 十個站用九種線寬 | 收成三階 |
| 04 費率頁 | 七張面板疊成一條長捲軸 | 拆成四個子頁 |
| 01 › 3. System | 「Enable / Disable」兩張表 | 收掉;設定檔有殘留停用項目時只提示,不自動清 |

ESC 按下去是去按該視窗自己的 `.mx`,所以原本的收尾照跑,不是把它藏起來。
搜尋延後走事件捕捉階段,不碰任何一行既有的 `oninput` —— `#sysSearch` 這種在
render 裡每次重綁的也蓋不掉。排序只動畫面上的列,不碰金額,重畫後還原。

### 外觀

一個外觀,沒有開關。掛上 `html.ink` 就全部生效,拆掉整包就回到原樣。

**字** — 英數內嵌 webfont(標題 Caveat、內文與側欄 Patrick Hand,皆 SIL OFL),
中文靠系統本來就有的手札體／手寫體／標楷體,兩邊都沒有就落回黑體,只有英數是
手寫,版面不會壞。表格的 `.num` / `.mono` 與儀表板的大數字維持等寬 —— 手寫體的
數字對不齊,帳就看不出來。

**筆觸** — 抖線塗層本來就寫在 `.sketch` 裡,是 `applyBrand` 把 `--wob` 設成
`none` 關掉的。這裡把它打開,57 個面板、16 條細框一次全回來,markup 一行不改,
用的是沾了水的筆(位移 1.4→3.2 再加 0.4px 模糊)。另有有纖維方向的紙、整面罩
一層 multiply 的紙(所以文字也在紙上,不是紙在底下)、顏料溢出邊線的兩塊平色、
筆刷底線、手繪方框。材質全是灰階,顏色一律走 `color-mix(var(--...))`。

### 04 渠道與附加費費率分層

這一頁本來是七張面板疊成一條長捲軸:運費表、燃油、附加費、DIM 除數、尺寸門檻、
Demand 費率。要改燃油得先捲過運費表,要看門檻得捲到最底。拆成四個子頁:

| | 涵蓋 |
|---|---|
| 1. Base Rates | 運費表 + 燃油 |
| 2. Surcharges | 附加費費率 |
| 3. Size Rules | DIM 除數 + 尺寸門檻 |
| 4. Demand | Demand 費率 |

頁首那張(說明這一頁屬於右上角選的層級,帶預覽鈕)四個子頁都看得到。

用的是頁面本來就有的那條編號列 —— 01 有三個子頁、03 有三個,04 之前只有一個。
`SET_GROUPS` / `RATE_PAGE` / `RATE_TABS` / `RATE_PER_LEVEL` 都是同一個 script
最外層的變數,直接補進去;`showSetTab` 和那條列的點擊處理本來就是通用的,一個字
都沒改。面板不搬家,只是把該露的露出來,認面板靠 h3 底下的 `data-i18n` key,
不是靠第幾個 —— 之後在中間插一張卡也不會錯位。

順帶修一件事:「Demand 費率」和「尺寸門檻」原本是包在「DIM 除數」那張卡**裡面**
的(markup 少了一個結束標籤)。Demand 跟 DIM 除數沒有關係,搬出來成為
`p-ratefill` 的直接子層 —— 不搬的話,藏 DIM 除數會連著把它們一起藏掉。

### 收掉「Enable / Disable」

01 › 3. System 那張卡兩張表。看了程式,兩張表行為不一樣:

- **渠道停用只影響畫面。** `builtin_service_disabled` 被讀的地方是 03 渠道表、04 費率頁、
  這張卡、預覽 —— `priceShipment` / `lookupBaseRate` / `readConfig` 一次都沒讀它。
  停用一條渠道,帳單上那條渠道的貨照樣查表、照樣算。卡上那句「A disabled item is
  not priced」對渠道不成立。
- **附加費停用會真的收 0。** `accLookup()` 第一行:在 `accessorial_disabled` 裡就回 0,
  而且不列進「缺費率」。

兩個都收掉。連帶把 03 新增渠道表單上那顆「Enable this channel」也收了 —— 它勾掉時
會把新渠道寫進一個再也看不到的停用清單。

**資料不動。** 設定檔裡已經有的停用項目照舊生效 —— 那是碰到金額的東西,不能因為
收了一張卡就自己清掉。但也不能讓它躲起來:設定檔裡若還有停用中的項目,3. System
那一頁會出現一行提示(哪幾類、各幾個、名字)與一顆「全部恢復」,按了才清,
清了才重算,順序照原本 `bindOnOff` 那一串(同步共用區 → 重讀設定 → 標髒 → 存檔 →
重畫 → 重算)。設定檔乾淨的話那一行根本不會出現。

### 首頁流程圖

十個站的插畫重畫。原本每個站各用各的線寬 —— 1.1 / 1.2 / 1.3 / 1.4 / 1.5 / 1.6 /
1.8 / 2 / 2.2 / 2.4,十個圖擺在一起像十套圖示。收成三階:外輪廓 2.2、內部結構
1.5、細節 1.05,另加綠勾與虛線路線的 2.1、膠帶色帶的 3.4。全部給同一個光源,
右下一律同濃度的陰影面。地上的影子寬度跟著圖示走,不再是每站都 rx=24 ——
倉庫和圖釘本來就不一樣寬。

「運送中」原本那個形狀認不出來是什麼,改成側面的飛機。分組標題加了涵蓋範圍的
細線,哪幾站屬於哪一段用看的就知道。打勾從浮在半空的 ✓ 改成有底的圓形徽章 ——
原本那個勾沒有邊界,落在別站的插畫旁邊會分不清是誰的。路面底下墊一條淺色路肩,
細線就變成路。

做法上只換掉 `fmArt` 與 `fmGrpHeader` 兩支函式;徽章和路肩是等 `fmBuild` 畫完
之後就地改 DOM,不複製她那一百行 markup —— 之後那邊改了也不會打架。路肩是
`cloneNode` 出來的,線形永遠跟著路面走,沒有第二份 `d` 要維護。

### 側欄與表頭

**側欄與表頭改成淺底深字** — 這一項是修 bug。原本我拿一層材質疊 `overlay`
在側欄、標題列和表頭上,而 overlay 遇到深色底會把它整個提亮:晴空的深藍
`#1b5390` 被拉成 `#339df4`、紫藤 `#6a4a92` 被拉成 `#c98cf4`,底色亮到跟本來就
淺的 `--tab` 字幾乎同一階,對比只剩 1.7:1;草綠更慘,幾乎看不見。

現在的做法是:底色一個字都不動 —— 棕金還是那個棕、晴空還是深藍、紫藤還是
深紫。只做兩件事:字往白裡調 62%,並拿掉 `.nav button` 的 `opacity:.82`。

那一層 opacity 是隱形的殺手。原本 `--tab` 對 `--accent` 名目上草綠只有 3.03,
乘完剩 2.54,所以側欄的字幾乎看不見。

| 配色 | 原本(含 opacity) | 現在 |
|---|---|---|
| 草綠 | 2.54 | 4.69 |
| 奶茶 | 2.98 | 5.08 |
| 灰藍 | 3.17 | 5.90 |
| 紫藤 | 3.63 | 5.98 |
| 晴空 | 3.85 | 6.59 |
| 棕金 | 6.47 | 12.59 |

`test/test-contrast.js` 就是驗這件事 —— `ink.css` 裡的 `color-mix` 比例改了
就重跑,那幾個數字是配色能不能用的底線。

### 紙的顏色

罩在整個畫面上那一層紙原本是灰階的,`multiply` 下去會把彩度一起壓掉 ——
棕金的暖奶油被帶成灰米色,整頁看起來像蒙了一層灰。現在噪點只當遮罩,顏色吃
`var(--accent)`:棕金疊出來是咖啡,晴空是藍,草綠是綠,各自往自己的方向走,
不會全部變灰。

---

## 檔案

```
deploy/                    直接丟進 repo 根目錄
  index.html               已套好（連結字型版）
  caveat.woff2             51 KB
  patrick-hand.woff2       24 KB
  *-OFL.txt                兩支字型的授權

src/                       四段原始碼,apply.py 用這裡的
  ui-patch.css / .js       ESC、搜尋、排序、凍結首欄、斑馬紋
  ink-linked.css           手寫與繪畫感（字型連結外部檔,預設)
  ink.css                  同上,但字型內嵌成 data URI(--embed-fonts 用)
  ink.js                   掛上 html.ink、濕筆濾鏡、整面的紙
  fm.css / fm.js           首頁流程圖的精修
  tabs.js                  04 渠道與附加費費率分成四個子頁
  trim.css / trim.js       收掉 Enable / Disable 那張卡

test/                      八支,共 172 項
  test-patch.js            ESC / 搜尋 / 排序 / 凍結首欄
  test-ink.js              字體、筆觸、包住原本那兩支
  test-contrast.js         六組配色的側欄字對比
  test-fm.js               流程圖插畫(輸出當 XML 解析)
  test-tabs.js             04 分層
  test-trim.js             收掉 Enable/Disable 之後資料沒被動
  test-vars.js             孤兒 CSS 變數
  test-boot.js             把整份 index.html 真的跑起來
preview/theme-preview.html 六組配色切一輪,看側欄與表頭的字,可直接開
apply.py                   套用 / 移除 / 檢查
```

### 字型要連結還是內嵌

| | 連結（預設) | 內嵌（`--embed-fonts`) |
|---|---|---|
| `index.html` | +22 KB | +122 KB |
| 額外檔案 | 兩個 woff2 | 無 |
| 每次改版重下 | 只有 index.html | index.html 連字型一起 |
| 忘了 commit 字型 | 落回系統字體,不會壞 | 不會發生 |

`index.html` 改得勤就用連結版,字型會被瀏覽器長期快取。要單檔就 `--embed-fonts`。

---

## 幾件要自己看的

- **整面 multiply 那層** 會讓所有東西暗一點點,配上時鐘與場景的 canvas 動畫可能
  吃一點合成成本。覺得髒或覺得卡,`ink.css` 裡 `#inkPaper` 那一條刪掉,面板上的
  紙紋還在。
- **顏料溢出的顏色** 是照「棕金」那組調的。換到灰藍或草綠可能要改
  `color-mix` 的百分比。
- **手寫體的字級**(內文 15.5px、段落標題 19px、側欄 14.5px、表格 14.5px)已經
  比上一版各放大一階。還是覺得小就改 `ink.css` 第一節的數字。
- **側欄與內容區的分離**:淺側欄跟內容區底色只差一階(草綠最接近,對比 1.22),
  靠的是那條 2.5px 的 `--chrome-line`。覺得分不開就把 `--chrome` 的 30% 往上調,
  但每加一階字的對比就掉一點,調完記得跑 `test/test-contrast.js`。
- **斑馬紋** 修好之後每張表都會有淺淡的隔行色。不要就刪掉 `ui-patch.css` 裡標了
  「可留可刪」的那一段。
- 這個 repo 沒有 service worker,所以沒有 BUILD 字串要動。GitHub Pages 偶爾不會
  自己重新發布,推上去沒變的話到 Actions 重跑一次。
- 也部到 Vercel 的話,兩個 `.woff2` 一樣要 commit 進 repo,不然那邊也會落回
  系統字體。
