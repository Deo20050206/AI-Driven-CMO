// Wealth Desk daily art: a generator, not a library of pictures.
// Each date seeds one composition: a vibrant palette (golden-angle hue walk, so no two days match),
// one hero element, a soft shape behind it and a few small accents. Theme-aware, static, no network.
(function () {
  const TAU = Math.PI * 2;
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // OKLCH → sRGB, so colours stay equally vivid around the hue wheel on every device
  function oklch(L, C, h, a = 1) {
    const hr = (h * Math.PI) / 180, A = C * Math.cos(hr), B = C * Math.sin(hr);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    const g = lin.map((v) => { v = Math.min(Math.max(v, 0), 1); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)); });
    return `rgba(${g[0]},${g[1]},${g[2]},${a})`;
  }
  const SCHEMES = [[0, 35, 70], [0, 180, 150], [0, 120, 240], [0, 150, 210], [0, 30, 200], [0, -40, 140]];
  function palette(day, dark, r) {
    const h0 = (day * 137.508 + 20) % 360, sch = SCHEMES[day % SCHEMES.length];
    const hs = sch.map((d) => (h0 + d + 360) % 360);
    const L = dark ? [0.7, 0.6, 0.66] : [0.74, 0.62, 0.8], C = dark ? 0.16 : 0.17;
    return {
      a: oklch(L[0], C, hs[0]), b: oklch(L[1], C + 0.02, hs[1]), c: oklch(L[2], C - 0.02, hs[2]),
      deep: oklch(dark ? 0.5 : 0.45, 0.14, hs[0]),
      pale: oklch(dark ? 0.36 : 0.92, dark ? 0.08 : 0.06, hs[1]), clear: oklch(dark ? 0.36 : 0.92, dark ? 0.08 : 0.06, hs[1], 0),
      ink: dark ? 'rgba(240,236,228,1)' : 'rgba(34,32,28,1)', bg: dark ? 'rgb(30,29,27)' : 'rgb(250,249,245)',
    };
  }

  // ---------- drawing helpers ----------
  const P = (c) => { c.beginPath(); return c; };
  const disc = (c, x, y, r, f) => { P(c).arc(x, y, r, 0, TAU); c.fillStyle = f; c.fill(); };
  const ring = (c, x, y, r, w, s, a0 = 0, a1 = TAU) => { P(c).arc(x, y, r, a0, a1); c.lineWidth = w; c.strokeStyle = s; c.lineCap = 'round'; c.stroke(); };
  const rr = (c, x, y, w, h, rad, f) => { P(c).roundRect(x, y, w, h, rad); c.fillStyle = f; c.fill(); };
  const line = (c, pts, w, s, dash) => { P(c); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.lineWidth = w; c.strokeStyle = s; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
  const tri = (c, x, y, s, ang, f) => { c.save(); c.translate(x, y); c.rotate(ang); P(c).moveTo(0, -s); c.lineTo(s * 0.87, s * 0.5); c.lineTo(-s * 0.87, s * 0.5); c.closePath(); c.fillStyle = f; c.fill(); c.restore(); };
  const sparkle = (c, x, y, s, f) => { P(c).moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fillStyle = f; c.fill(); };
  const squiggle = (c, x, y, len, amp, n, ang, s, w) => { c.save(); c.translate(x, y); c.rotate(ang); P(c).moveTo(0, 0); for (let i = 1; i <= n; i++) c.quadraticCurveTo(((i - 0.5) / n) * len, i % 2 ? -amp : amp, (i / n) * len, 0); c.lineWidth = w; c.strokeStyle = s; c.lineCap = 'round'; c.stroke(); c.restore(); };
  const leaf = (c, x, y, len, wid, ang, f) => { c.save(); c.translate(x, y); c.rotate(ang); P(c).moveTo(0, 0); c.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.8, len, 0); c.bezierCurveTo(len * 0.75, wid * 0.8, len * 0.3, wid, 0, 0); c.fillStyle = f; c.fill(); c.restore(); };
  const blob = (c, x, y, rad, r, f) => {
    const n = 7, pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * TAU, k = rad * (0.82 + r() * 0.3); pts.push([x + Math.cos(t) * k, y + Math.sin(t) * k]); }
    P(c); for (let i = 0; i <= n; i++) { const p0 = pts[i % n], p1 = pts[(i + 1) % n], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(p0[0], p0[1], mx, my); }
    c.closePath(); c.fillStyle = f; c.fill();
  };
  const grad = (c, x0, y0, x1, y1, a, b) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  // A small character: round head, capsule body, two-segment limbs
  function person(c, x, y, s, body, head, pose) {
    const lw = s * 0.17; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = body; c.lineWidth = lw;
    const limb = (ox, oy, a1, a2, l) => { const mx = ox + Math.cos(a1) * l, my = oy + Math.sin(a1) * l; P(c).moveTo(ox, oy); c.lineTo(mx, my); c.lineTo(mx + Math.cos(a2) * l, my + Math.sin(a2) * l); c.stroke(); };
    limb(x, y + s * 0.55, pose[0], pose[1], s * 0.42); limb(x, y + s * 0.55, pose[2], pose[3], s * 0.42);
    rr(c, x - s * 0.21, y - s * 0.16, s * 0.42, s * 0.8, s * 0.21, body);
    c.strokeStyle = body; limb(x, y, pose[4], pose[5], s * 0.34); limb(x, y, pose[6], pose[7], s * 0.34);
    disc(c, x, y - s * 0.43, s * 0.23, head);
  }
  const PI = Math.PI;
  const POSES = {
    cheer: [PI * 0.6, PI * 0.5, PI * 0.4, PI * 0.5, -PI * 0.7, -PI * 0.6, -PI * 0.3, -PI * 0.4],
    walk: [PI * 0.65, PI * 0.5, PI * 0.25, PI * 0.55, -PI * 0.3, -PI * 0.4, PI * 0.75, PI * 0.6],
    reach: [PI * 0.55, PI * 0.5, PI * 0.45, PI * 0.5, -PI * 0.35, -PI * 0.45, PI * 0.7, PI * 0.55],
    sit: [PI * 0.08, PI * 0.5, PI * 0.02, PI * 0.45, PI * 0.15, -PI * 0.35, PI * 0.35, PI * 0.1],
  };

  // ---------- hero elements: each draws centred on (x, y), about u across ----------
  const HEROES = {
    sun(c, x, y, u, C, r) { disc(c, x, y, u * 0.34, grad(c, x, y - u * 0.34, x, y + u * 0.34, C.a, C.b)); const n = 10 + Math.floor(r() * 6); for (let i = 0; i < n; i++) { const t = (i / n) * TAU; line(c, [x + Math.cos(t) * u * 0.45, y + Math.sin(t) * u * 0.45, x + Math.cos(t) * u * 0.58, y + Math.sin(t) * u * 0.58], u * 0.04, C.c); } },
    moon(c, x, y, u, C, r) {
      const R = u * 0.38, R2 = R * 0.88, dx = R * (0.45 + r() * 0.2), dy = -dx * 0.6, d = Math.hypot(dx, dy), a = (R * R - R2 * R2 + d * d) / (2 * d), h = Math.sqrt(Math.max(R * R - a * a, 0));
      const bx = (a * dx) / d, by = (a * dy) / d, px = (-dy / d) * h, py = (dx / d) * h, phi = Math.atan2(dy, dx);
      const t1 = Math.atan2(by + py, bx + px), t2 = Math.atan2(by - py, bx - px), s1 = Math.atan2(by + py - dy, bx + px - dx), s2 = Math.atan2(by - py - dy, bx - px - dx);
      const through = (a0, a1, mid) => { const n = (t) => ((t % TAU) + TAU) % TAU, span = n(a1 - a0); return n(mid - a0) < span ? false : true; };
      P(c); c.arc(x, y, R, t1, t2, through(t1, t2, phi + PI)); c.arc(x + dx, y + dy, R2, s2, s1, through(s2, s1, phi + PI));
      c.closePath(); c.fillStyle = grad(c, x - R, y, x + R, y, C.a, C.b); c.fill(); sparkle(c, x + R * 1.1, y + R * 0.6, u * 0.07, C.c); disc(c, x + R * 0.9, y - R * 0.9, u * 0.025, C.c); },
    planet(c, x, y, u, C, r) { const R = u * 0.28, t = -0.35 + r() * 0.2; c.save(); c.translate(x, y); c.rotate(t); P(c).ellipse(0, 0, u * 0.5, u * 0.12, 0, PI, TAU); c.lineWidth = u * 0.05; c.strokeStyle = C.c; c.stroke(); c.restore(); disc(c, x, y, R, grad(c, x - R, y - R, x + R, y + R, C.a, C.b)); c.save(); c.translate(x, y); c.rotate(t); P(c).ellipse(0, 0, u * 0.5, u * 0.12, 0, 0, PI); c.lineWidth = u * 0.05; c.strokeStyle = C.c; c.stroke(); c.restore(); disc(c, x - u * 0.45, y - u * 0.35, u * 0.04, C.b); },
    arch(c, x, y, u, C) { const w = u * 0.56, h = u * 0.8; P(c).moveTo(x - w / 2, y + h / 2); c.lineTo(x - w / 2, y - h / 2 + w / 2); c.arc(x, y - h / 2 + w / 2, w / 2, PI, 0); c.lineTo(x + w / 2, y + h / 2); c.closePath(); c.fillStyle = grad(c, x, y - h / 2, x, y + h / 2, C.a, C.b); c.fill(); disc(c, x, y - h * 0.05, u * 0.12, C.c); rr(c, x - w * 0.7, y + h / 2, w * 1.4, u * 0.035, u * 0.02, C.deep); },
    mountains(c, x, y, u, C) { disc(c, x + u * 0.15, y - u * 0.18, u * 0.14, C.c); tri(c, x - u * 0.12, y + u * 0.08, u * 0.36, 0, C.b); tri(c, x + u * 0.18, y + u * 0.14, u * 0.28, 0, C.a); line(c, [x + u * 0.18, y - u * 0.14, x + u * 0.18, y - u * 0.34, x + u * 0.3, y - u * 0.3, x + u * 0.18, y - u * 0.26], u * 0.025, C.deep); },
    waves(c, x, y, u, C) { const R = u * 0.42; c.save(); P(c).arc(x, y, R, 0, TAU); c.clip(); c.fillStyle = C.pale; c.fillRect(x - R, y - R, 2 * R, 2 * R); disc(c, x + R * 0.25, y - R * 0.25, R * 0.28, C.c); [C.a, C.b, C.deep].forEach((col, i) => { const yy = y + R * (0.05 + i * 0.3); P(c).moveTo(x - R, yy); for (let k = 0; k < 4; k++) c.quadraticCurveTo(x - R + (k + 0.5) * R / 2, yy - R * 0.16, x - R + (k + 1) * R / 2, yy); c.lineTo(x + R, y + R); c.lineTo(x - R, y + R); c.closePath(); c.fillStyle = col; c.fill(); }); c.restore(); },
    steps(c, x, y, u, C) { const n = 4, sw = u * 0.2, sh = u * 0.13, x0 = x - n * sw / 2, y0 = y + u * 0.3; for (let i = 0; i < n; i++) rr(c, x0 + i * sw, y0 - (i + 1) * sh, sw + 1, (i + 1) * sh, 3, i % 2 ? C.a : C.b); const cx = x0 + (n - 0.5) * sw, cy = y0 - n * sh - u * 0.12; disc(c, cx, cy, u * 0.09, C.c); ring(c, cx, cy, u * 0.055, u * 0.018, C.deep); person(c, x0 + sw * 1.5, y0 - 2 * sh - u * 0.2, u * 0.2, C.deep, C.c, POSES.walk); },
    figure(c, x, y, u, C, r) { const pose = pick(r, ['cheer', 'reach', 'walk']); disc(c, x, y + u * 0.42, u * 0.42, C.pale); person(c, x, y - u * 0.02, u * 0.36, C.b, C.a, POSES[pose]); if (pose !== 'walk') { disc(c, x - u * 0.3, y - u * 0.4, u * 0.08, C.c); line(c, [x - u * 0.3, y - u * 0.32, x - u * 0.12, y - u * 0.05], u * 0.012, C.deep); } },
    sitter(c, x, y, u, C) { const R = u * 0.4; P(c).arc(x, y + u * 0.3, R, PI, TAU); c.closePath(); c.fillStyle = grad(c, x - R, y, x + R, y, C.a, C.b); c.fill(); person(c, x - u * 0.05, y + u * 0.3 - R - u * 0.22, u * 0.3, C.deep, C.c, POSES.sit); sparkle(c, x + u * 0.35, y - u * 0.35, u * 0.07, C.c); },
    kite(c, x, y, u, C, r) { const s = u * 0.32, t = -0.25 + r() * 0.2; c.save(); c.translate(x, y - u * 0.1); c.rotate(t); P(c).moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, s * 1.2); c.lineTo(-s * 0.7, 0); c.closePath(); c.fillStyle = C.a; c.fill(); P(c).moveTo(0, -s); c.lineTo(s * 0.7, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = C.b; c.fill(); P(c).moveTo(0, s * 1.2); c.lineTo(-s * 0.7, 0); c.lineTo(0, 0); c.closePath(); c.fillStyle = C.b; c.fill(); c.restore(); squiggle(c, x + Math.sin(t) * -s * 1.1, y - u * 0.1 + s * 1.15, u * 0.5, u * 0.05, 4, 1.9, C.deep, u * 0.015); [0.3, 0.55, 0.8].forEach((k) => tri(c, x - u * 0.12 * k, y + u * (0.3 + k * 0.35), u * 0.04, k * 3, C.c)); },
    plane(c, x, y, u, C) { c.save(); c.translate(x, y); c.rotate(-0.35); P(c).moveTo(u * 0.4, 0); c.lineTo(-u * 0.35, -u * 0.22); c.lineTo(-u * 0.12, 0); c.closePath(); c.fillStyle = C.a; c.fill(); P(c).moveTo(u * 0.4, 0); c.lineTo(-u * 0.12, 0); c.lineTo(-u * 0.25, u * 0.2); c.closePath(); c.fillStyle = C.b; c.fill(); c.restore(); P(c).moveTo(x - u * 0.2, y + u * 0.12); c.bezierCurveTo(x - u * 0.5, y + u * 0.3, x - u * 0.7, y + u * 0.05, x - u * 0.95, y + u * 0.25); c.lineWidth = u * 0.018; c.strokeStyle = C.deep; c.setLineDash([u * 0.04, u * 0.05]); c.lineCap = 'round'; c.stroke(); c.setLineDash([]); },
    birds(c, x, y, u, C) { disc(c, x + u * 0.1, y, u * 0.3, C.pale); [[0, 0, 1], [-0.28, 0.15, 0.7], [0.25, -0.22, 0.6]].forEach(([dx, dy, k], i) => { const bx = x + dx * u, by = y + dy * u, w = u * 0.2 * k; P(c).moveTo(bx - w, by); c.quadraticCurveTo(bx - w / 2, by - w * 0.6, bx, by); c.quadraticCurveTo(bx + w / 2, by - w * 0.6, bx + w, by); c.lineWidth = u * 0.03; c.strokeStyle = i ? C.b : C.deep; c.lineCap = 'round'; c.stroke(); }); },
    sprig(c, x, y, u, C, r) { P(c).moveTo(x - u * 0.1, y + u * 0.45); c.bezierCurveTo(x - u * 0.15, y + u * 0.1, x + u * 0.1, y - u * 0.15, x + u * 0.05, y - u * 0.45); c.lineWidth = u * 0.03; c.strokeStyle = C.deep; c.lineCap = 'round'; c.stroke(); for (let i = 0; i < 6; i++) { const t = i / 6, px = x - u * 0.1 + t * u * 0.12, py = y + u * 0.4 - t * u * 0.8; leaf(c, px, py, u * (0.22 - t * 0.08), u * 0.06, i % 2 ? -0.5 : PI + 0.5, [C.a, C.b, C.c][i % 3]); } disc(c, x + u * 0.05, y - u * 0.47, u * 0.05, C.c); },
    balloon(c, x, y, u, C) { const R = u * 0.3, by = y - u * 0.1; c.save(); P(c).arc(x, by, R, PI * 0.85, PI * 0.15); c.quadraticCurveTo(x + R * 0.5, by + R * 1.2, x, by + R * 1.35); c.quadraticCurveTo(x - R * 0.5, by + R * 1.2, x - R * Math.cos(PI * 0.15), by + R * Math.sin(PI * 0.15)); c.closePath(); c.clip(); c.fillStyle = C.a; c.fillRect(x - R, by - R, 2 * R, 2.5 * R); c.fillStyle = C.b; c.fillRect(x - R * 0.2, by - R, R * 0.4, 2.5 * R); c.fillStyle = C.c; c.fillRect(x - R, by - R, R * 0.35, 2.5 * R); c.fillRect(x + R * 0.65, by - R, R * 0.35, 2.5 * R); c.restore(); line(c, [x - R * 0.35, by + R * 1.3, x - R * 0.2, by + R * 1.7], u * 0.012, C.deep); line(c, [x + R * 0.35, by + R * 1.3, x + R * 0.2, by + R * 1.7], u * 0.012, C.deep); rr(c, x - R * 0.24, by + R * 1.68, R * 0.48, R * 0.3, R * 0.06, C.deep); },
    sail(c, x, y, u, C) { tri(c, x - u * 0.02, y - u * 0.05, u * 0.32, -0.52, C.a); tri(c, x + u * 0.16, y + u * 0.02, u * 0.2, 0.52, C.b); P(c).moveTo(x - u * 0.38, y + u * 0.2); c.lineTo(x + u * 0.38, y + u * 0.2); c.quadraticCurveTo(x + u * 0.3, y + u * 0.36, x, y + u * 0.36); c.quadraticCurveTo(x - u * 0.3, y + u * 0.36, x - u * 0.38, y + u * 0.2); c.fillStyle = C.deep; c.fill(); squiggle(c, x - u * 0.55, y + u * 0.45, u * 1.1, u * 0.03, 8, 0, C.c, u * 0.025); disc(c, x + u * 0.38, y - u * 0.35, u * 0.09, C.c); },
    rocket(c, x, y, u, C) { c.save(); c.translate(x, y); c.rotate(0.6); const w = u * 0.2, h = u * 0.62; P(c).moveTo(0, -h / 2); c.quadraticCurveTo(w, -h * 0.2, w * 0.7, h * 0.3); c.lineTo(-w * 0.7, h * 0.3); c.quadraticCurveTo(-w, -h * 0.2, 0, -h / 2); c.fillStyle = C.a; c.fill(); tri(c, -w * 0.8, h * 0.28, w * 0.45, 0.4, C.b); tri(c, w * 0.8, h * 0.28, w * 0.45, -0.4, C.b); disc(c, 0, -h * 0.1, w * 0.32, C.pale); ring(c, 0, -h * 0.1, w * 0.32, w * 0.1, C.deep); P(c).moveTo(-w * 0.4, h * 0.32); c.quadraticCurveTo(0, h * 0.8, w * 0.4, h * 0.32); c.fillStyle = C.c; c.fill(); c.restore(); [[-0.4, -0.3], [0.3, -0.42], [-0.15, 0.42]].forEach(([dx, dy]) => sparkle(c, x + dx * u, y + dy * u, u * 0.05, C.c)); },
    cloud(c, x, y, u, C) { disc(c, x + u * 0.18, y - u * 0.16, u * 0.18, C.c); const f = C.pale; disc(c, x - u * 0.18, y + u * 0.02, u * 0.15, f); disc(c, x + u * 0.02, y - u * 0.06, u * 0.21, f); disc(c, x + u * 0.22, y + u * 0.04, u * 0.13, f); rr(c, x - u * 0.33, y + u * 0.02, u * 0.68, u * 0.15, u * 0.075, f); [-0.2, 0, 0.2].forEach((dx, i) => line(c, [x + dx * u, y + u * 0.28, x + dx * u - u * 0.04, y + u * 0.4], u * 0.03, i % 2 ? C.a : C.b)); },
    summit(c, x, y, u, C) { tri(c, x, y + u * 0.08, u * 0.42, 0, grad(c, x, y - u * 0.4, x, y + u * 0.3, C.a, C.b)); line(c, [x, y - u * 0.34, x, y - u * 0.62], u * 0.025, C.deep); P(c).moveTo(x, y - u * 0.62); c.lineTo(x + u * 0.2, y - u * 0.55); c.lineTo(x, y - u * 0.48); c.closePath(); c.fillStyle = C.c; c.fill(); },
    growth(c, x, y, u, C) { disc(c, x, y, u * 0.42, C.pale); line(c, [x - u * 0.28, y + u * 0.18, x - u * 0.08, y - u * 0.02, x + u * 0.04, y + u * 0.08, x + u * 0.26, y - u * 0.18], u * 0.06, C.a); P(c).moveTo(x + u * 0.3, y - u * 0.22); c.lineTo(x + u * 0.12, y - u * 0.2); c.lineTo(x + u * 0.28, y - u * 0.04); c.closePath(); c.fillStyle = C.a; c.fill(); [0, 1, 2].forEach((i) => rr(c, x - u * 0.25 + i * u * 0.16, y + u * 0.28 - (i + 1) * u * 0.06, u * 0.1, (i + 1) * u * 0.06, u * 0.02, i === 2 ? C.b : C.c)); },
    cactus(c, x, y, u, C) { rr(c, x - u * 0.08, y - u * 0.4, u * 0.16, u * 0.6, u * 0.08, C.a); rr(c, x - u * 0.28, y - u * 0.2, u * 0.12, u * 0.26, u * 0.06, C.a); rr(c, x - u * 0.28, y + u * 0.0, u * 0.24, u * 0.1, u * 0.05, C.a); rr(c, x + u * 0.16, y - u * 0.3, u * 0.12, u * 0.22, u * 0.06, C.a); rr(c, x + u * 0.04, y - u * 0.12, u * 0.24, u * 0.1, u * 0.05, C.a); disc(c, x, y - u * 0.42, u * 0.05, C.c); P(c).moveTo(x - u * 0.2, y + u * 0.18); c.lineTo(x + u * 0.2, y + u * 0.18); c.lineTo(x + u * 0.15, y + u * 0.42); c.lineTo(x - u * 0.15, y + u * 0.42); c.closePath(); c.fillStyle = C.b; c.fill(); },
    orbit(c, x, y, u, C, r) { [0.2, 0.32, 0.44].forEach((k, i) => ring(c, x, y, u * k, u * 0.012, i === 1 ? C.b : C.deep, r() * TAU, r() * TAU + PI * 1.4)); disc(c, x, y, u * 0.11, grad(c, x - u * 0.1, y - u * 0.1, x + u * 0.1, y + u * 0.1, C.a, C.b)); [[0.2, 0.7], [0.32, 2.4], [0.44, 4.1]].forEach(([k, t], i) => disc(c, x + Math.cos(t + r()) * u * k, y + Math.sin(t + r()) * u * k, u * (0.03 + i * 0.01), [C.c, C.a, C.b][i])); },
    coins(c, x, y, u, C) { for (let i = 0; i < 5; i++) { P(c).ellipse(x - u * 0.12, y + u * 0.3 - i * u * 0.07, u * 0.2, u * 0.06, 0, 0, TAU); c.fillStyle = i % 2 ? C.a : C.b; c.fill(); } disc(c, x + u * 0.2, y - u * 0.15, u * 0.15, C.c); ring(c, x + u * 0.2, y - u * 0.15, u * 0.09, u * 0.025, C.deep); sparkle(c, x + u * 0.42, y - u * 0.35, u * 0.07, C.a); },
  };
  const HERO_NAMES = Object.keys(HEROES);

  // ---------- accents ----------
  const ACCENTS = [
    (c, x, y, u, C, r) => disc(c, x, y, u * (0.03 + r() * 0.03), pick(r, [C.a, C.b, C.c])),
    (c, x, y, u, C, r) => ring(c, x, y, u * 0.06, u * 0.018, pick(r, [C.a, C.b, C.c])),
    (c, x, y, u, C, r) => sparkle(c, x, y, u * 0.06, pick(r, [C.a, C.c])),
    (c, x, y, u, C, r) => squiggle(c, x, y, u * 0.26, u * 0.03, 4, r() * 1.2 - 0.6, pick(r, [C.a, C.b]), u * 0.022),
    (c, x, y, u, C, r) => tri(c, x, y, u * 0.045, r() * TAU, pick(r, [C.b, C.c])),
    (c, x, y, u, C, r) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) disc(c, x + i * u * 0.06, y + j * u * 0.06, u * 0.012, C.deep); },
    (c, x, y, u, C, r) => { line(c, [x - u * 0.05, y, x + u * 0.05, y], u * 0.02, pick(r, [C.a, C.b])); line(c, [x, y - u * 0.05, x, y + u * 0.05], u * 0.02, pick(r, [C.a, C.b])); },
  ];

  // ---------- one day's composition ----------
  // W×H: canvas in CSS px; VH: the first screen's height (art stays within it); day: integer day number
  function paint(c, W, H, VH, day, dark) {
    const r = rng(day * 2654435761 + 97), C = palette(day, dark, r);
    c.clearRect(0, 0, W, H);
    const u = Math.min(Math.max(W * 0.44, 160), 300);          // hero: under half a phone wide, capped on desktop
    const hx = W - u * (0.3 + r() * 0.08), hy = u * (0.3 + r() * 0.08);  // tucked into the top-right corner, partly off the edge
    c.globalAlpha = dark ? 0.9 : 0.95;

    // the soft shape behind the hero
    const back = r();
    const bc = grad(c, hx - u, hy - u, hx + u, hy + u, C.pale, C.clear);
    if (back < 0.3) disc(c, hx + u * 0.15, hy - u * 0.05, u * 0.75, bc);
    else if (back < 0.55) blob(c, hx + u * 0.1, hy, u * 0.72, r, bc);
    else if (back < 0.75) { c.save(); c.translate(hx + u * 0.1, hy); c.rotate((r() - 0.5) * 0.5); rr(c, -u * 0.62, -u * 0.62, u * 1.24, u * 1.24, u * 0.3, bc); c.restore(); }
    else disc(c, hx + u * 0.2, hy - u * 0.2, u * 0.85, bc);

    // the hero element
    const name = HERO_NAMES[(day * 7 + Math.floor(r() * 5)) % HERO_NAMES.length];
    HEROES[name](c, hx, hy, u, C, r);

    // accents around the hero
    const nA = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nA; i++) { const t = PI * (0.35 + r() * 0.4), d = u * (0.6 + r() * 0.3); pick(r, ACCENTS)(c, Math.max(W * 0.66, hx + Math.cos(t) * d), Math.max(u * 0.1, hy + Math.sin(t) * d * 0.8), u * 0.8, C, r); }
    // fade the art out where the page's text runs (left side and lower down), keep it vivid at the corner
    c.globalAlpha = 1; c.globalCompositeOperation = 'destination-out';
    const fx = c.createLinearGradient(0, 0, W * 0.75, 0); fx.addColorStop(0, 'rgba(0,0,0,0.88)'); fx.addColorStop(0.55, 'rgba(0,0,0,0.6)'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = fx; c.fillRect(0, 0, W, VH);
    const fy = c.createLinearGradient(0, u * 0.6, 0, u * 1.3); fy.addColorStop(0, 'rgba(0,0,0,0)'); fy.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = fy; c.fillRect(0, u * 0.6, W, VH);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = dark ? 0.9 : 0.95;
    c.globalAlpha = 1;
    return { hero: name, hue: Math.round((day * 137.508 + 20) % 360) };
  }

  window.wdArt = { paint, heroes: HERO_NAMES };
})();
