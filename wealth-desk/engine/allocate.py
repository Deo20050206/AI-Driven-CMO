"""Position sizing and funding plan for a new idea.

Usage: python allocate.py state.json idea.json  -> prints the allocation JSON
state.json: {"portfolio_value", "peak_value", "cash", "holdings": [{symbol, asset_class, value,
             ltp, qty, verdict?}], "open_trades": [{symbol, entry, sl, qty}]}
idea.json:  {"symbol", "entry", "sl", "tp", "confidence"}
"""
import json
import math
import sys

from rules import (CONCENTRATION_LADDER, HALT_DRAWDOWN, MAX_OPEN_IDEAS, MAX_OPEN_RISK,
                   RISK_PER_TRADE, stage_for)


def open_risk(trades):
    return sum(max(t["entry"] - t["sl"], 0) * t["qty"] for t in trades)


def allocate(state, idea, size_factor=1.0):
    pv = state["portfolio_value"]
    peak = max(state.get("peak_value") or pv, pv)
    out = {"symbol": idea["symbol"], "blocked": None}
    drawdown = pv / peak - 1
    out["drawdown"] = drawdown
    if drawdown <= -HALT_DRAWDOWN:
        out["blocked"] = f"Halt: portfolio is {drawdown:.1%} below its peak (limit −{HALT_DRAWDOWN:.0%})."
        return out
    trades = state.get("open_trades", [])
    if len(trades) >= MAX_OPEN_IDEAS:
        out["blocked"] = f"{len(trades)} ideas already open (max {MAX_OPEN_IDEAS})."
        return out

    entry, sl = idea["entry"], idea["sl"]
    per_share_risk = entry - sl
    if per_share_risk <= 0:
        raise ValueError("SL must be below entry")

    risk_budget = pv * RISK_PER_TRADE * size_factor
    risk_room = pv * MAX_OPEN_RISK - open_risk(trades)
    risk_rs = min(risk_budget, max(risk_room, 0))
    if risk_rs <= 0:
        out["blocked"] = "Open risk already at the 8% limit."
        return out

    # Stable core is off-limits for funding at later stages.
    stage = stage_for(pv)
    max_weight = CONCENTRATION_LADDER[min(len(trades), len(CONCENTRATION_LADDER) - 1)]
    tradable_pool = pv * (1 - stage["core_pct"])
    qty_by_risk = math.floor(risk_rs / per_share_risk)
    qty_by_weight = math.floor(min(pv * max_weight, tradable_pool) / entry)
    qty = max(min(qty_by_risk, qty_by_weight), 0)
    if qty == 0:
        out["blocked"] = "Position too small at current portfolio size."
        return out
    cost = round(qty * entry, 2)

    # Funding: cash -> liquid funds -> gold above target -> weakest holding by verdict.
    steps, need = [], cost - state.get("cash", 0)
    if state.get("cash", 0) > 0:
        steps.append({"action": "Use cash", "amount": round(min(state["cash"], cost), 2)})
    order = sorted(state.get("holdings", []), key=lambda h: (
        {"Liquid / cash": 0, "Gold": 1}.get(h.get("asset_class"), 2),
        {"Exit": 0, "Trim": 1, "Hold": 2, "Add": 3}.get(h.get("verdict"), 2)))
    for h in order:
        if need <= 0:
            break
        if h.get("asset_class") == "Equity funds & ETFs" and stage["core_pct"] > 0:
            continue
        if h.get("is_open_trade"):
            continue
        take = min(h["value"], need)
        sell_qty = math.ceil(take / h["ltp"]) if h.get("ltp") else None
        if sell_qty and h.get("qty"):
            sell_qty = min(sell_qty, h["qty"])
        steps.append({"action": f"Sell {h['symbol']}", "qty": sell_qty, "amount": round(take, 2)})
        need -= take
    if need > 0:
        qty = math.floor((cost - need) / entry)
        cost = round(qty * entry, 2)
        out["note"] = "Not enough sellable capital for full size; reduced."
    steps.append({"action": f"Buy {idea['symbol']}", "qty": qty, "limit": entry, "amount": cost})
    steps.append({"action": "Place GTT OCO", "sl": sl, "tp": idea["tp"], "qty": qty})

    out.update({
        "qty": qty, "cost": cost, "weight": cost / pv,
        "risk_rs": round(qty * per_share_risk, 2), "risk_pct": qty * per_share_risk / pv,
        "reward_rs": round(qty * (idea["tp"] - entry), 2),
        "rr": round((idea["tp"] - entry) / per_share_risk, 2),
        "open_risk_after": (open_risk(trades) + qty * per_share_risk) / pv,
        "stage": stage["label"], "steps": steps,
    })
    return out


if __name__ == "__main__":
    st = json.load(open(sys.argv[1]))
    idea = json.load(open(sys.argv[2]))
    factor = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    print(json.dumps(allocate(st, idea, factor), indent=1, ensure_ascii=False))
