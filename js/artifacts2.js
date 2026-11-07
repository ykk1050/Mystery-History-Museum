/* =========================================================
   2층 전시물 그림 (캔버스) — artifacts.js 다음에 불러 art.js가 함께 쓴다
   함수 모양: (ctx, cx, cy, s, v, ex) — artifacts.js와 같음
   ========================================================= */
(function () {
  const fill = (c, col) => { c.fillStyle = col; c.fill(); };
  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const ell = (c, x, y, rx, ry, col) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); fill(c, col); };
  const poly = (c, pts, col) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); fill(c, col); };
  const line = (c, x0, y0, x1, y1, col, w) => { c.strokeStyle = col; c.lineWidth = w || 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  const label = (c, t, x, y, size, col) => { c.fillStyle = col; c.font = `700 ${size}px "Noto Sans KR", sans-serif`; c.textAlign = 'center'; c.fillText(t, x, y); c.textAlign = 'left'; };

  // 기와지붕 건물
  function hanok(c, x, y, w, h, roof, wall) {
    rect(c, x + w * 0.12, y + h * 0.32, w * 0.76, h * 0.68, wall || '#c9b48e');
    for (let i = 0; i <= 4; i++) rect(c, x + w * 0.12 + i * w * 0.18, y + h * 0.32, w * 0.03, h * 0.68, '#6e3a24');
    c.beginPath(); c.moveTo(x - w * 0.04, y + h * 0.38); c.quadraticCurveTo(x + w * 0.2, y + h * 0.3, x + w * 0.3, y); c.lineTo(x + w * 0.7, y);
    c.quadraticCurveTo(x + w * 0.8, y + h * 0.3, x + w * 1.04, y + h * 0.38); c.closePath(); fill(c, roof || '#3c4148');
  }

  /* 사람: 전시물 그림과 거리 인형이 함께 쓴다.
     base: 발 위치 / h: 키 / eyes: 'open' | 'closed' | 'soft' | 'stare' */
  const LOOK = {
    yangban: { robe: '#e9e3d2', sash: '#8a6a3c', hat: 'gat' }, official: { robe: '#2f4f73', sash: '#b08a3c', hat: 'samo' },
    jungin: { robe: '#7f8f9a', sash: '#3a3a3a', hat: 'gat' }, farmer: { robe: '#b9a988', sash: '#6b5a3c', hat: 'band' },
    woman: { robe: '#a84a4a', sash: '#e6d6b0', hat: 'hair' }, child: { robe: '#d8b04a', sash: '#7a3a2a', hat: 'braid', small: true },
    merchant: { robe: '#8a7350', sash: '#4a3a24', hat: 'band', pack: true }, soldier: { robe: '#5a4a3a', sash: '#a03a2a', hat: 'helm' },
    scholar: { robe: '#d5dcd2', sash: '#34506a', hat: 'gat' }, suit: { robe: '#2b2d33', sash: '#c8c8c8', hat: 'fedora', suit: true },
    student: { robe: '#30415e', sash: '#e8e0c8', hat: 'cap', suit: true }, performer: { robe: '#c8503a', sash: '#2e6a4a', hat: 'mask' }
  };
  function person(c, x, base, h, kind, eyes) {
    const k = LOOK[kind] || LOOK.farmer, H = k.small ? h * 0.75 : h, r = H * 0.1;
    const headY = base - H + r * 1.5, sh = headY + r * 1.2;
    ell(c, x, base, H * 0.2, H * 0.03, 'rgba(0,0,0,0.3)');
    if (k.pack) { c.save(); rect(c, x - H * 0.2, sh + H * 0.03, H * 0.4, H * 0.28, '#6b5232'); c.restore(); }
    if (k.suit) {
      rect(c, x - H * 0.13, base - H * 0.42, H * 0.11, H * 0.42, k.robe); rect(c, x + H * 0.02, base - H * 0.42, H * 0.11, H * 0.42, k.robe);
      poly(c, [[x - H * 0.17, sh], [x + H * 0.17, sh], [x + H * 0.15, base - H * 0.38], [x - H * 0.15, base - H * 0.38]], k.robe);
      poly(c, [[x - H * 0.05, sh], [x + H * 0.05, sh], [x, sh + H * 0.2]], k.sash);
    } else {
      poly(c, [[x - H * 0.15, sh], [x + H * 0.15, sh], [x + H * 0.27, base], [x - H * 0.27, base]], k.robe);
      line(c, x - H * 0.03, sh, x + H * 0.1, sh + H * 0.25, k.sash, H * 0.02);
      rect(c, x - H * 0.17, sh + H * 0.27, H * 0.34, H * 0.03, k.sash);
    }
    rect(c, x - H * 0.21, sh + H * 0.02, H * 0.07, H * 0.33, k.robe); rect(c, x + H * 0.14, sh + H * 0.02, H * 0.07, H * 0.33, k.robe);
    ell(c, x, headY, r * 0.92, r * 1.08, '#e2c8a4');
    if (k.hat === 'mask') { ell(c, x, headY, r * 1.05, r * 1.25, '#efe2c4'); ell(c, x - r * 0.5, headY + r * 0.35, r * 0.25, r * 0.2, '#c0473a'); ell(c, x + r * 0.5, headY + r * 0.35, r * 0.25, r * 0.2, '#c0473a'); line(c, x - r * 0.5, headY + r * 0.7, x + r * 0.5, headY + r * 0.7, '#222', 3); }
    if (k.hat === 'gat') { ell(c, x, headY - r * 0.8, r * 1.75, r * 0.32, '#1c1c1e'); rect(c, x - r * 0.65, headY - r * 1.65, r * 1.3, r * 0.9, '#1c1c1e'); }
    if (k.hat === 'samo') { rect(c, x - r * 0.9, headY - r * 1.5, r * 1.8, r * 0.85, '#141416'); ell(c, x - r * 1.35, headY - r * 1.0, r * 0.5, r * 0.22, '#141416'); ell(c, x + r * 1.35, headY - r * 1.0, r * 0.5, r * 0.22, '#141416'); }
    if (k.hat === 'band') { ell(c, x, headY - r * 0.7, r * 0.95, r * 0.55, '#221a14'); rect(c, x - r * 0.95, headY - r * 0.55, r * 1.9, r * 0.28, '#e8e0cc'); }
    if (k.hat === 'hair') { ell(c, x, headY - r * 0.55, r, r * 0.65, '#1b1613'); ell(c, x, headY - r * 1.25, r * 0.5, r * 0.35, '#1b1613'); }
    if (k.hat === 'braid') { ell(c, x, headY - r * 0.6, r, r * 0.6, '#1b1613'); rect(c, x + r * 0.5, headY, r * 0.3, H * 0.28, '#1b1613'); }
    if (k.hat === 'helm') { ell(c, x, headY - r * 0.6, r * 1.1, r * 0.75, '#2a2a2e'); rect(c, x - r * 0.15, headY - r * 1.8, r * 0.3, r * 0.6, '#a03a2a'); }
    if (k.hat === 'fedora') { ell(c, x, headY - r * 0.75, r * 1.5, r * 0.28, '#23252b'); rect(c, x - r * 0.8, headY - r * 1.45, r * 1.6, r * 0.75, '#23252b'); }
    if (k.hat === 'cap') { rect(c, x - r * 0.95, headY - r * 1.25, r * 1.9, r * 0.6, '#1e2a40'); rect(c, x - r * 1.05, headY - r * 0.7, r * 2.1, r * 0.16, '#141c2c'); }
    if (k.hat === 'mask') return;
    const ey = headY + r * 0.05, ex = r * 0.42;
    if (eyes === 'closed') { [-1, 1].forEach(d => { c.strokeStyle = '#3a2c20'; c.lineWidth = Math.max(1, r * 0.08); c.beginPath(); c.arc(x + d * ex, ey - r * 0.04, r * 0.16, 0.2, Math.PI - 0.2); c.stroke(); }); }
    else if (eyes === 'stare') { [-1, 1].forEach(d => { ell(c, x + d * ex, ey, r * 0.24, r * 0.27, '#f4f0e6'); ell(c, x + d * ex, ey, r * 0.1, r * 0.11, '#0a0606'); }); }
    else { [-1, 1].forEach(d => ell(c, x + d * ex, ey, r * 0.1, r * 0.12, '#2a1e16')); }
    if (eyes === 'soft') { c.strokeStyle = '#a0584a'; c.lineWidth = Math.max(1, r * 0.08); c.beginPath(); c.arc(x, headY + r * 0.4, r * 0.25, 0.3, Math.PI - 0.3); c.stroke(); }
  }
  window.PEOPLE = { draw: person, LOOK };

  Object.assign(window.ARTIFACTS, {
    person(c, cx, cy, s, v, ex) { person(c, cx, cy + s * 0.46, s * 0.92, ex.fig, 'open'); },
    seoulmap(c, cx, cy, s) {
      const r = s * 0.42;
      rect(c, cx - r * 1.1, cy - r, r * 2.2, r * 2, '#d8c9a2');
      c.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2, rr = r * (0.72 + 0.08 * Math.sin(i * 2.3)); const px = cx + Math.cos(a) * rr, py = cy - r * 0.1 + Math.sin(a) * rr * 0.8; i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.closePath(); c.strokeStyle = '#7a4a2a'; c.lineWidth = 7; c.stroke();
      [['숭례문', 0, 0.72], ['숙정문', 0, -0.92], ['흥인지문', 0.82, -0.1], ['돈의문', -0.82, -0.1]].forEach(([t, dx, dy]) => { ell(c, cx + dx * r, cy + dy * r * 0.8 - r * 0.1, 9, 9, '#8a2a20'); label(c, t, cx + dx * r * 0.72, cy + dy * r * 0.62 - r * 0.02, s * 0.052, '#3a2616'); });
      hanok(c, cx - s * 0.1, cy - r * 0.45, s * 0.2, s * 0.14, '#3c4148');
      c.beginPath(); c.moveTo(cx - r * 1.1, cy + r * 0.86); c.quadraticCurveTo(cx, cy + r * 0.76, cx + r * 1.1, cy + r * 0.92); c.strokeStyle = '#6a9ab0'; c.lineWidth = 12; c.stroke();
    },
    gatehouse(c, cx, cy, s) {
      const w = s * 0.86, y = cy + s * 0.04;
      rect(c, cx - w / 2, y, w, s * 0.3, '#8d8675');
      for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) c.strokeStyle = 'rgba(40,36,30,0.35)', c.lineWidth = 2, c.strokeRect(cx - w / 2 + j * w / 7 + (i % 2 ? 12 : 0), y + i * s * 0.06, w / 7, s * 0.06);
      c.beginPath(); c.arc(cx, y + s * 0.3, s * 0.13, Math.PI, 0); c.lineTo(cx + s * 0.13, y + s * 0.3); fill(c, '#17120e');
      hanok(c, cx - w * 0.38, y - s * 0.28, w * 0.76, s * 0.3, '#3f444c', '#a23c2a');
    },
    hanokhall(c, cx, cy, s, v, ex) {
      const small = ex && ex.small;
      hanok(c, cx - s * 0.4, cy - s * (small ? 0.16 : 0.26), s * 0.8, s * (small ? 0.38 : 0.5), small ? '#4a4a44' : '#34393f', small ? '#c9b48e' : '#b99f74');
      rect(c, cx - s * 0.46, cy + s * 0.24, s * 0.92, s * 0.05, '#7d7465');
      label(c, ex && ex.title === '성균관' ? '明倫堂' : '講堂', cx, cy - s * 0.01, s * 0.06, '#f3e6c6');
    },
    samgang(c, cx, cy, s, v) {
      const w = s * 0.74, h = s * 0.62;
      rect(c, cx - w / 2, cy - h / 2, w, h, '#d9c79f');
      rect(c, cx - 1, cy - h / 2, 2, h, '#8c7650');
      if (!v.noPic) {
        ell(c, cx - w * 0.3, cy + h * 0.14, w * 0.14, h * 0.05, '#a68b5c');
        person(c, cx - w * 0.3, cy + h * 0.28, h * 0.52, 'scholar', 'open');
        person(c, cx + w * 0.26, cy + h * 0.34, h * 0.44, 'farmer', 'open');
        line(c, cx + w * 0.08, cy + h * 0.38, cx + w * 0.44, cy + h * 0.38, '#7a6340', 3);
      }
      c.fillStyle = '#2c2015'; c.font = `600 ${s * 0.042}px "Noto Serif KR", serif`;
      const han = v.noPic ? 28 : 7;
      for (let i = 0; i < han; i++) c.fillText('孝忠烈行實圖'[i % 6], cx + (i % 7 - 3.2) * w * 0.12, cy - h * 0.36 + Math.floor(i / 7) * s * 0.06);
    },
    armillary(c, cx, cy, s) {
      const r = s * 0.34;
      rect(c, cx - 6, cy + r * 0.8, 12, s * 0.16, '#6e4a26');
      rect(c, cx - s * 0.22, cy + r + s * 0.07, s * 0.44, 16, '#4a321c');
      [[1, 1, 0], [1, 0.36, 0], [0.36, 1, 0], [1, 0.3, 0.7]].forEach(([a, b, rot]) => { c.beginPath(); c.ellipse(cx, cy, r * a, r * b, rot, 0, 7); c.strokeStyle = '#b08a3c'; c.lineWidth = 7; c.stroke(); });
      ell(c, cx, cy, 12, 12, '#6a8fb0');
    },
    sundial(c, cx, cy, s, v) {
      const r = s * 0.36;
      c.beginPath(); c.arc(cx, cy - s * 0.04, r, 0, Math.PI); c.closePath(); fill(c, '#a8813c');
      ell(c, cx, cy - s * 0.04, r, r * 0.3, '#d9c388');
      for (let i = 1; i < 8; i++) { const px = cx - r * 0.9 + i * r * 0.225; line(c, px, cy - s * 0.04 - r * 0.22, px, cy - s * 0.04 + r * 0.24, '#5a4420', 2); }
      for (let i = -1; i < 2; i++) { c.beginPath(); c.ellipse(cx, cy - s * 0.04 + i * r * 0.1, r * 0.85, r * 0.1, 0, 0, Math.PI); c.strokeStyle = '#5a4420'; c.lineWidth = 2; c.stroke(); }
      if (!v.noNeedle) { line(c, cx, cy - s * 0.04 + r * 0.18, cx - r * 0.42, cy - r * 0.5, '#1c1612', 7); line(c, cx, cy - s * 0.04 + r * 0.18, cx + r * 0.4, cy - s * 0.04 + r * 0.1, 'rgba(40,30,20,0.55)', 5); }
      rect(c, cx - s * 0.12, cy + r * 0.86, s * 0.24, 14, '#4a3920');
    },
    waterclock(c, cx, cy, s) {
      [[-0.32, -0.32, 0.22], [-0.1, -0.1, 0.2], [0.14, 0.1, 0.18]].forEach(([dx, dy, w]) => {
        poly(c, [[cx + dx * s - w * s / 2, cy + dy * s], [cx + dx * s + w * s / 2, cy + dy * s], [cx + dx * s + w * s * 0.36, cy + dy * s + s * 0.2], [cx + dx * s - w * s * 0.36, cy + dy * s + s * 0.2]], '#7d6642');
        ell(c, cx + dx * s, cy + dy * s, w * s / 2, s * 0.02, '#4e7a92');
      });
      rect(c, cx + s * 0.28, cy - s * 0.3, s * 0.14, s * 0.62, '#8a5a30');
      ell(c, cx + s * 0.35, cy - s * 0.34, s * 0.09, s * 0.08, '#b08a3c');
      line(c, cx - s * 0.2, cy - s * 0.16, cx - s * 0.1, cy - s * 0.1, '#4e7a92', 5); line(c, cx + s * 0.02, cy + s * 0.04, cx + s * 0.14, cy + s * 0.1, '#4e7a92', 5);
    },
    fourmap(c, cx, cy, s, v) {
      const w = s * 0.72, h = s * 0.86;
      rect(c, cx - w / 2, cy - h / 2, w, h, '#b9cdd6');
      poly(c, [[cx - w * 0.42, cy - h * 0.1], [cx - w * 0.1, cy - h * 0.26], [cx + w * 0.34, cy - h * 0.44], [cx + w * 0.42, cy - h * 0.4], [cx + w * 0.16, cy - h * 0.1], [cx + w * 0.2, cy + h * 0.38], [cx - w * 0.14, cy + h * 0.42], [cx - w * 0.2, cy + h * 0.1]], '#d6c493');
      line(c, cx - w * 0.42, cy - h * 0.1, cx - w * 0.06, cy - h * 0.27, '#3f7ca0', 7); line(c, cx + w * 0.02, cy - h * 0.32, cx + w * 0.36, cy - h * 0.43, '#3f7ca0', 7);
      label(c, '압록강', cx - w * 0.3, cy - h * 0.25, s * 0.05, '#20506e'); label(c, '두만강', cx + w * 0.24, cy - h * 0.33 + s * 0.13, s * 0.05, '#20506e');
      const a = v.swap ? '6진' : '4군', b = v.swap ? '4군' : '6진';
      ell(c, cx - w * 0.2, cy - h * 0.12, s * 0.07, s * 0.05, '#a03a2a'); label(c, a, cx - w * 0.2, cy - h * 0.1, s * 0.05, '#fff');
      ell(c, cx + w * 0.22, cy - h * 0.27, s * 0.07, s * 0.05, '#a03a2a'); label(c, b, cx + w * 0.22, cy - h * 0.25, s * 0.05, '#fff');
    },
    fortress(c, cx, cy, s) {
      poly(c, [[cx - s * 0.46, cy + s * 0.3], [cx - s * 0.2, cy - s * 0.3], [cx, cy - s * 0.12], [cx + s * 0.22, cy - s * 0.36], [cx + s * 0.46, cy + s * 0.3]], '#58684a');
      rect(c, cx - s * 0.42, cy + s * 0.06, s * 0.84, s * 0.2, '#8f8877');
      for (let i = 0; i < 12; i++) rect(c, cx - s * 0.42 + i * s * 0.074, cy + s * 0.02, s * 0.05, s * 0.05, '#8f8877');
      c.beginPath(); c.arc(cx, cy + s * 0.26, s * 0.08, Math.PI, 0); fill(c, '#17120e');
    },
    ricefield(c, cx, cy, s, v) {
      const w = s * 0.86, h = s * 0.62, x0 = cx - w / 2, y0 = cy - h / 2;
      rect(c, x0, y0, w, h * 0.3, '#c7d4c0'); rect(c, x0, y0 + h * 0.3, w, h * 0.7, v.harvest ? '#c9a640' : '#7fa7a0');
      if (v.harvest) { for (let i = 0; i < 14; i++) for (let j = 0; j < 4; j++) line(c, x0 + 14 + i * w / 14, y0 + h * 0.4 + j * h * 0.15, x0 + 8 + i * w / 14, y0 + h * 0.3 + j * h * 0.15, '#8a6a20', 3); }
      else { for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { const px = x0 + 20 + i * w / 12, py = y0 + h * 0.42 + j * h * 0.15; line(c, px, py, px - 4, py - 14, '#3f7a44', 3); line(c, px, py, px + 4, py - 14, '#3f7a44', 3); } }
      [-0.26, 0.04, 0.3].forEach((d, i) => person(c, cx + d * w, cy + h * 0.32 + (i % 2) * 8, h * 0.55, 'farmer', 'open'));
      if (v.harvest) line(c, cx - 0.2 * w, cy + h * 0.06, cx - 0.12 * w, cy + h * 0.2, '#555', 5);
    },
    sweetpotato(c, cx, cy, s) {
      [[-0.2, -0.05, 0.2, 0.09, -0.4, '#a0486a'], [0.12, -0.14, 0.2, 0.09, 0.3, '#8e3e60'], [0.02, 0.1, 0.2, 0.09, -0.1, '#a84e72']].forEach(([x, y, a, b, r, col]) => { c.beginPath(); c.ellipse(cx + x * s, cy + y * s, a * s, b * s, r, 0, 7); fill(c, col); });
      [[-0.26, 0.22], [-0.04, 0.27], [0.2, 0.22]].forEach(([x, y]) => ell(c, cx + x * s, cy + y * s, s * 0.1, s * 0.08, '#c8a56a'));
    },
    peddler(c, cx, cy, s) { rect(c, cx - s * 0.46, cy + s * 0.38, s * 0.92, 10, '#6b5232'); person(c, cx, cy + s * 0.4, s * 0.84, 'merchant', 'open'); },
    coin(c, cx, cy, s) {
      const r = s * 0.32;
      ell(c, cx, cy, r, r, '#8a7a4a'); ell(c, cx, cy, r * 0.88, r * 0.88, '#a8965c');
      rect(c, cx - r * 0.24, cy - r * 0.24, r * 0.48, r * 0.48, '#1a120c');
      c.fillStyle = '#3e3216'; c.font = `700 ${r * 0.34}px "Noto Serif KR", serif`; c.textAlign = 'center';
      [['常', 0, -0.48], ['平', 0, 0.68], ['通', 0.58, 0.1], ['寶', -0.58, 0.1]].forEach(([t, dx, dy]) => c.fillText(t, cx + dx * r, cy + dy * r)); c.textAlign = 'left';
    },
    jokbo(c, cx, cy, s) {
      const w = s * 0.66, h = s * 0.76;
      rect(c, cx - w / 2, cy - h / 2, w, h, '#e0d0a8');
      rect(c, cx - w * 0.35, cy - h * 0.42, w * 0.7, s * 0.09, '#8a4a2a'); label(c, '족보', cx, cy - h * 0.34, s * 0.07, '#f3e6c6');
      for (let i = 0; i < 4; i++) { line(c, cx - w * 0.36, cy - h * 0.14 + i * h * 0.15, cx + w * 0.36, cy - h * 0.14 + i * h * 0.15, '#7a6548', 2); rect(c, cx - w * 0.3 + (i % 3) * w * 0.26, cy - h * 0.12 + i * h * 0.15, w * 0.16, 8, '#3a2e20'); }
    },
    clock(c, cx, cy, s) {
      rect(c, cx - s * 0.19, cy - s * 0.3, s * 0.38, s * 0.62, '#6a4326');
      poly(c, [[cx - s * 0.23, cy - s * 0.3], [cx + s * 0.23, cy - s * 0.3], [cx, cy - s * 0.44]], '#4f2f1a');
      ell(c, cx, cy - s * 0.1, s * 0.15, s * 0.15, '#efe6cc'); ell(c, cx, cy - s * 0.1, s * 0.012, s * 0.012, '#222');
      line(c, cx, cy - s * 0.1, cx + s * 0.08, cy - s * 0.15, '#222', 4); line(c, cx, cy - s * 0.1, cx, cy - s * 0.21, '#222', 3);
      rect(c, cx - 3, cy + s * 0.08, 6, s * 0.14, '#c8a040'); ell(c, cx, cy + s * 0.22, s * 0.04, s * 0.04, '#c8a040');
    },
    ssireum(c, cx, cy, s, v) {
      const w = s * 0.86, h = s * 0.62;
      rect(c, cx - w / 2, cy - h / 2, w, h, '#ddcfa8');
      if (v.threshing) {
        rect(c, cx - w * 0.16, cy + h * 0.02, w * 0.32, h * 0.1, '#6b5232');
        [-0.34, 0, 0.34].forEach(d => person(c, cx + d * w, cy + h * 0.4, h * 0.62, 'farmer', 'open'));
        for (let i = 0; i < 9; i++) line(c, cx - w * 0.12 + i * w * 0.03, cy + h * 0.02, cx - w * 0.15 + i * w * 0.04, cy - h * 0.1, '#b89a3c', 3);
      } else {
        for (let i = 0; i < 9; i++) person(c, cx - w * 0.42 + i * w * 0.105, cy - h * 0.05, h * 0.32, i % 2 ? 'yangban' : 'farmer', 'open');
        for (let i = 0; i < 7; i++) person(c, cx - w * 0.42 + i * w * 0.14, cy + h * 0.45, h * 0.3, 'farmer', 'open');
        person(c, cx - w * 0.07, cy + h * 0.28, h * 0.5, 'farmer', 'open'); person(c, cx + w * 0.07, cy + h * 0.28, h * 0.5, 'merchant', 'open');
      }
    },
    tigermagpie(c, cx, cy, s, v) {
      const w = s * 0.72, h = s * 0.84;
      rect(c, cx - w / 2, cy - h / 2, w, h, '#e4d6ae');
      line(c, cx + w * 0.3, cy + h * 0.45, cx + w * 0.14, cy - h * 0.46, '#5a4128', 16);
      [[-0.02, -0.34], [0.14, -0.22], [0.26, -0.36], [0.04, -0.2]].forEach(([x, y]) => ell(c, cx + x * w, cy + y * h, w * 0.11, h * 0.05, '#3f6a44'));
      ell(c, cx - w * 0.02, cy - h * 0.2, w * 0.05, h * 0.024, '#1d2a3a'); ell(c, cx - w * 0.08, cy - h * 0.205, w * 0.02, w * 0.02, '#1d2a3a');
      if (v.noTiger) return;
      ell(c, cx - w * 0.06, cy + h * 0.22, w * 0.3, h * 0.13, '#d68a2c'); ell(c, cx - w * 0.24, cy + h * 0.02, w * 0.17, w * 0.17, '#d68a2c');
      for (let i = 0; i < 7; i++) line(c, cx - w * 0.28 + i * w * 0.08, cy + h * 0.11, cx - w * 0.26 + i * w * 0.08, cy + h * 0.28, '#2a1a10', 6);
      [-1, 1].forEach(d => { ell(c, cx - w * 0.24 + d * w * 0.07, cy, w * 0.036, w * 0.036, '#f4e6b0'); ell(c, cx - w * 0.24 + d * w * 0.07, cy, w * 0.015, w * 0.015, '#111'); });
    },
    pansori(c, cx, cy, s, v) {
      rect(c, cx - s * 0.44, cy + s * 0.36, s * 0.88, s * 0.06, '#8a6a40');
      person(c, cx - s * 0.16, cy + s * 0.38, s * 0.72, 'yangban', 'open');
      line(c, cx - s * 0.02, cy - s * 0.02, cx + s * 0.08, cy - s * 0.14, '#3a2a18', 5); poly(c, [[cx + s * 0.08, cy - s * 0.14], [cx + s * 0.24, cy - s * 0.2], [cx + s * 0.22, cy - s * 0.02]], '#d7c9a0');
      if (!v.noDrum) { person(c, cx + s * 0.28, cy + s * 0.38, s * 0.5, 'farmer', 'open'); ell(c, cx + s * 0.12, cy + s * 0.3, s * 0.09, s * 0.09, '#a03a2a'); ell(c, cx + s * 0.12, cy + s * 0.3, s * 0.06, s * 0.06, '#d9c79f'); }
    },
    talnori(c, cx, cy, s, v) {
      rect(c, cx - s * 0.44, cy + s * 0.36, s * 0.88, s * 0.06, '#8a6a40');
      person(c, cx - s * 0.2, cy + s * 0.38, s * 0.78, v.noMask ? 'farmer' : 'performer', 'open');
      person(c, cx + s * 0.22, cy + s * 0.38, s * 0.74, v.noMask ? 'yangban' : 'performer', 'open');
    },
    cathedral(c, cx, cy, s, v) {
      if (v.hanok) { hanok(c, cx - s * 0.42, cy - s * 0.26, s * 0.84, s * 0.56, '#34393f', '#c9b48e'); return; }
      rect(c, cx - s * 0.3, cy - s * 0.06, s * 0.6, s * 0.38, '#8c4a34');
      rect(c, cx - s * 0.1, cy - s * 0.3, s * 0.2, s * 0.26, '#8c4a34');
      poly(c, [[cx - s * 0.12, cy - s * 0.3], [cx + s * 0.12, cy - s * 0.3], [cx, cy - s * 0.48]], '#3f4a50');
      poly(c, [[cx - s * 0.32, cy - s * 0.06], [cx + s * 0.32, cy - s * 0.06], [cx, cy - s * 0.18]], '#3f4a50');
      c.beginPath(); c.arc(cx, cy + s * 0.32, s * 0.07, Math.PI, 0); fill(c, '#231a14');
      [-0.2, 0.2].forEach(d => { c.beginPath(); c.arc(cx + d * s, cy + s * 0.08, s * 0.05, Math.PI, 0); c.lineTo(cx + d * s + s * 0.05, cy + s * 0.2); c.lineTo(cx + d * s - s * 0.05, cy + s * 0.2); fill(c, '#3a5a7a'); });
      rect(c, cx - 2, cy - s * 0.56, 4, s * 0.09, '#d0d0d0'); rect(c, cx - s * 0.03, cy - s * 0.53, s * 0.06, 4, '#d0d0d0');
    },
    school(c, cx, cy, s) {
      rect(c, cx - s * 0.42, cy - s * 0.24, s * 0.84, s * 0.46, '#3a5a48');
      c.strokeStyle = '#8a6a40'; c.lineWidth = 8; c.strokeRect(cx - s * 0.42, cy - s * 0.24, s * 0.84, s * 0.46);
      label(c, '가 나 다', cx - s * 0.1, cy - s * 0.08, s * 0.07, '#efe9d8'); label(c, 'A B C', cx + s * 0.2, cy + s * 0.08, s * 0.07, '#efe9d8');
      rect(c, cx - s * 0.32, cy + s * 0.27, s * 0.64, 10, '#8a6a40');
      [-0.18, 0, 0.18].forEach(d => person(c, cx + d * s, cy + s * 0.44, s * 0.3, 'student', 'open'));
    },
    lamp(c, cx, cy, s) {
      rect(c, cx - 2, cy - s * 0.46, 4, s * 0.2, '#332');
      poly(c, [[cx - s * 0.2, cy - s * 0.12], [cx + s * 0.2, cy - s * 0.12], [cx + s * 0.05, cy - s * 0.27], [cx - s * 0.05, cy - s * 0.27]], '#3f5a54');
      const g = c.createRadialGradient(cx, cy, 6, cx, cy, s * 0.34); g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = g; c.fillRect(cx - s * 0.4, cy - s * 0.36, s * 0.8, s * 0.8);
      ell(c, cx, cy - s * 0.04, s * 0.1, s * 0.11, '#fff2bf');
    },
    newspaper(c, cx, cy, s) {
      const w = s * 1.9, h = s * 1.0, x0 = cx - w / 2, y0 = cy - h / 2;
      rect(c, x0, y0, w, h, '#ded3b6');
      label(c, '신 문', cx, y0 + h * 0.16, h * 0.13, '#231a12');
      line(c, x0 + 20, y0 + h * 0.22, x0 + w - 20, y0 + h * 0.22, '#231a12', 4);
      for (let k = 0; k < 5; k++) for (let i = 0; i < 9; i++) rect(c, x0 + 30 + k * (w - 40) / 5, y0 + h * 0.28 + i * h * 0.075, (w - 40) / 5 - 26, 7, '#5a4c38');
    }
  });
})();
