"""Live screen: rank the universe using Kite data saved by the routine.

Usage:
  python screen.py prefilter quotes.json            -> prints symbols worth pulling history for
  python screen.py rank candles_dir/ nifty.json     -> prints ranked candidates as JSON

quotes.json: Kite get_ohlc / get_quotes answer for the whole universe (one call, up to 500).
candles_dir/<SYMBOL>.json: Kite get_historical_data rows, ~260 daily bars.
nifty.json: Kite get_historical_data rows for NIFTY 50 (token 256265), same window.
"""
import csv
import json
import os
import sys

import pandas as pd

from features import add_features, in_hunting_ground, kill_reason, score, stop_price
from rules import CALIBRATED, MIN_PRICE, TP_PCT

HERE = os.path.dirname(__file__)


def universe():
    with open(os.path.join(HERE, "universe.csv")) as f:
        return {r["symbol"]: r for r in csv.DictReader(f)}


def frame(rows):
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"].astype(str).str[:10])
    return df[["date", "open", "high", "low", "close", "volume"]].sort_values("date").reset_index(drop=True)


def prefilter(quotes, max_names=40):
    """Cheap pass on one quotes call: price floor, skip oil-sensitive while crude is the regime risk,
    and prefer names trading below their recent open/close range (not gapping up today)."""
    uni = universe()
    out = []
    for key, q in quotes.items():
        sym = key.split(":", 1)[-1]
        if sym not in uni or q.get("last_price", 0) < MIN_PRICE:
            continue
        if "oil_sensitive" in uni[sym]["tags"]:
            continue
        prev = (q.get("ohlc") or {}).get("close") or q["last_price"]
        day = q["last_price"] / prev - 1 if prev else 0
        if day > 0.05:          # do-not-chase: skip names already up >5% today
            continue
        out.append((sym, day))
    out.sort(key=lambda x: x[1])
    return [s for s, _ in out[:max_names]]


def rank(candles_dir, nifty_rows, top=10):
    bench = frame(nifty_rows)[["date", "close"]]
    uni = universe()
    results = []
    for fn in os.listdir(candles_dir):
        sym = fn.rsplit(".", 1)[0]
        rows = json.load(open(os.path.join(candles_dir, fn)))
        if len(rows) < 130:
            continue
        d = add_features(frame(rows), bench)
        last = d.iloc[-1]
        k = kill_reason(last, series=(uni.get(sym) or {}).get("series"))
        res = {"symbol": sym, "close": round(float(last["close"]), 2),
               "dd52": round(float(last["dd52"]), 3), "r90": round(float(last["r90"]), 3),
               "r15_excess": round(float(last["r15_excess"]), 3) if pd.notna(last["r15_excess"]) else None,
               "turnover_cr": round(float(last["turnover_cr"]), 1),
               "higher_low": bool(last["higher_low"]), "reclaim_sma20": bool(last["reclaim_sma20"]),
               "kill": k}
        if not k:
            res["in_ground"] = in_hunting_ground(last)
            res["in_ground_loose"] = in_hunting_ground(last, structure="none")
            sl, sl_pct = stop_price(float(last["close"]), float(last["atr14"]))
            res.update(score=score(last), entry=res["close"], sl=sl, sl_pct=round(sl_pct, 3),
                       tp=round(res["close"] * (1 + TP_PCT), 2), rr=round(TP_PCT / sl_pct, 2),
                       high_20=round(float(d["high"].tail(20).max()), 2), low_20=round(float(d["low"].tail(20).min()), 2))
        results.append(res)
    passed = sorted([r for r in results if not r["kill"] and r.get("in_ground")], key=lambda r: -r["score"])
    loose = sorted([r for r in results if not r["kill"] and not r.get("in_ground") and r.get("in_ground_loose")],
                   key=lambda r: -r["score"])
    return {"structure_rule": CALIBRATED["structure"], "gate_passed": CALIBRATED["gate_passed"],
            "passed": passed[:top], "watch_no_structure_yet": loose[:top],
            "killed": [{"symbol": r["symbol"], "kill": r["kill"]} for r in results if r["kill"]]}


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "prefilter":
        print(json.dumps(prefilter(json.load(open(sys.argv[2])))))
    elif cmd == "rank":
        print(json.dumps(rank(sys.argv[2], json.load(open(sys.argv[3]))), indent=1))
