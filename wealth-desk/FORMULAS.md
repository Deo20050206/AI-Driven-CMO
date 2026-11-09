# Wealth Desk formulas (fixed)

Every number on the dashboard comes from one of the formulas below, and nothing else. Kite is the source of truth:
quantities, prices, P&L fields and stop-losses are read from Kite every time, never typed in.
`tests/check_totals.mjs` checks each formula against live Kite answers. Run it before every publish.

## Inputs, straight from Kite
| Input | Kite call | Fields used |
|---|---|---|
| Holdings | `get_holdings` | `quantity` (today's sells already removed; they show as `used_quantity`), `t1_quantity`, `mtf.quantity`, `average_price`, `last_price`, `close_price` |
| Today's trades | `get_positions` | delivery (CNC) buys and sells not yet settled; other products for their `pnl` |
| Mutual funds | `get_mf_holdings` | `quantity`, `average_price`, `last_price` (Kite's `pnl` is always 0, so it is derived) |
| Cash | `get_margins` | `equity.net` (already net of today's trades) |
| Stop-losses | `get_gtts` | active sell GTTs: stop = lower trigger, target = upper trigger, `quantity` |

Opinions (verdicts, planned stops, the idea) live in `portfolio_review` and `opportunity`. They never hold quantities or live stops.

## Formulas
**Shares held** = `quantity + t1_quantity + mtf.quantity` + today's delivery buys.
Today's sells are **not** subtracted again: Kite already did.

**Portfolio value** = Σ shares held × last price + Σ fund units × NAV + cash (`margins.net`).
Unrealised P&L sits inside the value. Never add it on top.
The page works this out a second way (`value_check`) and shows "✓ Checked against Kite" or "⚠ Off by".

**Cost** = Σ shares × average price (today's buys at their fill price).

**Unrealised P&L** = value of holdings − cost
= Σ Kite holdings `pnl` + today's buys' `pnl` + Σ units × (NAV − average price).

**Today's P&L** = Σ held shares × (last − previous close)
+ today's buys × (last − buy price)
+ today's sells × (sale price − previous close)
+ intraday, F&O, commodity and MTF `pnl`.

**Realised P&L** (one ledger row per sale) = shares sold × (sale price − average cost at the time).
Use Kite fills (`get_trades`) on the day of the sale. Later on, the day's close, marked `estimated`.
Every closed idea in `trades` must have a ledger row.

**Money put in** = cost + cash − Σ realised P&L.
This is derived, never typed in. Deposits, withdrawals and SIP instalments show up by themselves.
Caveat: brokerage and taxes count as small withdrawals, and dividends count as deposits.

**Gain since start** = (value − money put in) today − (value − money put in) on day one.
At all times, value − money put in = unrealised + realised.

**Flow on a day** = money put in that day − money put in the day before.

**Drop from best day** (time-weighted) = index ÷ its peak − 1.
The index is multiplied each day by (value − that day's flow) ÷ the previous day's value.

**Weight** = holding value ÷ Σ holding values (they sum to 100%).

**Risk of a holding** = max(last price − GTT stop, 0) × shares in the GTT.
- Only live GTTs count. A planned stop with no GTT protects nothing, so it is listed as a warning and not counted.
- The idea counts only if it isn't bought yet: (entry − stop) × shares.
- Limits: total ≤ 8% of value, any one ≤ 2.5%, and no new ideas once the drop from the best day reaches 10%.

**Idea ticket**:
- Reward:risk = (target − entry) ÷ (entry − stop)
- At risk = (entry − stop) × shares, and that as a % of today's value
- Capital = entry × shares

**Scorecard**:
- R = (exit − entry) ÷ (entry − stop)
- A win is exit > entry
- Average R is the mean over closed ideas

## Invariants (all asserted by the test)
- The value check agrees within ₹2.
- Weights sum to 100%.
- Each row's P&L = value − cost.
- Unrealised = Kite `pnl` sum (+ MF derived).
- Today's P&L = Kite `day_change` sum + buys + covered sells.
- Every closed trade has a ledger row.
- Every holding with a stop has a live GTT; otherwise it is flagged.
- Value − money put in = unrealised + realised.
- The ticket's reward:risk matches its price levels.
