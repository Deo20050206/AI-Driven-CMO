# Wealth Desk v2 runbook

The scheduled routine (weekdays 08:15 IST) runs this procedure. A person can also run it by
saying "run the Wealth Desk" in a Claude Code session that has the Zerodha Kite connector.

- Dashboard: https://claude.ai/artifact/TjJfTv5vmJEcF6s2arypnX (Dashboard artifact type; data in its store)
- Engine: `wealth-desk/engine/` on branch `claude/portfolio-audit-dashboard-e5c5kv`
- Owner: Dev (Zerodha ITJ551). Opens the dashboard in the Claude iPhone app.

## The dashboard
Five pages, swipe or tap between them:
- **Home**: takeaway, portfolio value chart, four headline numbers, the current idea, holdings with each verdict.
- **Ideas**: the current opportunity in full (trigger, buy/stop/target, size, funding, rule checks, exit plan) and the track-record line.
- **Portfolio**: holdings and P&L together. Value history with cash in/out marked, today / unrealised / realised / cash,
  review verdicts, allocation heatmap, risk budget (all stops vs 8%, biggest stop vs 2.5%, drop from best day vs 10%),
  holdings mix, the line-by-line table and the sales ledger.
- **Market**: index tiles, Nifty chart, 3-day market review, catalysts, signals.
- **Scorecard**: every idea scored against real prices.

Page files live in the dashboard's store, mirrored in this folder: `index.html` → `files/index.html`, `art.js` → `files/art.js`.
Publish a page change with ArtifactData `set` on `files/<name>` as `{text}`, pinned with `if_version`. The accepted v1 page
is kept at `versions/v1/index.html`.

## Wallpapers (keep adding new ones)
The background is one of Dev's chosen images, a different one each day: dark images in dark mode, light ones in light mode.
The page dims dark images and softens the top so the text stays readable. If no image loads, `art.js` draws a scene instead.
- `wallpapers/index.json` (dataset `wallpapers`) lists every image: id, name, tone (dark/light), added, source, url.
- Each image is its own small dataset `wp_N` (file `wallpapers/wp_N.json`, one row with a JPEG data URL), so only today's loads.
- Sources Dev picked are in `wallpapers/src/`.

**Habit, every week (Mondays) and whenever Dev sends or drops images:**
1. **Dev's images first.** Images pasted in chat, or new files in `~/Documents/Claude/Projects/` (or `Projects/Wallpapers/`)
   on Dev's Mac when it is attached, are always added. From the Mac: shrink with `sips -s format jpeg -s formatOptions 55
   --resampleWidth 600`, then push them to `wealth-desk/wallpapers/src/` on this branch with `gh api -X PUT .../contents/...`
   and pull here.
2. **Then find 2 new ones yourself** that match Dev's taste. His board: dark matte phone wallpapers with a big empty sky and
   one quiet subject low down (night city with a few lit windows, plant silhouette, coastline with a line of surf, misty
   valleys, a lone snow peak, wildflowers or a small bouquet on black, the Chrome dino on a horizon), and for light mode warm
   interiors in window light (a vase with a sprig, a succulent, a desk), line-drawn mountains, a desert tree at sunset.
   Portrait, minimal, no text, no people, no logos. Use only images whose license allows this use (Unsplash or Pexels
   licence, public domain); never Pinterest pins, which are other people's uploads. Record the photographer and page in
   `--source` and `--url`. If those sites are blocked, say so in the brief and skip this step.
3. `python wallpapers/add.py IMAGE... [--name ...] [--source ...] [--url ...]` writes `wp_N.json` and updates `index.json`.
4. Upload each new `wp_N.json` and `index.json` with Artifact publish (`asset: true`, the dashboard url). Then one ArtifactData
   batch: `set datasets/wp_N` (`kind: file`, `fixed: true`, title "Wallpaper: <name>") and `update datasets/wallpapers` with the
   new `source.url` and `updated`. Commit `wallpapers/` and push.
5. Keep the rotation fresh: past 30 images per tone, remove the oldest you added yourself (never Dev's) from `index.json`.

Kite login: when live holdings fail, the page shows a **Log in to Kite** button (the connector's `login` link) and **Refresh**;
the card disappears once live holdings load. If only Kite's cash call fails, the status reads "Live · cash saved".

Risk counts every holding's stop, Exit verdicts included, until the shares are actually sold. Holdings without a stop are
listed as not counted. "Drop from best day" is time-weighted from `nav_history` (deposits and withdrawals removed).

## Hard rules
1. Never place, modify or cancel orders. Every output is a suggestion Dev executes in Kite.
2. Delivery (CNC) only. No F&O, leverage, intraday or MTF.
3. Risk: ≤2.5% of portfolio lost per idea at its stop; ≤8% across all open stops; no new ideas
   once the portfolio is 10% below its peak (`engine/rules.py`).
4. Never promise returns. Say "target", never "expected". Show the back-tested hit rate when one exists.
5. Wealth Desk is its own system. It borrows only the evidence-based rules from the AI India
   Portfolio event study (hard kills, do-not-chase, stops outside noise). It does not run the
   9-agent gauntlet or copy that project's structure.

## What runs when
`schedule` dataset tracks last run dates. Count trading days, not calendar days.

| Job | Cadence | Writes |
|---|---|---|
| Portfolio review | every 3 trading days | `portfolio_review`, snapshots, `notes` |
| Market review | every 3 trading days | `market_review`, `signals`, `catalysts`, `nifty_1y` |
| New opportunity | every 5 trading days | `opportunity`, appends to `trades` |
| Track ideas | every run | `trades` |
| P&L history | every run with Kite | appends a row to `nav_history`; adds detected sales to `pnl_ledger` |

Nothing due → update `trades` only and finish quietly.

## Procedure
1. **Kite.** Call `get_profile`. If it says to log in, call `login`, show Dev the warning and link,
   and continue with steps that don't need Kite. Resume Kite steps after Dev replies.
2. **Read state.** ArtifactData `list` on `datasets` (versions, file names). Read `schedule`,
   `trades`, `opportunity` files via Artifact `read` with `path` = asset id.
3. **Track.** For each open/proposed trade, `get_historical_data` since its date, save to
   `candles/<SYMBOL>.json`, run `python engine/track.py trades.json candles/`.
4. **Portfolio review (if due).** `get_holdings`, `get_mf_holdings`, `get_margins`, `get_gtts`,
   quotes + 1y history for each holding. For each holding: verdict Hold/Add/Trim/Exit,
   SL (outside noise: ~2×ATR or below the last swing low), TP, reason, GTT status.
   Apply the hard kills to existing holdings too (T/Z series, <₹20, illiquid → Exit).
   Respect one-time exclusions Dev asks for, only for that run.
5. **Market review (if due).** Index quotes + 1y Nifty; web search: FII/DII flows, crude, rupee,
   RBI/Fed, results calendar (next 14 days), tenders and order wins (defence, rail, power, infra).
   Verdict Risk-on / Neutral / Risk-off. Risk-off → next idea at half size or skipped.
6. **Opportunity (if due).**
   - `get_ohlc` on all of `engine/universe.csv` (one call) → `python engine/screen.py prefilter quotes.json`.
   - `get_historical_data` (260 days) for each prefiltered symbol and NIFTY 50 → `screen.py rank`.
   - Research the top 3 (results dates, news, filings, sector). Results inside 5 sessions → make
     the idea conditional on the post-results trigger. Pick one or none. Never force an idea.
   - Size it: `python engine/allocate.py state.json idea.json [size_factor]`.
   - Write `opportunity` (status Active or Conditional) and append to `trades` as `proposed`.
7. **P&L.** Append a `nav_history` row for every trading day since the last row (value each day from
   Kite daily closes), with `put_in` and `flow` as defined below. Compare today's holdings with `holdings_snap`: any quantity
   that fell is a sale. Record it in `pnl_ledger` with `get_trades` fill prices when the sale was today,
   otherwise the closing price that day with `estimated: true`.
8. **Publish.** For each changed file: Artifact publish (`asset: true`, the dashboard url), then
   ArtifactData `update` of `datasets/<id>` with `source.url`, `source.name`, `updated`,
   pinned with `if_version`. Refresh `*_snap` files from today's Kite answers.
9. **Commit** changed data files to `wealth-desk/data/` and push.
10. **Brief Dev.** Five lines: takeaway, actions to take in Kite, the idea (or why none), anything
   due within 2 days, dashboard link.

## File shapes
- `opportunity`: id, date, symbol, name, status, setup, trigger, entry, sl, tp, rr, qty, cost,
  risk_rs, risk_pct, reward_rs, time_stop, expires, funding, thesis, checks, confidence, backtest
- `trades`: id, date, symbol, entry, sl, tp, qty, status (proposed/open/tp/sl/time/cancelled), entered, exit_*, r, ret
- `portfolio_review`: symbol, verdict, action, sl, tp, keep_qty?, reason, gtt (Missing/Set/n/a)
- `market_review`: metric, value, change, read
- `schedule`: task, every_days, last, next
- `notes`: key/text rows: takeaway, brief_date
- `nav_history`: one row per trading day: date, value (holdings + net cash), put_in (cumulative money added), flow (cash added +, withdrawn −, that day), flow_note, estimated
  Flow = change in (cost of holdings + cash) − realised P&L booked that day.
- `pnl_ledger`: id, date, symbol, qty, buy_avg, sell_price, realised, estimated, note

## Back-test (control panel)
Runs on Dev's Mac where the data lives (`~/Desktop/AI-India-Data/market.duckdb`):
```
python engine/backtest.py inspect ~/Desktop/AI-India-Data/market.duckdb
python engine/backtest.py run ~/Desktop/AI-India-Data/market.duckdb --table <t> --symbol <c> --date <c> --series <c>
```
Writes `engine/calibrated.json` (picked up by `rules.py`) and `calibrated_report.json`.
Re-run quarterly or when the rules change.

## Routine prompt (paste into claude.ai → Routines, with the Zerodha Kite connector attached)
> Run the Wealth Desk. Clone github.com/Deo20050206/AI-Driven-CMO, check out branch
> claude/portfolio-audit-dashboard-e5c5kv, read wealth-desk/RUNBOOK.md and follow it exactly.
> Dashboard: https://claude.ai/artifact/TjJfTv5vmJEcF6s2arypnX. Never place orders.
