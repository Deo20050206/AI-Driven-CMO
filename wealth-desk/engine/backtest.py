"""Control-panel back-test for the Wealth Desk screen, on Dev's BSE daily dataset (market.duckdb).

Usage (on the Mac, inside the AI-India-Data venv):
  python backtest.py inspect /path/market.duckdb
  python backtest.py run /path/market.duckdb --table T --symbol COL --date COL [--series COL]
                     [--start 2010-01-01] [--end 2025-12-31] [--sample 1.0] [--out calibrated.json]

What it measures, for every variant of (structure test x stop width x target):
  * signal trades: days where a stock passes the hard kills and the hunting-ground screen
    (at most one entry per stock per 20 sessions), entered at the NEXT day's open;
  * control trades: random liquid, tradeable stock-days that do NOT pass the screen,
    run through the identical exit rules. Lift = signal expectancy vs control expectancy.
Exits: stop-loss, take-profit, or close of session 20 (time stop). Same-day SL+TP counts as SL.
Costs: 0.35% round trip (brokerage, STT, slippage), charged on every trade.
Go-live gate: expectancy after costs > 0 AND lift > 1.2 AND n >= 300.
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from features import add_features  # noqa: E402
from rules import (DD52_RANGE, MAX_RUNUP_15D_EXCESS, MIN_PRICE, MIN_TURNOVER_CR,  # noqa: E402
                   NOT_NEAR_HIGH, R90_RANGE, TIME_STOP_SESSIONS)

COST = 0.0035
STRUCTURES = ["none", "higher_low", "reclaim_sma20", "both"]
SL_MULTS = [1.5, 2.0, 2.5, 3.0]
SL_BOUNDS = (0.06, 0.20)
TPS = [0.10, 0.15, 0.20]
KILL_SERIES = {"T", "Z", "XT", "XD", "TS", "ZP"}


def inspect(db):
    import duckdb
    con = duckdb.connect(db, read_only=True)
    for (t,) in con.execute("select table_name from information_schema.tables").fetchall():
        cols = con.execute(f"select column_name, data_type from information_schema.columns where table_name='{t}'").fetchall()
        n = con.execute(f'select count(*) from "{t}"').fetchone()[0]
        print(f"{t}  rows={n}")
        for c, ty in cols:
            print(f"   {c}: {ty}")


def simulate(o, h, l, c, i, sl_pct, tp_pct):
    """Enter at open of bar i+1. Returns (ret, outcome)."""
    n = len(c)
    if i + 1 >= n:
        return None
    entry = o[i + 1]
    if not np.isfinite(entry) or entry <= 0:
        return None
    sl, tp = entry * (1 - sl_pct), entry * (1 + tp_pct)
    last = min(i + TIME_STOP_SESSIONS, n - 1)
    for j in range(i + 1, last + 1):
        if l[j] <= sl:
            return (min(o[j], sl) if j > i + 1 else sl) / entry - 1, "sl"
        if h[j] >= tp:
            return (max(o[j], tp) if j > i + 1 else tp) / entry - 1, "tp"
    if last - i < TIME_STOP_SESSIONS:
        return None  # not enough future bars
    return c[last] / entry - 1, "time"


def run(args):
    import duckdb
    con = duckdb.connect(args.db, read_only=True)
    T, S, Dt = args.table, args.symbol, args.date
    ser = f', "{args.series}" as series' if args.series else ""
    q = (f'select "{S}" as symbol, "{Dt}" as date, open, high, low, close, volume{ser} from "{T}" '
         f"where \"{Dt}\" between '{args.start}' and '{args.end}' order by 1, 2")
    df = con.execute(q).df()
    df["date"] = pd.to_datetime(df["date"])
    # Benchmark: equal-weight median daily return of the whole market (no index file needed).
    df["ret1"] = df.groupby("symbol")["close"].pct_change()
    bench_ret = df.groupby("date")["ret1"].median().fillna(0)
    bench = pd.DataFrame({"date": bench_ret.index, "close": (1 + bench_ret).cumprod().values})

    rng = np.random.default_rng(42)
    syms = df["symbol"].unique()
    if args.sample < 1:
        syms = rng.choice(syms, int(len(syms) * args.sample), replace=False)
    keys = [(st, m, tp) for st in STRUCTURES for m in SL_MULTS for tp in TPS]
    sig = {k: [] for k in keys}
    ctl = {k: [] for k in keys}

    for n_done, sym in enumerate(syms, 1):
        g = df[df["symbol"] == sym].reset_index(drop=True)
        if len(g) < 300:
            continue
        f = add_features(g[["date", "open", "high", "low", "close", "volume"]], bench)
        o, h, l, c = (f[x].to_numpy(float) for x in ("open", "high", "low", "close"))
        atr = f["atr14"].to_numpy(float)
        series = g["series"].astype(str).str.upper().to_numpy() if "series" in g else np.array([""] * len(g))
        tradeable = (c >= MIN_PRICE) & (f["turnover_cr"].to_numpy(float) >= MIN_TURNOVER_CR) & ~np.isin(series, list(KILL_SERIES))
        not_run = ~(f["r15_excess"].to_numpy(float) > MAX_RUNUP_15D_EXCESS)
        dd, r90 = f["dd52"].to_numpy(float), f["r90"].to_numpy(float)
        ground = (dd >= DD52_RANGE[0]) & (dd <= DD52_RANGE[1]) & (dd <= NOT_NEAR_HIGH) & (r90 >= R90_RANGE[0]) & (r90 <= R90_RANGE[1])
        hl, rc = f["higher_low"].to_numpy(bool), f["reclaim_sma20"].to_numpy(bool)
        struct = {"none": np.ones(len(f), bool), "higher_low": hl, "reclaim_sma20": rc, "both": hl & rc}
        base = tradeable & not_run & ground & np.isfinite(atr)
        for st in STRUCTURES:
            mask = base & struct[st]
            last_i = -10**9
            idx = []
            for i in np.flatnonzero(mask):
                if i - last_i >= TIME_STOP_SESSIONS:
                    idx.append(i)
                    last_i = i
            # control: tradeable days NOT in the signal mask, ~same count, sampled
            pool = np.flatnonzero(tradeable & ~mask & np.isfinite(atr))
            cidx = rng.choice(pool, min(len(pool), max(len(idx), 1)), replace=False) if len(pool) else []
            for m in SL_MULTS:
                for tp in TPS:
                    for i in idx:
                        slp = min(max(m * atr[i] / c[i], SL_BOUNDS[0]), SL_BOUNDS[1])
                        r = simulate(o, h, l, c, i, slp, tp)
                        if r:
                            sig[(st, m, tp)].append((r[0] - COST, r[1], slp))
                    for i in cidx:
                        slp = min(max(m * atr[i] / c[i], SL_BOUNDS[0]), SL_BOUNDS[1])
                        r = simulate(o, h, l, c, i, slp, tp)
                        if r:
                            ctl[(st, m, tp)].append((r[0] - COST, r[1], slp))
        if n_done % 200 == 0:
            print(f"... {n_done}/{len(syms)} symbols", file=sys.stderr)

    report = []
    for k in keys:
        s, cc = sig[k], ctl[k]
        if not s:
            continue
        rets = np.array([x[0] for x in s])
        crets = np.array([x[0] for x in cc]) if cc else np.array([0.0])
        exp, cexp = rets.mean(), crets.mean()
        report.append({
            "structure": k[0], "sl_atr_mult": k[1], "tp_pct": k[2], "n": len(s),
            "tp_first": np.mean([x[1] == "tp" for x in s]), "sl_first": np.mean([x[1] == "sl" for x in s]),
            "win_rate": float((rets > 0).mean()), "median_ret": float(np.median(rets)), "expectancy": float(exp),
            "avg_sl_pct": float(np.mean([x[2] for x in s])),
            "control_expectancy": float(cexp), "control_win_rate": float((crets > 0).mean()),
            "lift": float(exp / cexp) if cexp > 0 else (float("inf") if exp > 0 else 0.0),
            "edge_vs_control": float(exp - cexp),
        })
    report.sort(key=lambda r: -r["expectancy"])
    eligible = [r for r in report if r["n"] >= 300]
    best = eligible[0] if eligible else (report[0] if report else None)
    passed = bool(best and best["expectancy"] > 0 and best["edge_vs_control"] > 0 and (best["lift"] > 1.2) and best["n"] >= 300)
    out = {"generated_with": f"{args.start}..{args.end}, sample={args.sample}", "gate_passed": passed,
           "best": best, "top10": report[:10]}
    if best:
        out.update({"structure": best["structure"], "sl_atr_mult": best["sl_atr_mult"],
                    "sl_min_pct": SL_BOUNDS[0], "sl_max_pct": SL_BOUNDS[1], "tp_pct": best["tp_pct"]})
    cal = {k: out[k] for k in ("structure", "sl_atr_mult", "sl_min_pct", "sl_max_pct", "gate_passed") if k in out}
    cal["stats"] = {k: best[k] for k in ("n", "win_rate", "tp_first", "sl_first", "expectancy", "control_expectancy", "lift")} if best else None
    cal["tp_pct"] = out.get("tp_pct")
    json.dump(cal, open(args.out, "w"), indent=1, default=float)
    json.dump(out, open(args.out.replace(".json", "_report.json"), "w"), indent=1, default=float)
    print(json.dumps(out, indent=1, default=float))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["inspect", "run"])
    p.add_argument("db")
    p.add_argument("--table")
    p.add_argument("--symbol")
    p.add_argument("--date")
    p.add_argument("--series")
    p.add_argument("--start", default="2010-01-01")
    p.add_argument("--end", default="2025-12-31")
    p.add_argument("--sample", type=float, default=1.0)
    p.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "calibrated.json"))
    a = p.parse_args()
    inspect(a.db) if a.cmd == "inspect" else run(a)
