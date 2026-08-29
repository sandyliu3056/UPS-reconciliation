# 流程與版面規劃

這份文件講的是「東西擺在哪裡」，不是「怎麼算」。計價引擎、匯出欄位、登入方式
都不在範圍內 —— README 已經寫明費率規則的任何修改必須同時做在報價工具上，
這份規劃一步都不跨過去。

## 問題

README 把一期怎麼跑寫得很清楚，只有五個動作：匯入帳單 → 下載範本 →
從 WMS/TMS 填好 → 匯入 → 讀兩張表。這五個動作落在版面上是這樣：

| 動作 | 現在在哪裡 | 類別 |
| --- | --- | --- |
| 匯入 UPS 帳單、重算 | Import Files | 每月 |
| 下載範本 | Reconcile → 子分頁 Reconciliation | 每月 |
| 匯入填好的範本 | 同上 | 每月 |
| 讀 By customer / By charge、匯出 | 同上，往下捲 | 每月 |
| 客戶名單與費率層級 | Reconcile → 子分頁 Customers（預設） | 設一次 |
| 費用代碼對照 | 同上 | 設一次 |
| 費率設定檔、層級、住商判定、燃油底 | Settings | 設一次 |
| 燃油百分比、附加費費率 | Surcharge Setup | 設一次／偶爾 |
| DIM、尺寸規則 | Size Rules | 設一次 |
| 渠道、Demand | Channels、Demand Surcharge | 設一次 |
| 查歷史、查代碼 | Invoice History、Code Lookup | 查詢 |

每個月真正要動的只有前四列。它們一個在第一個分頁，三個在第二個分頁的第二個
子分頁裡 —— 而第二個分頁預設打開的是 Customers，一份設好就不會再改的名單。

### 看不見的相依

兩顆並排的按鈕，前提條件不一樣，而且都不寫在畫面上：

- `reconTemplate()`（`index.html:10192`）只需要客戶名單。名單是空的照樣下載，
  只是靜靜地少了那個下拉驗證。
- `reconImport()`（`index.html:10529`）需要 `CFG` 和 `SHIPS`。缺任何一個，
  按鈕仍然是亮的，按下去才用一行紅字說明。

### 還有四件事

- **首頁是空的。** `renderDashboard()`（`index.html:11894`）第一行就是
  `const body=$("#dashBody"); if(!body) return;`，而這個節點在這個 repo 的
  任何一次 commit 裡都沒出現過。整套儀表板（期別挑選、KPI、趨勢、跨期總攬）
  和 166 行 `#p-dash` 樣式都是完整的，是從報價工具帶過來、從沒接上過。
- **就緒提示只講一件事。** `renderReady()` 只在沒有費率的時候說話，而且只在
  Import Files 那一頁。
- **客戶沒指定層級不會被提醒。** `reconCfgFor("")` 直接回傳現在使用中的 `CFG`。
  層級「被刪掉」有警告（`lostLevel`），層級「從沒設過」沒有。
- **對帳結果不落地。** 帳單有存（IndexedDB `ups_recon_hist`），`RECON`、`SHIPS`、
  `RATED` 只在記憶體（`index.html:6753`）。重新整理就要重匯一次填好的範本 ——
  而 README 自己就寫了 GitHub Pages 會快取 HTML 十分鐘，強制重整是日常動作。

## 模型：一個月四個階段

| 階段 | 做什麼 | 頻率 | 做完的判準 |
| --- | --- | --- | --- |
| 0 · 設定 | 費率設定檔、層級、附加費、尺寸、渠道、Demand、燃油、住商判定、客戶名單、費用代碼 | 設一次 | `CFG` 存在且客戶都有層級 |
| 1 · 載入 | 匯入這期帳單（或從歷史挑一期），重算 | 每月 | `SHIPS` / `RATED` 有東西 |
| 2 · 比對 | 下載範本 → 填 → 匯入 → 修被退回的列 | 每月 | `RECON.res` 有東西且 `issues` 是空的 |
| 3 · 讀數 | 看兩張表、匯出 | 每月 | 報表送出去了 |

階段 3 不需要自己的分頁 —— 結果就長在階段 2 底下，匯入完往下看就是。
硬拆成第三步只是多一次點擊。

## 版面：三層

### L0 期別列

一條橫列，插在標題列（`index.html:922`）和分頁列（`923`）之間，每一頁都看得見。
它回答三個問題：現在跑的是哪一期、用哪一層費率、走到哪一步了。

```
INVOICE 0000123456 · billed 2026-07-25 │ RATES Level A · loaded 2026-06-02
✓ 帳單 1,284 行    ○ 範本 尚未匯入    ○ 結果 —              [ Export ▾ ]
```

三顆狀態燈可以點，點下去就跳到那一步。沒有期別的時候整條列縮成一句
`No period loaded — pick one on Home`，後面接一顆到首頁的按鈕 ——
空狀態也是狀態，不要讓那一條變成空白。

### L1 分頁重編

十顆平鋪的按鈕變成三組，中間用分隔線斷開：

```
Home │ 1 Invoice │ 2 Reconcile ┊ History │ Codes ┊ Setup │ Admin
```

`Import Files` 改叫 `1 Invoice`、`Reconcile` 改叫 `2 Reconcile`，是因為這兩件事
有先後、而且順序是硬的（第二步需要第一步的產物）。其餘分頁沒有順序，就不編號。

Surcharge Setup、Size Rules、Channels、Demand、Settings 收成一個 `Setup` 分頁，
左側直排導覽；Customers 和 Charge codes 從 `#p-cus` 一起搬進去 —— 它們是設定，
不該是對帳分頁的預設子頁。每個 section 原封搬進去，內部版面不用改。

### L2 每一頁裡的順序

同一條規則貫穿三頁：**先講狀態，再給摘要，最後才是明細**。
Import Files 已經做對了（數字磚在表之前），對帳頁沒有。

- **Home** — 現成的 `renderDashboard()`，只多一張「接著做」的卡片。
  時鐘與場景卡從第一個分頁搬到這裡（`sceneShow(p==="dash")`）。
- **1 Invoice** — 檔案卡 → 就緒清單 → This Invoice → Repricing → 一顆指向第 2 步的按鈕。
- **2 Reconcile** — 範本卡（匯入成功後收成一行）→ 被退回的列 → **新增四格摘要磚**
  （訂單 / 向客戶收 / UPS 收 / 毛利與毛利率，數字全部來自現成的 `r.tot`）
  → By customer → By charge（標題寫出目前的 `RECON_SCOPE`，讓「點客戶會縮範圍」看得出來）。
- **Setup** — 左側八項，右側是原本的卡片，外加一張就緒檢查。

## 什麼時候該說什麼

這張表比版面本身重要 —— 上面談的是舒不舒服，下面這幾條是數字對不對。

| 情況 | 判斷依據 | 現在 | 提案 |
| --- | --- | --- | --- |
| 沒有費率設定 | `!CFG` | Files 頁一則警告；對帳兩顆按鈕照樣亮 | 期別列 `Rates ✗`；Process 與 Import 都停用並寫出原因與去處 |
| 有費率、沒帳單 | `!SHIPS?.length` | 按下去才說「請先匯入這一期的 UPS 帳單」 | Download template 保持可用（它不需要帳單），Import 停用並寫明缺什麼 |
| 客戶名單是空的 | `cusReg().length===0` | 範本照樣下載，靜靜地沒有下拉驗證 | 下載前就說明，並給到 Setup 的連結 |
| 客戶沒指定層級 | `reconCfgFor("")` 退回 `CFG` | 沒有任何提示，欄位顯示「—」 | 對帳前就列出是哪幾個客戶；欄位標成警示色 |
| 客戶指到已刪掉的層級 | `lostLevel` | 對帳後一則警告 | 保留，另外在期別列點一下 |
| 追蹤號在帳單上找不到 | `unmatched` | 對帳後一則警告；合計列顯示 `found / pkgs` | 保留，並在摘要磚標出那幾件的金額 |
| 有列被退回 | `RECON.issues.length` | 整份不匯入，逐行列出原因 | 保留；期別列第二顆燈轉成警示色 |
| 重新整理之後 | `RECON` 只在記憶體 | 結果消失，要重匯一次 | 見「需要決定」第 2 題 |

## 落地順序

刻意排成前面小、後面大。前兩次做完就解決了大部分「看不出現在在哪裡」的問題。

### 1 · 期別列與事前 gating

- 在 `index.html:922` 與 `923` 之間插入 `.periodbar`。
- 新增 `renderPeriodBar()`，狀態全部從既有全域推出來：`CFG` / `SHIPS`+`RATED` / `RECON`。
- 在 `renderSummary()`、`renderRate()`、`renderRecon()`、`showTab()` 結尾各呼叫一次。
- `bindRecon()`（`index.html:10555`）依條件設 `#bReconImp.disabled`，原因寫進卡片。

驗收：用一個全新帳號登入 → 期別列說「沒有費率」；載入設定檔 → 改說「沒有帳單」；
跑完帳單 → Import 亮起、第一顆燈轉綠。

### 2 · 接上首頁

- 加 `<section class="page" id="p-dash"><div id="dashBody"></div></section>`。
- 分頁列最前面加 `data-p="dash"`；`TAB_KEY` 預設值改成 `dash`。
- `sceneShow(p==="dash")`。

風險：這批程式從沒在這個 fork 執行過。`dashAgg()` 會走 `reportRows()`、
`REPORT_COLS`、`ACCT_LINES`，全部都在，但要實跑一遍才算數 —— 空帳號、
有歷史沒載入、載入後三種狀態各測一次。數字口徑也要對過：儀表板是帳單層級的
（UPS 收 vs 重算），對帳是客戶層級的（向客戶收 vs UPS 收），不是同一個問題的答案。

### 3 · 對帳頁的摘要與順序

- `#reconResCard` 之前插一組 `.tiles`，四個數字全部來自 `r.tot`。
- By charge 標題接上 `RECON_SCOPE`。
- 匯入成功後把範本卡收成一行。

驗收：摘要磚的四個數字要和表格 tfoot 的合計逐字相同。

### 4 · 分頁重編

- 五個設定 section 併進 `#p-setup`，左側 rail 用現成的 `.subtabs` 樣式改直排。
- Customers 與 Charge codes 搬進去，`#p-cus` 更名 `#p-recon`，子分頁拿掉。
- 分頁按鈕與 `data-i18n` 鍵一起更新。

**坑：** `showTab()` 會把目前分頁寫進 `localStorage`（`TAB_KEY`）。改了 `data-p`
之後，所有人瀏覽器裡存的還是舊值（`files`、`cus`、`rules`…），下次開站會找不到
對應的 section，畫面一片空白。`showTab()` 開頭要加一張舊值對照表，認不得的
一律退回首頁。

## 需要決定

1. **首頁要不要接？** 那套儀表板回答的是「UPS 收的和依費率算的差多少」，
   不是「這個月對每個客戶賺多少」。建議接，因為它同時是最自然的「挑一期來跑」
   入口，而那是每個月的第一個動作。若擔心兩個口徑讓人看混，就只留期別挑選，
   把 KPI 那幾塊藏掉。
2. **對帳結果要不要存下來？** 最省事的做法是把 `RECON.list` 連同帳單期號寫進
   同一個 IndexedDB，開站時自動接回去。這是整份規劃裡唯一會動到資料層的事。
3. **分頁要重編，還是只重排順序？** 改動 4 是唯一會讓熟手需要重新找東西的。
   折衷做法是保留十顆按鈕、只加分隔線與編號 —— L0 和 L2 的好處一樣拿得到。

## 不碰的東西

- 計價引擎。費率規則、附加費、帳單解析的任何修改都必須同時做在報價工具上。
- 匯出的欄位。三張表的欄位和順序不動，那是給外面看的。
- 登入方式。`authMode` 維持現狀。
- 新的相依套件。整個工具就是一份 `index.html`，這件事本身有價值。
