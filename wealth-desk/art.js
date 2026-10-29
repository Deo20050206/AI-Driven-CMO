// Wealth Desk daily wallpaper: a new matte scene every day, drawn in the page.
// Style from Dev's references: dark and quiet, a big empty sky, one scene low on the screen (city at night,
// plant silhouette, coastline with surf, misty peaks, the pixel dino on a horizon, a split panel with a thin gold arc).
// Mostly one tone with tiny highlights. The date picks the scene, tint and every detail, so it never repeats.
(function () {
  const TAU = Math.PI * 2, PI = Math.PI;
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  const P = (c) => { c.beginPath(); return c; };

  // Tone for the day: a hue barely tinting the greys (blue-slate, warm stone, moss, graphite, dusk)
  function tones(day, dark, r) {
    const h = pick(r, [215, 30, 150, 0, 260, 195, 45]), s = h === 0 ? 0 : 8 + r() * 8;
    return dark
      ? { h, skyTop: hsl(h, s, 8), skyLow: hsl(h, s + 4, 15), far: hsl(h, s, 13), mid: hsl(h, s, 10), near: hsl(h, s, 6.5), lit: 'rgba(236,232,222,', win: 'rgba(240,226,190,', grain: 'rgba(255,255,255,0.022)', gold: hsl(42, 55, 58) }
      : { h, skyTop: hsl(h, s + 6, 97), skyLow: hsl(h, s + 6, 91), far: hsl(h, s + 4, 87), mid: hsl(h, s + 3, 82), near: hsl(h, s + 2, 76), lit: 'rgba(46,42,36,', win: 'rgba(255,255,255,', grain: 'rgba(0,0,0,0.02)', gold: hsl(40, 50, 45) };
  }
  // Smooth 1-D noise for ridgelines
  function ridge(r, oct = 4) { const ph = Array.from({ length: oct }, () => r() * TAU), fr = Array.from({ length: oct }, (_, i) => (i + 1) * (1.5 + r())); return (x) => ph.reduce((s, p, i) => s + Math.sin(x * fr[i] * TAU + p) / (i + 1.4), 0) / 2.2; }
  const fillPoly = (c, pts, f) => { P(c).moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => c.lineTo(p[0], p[1])); c.closePath(); c.fillStyle = f; c.fill(); };

  // ---------- scenes: (c, W, H, T, r) ; horizon low on the screen ----------
  const SCENES = {
    city(c, W, H, T, r) {
      const base = H * (0.62 + r() * 0.08);
      [[T.mid, 0.16, 0.3], [T.near, 0.08, 0.2]].forEach(([col, minH, varH], layer) => {
        let x = -10;
        while (x < W + 10) {
          const w = 14 + r() * (layer ? 46 : 30), h = H * (minH + r() * varH) * (0.6 + 0.4 * Math.sin((x / W) * PI));
          c.fillStyle = col; c.fillRect(x, base - h + layer * H * 0.06, w + 1, H);
          if (r() > 0.85) c.fillRect(x + w / 2 - 1, base - h + layer * H * 0.06 - 14, 2, 14);
          if (layer) for (let wy = base - h + H * 0.06 + 6; wy < Math.min(H, base + H * 0.14); wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < 0.05) { c.fillStyle = T.win + (0.35 + r() * 0.4) + ')'; c.fillRect(wx, wy, 2.2, 1.6); c.fillStyle = col; }
          x += w + (r() > 0.7 ? 2 : 0);
        }
      });
    },
    plant(c, W, H, T, r) {
      const right = r() > 0.5, bx = right ? W * 0.82 : W * 0.15, n = 9 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const ang = -PI / 2 + (r() - 0.5) * 1.6, len = H * (0.22 + r() * 0.26), wid = 7 + r() * 9, x0 = bx + (r() - 0.5) * W * 0.18, y0 = H + 10;
        const tx = x0 + Math.cos(ang) * len, ty = y0 + Math.sin(ang) * len, bend = (r() - 0.5) * len * 0.5;
        P(c).moveTo(x0 - wid, y0); c.quadraticCurveTo((x0 + tx) / 2 + bend - wid, (y0 + ty) / 2, tx, ty); c.quadraticCurveTo((x0 + tx) / 2 + bend + wid, (y0 + ty) / 2, x0 + wid, y0); c.closePath(); c.fillStyle = i % 3 ? T.near : T.mid; c.fill();
        P(c).moveTo(x0 + wid * 0.8, y0); c.quadraticCurveTo((x0 + tx) / 2 + bend + wid * 0.8, (y0 + ty) / 2, tx, ty); c.lineWidth = 0.9; c.strokeStyle = hsl(65, 30, 50, 0.28); c.stroke();
      }
    },
    coast(c, W, H, T, r) {
      const n = ridge(r, 5), fromRight = r() > 0.35, edge = (t) => (fromRight ? W * (0.42 + t * 0.5) : W * (0.58 - t * 0.5)) + n(t * 1.3) * W * 0.06;
      const top = H * (0.52 + r() * 0.08);
      const sea = c.createLinearGradient(0, top, 0, H); sea.addColorStop(0, T.skyLow); sea.addColorStop(1, T.mid); c.fillStyle = sea; c.fillRect(0, top, W, H - top);
      const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([edge(t), H - t * (H - top)]); }
      fillPoly(c, [...pts, [fromRight ? W : 0, top - H * 0.04], [fromRight ? W : 0, H]], T.near);
      for (let k = 0; k < 3; k++) { P(c); pts.forEach(([x, y], i) => { const t = i / 40, off = (fromRight ? -1 : 1) * (2 + k * 5) * (1 - t) * (1 + r() * 0.6); i ? c.lineTo(x + off, y) : c.moveTo(x + off, y); }); c.lineWidth = (1 - k * 0.25) * 2; c.strokeStyle = T.lit + (0.4 - k * 0.12) + ')'; c.stroke(); }
    },
    peaks(c, W, H, T, r) {
      const base = H * (0.66 + r() * 0.06), n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const px = W * (i + 0.5) / n + (r() - 0.5) * W * 0.15, ph = H * (0.12 + r() * 0.14), pw = W * (0.25 + r() * 0.2);
        fillPoly(c, [[px - pw / 2, base], [px, base - ph], [px + pw / 2, base]], i % 2 ? T.mid : T.far);
        fillPoly(c, [[px, base - ph], [px + pw * 0.08, base - ph * 0.55], [px - pw * 0.05, base - ph * 0.3], [px + pw * 0.2, base], [px + pw / 2, base]], T.near);
      }
      c.fillStyle = T.near; c.fillRect(0, base, W, H - base);
      for (let x = -6; x < W + 6; x += 6 + r() * 8) { const h = 8 + r() * 14; fillPoly(c, [[x - h * 0.35, base + 1], [x, base - h], [x + h * 0.35, base + 1]], T.near); }
    },
    ridges(c, W, H, T, r) {
      const layers = 4 + Math.floor(r() * 2), cols = [T.far, T.mid, T.mid, T.near, T.near];
      if (r() > 0.4) { P(c).arc(W * (0.2 + r() * 0.6), H * (0.42 + r() * 0.08), 10 + r() * 8, 0, TAU); c.fillStyle = T.lit + '0.5)'; c.fill(); }
      for (let L = 0; L < layers; L++) {
        const n = ridge(r), y0 = H * (0.56 + L * 0.06), amp = H * (0.06 - L * 0.008);
        P(c).moveTo(0, H); for (let x = 0; x <= W; x += 4) c.lineTo(x, y0 - n(x / W) * amp); c.lineTo(W, H); c.closePath(); c.fillStyle = cols[L]; c.fill();
      }
    },
    dino(c, W, H, T, r) {
      const y = Math.round(H * (0.74 + r() * 0.06)), px = 2.4, ink = T.lit + '0.7)';
      c.fillStyle = T.lit + '0.35)'; c.fillRect(0, y, W, 1);
      for (let x = 0; x < W; x += 6 + r() * 30) c.fillRect(x, y + 3 + r() * 6, 2 + r() * 3, 1);
      const D = ['00000011110', '00000110111', '00000111111', '00000111000', '10001111110', '11011111000', '11111111000', '01111110000', '00111110000', '00011010000', '00010010000', '00011011000'];
      const dx = W * (0.12 + r() * 0.1); c.fillStyle = ink;
      D.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') c.fillRect(dx + i * px, y - (D.length - j) * px, px, px); }));
      let cx = dx + W * 0.18; while (cx < W - 20) { const h = 14 + r() * 10, n = r() > 0.6 ? 2 + Math.floor(r() * 2) : 1; for (let k = 0; k < n; k++) { const x = cx + k * 8; c.fillRect(x, y - h, 3, h); c.fillRect(x - 4, y - h * 0.65, 3, h * 0.3); c.fillRect(x - 4, y - h * 0.4, 5, 2); c.fillRect(x + 4, y - h * 0.8, 3, h * 0.35); c.fillRect(x + 2, y - h * 0.5, 4, 2); } cx += 50 + r() * W * 0.25; }
    },
    split(c, W, H, T, r) {
      const sx = W * (0.42 + r() * 0.16), left = r() > 0.5;
      const x0 = left ? 0 : sx, x1 = left ? sx : W;
      const g = c.createLinearGradient(0, 0, 0, H * 0.6); g.addColorStop(0, T.far); g.addColorStop(1, T.skyLow); c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, H * 0.62);
      const n = ridge(r), hz = H * (0.52 + r() * 0.05);
      P(c).moveTo(x0, H); for (let x = x0; x <= x1; x += 3) c.lineTo(x, hz - Math.abs(n(x / W)) * H * 0.05); c.lineTo(x1, H); c.closePath(); c.fillStyle = T.mid; c.fill();
      for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? T.near : T.mid; c.fillRect(x0, hz + H * 0.06 + k * H * 0.035, x1 - x0, H * 0.02); }
      const R = W * (0.18 + r() * 0.08), cx = sx + (left ? R * 0.35 : -R * 0.35), cy = hz + H * 0.04;
      P(c).arc(cx, cy, R, left ? PI * 0.55 : -PI * 0.45, left ? PI * 1.6 : PI * 0.6, false); c.lineWidth = 1.2; c.strokeStyle = T.gold; c.stroke();
    },
    seaMoon(c, W, H, T, r) {
      const hz = H * (0.6 + r() * 0.08), mx = W * (0.25 + r() * 0.5), my = hz - H * (0.12 + r() * 0.1), R = 9 + r() * 10;
      c.fillStyle = T.mid; c.fillRect(0, hz, W, H - hz);
      P(c).arc(mx, my, R, 0, TAU); c.fillStyle = T.lit + '0.6)'; c.fill();
      for (let y = hz + 4; y < H * 0.95; y += 5 + (y - hz) * 0.05) { const w = R * (1.2 + r() * 1.5) * (1 + (y - hz) / H * 2); c.fillStyle = T.lit + (0.28 * (1 - (y - hz) / (H - hz))) + ')'; c.fillRect(mx - w / 2 + (r() - 0.5) * 6, y, w, 1.4); }
    },
    pines(c, W, H, T, r) {
      [[T.mid, 0.66, 0.1], [T.near, 0.74, 0.14]].forEach(([col, by, hh]) => {
        const base = H * (by + r() * 0.04); c.fillStyle = col; c.fillRect(0, base, W, H);
        for (let x = -8; x < W + 8; x += 5 + r() * 9) { const h = H * hh * (0.4 + r() * 0.7), w = h * 0.32; for (let k = 0; k < 4; k++) fillPoly(c, [[x - w * (1 - k * 0.18), base - h * k * 0.22 + 1], [x, base - h * (0.4 + k * 0.2)], [x + w * (1 - k * 0.18), base - h * k * 0.22 + 1]], col); }
      });
    },
    lonelyTree(c, W, H, T, r) {
      const hx = W * (0.3 + r() * 0.4), base = H * 0.78;
      P(c).moveTo(0, H); c.lineTo(0, base + 20); c.quadraticCurveTo(hx, base - H * 0.06, W, base + 30); c.lineTo(W, H); c.closePath(); c.fillStyle = T.near; c.fill();
      const ty = base - H * 0.035; c.strokeStyle = T.near; c.lineCap = 'round';
      const br = (x, y, len, a, d) => { if (!d) return; const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; P(c).moveTo(x, y); c.lineTo(ex, ey); c.lineWidth = d * 1.1; c.stroke(); br(ex, ey, len * 0.72, a - 0.35 - r() * 0.3, d - 1); br(ex, ey, len * 0.72, a + 0.35 + r() * 0.3, d - 1); };
      br(hx, ty + 4, H * 0.05, -PI / 2, 7);
      if (r() > 0.5) { c.fillStyle = T.lit + '0.6)'; c.fillRect(W * (0.1 + r() * 0.8), base + 12, 2, 2); }
    },
    wires(c, W, H, T, r) {
      const y = H * (0.5 + r() * 0.1), poles = [W * (0.15 + r() * 0.1), W * (0.85 - r() * 0.1)];
      c.fillStyle = T.near; poles.forEach((x) => { c.fillRect(x - 2, y - 10, 4, H); c.fillRect(x - 18, y - 4, 36, 3); });
      for (let k = 0; k < 3; k++) { P(c).moveTo(-10, y + k * 8 - 12); c.quadraticCurveTo(poles[0] / 2, y + k * 8 + 6, poles[0] - 16 + k * 16, y - 2); c.quadraticCurveTo(W / 2, y + 40 + k * 6, poles[1] - 16 + k * 16, y - 2); c.quadraticCurveTo((poles[1] + W) / 2, y + k * 8 + 6, W + 10, y + k * 8 - 12); c.lineWidth = 1; c.strokeStyle = T.near; c.stroke(); }
      const nb = 2 + Math.floor(r() * 5); for (let i = 0; i < nb; i++) { const bx = W * (0.35 + r() * 0.3), by = y + 30 - 4; P(c).ellipse(bx, by, 3.5, 3, 0, 0, TAU); c.fillStyle = T.near; c.fill(); P(c).arc(bx + 3, by - 3, 2, 0, TAU); c.fill(); }
      c.fillStyle = T.near; c.fillRect(0, H * 0.86, W, H);
    },
    words(c, W, H, T, r) {
      // a word scattered as letters, joined in reading order by soft arrows
      const word = pick(r, ['DISCIPLINE', 'PATIENCE', 'COMPOUND', 'CONVICTION', 'CLARITY', 'PROCESS', 'STILLNESS', 'MOMENTUM', 'DISTRACTION', 'CONSISTENCY', 'FOCUS']);
      const pts = []; let tries = 0;
      while (pts.length < word.length && tries++ < 3000) { const x = W * (0.14 + r() * 0.72), y = H * (0.46 + r() * 0.3); if (pts.every(([a, b]) => Math.hypot(a - x, b - y) > Math.min(W, H) * 0.09)) pts.push([x, y]); }
      c.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d, sg = r() > 0.5 ? 1 : -1;
        const sx = x0 + ux * 14, sy = y0 + uy * 14, ex = x1 - ux * 15, ey = y1 - uy * 15, mx = (sx + ex) / 2 - uy * d * 0.3 * sg, my = (sy + ey) / 2 + ux * d * 0.3 * sg;
        P(c).moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.lineWidth = 1.1; c.strokeStyle = T.lit + '0.38)'; c.stroke();
        const a = Math.atan2(ey - my, ex - mx); P(c).moveTo(ex, ey); c.lineTo(ex - Math.cos(a - 0.4) * 6, ey - Math.sin(a - 0.4) * 6); c.lineTo(ex - Math.cos(a + 0.4) * 6, ey - Math.sin(a + 0.4) * 6); c.closePath(); c.fillStyle = T.lit + '0.38)'; c.fill();
      }
      pts.forEach(([x, y], i) => { c.fillStyle = T.lit + '0.8)'; c.fillText(word[i], x, y); });
    },
    windowLight(c, W, H, T, r, dark) {
      // a quiet wall: window light falling across it, a vase with a sprig and its shadow, a few books
      const wall = c.createLinearGradient(0, 0, W, H);
      wall.addColorStop(0, dark ? hsl(30, 8, 13) : hsl(34, 22, 86)); wall.addColorStop(1, dark ? hsl(30, 8, 9) : hsl(32, 18, 79)); c.fillStyle = wall; c.fillRect(0, 0, W, H);
      const lightCol = dark ? 'rgba(200,205,220,0.07)' : 'rgba(255,248,236,0.55)', sk = 0.55 + r() * 0.3, ox = -W * (0.1 + r() * 0.2), oy = H * (0.18 + r() * 0.1), pw = W * 0.26, ph = H * 0.17, gap = W * 0.035;
      c.save(); if ('filter' in c) c.filter = 'blur(10px)';
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = ox + i * (pw + gap), y = oy + j * (ph + gap); fillPoly(c, [[x, y + x * 0 ], [x + pw, y + pw * sk], [x + pw, y + pw * sk + ph], [x, y + ph]], lightCol); }
      c.restore();
      const table = H * 0.88; c.fillStyle = dark ? hsl(30, 8, 15) : hsl(34, 20, 90); c.fillRect(0, table, W, H - table);
      const vx = W * (0.6 + r() * 0.1), vw = W * 0.11, vh = H * 0.13, vy = table - vh;
      const sprig = (bx, by, col, scale, blur) => { c.save(); if (blur && 'filter' in c) c.filter = 'blur(3px)'; c.strokeStyle = col; c.lineWidth = 1.2; c.lineCap = 'round';
        [[-0.25, 0.9], [0.05, 1.15], [0.3, 0.8]].forEach(([a, k], b) => { const ex = bx + Math.sin(a) * H * 0.16 * k * scale, ey = by - Math.cos(a) * H * 0.16 * k * scale; P(c).moveTo(bx, by); c.quadraticCurveTo(bx + (ex - bx) * 0.3, by + (ey - by) * 0.6, ex, ey); c.stroke();
          for (let t = 0.3; t < 1; t += 0.14) { const lx = bx + (ex - bx) * t, ly = by + (ey - by) * t, s = t * 2 % 2 > 1 ? 1 : -1; c.save(); c.translate(lx, ly); c.rotate(a + s * 1.0); P(c).ellipse(0, -5 * scale, 2.6 * scale, 6 * scale, 0, 0, TAU); c.fillStyle = col; c.fill(); c.restore(); } }); c.restore(); };
      sprig(vx + W * 0.09, vy + H * 0.02, dark ? 'rgba(0,0,0,0.35)' : 'rgba(80,70,55,0.18)', 1, true);
      const vg = c.createLinearGradient(vx - vw / 2, 0, vx + vw / 2, 0); vg.addColorStop(0, dark ? hsl(35, 10, 30) : hsl(38, 25, 92)); vg.addColorStop(1, dark ? hsl(35, 8, 20) : hsl(36, 18, 82));
      P(c).moveTo(vx - vw * 0.18, vy); c.lineTo(vx - vw * 0.18, vy + vh * 0.12); c.quadraticCurveTo(vx - vw / 2, vy + vh * 0.2, vx - vw / 2, vy + vh * 0.45); c.lineTo(vx - vw / 2, vy + vh - 6); c.quadraticCurveTo(vx - vw / 2, vy + vh, vx - vw / 2 + 6, vy + vh); c.lineTo(vx + vw / 2 - 6, vy + vh); c.quadraticCurveTo(vx + vw / 2, vy + vh, vx + vw / 2, vy + vh - 6); c.lineTo(vx + vw / 2, vy + vh * 0.45); c.quadraticCurveTo(vx + vw / 2, vy + vh * 0.2, vx + vw * 0.18, vy + vh * 0.12); c.lineTo(vx + vw * 0.18, vy); c.closePath(); c.fillStyle = vg; c.fill();
      sprig(vx, vy + 2, dark ? hsl(90, 10, 38) : hsl(100, 12, 30), 1, false);
      const bx = vx + vw * 0.75; [0, 1, 2].forEach((k) => { c.fillStyle = dark ? hsl(35, 6, 22 + k * 3) : hsl(36, 14, 93 - k * 3); c.fillRect(bx + (r() - 0.5) * 6, table - (k + 1) * H * 0.016, W * 0.3, H * 0.015); });
    },
  };
  const NAMES = Object.keys(SCENES);

  function paint(c, W, H, VH, day, dark) {
    const r = rng(day * 2654435761 + 7), T = tones(day, dark, r);
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, T.skyTop); sky.addColorStop(0.7, T.skyLow); sky.addColorStop(1, T.skyLow);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    if (dark && r() > 0.5) for (let i = 0; i < 40; i++) { c.fillStyle = T.lit + (0.08 + r() * 0.25) + ')'; c.fillRect(r() * W, r() * H * 0.5, 1, 1); }
    // walk a fixed shuffle, so every scene shows once before any repeats; each cycle reshuffles
    const cyc = Math.floor(day / NAMES.length), order = NAMES.slice(), rs = rng(cyc * 7919 + 3);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const name = order[day % NAMES.length];
    SCENES[name](c, W, H, T, r, dark);
    // paper grain, like a matte print
    c.fillStyle = T.grain; for (let i = 0; i < (W * H) / 260; i++) c.fillRect(r() * W, r() * H, 1, 1);
    return { scene: name };
  }
  window.wdArt = { paint, scenes: NAMES };
})();
