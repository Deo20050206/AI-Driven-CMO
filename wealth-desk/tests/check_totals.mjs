// Regression test for the portfolio total. Run before publishing index.html:  node wealth-desk/tests/check_totals.mjs
// It loads the page's calculations with a stub `dash`, feeds real Kite-shaped cases, and checks the main total
// against the independent value check and a hand-worked expected figure.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];   // the first script: loaders and calculations
const calcs = {}, loaders = {};
const dash = { calc: (id, o) => (calcs[id] = o), loader: (id, o) => (loaders[id] = o) };
new Function('dash', script)(dash);
const run = (id, data) => calcs[id].fn(...calcs[id].inputs.map((i) => (i in data ? data[i] : calcs[i] ? run(i, data) : [])));

const cases = [
  {
    name: 'Nov 9: same-day sell of part of a holding, two same-day buys, SIP units, T1 shares',
    expected: 132187,
    data: {
      holdings: [
        { tradingsymbol: 'A1L', quantity: 3600, t1_quantity: 0, used_quantity: 1400, average_price: 5.1, last_price: 5.09, close_price: 5.12 },
        { tradingsymbol: 'GOLDBEES', quantity: 54, t1_quantity: 0, average_price: 117.641481, last_price: 116.77, close_price: 116.6 },
        { tradingsymbol: 'GOLDCASE', quantity: 253, t1_quantity: 0, average_price: 23.610948, last_price: 22.25, close_price: 22.16 },
        { tradingsymbol: 'JIOFIN', quantity: 24, t1_quantity: 0, average_price: 231.933333, last_price: 228, close_price: 230 },
        { tradingsymbol: 'JPL', quantity: 12, t1_quantity: 0, average_price: 1119, last_price: 1410, close_price: 1421.7 },
        { tradingsymbol: 'UNIMECH', quantity: 11, t1_quantity: 0, average_price: 1599.577272, last_price: 1798.6, close_price: 1809.4 },
      ],
      kite_positions: [
        { symbol: 'A1L', exchange: 'BSE', product: 'CNC', quantity: -1400, average_price: 5.05655, last_price: 5.09, close_price: 5.12 },
        { symbol: 'KPITTECH', exchange: 'NSE', product: 'CNC', quantity: 25, average_price: 539.25, last_price: 539.25, close_price: 543.9 },
        { symbol: 'TORNTPOWER', exchange: 'NSE', product: 'CNC', quantity: 15, average_price: 1231.8933, last_price: 1233.2, close_price: 1274.2 },
        { symbol: 'TATASTEEL', exchange: 'NSE', product: 'MIS', quantity: 0, pnl: 240, buy_quantity: 100, sell_quantity: 100, last_price: 151 },
      ],
      mf_holdings: [{ tradingsymbol: 'INF0R8F01216', quantity: 2849.12, average_price: 10.002591, last_price: 9.6488 }],
      margins: [{ segment: 'equity', cash: 25161.8, net: 281.32, debits: 24880.48 }],
      classify: [],
    },
  },
  {
    name: 'T1 shares only (bought yesterday), no trades today',
    expected: 17 * 1658 + 1000,
    data: {
      holdings: [{ tradingsymbol: 'UNIMECH', quantity: 0, t1_quantity: 17, average_price: 1599.4, last_price: 1658, close_price: 1638 }],
      kite_positions: [], mf_holdings: [], margins: [{ net: 1000 }], classify: [],
    },
  },
];

let failed = 0;
for (const c of cases) {
  const total = run('totals_LLLL', c.data)[0].value, check = run('value_check_LLLL', c.data)[0].value;
  const ok = Math.abs(total - c.expected) < 1 && Math.abs(check - c.expected) < 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: main ${total.toFixed(2)}, check ${check.toFixed(2)}, expected ${c.expected}`);
  if (!ok) failed++;
}

// ---------------- Auditor's additions (Nov 9 live Kite answers) ----------------
// Every check below is worked out from Kite's own fields, not from the page's maths.
const near = (a, b, tol = 1) => Math.abs(a - b) < tol;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ': ' + detail : ''}`); if (!ok) failed++; };
const LIVE = {
  holdings: [
    { tradingsymbol: 'A1L', quantity: 3600, t1_quantity: 0, used_quantity: 1400, opening_quantity: 5000, average_price: 5.1, last_price: 5.08, close_price: 5.12, pnl: -72, day_change: -0.04 },
    { tradingsymbol: 'GOLDBEES', quantity: 54, t1_quantity: 0, used_quantity: 0, average_price: 117.641481, last_price: 116.83, close_price: 116.6, pnl: -43.819974, day_change: 0.23 },
    { tradingsymbol: 'GOLDCASE', quantity: 253, t1_quantity: 0, used_quantity: 0, average_price: 23.610948, last_price: 22.26, close_price: 22.16, pnl: -341.789844, day_change: 0.1 },
    { tradingsymbol: 'JIOFIN', quantity: 24, t1_quantity: 0, used_quantity: 0, average_price: 231.933333, last_price: 227.9, close_price: 230, pnl: -96.799992, day_change: -2.1 },
    { tradingsymbol: 'JPL', quantity: 12, t1_quantity: 0, used_quantity: 0, average_price: 1119, last_price: 1409.9, close_price: 1421.7, pnl: 3490.8, day_change: -11.8 },
    { tradingsymbol: 'UNIMECH', quantity: 11, t1_quantity: 0, used_quantity: 0, average_price: 1599.577272, last_price: 1799.9, close_price: 1809.4, pnl: 2203.550008, day_change: -9.5 },
  ],
  kite_positions: [
    { symbol: 'A1L', exchange: 'BSE', product: 'CNC', quantity: -1400, average_price: 5.05655, last_price: 5.08, close_price: 5.12, pnl: -32.83, realised: 0, unrealised: -32.83, buy_quantity: 0, sell_quantity: 1400, buy_price: 0, sell_price: 5.05655 },
    { symbol: 'KPITTECH', exchange: 'NSE', product: 'CNC', quantity: 25, average_price: 539.25, last_price: 539.2, close_price: 543.9, pnl: -1.25, realised: 0, unrealised: -1.25, buy_quantity: 25, sell_quantity: 0, buy_price: 539.25, sell_price: 0 },
    { symbol: 'TORNTPOWER', exchange: 'NSE', product: 'CNC', quantity: 15, average_price: 1231.8933333, last_price: 1231.1, close_price: 1274.2, pnl: -11.9, realised: 0, unrealised: -11.9, buy_quantity: 15, sell_quantity: 0, buy_price: 1231.8933333, sell_price: 0 },
  ],
  mf_holdings: [{ tradingsymbol: 'INF0R8F01216', quantity: 2849.12, average_price: 10.002591, last_price: 9.6488, pnl: 0 }],
  margins: [{ segment: 'equity', cash: 25161.8, net: 281.32, debits: 24880.48 }],
  // live GTTs (get_gtts): lower trigger = stop
  gtts: [
    { tradingsymbol: 'TORNTPOWER', stop: 1134, qty: 15 }, { tradingsymbol: 'KPITTECH', stop: 497, qty: 25 },
    { tradingsymbol: 'UNIMECH', stop: 1700, qty: 11 }, { tradingsymbol: 'JIOFIN', stop: 196, qty: 24 }, { tradingsymbol: 'JPL', stop: 1378.9, qty: 12 },
  ],
  classify: JSON.parse(readFileSync(new URL('../data/v2/classify.json', import.meta.url), 'utf8')),
};
const file = (n) => JSON.parse(readFileSync(new URL(`../data/v2/${n}.json`, import.meta.url), 'utf8'));
const D = { ...LIVE, portfolio_review: file('portfolio_review'), opportunity: file('opportunity'), pnl_ledger: file('pnl_ledger'), trades: file('trades'), nav_history: file('nav_history') };

// Independent figures straight from Kite fields
const buys = D.kite_positions.filter((p) => p.product === 'CNC' && p.quantity > 0);
const sells = D.kite_positions.filter((p) => p.product === 'CNC' && p.quantity < 0);
const avgOf = (s) => D.holdings.find((h) => h.tradingsymbol === s).average_price;
const closeOf = (s) => D.holdings.find((h) => h.tradingsymbol === s).close_price;
const mfPnl = D.mf_holdings.reduce((a, f) => a + f.quantity * (f.last_price - f.average_price), 0);
const kUnreal = D.holdings.reduce((a, h) => a + h.pnl, 0) + buys.reduce((a, p) => a + p.pnl, 0) + mfPnl;           // 4118.80
const kToday = D.holdings.reduce((a, h) => a + h.day_change * (h.quantity + h.t1_quantity), 0)
  + buys.reduce((a, p) => a + p.quantity * (p.last_price - p.average_price), 0)
  + sells.reduce((a, p) => a + -p.quantity * (p.average_price - closeOf(p.symbol)), 0);                                // −504.76
const kRealisedToday = sells.reduce((a, p) => a + -p.quantity * (p.average_price - avgOf(p.symbol)), 0);              // −60.83

const T = run('totals_LLLL', D)[0], S = run('pnl_sum_LLL', D)[0], P = run('positions_LLL', D), R = run('risk_LLLL', D);
check('Invariant: value check agrees', near(T.value, run('value_check_LLLL', D)[0].value, 2), `${T.value.toFixed(2)}`);
check('Invariant: weights sum to 100%', near(P.reduce((a, r) => a + r.weight, 0), 1, 1e-9));
check('Invariant: unrealised = Σ Kite holdings pnl + today\'s buys pnl + MF derived', near(S.unrealised, kUnreal), `page ${S.unrealised.toFixed(2)}, Kite ${kUnreal.toFixed(2)}`);
check('Invariant: P&L = value − cost (per row)', P.every((r) => near(r.pnl, r.value - r.invested, 0.01)));
check("Today's P&L includes the same-day sell vs previous close", near(T.day_pnl, kToday), `page ${T.day_pnl.toFixed(2)}, Kite ${kToday.toFixed(2)}`);

const ledgerA1L = D.pnl_ledger.filter((r) => r.symbol === 'A1L' && r.date === '2026-11-09').reduce((a, r) => a + r.realised, 0);
check('Realised: today\'s A1L sale matches Kite fills (1,400 × (5.05655 − 5.10))', near(ledgerA1L, kRealisedToday, 0.05), `ledger ${ledgerA1L}, Kite ${kRealisedToday.toFixed(2)}`);
const missing = D.trades.filter((t) => ['tp', 'sl', 'time'].includes(t.status) && !D.pnl_ledger.some((r) => r.symbol === t.symbol && r.date === t.exit_date));
check('Realised: every closed trade has a ledger row', !missing.length, missing.map((t) => `${t.symbol} ${t.exit_date} ≈ ${inrRound((t.exit_price - t.entry) * t.qty)}`).join(', '));
function inrRound(v) { return 'Rs ' + Math.round(v); }

// Risk budget: every holding with a live GTT, current qty, stop from get_gtts, measured from last price
const ltp = Object.fromEntries(P.map((r) => [r.symbol, r.ltp]));
const kRisk = D.gtts.reduce((a, g) => a + Math.max(ltp[g.tradingsymbol] - g.stop, 0) * g.qty, 0);                      // 4748.0
const held = R.filter((r) => r.kind === 'holding' && r.risk > 0);
check('Risk: newly bought KPITTECH (GTT stop 497) is counted', held.some((r) => r.symbol === 'KPITTECH' && near(r.risk, 1055)), held.map((r) => r.symbol).join(','));
check('Risk: a held stock is never shown as "idea, if bought"', !R.some((r) => r.kind === 'idea, if bought' && ltp[r.symbol]), R.filter((r) => r.kind === 'idea, if bought').map((r) => r.symbol).join(','));
check('Risk: a review stop without a GTT is flagged as a warning', R.some((r) => r.symbol === 'A1L' && r.kind === 'no GTT' && r.risk === 0));
check('Risk: A1L has no live GTT, so its review stop 4.69 is not counted as protection', !held.some((r) => r.symbol === 'A1L'));
check('Risk: total of live-GTT stops', near(held.reduce((a, r) => a + r.risk, 0), kRisk), `page ${R.filter((r) => r.risk > 0).reduce((a, r) => a + r.risk, 0).toFixed(2)}, Kite ${kRisk.toFixed(2)}`);

// Scorecard: R is worked out from prices, not typed in
const st = run('track_stats', D)[0];
const closed = D.trades.filter((t) => ['tp', 'sl', 'time'].includes(t.status));
const kR = closed.reduce((a, t) => a + (t.exit_price - t.entry) / (t.entry - t.sl), 0) / closed.length;               // −1.17
check('Scorecard: average R from entry/stop/exit', near(st.avg_r, kR, 0.005), `page ${st.avg_r.toFixed(2)}R, from prices ${kR.toFixed(2)}R`);

// Opportunity card: reward:risk shown must follow the levels
const o = D.opportunity[0], rr = (o.tp - o.entry) / (o.entry - o.sl);
check('Ticket: reward:risk matches its levels', near(o.rr, rr, 0.01), `file ${o.rr}, levels ${rr.toFixed(2)}`);

// Today's trades line: a sale shows its realised P&L vs average cost, not Kite's mark vs LTP
const ui = html.match(/<script>[\s\S]*?<\/script>[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
const pnlExpr = ui.match(/function todaysTrades\(\)[\s\S]*?const pnl = ([^;]+);/)[1];
const hAvg = Object.fromEntries(D.holdings.map((h) => [h.tradingsymbol, h.average_price]));
const lineP = new Function('p', 'hAvg', 'return ' + pnlExpr)({ ...sells[0] }, hAvg);
check("Today's trades: A1L sale line = realised vs cost", near(lineP, kRealisedToday, 0.05), `line ${lineP}, realised ${kRealisedToday.toFixed(2)}`);

// Value history: the live point's P&L (value − money put in) must match the page's own P&L.
// Fails while put_in is frozen at Oct 29: the Rs 5,000 SIP (2,340 → 2,849 units) and later deposits count as gain.
const nav = [...D.nav_history].sort((a, b) => (a.date < b.date ? -1 : 1)), lastNav = nav[nav.length - 1];
const unitsThen = file('mf_snap')[0].quantity, sip = D.mf_holdings[0].quantity * D.mf_holdings[0].average_price - unitsThen * file('mf_snap')[0].average_price;
check('History: SIP units are recorded as a deposit', nav.some((r) => r.date > '2026-11-03' && r.flow >= sip - 1), `SIP ≈ ${Math.round(sip)}, last nav row ${lastNav.date}`);
check('History: live value − put_in ≈ unrealised + realised', near(T.value - lastNav.put_in, S.total, 2500), `value − put_in ${(T.value - lastNav.put_in).toFixed(0)}, P&L ${S.total.toFixed(0)}`);

process.exit(failed ? 1 : 0);
