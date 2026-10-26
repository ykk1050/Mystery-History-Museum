/* =========================================================
   캔버스로 그리는 전시물 그림 (외부 이미지 없이 동작)
   assets/ 폴더에 이미지를 넣으면 그림 대신 사용 (ASSETS.md 참고)
   ========================================================= */
(function () {
  const FONT = '"Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif';
  const SANS = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  const ERA_COLOR = {
    '구석기 시대': '#7a5c3c', '신석기 시대': '#55703d', '청동기 시대': '#2f7a72',
    '고조선': '#8a4b22', '삼국 시대': '#7d2f2f', '가야': '#5a4a7f',
    '신라': '#9a7a1f', '고려': '#2c5d7d', '백제': '#6a3d5c', '고구려': '#3d4f7a',
    '통일신라': '#a0522d', '발해': '#3d6a5a', '조선': '#4f4f4f', '중국 역사책': '#6b5a45'
  };

  // 사용자가 넣은 이미지 (ASSETS.md) — assets/manifest.json에 적힌 것만 불러온다
  const IMG = {};
  // 그림이 바뀌는 이상 현상이 있는 유물: 정상·변형 이미지가 짝으로 모두 있어야 사용
  const VARIANTS = {
    comb: ['plain'], knife: ['bronze'], dagger: ['iron'], celadon: ['white'],
    plainpot: ['comb'], type: ['wood'], suanri: ['swap']
  };
  function loadImages() {
    return fetch('assets/manifest.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : { images: [] })
      .catch(() => ({ images: [] }))
      .then(m => Promise.all((m.images || []).map(n => new Promise(res => {
        const im = new Image();
        im.onload = () => { IMG[n] = im; res(); };
        im.onerror = () => res();
        im.src = 'assets/' + n + '.png';
      }))));
  }
  // 이 유물을 이미지로 그릴 수 있으면 그 이미지를 돌려준다
  function imageFor(art, v) {
    if (!IMG[art]) return null;
    const vars = VARIANTS[art] || [];
    if (!vars.every(k => IMG[art + '_' + k])) return null;
    const on = vars.find(k => v && v[k]);
    return on ? IMG[art + '_' + on] : IMG[art];
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // 한국어 줄바꿈: 띄어쓰기 기준, 너무 길면 글자 단위
  function wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const out = [];
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { line = test; return; }
      if (line) out.push(line);
      if (ctx.measureText(w).width <= maxW) { line = w; return; }
      line = '';
      for (const ch of w) {
        if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
      }
    });
    if (line) out.push(line);
    return out;
  }
  function drawWrapped(ctx, text, x, y, maxW, lh) {
    wrap(ctx, text, maxW).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + wrap(ctx, text, maxW).length * lh;
  }

  function grain(ctx, w, h, amount, seed) {
    const r = rng(seed || 7);
    ctx.save();
    for (let i = 0; i < w * h / 60; i++) {
      ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount * r()})` : `rgba(255,255,255,${amount * 0.6 * r()})`;
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    ctx.restore();
  }

  function tagBadge(ctx, tag, x, y, size) {
    ctx.font = `700 ${size}px ${SANS}`;
    const tw = ctx.measureText(tag).width;
    const pad = size * 0.5;
    ctx.fillStyle = ERA_COLOR[tag] || '#555';
    roundRect(ctx, x, y, tw + pad * 2, size * 1.6, size * 0.3); ctx.fill();
    ctx.fillStyle = '#f4ecdc';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, x + pad, y + size * 0.82);
    ctx.textBaseline = 'alphabetic';
  }

  // 여러 줄 설명을 정해진 칸(top~bottom) 안에 맞춰 쓴다. 넘치면 글자를 한 단계씩 줄인다.
  //   lead: 줄 간격 배수, gap: 문단 사이 간격 배수, indent(l): 줄마다 들여쓰기
  const overflowLog = [];
  function fitBlock(ctx, lines, o) {
    const lead = o.lead || 1.32, gap = o.gap == null ? 0.15 : o.gap, pre = o.prefix || '';
    const indent = o.indent || (() => 0);
    let size = o.size;
    const measure = sz => {
      ctx.font = `${o.weight || 500} ${sz}px ${o.family || FONT}`;
      let y = o.top, last = o.top;
      lines.forEach(l => {
        const n = wrap(ctx, pre + l, o.maxW - indent(l)).length;
        last = y + (n - 1) * sz * lead;
        y += n * sz * lead + sz * gap;
      });
      return last + sz * 0.3;   // 마지막 줄 글자 아랫부분까지
    };
    while (size > (o.min || 14) && measure(size) > o.bottom) size -= 1;
    if (measure(size) > o.bottom) overflowLog.push((o.name || '') + ' ' + lines.join(' / '));
    ctx.font = `${o.weight || 500} ${size}px ${o.family || FONT}`;
    let y = o.top;
    lines.forEach(l => { y = drawWrapped(ctx, pre + l, o.x + indent(l), y, o.maxW - indent(l), size * lead) + size * gap; });
    return size;
  }

  // 글이 너비를 넘으면 글자 크기를 줄인다
  function fitFont(ctx, text, weight, size, min, maxW, family) {
    do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; } while (size >= min && ctx.measureText(text).width > maxW);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------- 유물 그림 ---------------- */
  const ARTS = Object.assign({}, window.ARTIFACTS, {
    handaxe(ctx, cx, cy, s) {
      const r = rng(11);
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 - Math.PI / 2;
        const top = Math.max(0, -Math.sin(a));        // 위쪽은 뾰족하게
        const rx = s * (0.34 - top * 0.12), ry = s * (0.46 + top * 0.08);
        const j = 1 + (r() - 0.5) * 0.08;
        pts.push([cx + Math.cos(a) * rx * j, cy + 0.05 * s + Math.sin(a) * ry * j]);
      }
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      const g = ctx.createLinearGradient(cx - s * 0.3, cy - s * 0.4, cx + s * 0.3, cy + s * 0.4);
      g.addColorStop(0, '#a4977f'); g.addColorStop(0.6, '#776a56'); g.addColorStop(1, '#4b4134');
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      // 떼어낸 자국(면)
      ctx.save();
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.clip();
      for (let i = 0; i < 14; i++) {
        const px = cx + (r() - 0.5) * s * 0.6, py = cy + (r() - 0.5) * s * 0.9;
        ctx.beginPath();
        ctx.ellipse(px, py, s * (0.08 + r() * 0.08), s * (0.05 + r() * 0.06), r() * 3, 0, Math.PI * 2);
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,240,210,0.10)' : 'rgba(0,0,0,0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,20,10,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    },

    comb(ctx, cx, cy, s, v, img) {
      const w = s * 0.62, top = cy - s * 0.42, bot = cy + s * 0.5;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, top);
        ctx.bezierCurveTo(cx - w * 0.56, cy + s * 0.05, cx - w * 0.25, bot - s * 0.08, cx, bot);
        ctx.bezierCurveTo(cx + w * 0.25, bot - s * 0.08, cx + w * 0.56, cy + s * 0.05, cx + w / 2, top);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
      path();
      const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, '#5a3a24'); g.addColorStop(0.45, '#9a6a45'); g.addColorStop(1, '#4a2f1d');
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      ctx.save(); path(); ctx.clip();
      if (!v.plain) {
        ctx.strokeStyle = 'rgba(40,22,10,0.75)'; ctx.lineWidth = 3;
        const rows = 9;
        for (let rI = 0; rI < rows; rI++) {
          const y0 = top + 14 + rI * (s * 0.088);
          const dir = rI % 2 ? 1 : -1;
          for (let x = cx - w; x < cx + w; x += 13) {
            ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 10 * dir, y0 + s * 0.06); ctx.stroke();
          }
        }
      }
      // 입구 테두리
      ctx.fillStyle = 'rgba(30,15,5,0.6)';
      ctx.beginPath(); ctx.ellipse(cx, top, w / 2, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    knife(ctx, cx, cy, s, v) {
      const w = s * 0.78, h = s * 0.34;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, cy + h * 0.25);
        ctx.quadraticCurveTo(cx, cy - h * 1.15, cx + w / 2, cy + h * 0.25);
        ctx.quadraticCurveTo(cx, cy + h * 0.55, cx - w / 2, cy + h * 0.25);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
      path();
      const g = ctx.createLinearGradient(0, cy - h, 0, cy + h);
      if (v.bronze) { g.addColorStop(0, '#e2b863'); g.addColorStop(0.5, '#a97a32'); g.addColorStop(1, '#5d4a22'); }
      else { g.addColorStop(0, '#9aa293'); g.addColorStop(0.6, '#6d7568'); g.addColorStop(1, '#40463d'); }
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      ctx.save(); path(); ctx.clip();
      ctx.fillStyle = v.bronze ? 'rgba(255,240,180,0.25)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(cx - w / 2, cy - h, w, h * 0.5);
      ctx.restore();
      // 끈을 꿰는 구멍 두 개
      [-1, 1].forEach(k => {
        ctx.beginPath(); ctx.arc(cx + k * w * 0.1, cy - h * 0.12, s * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = '#120c08'; ctx.fill();
      });
      // 날
      ctx.strokeStyle = v.bronze ? 'rgba(255,230,160,0.6)' : 'rgba(220,225,215,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - w / 2 + 10, cy + h * 0.27);
      ctx.quadraticCurveTo(cx, cy + h * 0.5, cx + w / 2 - 10, cy + h * 0.27); ctx.stroke();
    },

    dagger(ctx, cx, cy, s, v) {
      const L = s * 0.95, top = cy - L / 2;
      const half = t => {           // t: 0(끝)~1(아래) 폭 함수 — 비파 모양
        const base = 0.03 + t * 0.075;
        const bulge = Math.exp(-Math.pow((t - 0.62) / 0.13, 2)) * 0.09;
        return s * (base + bulge);
      };
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(cx, top);
        for (let i = 1; i <= 40; i++) { const t = i / 40; ctx.lineTo(cx + half(t), top + t * L * 0.86); }
        ctx.lineTo(cx + s * 0.03, top + L * 0.86); ctx.lineTo(cx + s * 0.025, top + L);
        ctx.lineTo(cx - s * 0.025, top + L); ctx.lineTo(cx - s * 0.03, top + L * 0.86);
        for (let i = 40; i >= 1; i--) { const t = i / 40; ctx.lineTo(cx - half(t), top + t * L * 0.86); }
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
      path();
      const g = ctx.createLinearGradient(cx - s * 0.15, 0, cx + s * 0.15, 0);
      if (v.iron) { g.addColorStop(0, '#2f2f31'); g.addColorStop(0.5, '#6a6a6e'); g.addColorStop(1, '#262628'); }
      else { g.addColorStop(0, '#3f5f48'); g.addColorStop(0.5, '#8fa37a'); g.addColorStop(1, '#344d3b'); }
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      ctx.save(); path(); ctx.clip();
      const r = rng(5);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = v.iron ? `rgba(120,60,20,${0.25 * r()})` : `rgba(160,120,60,${0.3 * r()})`;
        ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * s * 0.3, top + r() * L, r() * 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // 가운데 등대
      ctx.strokeStyle = v.iron ? 'rgba(200,200,205,0.35)' : 'rgba(210,220,170,0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, top + 6); ctx.lineTo(cx, top + L * 0.86); ctx.stroke();
    },

    gaya(ctx, cx, cy, s) {
      // 판갑옷
      ctx.save();
      ctx.translate(cx - s * 0.18, cy - s * 0.05);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 14;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.3); ctx.lineTo(-s * 0.08, -s * 0.36); ctx.lineTo(0, -s * 0.28);
      ctx.lineTo(s * 0.08, -s * 0.36); ctx.lineTo(s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.22, s * 0.1); ctx.lineTo(s * 0.17, s * 0.3); ctx.lineTo(-s * 0.17, s * 0.3);
      ctx.lineTo(-s * 0.22, s * 0.1); ctx.closePath();
      const g = ctx.createLinearGradient(-s * 0.2, 0, s * 0.2, 0);
      g.addColorStop(0, '#2b2724'); g.addColorStop(0.5, '#5b5148'); g.addColorStop(1, '#25211e');
      ctx.fillStyle = g; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(140,70,30,0.6)'; ctx.lineWidth = 2;
      for (let i = -2; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.21, i * s * 0.07); ctx.lineTo(s * 0.21, i * s * 0.07); ctx.stroke(); }
      ctx.fillStyle = '#a58a6a';
      for (let i = -2; i <= 3; i++) for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.arc(k * s * 0.055, i * s * 0.07 + 3, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // 덩이쇠 (양 끝이 넓은 쇳덩이)
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(cx + s * 0.25, cy - s * 0.22 + i * s * 0.14);
        ctx.rotate(-0.15);
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
        ctx.beginPath();
        const l = s * 0.2, a = s * 0.045, b = s * 0.018;
        ctx.moveTo(-l, -a); ctx.quadraticCurveTo(0, -b, l, -a); ctx.lineTo(l, a);
        ctx.quadraticCurveTo(0, b, -l, a); ctx.closePath();
        ctx.fillStyle = i % 2 ? '#4a3a30' : '#5a4434'; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(150,70,25,0.35)'; ctx.fillRect(-l * 0.6, -b, l * 0.9, b);
        ctx.restore();
      }
    },

    celadon(ctx, cx, cy, s, v) {
      const white = v.white;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
      const bodyGrad = ctx.createRadialGradient(cx - s * 0.1, cy - s * 0.05, s * 0.05, cx, cy + s * 0.05, s * 0.36);
      if (white) { bodyGrad.addColorStop(0, '#fbf8f1'); bodyGrad.addColorStop(1, '#bdb6a6'); }
      else { bodyGrad.addColorStop(0, '#c4dccd'); bodyGrad.addColorStop(0.6, '#7fa592'); bodyGrad.addColorStop(1, '#466b5c'); }
      ctx.fillStyle = bodyGrad;
      // 몸통
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.12, s * 0.27, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      // 목 & 뚜껑
      ctx.fillRect(cx - s * 0.07, cy - s * 0.24, s * 0.14, s * 0.18);
      ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.25, s * 0.1, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.03, 0, Math.PI * 2); ctx.fill();
      // 주둥이
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.2, cy); ctx.quadraticCurveTo(cx + s * 0.36, cy - s * 0.05, cx + s * 0.42, cy - s * 0.22);
      ctx.lineTo(cx + s * 0.38, cy - s * 0.23); ctx.quadraticCurveTo(cx + s * 0.32, cy - s * 0.0, cx + s * 0.17, cy + s * 0.08);
      ctx.closePath(); ctx.fill();
      // 손잡이
      ctx.lineWidth = s * 0.035; ctx.strokeStyle = white ? '#d8d2c4' : '#6f9886';
      ctx.beginPath(); ctx.moveTo(cx - s * 0.06, cy - s * 0.18);
      ctx.bezierCurveTo(cx - s * 0.45, cy - s * 0.25, cx - s * 0.42, cy + s * 0.15, cx - s * 0.24, cy + s * 0.15); ctx.stroke();
      // 굽
      ctx.fillRect(cx - s * 0.13, cy + s * 0.35, s * 0.26, s * 0.04);
      ctx.restore();
      if (!white) {
        // 상감 무늬: 구름과 학
        const r = rng(3);
        for (let i = 0; i < 7; i++) {
          const a = r() * Math.PI * 2, d = r() * 0.17;
          const px = cx + Math.cos(a) * s * d, py = cy + s * 0.12 + Math.sin(a) * s * d;
          ctx.strokeStyle = 'rgba(245,245,235,0.9)'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(px - 10, py + 4); ctx.lineTo(px, py - 2); ctx.lineTo(px + 10, py + 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px + 3, py - 9); ctx.stroke();
          ctx.strokeStyle = 'rgba(25,30,28,0.7)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px + 18, py + 14, 5, 0, Math.PI * 1.5); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(30,40,35,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.12, s * 0.24, s * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  });

  /* ---------------- 진열장 (유물 + 설명 카드) ---------------- */
  function drawCase(ex) {
    const W = 600, H = 900;
    const c = canvas(W, H), ctx = c.getContext('2d');
    // 벨벳 배경 + 위에서 내려오는 조명
    const bg = ctx.createRadialGradient(W / 2, 40, 20, W / 2, 300, 520);
    bg.addColorStop(0, '#5a3e2c'); bg.addColorStop(0.55, '#24170f'); bg.addColorStop(1, '#0a0605');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, 540, 0.12, 21);
    // 받침대
    ctx.fillStyle = '#1a110c';
    ctx.beginPath(); ctx.ellipse(W / 2, 492, 180, 24, 0, 0, Math.PI * 2); ctx.fill();

    const v = ex.visual || {};
    const im = imageFor(ex.art, v);
    if (im) {
      const sc = Math.min(480 / im.width, 440 / im.height);
      ctx.drawImage(im, W / 2 - im.width * sc / 2, 268 - im.height * sc / 2, im.width * sc, im.height * sc);
    } else {
      ARTS[ex.art](ctx, W / 2, 268, 440, v, ex);
    }

    // 설명 카드
    const py = 540;
    ctx.fillStyle = '#e6dcc5';
    ctx.fillRect(28, py, W - 56, H - py - 28);
    grain(ctx, W, H, 0.05, 9);
    ctx.strokeStyle = '#9c8a66'; ctx.lineWidth = 2; ctx.strokeRect(38, py + 10, W - 76, H - py - 48);
    ctx.fillStyle = '#231a12';
    fitFont(ctx, ex.title, 700, 46, 28, W - 120, FONT);
    ctx.fillText(ex.title, 60, py + 66);
    tagBadge(ctx, ex.tag, 60, py + 84, 22);
    ctx.fillStyle = '#2d241a';
    fitBlock(ctx, ex.lines, { name: ex.title, prefix: '· ', x: 60, top: py + 152, bottom: H - 46, maxW: W - 120, size: 26, min: 15 });
    return c;
  }

  /* ---------------- 고분 벽화 ---------------- */
  function figure(ctx, x, y, h, robe, seated) {
    // 간단한 벽화풍 인물: 머리, 관모, 두루마기
    const head = h * 0.13;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = robe;
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth = Math.max(2, h * 0.012);
    ctx.beginPath();
    if (seated) {
      ctx.moveTo(-h * 0.08, -h * 0.72); ctx.lineTo(h * 0.08, -h * 0.72);
      ctx.lineTo(h * 0.34, 0); ctx.lineTo(-h * 0.34, 0);
    } else {
      ctx.moveTo(-h * 0.07, -h * 0.74); ctx.lineTo(h * 0.07, -h * 0.74);
      ctx.lineTo(h * 0.17, 0); ctx.lineTo(-h * 0.17, 0);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 띠
    ctx.fillStyle = '#2a1408'; ctx.fillRect(-h * 0.12, -h * 0.45, h * 0.24, h * 0.025);
    // 머리
    ctx.fillStyle = '#e9cfa6';
    ctx.beginPath(); ctx.arc(0, -h * 0.74 - head * 0.9, head, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 관모
    ctx.fillStyle = '#1b0f08';
    ctx.beginPath(); ctx.moveTo(-head, -h * 0.74 - head * 1.4); ctx.lineTo(0, -h * 0.74 - head * 2.6);
    ctx.lineTo(head, -h * 0.74 - head * 1.4); ctx.closePath(); ctx.fill();
    // 눈
    ctx.fillStyle = '#1b0f08';
    ctx.fillRect(-head * 0.45, -h * 0.74 - head, head * 0.25, head * 0.1);
    ctx.fillRect(head * 0.2, -h * 0.74 - head, head * 0.25, head * 0.1);
    ctx.restore();
  }

  function drawMural(ex) {
    const W = 1200, H = 860;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#20150e'; ctx.fillRect(0, 0, W, H);
    // 벽화 면
    const g = ctx.createRadialGradient(W / 2, 260, 60, W / 2, 300, 700);
    g.addColorStop(0, '#d8b682'); g.addColorStop(1, '#8c6a42');
    ctx.fillStyle = g; ctx.fillRect(40, 40, W - 80, 520);
    grain(ctx, W, 600, 0.25, 33);
    // 금 간 자국
    const r = rng(77);
    ctx.strokeStyle = 'rgba(60,35,15,0.45)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      let x = 40 + r() * (W - 80), y = 40 + r() * 520;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += (r() - 0.3) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const v = ex.visual || {};
    const im = imageFor(ex.art, v);
    if (im) {
      ctx.drawImage(im, 40, 40, W - 80, 520);
    } else if (ex.art === 'dangun') {
      drawDangun(ctx, v);
    } else {
      // 귀족 (원래 크게) / 시종 (원래 작게)
      const big = 400, small = 180;
      const nobleH = v.swap ? small : big, servH = v.swap ? big * 0.92 : small;
      // 휘장
      ctx.fillStyle = 'rgba(120,30,20,0.55)';
      ctx.fillRect(230, 70, 330, 30);
      figure(ctx, 400, 520, nobleH, '#9b3222', true);
      figure(ctx, v.swap ? 160 : 190, 520, servH, '#c99a3c', false);
      figure(ctx, v.swap ? 640 : 600, 520, servH, '#c99a3c', false);
      // 재주꾼들
      figure(ctx, 850, 520, v.swap ? 300 : 170, '#5a6f3a', false);
      figure(ctx, 1010, 520, v.swap ? 300 : 170, '#7b4a8a', false);
      ctx.fillStyle = '#7d2f1f';
      [[900, 270], [950, 230], [1000, 260]].forEach(p => {
        ctx.beginPath(); ctx.arc(p[0], v.swap ? p[1] - 60 : p[1] + 60, 12, 0, Math.PI * 2); ctx.fill();
      });
    }
    // 설명 띠
    ctx.fillStyle = '#e6dcc5'; ctx.fillRect(40, 585, W - 80, 245);
    ctx.fillStyle = '#231a12';
    fitFont(ctx, ex.title, 700, 38, 24, W - 360, FONT);
    ctx.fillText(ex.title, 70, 638);
    ctx.font = `700 24px ${SANS}`;
    tagBadge(ctx, ex.tag, W - 90 - ctx.measureText(ex.tag).width - 24, 606, 24);
    ctx.fillStyle = '#2d241a';
    fitBlock(ctx, ex.lines, { name: ex.title, prefix: '· ', x: 70, top: 684, bottom: 822, maxW: W - 140, size: 28, min: 15 });
    return c;
  }

  // 고조선 건국 이야기 그림: 하늘에서 내려온 환웅 / 동굴 속 곰과 호랑이 / 단군왕검
  function drawDangun(ctx) {
    // 구름
    ctx.fillStyle = 'rgba(245,235,215,0.55)';
    [[180, 110], [250, 90], [320, 115], [140, 140], [400, 100]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.ellipse(x, y, 60, 26, 0, 0, Math.PI * 2); ctx.fill();
    });
    figure(ctx, 270, 330, 230, '#3f5f8a', false);
    ctx.strokeStyle = 'rgba(255,240,180,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(270, 130, 40, 0, Math.PI * 2); ctx.stroke();
    // 동굴
    ctx.fillStyle = '#4a3420';
    ctx.beginPath(); ctx.moveTo(470, 540); ctx.quadraticCurveTo(620, 160, 770, 540); ctx.fill();
    ctx.fillStyle = '#1c120a';
    ctx.beginPath(); ctx.moveTo(520, 540); ctx.quadraticCurveTo(620, 260, 720, 540); ctx.fill();
    // 곰
    ctx.fillStyle = '#5a3a24';
    ctx.beginPath(); ctx.ellipse(580, 490, 46, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(580, 438, 24, 0, Math.PI * 2); ctx.fill();
    [-16, 16].forEach(d => { ctx.beginPath(); ctx.arc(580 + d, 418, 9, 0, Math.PI * 2); ctx.fill(); });
    // 호랑이
    ctx.fillStyle = '#c8782c';
    ctx.beginPath(); ctx.ellipse(665, 500, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(705, 470, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a160a'; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(630 + i * 15, 478); ctx.lineTo(636 + i * 15, 500); ctx.stroke(); }
    // 쑥과 마늘
    ctx.fillStyle = '#6a8a4a'; ctx.beginPath(); ctx.ellipse(615, 530, 18, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.arc(640, 532, 8, 0, Math.PI * 2); ctx.fill();
    // 단군왕검
    figure(ctx, 960, 530, 330, '#8a3a26', false);
    ctx.fillStyle = 'rgba(120,30,20,0.55)'; ctx.fillRect(860, 150, 200, 26);
  }

  /* ---------------- 설명 패널 ---------------- */
  function panelBase(W, H, title, sub) {
    const c = canvas(W, H), ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#231c16'); g.addColorStop(1, '#130e0b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.12, 51);
    ctx.strokeStyle = '#8a7348'; ctx.lineWidth = 4; ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.strokeStyle = '#4c3e27'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.fillStyle = '#dcc38c';
    fitFont(ctx, title, 700, 58, 36, W - 130, FONT);
    ctx.fillText(title, 64, 112);
    if (sub) { ctx.fillStyle = '#ad9a72'; fitFont(ctx, sub, 500, 30, 20, W - 130, FONT); ctx.fillText(sub, 66, 162); }
    ctx.fillStyle = '#8a7348'; ctx.fillRect(64, 185, W - 128, 3);
    return [c, ctx];
  }

  function drawPanel(ex) {
    const W = 1200, H = 860;
    const [c, ctx] = panelBase(W, H, ex.title, ex.sub);
    ctx.fillStyle = '#ece2cc';
    // 내용이 많으면 글자 크기를 줄여 패널 안에 맞춘다
    fitBlock(ctx, ex.lines, { name: ex.title, x: 70, top: 258, bottom: H - 48, maxW: W - 150, size: 40, min: 20, lead: 1.3, gap: 0.5,
      indent: l => /^[①②③]/.test(l) ? 40 : 0 });
    return c;
  }

  function drawTimeline(ex) {
    const W = 1200, H = 860;
    const [c, ctx] = panelBase(W, H, ex.title, '시대가 흐르는 순서대로 살펴봅시다');
    const n = ex.steps.length;
    const x0 = 90, x1 = W - 90, y = 480;
    ctx.strokeStyle = '#8a7348'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.fillStyle = '#8a7348';
    ctx.beginPath(); ctx.moveTo(x1 + 20, y); ctx.lineTo(x1 - 10, y - 18); ctx.lineTo(x1 - 10, y + 18); ctx.fill();
    ex.steps.forEach((st, i) => {
      const x = x0 + 60 + i * ((x1 - x0 - 120) / (n - 1));
      ctx.fillStyle = '#dcc38c';
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      const up = i % 2 === 0;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ece2cc'; ctx.font = `700 44px ${FONT}`;
      const lines = st[0].split('·');
      const ny = up ? y - 70 - lines.length * 50 : y + 92;
      lines.forEach((l, k) => ctx.fillText(l + (k < lines.length - 1 ? '·' : ''), x, ny + k * 50));
      ctx.fillStyle = '#c2ad80'; ctx.font = `500 28px ${FONT}`;
      const dateLines = wrap(ctx, st[1], 250);
      dateLines.forEach((dl, k) => ctx.fillText(dl, x, (up ? y - 46 - (dateLines.length - 1 - k) * 32 : ny + lines.length * 50 + k * 32)));
      ctx.strokeStyle = 'rgba(220,195,140,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + (up ? -16 : 16)); ctx.lineTo(x, y + (up ? -30 : 40)); ctx.stroke();
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#ad9a72'; ctx.font = `500 28px ${FONT}`;
    ctx.fillText('선사 시대 ─ 문자로 쓴 기록이 없는 시대', 90, 790);
    return c;
  }

  /* ---------------- 고인돌 설명 카드 ---------------- */
  function drawLabel(ex) {
    const W = 760, H = 420;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#e6dcc5'; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.06, 4);
    ctx.strokeStyle = '#9c8a66'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.fillStyle = '#231a12';
    fitFont(ctx, ex.title, 700, 46, 28, W - 80, FONT);
    ctx.fillText(ex.title, 40, 78);
    tagBadge(ctx, ex.tag, 40, 98, 22);
    ctx.fillStyle = '#2d241a';
    fitBlock(ctx, ex.lines, { name: ex.title, prefix: '· ', x: 40, top: 180, bottom: ex.note ? H - 66 : H - 30, maxW: W - 80, size: 28, min: 15 });
    ctx.fillStyle = '#6d5f48'; ctx.font = `500 22px ${FONT}`;
    if (ex.note) ctx.fillText(ex.note, 40, H - 34);
    return c;
  }

  /* ---------------- 안내판 / 표지판 ---------------- */
  function drawRules(info, goalNo) {
    const W = 600, H = 820;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#e9e1cf'; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.07, 99);
    ctx.fillStyle = '#1b1510'; ctx.fillRect(0, 0, W, 110);
    ctx.fillStyle = '#e8c547'; ctx.font = `700 48px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('관람 안내', W / 2, 74);
    ctx.fillStyle = '#1f1812'; ctx.font = `700 31px ${FONT}`;
    const rules = [
      '이상한 전시를 놓치지 마세요.',
      '이상한 전시를 발견하면',
      '즉시 되돌아가세요.',
      '이상한 전시가 없다면',
      '앞으로 나아가세요.',
      `제${goalNo == null ? 16 : goalNo} 전시실을 지나`,
      '출구로 나가세요.'
    ];
    let y = 180;
    [[0], [1, 2], [3, 4], [5, 6]].forEach(group => {
      group.forEach(i => { ctx.fillText(rules[i], W / 2, y); y += 44; });
      y += 26;
    });
    ctx.fillStyle = '#7a1d14'; ctx.font = `700 28px ${FONT}`;
    if (info) wrap(ctx, info, W - 80).forEach((l, i) => ctx.fillText(l, W / 2, 680 + i * 40));
    ctx.textAlign = 'left';
    return c;
  }

  function drawSign(n, name, isExit) {
    const W = 1024, H = 300;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#0d0c0b'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#3a352c'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.textAlign = 'center';
    if (isExit) {
      ctx.fillStyle = '#5fdc8a'; ctx.font = `700 120px ${SANS}`;
      ctx.fillText('출구  ↑', W / 2, 165);
      ctx.font = `700 46px ${SANS}`; ctx.fillText('EXIT', W / 2, 245);
    } else {
      ctx.fillStyle = '#e8c547'; ctx.font = `700 118px ${FONT}`;
      ctx.fillText(`제 ${n} 전시실`, W / 2, 165);
      ctx.font = `600 44px ${FONT}`; ctx.fillStyle = '#b39a3a';
      ctx.fillText(name || `GALLERY  ${n}`, W / 2, 248);
    }
    ctx.textAlign = 'left';
    return c;
  }

  function drawSmallSign(text, sub, color) {
    const W = 768, H = 200;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#0d0c0b'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = color || '#e8c547'; ctx.font = `700 70px ${SANS}`;
    ctx.fillText(text, W / 2, sub ? 105 : 125);
    if (sub) { ctx.font = `500 34px ${SANS}`; ctx.globalAlpha = 0.7; ctx.fillText(sub, W / 2, 165); }
    return c;
  }

  function drawDoorPlate(text) {
    const W = 512, H = 160;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#c9c2b2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a2520'; ctx.font = `700 50px ${SANS}`; ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, 98);
    return c;
  }

  /* ---------------- 재질 텍스처 ---------------- */
  function floorTex() {
    const W = 512, H = 512;
    const c = canvas(W, H), ctx = c.getContext('2d');
    const r = rng(2);
    const pw = 64;
    for (let x = 0; x < W; x += pw) {
      for (let y = -r() * 200; y < H; y += 220 + r() * 120) {
        const l = 30 + r() * 14;
        ctx.fillStyle = `rgb(${l + 16},${l + 6},${l - 4})`;
        ctx.fillRect(x, y, pw, 400);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, pw, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, 0, 2, H);
    }
    grain(ctx, W, H, 0.2, 3);
    return c;
  }

  function wallTex() {
    const W = 512, H = 512;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#2c302a'; ctx.fillRect(0, 0, W, H);
    // 은은한 세로 줄무늬
    for (let x = 0; x < W; x += 32) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x, 0, 14, H); }
    // 아래쪽 징두리 판벽 (높이의 약 25%)
    const wy = H * 0.76;
    ctx.fillStyle = '#21170f'; ctx.fillRect(0, wy, W, H - wy);
    ctx.fillStyle = '#3a2a1b'; ctx.fillRect(0, wy, W, 8);
    for (let x = 0; x < W; x += 128) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(x + 12, wy + 22, 104, H - wy - 40);
    }
    // 위쪽 몰딩
    ctx.fillStyle = '#1b1712'; ctx.fillRect(0, 0, W, 14);
    grain(ctx, W, H, 0.14, 8);
    // 얼룩
    const r = rng(41);
    for (let i = 0; i < 6; i++) {
      const g = ctx.createRadialGradient(r() * W, r() * H * 0.7, 2, r() * W, r() * H * 0.7, 60 + r() * 80);
      g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    return c;
  }

  function glowTex(color) {
    const c = canvas(256, 256), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    return c;
  }

  function stoneTex() {
    const c = canvas(256, 256), ctx = c.getContext('2d');
    ctx.fillStyle = '#6b6a63'; ctx.fillRect(0, 0, 256, 256);
    const r = rng(17);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '20,20,18' : '200,198,185'},${0.15 * r()})`;
      ctx.beginPath(); ctx.arc(r() * 256, r() * 256, r() * 14, 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, 256, 256, 0.3, 5);
    return c;
  }

  /* ---------------- 떠도는 해설사 ---------------- */
  function drawDocent() {
    const W = 256, H = 560;
    const c = canvas(W, H), ctx = c.getContext('2d');
    if (IMG.docent) { const im = IMG.docent.docent; ctx.drawImage(im, 0, 0, W, H); return c; }
    // 등불 빛
    const lg = ctx.createRadialGradient(190, 330, 4, 190, 330, 110);
    lg.addColorStop(0, 'rgba(255,190,110,0.65)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    // 긴 옷
    const g = ctx.createLinearGradient(0, 120, 0, H);
    g.addColorStop(0, '#1c1a1e'); g.addColorStop(1, 'rgba(10,10,12,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(98, 130); ctx.lineTo(158, 130);
    ctx.quadraticCurveTo(190, 160, 186, 260);
    ctx.lineTo(206, H - 10); ctx.lineTo(50, H - 10); ctx.lineTo(70, 260);
    ctx.quadraticCurveTo(66, 160, 98, 130); ctx.fill();
    // 이름표
    ctx.fillStyle = 'rgba(200,190,160,0.55)'; ctx.fillRect(140, 190, 26, 12);
    // 얼굴
    const fg = ctx.createRadialGradient(128, 88, 4, 128, 92, 44);
    fg.addColorStop(0, '#d9d6cc'); fg.addColorStop(1, '#8e8b84');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(128, 92, 30, 40, 0, 0, Math.PI * 2); ctx.fill();
    // 머리카락
    ctx.fillStyle = '#0d0c0e';
    ctx.beginPath(); ctx.ellipse(128, 70, 34, 26, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(94, 66, 12, 70); ctx.fillRect(150, 66, 12, 70);
    // 텅 빈 눈
    ctx.fillStyle = '#121014';
    ctx.beginPath(); ctx.ellipse(116, 92, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(140, 92, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(30,20,20,0.6)'; ctx.fillRect(120, 114, 16, 2);
    // 팔과 등불
    ctx.strokeStyle = '#1c1a1e'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(170, 160); ctx.lineTo(190, 290); ctx.stroke();
    ctx.strokeStyle = '#3a2c1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(190, 290); ctx.lineTo(190, 308); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,120,0.9)'; ctx.fillRect(178, 308, 24, 34);
    ctx.strokeStyle = '#2b2116'; ctx.lineWidth = 3; ctx.strokeRect(178, 308, 24, 34);
    return c;
  }

  function drawDocentCard(speech, bright, img) {
    const W = 1000, H = 620;
    const c = canvas(W, H), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(240, 320, 20, 240, 320, 520);
    if (bright) { g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#efe4cc'); }
    else { g.addColorStop(0, '#2a2018'); g.addColorStop(1, '#070504'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img || (bright ? drawDocentBright() : drawDocent()), 110, 40, 256, 560);
    ctx.strokeStyle = bright ? '#c9b48a' : '#4c3e27'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = bright ? '#8a7350' : '#8e8676'; ctx.font = `600 30px ${SANS}`;
    ctx.fillText('— 해설사 —', 430, 130);
    ctx.fillStyle = bright ? '#2d241a' : '#e6dfcc'; ctx.font = `500 42px ${FONT}`;
    let y = 220;
    speech.split('…').map(t => t.trim()).filter(Boolean).forEach(part => {
      y = drawWrapped(ctx, part + '…', 430, y, W - 480, 58) + 14;
    });
    return c;
  }

  /* ---------------- 밝은 박물관용 ---------------- */
  function floorTexBright() {
    const W = 512, H = 512;
    const c = canvas(W, H), ctx = c.getContext('2d');
    const r = rng(2);
    const pw = 64;
    for (let x = 0; x < W; x += pw) {
      for (let y = -r() * 200; y < H; y += 220 + r() * 120) {
        const l = 190 + r() * 25;
        ctx.fillStyle = `rgb(${l},${l - 32},${l - 75})`;
        ctx.fillRect(x, y, pw, 400);
        ctx.fillStyle = 'rgba(90,60,30,0.35)'; ctx.fillRect(x, y, pw, 2);
      }
      ctx.fillStyle = 'rgba(90,60,30,0.4)'; ctx.fillRect(x, 0, 2, H);
    }
    grain(ctx, W, H, 0.08, 3);
    return c;
  }
  function wallTexBright() {
    const W = 512, H = 512;
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#f6f1e6'; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 32) { ctx.fillStyle = 'rgba(180,160,120,0.06)'; ctx.fillRect(x, 0, 14, H); }
    const wy = H * 0.76;
    ctx.fillStyle = '#c9a77a'; ctx.fillRect(0, wy, W, H - wy);
    ctx.fillStyle = '#a8865a'; ctx.fillRect(0, wy, W, 8);
    for (let x = 0; x < W; x += 128) {
      ctx.strokeStyle = 'rgba(120,85,45,0.45)'; ctx.lineWidth = 3; ctx.strokeRect(x + 12, wy + 22, 104, H - wy - 40);
    }
    ctx.fillStyle = '#e2d6be'; ctx.fillRect(0, 0, W, 14);
    grain(ctx, W, H, 0.04, 8);
    return c;
  }
  // 친절한 해설사: 웃는 얼굴, 남색 제복, 안내 책자
  function drawDocentBright(male) {
    const W = 256, H = 560;
    const c = canvas(W, H), ctx = c.getContext('2d');
    const img = male ? IMG.docent_bright_male : IMG.docent_bright;
    if (img) { ctx.drawImage(img, 0, 0, W, H); return c; }
    // 다리와 신발
    ctx.fillStyle = '#2f3a55'; ctx.fillRect(96, 400, 26, 140); ctx.fillRect(134, 400, 26, 140);
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(90, 532, 36, 16); ctx.fillRect(130, 532, 36, 16);
    // 제복 윗옷
    ctx.fillStyle = '#34486e';
    ctx.beginPath(); ctx.moveTo(84, 150); ctx.lineTo(172, 150); ctx.lineTo(186, 410); ctx.lineTo(70, 410); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath(); ctx.moveTo(116, 150); ctx.lineTo(140, 150); ctx.lineTo(128, 200); ctx.closePath(); ctx.fill();
    ctx.fillStyle = male ? '#2c4f7c' : '#c0392b'; ctx.fillRect(124, 160, 8, 34);
    ctx.fillStyle = '#f2d16b'; ctx.fillRect(146, 196, 26, 12);
    // 팔과 책자
    ctx.strokeStyle = '#34486e'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(88, 170); ctx.lineTo(78, 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(168, 170); ctx.lineTo(186, 250); ctx.lineTo(150, 270); ctx.stroke();
    ctx.fillStyle = '#e9b98f'; ctx.beginPath(); ctx.arc(78, 306, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5aa06e'; ctx.fillRect(126, 246, 40, 52);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(132, 254, 28, 6); ctx.fillRect(132, 266, 22, 4);
    // 얼굴과 머리
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.ellipse(128, 100, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b2a20';
    if (male) {   // 짧은 머리와 굵은 눈썹
      ctx.beginPath(); ctx.ellipse(128, 74, 36, 20, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(94, 70, 8, 14); ctx.fillRect(154, 70, 8, 14);
      ctx.fillRect(105, 90, 18, 4); ctx.fillRect(133, 90, 18, 4);
    } else {      // 어깨까지 내려오는 머리
      ctx.beginPath(); ctx.ellipse(128, 78, 40, 30, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(88, 76); ctx.quadraticCurveTo(82, 130, 92, 160); ctx.lineTo(104, 160); ctx.lineTo(102, 80); ctx.fill();
      ctx.beginPath(); ctx.moveTo(168, 76); ctx.quadraticCurveTo(174, 130, 164, 160); ctx.lineTo(152, 160); ctx.lineTo(154, 80); ctx.fill();
    }
    // 웃는 눈과 입, 볼
    ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(114, 102, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(142, 102, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(128, 116, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = 'rgba(230,120,110,0.35)';
    ctx.beginPath(); ctx.arc(106, 116, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(150, 116, 7, 0, Math.PI * 2); ctx.fill();
    return c;
  }

  /* 화면에 쓰는 모든 글자 (웹폰트 미리 불러오기용) */
  function allText() {
    let s = '관람안내이상한전시를놓치지마세요발견하면즉시되돌아가세요없다면앞으로나아가세요제8전시실을지나출구로나가세요0123456789GALLERYEXIT↑←→이전다음수장고관계자외출입금지복제품인천광역시강화군부근리시대가흐르는순서대로살펴봅시다선사문자로쓴기록이없는';
    s += JSON.stringify(window.ROOMS);
    return Array.from(new Set(s)).join('');
  }

  /* ---------------- 유물 모양 열쇠 조각 ----------------
     kind: 'gold'(얻은 조각) / 'hole'(입구에 파인 홈) / 'locked'(아직 못 얻은 조각의 흐린 모양) */
  const keyCache = {};
  function maskTint(mask, color) {
    const c = canvas(mask.width, mask.height), x = c.getContext('2d');
    x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function drawKeyPiece(art, size, kind) {
    const id = art + '|' + size + '|' + kind;
    if (keyCache[id]) return keyCache[id];
    const S = size, pad = Math.round(S * 0.06);
    const src = canvas(S, S), sx = src.getContext('2d');
    const im = imageFor(art, {});
    if (im) {
      const sc = Math.min((S - pad * 2) / im.width, (S - pad * 2) / im.height);
      sx.drawImage(im, S / 2 - im.width * sc / 2, S / 2 - im.height * sc / 2, im.width * sc, im.height * sc);
    } else {
      try { ARTS[art](sx, S / 2, S / 2, S * 0.86, {}, undefined); } catch (e) { sx.fillStyle = '#888'; sx.fillRect(pad, pad, S - pad * 2, S - pad * 2); }
    }
    // 그림자는 빼고 또렷한 모양만 남긴다
    const d = sx.getImageData(0, 0, S, S), mask = canvas(S, S), mx = mask.getContext('2d'), md = mx.createImageData(S, S);
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] > 200) { md.data[i] = md.data[i + 1] = md.data[i + 2] = 255; md.data[i + 3] = 255; }
    mx.putImageData(md, 0, 0);
    const out = canvas(S, S), o = out.getContext('2d');
    const b = Math.max(2, Math.round(S / 60));
    if (kind === 'hole') {
      o.drawImage(maskTint(mask, '#a8916a'), -b, -b);
      o.drawImage(maskTint(mask, '#1c140c'), b, b);
      o.drawImage(maskTint(mask, '#070504'), 0, 0);
    } else if (kind === 'locked') {
      o.globalAlpha = 0.5; o.drawImage(maskTint(mask, '#6e6352'), 0, 0); o.globalAlpha = 1;
    } else {
      const dark = maskTint(mask, '#3a2408');
      [[-b, 0], [b, 0], [0, -b], [0, b], [b, b]].forEach(([dx, dy]) => o.drawImage(dark, dx, dy));
      const g = canvas(S, S), gx = g.getContext('2d');
      const gr = gx.createLinearGradient(0, 0, S, S);
      gr.addColorStop(0, '#fff3b8'); gr.addColorStop(0.35, '#e8bd4a'); gr.addColorStop(0.65, '#a8741a'); gr.addColorStop(1, '#f6d97c');
      gx.fillStyle = gr; gx.fillRect(0, 0, S, S);
      gx.globalAlpha = 0.55; gx.globalCompositeOperation = 'overlay'; gx.drawImage(src, 0, 0);
      gx.globalAlpha = 1; gx.globalCompositeOperation = 'destination-in'; gx.drawImage(mask, 0, 0);
      o.drawImage(g, 0, 0);
    }
    keyCache[id] = out;
    return out;
  }

  window.ART = {
    drawKeyPiece,
    drawCase, drawMural, drawPanel, drawTimeline, drawLabel, drawRules, drawSign,
    drawSmallSign, drawDoorPlate, drawDocentCard, floorTex, wallTex, glowTex, stoneTex, drawDocent, floorTexBright, wallTexBright, drawDocentBright,
    loadImages, allText, overflowLog, FONT, SANS
  };
})();
