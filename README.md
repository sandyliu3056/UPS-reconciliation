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
npm test             # 兩套一起跑,76 項
```

也可以指定要驗哪一份:

```
node test/test-patch.js /path/to/UPS-reconciliation/index.html
node test/test-ink.js   /path/to/UPS-reconciliation/index.html
```

用 jsdom 載入真的頁面,不是假的 DOM 物件。除了功能,兩套都會比對元素清單有沒有
被改壞（表格 28、視窗 25、`.sketch` 57、i18n 標記 547)。

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

ESC 按下去是去按該視窗自己的 `.mx`,所以原本的收尾照跑,不是把它藏起來。
搜尋延後走事件捕捉階段,不碰任何一行既有的 `oninput` —— `#sysSearch` 這種在
render 裡每次重綁的也蓋不掉。排序只動畫面上的列,不碰金額,重畫後還原。

### 外觀

標題列右上角多一顆選單,五段:

```
不用手寫 → 手寫標題 → 手寫全部 → 手繪 → 水彩
```

預設水彩,選擇存在瀏覽器,和 Colour / Scene / Display size 同一個做法。

**字** — 英數內嵌 webfont(標題 Caveat、內文與側欄 Patrick Hand,皆 SIL OFL),
中文靠系統本來就有的手札體／手寫體／標楷體,兩邊都沒有就落回黑體,只有英數是
手寫,版面不會壞。表格的 `.num` / `.mono` 與儀表板的大數字維持等寬 —— 手寫體的
數字對不齊,帳就看不出來。

**手繪** — 抖線塗層本來就寫在 `.sketch` 裡,是 `applyBrand` 把 `--wob` 設成
`none` 關掉的。這裡把它打開,57 個面板、16 條細框一次全回來,markup 一行不改。
另加紙紋、手繪方框、手繪底線。

**水彩** — 再上一層:有纖維方向的紙、整面罩一層 multiply 的紙(所以文字也在紙
上,不是紙在底下)、顏料溢出邊線的兩塊平色、沾了水的筆(位移 1.4→3.2 再加
0.4px 模糊)、筆刷底線。材質全是灰階,顏色一律走 `color-mix(var(--...))`,
六組配色都跟得上。

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
  ink-embedded 用 ink.css  同上,但字型內嵌成 data URI
  ink.js                   五段開關、濕筆濾鏡、整面的紙

test/                      jsdom 回歸,共 76 項
preview/paint-preview.html 關／手繪／水彩三段對照,可直接開
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
- **手寫體的字級補償**(內文 14→14.5px、段落標題 14.5→17px)是照字面偏小推的,
  太大就改 `ink.css` 第一節的數字。
- **斑馬紋** 修好之後每張表都會有淺淡的隔行色。不要就刪掉 `ui-patch.css` 裡標了
  「可留可刪」的那一段。
- 這個 repo 沒有 service worker,所以沒有 BUILD 字串要動。GitHub Pages 偶爾不會
  自己重新發布,推上去沒變的話到 Actions 重跑一次。
