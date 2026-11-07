/* =========================================================
   2층 재현 거리 전시관 (three.js)
   박물관 안에 실물 크기로 꾸민 옛 거리. 복도 구조와 전시물 자리는 1층 전시실과 같고,
   벽 자리에 건물 앞면이, 길가에 인형과 소품이 놓인다.
   같은 전시관은 언제나 같은 거리이므로 달라진 인형·소품을 알아챌 수 있다.
   ========================================================= */
(function () {
  const STREETS = {
    hanyang: { left: ['palace', 'gate', 'wall', 'palace', 'wall', 'giwa'], right: ['giwa', 'wall', 'giwa', 'palace', 'giwa', 'wall'], dolls: ['official', 'yangban', 'soldier', 'farmer', 'scholar', 'woman'] },
    village: { left: ['giwa', 'wall', 'choga', 'choga', 'giwa', 'wall'], right: ['wall', 'giwa', 'choga', 'wall', 'choga', 'giwa'], dolls: ['yangban', 'woman', 'farmer', 'jungin', 'child', 'farmer'] },
    court: { left: ['palace', 'wall', 'giwa', 'palace', 'wall', 'palace'], right: ['wall', 'palace', 'wall', 'giwa', 'palace', 'wall'], dolls: ['official', 'scholar', 'jungin', 'official', 'farmer', 'child'] },
    harbor: { left: ['fort', 'fort', 'wall', 'fort', 'choga', 'fort'], right: ['choga', 'fort', 'fort', 'wall', 'fort', 'fort'], dolls: ['soldier', 'farmer', 'soldier', 'soldier', 'woman', 'official'] },
    market: { left: ['shop', 'choga', 'shop', 'shop', 'choga', 'shop'], right: ['choga', 'shop', 'shop', 'choga', 'shop', 'shop'], dolls: ['merchant', 'woman', 'farmer', 'merchant', 'child', 'yangban'] },
    alley: { left: ['wall', 'giwa', 'choga', 'wall', 'giwa', 'wall'], right: ['giwa', 'wall', 'shop', 'giwa', 'wall', 'choga'], dolls: ['scholar', 'merchant', 'yangban', 'farmer', 'woman', 'scholar'] },
    yard: { left: ['shop', 'wall', 'choga', 'choga', 'shop', 'wall'], right: ['wall', 'choga', 'shop', 'wall', 'choga', 'shop'], dolls: ['performer', 'farmer', 'child', 'performer', 'woman', 'yangban'] },
    modern: { left: ['brick', 'stucco', 'brick', 'giwa', 'stucco', 'brick'], right: ['stucco', 'brick', 'giwa', 'brick', 'stucco', 'brick'], dolls: ['suit', 'student', 'official', 'woman', 'suit', 'student'], rails: true, poles: true }
  };
  // 인형 자리: 전시물을 가리지 않는 길가
  const SPOTS = [[-2.65, -18], [-2.65, -30], [-2.65, -42], [2.75, -7.5], [2.75, -25], [2.75, -37]];
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function roofBand(x, W, y0, h, col) {
    x.fillStyle = col; x.fillRect(0, y0, W, h);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3;
    for (let i = 0; i < W; i += 18) { x.beginPath(); x.moveTo(i, y0); x.lineTo(i - 6, y0 + h); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, y0 + h, W, 6);
  }
  function lattice(x, px, py, w, h, col) {
    x.fillStyle = '#e8dcbe'; x.fillRect(px, py, w, h);
    x.strokeStyle = col; x.lineWidth = 4; x.strokeRect(px, py, w, h); x.lineWidth = 2;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(px + i * w / 4, py); x.lineTo(px + i * w / 4, py + h); x.stroke(); }
    for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(px, py + i * h / 5); x.lineTo(px + w, py + i * h / 5); x.stroke(); }
  }
  const FACADE = {
    giwa(x, W, H) {
      x.fillStyle = '#b7a585'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#d9cdb2'; x.fillRect(0, 90, W, H - 90);
      for (let i = 0; i <= 4; i++) { x.fillStyle = '#5a3a24'; x.fillRect(i * W / 4 - 10, 80, 20, H - 80); }
      [0, 1, 2, 3].forEach(i => lattice(x, 40 + i * W / 4, 120, W / 4 - 80, 96, '#6a4a2c'));
      roofBand(x, W, 0, 70, '#3c4148');
    },
    palace(x, W, H) {
      x.fillStyle = '#9c3a2c'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#2f6a60'; x.fillRect(0, 70, W, 30);
      for (let i = 0; i < W; i += 40) { x.fillStyle = i % 80 ? '#d8b04a' : '#c2452e'; x.fillRect(i + 6, 76, 28, 18); }
      for (let i = 0; i <= 4; i++) { x.fillStyle = '#7a2a20'; x.fillRect(i * W / 4 - 12, 100, 24, H - 100); }
      [0, 1, 2, 3].forEach(i => lattice(x, 40 + i * W / 4, 120, W / 4 - 80, 110, '#2f6a60'));
      x.fillStyle = '#8d8675'; x.fillRect(0, H - 22, W, 22);
      roofBand(x, W, 0, 70, '#34393f');
    },
    gate(x, W, H) {
      FACADE.wall(x, W, H);
      x.fillStyle = '#7a2a20'; x.fillRect(W / 2 - 90, 40, 180, H - 40);
      x.fillStyle = '#3e2a1a'; x.fillRect(W / 2 - 74, 70, 148, H - 70);
      x.fillStyle = '#c9a45a'; x.beginPath(); x.arc(W / 2 - 14, 170, 7, 0, 7); x.arc(W / 2 + 14, 170, 7, 0, 7); x.fill();
      x.fillStyle = '#34393f'; x.fillRect(W / 2 - 110, 22, 220, 26);
    },
    wall(x, W, H) {
      x.fillStyle = '#d3c7ad'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#efe6d2'; x.fillRect(0, 56, W, 110);
      for (let i = 0; i < 60; i++) { x.fillStyle = i % 3 ? '#8b8272' : '#a39a88'; x.beginPath(); x.ellipse((i % 12) * W / 12 + 20 + (i % 24 > 11 ? 18 : 0), 182 + Math.floor(i / 12) * 19, 19, 9, 0, 0, 7); x.fill(); }
      roofBand(x, W, 26, 30, '#44484c');
      x.fillStyle = '#20242a'; x.fillRect(0, 0, W, 26);
    },
    choga(x, W, H) {
      x.fillStyle = '#c0a67c'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#a58a5e'; for (let i = 0; i < 70; i++) x.fillRect((i * 83) % W, 90 + (i * 47) % (H - 100), 12, 3);
      for (let i = 0; i <= 3; i++) { x.fillStyle = '#5a4128'; x.fillRect(i * W / 3 - 8, 80, 16, H - 80); }
      lattice(x, 60, 120, 110, 110, '#5a4128'); lattice(x, 340, 120, 110, 110, '#5a4128');
      x.fillStyle = '#3a2a1a'; x.fillRect(214, 110, 84, H - 110);
      x.fillStyle = '#b08f56'; x.beginPath(); x.moveTo(0, 90); x.quadraticCurveTo(W / 2, 20, W, 90); x.lineTo(W, 0); x.lineTo(0, 0); x.fill();
      x.strokeStyle = 'rgba(80,58,28,0.55)'; x.lineWidth = 2; for (let i = 0; i < W; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 3, 76 - Math.abs(i - W / 2) / 12); x.stroke(); }
    },
    shop(x, W, H) {
      FACADE.choga(x, W, H);
      x.fillStyle = '#7a5a36'; x.fillRect(30, 190, W - 60, 16);
      for (let i = 0; i < 12; i++) { x.fillStyle = ['#c0473a', '#d8b04a', '#5a8a54', '#8a6a40'][i % 4]; x.beginPath(); x.arc(52 + i * 36, 183, 11, 0, 7); x.fill(); }
      x.fillStyle = '#e6d9ba'; x.fillRect(W / 2 - 110, 92, 220, 20);
    },
    fort(x, W, H) {
      x.fillStyle = '#8f8877'; x.fillRect(0, 0, W, H);
      for (let j = 0; j < 8; j++) for (let i = -1; i < 8; i++) { x.strokeStyle = 'rgba(30,28,24,0.45)'; x.lineWidth = 2; x.strokeRect(i * 76 + (j % 2 ? 38 : 0), 30 + j * 32, 76, 32); }
      x.fillStyle = '#8f8877'; for (let i = 0; i < 10; i++) x.fillRect(i * 54, 0, 34, 30);
    },
    brick(x, W, H) {
      x.fillStyle = '#8c4a34'; x.fillRect(0, 0, W, H);
      for (let j = 0; j < 22; j++) for (let i = -1; i < 18; i++) { x.strokeStyle = 'rgba(40,20,14,0.3)'; x.lineWidth = 1; x.strokeRect(i * 30 + (j % 2 ? 15 : 0), j * 13, 30, 13); }
      [60, 230, 400].forEach(px => { x.fillStyle = '#d9d0ba'; x.beginPath(); x.arc(px + 30, 90, 40, Math.PI, 0); x.lineTo(px + 70, 200); x.lineTo(px - 10, 200); x.fill(); x.fillStyle = '#31475a'; x.beginPath(); x.arc(px + 30, 92, 32, Math.PI, 0); x.lineTo(px + 62, 194); x.lineTo(px - 2, 194); x.fill(); x.strokeStyle = '#d9d0ba'; x.lineWidth = 3; x.beginPath(); x.moveTo(px + 30, 60); x.lineTo(px + 30, 194); x.moveTo(px - 2, 130); x.lineTo(px + 62, 130); x.stroke(); });
      x.fillStyle = '#d9d0ba'; x.fillRect(0, 12, W, 14);
    },
    stucco(x, W, H) {
      x.fillStyle = '#ddd5c2'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#6a5a48'; x.fillRect(0, 14, W, 10); x.fillRect(0, H - 26, W, 26);
      [50, 210, 370].forEach(px => { x.fillStyle = '#34485a'; x.fillRect(px, 70, 90, 120); x.strokeStyle = '#6a5a48'; x.lineWidth = 6; x.strokeRect(px, 70, 90, 120); x.beginPath(); x.moveTo(px + 45, 70); x.lineTo(px + 45, 190); x.stroke(); });
    }
  };
  function groundTex(tex, THREE, bright, rails) {
    const c = cnv(512, 512), x = c.getContext('2d');
    x.fillStyle = bright ? '#d9c8a4' : '#463a2c'; x.fillRect(0, 0, 512, 512);
    let s = 13; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,210'},${0.1 * r()})`; x.beginPath(); x.ellipse(r() * 512, r() * 512, 2 + r() * 11, 1 + r() * 6, r() * 3, 0, 7); x.fill(); }
    if (rails) { x.fillStyle = bright ? '#7d7768' : '#23201b'; [176, 336].forEach(px => x.fillRect(px, 0, 14, 512)); for (let j = 0; j < 4; j++) { x.fillStyle = bright ? '#9c8560' : '#2c241a'; x.fillRect(150, j * 128 + 40, 212, 22); } }
    const t = tex(c, 2, 14); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }

  function build(env) {
    const { THREE, tex, HW, L, H } = env;
    const faceTex = {}, dollTex = {}, ground = {};
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7a6e5e });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    function face(kind) {
      if (faceTex[kind]) return faceTex[kind];
      const c = cnv(512, 272); FACADE[kind](c.getContext('2d'), 512, 272);
      return (faceTex[kind] = new THREE.MeshLambertMaterial({ map: tex(c) }));
    }
    // 인형: eyes closed(눈 감음) / soft(밝은 박물관의 순한 표정) / stare(눈을 뜸)
    function doll(kind, eyes) {
      const k = kind + eyes;
      if (dollTex[k]) return dollTex[k];
      const c = cnv(256, 512); window.PEOPLE.draw(c.getContext('2d'), 128, 500, 480, kind, eyes);
      return (dollTex[k] = tex(c));
    }
    function make(id) {
      const conf = STREETS[id], g = new THREE.Group(); g.visible = false;
      const flat = (w, h, mat, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
      const cube = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
      [[conf.left, -1], [conf.right, 1]].forEach(([list, side]) => list.forEach((kind, i) => {
        const z = -4 - i * 8;
        flat(8, H, face(kind), side * (HW - 0.01), H / 2, z, -side * Math.PI / 2);
        // 처마가 길 쪽으로 조금 튀어나온다
        if (kind !== 'fort' && kind !== 'brick' && kind !== 'stucco') cube(0.55, 0.1, 8, new THREE.MeshLambertMaterial({ color: kind === 'choga' || kind === 'shop' ? 0x8a6c3e : 0x34393f }), side * (HW - 0.28), 3.62, z);
      }));
      // 안내판 받침: 전시물이 건물 앞에 세운 안내판처럼 보인다
      [-9, -15, -21, -33, -39].forEach(z => cube(0.05, 2.5, 1.72, postMat, -HW - 0.01, 1.6, z));
      cube(0.05, 2.35, 3.2, postMat, -HW - 0.01, 1.8, -45);
      [-10, -17, -28, -35, -42].forEach(z => cube(0.04, 2.0, 2.76, postMat, HW - 0.035, 1.85, z));
      // 장독대: 왼쪽 길가의 항아리
      const jarMat = new THREE.MeshLambertMaterial({ color: 0x4a2f20 });
      const jarGeo = new THREE.SphereGeometry(0.26, 12, 8);
      const jars = [];
      for (let i = 0; i < 6; i++) { const j = new THREE.Mesh(jarGeo, jarMat); j.scale.y = 1.2; j.position.set(2.9 - (i % 2) * 0.5, 0.3, -19.6 - Math.floor(i / 2) * 0.55 - (i % 2) * 0.2); g.add(j); jars.push(j); }
      // 깃발
      const flagC = cnv(128, 192), fx = flagC.getContext('2d'); fx.fillStyle = '#b5472f'; fx.fillRect(0, 0, 128, 192); fx.fillStyle = '#f0e3c4'; fx.fillRect(14, 14, 100, 164);
      fx.fillStyle = '#b5472f'; fx.font = '700 66px "Noto Serif KR", serif'; fx.textAlign = 'center'; fx.fillText('展', 64, 118);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshLambertMaterial({ map: tex(flagC), side: THREE.DoubleSide }));
      flag.position.set(-2.6, 3.0, -24); g.add(flag);
      // 등불
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
      [-6, -22, -32, -46].forEach((z, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lanternMat); m.position.set(i % 2 ? 2.7 : -2.7, 3.15, z); g.add(m); });
      if (conf.poles) [-12, -30, -44].forEach(z => { cube(0.12, H - 0.1, 0.12, postMat, 2.95, H / 2, z); cube(0.9, 0.06, 0.06, postMat, 2.8, 3.6, z); });
      // 인형과 받침
      const dolls = conf.dolls.map((kind, i) => {
        const [x, z] = SPOTS[i];
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: doll(kind, 'closed'), transparent: true, depthWrite: false }));
        s.scale.set(0.95, 1.9, 1); s.position.set(x, 1.0, z); g.add(s);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 14), stoneMat); base.position.set(x, 0.03, z); g.add(base);
        return { s, kind, x, z };
      });
      const extra = new THREE.Sprite(new THREE.SpriteMaterial({ map: doll(conf.dolls[0], 'stare'), transparent: true, depthWrite: false }));
      extra.scale.set(0.95, 1.9, 1); extra.position.set(1.15, 1.0, -22.5); extra.visible = false; g.add(extra);
      return { g, conf, dolls, extra, jars, flag, lanternMat };
    }
    const built = {};
    let cur = null;

    /* ---------- 2층 전용 공포 (으스스한 박물관, 깜짝 효과 설정을 따름) ----------
       1층의 소리·암전·유령과 달리, 보지 않는 사이에 거리가 달라진다.
       - 따라오는 인형: 지나온 인형이 내가 보지 않을 때만 따라온다 (받침대는 빈 채로 남는다)
       - 고개 갸웃: 지나친 인형들의 고개가 기울어진다
       - 창호지 그림자: 벽 너머로 사람 그림자가 지나간다
       - 등 뒤의 글씨: 지나온 벽에 없던 글씨가 나타나고, 보고 나면 사라진다
       순한 맛에서는 인형이 움직이는 연출을 빼고 그림자와 글씨만 쓴다. */
    const shadowTex = (() => {
      const c = cnv(256, 512), x = c.getContext('2d');
      x.filter = 'blur(6px)'; x.fillStyle = 'rgba(0,0,0,0.9)';
      x.beginPath(); x.ellipse(128, 90, 46, 56, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(62, 150); x.quadraticCurveTo(128, 124, 194, 150); x.lineTo(214, 512); x.lineTo(42, 512); x.fill();
      return tex(c);
    })();
    const shadows = [0, 1, 2, 3].map(() => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      m.visible = false; m.renderOrder = 2; return m;
    });
    const signC = cnv(512, 300), signT = tex(signC);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.17), new THREE.MeshBasicMaterial({ map: signT, transparent: true, depthWrite: false }));
    signMesh.visible = false; signMesh.renderOrder = 2;
    const SIGNS = [['돌아보지 마'], ['보고 있어'], ['아직', '여기 있어'], ['나갈 수', '있을까'], ['거기 서']];
    function drawSignText(lines) {
      const x = signC.getContext('2d'); x.clearRect(0, 0, 512, 300);
      x.fillStyle = 'rgba(120,16,12,0.92)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 72px "Noto Serif KR", serif';
      lines.forEach((l, i) => x.fillText(l, 256, 150 + (i - (lines.length - 1) / 2) * 92));
      signT.needsUpdate = true;
    }
    const lineup = [0, 1, 2, 3, 4].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); s.scale.set(0.95, 1.9, 1); s.visible = false; return s; });
    let fx = null;
    const fxGroup = new THREE.Group();
    shadows.forEach(m => fxGroup.add(m)); fxGroup.add(signMesh); lineup.forEach(s => fxGroup.add(s));
    const rand = n => Math.floor(Math.random() * n);
    function startShadow(m, z0, side, dir, speed) {
      m.position.set(side * (HW - 0.03), 1.75, z0); m.rotation.y = -side * Math.PI / 2;
      m.visible = true; m.material.opacity = 0;
      m.userData = { t: 0, total: 5 / speed, dir, speed };
    }
    function placeSign(z, side) {
      drawSignText(SIGNS[rand(SIGNS.length)]);
      signMesh.position.set(side * (HW - 0.1), 2.3, z); signMesh.rotation.y = -side * Math.PI / 2; signMesh.visible = true;
    }
    function clearFx() { shadows.forEach(m => { m.visible = false; }); signMesh.visible = false; lineup.forEach(s => { s.visible = false; }); }
    return {
      get: id => built[id] || (built[id] = make(id)),
      // 거리 보이기: street 는 달라진 소품·인형 이름 (없으면 평소 모습)
      show(id, group, bright, change) {
        if (cur) cur.g.visible = false;
        cur = null; fx = null; clearFx();
        if (!id) return;
        if (!fxGroup.parent) group.add(fxGroup);
        const s = this.get(id);
        if (!s.g.parent) group.add(s.g);
        s.g.visible = true; cur = s;
        const base = bright ? 'soft' : 'closed';
        s.dolls.forEach(d => { d.s.material.map = doll(d.kind, base); d.s.material.needsUpdate = true; d.s.position.x = d.x; d.s.position.z = d.z; d.s.material.color.setHex(bright ? 0xffffff : 0xb8ae9e); d.s.material.rotation = 0; d.s.material.opacity = 1; });
        s.base = base;
        s.extra.visible = change === 'extra';
        s.extra.material.color.setHex(0xb8ae9e);
        s.jars.forEach((j, i) => { j.visible = i < 4 || change === 'jars'; });
        s.flag.position.x = change === 'flag' ? 2.6 : -2.6;
        s.lanternMat.color.setHex(change === 'lantern' ? 0xff4a3a : (bright ? 0xfff0c8 : 0xffd28a));
        if (change === 'stare') { const d = s.dolls[1]; d.s.material.map = doll(d.kind, 'stare'); d.s.material.needsUpdate = true; }
        if (change === 'near') { const d = s.dolls[4]; d.s.position.x = 1.0; }
      },
      // 이번 전시실에 일어날 일을 무작위로 정한다 (1층의 은근한 공포와 같은 방식)
      plan(on, mild) {
        fx = null; if (!cur || !on) return;
        fx = {
          mild,
          follow: !mild && Math.random() < 0.35 ? { d: cur.dolls[[3, 0, 4][rand(3)]], step: 0, on: false } : null,
          tilt: !mild && Math.random() < 0.45,
          shadow: Math.random() < 0.4 ? { z: -10 - Math.random() * 28, done: false } : null,
          sign: Math.random() < 0.4 ? { at: -14 - Math.random() * 18, st: 'wait', t: 0 } : null,
          empty: 0, line: 0, front: 0, stareT: 0
        };
      },
      // 깜짝 효과 (순한 맛에서는 인형이 움직이는 것 대신 그림자)
      fire(kind, pz) {
        if (!cur) return;
        if (!fx) fx = { mild: false, empty: 0, line: 0, front: 0, stareT: 0 };
        if (fx.mild && kind !== 'sign') kind = 'shadows';
        if (kind === 'stare') {
          cur.dolls.forEach(d => { d.s.material.map = doll(d.kind, 'stare'); d.s.material.needsUpdate = true; });
          fx.stareT = 2.8;
        }
        if (kind === 'shadows') shadows.forEach((m, i) => startShadow(m, pz - 1 - i * 2.2, i % 2 ? 1 : -1, i % 2 ? 1 : -1, 3 + i * 0.4));
        if (kind === 'empty') fx.empty = 3.2;
        if (kind === 'step') cur.dolls.forEach(d => { d.s.position.x = d.x - Math.sign(d.x) * 0.9; });
        if (kind === 'sign') { placeSign(pz - 5, rand(2) ? 1 : -1); fx.front = 2.6; }
        if (kind === 'lineup') {
          fx.line = 2.0;
          lineup.forEach((s, i) => { const d = cur.dolls[i % cur.dolls.length]; s.material.map = doll(d.kind, 'stare'); s.material.needsUpdate = true; s.material.color.setHex(0xb8ae9e); s.position.set(-1.7 + i * 0.85, 1.0, Math.max(-46.5, pz - 9)); s.visible = true; });
        }
      },
      // seen(x, z): 그 자리가 지금 내 화면 안에 있는지
      update(dt, pz, seen, active) {
        if (!cur || !fx) return;
        if (fx.follow && active) {
          const f = fx.follow, s = f.d.s, away = s.position.z - pz;
          if (away > 2.4 && !seen(s.position.x, s.position.z)) {
            if (!f.on) { f.on = true; s.material.map = doll(f.d.kind, 'stare'); s.material.needsUpdate = true; }
            s.position.z = Math.max(pz + 2.2, s.position.z - 2.6 * dt);
            s.position.x += (Math.sign(f.d.x) * 1.0 - s.position.x) * Math.min(1, dt * 1.2);
            f.step += dt;
            if (f.step > 0.8) { f.step = 0; if (window.SFX) SFX.step(0.1, 0.55); }
          }
        }
        if (fx.tilt) cur.dolls.forEach(d => {
          if (pz < d.z - 0.3 && pz > d.z - 6) d.s.material.rotation += ((d.x < 0 ? 0.3 : -0.3) - d.s.material.rotation) * Math.min(1, dt * 1.6);
        });
        if (fx.shadow && !fx.shadow.done && active && Math.abs(pz - fx.shadow.z) < 6) {
          fx.shadow.done = true; startShadow(shadows[0], fx.shadow.z, rand(2) ? 1 : -1, rand(2) ? 1 : -1, 2.6);
        }
        shadows.forEach(m => {
          if (!m.visible) return;
          const u = m.userData; u.t += dt; m.position.z += u.dir * u.speed * dt;
          m.material.opacity = Math.sin(Math.min(1, u.t / u.total) * Math.PI) * 0.62;
          if (u.t >= u.total) m.visible = false;
        });
        const g = fx.sign;
        if (g) {
          g.t += dt;
          if (g.st === 'wait') { if (pz < g.at && active) { g.st = 'placed'; g.t = 0; placeSign(pz + 5.5, rand(2) ? 1 : -1); } }
          else if (g.st === 'placed') {
            if (seen(signMesh.position.x, signMesh.position.z)) { g.st = 'seen'; g.t = 0; }
            else if (g.t > 16) { signMesh.visible = false; fx.sign = null; }
          } else if (g.t > 1.6) { signMesh.visible = false; fx.sign = null; }
        }
        if (fx.front > 0) { fx.front -= dt; if (fx.front <= 0) signMesh.visible = false; }
        if (fx.stareT > 0) {
          fx.stareT -= dt;
          if (fx.stareT <= 0) cur.dolls.forEach(d => { d.s.material.map = doll(d.kind, cur.base); d.s.material.needsUpdate = true; });
        }
        if (fx.empty > 0) {
          fx.empty -= dt;
          const k = fx.empty > 2.8 ? (fx.empty - 2.8) / 0.4 : fx.empty < 0.4 ? 1 - fx.empty / 0.4 : 0;
          cur.dolls.forEach(d => { d.s.material.opacity = k; });
        }
        if (fx.line > 0) { fx.line -= dt; if (fx.line <= 0) lineup.forEach(s => { s.visible = false; }); }
      },
      ground(id, bright) {
        const k = (STREETS[id].rails ? 'r' : 'n') + (bright ? 'b' : 'd');
        return ground[k] || (ground[k] = groundTex(tex, THREE, bright, STREETS[id].rails));
      }
    };
  }
  window.STREET = { build, STREETS };
})();
