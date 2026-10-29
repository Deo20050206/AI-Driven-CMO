"""Feature and signal logic shared by backtest.py (history) and screen.py (live Kite data).

Input frames have columns: date, open, high, low, close, volume (one symbol, ascending dates).
The benchmark frame has columns: date, close.
"""
import numpy as np
import pandas as pd

from rules import (CALIBRATED, DD52_RANGE, MAX_RUNUP_15D_EXCESS, MIN_PRICE, MIN_TURNOVER_CR,
                   NOT_NEAR_HIGH, R90_RANGE)


def add_features(df, bench=None):
    """Return df with rolling features computed for every row (no look-ahead)."""
    d = df.copy()
    prev_close = d["close"].shift(1)
    tr = pd.concat([d["high"] - d["low"], (d["high"] - prev_close).abs(),
                    (d["low"] - prev_close).abs()], axis=1).max(axis=1)
    d["atr14"] = tr.rolling(14, min_periods=14).mean()
    d["hi252"] = d["high"].rolling(252, min_periods=120).max()
    d["dd52"] = d["close"] / d["hi252"] - 1
    d["r90"] = d["close"] / d["close"].shift(90) - 1
    d["r15"] = d["close"] / d["close"].shift(15) - 1
    d["turnover_cr"] = (d["close"] * d["volume"] / 1e7).rolling(20, min_periods=10).median()
    d["sma20"] = d["close"].rolling(20).mean()
    d["low10"] = d["low"].rolling(10).min()
    d["low_prior30"] = d["low"].shift(10).rolling(30).min()
    d["higher_low"] = d["low10"] > d["low_prior30"]
    above = d["close"] > d["sma20"]
    d["reclaim_sma20"] = above & (~above.shift(1, fill_value=True) | ~above.shift(2, fill_value=True)
                                  | ~above.shift(3, fill_value=True))
    if bench is not None:
        b = bench.set_index("date")["close"]
        br15 = (b / b.shift(15) - 1).rename("b_r15")
        d = d.join(br15, on="date")
        d["r15_excess"] = d["r15"] - d["b_r15"]
    else:
        d["r15_excess"] = d["r15"]
    return d


def kill_reason(row, series=None):
    if series and series.upper() in {"T", "Z", "XT", "XD", "TS", "ZP"}:
        return "surveillance series"
    if row["close"] < MIN_PRICE:
        return "price below ₹20"
    if not np.isfinite(row["turnover_cr"]) or row["turnover_cr"] < MIN_TURNOVER_CR:
        return "turnover below floor"
    if np.isfinite(row["r15_excess"]) and row["r15_excess"] > MAX_RUNUP_15D_EXCESS:
        return "already ran (+10% excess in 15 sessions)"
    return None


def in_hunting_ground(row, structure=None):
    structure = structure or CALIBRATED["structure"]
    if not (np.isfinite(row["dd52"]) and np.isfinite(row["r90"])):
        return False
    if not (DD52_RANGE[0] <= row["dd52"] <= DD52_RANGE[1]) or row["dd52"] > NOT_NEAR_HIGH:
        return False
    if not (R90_RANGE[0] <= row["r90"] <= R90_RANGE[1]):
        return False
    if structure == "higher_low":
        return bool(row["higher_low"])
    if structure == "reclaim_sma20":
        return bool(row["reclaim_sma20"])
    if structure == "both":
        return bool(row["higher_low"]) and bool(row["reclaim_sma20"])
    return True


def stop_price(entry, atr, mult=None, lo=None, hi=None):
    mult = mult if mult is not None else CALIBRATED["sl_atr_mult"]
    lo = lo if lo is not None else CALIBRATED["sl_min_pct"]
    hi = hi if hi is not None else CALIBRATED["sl_max_pct"]
    pct = min(max(mult * atr / entry, lo), hi)
    return round(entry * (1 - pct), 2), pct


def score(row):
    """Rank candidates inside the hunting ground. Deeper drawdown and weaker 90d trend scored
    higher (the study's strongest move-size features), with liquidity as a tiebreak."""
    s = 0.0
    s += min(max(-row["dd52"], 0), 0.7) / 0.7 * 50
    s += min(max(-row["r90"], -0.15), 0.4) / 0.4 * 30
    s += min(np.log10(max(row["turnover_cr"], 1)) / 2, 1) * 20
    return round(s, 1)
