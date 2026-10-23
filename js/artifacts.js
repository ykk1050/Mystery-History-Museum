/* =========================================================
   전시실별 유물 그림 (캔버스) — art.js가 불러서 사용
   함수 모양: (ctx, cx, cy, s, v, ex)
     cx, cy: 그림 가운데 / s: 그림 크기 / v: 이상 현상 그림 변형 / ex: 전시물
   ========================================================= */
(function () {
  const HANJA = '天地人王國民山川田畓馬牛年月日村戶口金木水火土百千萬佛法僧心經大王太祖高麗新羅百濟城門東西南北中上下文武';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shadow(ctx, on) {
    if (on === false) { ctx.shadowColor = 'transparent'; return; }
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 16;
  }
  function lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }
  // 세로쓰기 한자 (옛 문서 느낌)
  function hanjaCols(ctx, x, y, w, h, size, color, seed, mirror) {
    const r = rng(seed);
    ctx.save();
    ctx.fillStyle = color; ctx.font = `600 ${size}px "Noto Serif KR", serif`; ctx.textAlign = 'center';
    if (mirror) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    for (let cx = x + w - size * 0.7; cx > x; cx -= size * 1.25) {
      for (let cy = y + size; cy < y + h; cy += size * 1.1) {
        if (r() < 0.08) continue;
        ctx.fillText(HANJA[Math.floor(r() * HANJA.length)], cx, cy);
      }
    }
    ctx.restore();
  }
  function paper(ctx, x, y, w, h, base, seed) {
    const r = rng(seed);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 1; i <= 10; i++) ctx.lineTo(x + w * i / 10, y + (r() - 0.5) * 6);
    for (let i = 1; i <= 10; i++) ctx.lineTo(x + w + (r() - 0.5) * 6, y + h * i / 10);
    for (let i = 9; i >= 0; i--) ctx.lineTo(x + w * i / 10, y + h + (r() - 0.5) * 6);
    for (let i = 9; i >= 1; i--) ctx.lineTo(x + (r() - 0.5) * 6, y + h * i / 10);
    ctx.closePath();
    ctx.fillStyle = base; ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 30; i++) {
      const g = ctx.createRadialGradient(x + r() * w, y + r() * h, 1, x + r() * w, y + r() * h, 20 + r() * 50);
      g.addColorStop(0, 'rgba(90,60,20,0.18)'); g.addColorStop(1, 'rgba(90,60,20,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  const A = {
    /* ---------- 구석기 ---------- */
    hut(ctx, cx, cy, s) {
      const base = cy + s * 0.38, top = cy - s * 0.4;
      shadow(ctx);
      ctx.fillStyle = '#4a3423';
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + s * 0.38, base); ctx.lineTo(cx - s * 0.38, base); ctx.closePath(); ctx.fill();
      shadow(ctx, false);
      // 가죽 덮개
      ctx.fillStyle = '#7b5a3c';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.05, top + s * 0.12); ctx.lineTo(cx + s * 0.3, base); ctx.lineTo(cx + s * 0.05, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8f6a47';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.08, top + s * 0.2); ctx.lineTo(cx - s * 0.33, base); ctx.lineTo(cx - s * 0.12, base); ctx.closePath(); ctx.fill();
      // 입구
      ctx.fillStyle = '#120a06';
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.05); ctx.lineTo(cx + s * 0.09, base); ctx.lineTo(cx - s * 0.09, base); ctx.closePath(); ctx.fill();
      // 나뭇가지
      ctx.strokeStyle = '#2c1d12'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      [[-0.06, 0.4], [0.07, -0.42], [-0.02, 0.2], [0.03, -0.18]].forEach(([dx, ex]) => {
        ctx.beginPath(); ctx.moveTo(cx + dx * s, top - s * 0.06); ctx.lineTo(cx + ex * s, base); ctx.stroke();
      });
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(cx - s * 0.45, base, s * 0.9, 8);
    },
    hide(ctx, cx, cy, s) {
      const r = rng(4);
      shadow(ctx);
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = i / 24 * Math.PI * 2;
        const k = 1 + Math.sin(a * 4) * 0.12 + (r() - 0.5) * 0.08;
        const x = cx + Math.cos(a) * s * 0.36 * k, y = cy + Math.sin(a) * s * 0.42 * k;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = lin(ctx, cx - s * 0.3, cy - s * 0.4, cx + s * 0.3, cy + s * 0.4, ['#b08a5e', '#8a6740', '#5d4229']);
      ctx.fill();
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, d = s * (0.3 + r() * 0.1);
        const x = cx + Math.cos(a) * d * 0.9, y = cy + Math.sin(a) * d;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,25,10,0.25)';
      for (let i = 0; i < 6; i++) ellipse(ctx, cx + (r() - 0.5) * s * 0.4, cy + (r() - 0.5) * s * 0.5, 20 + r() * 20, 10 + r() * 14, 'rgba(40,25,10,0.18)');
    },
    roots(ctx, cx, cy, s) {
      const r = rng(9);
      shadow(ctx);
      ctx.strokeStyle = '#8a6a48'; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        ctx.lineWidth = 6 + r() * 8;
        ctx.beginPath();
        const x = cx - s * 0.3 + r() * s * 0.35, y = cy - s * 0.05 + r() * s * 0.2;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.1 * (r() - 0.5), x + s * 0.25, y + s * 0.15 * (r() - 0.3));
        ctx.stroke();
      }
      shadow(ctx, false);
      // 두들기는 돌
      shadow(ctx);
      ellipse(ctx, cx + s * 0.22, cy + s * 0.18, s * 0.12, s * 0.08, lin(ctx, 0, cy, 0, cy + s * 0.3, ['#9a917f', '#5e574a']));
      shadow(ctx, false);
      // 열매
      for (let i = 0; i < 6; i++) ellipse(ctx, cx - s * 0.2 + r() * s * 0.2, cy + s * 0.25 + r() * s * 0.05, 10, 12, '#6b3f24');
    },

    /* ---------- 신석기 ---------- */
    grinder(ctx, cx, cy, s) {
      shadow(ctx);
      ctx.fillStyle = lin(ctx, 0, cy, 0, cy + s * 0.25, ['#a39a88', '#6f685a']);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.42, cy + s * 0.02);
      ctx.quadraticCurveTo(cx, cy + s * 0.12, cx + s * 0.42, cy + s * 0.02);
      ctx.lineTo(cx + s * 0.38, cy + s * 0.2); ctx.quadraticCurveTo(cx, cy + s * 0.27, cx - s * 0.38, cy + s * 0.2);
      ctx.closePath(); ctx.fill();
      // 갈돌
      ctx.fillStyle = lin(ctx, 0, cy - s * 0.12, 0, cy + s * 0.05, ['#bdb4a0', '#7d7565']);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - s * 0.3, cy - s * 0.1, s * 0.5, s * 0.12, 30) : ctx.rect(cx - s * 0.3, cy - s * 0.1, s * 0.5, s * 0.12);
      ctx.fill();
      shadow(ctx, false);
      ctx.fillStyle = '#7a5530';
      const r = rng(2);
      for (let i = 0; i < 14; i++) ellipse(ctx, cx + s * 0.25 + r() * s * 0.12, cy + s * 0.08 + r() * s * 0.05, 5, 4, '#a07a3c');
    },
    spindle(ctx, cx, cy, s) {
      shadow(ctx);
      ellipse(ctx, cx - s * 0.12, cy, s * 0.17, s * 0.17, lin(ctx, cx - s * 0.3, cy - s * 0.2, cx, cy + s * 0.2, ['#9b7a58', '#5e4630']));
      shadow(ctx, false);
      ellipse(ctx, cx - s * 0.12, cy, s * 0.03, s * 0.03, '#120b07');
      ctx.strokeStyle = 'rgba(40,25,10,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - s * 0.12, cy, s * 0.12, 0, Math.PI * 2); ctx.stroke();
      // 뼈바늘 세 개
      [0, 1, 2].forEach(i => {
        ctx.save(); ctx.translate(cx + s * 0.18 + i * s * 0.08, cy); ctx.rotate(0.15 - i * 0.12);
        shadow(ctx);
        ctx.fillStyle = lin(ctx, -6, 0, 6, 0, ['#e5dcc5', '#b9ad90']);
        ctx.beginPath(); ctx.moveTo(-5, -s * 0.3); ctx.lineTo(5, -s * 0.3); ctx.lineTo(1, s * 0.3); ctx.lineTo(-1, s * 0.3); ctx.closePath(); ctx.fill();
        shadow(ctx, false);
        ellipse(ctx, 0, -s * 0.26, 2, 5, '#2a1f14');
        ctx.restore();
      });
    },
    fishing(ctx, cx, cy, s) {
      // 뼈작살
      ctx.save(); ctx.translate(cx - s * 0.2, cy); ctx.rotate(-0.25);
      shadow(ctx);
      ctx.fillStyle = '#ddd2b8';
      ctx.fillRect(-6, -s * 0.38, 12, s * 0.76);
      shadow(ctx, false);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(6, -s * 0.3 + i * 34); ctx.lineTo(22, -s * 0.3 + i * 34 + 14); ctx.lineTo(6, -s * 0.3 + i * 34 + 16); }
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -s * 0.38); ctx.lineTo(0, -s * 0.46); ctx.lineTo(6, -s * 0.38); ctx.fill();
      ctx.restore();
      // 뼈낚시
      shadow(ctx);
      ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + s * 0.05, cy - s * 0.3); ctx.lineTo(cx + s * 0.05, cy); ctx.arc(cx + s * 0.13, cy, s * 0.08, Math.PI, 0, true); ctx.lineTo(cx + s * 0.21, cy - s * 0.05); ctx.stroke();
      // 돌그물추
      [[0.3, -0.15], [0.32, 0.12], [0.18, 0.28]].forEach(([dx, dy], i) => {
        ellipse(ctx, cx + dx * s, cy + dy * s, s * 0.07, s * 0.05, ['#8a8273', '#777061', '#968e7e'][i]);
      });
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(30,25,20,0.7)'; ctx.lineWidth = 3;
      [[0.3, -0.15], [0.32, 0.12], [0.18, 0.28]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx + dx * s, cy + dy * s - s * 0.05); ctx.lineTo(cx + dx * s, cy + dy * s + s * 0.05); ctx.stroke();
      });
    },
    ornament(ctx, cx, cy, s) {
      ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.34, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const a = (0.18 + i * 0.08) * Math.PI;
        const x = cx + Math.cos(a) * s * 0.34, y = cy - s * 0.2 + Math.sin(a) * s * 0.34;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2);
        shadow(ctx);
        ctx.fillStyle = i % 3 === 1 ? '#e8dcc4' : '#d9c7a6';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(26, 6, 0, 40); ctx.quadraticCurveTo(-26, 6, 0, -4); ctx.fill();
        shadow(ctx, false);
        ctx.strokeStyle = 'rgba(120,90,60,0.6)'; ctx.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(k * 7, 34); ctx.stroke(); }
        ellipse(ctx, 0, 4, 3, 3, '#1a120a');
        ctx.restore();
      }
    },

    /* ---------- 청동기 ---------- */
    mirror(ctx, cx, cy, s) {
      const R = s * 0.3, x = cx - s * 0.08;
      shadow(ctx);
      ellipse(ctx, x, cy, R, R, lin(ctx, x - R, cy - R, x + R, cy + R, ['#7e9a76', '#4f6b52', '#33493a']));
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(200,215,170,0.5)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        const rr = R * (0.92 - k * 0.27);
        ctx.beginPath(); ctx.arc(x, cy, rr, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 48; i++) {
          const a = i / 48 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          ctx.lineTo(x + Math.cos(a + 0.07) * (rr - R * 0.2), cy + Math.sin(a + 0.07) * (rr - R * 0.2)); ctx.stroke();
        }
      }
      ellipse(ctx, x - R * 0.2, cy, R * 0.08, R * 0.06, '#2c3b2d');
      ellipse(ctx, x + R * 0.2, cy, R * 0.08, R * 0.06, '#2c3b2d');
      // 방울
      const bx = cx + s * 0.3, by = cy + s * 0.12;
      shadow(ctx);
      ellipse(ctx, bx, by, s * 0.08, s * 0.08, lin(ctx, bx - 30, by - 30, bx + 30, by + 30, ['#9cb07a', '#536b45']));
      shadow(ctx, false);
      ctx.strokeStyle = '#536b45'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx, by - s * 0.08); ctx.lineTo(bx, by - s * 0.2); ctx.stroke();
      ctx.fillStyle = '#1b2116'; ctx.fillRect(bx - s * 0.05, by - 2, s * 0.1, 4);
    },
    plainpot(ctx, cx, cy, s, v) {
      const w = s * 0.5, top = cy - s * 0.32, bot = cy + s * 0.38;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.42, top);
        ctx.bezierCurveTo(cx - w * 0.7, cy, cx - w * 0.6, bot, cx - w * 0.25, bot);
        ctx.lineTo(cx + w * 0.25, bot);
        ctx.bezierCurveTo(cx + w * 0.6, bot, cx + w * 0.7, cy, cx + w * 0.42, top);
        ctx.closePath();
      };
      shadow(ctx); path();
      ctx.fillStyle = lin(ctx, cx - w, 0, cx + w, 0, ['#5e3a24', '#a46f4a', '#53321f']); ctx.fill();
      shadow(ctx, false);
      if (v.comb) {
        ctx.save(); path(); ctx.clip();
        ctx.strokeStyle = 'rgba(40,22,10,0.75)'; ctx.lineWidth = 3;
        for (let r = 0; r < 9; r++) {
          const y0 = top + 12 + r * s * 0.08, d = r % 2 ? 1 : -1;
          for (let x = cx - w; x < cx + w; x += 13) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 10 * d, y0 + s * 0.055); ctx.stroke(); }
        }
        ctx.restore();
      }
      ellipse(ctx, cx, top, w * 0.42, s * 0.03, 'rgba(30,15,5,0.7)');
    },
    rice(ctx, cx, cy, s) {
      // 시루
      const sx = cx + s * 0.12;
      shadow(ctx);
      ctx.fillStyle = lin(ctx, sx - s * 0.25, 0, sx + s * 0.25, 0, ['#5a3a26', '#9c6a46', '#4f3220']);
      ctx.beginPath();
      ctx.moveTo(sx - s * 0.24, cy - s * 0.25); ctx.lineTo(sx + s * 0.24, cy - s * 0.25);
      ctx.lineTo(sx + s * 0.16, cy + s * 0.2); ctx.lineTo(sx - s * 0.16, cy + s * 0.2); ctx.closePath(); ctx.fill();
      shadow(ctx, false);
      ellipse(ctx, sx, cy - s * 0.25, s * 0.24, s * 0.04, '#2a170c');
      ctx.fillStyle = '#9c6a46';
      [-1, 1].forEach(k => { ctx.fillRect(sx + k * s * 0.24 - (k > 0 ? 0 : 18), cy - s * 0.12, 18, 10); });
      // 탄화미
      const r = rng(13);
      for (let i = 0; i < 160; i++) {
        const a = r() * Math.PI, d = r();
        const x = cx - s * 0.25 + Math.cos(a) * d * s * 0.18, y = cy + s * 0.32 - Math.sin(a) * d * s * 0.1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 3);
        ellipse(ctx, 0, 0, 5, 3, r() < 0.5 ? '#1a1410' : '#2e241a');
        ctx.restore();
      }
    },
    finds(ctx, cx, cy, s) {
      // 청동 검
      ctx.save(); ctx.translate(cx - s * 0.22, cy); shadow(ctx);
      ctx.fillStyle = lin(ctx, -14, 0, 14, 0, ['#3f5f48', '#8fa37a', '#344d3b']);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(14, -s * 0.05); ctx.lineTo(18, s * 0.12); ctx.lineTo(6, s * 0.25); ctx.lineTo(6, s * 0.38); ctx.lineTo(-6, s * 0.38); ctx.lineTo(-6, s * 0.25); ctx.lineTo(-18, s * 0.12); ctx.lineTo(-14, -s * 0.05); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 간 돌검
      ctx.save(); ctx.translate(cx, cy); shadow(ctx);
      ctx.fillStyle = lin(ctx, -14, 0, 14, 0, ['#6c7064', '#a9ad9e', '#5c6056']);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.38); ctx.lineTo(13, -s * 0.05); ctx.lineTo(11, s * 0.15); ctx.lineTo(22, s * 0.2); ctx.lineTo(9, s * 0.24); ctx.lineTo(9, s * 0.38); ctx.lineTo(-9, s * 0.38); ctx.lineTo(-9, s * 0.24); ctx.lineTo(-22, s * 0.2); ctx.lineTo(-11, s * 0.15); ctx.lineTo(-13, -s * 0.05); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 돌화살촉
      [[0.22, -0.2], [0.32, -0.02], [0.22, 0.16], [0.32, 0.3]].forEach(([dx, dy], i) => {
        ctx.save(); ctx.translate(cx + dx * s, cy + dy * s); ctx.rotate(0.2 * (i - 1.5)); shadow(ctx);
        ctx.fillStyle = '#8b8f84';
        ctx.beginPath(); ctx.moveTo(0, -s * 0.07); ctx.lineTo(s * 0.03, s * 0.05); ctx.lineTo(0, s * 0.035); ctx.lineTo(-s * 0.03, s * 0.05); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      shadow(ctx, false);
    },

    /* ---------- 고조선 / 공통 ---------- */
    book(ctx, cx, cy, s, v, ex) {
      const w = s * 0.5, h = s * 0.72, x = cx - w / 2, y = cy - h / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.06); ctx.translate(-cx, -cy);
      shadow(ctx);
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x + 8, y + 8, w, h);
      ctx.fillStyle = (ex && ex.cover) || '#a8915e'; ctx.fillRect(x, y, w, h);
      shadow(ctx, false);
      const r = rng(31);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(60,40,15,${0.12 * r()})`; ctx.fillRect(x + r() * w, y + r() * h, 2, 2); }
      // 제목 띠
      ctx.fillStyle = '#efe6cf'; ctx.fillRect(x + w * 0.12, y + h * 0.06, w * 0.24, h * 0.62);
      ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = 2; ctx.strokeRect(x + w * 0.12, y + h * 0.06, w * 0.24, h * 0.62);
      const title = (ex && ex.book) || '古書';
      const fs = Math.min(w * 0.18, h * 0.56 / title.length);
      ctx.fillStyle = '#1c140c'; ctx.font = `700 ${fs}px "Noto Serif KR", serif`; ctx.textAlign = 'center';
      Array.from(title).forEach((ch, i) => ctx.fillText(ch, x + w * 0.24, y + h * 0.06 + fs * (i + 1.05)));
      ctx.textAlign = 'left';
      // 실로 꿰맨 자리 (오른쪽)
      ctx.strokeStyle = '#d8cfb6'; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const yy = y + h * (0.1 + i * 0.2);
        ctx.beginPath(); ctx.moveTo(x + w, yy); ctx.lineTo(x + w - 18, yy); ctx.stroke();
        ellipse(ctx, x + w - 18, yy, 3, 3, '#2a1f14');
      }
      ctx.beginPath(); ctx.moveTo(x + w - 18, y); ctx.lineTo(x + w - 18, y + h); ctx.stroke();
      ctx.restore();
    },
    garlic(ctx, cx, cy, s) {
      // 나무 그릇
      shadow(ctx);
      ctx.fillStyle = lin(ctx, 0, cy, 0, cy + s * 0.3, ['#6b4528', '#3a2414']);
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.12, s * 0.38, s * 0.22, 0, 0, Math.PI); ctx.fill();
      shadow(ctx, false);
      ellipse(ctx, cx, cy + s * 0.12, s * 0.38, s * 0.07, '#2a180c');
      // 쑥
      const r = rng(6);
      for (let i = 0; i < 9; i++) {
        ctx.save(); ctx.translate(cx - s * 0.25 + r() * s * 0.22, cy + s * 0.08); ctx.rotate(-0.8 + r() * 1.2);
        ctx.fillStyle = r() < 0.5 ? '#5d7a46' : '#4a6438';
        ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.035, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,30,10,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.24); ctx.stroke();
        ctx.restore();
      }
      // 마늘
      [[0.1, 0.02], [0.24, 0.06], [0.16, -0.08]].forEach(([dx, dy]) => {
        const x = cx + dx * s, y = cy + dy * s;
        shadow(ctx);
        ctx.fillStyle = lin(ctx, x - 30, y, x + 30, y, ['#e9e2d2', '#c9bea5']);
        ctx.beginPath(); ctx.moveTo(x, y - s * 0.1);
        ctx.bezierCurveTo(x + s * 0.1, y - s * 0.02, x + s * 0.08, y + s * 0.08, x, y + s * 0.08);
        ctx.bezierCurveTo(x - s * 0.08, y + s * 0.08, x - s * 0.1, y - s * 0.02, x, y - s * 0.1); ctx.fill();
        shadow(ctx, false);
        ctx.strokeStyle = 'rgba(140,110,80,0.6)'; ctx.lineWidth = 1.5;
        [-0.04, 0, 0.04].forEach(k => { ctx.beginPath(); ctx.moveTo(x, y - s * 0.09); ctx.quadraticCurveTo(x + k * s * 1.5, y, x + k * s * 0.6, y + s * 0.075); ctx.stroke(); });
      });
    },

    /* ---------- 삼국과 가야 ---------- */
    hou(ctx, cx, cy, s) {
      shadow(ctx);
      ctx.fillStyle = lin(ctx, cx - s * 0.3, 0, cx + s * 0.3, 0, ['#3f5a45', '#7f9a6c', '#304636']);
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.3, s * 0.24, 0, 0, Math.PI); ctx.fill();
      ctx.fillRect(cx - s * 0.3, cy - s * 0.1, s * 0.6, s * 0.12);
      // 뚜껑
      ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.1, s * 0.31, s * 0.13, 0, Math.PI, 0); ctx.fill();
      shadow(ctx, false);
      ellipse(ctx, cx, cy - s * 0.24, s * 0.05, s * 0.03, '#2d4233');
      ctx.fillStyle = '#2d4233'; ctx.fillRect(cx - s * 0.02, cy - s * 0.3, s * 0.04, s * 0.07);
      ellipse(ctx, cx, cy - s * 0.31, s * 0.04, s * 0.025, '#7f9a6c');
      ctx.strokeStyle = 'rgba(200,215,170,0.4)'; ctx.lineWidth = 2;
      [-0.08, 0.02].forEach(dy => { ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy + dy * s); ctx.lineTo(cx + s * 0.3, cy + dy * s); ctx.stroke(); });
      // 바닥의 글자 (작은 그림)
      const bx = cx + s * 0.28, by = cy + s * 0.32;
      ellipse(ctx, bx, by, s * 0.1, s * 0.1, '#2f4434');
      ctx.fillStyle = 'rgba(220,230,190,0.85)'; ctx.font = `700 ${s * 0.045}px "Noto Serif KR", serif`; ctx.textAlign = 'center';
      ['廣開', '土地'].forEach((t, i) => ctx.fillText(t, bx, by - s * 0.01 + i * s * 0.05));
      ctx.textAlign = 'left';
    },
    chiljido(ctx, cx, cy, s) {
      ctx.save(); ctx.translate(cx, cy);
      shadow(ctx);
      ctx.strokeStyle = '#3c3a38'; ctx.lineCap = 'round';
      ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(0, s * 0.42); ctx.lineTo(0, -s * 0.42); ctx.stroke();
      ctx.lineWidth = 10;
      const branches = [[-1, -0.28], [1, -0.18], [-1, -0.04], [1, 0.08], [-1, 0.18], [1, -0.36]];
      branches.forEach(([d, y]) => {
        ctx.beginPath(); ctx.moveTo(0, y * s + s * 0.08); ctx.quadraticCurveTo(d * s * 0.12, y * s + s * 0.06, d * s * 0.13, y * s - s * 0.05); ctx.stroke();
      });
      shadow(ctx, false);
      ctx.fillStyle = 'rgba(214,180,90,0.75)';
      for (let i = 0; i < 9; i++) ctx.fillRect(-2, s * (0.02 + i * 0.035), 4, s * 0.02);
      ctx.restore();
    },
    crown(ctx, cx, cy, s) {
      const gold = lin(ctx, cx - s * 0.4, 0, cx + s * 0.4, 0, ['#8a6a24', '#e0bd5c', '#9a7428']);
      shadow(ctx);
      ctx.fillStyle = gold;
      ctx.fillRect(cx - s * 0.36, cy + s * 0.12, s * 0.72, s * 0.09);
      // 세움 장식 (풀잎 모양)
      [-0.26, -0.09, 0.09, 0.26].forEach((dx, i) => {
        const x = cx + dx * s;
        ctx.beginPath(); ctx.moveTo(x - s * 0.03, cy + s * 0.13);
        ctx.quadraticCurveTo(x - s * 0.1, cy - s * 0.1, x, cy - s * (i % 3 === 0 ? 0.3 : 0.38));
        ctx.quadraticCurveTo(x + s * 0.1, cy - s * 0.1, x + s * 0.03, cy + s * 0.13); ctx.closePath(); ctx.fill();
      });
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(80,55,15,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - s * 0.36, cy + s * 0.12, s * 0.72, s * 0.09);
      const r = rng(8);
      for (let i = 0; i < 26; i++) {
        const x = cx + (r() - 0.5) * s * 0.66, y = cy - s * 0.2 + r() * s * 0.4;
        ellipse(ctx, x, y, 5, 5, 'rgba(240,210,120,0.9)');
        ctx.strokeStyle = 'rgba(120,90,30,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
      }
    },
    glass(ctx, cx, cy, s) {
      const x = cx - s * 0.1;
      shadow(ctx);
      ctx.fillStyle = 'rgba(120,180,170,0.55)';
      ctx.beginPath(); ctx.ellipse(x, cy + s * 0.15, s * 0.16, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - s * 0.03, cy - s * 0.3, s * 0.06, s * 0.3);
      ctx.beginPath(); ctx.ellipse(x, cy - s * 0.31, s * 0.07, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(150,210,200,0.8)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + s * 0.03, cy - s * 0.25); ctx.quadraticCurveTo(x + s * 0.18, cy - s * 0.2, x + s * 0.14, cy + s * 0.02); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x - s * 0.05, cy + s * 0.1, s * 0.1, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      // 잔
      const gx = cx + s * 0.24, gy = cy + s * 0.2;
      shadow(ctx);
      ctx.fillStyle = 'rgba(110,160,190,0.55)';
      ctx.beginPath(); ctx.moveTo(gx - s * 0.1, gy - s * 0.12); ctx.lineTo(gx + s * 0.1, gy - s * 0.12); ctx.lineTo(gx + s * 0.06, gy + s * 0.1); ctx.lineTo(gx - s * 0.06, gy + s * 0.1); ctx.closePath(); ctx.fill();
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(220,240,255,0.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(gx, gy - s * 0.05 + i * s * 0.05, s * 0.07 - i * 6, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
    },
    toy(ctx, cx, cy, s) {
      const clay = (x0) => lin(ctx, x0 - 30, 0, x0 + 30, 0, ['#8a5a3a', '#b98358', '#7a4d30']);
      [-1, 1].forEach(k => {
        const x = cx + k * s * 0.15, top = cy - s * 0.3;
        shadow(ctx);
        ctx.fillStyle = clay(x);
        ellipse(ctx, x, top, s * 0.06, s * 0.07, clay(x));
        ctx.fillRect(x - s * 0.05, top + s * 0.05, s * 0.1, s * 0.25);
        if (k < 0) { // 남편: 바지
          ctx.fillRect(x - s * 0.06, top + s * 0.28, s * 0.045, s * 0.32);
          ctx.fillRect(x + s * 0.015, top + s * 0.28, s * 0.045, s * 0.32);
        } else {     // 부인: 주름치마
          ctx.beginPath(); ctx.moveTo(x - s * 0.06, top + s * 0.27); ctx.lineTo(x + s * 0.06, top + s * 0.27);
          ctx.lineTo(x + s * 0.13, top + s * 0.6); ctx.lineTo(x - s * 0.13, top + s * 0.6); ctx.closePath(); ctx.fill();
        }
        shadow(ctx, false);
        if (k > 0) {
          ctx.strokeStyle = 'rgba(60,30,15,0.6)'; ctx.lineWidth = 2;
          for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 3, top + s * 0.28); ctx.lineTo(x + i * 9, top + s * 0.59); ctx.stroke(); }
        }
        ellipse(ctx, x - 8, top - 3, 3, 2, '#2a160a'); ellipse(ctx, x + 8, top - 3, 3, 2, '#2a160a');
      });
    },
    jewelry(ctx, cx, cy, s) {
      [-1, 1].forEach(k => {
        ctx.save(); ctx.translate(cx + k * s * 0.18, cy + s * 0.32); ctx.scale(k, 1);
        shadow(ctx);
        ctx.strokeStyle = '#d8b04c'; ctx.lineCap = 'round';
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-s * 0.05, -s * 0.25, s * 0.08, -s * 0.4, 0, -s * 0.62); ctx.stroke();
        ctx.lineWidth = 6;
        [[-0.12, -0.2], [0.1, -0.28], [-0.1, -0.4], [0.08, -0.48]].forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.moveTo(0, dy * s + s * 0.08);
          ctx.bezierCurveTo(dx * s * 0.5, dy * s, dx * s, dy * s + s * 0.02, dx * s * 0.9, dy * s - s * 0.06); ctx.stroke();
          ctx.beginPath(); ctx.arc(dx * s * 0.9 + (dx > 0 ? -6 : 6), dy * s - s * 0.06, 7, 0, Math.PI * 1.5); ctx.stroke();
        });
        shadow(ctx, false);
        const r = rng(k > 0 ? 3 : 5);
        for (let i = 0; i < 10; i++) ellipse(ctx, (r() - 0.5) * s * 0.2, -r() * s * 0.6, 4, 4, '#f3d77d');
        ellipse(ctx, 0, -s * 0.3, 6, 6, '#5fa37a');
        ctx.restore();
      });
    },
    horsepot(ctx, cx, cy, s) {
      const stone = lin(ctx, cx - s * 0.4, cy - s * 0.3, cx + s * 0.3, cy + s * 0.3, ['#8c8c86', '#5e5e5a', '#3c3c39']);
      shadow(ctx);
      ctx.fillStyle = stone;
      // 받침
      ctx.fillRect(cx - s * 0.3, cy + s * 0.3, s * 0.6, s * 0.05);
      // 다리
      [-0.2, -0.1, 0.12, 0.22].forEach(dx => ctx.fillRect(cx + dx * s - 8, cy + s * 0.08, 16, s * 0.24));
      // 몸통과 머리
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.05, s * 0.28, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.2, cy); ctx.lineTo(cx + s * 0.36, cy - s * 0.2); ctx.lineTo(cx + s * 0.42, cy - s * 0.14); ctx.lineTo(cx + s * 0.28, cy + s * 0.06); ctx.closePath(); ctx.fill();
      // 무사
      ctx.fillRect(cx - s * 0.05, cy - s * 0.25, s * 0.1, s * 0.2);
      ellipse(ctx, cx, cy - s * 0.3, s * 0.05, s * 0.05, stone);
      ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy - s * 0.33); ctx.lineTo(cx, cy - s * 0.42); ctx.lineTo(cx + s * 0.05, cy - s * 0.33); ctx.closePath(); ctx.fill();
      // 뒤쪽 뿔잔
      ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy - s * 0.02); ctx.lineTo(cx - s * 0.3, cy - s * 0.25); ctx.lineTo(cx - s * 0.2, cy - s * 0.25); ctx.lineTo(cx - s * 0.14, cy - s * 0.02); ctx.closePath(); ctx.fill();
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(20,20,18,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.2 + i * s * 0.09, cy - s * 0.05); ctx.lineTo(cx - s * 0.18 + i * s * 0.09, cy + s * 0.15); ctx.stroke(); }
    },
    buddha(ctx, cx, cy, s) {
      const gold = lin(ctx, cx - s * 0.2, 0, cx + s * 0.2, 0, ['#7a5a20', '#d8b04c', '#8a6624']);
      shadow(ctx);
      // 광배
      ctx.fillStyle = lin(ctx, cx, cy - s * 0.45, cx, cy + s * 0.3, ['#c79a3c', '#6e4f1c']);
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.47);
      ctx.bezierCurveTo(cx + s * 0.32, cy - s * 0.35, cx + s * 0.28, cy + s * 0.2, cx + s * 0.2, cy + s * 0.3);
      ctx.lineTo(cx - s * 0.2, cy + s * 0.3);
      ctx.bezierCurveTo(cx - s * 0.28, cy + s * 0.2, cx - s * 0.32, cy - s * 0.35, cx, cy - s * 0.47); ctx.fill();
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(255,230,150,0.45)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * (0.08 + i * 0.03), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      // 몸
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.06, cy - s * 0.18); ctx.lineTo(cx + s * 0.06, cy - s * 0.18);
      ctx.lineTo(cx + s * 0.11, cy + s * 0.28); ctx.lineTo(cx - s * 0.11, cy + s * 0.28); ctx.closePath(); ctx.fill();
      ellipse(ctx, cx, cy - s * 0.24, s * 0.055, s * 0.065, gold);
      ellipse(ctx, cx, cy - s * 0.31, s * 0.03, s * 0.03, '#7a5a20');
      ctx.strokeStyle = 'rgba(80,50,10,0.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.08, cy - s * 0.05 + i * s * 0.06); ctx.quadraticCurveTo(cx, cy + i * s * 0.06, cx + s * 0.08, cy - s * 0.05 + i * s * 0.06); ctx.stroke(); }
      // 연꽃 받침
      ctx.fillStyle = gold;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(cx + i * s * 0.04, cy + s * 0.32, s * 0.03, s * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
    },

    /* ---------- 통일신라와 발해 ---------- */
    document(ctx, cx, cy, s) {
      const w = s * 0.82, h = s * 0.62;
      shadow(ctx);
      paper(ctx, cx - w / 2, cy - h / 2, w, h, '#cdb98e', 21);
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 1;
      for (let x = cx - w / 2 + 22; x < cx + w / 2; x += 26) { ctx.beginPath(); ctx.moveTo(x, cy - h / 2 + 10); ctx.lineTo(x, cy + h / 2 - 10); ctx.stroke(); }
      hanjaCols(ctx, cx - w / 2 + 10, cy - h / 2 + 4, w - 20, h - 16, 20, 'rgba(35,22,10,0.85)', 77);
    },
    warrior(ctx, cx, cy, s) {
      const stone = lin(ctx, cx - s * 0.25, 0, cx + s * 0.25, 0, ['#6f6f6a', '#a7a59c', '#5f5f5a']);
      shadow(ctx);
      ctx.fillStyle = stone;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.16, cy - s * 0.12); ctx.lineTo(cx + s * 0.16, cy - s * 0.12);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.45); ctx.lineTo(cx - s * 0.2, cy + s * 0.45); ctx.closePath(); ctx.fill();
      ellipse(ctx, cx, cy - s * 0.25, s * 0.12, s * 0.14, stone);
      shadow(ctx, false);
      // 관모
      ctx.fillStyle = '#5a5a55'; ctx.fillRect(cx - s * 0.1, cy - s * 0.41, s * 0.2, s * 0.06);
      // 큰 눈, 큰 코, 수염
      ellipse(ctx, cx - s * 0.045, cy - s * 0.28, s * 0.025, s * 0.02, '#2c2c29');
      ellipse(ctx, cx + s * 0.045, cy - s * 0.28, s * 0.025, s * 0.02, '#2c2c29');
      ctx.fillStyle = '#8a8880';
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.27); ctx.lineTo(cx + s * 0.03, cy - s * 0.19); ctx.lineTo(cx - s * 0.03, cy - s * 0.19); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a4a45'; ctx.lineWidth = 3;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(cx + i * s * 0.02, cy - s * 0.17);
        ctx.quadraticCurveTo(cx + i * s * 0.03 + 6, cy - s * 0.1, cx + i * s * 0.022, cy - s * 0.04); ctx.stroke();
      }
      // 손과 몽둥이
      ctx.strokeStyle = '#55554f'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.02); ctx.lineTo(cx, cy + s * 0.42); ctx.stroke();
      ellipse(ctx, cx, cy + s * 0.04, s * 0.06, s * 0.04, '#8f8d85');
      ctx.strokeStyle = 'rgba(40,40,36,0.4)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.17, cy + s * (0.1 + i * 0.09)); ctx.lineTo(cx + s * 0.17, cy + s * (0.1 + i * 0.09)); ctx.stroke(); }
    },
    censer(ctx, cx, cy, s) {
      shadow(ctx);
      ctx.fillStyle = '#d9cfae';
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.05, s * 0.26, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.12, s * 0.2, s * 0.12, 0, Math.PI, 0); ctx.fill();
      [-0.16, 0, 0.16].forEach(dx => { ctx.fillRect(cx + dx * s - 9, cy + s * 0.2, 18, s * 0.15); });
      shadow(ctx, false);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.05, s * 0.26, s * 0.2, 0, 0, Math.PI * 2); ctx.ellipse(cx, cy - s * 0.12, s * 0.2, s * 0.12, 0, Math.PI, 0); ctx.clip();
      const r = rng(41);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = ['rgba(60,130,70,0.75)', 'rgba(190,130,40,0.75)', 'rgba(240,235,215,0.7)'][i % 3];
        const x = cx + (r() - 0.5) * s * 0.5, y = cy - s * 0.25 + r() * s * 0.2;
        ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x + 6, y + s * 0.25 * r() + 20); ctx.lineTo(x - 6, y + s * 0.25 * r() + 20); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ellipse(ctx, cx, cy - s * 0.24, s * 0.04, s * 0.04, '#3c7a4a');
      for (let i = -2; i <= 2; i++) ellipse(ctx, cx + i * s * 0.07, cy - s * 0.15, 5, 4, '#1a140c');
    },
    roof(ctx, cx, cy, s) {
      [[-0.2, '#6d6a62', '고구려', 13], [0.2, '#7a5e52', '발해', 17]].forEach(([dx, col, label, seed]) => {
        const x = cx + dx * s, R = s * 0.17;
        shadow(ctx);
        ellipse(ctx, x, cy - s * 0.05, R, R, col);
        shadow(ctx, false);
        ellipse(ctx, x, cy - s * 0.05, R * 0.82, R * 0.82, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = 'rgba(230,220,200,0.35)';
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          ctx.save(); ctx.translate(x + Math.cos(a) * R * 0.45, cy - s * 0.05 + Math.sin(a) * R * 0.45); ctx.rotate(a + Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(0, 0, R * 0.1, R * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ellipse(ctx, x, cy - s * 0.05, R * 0.15, R * 0.15, 'rgba(230,220,200,0.5)');
        ctx.fillStyle = '#d8ccb0'; ctx.font = `700 ${s * 0.05}px "Noto Serif KR", serif`; ctx.textAlign = 'center';
        ctx.fillText(label, x, cy + s * 0.25);
        ctx.textAlign = 'left';
      });
      ctx.fillStyle = '#c9bca0'; ctx.font = `500 ${s * 0.07}px "Noto Serif KR", serif`; ctx.textAlign = 'center';
      ctx.fillText('≒', cx, cy - s * 0.02); ctx.textAlign = 'left';
    },

    /* ---------- 고려 ---------- */
    statue(ctx, cx, cy, s) {
      const bronze = lin(ctx, cx - s * 0.3, 0, cx + s * 0.3, 0, ['#2e3a2e', '#6b7a5a', '#2a3329']);
      shadow(ctx);
      ctx.fillStyle = bronze;
      ctx.beginPath(); ctx.moveTo(cx - s * 0.12, cy - s * 0.14); ctx.lineTo(cx + s * 0.12, cy - s * 0.14);
      ctx.lineTo(cx + s * 0.3, cy + s * 0.4); ctx.lineTo(cx - s * 0.3, cy + s * 0.4); ctx.closePath(); ctx.fill();
      ellipse(ctx, cx, cy - s * 0.24, s * 0.1, s * 0.12, bronze);
      // 관 (위가 평평한 황제의 관)
      ctx.fillRect(cx - s * 0.1, cy - s * 0.42, s * 0.2, s * 0.12);
      ctx.fillRect(cx - s * 0.13, cy - s * 0.44, s * 0.26, s * 0.03);
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(160,190,140,0.4)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.09 + i * s * 0.045, cy - s * 0.42); ctx.lineTo(cx - s * 0.09 + i * s * 0.045, cy - s * 0.31); ctx.stroke(); }
      ellipse(ctx, cx - s * 0.035, cy - s * 0.25, 4, 2.5, '#151b14'); ellipse(ctx, cx + s * 0.035, cy - s * 0.25, 4, 2.5, '#151b14');
      // 무릎 위의 손
      ellipse(ctx, cx, cy + s * 0.12, s * 0.12, s * 0.04, '#3e4a37');
      ctx.strokeStyle = 'rgba(15,20,15,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.12); ctx.lineTo(cx, cy + s * 0.4); ctx.stroke();
    },
    hongpae(ctx, cx, cy, s) {
      const w = s * 0.86, h = s * 0.62;
      shadow(ctx);
      paper(ctx, cx - w / 2, cy - h / 2, w, h, '#a8402e', 5);
      shadow(ctx, false);
      hanjaCols(ctx, cx - w / 2 + 30, cy - h / 2 + 10, w - 60, h - 30, 30, 'rgba(25,10,6,0.85)', 99);
      ctx.strokeStyle = 'rgba(200,40,30,0.95)'; ctx.lineWidth = 4;
      ctx.strokeRect(cx - w * 0.3, cy + h * 0.05, s * 0.12, s * 0.12);
      ctx.fillStyle = 'rgba(200,40,30,0.35)'; ctx.fillRect(cx - w * 0.3, cy + h * 0.05, s * 0.12, s * 0.12);
    },
    scroll(ctx, cx, cy, s) {
      const w = s * 0.8, h = s * 0.5;
      shadow(ctx);
      ctx.fillStyle = '#e2d6b6'; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      shadow(ctx, false);
      hanjaCols(ctx, cx - w / 2 + 16, cy - h / 2 + 6, w - 32, h - 16, 22, 'rgba(25,18,10,0.85)', 10);
      [-1, 1].forEach(k => {
        ctx.fillStyle = lin(ctx, 0, cy - h / 2, 0, cy + h / 2, ['#5a3a1e', '#8a5a2e', '#4a2e16']);
        ctx.fillRect(cx + k * w / 2 - 10, cy - h / 2 - 18, 20, h + 36);
        ellipse(ctx, cx + k * w / 2, cy - h / 2 - 18, 13, 6, '#3a2410');
        ellipse(ctx, cx + k * w / 2, cy + h / 2 + 18, 13, 6, '#3a2410');
      });
    },
    sonbyeon(ctx, cx, cy, s) {
      // 검은 옷
      shadow(ctx);
      ctx.fillStyle = '#1d1c1f';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.38, cy - s * 0.05); ctx.lineTo(cx - s * 0.06, cy - s * 0.1); ctx.lineTo(cx - s * 0.02, cy + s * 0.3); ctx.lineTo(cx - s * 0.4, cy + s * 0.32); ctx.closePath(); ctx.fill();
      // 모자
      ellipse(ctx, cx + s * 0.18, cy - s * 0.12, s * 0.2, s * 0.05, '#18171a');
      ctx.fillRect(cx + s * 0.1, cy - s * 0.28, s * 0.16, s * 0.16);
      // 신발
      ctx.fillStyle = '#26232a';
      [0.08, 0.24].forEach(dx => { ctx.beginPath(); ctx.ellipse(cx + dx * s, cy + s * 0.25, s * 0.07, s * 0.035, 0.1, 0, Math.PI * 2); ctx.fill(); });
      // 종이
      ctx.fillStyle = '#e8dfc8'; ctx.fillRect(cx + s * 0.2, cy + s * 0.02, s * 0.2, s * 0.14);
      shadow(ctx, false);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.34 + i * 0.06 * s, cy - s * 0.04); ctx.lineTo(cx - s * 0.36 + i * 0.07 * s, cy + s * 0.3); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = `600 ${s * 0.04}px "Noto Sans KR", sans-serif`; ctx.textAlign = 'center';
      ['옷', '모자', '신발', '종이'].forEach((t, i) => ctx.fillText(t, cx + [-0.22, 0.18, 0.16, 0.3][i] * s, cy + [0.42, -0.32, 0.36, 0.22][i] * s));
      ctx.textAlign = 'left';
    },
    lantern(ctx, cx, cy, s) {
      const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, s * 0.45);
      halo.addColorStop(0, 'rgba(255,190,120,0.55)'); halo.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = halo; ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx, cy - s * 0.2); ctx.stroke();
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 6 - 0.5) * Math.PI * 0.9;
          const x = cx + Math.sin(a) * s * (0.22 - row * 0.02), y = cy - s * 0.12 + row * s * 0.1 + Math.cos(a) * 10;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a * 0.6);
          ctx.fillStyle = row === 2 ? '#d9708a' : ['#f2a3b5', '#ec8aa2', '#f6b8c6'][i % 3];
          ctx.beginPath(); ctx.moveTo(0, -s * 0.06); ctx.quadraticCurveTo(s * 0.05, 0, 0, s * 0.06); ctx.quadraticCurveTo(-s * 0.05, 0, 0, -s * 0.06); ctx.fill();
          ctx.restore();
        }
      }
      ellipse(ctx, cx, cy + s * 0.24, s * 0.16, s * 0.04, '#4f7a3a');
      ctx.strokeStyle = '#d9b44a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.27); ctx.lineTo(cx, cy + s * 0.4); ctx.stroke();
    },
    woodblock(ctx, cx, cy, s) {
      const w = s * 0.86, h = s * 0.42;
      shadow(ctx);
      ctx.fillStyle = lin(ctx, 0, cy - h / 2, 0, cy + h / 2, ['#5a3a20', '#3c2614']);
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.fillStyle = '#2c1a0c';
      ctx.fillRect(cx - w / 2 - 22, cy - h / 2 - 6, 22, h + 12);
      ctx.fillRect(cx + w / 2, cy - h / 2 - 6, 22, h + 12);
      shadow(ctx, false);
      hanjaCols(ctx, cx - w / 2 + 8, cy - h / 2 + 2, w - 16, h - 8, 15, 'rgba(15,8,2,0.75)', 50, true);
      ctx.strokeStyle = 'rgba(255,220,170,0.08)'; ctx.lineWidth = 1;
      for (let x = cx - w / 2; x < cx + w / 2; x += 19) { ctx.beginPath(); ctx.moveTo(x, cy - h / 2); ctx.lineTo(x, cy + h / 2); ctx.stroke(); }
    },
    type(ctx, cx, cy, s, v) {
      const n = 5, m = 4, size = s * 0.13, gap = s * 0.025;
      const x0 = cx - (n * size + (n - 1) * gap) / 2, y0 = cy - (m * size + (m - 1) * gap) / 2;
      const r = rng(12);
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const x = x0 + i * (size + gap), y = y0 + j * (size + gap);
        shadow(ctx);
        ctx.fillStyle = v.wood ? lin(ctx, x, y, x + size, y + size, ['#b98b55', '#8a6036']) : lin(ctx, x, y, x + size, y + size, ['#6d7258', '#3d4234']);
        ctx.fillRect(x, y, size, size);
        shadow(ctx, false);
        ctx.save(); ctx.translate(x + size / 2, y + size / 2); ctx.scale(-1, 1);
        ctx.fillStyle = v.wood ? 'rgba(60,35,15,0.85)' : 'rgba(200,205,170,0.8)';
        ctx.font = `700 ${size * 0.7}px "Noto Serif KR", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(HANJA[Math.floor(r() * HANJA.length)], 0, 2);
        ctx.restore();
        if (v.wood) { ctx.strokeStyle = 'rgba(90,55,25,0.5)'; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y + size * (0.2 + k * 0.3)); ctx.lineTo(x + size, y + size * (0.25 + k * 0.3)); ctx.stroke(); } }
      }
    },
    cotton(ctx, cx, cy, s) {
      ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy + s * 0.45); ctx.quadraticCurveTo(cx - s * 0.02, cy, cx + s * 0.05, cy - s * 0.3); ctx.stroke();
      ctx.lineWidth = 5;
      [[-0.2, -0.05], [0.22, 0.05], [0.12, -0.32]].forEach(([dx, dy]) => {
        const x = cx + dx * s, y = cy + dy * s;
        ctx.beginPath(); ctx.moveTo(cx, y + s * 0.12); ctx.lineTo(x, y); ctx.stroke();
        shadow(ctx);
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * Math.PI * 2;
          ellipse(ctx, x + Math.cos(a) * s * 0.05, y + Math.sin(a) * s * 0.045, s * 0.065, s * 0.06, k % 2 ? '#f4f1ea' : '#e6e1d6');
        }
        shadow(ctx, false);
        ctx.fillStyle = '#5a3a22';
        for (let k = 0; k < 4; k++) {
          const a = k / 4 * Math.PI * 2 + 0.4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s * 0.1, y + Math.sin(a) * s * 0.1); ctx.lineTo(x + Math.cos(a + 0.4) * s * 0.07, y + Math.sin(a + 0.4) * s * 0.07); ctx.fill();
        }
      });
      const r = rng(3);
      for (let i = 0; i < 7; i++) ellipse(ctx, cx + s * 0.18 + r() * s * 0.15, cy + s * 0.35 + r() * s * 0.06, 6, 4, '#2a2018');
    }
  };

  window.ARTIFACTS = A;
})();
