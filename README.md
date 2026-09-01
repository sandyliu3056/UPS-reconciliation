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
npm test             # 三套一起跑,69 項
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
| 側欄／表頭對比 | 六組配色只有兩組過 AA | 六組全過,最低 4.81:1 |

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

**側欄與表頭改成淺底深字** — 這一項是修 bug。原本我拿一層材質疊 `overlay`
在側欄、標題列和表頭上,而 overlay 遇到深色底會把它整個提亮:晴空的深藍
`#1b5390` 被拉成 `#339df4`、紫藤 `#6a4a92` 被拉成 `#c98cf4`,底色亮到跟本來就
淺的 `--tab` 字幾乎同一階,對比只剩 1.7:1;草綠更慘,幾乎看不見。

現在改成用配色自己的主色調出一階淺底(30%),字用主色摻正文色壓深(50%),
表頭再各深一階。六組配色最低 4.81:1(草綠側欄)與 4.85:1(草綠表頭),全過 AA。
`test/test-contrast.js` 就是驗這件事 —— `ink.css` 裡的 `color-mix` 比例改了
就重跑,那幾個數字是配色能不能用的底線。

順帶一提:原本的深側欄配 `--tab` 字,六組裡只有棕金和晴空過 4.5,草綠只有
3.03,再乘上 `.nav button` 的 `opacity:.82` 會更低。淺底深字這一版是六組都過。

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

test/                      jsdom 回歸 + 六組配色對比驗算,共 69 項
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
