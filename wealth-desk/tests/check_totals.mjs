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
process.exit(failed ? 1 : 0);
