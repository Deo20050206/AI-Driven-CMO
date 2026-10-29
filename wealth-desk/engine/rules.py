"""Single source of truth for Wealth Desk trading rules.

Defaults come from the AI India Portfolio event study (GAUNTLET-REVISION.md, 2026-08-23)
and Dev's risk decisions (2026-10-29). backtest.py overwrites the CALIBRATED block via
calibrated.json once a back-test passes the go-live gate.
"""
import json
import os

# --- Dev's risk limits (2026-10-29) -------------------------------------------------
RISK_PER_TRADE = 0.025      # max share of portfolio lost if one idea hits its stop
MAX_OPEN_RISK = 0.08        # sum of (entry - SL) * qty across open ideas, as share of portfolio
HALT_DRAWDOWN = 0.10        # no new ideas once portfolio is this far below its peak
CONCENTRATION_LADDER = [0.40, 0.25, 0.20, 0.15]   # max weight of 1st, 2nd, 3rd, 4th open idea
MAX_OPEN_IDEAS = 4

# --- Idea geometry -------------------------------------------------------------------
TP_PCT = 0.10               # minimum target: +10%
TIME_STOP_SESSIONS = 20     # exit at the close of session 20 if neither SL nor TP hit
CADENCE_IDEA_DAYS = 5       # trading days between ideas
CADENCE_REVIEW_DAYS = 3     # trading days between portfolio / market reviews

# --- Origination hard kills (GAUNTLET-REVISION G2) ------------------------------------
KILL_SERIES = {"T", "Z", "XT", "XD", "TS", "ZP"}
MIN_PRICE = 20.0
MIN_TURNOVER_CR = 3.0       # median daily traded value, ₹ crore, last 20 sessions
MAX_RUNUP_15D_EXCESS = 0.10 # already +10% vs Nifty in 15 sessions -> kill as an entry

# --- Hunting ground (G1, characterisation; validated by backtest) --------------------
DD52_RANGE = (-0.70, -0.25)     # drawdown from 52-week high
R90_RANGE = (-0.40, 0.15)       # 90-session return
NOT_NEAR_HIGH = -0.09           # zero episodes began within 9% of the 52w high

# --- Portfolio stages (core grows with size) ----------------------------------------
STAGES = [
    {"min_value": 0,       "core_pct": 0.00, "label": "Build: whole portfolio is the trading pool"},
    {"min_value": 200000,  "core_pct": 0.30, "label": "Stabilise: 30% stable core"},
    {"min_value": 500000,  "core_pct": 0.50, "label": "Preserve: 50% stable core"},
]

# --- Calibrated by backtest.py --------------------------------------------------------
CALIBRATED = {
    "sl_atr_mult": 2.0,         # SL = entry - mult * ATR14
    "sl_min_pct": 0.08,
    "sl_max_pct": 0.18,         # outside the -14.2% median post-entry noise
    "structure": "higher_low",  # base / higher-low test
    "gate_passed": False,       # set True only when expectancy > 0 and lift > 1.2
    "stats": None,
}

_cal_path = os.path.join(os.path.dirname(__file__), "calibrated.json")
if os.path.exists(_cal_path):
    with open(_cal_path) as f:
        CALIBRATED.update(json.load(f))


def stage_for(value):
    stage = STAGES[0]
    for s in STAGES:
        if value >= s["min_value"]:
            stage = s
    return stage
