"""倉儲計費工具的資料層測試:層級、客戶指派、單價解析、舊檔搬遷、報價表匯入。
不開視窗,只要 python3 + openpyxl:

    python3 test/test_warehouse_billing.py
"""
import json, sys, pathlib, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import warehouse_billing as wb
from warehouse_billing import Book, KEYS, CH

def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print("  ok", msg)

print("== empty book")
b = Book()
lid = b.ensure_level("預設")
check(lid == "L1" and b.level_name("L1") == "預設", "ensure_level creates L1")
check(b.ensure_level("x") == "L1", "ensure_level is idempotent")
check(b.rates_set("L1") == sum(1 for k in KEYS if CH[k]["rate"] is not None), "new level seeded with price-sheet defaults")

print("== level ops")
try: b.add_level("  "); raise SystemExit("blank accepted")
except ValueError as e: check(str(e) == "lv_blank", "blank name refused")
try: b.add_level("預設"); raise SystemExit("dup accepted")
except ValueError as e: check(str(e) == "lv_dup", "duplicate name refused (case-insensitive)")
a = b.add_level("A 級")
check(a == "L2", "ids allocate L2")
b.set_level_rate(a, "c20", 400)
check(b.level_rate(a, "c20") == 400 and b.level_rate("L1", "c20") == 380.0, "rates are independent per level")
c = b.copy_level(a, "A 級 複本")
check(b.level_rate(c, "c20") == 400, "copy carries rates")
b.set_level_rate(c, "c20", 1)
check(b.level_rate(a, "c20") == 400, "copy is a deep copy")
b.rename_level(c, "B 級")
check(b.level_name(c) == "B 級", "rename")
try: b.rename_level(c, "a 級"); raise SystemExit("rename dup accepted")
except ValueError as e: check(str(e) == "lv_dup", "rename into an existing name refused")
b.rename_level(c, "b 級")  # renaming to own name variant is fine
check(b.level_name(c) == "b 級", "rename to own-name variant allowed")

print("== clients and resolve")
g = b.add_client("gen", "Geniqua", a)
check(g == "GEN" and b.clients["GEN"]["level"] == a, "client code upper-cased, level stored")
x = b.add_client("x", "No level")
check(b.resolve("X") == ("", "none"), "no level -> none")
check(b.resolve("GEN") == (a, "ok"), "assigned -> ok")
check(b.rate("GEN", "c20") == 400 and b.rate("X", "c20") is None, "rate resolves through level; unpriced -> None")
try: b.delete_level(a); raise SystemExit("in-use delete accepted")
except ValueError as e: check(str(e) == "lv_inuse", "delete refused while a client points at it")
check(b.level_users(a) == ["GEN"], "level_users lists the client")
b.set_client_level("GEN", "ZZZ")
check(b.resolve("GEN") == ("ZZZ", "lost"), "unknown level id -> lost")
check(b.line_total("GEN", "c20") == 0.0 and b.total("GEN") == 0.0, "lost level prices nothing")
b.set_qty("GEN", "c20", 2)
check(b.total("GEN") == 0.0, "still nothing while lost")
b.set_client_level("GEN", a)
check(b.total("GEN") == 800.0, "back on level A: 2 x 400")
b.set_level_rate(a, "c20", 500)
check(b.total("GEN") == 1000.0, "changing the level's rate changes the client's total")
b.set_client_level("GEN", "L1")
check(b.total("GEN") == 760.0, "moving to Default: 2 x 380")

print("== picks")
try: b.add_pick("X", "SO1", "outbound", "piece", 3, 4.5, "2026-09-01"); raise SystemExit("pick on unpriced client accepted")
except ValueError as e: check(str(e) == "need_level", "add_pick refuses without a level")
rec = b.add_pick("GEN", "SO1", "outbound", "piece", 3, 4.5, "2026-09-01")
check(rec["key"] == "o5" and rec["amount"] == round(3 * 1.08, 2), "outbound bracket by weight from the level")
b.set_level_rate("L1", "i10", None)
try: b.add_pick("GEN", "SO2", "inbound", "receive_piece", 1, 7, "2026-09-01"); raise SystemExit("unpriced bracket accepted")
except ValueError as e: check(str(e) == "need_pick_rate", "add_pick refuses an unpriced bracket")
check(b.group_total("GEN", "outbound") == 3.24 and b.total("GEN") == 763.24, "group and period totals include picks")

print("== delete level")
b.set_client_level("GEN", "L1")
b.delete_level(a)
check(a not in b.levels, "unused level deleted")
b.delete_level(c)
try: b.delete_level("L1"); raise SystemExit("last level deleted")
except ValueError as e: check(str(e) == "lv_last", "last level cannot be deleted")

print("== json round trip")
s = b.to_json()
d = json.loads(s)
check(set(d) == {"levels", "clients"} and "rates" not in d["clients"]["GEN"], "file has levels + clients, no per-client rates")
b2 = Book.from_json(s, default_name="預設")
check(b2.levels.keys() == b.levels.keys() and b2.clients["GEN"]["level"] == "L1", "round trip keeps levels and assignment")
check(b2.total("GEN") == 763.24, "totals survive the round trip")

print("== migration from the old per-client layout")
old = {"clients": {
  "GEN": {"name": "Geniqua", "rates": Book.fresh_rates(), "qty": {"c20": 1}, "amt": {}, "picks": []},
  "ABC": {"name": "Abc", "rates": Book.fresh_rates(), "qty": {}, "amt": {}, "picks": []},
  "SPC": {"name": "Special", "rates": dict(Book.fresh_rates(), c20=999.0), "qty": {}, "amt": {}, "picks": []},
  "SP2": {"name": "Special 2", "rates": dict(Book.fresh_rates(), c20=999.0), "qty": {}, "amt": {}, "picks": []},
}}
m = Book.from_json(json.dumps(old), default_name="預設")
check(len(m.levels) == 2, "identical rate cards share a level: 2 levels from 4 clients")
names = {lv["name"] for lv in m.levels.values()}
check(names == {"預設", "SPC"}, f"default-rate clients go to 預設, the custom one is named by client code: {names}")
check(m.resolve("GEN")[0] == m.resolve("ABC")[0] and m.resolve("SPC")[0] == m.resolve("SP2")[0], "clients grouped by identical rates")
check(m.rate("SPC", "c20") == 999.0 and m.rate("GEN", "c20") == 380.0, "migrated rates intact")
check(m.total("GEN") == 380.0, "quantities intact after migration")
check(all("rates" not in c for c in m.clients.values()), "per-client rates removed")
m2 = Book.from_json(m.to_json(), default_name="預設")
check(len(m2.levels) == 2, "migrated file re-loads as the new layout")

print("== price sheet import into a level")
from openpyxl import Workbook
tmp = pathlib.Path(tempfile.mkdtemp()) / "price.xlsx"
w = Workbook(); ws = w.active; ws.title = "Price"
ws.append(["GENIQUA LOGISTICS - PRICE SHEET - A 級", "", "", ""])
ws.append(["Category", "Price Sheet Item / Unit", "Fee", "Notes"])
ws.append(["INBOUND", "", "", ""])
ws.append(["", "20GP", 123.0, ""])
ws.append(["", "<1.00 lbs", 0.5, ""])
ws.append(["OUTBOUND", "", "", ""])
ws.append(["", "<1.00 lbs", 0.9, ""])
ws.append(["STORAGE", "", "", ""])
ws.append(["", "General Storage", "$0.55", ""])
w.save(tmp)
lv = m.add_level("匯入測試")
n = m.import_price_sheet(lv, str(tmp))
check(n == 4, f"4 lines imported ({n})")
check(m.level_rate(lv, "c20") == 123.0 and m.level_rate(lv, "i1") == 0.5 and m.level_rate(lv, "o1") == 0.9 and m.level_rate(lv, "stor") == 0.55, "rows land on the right level and the right group")
check(m.rate("GEN", "c20") == 380.0, "other levels untouched by the import")
try: m.import_price_sheet("nope", str(tmp)); raise SystemExit("import into unknown level accepted")
except ValueError as e: check(str(e) == "lv_none", "import into an unknown level refused")

print("\nALL BOOK TESTS PASSED")
