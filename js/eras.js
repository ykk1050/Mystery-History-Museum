/* =========================================================
   시대별 으스스한 분위기 (으스스한 박물관에서만)
   - 같은 박물관이라도 시대마다 무서움의 종류가 다르게: 빛·안개·장식·떠다니는 것·소리
   - 해설사도 시대마다 모습과 나타나는 방식이 다르다
   - 초등학생용: 잔인한 표현 없이 어둠·안개·소리·움직임으로만 긴장감을 준다
   ========================================================= */
(function () {
  /* ---------- 시대별 설정 ----------
     fog/density: 안개, ambient: 주변광, lantern: 내 주변 빛, lamp: 천장 조명 색
     flicker: 조명 움직임(normal 가끔 깜빡 / torch 횃불 일렁임 / slow 천천히 숨쉬기 /
              pulse 맥박 / candle 촛불 / none 고요 / sequence 차례로 켜짐)
     sound: 배경 소리, particles: 떠다니는 것, decor: 벽·천장·바닥 장식
     docent.look: 해설사 모습, docent.move: 나타나는 방식, voice: 'male'이면 남자 목소리·남자 해설사(밝은 박물관) */
  const CONF = {
    paleo: { fog: 0x0a0603, density: 0.062, ambient: [0x6b4a30, 0.36], lantern: [0xff9a50, 1.25], lamp: 0xffa060,
      flicker: 'torch', sound: 'drip', particles: 'dust', decor: 'hands', docent: { look: 'paleo', move: 'fadeIn' },
      scare: { sound: 'gust', blackout: 1.5, ghost: { where: 'front', dist: 3.4, sec: 1.3 }, hint: '휘이잉… 횃불이 모두 꺼졌다!' } },
    neo: { fog: 0x0a141a, density: 0.07, ambient: [0x4a6070, 0.42], lantern: [0xbfd8ff, 0.9], lamp: 0xcfe0ff,
      flicker: 'slow', sound: 'river', particles: 'mist', decor: 'reeds', docent: { look: 'neo', move: 'float' },
      scare: { sound: 'splash', boost: 3, ghost: { where: 'behind', dist: 2.4, sec: 2.2 }, hint: '첨벙! …등 뒤에서 무언가 물을 밟았다.' } },
    bronze: { fog: 0x041210, density: 0.055, ambient: [0x3f6f62, 0.45], lantern: [0x7fe0c0, 1.0], lamp: 0x9ff0d0,
      flicker: 'pulse', sound: 'bell', particles: null, decor: 'rings', docent: { look: 'bronze', move: 'stopgo' },
      scare: { sound: 'clang', flash: 'rgba(120,255,200,0.32)', blackout: 0.8, boost: 2, hint: '데에엥—! 청동 방울이 한꺼번에 울렸다.' } },
    gojoseon: { voice: 'male', fog: 0x070d05, density: 0.066, ambient: [0x55603a, 0.38], lantern: [0xd8e0a0, 1.0], lamp: 0xe0e8b0,
      flicker: 'normal', sound: 'breath', particles: 'mist', decor: 'paws', docent: { look: 'bear', move: 'footprints' },
      scare: { sound: 'growl', footRing: true, hint: '바로 옆에서 커다란 숨소리가… 발밑에 발자국이 생겼다.' } },
    samguk: { voice: 'male', fog: 0x120804, density: 0.05, ambient: [0x7a4a30, 0.42], lantern: [0xffb070, 1.1], lamp: 0xffc080,
      flicker: 'normal', sound: 'wind', particles: 'dust', decor: 'flags', docent: { look: 'general', move: 'fromBehind' },
      scare: { sound: 'drum', boost: 3, ghost: { where: 'side', dist: 1.5, sec: 0.45, dash: true }, hint: '둥! …무언가 옆을 휙 지나갔다.' } },
    samlife: { fog: 0x0d0904, density: 0.06, ambient: [0x6a5232, 0.4], lantern: [0xffcf80, 0.95], lamp: 0xffd690,
      flicker: 'candle', sound: 'echo', particles: null, decor: 'murals', docent: { look: 'mural', move: 'wallSlide' },
      scare: { sound: 'whoosh', blackout: 1.8, ghost: { where: 'front', dist: 3, sec: 1.6, side: 2.9 }, hint: '촛불이 꺼지자… 벽 속 그림이 움직였다.' } },
    unified: { voice: 'male', fog: 0x040814, density: 0.05, ambient: [0x40507a, 0.45], lantern: [0xaac4ff, 1.0], lamp: 0xc8d8ff,
      flicker: 'none', sound: 'chime', particles: 'fireflies', decor: 'moon', docent: { look: 'statue', move: 'statue' },
      scare: { sound: 'grind', docentBehind: 2.3, hint: '드르륵… 등 뒤에서 돌 끄는 소리가 났다.' } },
    goryeo1: { voice: 'male', fog: 0x0c0608, density: 0.055, ambient: [0x6a4a58, 0.42], lantern: [0xffc0c8, 1.0], lamp: 0xffb8c8,
      flicker: 'sequence', sound: 'drum', particles: null, decor: 'lanterns', docent: { look: 'official', move: 'walk' },
      scare: { sound: 'boom', flash: 'rgba(255,180,200,0.32)', boost: 1.6, blackout: 1.0, blackoutDelay: 1.6, hint: '쿵! 연등이 한꺼번에 켜졌다가… 모두 꺼졌다.' } },
    goryeo2: { voice: 'male', fog: 0x0a0805, density: 0.06, ambient: [0x6a5a40, 0.4], lantern: [0xffe0a0, 1.0], lamp: 0xffe8b0,
      flicker: 'normal', sound: 'paper', particles: 'paper', decor: 'shelves', docent: { look: 'monk', move: 'blink' },
      scare: { sound: 'rustle', boost: 3, ghost: { where: 'front', dist: 1.9, sec: 0.6 }, hint: '촤르륵! 종잇장이 휘몰아쳤다.' } }
  };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function ell(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 긴 옷을 입은 몸 (아래로 갈수록 흐려짐)
  function robe(ctx, top, color, width, fadeTo) {
    const g = ctx.createLinearGradient(0, top, 0, 556);
    g.addColorStop(0, color); g.addColorStop(1, fadeTo || 'rgba(10,10,12,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(128 - width * 0.45, top); ctx.lineTo(128 + width * 0.45, top);
    ctx.quadraticCurveTo(128 + width * 0.7, top + 40, 128 + width * 0.62, 260);
    ctx.lineTo(128 + width * 0.8, 550); ctx.lineTo(128 - width * 0.8, 550); ctx.lineTo(128 - width * 0.62, 260);
    ctx.quadraticCurveTo(128 - width * 0.7, top + 40, 128 - width * 0.45, top); ctx.fill();
  }
  function paleFace(ctx, y, closed) {
    const fg = ctx.createRadialGradient(128, y, 4, 128, y + 4, 44);
    fg.addColorStop(0, '#d9d6cc'); fg.addColorStop(1, '#8e8b84');
    ell(ctx, 128, y, 30, 38, fg);
    ctx.fillStyle = '#121014';
    if (closed) {
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3;
      [116, 140].forEach(x => { ctx.beginPath(); ctx.arc(x, y - 2, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); });
    } else {
      ell(ctx, 116, y, 7, 5, '#121014'); ell(ctx, 140, y, 7, 5, '#121014');
    }
  }

  /* ---------- 시대별 해설사 모습 (256×560, 투명 배경) ---------- */
  const LOOKS = {
    paleo(ctx) {   // 털가죽 두건 + 횃불
      glow(ctx, 200, 210, 120, 'rgba(255,150,60,0.55)');
      robe(ctx, 120, '#3a2a1c', 120);
      ctx.fillStyle = '#5a4128';
      for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 9, 150); ctx.lineTo(64 + i * 9, 190 + (i % 3) * 10); ctx.lineTo(68 + i * 9, 150); ctx.fill(); }
      ell(ctx, 128, 88, 46, 50, '#4a3522');
      ell(ctx, 128, 96, 26, 30, '#0d0907');
      ell(ctx, 118, 96, 4, 3, 'rgba(255,180,90,0.8)'); ell(ctx, 138, 96, 4, 3, 'rgba(255,180,90,0.8)');
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(170, 170); ctx.lineTo(196, 250); ctx.stroke();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(196, 280); ctx.lineTo(204, 190); ctx.stroke();
      glow(ctx, 205, 180, 34, 'rgba(255,200,90,0.95)');
      glow(ctx, 205, 172, 18, 'rgba(255,240,180,1)');
    },
    neo(ctx) {     // 큰 갈대 삿갓으로 얼굴을 가린, 발이 없는 모습
      robe(ctx, 150, '#2c3a3e', 110, 'rgba(40,60,70,0)');
      ctx.strokeStyle = 'rgba(120,150,140,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(80 + i * 7, 160); ctx.lineTo(70 + i * 9, 470); ctx.stroke(); }
      ell(ctx, 128, 132, 22, 12, '#9a958a');
      ctx.fillStyle = '#6b5a3a';
      ctx.beginPath(); ctx.moveTo(30, 128); ctx.lineTo(128, 50); ctx.lineTo(226, 128); ctx.quadraticCurveTo(128, 142, 30, 128); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,15,0.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(128, 54); ctx.lineTo(36 + i * 17, 128); ctx.stroke(); }
      ctx.strokeStyle = '#7a8a5a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(190, 470); ctx.lineTo(198, 150); ctx.stroke();
      ctx.fillStyle = '#9aa26a'; ell(ctx, 199, 140, 6, 22, '#9aa26a');
    },
    bronze(ctx) {  // 얼굴 앞에 청동 거울을 든 제사장
      robe(ctx, 130, '#1e2a28', 120);
      ctx.fillStyle = '#2a3a34'; ctx.fillRect(88, 230, 80, 10);
      [96, 116, 136, 156].forEach(x => { ell(ctx, x, 252, 6, 7, '#8fa36a'); });
      ell(ctx, 128, 88, 30, 38, '#8e8b84');
      glow(ctx, 128, 100, 70, 'rgba(120,230,190,0.5)');
      ell(ctx, 128, 100, 44, 44, '#6f8f6a');
      ctx.strokeStyle = 'rgba(210,230,170,0.6)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(128, 100, 40 - k * 12, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 40, 100 + Math.sin(a) * 40); ctx.lineTo(128 + Math.cos(a + 0.12) * 28, 100 + Math.sin(a + 0.12) * 28); ctx.stroke(); }
      ctx.strokeStyle = '#1e2a28'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(90, 170); ctx.lineTo(96, 130); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(166, 170); ctx.lineTo(160, 130); ctx.stroke();
    },
    bear(ctx) {    // 곰 탈을 쓴 사람
      robe(ctx, 140, '#2a2018', 124);
      ell(ctx, 128, 92, 48, 46, '#3b2a1c');
      ell(ctx, 88, 54, 16, 16, '#3b2a1c'); ell(ctx, 168, 54, 16, 16, '#3b2a1c');
      ell(ctx, 88, 54, 8, 8, '#1a120c'); ell(ctx, 168, 54, 8, 8, '#1a120c');
      ell(ctx, 128, 112, 22, 16, '#5a4430');
      ell(ctx, 128, 104, 8, 6, '#120c08');
      ell(ctx, 110, 84, 5, 4, 'rgba(220,210,170,0.85)'); ell(ctx, 146, 84, 5, 4, 'rgba(220,210,170,0.85)');
      ctx.fillStyle = 'rgba(90,110,60,0.6)';
      for (let i = 0; i < 5; i++) { ell(ctx, 90 + i * 18, 236, 7, 14, 'rgba(90,120,60,0.7)'); }
    },
    general(ctx) { // 투구 쓴 장수, 깃발을 듦
      robe(ctx, 140, '#24242a', 120);
      ctx.strokeStyle = 'rgba(160,160,170,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(78, 160 + i * 18); ctx.lineTo(178, 160 + i * 18); ctx.stroke(); }
      paleFace(ctx, 100, true);
      ctx.fillStyle = '#3a3a40';
      ctx.beginPath(); ctx.moveTo(90, 98); ctx.quadraticCurveTo(128, 30, 166, 98); ctx.lineTo(166, 80); ctx.quadraticCurveTo(128, 40, 90, 80); ctx.fill();
      ctx.beginPath(); ctx.arc(128, 74, 40, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#8a2a20'; ctx.beginPath(); ctx.moveTo(124, 34); ctx.lineTo(132, 34); ctx.lineTo(128, 6); ctx.fill();
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(206, 540); ctx.lineTo(206, 40); ctx.stroke();
      ctx.fillStyle = '#5a2a3a';
      ctx.beginPath(); ctx.moveTo(206, 44); ctx.quadraticCurveTo(236, 70, 250, 60); ctx.lineTo(250, 150); ctx.quadraticCurveTo(232, 160, 206, 140); ctx.fill();
      ell(ctx, 228, 100, 10, 10, 'rgba(230,200,120,0.7)');
    },
    mural(ctx) {   // 벽화에서 나온 듯 납작한 인물
      ctx.lineWidth = 6; ctx.strokeStyle = '#2a1408';
      ctx.fillStyle = '#9b3222';
      ctx.beginPath(); ctx.moveTo(108, 150); ctx.lineTo(148, 150); ctx.lineTo(186, 540); ctx.lineTo(70, 540); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1408'; ctx.fillRect(88, 290, 80, 8);
      ctx.fillStyle = '#e9cfa6'; ctx.beginPath(); ctx.arc(128, 112, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b0f08';
      ctx.beginPath(); ctx.moveTo(98, 92); ctx.lineTo(128, 40); ctx.lineTo(158, 92); ctx.closePath(); ctx.fill();
      ctx.fillRect(112, 110, 10, 3); ctx.fillRect(134, 110, 10, 3);
      ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 2;
      const r = rng(4);
      for (let i = 0; i < 6; i++) { let x = 80 + r() * 100, y = 150 + r() * 380; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 30; y += r() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    },
    statue(ctx) {  // 돌로 된 무인상
      const st = ctx.createLinearGradient(60, 0, 196, 0);
      st.addColorStop(0, '#5f5f5a'); st.addColorStop(0.5, '#a7a59c'); st.addColorStop(1, '#5f5f5a');
      ctx.fillStyle = st;
      ctx.beginPath(); ctx.moveTo(84, 170); ctx.lineTo(172, 170); ctx.lineTo(186, 550); ctx.lineTo(70, 550); ctx.closePath(); ctx.fill();
      ell(ctx, 128, 110, 40, 48, st);
      ctx.fillStyle = '#5a5a55'; ctx.fillRect(94, 58, 68, 16);
      ell(ctx, 112, 104, 9, 7, '#2c2c29'); ell(ctx, 144, 104, 9, 7, '#2c2c29');
      ctx.fillStyle = '#8a8880'; ctx.beginPath(); ctx.moveTo(128, 104); ctx.lineTo(138, 132); ctx.lineTo(118, 132); ctx.fill();
      ctx.strokeStyle = '#4a4a45'; ctx.lineWidth = 4;
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(128 + i * 7, 138); ctx.quadraticCurveTo(132 + i * 9, 160, 128 + i * 8, 182); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(40,40,36,0.45)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(76, 220 + i * 50); ctx.lineTo(180, 220 + i * 50); ctx.stroke(); }
      ctx.strokeStyle = '#55554f'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(128, 210); ctx.lineTo(128, 520); ctx.stroke();
    },
    official(ctx) { // 관복 입은 고려 관리, 날개 달린 모자
      robe(ctx, 140, '#1c3a34', 124);
      ctx.fillStyle = '#c9a44a'; ctx.fillRect(106, 200, 44, 40);
      ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = 2; ctx.strokeRect(110, 204, 36, 32);
      paleFace(ctx, 100, true);
      ctx.fillStyle = '#121014';
      ctx.fillRect(98, 52, 60, 34);
      ctx.fillRect(30, 62, 196, 6);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(120, 250, 16, 70);
      glow(ctx, 70, 300, 50, 'rgba(255,170,190,0.55)');
      ell(ctx, 70, 300, 16, 20, 'rgba(255,190,205,0.9)');
    },
    monk(ctx) {    // 삿갓 쓴 스님, 염주
      robe(ctx, 140, '#3a3a3c', 126);
      ctx.strokeStyle = 'rgba(200,200,200,0.15)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(90, 150); ctx.lineTo(170, 300); ctx.stroke();
      ell(ctx, 128, 132, 22, 14, '#8e8b84');
      ctx.fillStyle = '#7a6a48';
      ctx.beginPath(); ctx.moveTo(40, 120); ctx.lineTo(128, 56); ctx.lineTo(216, 120); ctx.quadraticCurveTo(128, 134, 40, 120); ctx.fill();
      ctx.fillStyle = '#4a3a24';
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(i => ell(ctx, 104 + (i % 5) * 12, 220 + Math.floor(i / 5) * 12, 5, 5, '#4a3a24'));
    }
  };
  // 해설사 주위의 어두운 기운과 희미하게 빛나는 눈 (무섭되 잔인하지 않게)
  const EYES = {
    paleo: [118, 138, 96, 'rgba(255,170,80,0.95)'], neo: [116, 140, 132, 'rgba(210,235,255,0.9)'],
    bronze: [116, 140, 100, 'rgba(170,255,220,0.95)'], bear: [110, 146, 84, 'rgba(255,200,90,0.95)'],
    general: [116, 140, 100, 'rgba(220,230,255,0.9)'], mural: [117, 139, 112, 'rgba(255,230,190,0.75)'],
    statue: [112, 144, 104, 'rgba(190,210,255,0.95)'], official: [116, 140, 100, 'rgba(255,200,215,0.9)'],
    monk: [116, 140, 134, 'rgba(255,240,200,0.9)']
  };
  const docentCache = {};
  function docentCanvas(look) {
    if (docentCache[look]) return docentCache[look];
    const c = canvas(256, 560), ctx = c.getContext('2d');
    // 몸을 감싼 연기 같은 어두운 기운
    const aura = ctx.createRadialGradient(128, 260, 30, 128, 280, 250);
    aura.addColorStop(0, 'rgba(0,0,0,0.55)'); aura.addColorStop(0.6, 'rgba(0,0,0,0.25)'); aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura; ctx.fillRect(0, 0, 256, 560);
    (LOOKS[look] || LOOKS.paleo)(ctx);
    const e = EYES[look];
    if (e) {
      [e[0], e[1]].forEach(x => { glow(ctx, x, e[2], 16, e[3]); ell(ctx, x, e[2], 3.2, 2.4, 'rgba(255,255,255,0.95)'); });
    }
    docentCache[look] = c;
    return c;
  }

  /* ---------- 장식 무늬 (반복 띠 텍스처) ---------- */
  const PATTERNS = {
    hands(ctx, w, h) {   // 동굴 벽의 손바닥 그림 (황토·흰색)
      const r = rng(3);
      for (let i = 0; i < 5; i++) {
        const x = 50 + i * 100 + r() * 30, y = 40 + r() * 60, s = 0.8 + r() * 0.4;
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((r() - 0.5) * 0.6);
        ctx.fillStyle = i % 2 ? 'rgba(200,120,60,0.55)' : 'rgba(230,220,200,0.4)';
        ell(ctx, 0, 14, 14, 16, ctx.fillStyle);
        [-12, -5, 2, 9].forEach((fx, k) => { ctx.beginPath(); ctx.ellipse(fx, -6 - (k === 1 || k === 2 ? 6 : 0), 3.5, 11, 0, 0, Math.PI * 2); ctx.fill(); });
        ctx.beginPath(); ctx.ellipse(16, 10, 3.5, 9, -0.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
    reeds(ctx, w, h) {   // 갈대 그림자
      const r = rng(5);
      for (let i = 0; i < 40; i++) {
        const x = r() * w, hh = h * (0.4 + r() * 0.6);
        ctx.strokeStyle = `rgba(10,20,18,${0.5 + r() * 0.4})`; ctx.lineWidth = 2 + r() * 2;
        ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x + (r() - 0.5) * 30, h - hh / 2, x + (r() - 0.5) * 40, h - hh); ctx.stroke();
        ctx.fillStyle = 'rgba(10,20,18,0.6)'; ell(ctx, x + (r() - 0.5) * 40, h - hh, 4, 12, 'rgba(10,20,18,0.6)');
      }
    },
    rings(ctx, w, h) {   // 청동 거울 무늬
      for (let i = 0; i < 4; i++) {
        const x = 64 + i * 128, y = h / 2;
        const g = ctx.createRadialGradient(x, y, 4, x, y, 50); g.addColorStop(0, 'rgba(120,230,190,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 60, 0, 120, h);
        ctx.strokeStyle = 'rgba(140,220,180,0.55)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y, 40 - k * 12, 0, Math.PI * 2); ctx.stroke(); }
        for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(t) * 40, y + Math.sin(t) * 40); ctx.lineTo(x + Math.cos(t + 0.15) * 28, y + Math.sin(t + 0.15) * 28); ctx.stroke(); }
      }
    },
    paws(ctx, w, h) {    // 바닥의 곰·호랑이 발자국
      for (let i = 0; i < 4; i++) {
        const x = 64 + i * 128, y = i % 2 ? h * 0.35 : h * 0.65;
        ctx.fillStyle = i % 2 ? 'rgba(190,205,160,0.4)' : 'rgba(210,200,170,0.35)';   // 어두운 바닥에서 희미하게 빛나는 발자국
        ell(ctx, x, y + 8, 18, 15, ctx.fillStyle);
        [-16, -6, 6, 16].forEach((dx, k) => ell(ctx, x + dx, y - 14 - (k === 1 || k === 2 ? 4 : 0), 6, 7, ctx.fillStyle));
      }
    },
    murals(ctx, w, h) {  // 고분 벽화의 구름무늬 띠
      ctx.fillStyle = 'rgba(170,120,60,0.35)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,40,20,0.7)'; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const x = i * 64 + 32, y = h / 2;
        ctx.beginPath(); ctx.arc(x, y, 14, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 20, y - 8, 8, Math.PI, Math.PI * 2.4); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,20,10,0.7)'; ctx.fillRect(0, 0, w, 5); ctx.fillRect(0, h - 5, w, 5);
    },
    shelves(ctx, w, h) { // 목판 창고 선반
      ctx.fillStyle = 'rgba(40,25,12,0.85)'; ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 3; row++) {
        const y = row * h / 3;
        ctx.fillStyle = 'rgba(80,50,25,0.9)'; ctx.fillRect(0, y + h / 3 - 6, w, 6);
        for (let x = 4; x < w; x += 10) { ctx.fillStyle = (x / 10) % 2 ? 'rgba(110,75,40,0.9)' : 'rgba(90,60,30,0.9)'; ctx.fillRect(x, y + 8, 8, h / 3 - 16); }
      }
    }
  };
  const patternCache = {};
  function patternCanvas(kind) {
    if (patternCache[kind]) return patternCache[kind];
    const c = canvas(512, 128);
    PATTERNS[kind](c.getContext('2d'), 512, 128);
    patternCache[kind] = c;
    return c;
  }
  function spriteCanvas(kind) {
    const c = canvas(64, 64), ctx = c.getContext('2d');
    if (kind === 'paper') { ctx.fillStyle = 'rgba(235,225,200,0.9)'; ctx.fillRect(18, 22, 28, 20); }
    else if (kind === 'mist') glow(ctx, 32, 32, 32, 'rgba(200,220,230,0.5)');
    else if (kind === 'fireflies') glow(ctx, 32, 32, 30, 'rgba(220,255,140,1)');
    else glow(ctx, 32, 32, 30, 'rgba(255,220,170,0.9)');
    return c;
  }
  function footprintCanvas() {
    const c = canvas(64, 64), ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(200,215,170,0.7)';
    ell(ctx, 32, 40, 13, 12, ctx.fillStyle);
    [-12, -4, 4, 12].forEach((dx, k) => ell(ctx, 32 + dx, 22 - (k === 1 || k === 2 ? 4 : 0), 4.5, 5.5, ctx.fillStyle));
    return c;
  }

  /* ---------- 장식 만들기 ----------
     env: { THREE, tex, HW, L, H } → { group, update(dt, t, camZ) } */
  function buildDecor(kind, env) {
    const { THREE, tex, HW, L, H } = env;
    const g = new THREE.Group();
    let update = () => {};
    const band = (y, h, x, ry, opacity, repeat, additive) => {
      const t = tex(patternCanvas(kind), repeat || 10, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L - 4, h), new THREE.MeshBasicMaterial({
        map: t, transparent: true, opacity: opacity == null ? 1 : opacity, depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      m.position.set(x, y, -L / 2); m.rotation.y = ry; g.add(m);
      return m;
    };
    if (kind === 'hands') { band(3.45, 0.75, -HW + 0.03, Math.PI / 2, 0.9, 9); band(3.45, 0.75, HW - 0.03, -Math.PI / 2, 0.9, 9); }
    if (kind === 'reeds') { band(0.55, 1.1, -HW + 0.03, Math.PI / 2, 1, 12); band(0.55, 1.1, HW - 0.03, -Math.PI / 2, 1, 12); }
    if (kind === 'rings') {
      const a = band(3.55, 0.6, -HW + 0.03, Math.PI / 2, 0.8, 11, true), b = band(3.55, 0.6, HW - 0.03, -Math.PI / 2, 0.8, 11, true);
      update = (dt, t) => { const k = 0.45 + 0.4 * Math.sin(t * 1.3); a.material.opacity = b.material.opacity = k; };
    }
    if (kind === 'paws') {
      const m = band(0.02, 0.9, -0.6, 0, 0.9, 12);
      m.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    }
    if (kind === 'murals') { band(3.55, 0.55, -HW + 0.03, Math.PI / 2, 1, 14); band(3.55, 0.55, HW - 0.03, -Math.PI / 2, 1, 14); }
    if (kind === 'shelves') { band(3.6, 0.9, -HW + 0.03, Math.PI / 2, 1, 12); band(3.6, 0.9, HW - 0.03, -Math.PI / 2, 1, 12); }
    if (kind === 'flags') {   // 천장에서 늘어진 깃발이 바람에 흔들림
      const flags = [];
      const fc = canvas(64, 256), fx = fc.getContext('2d');
      fx.fillStyle = '#3a1e2a'; fx.fillRect(0, 0, 64, 256);
      fx.fillStyle = 'rgba(220,190,120,0.6)'; ell(fx, 32, 80, 18, 18, fx.fillStyle);
      fx.fillStyle = '#26121c'; fx.beginPath(); fx.moveTo(0, 256); fx.lineTo(32, 220); fx.lineTo(64, 256); fx.fill();
      const ft = tex(fc);
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.7), new THREE.MeshLambertMaterial({ map: ft, transparent: true, side: THREE.DoubleSide }));
        const pivot = new THREE.Group();
        pivot.position.set(side * 2.3, H - 0.05, -6 - i * 5.3);
        m.position.y = -0.85; pivot.add(m); g.add(pivot);
        flags.push({ pivot, ph: i * 1.7 });
      }
      update = (dt, t) => flags.forEach(f => { f.pivot.rotation.z = Math.sin(t * 1.1 + f.ph) * 0.12; f.pivot.rotation.x = Math.sin(t * 0.7 + f.ph) * 0.08; });
    }
    if (kind === 'moon') {    // 먼 끝 문 위의 창백한 달
      const mc = canvas(256, 256), mx = mc.getContext('2d');
      glow(mx, 128, 128, 128, 'rgba(200,215,255,0.6)');
      ell(mx, 128, 128, 60, 60, '#e6ecff');
      mx.fillStyle = 'rgba(160,170,200,0.4)'; ell(mx, 110, 112, 14, 10, mx.fillStyle); ell(mx, 146, 146, 10, 8, mx.fillStyle);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: tex(mc), transparent: true, depthWrite: false, fog: false }));
      m.position.set(1.9, 3.5, -L + 0.06); g.add(m);
    }
    if (kind === 'lanterns') { // 천장에 줄지어 매달린 연등: 차례로 켜졌다 꺼짐
      const lanterns = [];
      for (let i = 0; i < 12; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x40202a });
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat);
        m.position.set(i % 2 ? 1.4 : -1.4, H - 0.75, -4 - i * 3.6); g.add(m);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.55, 3), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        line.position.set(m.position.x, H - 0.3, m.position.z); g.add(line);
        lanterns.push({ mat, z: m.position.z });
      }
      update = (dt, t, camZ, scared) => {
        const head = -((t * 6) % (L + 10)) + 2;   // 빛이 출구 쪽으로 흘러감
        lanterns.forEach(l => {
          const d = Math.abs(l.z - head);
          const k = scared ? 1 : d < 4 ? 1 - d / 4 : 0;   // 깜짝 효과 때는 한꺼번에 켜짐
          l.mat.color.setRGB(0.25 + 0.75 * k, 0.12 + 0.55 * k, 0.16 + 0.6 * k);
        });
      };
    }
    return { group: g, update: (dt, t, camZ, scared) => update(dt, t, camZ, scared) };
  }

  /* ---------- 떠다니는 것 (먼지 / 안개 / 반딧불 / 종잇장) ---------- */
  function buildParticles(kind, env) {
    const { THREE, tex, HW, H } = env;
    const N = { dust: 90, mist: 26, fireflies: 34, paper: 34 }[kind];
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * (HW - 0.4);
      pos[i * 3 + 1] = kind === 'mist' ? 0.1 + Math.random() * 0.5 : Math.random() * (H - 0.3);
      pos[i * 3 + 2] = -Math.random() * 24;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1;
      seed.push(Math.random() * 10);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: tex(spriteCanvas(kind)), size: { dust: 0.05, mist: 2.6, fireflies: 0.14, paper: 0.16 }[kind],
      transparent: true, depthWrite: false, vertexColors: true, opacity: kind === 'mist' ? 0.35 : 0.9,
      blending: kind === 'paper' ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    function update(dt, t, camZ) {
      for (let i = 0; i < N; i++) {
        const s = seed[i], k = i * 3;
        if (kind === 'dust') { pos[k + 1] -= dt * 0.08; pos[k] += Math.sin(t + s) * dt * 0.05; if (pos[k + 1] < 0) pos[k + 1] = H - 0.3; }
        if (kind === 'mist') { pos[k] += Math.sin(t * 0.2 + s) * dt * 0.25; }
        if (kind === 'fireflies') {
          pos[k] += Math.sin(t * 0.8 + s) * dt * 0.3; pos[k + 1] += Math.cos(t * 0.6 + s) * dt * 0.2;
          const b = Math.max(0, Math.sin(t * 1.5 + s * 3)); col[k] = col[k + 1] = col[k + 2] = b;
        }
        if (kind === 'paper') {
          pos[k + 1] -= dt * 0.18; pos[k] += Math.sin(t * 1.2 + s) * dt * 0.35;
          if (pos[k + 1] < 0.02) pos[k + 1] = H - 0.3;
        }
        if (pos[k + 2] > camZ + 4) pos[k + 2] -= 24;     // 내 주변에만 보이도록 앞뒤로 옮긴다
        if (pos[k + 2] < camZ - 20) pos[k + 2] += 24;
      }
      geo.attributes.position.needsUpdate = true;
      if (kind === 'fireflies') geo.attributes.color.needsUpdate = true;
    }
    return { points, update };
  }

  window.ERAS = { CONF, docentCanvas, buildDecor, buildParticles, footprintCanvas };
})();
