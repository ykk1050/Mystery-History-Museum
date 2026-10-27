/* =========================================================
   박물관 로비 (three.js)
   - 9개 통로: 걸어 들어가면 그 시대 전시실로 (서쪽 벽 → 북쪽 벽 → 동쪽 벽, 시대 순)
   - 2층 계단: 공사 중 (올라갈 수 없음)
   - 이상 현상 기록장 게시판, 로비 안내도
   - 동남쪽 구석(계단 뒤): 최고 난이도 미스터리 전시실 입구 — 열쇠 조각 9개를 끼우면 열린다
   좌표: 로비 안쪽 기준 (x: 서 -16 ~ 동 16, z: 북 -14 ~ 남 14). group은 전시실과 멀리 떨어진 곳에 둔다.
   ========================================================= */
(function () {
  const W2 = 16, D2 = 14, HL = 7;          // 로비 반너비, 반깊이, 천장 높이
  const DOOR_W = 2.4, DOOR_H = 3.4, TUN = 3.2;
  const R = 0.35;                          // 플레이어 몸 반지름
  const DIAG = 26;                         // 동남쪽 구석 비스듬한 벽: x + z = 26
  const MYS = { x: 14, z: 12, nx: -Math.SQRT1_2, nz: -Math.SQRT1_2 };
  const SHORT = ['구석기', '신석기', '청동기', '고조선', '삼국과 가야', '삼국 생활', '통일신라·발해', '고려 건국', '고려 문화'];

  function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function noise(ctx, w, h, n, a, seed) {
    let s = seed || 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${a * r()})`; ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  }

  // 문을 가로지르는 쇠사슬과 자물쇠
  function drawChains(x, W, H, y0, y1) {
    x.save();
    [[0, y0, W, y1], [0, y1, W, y0]].forEach(([ax, ay, bx, by]) => {
      const n = 16;
      for (let k = 0; k <= n; k++) {
        const t = k / n, px = ax + (bx - ax) * t, py = ay + (by - ay) * t + Math.sin(t * Math.PI) * 26;
        x.strokeStyle = '#2a2a2a'; x.lineWidth = 9; x.beginPath(); x.ellipse(px, py, 17, 9, Math.atan2(by - ay, bx - ax) + (k % 2 ? 1.2 : 0), 0, 7); x.stroke();
        x.strokeStyle = '#8a8a8a'; x.lineWidth = 4; x.stroke();
      }
    });
    const cy = (y0 + y1) / 2 + 26;
    x.fillStyle = '#5a5248'; x.fillRect(W / 2 - 28, cy - 10, 56, 50);
    x.strokeStyle = '#3a342c'; x.lineWidth = 8; x.beginPath(); x.arc(W / 2, cy - 10, 18, Math.PI, 0); x.stroke();
    x.fillStyle = '#1a1612'; x.beginPath(); x.arc(W / 2, cy + 12, 6, 0, 7); x.fill(); x.fillRect(W / 2 - 2.5, cy + 12, 5, 14);
    x.restore();
  }

  function build(env) {
    const { THREE, tex, ART, ROOMS, X0, keyCanvas } = env;
    const FONT = ART.FONT, SANS = ART.SANS;
    const group = new THREE.Group(); group.position.set(X0, 0, 0);
    const pickables = [];
    const brightOnly = new THREE.Group(), darkOnly = new THREE.Group();
    group.add(brightOnly, darkOnly);

    // 면: 크기에 맞춰 무늬가 늘어나지 않도록 uv를 키운다
    function plane(w, h, mat, x, y, z, ry, parent, uv, seg) {
      const g = new THREE.PlaneGeometry(w, h, seg || 1, seg || 1);
      if (uv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * w / uv[0], a.getY(i) * h / uv[1]); }
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, y, z); m.rotation.y = ry || 0;
      (parent || group).add(m);
      return m;
    }
    function box(w, h, d, mat, x, y, z, parent) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); (parent || group).add(m);
      return m;
    }
    const ryOf = (nx, nz) => Math.atan2(nx, nz);   // 이 방향을 바라보는 면의 회전

    /* ---------- 재질 (분위기마다 바꿈) ---------- */
    function floorTex(bright) {
      const c = cnv(512, 512), x = c.getContext('2d');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        x.fillStyle = bright ? ((i + j) % 2 ? '#efe5cf' : '#e0d2b4') : ((i + j) % 2 ? '#2b241b' : '#1c1712');
        x.fillRect(i * 128, j * 128, 128, 128);
      }
      noise(x, 512, 512, 2500, bright ? 0.06 : 0.12, 3);
      x.strokeStyle = bright ? 'rgba(160,130,90,0.35)' : 'rgba(0,0,0,0.6)'; x.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke(); }
      if (bright) { x.strokeStyle = 'rgba(150,130,110,0.18)'; x.lineWidth = 1.5; for (let i = 0; i < 14; i++) { x.beginPath(); let px = Math.random() * 512, py = Math.random() * 512; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (Math.random() - 0.3) * 60; py += (Math.random() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } }
      const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    }
    function wallTexOf(bright) {
      const t = tex(bright ? ART.wallTexBright() : ART.wallTex());
      t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    }
    const T = { floor: [floorTex(false), floorTex(true)], wall: [wallTexOf(false), wallTexOf(true)] };
    const floorMat = new THREE.MeshLambertMaterial({ map: T.floor[0] });
    const wallMat = new THREE.MeshLambertMaterial({ map: T.wall[0] });
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x14110d });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const tunMat = new THREE.MeshLambertMaterial({ color: 0x14110d });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6d665a });

    /* ---------- 바닥·천장 ---------- */
    const floor = plane(W2 * 2, D2 * 2, floorMat, 0, 0, 0, 0, group, [4, 4], 16);
    floor.rotation.x = -Math.PI / 2;
    const ceil = plane(W2 * 2, D2 * 2, ceilMat, 0, HL, 0, 0, group, null, 8);
    ceil.rotation.x = Math.PI / 2;
    // 가운데 바닥 무늬 (청동 거울 무늬 고리)
    const mosaicC = cnv(512, 512);
    function drawMosaic(bright) {
      const x = mosaicC.getContext('2d'); x.clearRect(0, 0, 512, 512);
      x.translate(256, 256);
      [[240, bright ? '#b08848' : '#6b5232'], [200, bright ? '#d9c08a' : '#2a2016'], [150, bright ? '#b08848' : '#5a4428'], [110, bright ? '#efe1bd' : '#1c1610']].forEach(([r, c]) => { x.fillStyle = c; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); });
      x.strokeStyle = bright ? '#8a6a30' : '#8a6c3c'; x.lineWidth = 4;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 155, Math.sin(a) * 155); x.lineTo(Math.cos(a + 0.12) * 195, Math.sin(a + 0.12) * 195); x.stroke(); }
      x.fillStyle = bright ? '#8a6a30' : '#a88a50'; x.font = `700 64px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('博', 0, 4);
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawMosaic(false);
    const mosaicT = tex(mosaicC);
    const mosaic = plane(6, 6, new THREE.MeshLambertMaterial({ map: mosaicT, transparent: true }), 0, 0.012, 0);
    mosaic.rotation.x = -Math.PI / 2;

    /* ---------- 벽 (통로 구멍 포함) ---------- */
    const passages = [];
    const walls = [
      { ax: -W2, az: D2, bx: -W2, bz: -D2, doors: [7, 0, -7].map(v => D2 - v) },    // 서쪽 벽 (남→북)
      { ax: -W2, az: -D2, bx: W2, bz: -D2, doors: [-8, 0, 8].map(v => v + W2) },    // 북쪽 벽 (서→동)
      { ax: W2, az: -D2, bx: W2, bz: DIAG - W2, doors: [-7, 0, 7].map(v => v + D2) }, // 동쪽 벽 (북→남)
      { ax: DIAG - D2, az: D2, bx: -W2, bz: D2, doors: [] },                        // 남쪽 벽
      { ax: W2, az: DIAG - W2, bx: DIAG - D2, bz: D2, doors: [] }                    // 동남쪽 비스듬한 벽
    ];
    walls.forEach(wl => {
      const len = Math.hypot(wl.bx - wl.ax, wl.bz - wl.az);
      const tx = (wl.bx - wl.ax) / len, tz = (wl.bz - wl.az) / len;
      const nx = -tz, nz = tx;                       // 방 안쪽을 향하는 방향 (시계 방향으로 돌아가며 그린 벽)
      const ry = ryOf(nx, nz);
      const at = s => [wl.ax + tx * s, wl.az + tz * s];
      let prev = 0;
      const seg = (s0, s1, y0, y1) => {
        if (s1 - s0 < 0.01) return;
        const [cx, cz] = at((s0 + s1) / 2);
        plane(s1 - s0, y1 - y0, wallMat, cx, (y0 + y1) / 2, cz, ry, group, [4, 4.2], 4);
      };
      wl.doors.forEach(s => {
        seg(prev, s - DOOR_W / 2, 0, HL);
        seg(s - DOOR_W / 2, s + DOOR_W / 2, DOOR_H, HL);
        prev = s + DOOR_W / 2;
        const [cx, cz] = at(s);
        passages.push({ i: passages.length, cx, cz, nx, nz, tx, tz });
      });
      seg(prev, len, 0, HL);
      // 걸레받이와 위쪽 띠
      const [mx, mz] = at(len / 2);
      plane(len, 0.25, trimMat, mx + nx * 0.02, 0.125, mz + nz * 0.02, ry);
      plane(len, 0.35, trimMat, mx + nx * 0.02, HL - 0.6, mz + nz * 0.02, ry);
    });

    /* ---------- 통로: 문틀, 어두운 굴, 위쪽 안내판 ---------- */
    const portalTex = [];
    const signs = [];
    passages.forEach(p => {
      const ry = ryOf(p.nx, p.nz);
      const back = (d) => [p.cx - p.nx * d, p.cz - p.nz * d];
      const [mx, mz] = back(TUN / 2);
      const sideRy = ryOf(p.tx, p.tz);
      plane(TUN, DOOR_H, tunMat, mx - p.tx * DOOR_W / 2, DOOR_H / 2, mz - p.tz * DOOR_W / 2, sideRy);
      plane(TUN, DOOR_H, tunMat, mx + p.tx * DOOR_W / 2, DOOR_H / 2, mz + p.tz * DOOR_W / 2, sideRy + Math.PI);
      const top = plane(DOOR_W, TUN, tunMat, mx, DOOR_H, mz, ry); top.rotation.order = 'YXZ'; top.rotation.x = Math.PI / 2;
      const bot = plane(DOOR_W, TUN, floorMat, mx, 0.004, mz, ry, group, [4, 4]); bot.rotation.order = 'YXZ'; bot.rotation.x = -Math.PI / 2;
      // 굴 끝: 그 시대 전시실 쪽에서 새어 나오는 빛
      const pc = cnv(128, 192);
      const pt = tex(pc); portalTex.push({ c: pc, t: pt, color: ROOMS[p.i].wall });
      const [ex, ez] = back(TUN);
      plane(DOOR_W, DOOR_H, new THREE.MeshBasicMaterial({ map: pt }), ex, DOOR_H / 2, ez, ry);
      // 문틀
      const fx = (s) => [p.cx + p.tx * s + p.nx * 0.06, p.cz + p.tz * s + p.nz * 0.06];
      [-1, 1].forEach(sd => {
        const [x, z] = fx(sd * (DOOR_W / 2 + 0.1));
        const post = box(0.22, DOOR_H + 0.2, 0.22, trimMat, x, (DOOR_H + 0.2) / 2, z);
        post.rotation.y = ry;
      });
      const [lx, lz] = fx(0);
      const lint = box(DOOR_W + 0.44, 0.24, 0.24, trimMat, lx, DOOR_H + 0.1, lz); lint.rotation.y = ry;
      // 안내판
      const sc = cnv(768, 300), st = tex(sc);
      const s = plane(3.2, 1.25, new THREE.MeshBasicMaterial({ map: st }), p.cx + p.nx * 0.05, DOOR_H + 1.05, p.cz + p.nz * 0.05, ry);
      s.userData.lobby = 'sign'; s.userData.idx = p.i; pickables.push(s);
      signs.push({ c: sc, t: st });
    });
    function drawPortal(bright) {
      portalTex.forEach(({ c, t, color }) => {
        const x = c.getContext('2d');
        const col = new THREE.Color(color);
        const rgb = `${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0}`;
        const g = x.createRadialGradient(64, 110, 4, 64, 110, 120);
        if (bright) { g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, `rgba(${rgb},0.55)`); g.addColorStop(1, '#cbbd9e'); }
        else { g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(0.45, 'rgba(10,8,6,1)'); g.addColorStop(1, '#000'); }
        x.fillStyle = bright ? '#cbbd9e' : '#000'; x.fillRect(0, 0, 128, 192);
        x.fillStyle = g; x.fillRect(0, 0, 128, 192);
        t.needsUpdate = true;
      });
    }
    function drawSignC(i, st, bright) {
      const c = signs[i].c, x = c.getContext('2d'), W = 768, H = 300;
      x.fillStyle = bright ? '#fbf3df' : '#120e0a'; x.fillRect(0, 0, W, H);
      x.strokeStyle = bright ? '#b08848' : '#6b5232'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
      x.lineWidth = 2; x.strokeRect(24, 24, W - 48, H - 48);
      // 왼쪽: 열쇠 조각 (얻었으면 금색, 아니면 흐린 모양)
      const key = keyCanvas(i, st.earned ? 'gold' : 'locked');
      x.drawImage(key, 40, 50, 200, 200);
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = bright ? '#8a6a30' : '#9a8458'; x.font = `700 30px ${SANS}`;
      x.fillText(`전시관 ${i + 1}`, 262, 78);
      x.fillStyle = bright ? '#2d241a' : '#f0e2bd';
      let fs = 70; do { x.font = `700 ${fs}px ${FONT}`; fs -= 2; } while (x.measureText(ROOMS[i].name).width > 470 && fs > 30);
      x.fillText(ROOMS[i].name, 262, 160);
      x.font = `500 30px ${SANS}`;
      x.fillStyle = st.earned ? (bright ? '#2c6d3d' : '#9fd8a8') : st.saved ? (bright ? '#9a5d10' : '#e8c547') : (bright ? '#7a6548' : '#8a7a5c');
      x.fillText(st.earned ? '🗝 탈출 성공' : st.saved ? `이어하기 · 제 ${st.saved} 전시실까지 진행` : '제8 전시실을 지나 탈출하세요', 262, 230);
      signs[i].t.needsUpdate = true;
    }

    /* ---------- 가운데: 기둥 4개, 안내도 받침대, 샹들리에 ---------- */
    const circles = [{ x: 0, z: 0, r: 1.1 }];
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
    [[-6.5, -6], [6.5, -6], [-6.5, 6], [6.5, 6]].forEach(([x, z]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, HL, 16), pillarMat);
      c.position.set(x, HL / 2, z); group.add(c);
      box(1.2, 0.3, 1.2, trimMat, x, 0.15, z);
      circles.push({ x, z, r: 0.75 });
    });
    box(1.4, 1.0, 0.9, trimMat, 0, 0.5, 0);
    const mapC = cnv(1024, 900), mapT = tex(mapC);
    const mapMesh = plane(1.5, 1.32, new THREE.MeshBasicMaterial({ map: mapT }), 0, 1.35, 0.42, 0);
    mapMesh.rotation.order = 'YXZ'; mapMesh.rotation.x = -0.55;
    mapMesh.userData.lobby = 'map'; pickables.push(mapMesh);
    const mapBack = plane(1.5, 1.32, mapMesh.material, 0, 1.35, -0.42, Math.PI);
    mapBack.rotation.order = 'YXZ'; mapBack.rotation.x = -0.55;
    mapBack.userData.lobby = 'map'; pickables.push(mapBack);
    function drawMap(st, bright) {
      const x = mapC.getContext('2d'), W = 1024, H = 900;
      x.fillStyle = bright ? '#fbf3df' : '#e6dcc5'; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#6b5232'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20);
      x.fillStyle = '#2d241a'; x.textAlign = 'center'; x.font = `700 46px ${FONT}`; x.fillText('박물관 로비 안내도', W / 2, 76);
      const ox = 140, oy = 130, sx = 744 / (W2 * 2), sz = 640 / (D2 * 2);
      const P = (lx, lz) => [ox + (lx + W2) * sx, oy + (lz + D2) * sz];
      x.fillStyle = '#efe5cf'; x.strokeStyle = '#2d241a'; x.lineWidth = 6;
      x.beginPath();
      [[-W2, -D2], [W2, -D2], [W2, DIAG - W2], [DIAG - D2, D2], [-W2, D2]].forEach((q, k) => { const [a, b] = P(q[0], q[1]); k ? x.lineTo(a, b) : x.moveTo(a, b); });
      x.closePath(); x.fill(); x.stroke();
      x.font = `700 21px ${SANS}`; x.textBaseline = 'middle';
      passages.forEach(p => {
        const [a, b] = P(p.cx, p.cz);
        x.fillStyle = st.cleared[p.i] ? '#2c6d3d' : '#9a5d10';
        x.fillRect(a - 18 - Math.abs(p.nz) * 18, b - 18 - Math.abs(p.nx) * 18, 36 + Math.abs(p.nz) * 36, 36 + Math.abs(p.nx) * 36);
        const [la, lb] = P(p.cx + p.nx * 2.6, p.cz + p.nz * 2.6);
        x.fillStyle = '#2d241a'; x.fillText(`${p.i + 1} ${SHORT[p.i]}`, la, lb);
      });
      // 계단 (공사 중)
      const [s0, s1] = P(2.6, 11.2), [s2, s3] = P(11.4, 14);
      x.fillStyle = '#d8b04a'; x.fillRect(s0, s1, s2 - s0, s3 - s1);
      x.strokeStyle = '#2d241a'; x.lineWidth = 3;
      for (let k = s0; k < s2; k += 16) { x.beginPath(); x.moveTo(k, s1); x.lineTo(k + 12, s3); x.stroke(); }
      x.fillStyle = '#2d241a'; x.fillText('🚧 2층 계단 (공사 중)', (s0 + s2) / 2, s1 - 22);
      // 기록장 게시판, 정문, 가운데 안내도
      const [b0, b1] = P(-8, 13.4); x.fillText('📜 이상 현상 기록장', b0, b1 - 20);
      const [e0, e1] = P(0, 14); x.fillText('정문', e0, e1 + 22);
      const [c0, c1] = P(0, 0); x.fillText('★ 지금 보는 안내도', c0, c1);
      // 미스터리 입구는 열쇠가 다 모이기 전까지 물음표
      const [m0, m1] = P(MYS.x, MYS.z);
      x.fillStyle = st.open ? '#b3261e' : '#5a4a3a'; x.fillText(st.open ? '🗝 미스터리 전시실' : '???', m0 - 40, m1 - 30);
      x.font = `500 24px ${SANS}`; x.fillStyle = '#5a4a3a';
      x.fillText('통로로 걸어 들어가면 그 시대의 전시실로 이동합니다.', W / 2, H - 50);
      mapT.needsUpdate = true;
    }
    // 샹들리에
    const chand = new THREE.Group(); chand.position.set(0, HL - 1.3, 0); group.add(chand);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 32), new THREE.MeshLambertMaterial({ color: 0xb08848 }));
    ring.rotation.x = Math.PI / 2; chand.add(ring);
    box(0.04, 1.3, 0.04, trimMat, 0, 0.65, 0, chand);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; box(0.1, 0.18, 0.1, bulbMat, Math.cos(a) * 1.2, 0.12, Math.sin(a) * 1.2, chand); }
    const glowC = cnv(128, 128), gx = glowC.getContext('2d'), gg = gx.createRadialGradient(64, 64, 2, 64, 64, 64);
    gg.addColorStop(0, 'rgba(255,225,170,0.9)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
    const glowT = tex(glowC);
    const chandGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    chandGlow.scale.set(4.5, 4.5, 1); chand.add(chandGlow);
    const chandLight = new THREE.PointLight(0xffd9a0, 1, 30, 1.2); chandLight.position.set(0, HL - 1.6, 0); group.add(chandLight);

    /* ---------- 정문 (남쪽 벽 가운데) ---------- */
    const doorC = cnv(512, 600), doorT = tex(doorC);
    function drawEntrance(bright) {
      const x = doorC.getContext('2d');
      x.fillStyle = bright ? '#7a5634' : '#2a1a10'; x.fillRect(0, 0, 512, 600);
      noise(x, 512, 600, 1500, 0.15, 9);
      x.strokeStyle = bright ? '#4e3420' : '#120a05'; x.lineWidth = 10;
      x.strokeRect(20, 20, 220, 560); x.strokeRect(272, 20, 220, 560);
      x.strokeRect(50, 60, 160, 220); x.strokeRect(302, 60, 160, 220); x.strokeRect(50, 320, 160, 220); x.strokeRect(302, 320, 160, 220);
      x.fillStyle = '#c9a45a'; x.beginPath(); x.arc(226, 330, 12, 0, 7); x.arc(286, 330, 12, 0, 7); x.fill();
      drawChains(x, 512, 600, 230, 400);   // 쇠사슬로 잠겨 있다
      doorT.needsUpdate = true;
    }
    const ent = plane(3.6, 4.2, new THREE.MeshLambertMaterial({ map: doorT }), 0, 2.1, D2 - 0.05, Math.PI);
    ent.userData.lobby = 'entrance'; pickables.push(ent);
    box(4.2, 0.35, 0.3, trimMat, 0, 4.35, D2 - 0.1);
    box(0.3, 4.4, 0.3, trimMat, -1.95, 2.2, D2 - 0.1); box(0.3, 4.4, 0.3, trimMat, 1.95, 2.2, D2 - 0.1);

    /* ---------- 이상 현상 기록장 게시판 (남쪽 벽 서쪽) ---------- */
    const boardC = cnv(1024, 680), boardT = tex(boardC);
    const board = plane(5.0, 3.3, new THREE.MeshBasicMaterial({ map: boardT }), -8, 2.4, D2 - 0.13, Math.PI);
    board.userData.lobby = 'board'; pickables.push(board);
    box(5.4, 3.7, 0.12, trimMat, -8, 2.4, D2 - 0.03);
    function drawBoard(st, bright) {
      const x = boardC.getContext('2d'), W = 1024, H = 680;
      x.fillStyle = bright ? '#b58a5a' : '#4a3424'; x.fillRect(0, 0, W, H);   // 코르크판
      noise(x, W, H, 4000, 0.25, 5);
      x.fillStyle = bright ? '#fffaf0' : '#e6dcc5'; x.fillRect(250, 26, 524, 92);
      x.fillStyle = '#b3261e'; x.beginPath(); x.arc(512, 36, 9, 0, 7); x.fill();
      x.fillStyle = '#2d241a'; x.textAlign = 'center'; x.font = `700 50px ${FONT}`; x.fillText('이상 현상 기록장', 512, 92);
      ROOMS.forEach((r, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const px = 40 + col * 322, py = 150 + row * 160;
        x.save(); x.translate(px + 145, py + 65); x.rotate(((i * 37) % 7 - 3) * 0.008);
        x.fillStyle = bright ? '#fffdf6' : '#ddd2b8'; x.fillRect(-145, -65, 290, 130);
        x.fillStyle = '#b3261e'; x.beginPath(); x.arc(0, -58, 7, 0, 7); x.fill();
        x.fillStyle = '#2d241a'; x.font = `700 26px ${FONT}`; x.fillText(r.name.length > 10 ? SHORT[i] : r.name, 0, -18);
        const [got, all] = st.rooms[i];
        x.font = `700 30px ${SANS}`; x.fillStyle = got === all ? '#2c6d3d' : '#9a5d10'; x.fillText(`${got} / ${all}`, 0, 22);
        x.fillStyle = '#d6c9aa'; x.fillRect(-115, 40, 230, 10);
        x.fillStyle = got === all ? '#2c6d3d' : '#c98a2a'; x.fillRect(-115, 40, 230 * got / all, 10);
        x.restore();
      });
      x.fillStyle = bright ? '#fffaf0' : '#e6dcc5'; x.font = `700 28px ${SANS}`;
      x.fillText(`발견한 이상 현상 ${st.total[0]} / ${st.total[1]} · 눌러서 자세히 보기`, 512, 648);
      boardT.needsUpdate = true;
    }
    const boardLamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
    boardLamp.scale.set(6, 3, 1); boardLamp.position.set(-8, 4.3, D2 - 0.3); group.add(boardLamp);

    /* ---------- 2층 계단 (공사 중) ---------- */
    const rects = [{ x0: 1.9, x1: 11.6, z0: 11.0, z1: D2, kind: 'stair' }];
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x7d7465 });
    for (let i = 0; i < 12; i++) {
      const h = (i + 1) * 0.3;
      const st = box(0.6, h, 2.6, stepMat, 2.9 + i * 0.6, h / 2, 12.6);
      st.userData.lobby = 'stair'; pickables.push(st);
    }
    box(1.8, 3.6, 2.6, stepMat, 10.5, 1.8, 12.6);
    // 2층 입구: 판자로 막아 둠
    plane(2.2, 2.8, new THREE.MeshBasicMaterial({ color: 0x050403 }), 10.5, 5.0, D2 - 0.04, Math.PI);
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x8a6a40 });
    [[0.5, 0.3], [-0.45, -0.3], [0, 0]].forEach(([r, dy]) => { const pl = box(2.6, 0.22, 0.06, plankMat, 10.5, 5.0 + dy, D2 - 0.12); pl.rotation.z = r; });
    // 노랑·검정 줄무늬 가림막과 안내판
    const stripeC = cnv(256, 64), sx2 = stripeC.getContext('2d');
    sx2.fillStyle = '#f2c230'; sx2.fillRect(0, 0, 256, 64); sx2.fillStyle = '#1a1a1a';
    for (let k = -64; k < 256; k += 48) { sx2.beginPath(); sx2.moveTo(k, 64); sx2.lineTo(k + 24, 64); sx2.lineTo(k + 88, 0); sx2.lineTo(k + 64, 0); sx2.fill(); }
    const stripeMat = new THREE.MeshLambertMaterial({ map: tex(stripeC), side: THREE.DoubleSide });
    [0.55, 1.05].forEach(y => { const b = plane(2.9, 0.3, stripeMat, 2.15, y, 12.5, -Math.PI / 2); b.userData.lobby = 'stair'; pickables.push(b); });
    [11.2, 13.8].forEach(z => box(0.08, 1.2, 0.08, trimMat, 2.15, 0.6, z));
    const consC = cnv(512, 400), cx = consC.getContext('2d');
    cx.fillStyle = '#f2c230'; cx.fillRect(0, 0, 512, 400);
    cx.fillStyle = '#1a1a1a'; cx.fillRect(16, 16, 480, 368); cx.fillStyle = '#f2c230'; cx.fillRect(28, 28, 456, 344);
    cx.fillStyle = '#1a1a1a'; cx.textAlign = 'center'; cx.font = `700 92px ${SANS}`; cx.fillText('🚧 공사 중', 256, 140);
    cx.font = `700 40px ${SANS}`; cx.fillText('2층 전시실은', 256, 220); cx.fillText('아직 준비 중입니다', 256, 272);
    cx.font = `700 26px ${SANS}`; cx.fillText('UNDER CONSTRUCTION', 256, 340);
    const consT = tex(consC);
    const cons = plane(1.3, 1.02, new THREE.MeshLambertMaterial({ map: consT }), 2.0, 1.9, 10.6, ryOf(-0.6, -0.8));
    cons.userData.lobby = 'stair'; pickables.push(cons);
    box(0.06, 1.4, 0.06, trimMat, 2.0, 0.7, 10.62);
    const cons2 = plane(1.3, 1.02, new THREE.MeshBasicMaterial({ map: consT }), 10.5, 5.0, D2 - 0.2, Math.PI);   // 판자에 못 박아 둔 안내판
    cons2.userData.lobby = 'stair'; pickables.push(cons2);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xf07a20 });
    [[1.4, 11.3], [1.4, 13.2], [3.2, 10.6]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), coneMat); c.position.set(x, 0.3, z); group.add(c); });
    circles.push({ x: 2.0, z: 10.6, r: 0.5 }, { x: 1.4, z: 11.3, r: 0.35 }, { x: 3.2, z: 10.6, r: 0.35 });

    /* ---------- 미스터리 전시실 입구 (동남쪽 구석, 계단 뒤) ---------- */
    const mysRy = ryOf(MYS.nx, MYS.nz);
    const mysC = cnv(512, 720), mysT = tex(mysC);
    const mysDoor = plane(2.6, 3.65, new THREE.MeshBasicMaterial({ map: mysT }), MYS.x + MYS.nx * 0.05, 1.83, MYS.z + MYS.nz * 0.05, mysRy);
    mysDoor.userData.lobby = 'door'; pickables.push(mysDoor);
    const fr = new THREE.MeshLambertMaterial({ color: 0x3a3631 });
    const ttx = -MYS.nz, ttz = MYS.nx;    // 문 앞에서 본 가로 방향
    [-1, 1].forEach(sd => { const p = box(0.3, 4.0, 0.3, fr, MYS.x + ttx * sd * 1.45 + MYS.nx * 0.1, 2.0, MYS.z + ttz * sd * 1.45 + MYS.nz * 0.1); p.rotation.y = mysRy; });
    const lt = box(3.3, 0.35, 0.32, fr, MYS.x + MYS.nx * 0.1, 3.95, MYS.z + MYS.nz * 0.1); lt.rotation.y = mysRy;
    const plateC = cnv(768, 140), px = plateC.getContext('2d');
    const plateT = tex(plateC);
    const plate = plane(3.0, 0.55, new THREE.MeshBasicMaterial({ map: plateT }), MYS.x + MYS.nx * 0.28, 4.45, MYS.z + MYS.nz * 0.28, mysRy);
    plate.userData.lobby = 'door'; pickables.push(plate);
    const mysLight = new THREE.PointLight(0xff3a2a, 0.8, 8, 1.6);
    mysLight.position.set(MYS.x + MYS.nx * 1.6, 2.4, MYS.z + MYS.nz * 1.6); group.add(mysLight);
    const mysGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xff4030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
    mysGlow.scale.set(4, 5, 1); mysGlow.position.set(MYS.x + MYS.nx * 0.3, 2.0, MYS.z + MYS.nz * 0.3); group.add(mysGlow);
    function holePos(k) {   // 문에 파인 9개 홈 자리 (3×3)
      return [96 + (k % 3) * 160, 250 + Math.floor(k / 3) * 150];
    }
    function drawMystery(st, bright) {
      const x = mysC.getContext('2d'), W = 512, H = 720;
      if (st.open) {
        const g = x.createRadialGradient(256, 420, 10, 256, 420, 380);
        g.addColorStop(0, '#7a1410'); g.addColorStop(0.35, '#2a0806'); g.addColorStop(1, '#000');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        // 열린 문짝이 양쪽으로 젖혀져 있다
        x.fillStyle = '#2b2824'; x.beginPath(); x.moveTo(0, 0); x.lineTo(70, 40); x.lineTo(70, H - 40); x.lineTo(0, H); x.fill();
        x.beginPath(); x.moveTo(W, 0); x.lineTo(W - 70, 40); x.lineTo(W - 70, H - 40); x.lineTo(W, H); x.fill();
        for (let k = 0; k < 9; k++) x.drawImage(keyCanvas(k, 'gold'), 14 + (k % 2) * 2, 60 + k * 70, 44, 44);
      } else {
        x.fillStyle = bright ? '#8a8272' : '#3d3832'; x.fillRect(0, 0, W, H);
        noise(x, W, H, 3000, 0.2, 11);
        x.strokeStyle = bright ? '#5a5244' : '#1c1916'; x.lineWidth = 8; x.strokeRect(18, 18, W - 36, H - 36);
        x.beginPath(); x.moveTo(W / 2, 18); x.lineTo(W / 2, H - 18); x.stroke();
        x.fillStyle = bright ? '#3a3226' : '#b8a888'; x.textAlign = 'center'; x.font = `700 34px ${FONT}`;
        x.fillText('아홉 시대의 유물을', W / 2, 110); x.fillText('모두 바쳐라', W / 2, 156);
        for (let k = 0; k < 9; k++) {
          const [hx, hy] = holePos(k);
          x.drawImage(keyCanvas(k, st.keys.has(k) ? 'gold' : 'hole'), hx - 62, hy - 62, 124, 124);
        }
        x.font = `700 30px ${SANS}`; x.fillText(`${st.keys.size} / 9`, W / 2, 642);
        // 홈을 가리지 않도록 문 아래쪽에 쇠사슬을 감아 둔다
        drawChains(x, W, H, 662, 662);
      }
      mysT.needsUpdate = true;
      px.fillStyle = '#1a0d0a'; px.fillRect(0, 0, 768, 140);
      px.strokeStyle = '#8a3a26'; px.lineWidth = 6; px.strokeRect(6, 6, 756, 128);
      px.fillStyle = st.open ? '#ffb090' : '#c98a7a'; px.textAlign = 'center'; px.font = `700 50px ${FONT}`;
      px.fillText(st.open ? '최고 난이도 미스터리 전시실' : '??? 전시실', 384, 88);
      plateT.needsUpdate = true;
    }

    /* ---------- 분위기별 장식 ---------- */
    // 밝은 박물관: 화분과 걸개 현수막
    const potMat = new THREE.MeshLambertMaterial({ color: 0xb06a3a }), leafMat = new THREE.MeshLambertMaterial({ color: 0x4f8a4a });
    [[-14.8, 12.8], [-14.8, -12.8], [14.8, -12.8], [-3.2, 12.8], [3.2, 12.8 - 2.2]].forEach(([x, z]) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.7, 12), potMat); pot.position.set(x, 0.35, z); brightOnly.add(pot);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), leafMat); leaf.position.set(x, 1.3, z); leaf.scale.y = 1.3; brightOnly.add(leaf);
      circles.push({ x, z, r: 0.55 });
    });
    const banC = cnv(256, 768), bx = banC.getContext('2d');
    bx.fillStyle = '#9a2a20'; bx.fillRect(0, 0, 256, 768); bx.fillStyle = '#f2d9a8'; bx.textAlign = 'center'; bx.font = `700 64px ${FONT}`;
    '미스터리역사박물관'.split('').forEach((ch, k) => bx.fillText(ch, 128, 100 + k * 74));
    const banMat = new THREE.MeshLambertMaterial({ map: tex(banC), side: THREE.DoubleSide });
    [[-6.5, -6], [6.5, -6]].forEach(([x, z]) => plane(1.0, 3.0, banMat, x, 4.6, z + 0.52, 0, brightOnly));
    // 으스스한 박물관: 거미줄, 떠다니는 먼지
    const webC = cnv(256, 256), wx = webC.getContext('2d');
    wx.strokeStyle = 'rgba(220,220,210,0.55)'; wx.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI / 2; wx.beginPath(); wx.moveTo(0, 0); wx.lineTo(Math.cos(a) * 250, Math.sin(a) * 250); wx.stroke(); }
    for (let r = 30; r < 250; r += 32) { wx.beginPath(); for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI / 2, rr = r + Math.sin(k * 3) * 6; k ? wx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : wx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } wx.stroke(); }
    const webMat = new THREE.MeshBasicMaterial({ map: tex(webC), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    [[-W2 + 0.05, -D2 + 0.05, Math.PI / 2, 0], [W2 - 0.05, -D2 + 0.05, -Math.PI / 2, Math.PI / 2], [-W2 + 0.05, D2 - 0.05, Math.PI / 2, -Math.PI / 2]].forEach(([x, z, ry, rz]) => {
      const w = plane(3, 3, webMat, x, HL - 1.5, z, ry, darkOnly); w.rotation.order = 'YXZ'; w.rotation.z = rz;
    });
    const N = 260, pos = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) { pos[k * 3] = (Math.random() * 2 - 1) * W2; pos[k * 3 + 1] = Math.random() * HL; pos[k * 3 + 2] = (Math.random() * 2 - 1) * D2; }
    const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ map: glowT, color: 0xd8c8a0, size: 0.09, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    darkOnly.add(dust);

    /* ---------- 정복자 명단판: 통로마다 문 옆 벽에, 미스터리 입구는 옆의 받침대에 ---------- */
    const plaques = [];
    const plaqueFrame = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    function addPlaque(mode, x, z, nx, nz, stand) {
      const c = cnv(512, 660), t = tex(c), ry = ryOf(nx, nz);
      const m = plane(1.45, 1.87, new THREE.MeshBasicMaterial({ map: t }), x + nx * 0.07, 1.75, z + nz * 0.07, ry);
      m.userData.lobby = 'plaque'; m.userData.mode = mode; pickables.push(m);
      const f = box(1.6, 2.02, 0.06, plaqueFrame, x + nx * 0.03, 1.75, z + nz * 0.03); f.rotation.y = ry;
      if (stand) { const leg = box(0.12, 0.8, 0.12, plaqueFrame, x - nx * 0.05, 0.4, z - nz * 0.05); leg.rotation.y = ry; circles.push({ x, z, r: 0.5 }); }
      plaques.push({ mode, c, t });
    }
    passages.forEach(p => addPlaque('era' + p.i, p.cx - p.tx * 2.35, p.cz - p.tz * 2.35, p.nx, p.nz, false));
    addPlaque('mystery', MYS.x - MYS.nz * 2.05, MYS.z + MYS.nx * 2.05, MYS.nx, MYS.nz, true);
    let boardData = null, boardOn = false;
    const stars = n => n <= 5 ? '★'.repeat(n) : '★×' + n;
    function drawPlaque(pq, bright) {
      const x = pq.c.getContext('2d'), W = 512, H = 660;
      x.fillStyle = bright ? '#fbf3df' : '#17110c'; x.fillRect(0, 0, W, H);
      x.strokeStyle = bright ? '#b08848' : '#8a6c3c'; x.lineWidth = 8; x.strokeRect(8, 8, W - 16, H - 16);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillStyle = bright ? '#9a5d10' : '#e8c547'; x.font = `700 46px ${FONT}`; x.fillText('🏆 정복자 명단', W / 2, 74);
      const rows = (boardData && boardData[pq.mode]) || [];
      x.fillStyle = bright ? '#6d5a3a' : '#9a8458'; x.font = `500 24px ${SANS}`;
      x.fillText(!boardOn ? '명단 준비 중' : `정복자 ${rows.length}명`, W / 2, 114);
      x.strokeStyle = bright ? '#d6c4a0' : '#3a2f1f'; x.lineWidth = 2; x.beginPath(); x.moveTo(36, 132); x.lineTo(W - 36, 132); x.stroke();
      if (boardOn && !rows.length) {
        x.fillStyle = bright ? '#6d5a3a' : '#8a7a5c'; x.font = `500 28px ${FONT}`;
        x.fillText('아직 정복자가 없어요', W / 2, 300); x.fillText('첫 번째 정복자가 되어 보세요!', W / 2, 344);
      }
      rows.slice(0, 7).forEach((r, k) => {
        const y = 178 + k * 62;
        x.textAlign = 'left'; x.fillStyle = bright ? '#9a8458' : '#8a7a5c'; x.font = `700 24px ${SANS}`; x.fillText(String(k + 1), 34, y);
        const st = stars(r.c);
        x.font = `700 24px ${SANS}`; const sw = x.measureText(st).width;
        x.textAlign = 'right'; x.fillStyle = '#f2c230'; x.fillText(st, W - 30, y);
        // 긴 닉네임은 글자를 조금 줄이고, 그래도 길면 두 줄로
        let fs = 26; const maxW = W - 30 - sw - 16 - 70;
        do { x.font = `500 ${fs}px ${FONT}`; fs -= 1; } while (x.measureText(r.n).width > maxW && fs > 21);
        x.textAlign = 'left'; x.fillStyle = bright ? '#2d241a' : '#f0e2bd';
        if (x.measureText(r.n).width <= maxW) x.fillText(r.n, 70, y);
        else {
          const w = r.n.split(' '); let cut = Math.ceil(w.length / 2);
          x.font = `500 21px ${FONT}`;
          while (cut > 1 && x.measureText(w.slice(0, cut).join(' ')).width > maxW) cut--;
          x.fillText(w.slice(0, cut).join(' '), 70, y - 13, maxW); x.fillText(w.slice(cut).join(' '), 70, y + 13, maxW);
        }
      });
      x.textAlign = 'center'; x.fillStyle = bright ? '#7a6548' : '#9a8458'; x.font = `500 22px ${SANS}`;
      x.fillText('눌러서 전체 보기 · 닉네임 찾기', W / 2, H - 34);
      pq.t.needsUpdate = true;
    }
    function setBoard(data, on) {
      boardData = data; boardOn = !!on;
      plaques.forEach(pq => drawPlaque(pq, bright));
    }

    /* ---------- 분위기 바꾸기 / 상태 다시 그리기 ---------- */
    let bright = false, last = null;
    function setTheme(b) {
      bright = !!b;
      floorMat.map = T.floor[bright ? 1 : 0]; floorMat.needsUpdate = true;
      wallMat.map = T.wall[bright ? 1 : 0]; wallMat.needsUpdate = true;
      wallMat.color.setHex(bright ? 0xfff8ec : 0xc8bca8);
      ceilMat.color.setHex(bright ? 0xf4f0e8 : 0x14110d);
      tunMat.color.setHex(bright ? 0xd9cfbc : 0x120f0b);
      trimMat.color.setHex(bright ? 0x9a7a52 : 0x2e2016);
      pillarMat.color.setHex(bright ? 0xf2ebdc : 0x6a6256);
      bulbMat.color.setHex(bright ? 0xfff4d8 : 0xffcf80);
      chandGlow.material.opacity = bright ? 0.5 : 0.8;
      chandLight.intensity = bright ? 0.6 : 1.1;
      boardLamp.material.opacity = bright ? 0.15 : 0.35;
      mysLight.color.setHex(bright ? 0xffc890 : 0xff3a2a);
      mysGlow.material.color.setHex(bright ? 0xffd0a0 : 0xff4030);
      brightOnly.visible = bright; darkOnly.visible = !bright;
      drawMosaic(bright); mosaicT.needsUpdate = true;
      drawPortal(bright); drawEntrance(bright);
      if (last) refresh(last);
      plaques.forEach(pq => drawPlaque(pq, bright));
    }
    function refresh(st) {
      last = st;
      ROOMS.forEach((r, i) => drawSignC(i, { earned: st.cleared[i], saved: st.saved[i] }, bright));
      drawBoard(st, bright); drawMap(st, bright); drawMystery(st, bright);
    }

    function update(dt, t) {
      if (!bright) {
        const k = 0.85 + Math.sin(t * 7.3) * 0.05 + (Math.random() < 0.015 ? -0.6 : 0);
        chandLight.intensity = 1.1 * k; chandGlow.material.opacity = 0.8 * k;
        const a = dustG.attributes.position;
        for (let i = 0; i < N; i++) { let y = a.getY(i) + dt * 0.06; if (y > HL) y = 0; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.03); }
        a.needsUpdate = true;
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * (last && last.open ? 2.2 : 1.1));
      mysLight.intensity = (bright ? 0.35 : 0.6) + pulse * (bright ? 0.2 : 0.7);
      mysGlow.material.opacity = (bright ? 0.12 : 0.25) + pulse * 0.25;
    }

    /* ---------- 충돌·통로 들어가기 ---------- */
    // 결과: { x, z, enter: 통로 번호 | 'mystery' | null, touch: 'stair' | 'mysteryLocked' | null }
    function collide(x, z) {
      for (const p of passages) {
        const lat = (x - p.cx) * p.tx + (z - p.cz) * p.tz;
        const dep = -((x - p.cx) * p.nx + (z - p.cz) * p.nz);
        if (Math.abs(lat) < DOOR_W / 2 - R && dep > -R - 0.05) {
          const l = Math.max(-(DOOR_W / 2 - R), Math.min(DOOR_W / 2 - R, lat));
          const d = Math.min(dep, TUN - 0.6);
          return { x: p.cx + p.tx * l - p.nx * d, z: p.cz + p.tz * l - p.nz * d, enter: d > 1.0 ? p.i : null };
        }
      }
      let touch = null, enter = null;
      x = Math.max(-W2 + R, Math.min(W2 - R, x));
      z = Math.max(-D2 + R, Math.min(D2 - R, z));
      const lim = DIAG - R * Math.SQRT2;
      if (x + z > lim - 0.5) {
        const lat = ((x - z) - (MYS.x - MYS.z)) / Math.SQRT2;
        if (Math.abs(lat) < 1.0) {
          if (last && last.open) { if (x + z > lim - 0.35) enter = 'mystery'; }
          else touch = 'mysteryLocked';
        }
        if (x + z > lim) { const s = (x + z - lim) / 2; x -= s; z -= s; }
      }
      if (z >= D2 - R - 0.02 && Math.abs(x) < 1.9) touch = 'entrance';
      circles.forEach(c => {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + R;
        if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; }
      });
      rects.forEach(r => {
        const x0 = r.x0 - R, x1 = r.x1 + R, z0 = r.z0 - R, z1 = r.z1 + R;
        if (x > x0 && x < x1 && z > z0 && z < z1) {
          const opts = [[x - x0, () => { x = x0; }], [x1 - x, () => { x = x1; }], [z - z0, () => { z = z0; }], [z1 - z, () => { z = z1; }]];
          opts.sort((a, b) => a[0] - b[0])[0][1]();
          touch = r.kind;
        }
      });
      return { x, z, enter, touch };
    }
    // 처음 들어올 때는 정문 앞, 전시실에서 돌아오면 그 통로 앞에 선다 (방 안쪽을 바라봄)
    function spawn(which) {
      const face = (nx, nz) => Math.atan2(-nx, -nz);
      if (which === 'mystery') return { x: MYS.x + MYS.nx * 2.4, z: MYS.z + MYS.nz * 2.4, yaw: face(MYS.nx, MYS.nz) };
      if (typeof which === 'number' && passages[which]) {
        const p = passages[which];
        return { x: p.cx + p.nx * 2.2, z: p.cz + p.nz * 2.2, yaw: face(p.nx, p.nz) };
      }
      return { x: 0, z: 10.6, yaw: 0 };
    }

    return {
      group, pickables, setTheme, refresh, update, collide, spawn, setBoard,
      signCanvas: i => signs[i].c, mapCanvas: () => mapC, holePos
    };
  }

  window.LOBBY = { build, SHORT };
})();
