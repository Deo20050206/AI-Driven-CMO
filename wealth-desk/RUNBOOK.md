# Wealth Desk: daily refresh runbook

Dashboard: https://claude.ai/artifact/TjJfTv5vmJEcF6s2arypnX (Dashboard artifact type).
The page lives in the artifact's store as `files/index.html`. A copy is in `wealth-desk/index.html`.

## Who it's for

Dev (Zerodha client ITJ551). Long-horizon investor who adds ₹15–20k a month. Rules:

- Never place, modify or cancel orders. Suggestions only.
- Delivery (CNC) only. No F&O, no leverage, no intraday.
- Never promise returns. The aim is to beat the Nifty after costs over years, not 6% a month.

## Datasets

| id | kind | how to refresh |
|----|------|----------------|
| holdings | file + paused Kite request `get_holdings {}` | run the call, upload the rows as JSON |
| mf_holdings | file + paused Kite request `get_mf_holdings {}` | same |
| market | file + paused Kite request `get_quotes` (4 indices) | upload rows `{instrument, last_price, prev_close}` (prev_close = `ohlc.close`) |
| nifty_1y | file + paused Kite request `get_historical_data` (token 256265, day) | set from_date to 1 year back and to_date to today, upload rows `{date: YYYY-MM-DD, close}`, update `request.args` |
| ideas | file (research) | 3–6 ranked rows: `rank, stance, instrument, title, why, how, amount_inr, horizon, confidence, review_by` |
| catalysts | file (research) | rows `date, event, affects, impact (High/Medium/Action), what_to_do`. Look 2–14 days ahead |
| signals | file (research) | rows `date, category, headline, read (Bullish/Bearish/Neutral/Event), so_what, url` |
| notes | file (research) | rows `{key, text}` for keys `takeaway`, `regime`, `sentiment_score`, `brief_date` |
| sip_plan | file | review on the 1st of each month |
| targets, classify | file | change only on Dev's instruction; add new symbols to classify |

Stance values the page colours: `Buy gradually`, `Buy`, `Add`, `Hold`, `Watch`, `Trim`, `Sell`, `Avoid`.

## Daily steps

1. Call Kite `get_holdings`. If it says to log in, call `login`, show Dev the warning and the link, and carry on with research while you wait.
2. Research with web search: news on each holding; government tenders and order wins (defence, rail, power, infra PSUs); results and board-meeting dates for the next 14 days; RBI, CPI, FII flows, crude and rupee; Nifty technical levels; gold.
3. Rewrite `ideas`, `catalysts`, `signals` and `notes`. Each file: write the JSON, upload it with the Artifact tool (`asset: true`, the dashboard url), then `update` `datasets/<id>` with the new `url`, `name` and `updated: {at, by: "Claude"}`.
4. Once Kite is logged in, refresh `holdings`, `mf_holdings`, `market` and `nifty_1y` the same way, and also write `lastAttempt: {at, ok: true, by: "Dev"}`.
5. Commit the JSON files to `wealth-desk/data/` on branch `claude/portfolio-audit-dashboard-e5c5kv` if the repo is checked out.
6. Reply with a 5-line brief: the takeaway, today's top 2 calls, anything due in the next 2 days, and the dashboard link.
