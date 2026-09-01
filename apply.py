#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
套用 / 移除 UI 補強包。

    python3 apply.py                     套用（連結字型檔,預設）
    python3 apply.py --embed-fonts       套用（字型內嵌成 data URI,單檔）
    python3 apply.py --remove            移除,回到原樣
    python3 apply.py --check             只檢查目前狀態,不動檔案
    python3 apply.py --index ../index.html

規矩:
  · 動任何一個字之前先備份成 index.html.bak-YYYYmmdd-HHMMSS
  · 不做整份字串取代 —— 只在第一個 </style> 前和最後一個 </script> 前插入,
    每一段都用 /*!ui-pack:...:start*/ 與 :end 夾住,所以移得乾淨
  · 重複執行不會疊第二份;已經套過會先移掉再套
  · 插入前檢查來源裡沒有 </script 或 </style —— 註解裡寫到那個字面標籤
    會把區塊提早關掉,後面全被當成 markup 解析
"""

import argparse, datetime, pathlib, re, shutil, sys

CSS_BLOCKS_LINKED = ["ui-patch.css", "ink-linked.css", "fm.css"]
CSS_BLOCKS_EMBED  = ["ui-patch.css", "ink.css", "fm.css"]
JS_BLOCKS         = ["ui-patch.js", "ink.js", "fm.js", "tabs.js"]
FONT_FILES        = ["caveat.woff2", "patrick-hand.woff2"]

MARK = re.compile(r"/\*!ui-pack:([A-Za-z0-9._-]+):start\*/.*?/\*!ui-pack:\1:end\*/\s*",
                  re.S)


def die(msg):
    print("✗ " + msg)
    sys.exit(1)


def ensure_nl(s):
    return s if s.endswith("\n") else s + "\n"


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


def installed(html):
    return sorted(set(m.group(1) for m in MARK.finditer(html)))


def strip(html):
    return MARK.sub("", html)


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--index", default="index.html", help="要改的 index.html")
    ap.add_argument("--src", default=None, help="src 資料夾（預設是這支腳本旁邊的 src）")
    ap.add_argument("--embed-fonts", action="store_true", help="字型內嵌,不用外部檔")
    ap.add_argument("--remove", action="store_true", help="移除補強包")
    ap.add_argument("--check", action="store_true", help="只看狀態")
    ap.add_argument("--no-backup", action="store_true", help="不備份（不建議）")
    a = ap.parse_args()

    here = pathlib.Path(__file__).resolve().parent
    src = pathlib.Path(a.src) if a.src else here / "src"
    idx = pathlib.Path(a.index)

    if not idx.exists():
        die(f"找不到 {idx} —— 用 --index 指到你的 index.html")

    html = read(idx)
    have = installed(html)

    print(f"檔案　{idx}　{len(html):,} 字元")
    print(f"狀態　{'已套用: ' + ', '.join(have) if have else '未套用'}")

    if a.check:
        return

    if a.remove:
        if not have:
            print("· 本來就沒有套,什麼都沒動。")
            return
        backup(idx, a.no_backup)
        out = strip(html)
        idx.write_text(out, encoding="utf-8")
        print(f"✓ 已移除 {len(have)} 段,檔案回到 {len(out):,} 字元")
        return

    css_names = CSS_BLOCKS_EMBED if a.embed_fonts else CSS_BLOCKS_LINKED
    need = css_names + JS_BLOCKS
    missing = [n for n in need if not (src / n).exists()]
    if missing:
        die("src 少了這些檔:" + ", ".join(missing))

    # 內容檢查:註解裡寫到 </script> 或 </style> 會把區塊提早關掉
    for n in need:
        s = read(src / n)
        bad = "</script" if n.endswith(".js") else "</style"
        if bad in s:
            die(f"{n} 裡面出現 {bad} —— 會把區塊提早關掉,先改掉再套")

    if have:
        print("· 已經套過,先移掉舊的再套新的。")
        html = strip(html)

    if "</style>" not in html:
        die("找不到 </style>")
    if "</script>" not in html:
        die("找不到 </script>")

    # 每一段自己就以換行結尾,這裡不再多補 —— 多補的空白移除時帶不走,
    # 拆掉之後檔案會和原檔差幾個位元組。
    css = "".join(ensure_nl(read(src / n)) for n in css_names)
    js = "".join(ensure_nl(read(src / n)) for n in JS_BLOCKS)

    i = html.index("</style>")
    html = html[:i] + css + html[i:]
    j = html.rindex("</script>")
    html = html[:j] + js + html[j:]

    backup(idx, a.no_backup)
    idx.write_text(html, encoding="utf-8")

    got = installed(html)
    print(f"✓ 已套用 {len(got)} 段:{', '.join(got)}")
    print(f"  檔案 {len(html):,} 字元")

    if not a.embed_fonts:
        root = idx.resolve().parent
        miss = [f for f in FONT_FILES if not (root / f).exists()]
        if miss:
            print("· 字型檔還沒放到 index.html 同一層:" + ", ".join(miss))
            print("  從 deploy/ 複製過去,否則英數字會落回系統字體(不會壞,只是沒有手寫感)。")
        else:
            print("· 兩個字型檔都在同一層,沒問題。")

    print("\n下一步")
    print("  1. npm install && npm test（jsdom 回歸 + 六組配色對比驗算）")
    print("  2. 瀏覽器開一次,六組配色都切一輪,看側欄與表頭的字")
    print("  3. git add -A && git commit && git push")


def backup(idx, skip):
    if skip:
        return
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    dst = idx.with_name(idx.name + f".bak-{stamp}")
    shutil.copy2(idx, dst)
    print(f"· 已備份 {dst.name}")


if __name__ == "__main__":
    main()
