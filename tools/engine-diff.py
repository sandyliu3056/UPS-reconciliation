#!/usr/bin/env python3
"""兩站同一顆計價引擎,各自一份 index.html,改了一邊忘了另一邊就漂掉
(Void 沖銷只在 reprice 站、SCC 行的 Zone 後備只在對帳站,就是這樣來的)。
這支把兩份檔案裡的引擎函式一支一支抓出來比,哪一支不一樣就印 diff。

用法:
  python3 tools/engine-diff.py /path/to/other/index.html            # 比預設那幾支
  python3 tools/engine-diff.py OTHER --names priceShipment,scanCharges
  python3 tools/engine-diff.py OTHER --with-comments                  # 註解也比(預設只比程式碼)
  python3 tools/engine-diff.py OTHER --quiet                          # 只印一行一支的結果
有差異就以 1 結束,可以放進 CI。"""
import argparse, difflib, pathlib, re, sys

DEFAULT = ("priceShipment scanCharges shipmentsOf ingest billableWeight lookupBaseRate accLookup "
           "accZoneKey accZoneKeys quoteDeclaredValue calcDemand fuelPercentFor dimFactorFor "
           "defaultDimDivisor parseDims isFreightLine isAccessorialAdjLine isAccountLevelLine "
           "guessService normZone buildOriginals origFrtFor segHasFreight codeHandling "
           "pyChannelOf pyShipmentType channelRules svcOfChan").split()
END = re.compile(r"\n(?=function |const |let |var |class |/\* -{5,}|</script>)")

def grab(src, name):
    m = re.search(r"^function %s\s*\(" % re.escape(name), src, re.M)
    if not m: return None
    e = END.search(src, m.end())
    return src[m.start():e.start() if e else len(src)]

def strip_comments(code):
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    code = re.sub(r"(?m)^\s*//.*$", "", code)
    return "\n".join(l.rstrip() for l in code.splitlines() if l.strip())

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("other", help="另一站的 index.html")
    ap.add_argument("--mine", default=str(pathlib.Path(__file__).resolve().parent.parent / "index.html"))
    ap.add_argument("--names", default=",".join(DEFAULT))
    ap.add_argument("--with-comments", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    A = pathlib.Path(a.mine).read_text(encoding="utf-8")
    B = pathlib.Path(a.other).read_text(encoding="utf-8")
    bad = 0
    for n in [x for x in a.names.split(",") if x]:
        fa, fb = grab(A, n), grab(B, n)
        if fa is None or fb is None:
            print(f"{n:24} {'MISSING here' if fa is None else ''}{'MISSING there' if fb is None else ''}".rstrip()); bad += 1; continue
        ca, cb = (fa, fb) if a.with_comments else (strip_comments(fa), strip_comments(fb))
        if ca == cb: print(f"{n:24} same"); continue
        bad += 1
        la, lb = ca.splitlines(), cb.splitlines()
        d = list(difflib.unified_diff(lb, la, "other/"+n, "mine/"+n, lineterm="", n=2))
        plus = sum(1 for l in d[2:] if l.startswith("+")); minus = sum(1 for l in d[2:] if l.startswith("-"))
        print(f"{n:24} DIFF  +{plus} -{minus}")
        if not a.quiet: print("\n".join("    "+l for l in d)); print()
    print(f"\n{bad} function(s) differ" if bad else "\nengines match")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
