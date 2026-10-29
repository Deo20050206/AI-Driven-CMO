"""Resolve open ideas against daily candles and compute the track record.

Usage: python track.py trades.json candles_dir/ [today YYYY-MM-DD] -> writes trades.json back
trades.json rows: {id, date, symbol, entry, sl, tp, qty, status, entered?, exit_date?, exit_price?}
candles_dir/<SYMBOL>.json: Kite get_historical_data rows (date, open, high, low, close, volume)
status: proposed -> open (Dev bought) -> tp | sl | time | cancelled
A proposed idea that is never bought is scored as a paper trade so the hit rate stays honest.
"""
import json
import os
import sys

from rules import TIME_STOP_SESSIONS


def resolve(trade, candles):
    """Walk candles after the idea date. Gap through a level fills at the open."""
    if trade["status"] not in ("proposed", "open"):
        return trade
    bars = [c for c in candles if str(c["date"])[:10] > trade["date"]]
    for i, c in enumerate(bars, start=1):
        lo, hi, op = c["low"], c["high"], c["open"]
        if lo <= trade["sl"]:
            trade.update(status="sl", exit_date=str(c["date"])[:10],
                         exit_price=min(op, trade["sl"]), sessions=i)
            break
        if hi >= trade["tp"]:
            trade.update(status="tp", exit_date=str(c["date"])[:10],
                         exit_price=max(op, trade["tp"]), sessions=i)
            break
        if i >= TIME_STOP_SESSIONS:
            trade.update(status="time", exit_date=str(c["date"])[:10], exit_price=c["close"],
                         sessions=i)
            break
    else:
        trade["sessions"] = len(bars)
        if bars:
            trade["last_price"] = bars[-1]["close"]
    if "exit_price" in trade:
        risk = trade["entry"] - trade["sl"]
        trade["ret"] = trade["exit_price"] / trade["entry"] - 1
        trade["r"] = (trade["exit_price"] - trade["entry"]) / risk if risk else 0
        trade["pnl"] = round((trade["exit_price"] - trade["entry"]) * trade.get("qty", 0), 2)
    return trade


def summary(trades):
    closed = [t for t in trades if t["status"] in ("tp", "sl", "time")]
    n = len(closed)
    wins = [t for t in closed if t.get("ret", 0) > 0]
    return {
        "closed": n,
        "open": sum(t["status"] in ("proposed", "open") for t in trades),
        "win_rate": len(wins) / n if n else None,
        "tp_rate": sum(t["status"] == "tp" for t in closed) / n if n else None,
        "avg_r": sum(t["r"] for t in closed) / n if n else None,
        "avg_ret": sum(t["ret"] for t in closed) / n if n else None,
        "pnl": round(sum(t.get("pnl", 0) for t in closed if t.get("entered")), 2),
    }


if __name__ == "__main__":
    path, cdir = sys.argv[1], sys.argv[2]
    trades = json.load(open(path))
    for t in trades:
        f = os.path.join(cdir, f"{t['symbol']}.json")
        if os.path.exists(f):
            resolve(t, json.load(open(f)))
    json.dump(trades, open(path, "w"), indent=1)
    print(json.dumps(summary(trades), indent=1))
