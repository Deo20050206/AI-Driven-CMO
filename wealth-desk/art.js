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
    valley(c, W, H, T, r, dark) {
      // slopes folding in from both sides, mist pooling between them, one thin road winding up the valley
      const n = 6, sky = dark ? [8, 30] : [92, 40];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), L = dark ? 14 - t * 9 : 84 - t * 62, col = hsl(T.h, 14, L), fromLeft = i % 2 === 0, y0 = H * (0.5 + t * 0.32), slope = 0.35 + r() * 0.25;
        P(c); if (fromLeft) { c.moveTo(-10, y0 - W * slope * 0.2); c.quadraticCurveTo(W * 0.35, y0 - H * 0.02, W * (0.65 + r() * 0.3), y0 + W * slope * 0.55); c.lineTo(-10, H); }
        else { c.moveTo(W + 10, y0 - W * slope * 0.2); c.quadraticCurveTo(W * 0.65, y0 - H * 0.02, W * (0.35 - r() * 0.3), y0 + W * slope * 0.55); c.lineTo(W + 10, H); }
        c.closePath(); c.fillStyle = col; c.fill();
        // mist: the next ridge fades in softly from the haze above it
        const fog = c.createLinearGradient(0, y0 - H * 0.04, 0, y0 + H * 0.06); fog.addColorStop(0, hsl(T.h, 14, dark ? 12 : 90, dark ? 0.35 : 0.6)); fog.addColorStop(1, hsl(T.h, 14, dark ? 12 : 90, 0));
        c.save(); c.clip(); c.fillStyle = fog; c.fillRect(0, y0 - H * 0.04, W, H * 0.1); c.restore();
      }
      P(c).moveTo(W * 0.42, H * 0.86); c.bezierCurveTo(W * 0.6, H * 0.82, W * 0.5, H * 0.77, W * 0.8, H * 0.72); c.lineWidth = 1.1; c.strokeStyle = T.lit + (dark ? '0.3)' : '0.5)'); c.stroke();
    },
    succulent(c, W, H, T, r, dark) {
      // warm wall, sun falling through in diagonal bands, a potted succulent on a ledge
      const wall = c.createLinearGradient(0, 0, W, H); wall.addColorStop(0, dark ? hsl(28, 10, 12) : hsl(32, 40, 90)); wall.addColorStop(1, dark ? hsl(28, 8, 8) : hsl(28, 30, 82)); c.fillStyle = wall; c.fillRect(0, 0, W, H);
      c.save(); if ('filter' in c) c.filter = 'blur(6px)';
      const beam = dark ? 'rgba(210,200,180,0.05)' : 'rgba(255,236,205,0.6)', sh = dark ? 'rgba(0,0,0,0.25)' : 'rgba(150,110,80,0.14)', a = -0.55 - r() * 0.2;
      c.translate(W * 0.5, H * 0.4); c.rotate(a); c.fillStyle = beam; c.fillRect(-W * 1.5, -H * 0.06, W * 3, H * 0.32); c.fillStyle = sh; c.fillRect(-W * 1.5, H * 0.02, W * 3, H * 0.018); c.fillRect(-W * 1.5, H * 0.17, W * 3, H * 0.012); c.restore();
      const ledge = H * 0.88; c.fillStyle = dark ? hsl(28, 10, 15) : hsl(30, 30, 85); c.fillRect(0, ledge, W, H - ledge);
      const px = W * (0.6 + r() * 0.15), pw = W * 0.24, ph = H * 0.08, py = ledge - ph;
      for (let i = 0; i < 11; i++) { const ang = -PI / 2 + (i - 5) * 0.2 + (r() - 0.5) * 0.08, len = H * (0.06 + (1 - Math.abs(i - 5) / 5) * 0.07); const tx = px + Math.cos(ang) * len * 1.3, ty = py + Math.sin(ang) * len * 1.3;
        P(c).moveTo(px - 6, py + 2); c.quadraticCurveTo((px + tx) / 2 - 4, (py + ty) / 2, tx, ty); c.quadraticCurveTo((px + tx) / 2 + 4, (py + ty) / 2, px + 6, py + 2); c.closePath(); c.fillStyle = dark ? hsl(100, 10, 22 + (i % 3) * 3) : hsl(95, 18, 42 + (i % 3) * 6); c.fill(); }
      P(c).moveTo(px - pw / 2, py); c.lineTo(px + pw / 2, py); c.quadraticCurveTo(px + pw / 2, py + ph, px, py + ph); c.quadraticCurveTo(px - pw / 2, py + ph, px - pw / 2, py); c.closePath(); c.fillStyle = dark ? hsl(30, 8, 26) : hsl(36, 30, 94); c.fill();
    },
    inkPeaks(c, W, H, T, r, dark) {
      // fine-line mountains with hatching, a thin arc of sun behind the tallest peak, drifting snow lines
      const ink = dark ? 'rgba(230,226,216,0.55)' : 'rgba(40,44,52,0.7)', base = H * (0.78 + r() * 0.04), peaks = [];
      for (let i = 0; i < 5; i++) peaks.push([W * (i + 0.5) / 5 + (r() - 0.5) * W * 0.1, base - H * (0.06 + r() * (i === 2 ? 0.12 : 0.08))]);
      const top = peaks.reduce((m, p) => (p[1] < m[1] ? p : m));
      P(c).arc(top[0], top[1] + H * 0.03, W * 0.2, PI * 1.05, PI * 1.95); c.lineWidth = 1; c.strokeStyle = ink; c.stroke();
      peaks.forEach(([x, y], i) => {
        const w = W * (0.22 + r() * 0.1); P(c).moveTo(x - w, base); c.lineTo(x, y); c.lineTo(x + w, base); c.closePath(); c.fillStyle = T.skyLow; c.fill(); c.lineWidth = 1; c.strokeStyle = ink; c.stroke();
        c.save(); P(c).moveTo(x, y); c.lineTo(x + w, base); c.lineTo(x + w * 0.1, base); c.closePath(); c.clip(); c.lineWidth = 0.5; for (let k = -H; k < H; k += 3.2) { P(c).moveTo(x - w, y + k); c.lineTo(x + w, y + k - w * 0.9); c.strokeStyle = ink; c.stroke(); } c.restore();
        P(c).moveTo(x, y); c.lineTo(x + w * 0.12, y + (base - y) * 0.5); c.lineTo(x + w * 0.05, base); c.lineWidth = 0.8; c.strokeStyle = ink; c.stroke();
      });
      c.fillStyle = T.skyLow; c.fillRect(0, base, W, H - base);
      for (let k = 0; k < 5; k++) { const y = base + 8 + k * (H - base) / 5; P(c).moveTo(-10, y); c.bezierCurveTo(W * 0.3, y - 10 - r() * 10, W * 0.6, y + 8, W + 10, y - 6); c.lineWidth = 0.8; c.strokeStyle = ink; c.stroke(); }
    },
    desertTree(c, W, H, T, r, dark) {
      // a soft sunset over pale sand, distant hills, one bare tree, ripples in the sand
      const sky = c.createLinearGradient(0, 0, W * 0.3, H * 0.75);
      if (dark) { sky.addColorStop(0, hsl(230, 14, 9)); sky.addColorStop(0.7, hsl(20, 22, 16)); sky.addColorStop(1, hsl(32, 35, 24)); }
      else { sky.addColorStop(0, hsl(40, 25, 95)); sky.addColorStop(0.55, hsl(20, 60, 88)); sky.addColorStop(0.85, hsl(38, 85, 78)); }
      c.fillStyle = sky; c.fillRect(0, 0, W, H);
      c.save(); if ('filter' in c) c.filter = 'blur(18px)'; for (let i = 0; i < 4; i++) { P(c).ellipse(W * (0.3 + r() * 0.7), H * (0.3 + r() * 0.35), W * (0.4 + r() * 0.3), H * 0.035, -0.15, 0, TAU); c.fillStyle = dark ? 'rgba(120,90,80,0.12)' : 'rgba(225,175,165,0.35)'; c.fill(); } c.restore();
      const hz = H * (0.76 + r() * 0.03), n = ridge(r, 3);
      P(c).moveTo(0, hz); for (let x = 0; x <= W; x += 4) c.lineTo(x, hz - Math.max(0, n(x / W)) * H * 0.04); c.lineTo(W, hz); c.closePath(); c.fillStyle = dark ? hsl(25, 12, 18) : hsl(25, 20, 74); c.fill();
      c.fillStyle = dark ? hsl(30, 12, 14) : hsl(32, 22, 86); c.fillRect(0, hz, W, H - hz);
      for (let y = hz + 8; y < H; y += 7 + (y - hz) * 0.08) { P(c).moveTo(-10, y); for (let x = 0; x <= W + 10; x += 24) c.quadraticCurveTo(x + 6, y - 2 - r() * 2, x + 12, y); c.lineWidth = 0.8; c.strokeStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(120,95,70,0.14)'; c.stroke(); }
      const tx = W * (0.55 + r() * 0.2), ink = dark ? hsl(25, 15, 6) : hsl(20, 15, 18); c.strokeStyle = ink; c.lineCap = 'round';
      const br = (x, y, len, a, d) => { if (d <= 0) return; const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; P(c).moveTo(x, y); c.lineTo(ex, ey); c.lineWidth = Math.max(0.5, d * 0.7); c.stroke(); br(ex, ey, len * 0.74, a - 0.3 - r() * 0.35, d - 1); br(ex, ey, len * 0.74, a + 0.3 + r() * 0.35, d - 1); if (d < 4 && r() > 0.5) br(ex, ey, len * 0.6, a + (r() - 0.5), d - 2); };
      br(tx, hz + 2, H * 0.06, -PI / 2, 8);
    },
    wildflowers(c, W, H, T, r, dark) {
      // thin stems rising from below, small pale flowers and buds, almost lost in the dark
      const ink = dark ? 'rgba(160,170,140,0.5)' : 'rgba(90,100,80,0.55)', petal = dark ? 'rgba(236,232,220,0.85)' : 'rgba(255,255,255,0.95)', ctr = dark ? 'rgba(210,190,120,0.9)' : 'rgba(190,160,80,0.9)';
      const bx = W * (0.15 + r() * 0.5), n = 9 + Math.floor(r() * 6);
      for (let i = 0; i < n; i++) {
        const x0 = bx + (r() - 0.5) * W * 0.3, tx = x0 + (r() - 0.5) * W * 0.35, ty = H * (0.42 + r() * 0.4);
        P(c).moveTo(x0, H + 5); c.quadraticCurveTo(x0 + (tx - x0) * 0.2, (H + ty) / 2, tx, ty); c.lineWidth = 0.9; c.strokeStyle = ink; c.stroke();
        if (r() > 0.35) { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; P(c).ellipse(tx + Math.cos(a) * 4, ty + Math.sin(a) * 2.6, 3, 1.4, a, 0, TAU); c.fillStyle = petal; c.fill(); } P(c).arc(tx, ty, 2.2, 0, TAU); c.fillStyle = ctr; c.fill(); }
        else { P(c).arc(tx, ty, 2.6, 0, TAU); c.fillStyle = petal; c.fill(); }
      }
    },
    lonePeak(c, W, H, T, r, dark) {
      // one snow peak floating in the middle of an empty field, lit from the left
      const x = W * (0.45 + r() * 0.1), y = H * (0.52 + r() * 0.06), w = W * (0.38 + r() * 0.08), h = H * (0.12 + r() * 0.04);
      const snow = dark ? 'rgba(225,228,232,0.85)' : 'rgba(255,255,255,0.95)', rock = dark ? hsl(T.h, 6, 16) : hsl(T.h, 8, 62), shade = dark ? hsl(T.h, 6, 10) : hsl(T.h, 8, 48);
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rock); g.addColorStop(1, dark ? hsl(T.h, 6, 9, 0) : hsl(T.h, 8, 80, 0));
      fillPoly(c, [[x - w, y + h], [x - w * 0.35, y + h * 0.35], [x - w * 0.2, y + h * 0.45], [x, y], [x + w * 0.28, y + h * 0.4], [x + w * 0.42, y + h * 0.3], [x + w, y + h]], g);
      fillPoly(c, [[x, y], [x + w * 0.28, y + h * 0.4], [x + w * 0.1, y + h * 0.9], [x + w * 0.05, y + h * 0.4]], shade);
      fillPoly(c, [[x, y], [x - w * 0.12, y + h * 0.3], [x - w * 0.04, y + h * 0.26], [x - w * 0.02, y + h * 0.4], [x + w * 0.06, y + h * 0.22], [x + w * 0.1, y + h * 0.15]], snow);
      fillPoly(c, [[x - w * 0.35, y + h * 0.35], [x - w * 0.45, y + h * 0.5], [x - w * 0.3, y + h * 0.45]], snow);
      fillPoly(c, [[x + w * 0.42, y + h * 0.3], [x + w * 0.36, y + h * 0.42], [x + w * 0.48, y + h * 0.38]], snow);
      for (let k = 0; k < 7; k++) { const sx = x - w * 0.5 + r() * w, sy = y + h * (0.45 + r() * 0.3); P(c).moveTo(sx, sy); c.lineTo(sx + (r() - 0.3) * w * 0.15, sy + h * 0.25); c.lineWidth = 0.8; c.strokeStyle = snow.replace(/[\d.]+\)$/, '0.35)'); c.stroke(); }
    },
    blinds(c, W, H, T, r, dark) {
      // a pale wall with window light broken into soft panes, a desk edge, a laptop corner and a glass
      c.fillStyle = dark ? hsl(40, 3, 12) : hsl(40, 6, 86); c.fillRect(0, 0, W, H);
      c.save(); if ('filter' in c) c.filter = 'blur(8px)';
      const col = dark ? 'rgba(220,220,210,0.05)' : 'rgba(255,255,255,0.55)', ox = W * (0.05 + r() * 0.2), sk = -0.25 - r() * 0.2;
      c.translate(ox, 0); c.transform(1, sk, 0, 1, 0, 0);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) if (r() > 0.15) { c.fillStyle = col; c.fillRect(i * W * 0.28, H * 0.05 + j * H * 0.11, W * 0.2, H * 0.085); }
      c.restore();
      const desk = H * 0.86; P(c).moveTo(0, desk); c.lineTo(W, desk + 6); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = dark ? hsl(40, 3, 16) : hsl(40, 6, 92); c.fill();
      fillPoly(c, [[W * 0.42, desk - H * 0.02], [W * 0.95, desk - H * 0.03], [W * 0.95, desk - H * 0.0], [W * 0.42, desk + 2]], dark ? hsl(0, 0, 5) : hsl(0, 0, 14));
      fillPoly(c, [[-4, desk - H * 0.1], [W * 0.18, desk - H * 0.11], [W * 0.21, desk + 4], [-4, desk + 6]], dark ? hsl(220, 4, 24) : hsl(220, 6, 96));
      const gx = W * (0.6 + r() * 0.1), gw = W * 0.06, gh = H * 0.06; c.fillStyle = dark ? 'rgba(200,200,200,0.12)' : 'rgba(255,255,255,0.6)'; c.fillRect(gx, desk - gh + 4, gw, gh);
      c.fillStyle = dark ? 'rgba(140,105,80,0.5)' : 'rgba(160,120,90,0.55)'; c.fillRect(gx + 1, desk - gh * 0.3 + 4, gw - 2, gh * 0.3 - 1);
      c.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; c.lineWidth = 0.6; for (let x = gx + 3; x < gx + gw; x += 3) { P(c).moveTo(x, desk - gh + 6); c.lineTo(x, desk + 2); c.stroke(); }
    },
    bouquet(c, W, H, T, r, dark) {
      // a small loose bouquet laid on the dark, white blooms with a few dusty pinks
      const x = W * (0.45 + r() * 0.1), y = H * (0.48 + r() * 0.05), s = Math.min(W, H) * 0.22;
      const stem = dark ? 'rgba(130,150,120,0.7)' : 'rgba(90,110,80,0.7)', white = dark ? 'rgba(240,236,224,0.92)' : 'rgba(255,255,255,0.98)', pinks = ['rgba(205,150,160,0.9)', 'rgba(150,70,90,0.85)', 'rgba(225,175,180,0.9)'];
      const heads = []; for (let i = 0; i < 16; i++) { const a = -PI / 2 + (r() - 0.5) * 1.3, l = s * (0.45 + r() * 0.5); heads.push([x + Math.cos(a) * l, y - s * 0.1 + Math.sin(a) * l]); }
      heads.forEach(([hx, hy]) => { P(c).moveTo(x + (r() - 0.5) * 4, y + s * 0.75); c.quadraticCurveTo(x, y + s * 0.1, hx, hy); c.lineWidth = 0.8; c.strokeStyle = stem; c.stroke(); });
      for (let i = 0; i < 5; i++) { const lx = x + (r() - 0.5) * s * 0.5, ly = y + s * (r() * 0.3); c.save(); c.translate(lx, ly); c.rotate((r() - 0.5) * 2); P(c).ellipse(0, 0, 2.5, 8, 0, 0, TAU); c.fillStyle = stem; c.fill(); c.restore(); }
      heads.forEach(([hx, hy], i) => {
        if (i % 4 === 0) { for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + i; P(c).ellipse(hx + Math.cos(a) * 4, hy + Math.sin(a) * 4, 4.5, 3.2, a, 0, TAU); c.fillStyle = white; c.fill(); } }
        else if (i % 4 === 1) { P(c).arc(hx, hy, 3.6, 0, TAU); c.fillStyle = pick(r, pinks); c.fill(); }
        else for (let k = 0; k < 4; k++) { P(c).arc(hx + (r() - 0.5) * 7, hy + (r() - 0.5) * 7, 1.4, 0, TAU); c.fillStyle = white; c.fill(); }
      });
    },
    curtainPlant(c, W, H, T, r, dark) {
      // a dim room: light through a curtain falls on the wall in soft vertical folds, a snake plant on the table casts its shadow
      c.fillStyle = dark ? hsl(30, 3, 11) : hsl(35, 6, 84); c.fillRect(0, 0, W, H);
      const top = H * (0.34 + r() * 0.05), bot = H * 0.74, rx = W * (0.6 + r() * 0.15);
      c.save(); if ('filter' in c) c.filter = 'blur(3px)';
      for (let x = 0; x < rx; x += 5) { const k = 0.5 + 0.5 * Math.sin(x * 0.09 + r() * 0.6); c.fillStyle = dark ? `rgba(215,200,180,${0.06 + k * 0.08})` : `rgba(255,250,240,${0.25 + k * 0.35})`; c.fillRect(x, top, 5.5, bot - top); }
      c.restore();
      const table = H * 0.72; P(c).moveTo(0, table + H * 0.06); c.lineTo(W, table - H * 0.02); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = dark ? hsl(30, 3, 15) : hsl(35, 6, 90); c.fill();
      const px = W * (0.66 + r() * 0.08), pw = W * 0.2, ph = H * 0.1, py = table + H * 0.02 - ph;
      const leaves = (bx, by, col, sc) => { for (let i = 0; i < 6; i++) { const a = -PI / 2 + (i - 2.5) * 0.28, l = H * (0.06 + (i % 3) * 0.025) * sc, tx = bx + Math.cos(a) * l, ty = by + Math.sin(a) * l; P(c).moveTo(bx - 5 * sc, by); c.quadraticCurveTo((bx + tx) / 2 - 7 * sc, (by + ty) / 2, tx, ty); c.quadraticCurveTo((bx + tx) / 2 + 7 * sc, (by + ty) / 2, bx + 5 * sc, by); c.closePath(); c.fillStyle = col; c.fill(); } };
      c.save(); if ('filter' in c) c.filter = 'blur(2px)'; leaves(px - W * 0.28, py - H * 0.02, dark ? 'rgba(0,0,0,0.35)' : 'rgba(60,55,50,0.2)', 0.9); c.fillStyle = dark ? 'rgba(0,0,0,0.3)' : 'rgba(60,55,50,0.16)'; c.fillRect(px - W * 0.28 - pw * 0.4, py, pw * 0.8, ph * 0.8); c.restore();
      leaves(px, py + 2, dark ? hsl(110, 10, 18) : hsl(110, 14, 30), 1);
      c.fillStyle = dark ? hsl(35, 4, 30) : hsl(35, 8, 95); c.fillRect(px - pw / 2, py, pw, ph); P(c).ellipse(px, py, pw / 2, 4, 0, 0, TAU); c.fillStyle = dark ? hsl(35, 4, 20) : hsl(35, 8, 80); c.fill();
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
