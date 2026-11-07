/* =========================================================
   2층 로비 (three.js) — 1층 로비와 같은 구조
   - 8개 통로: 걸어 들어가면 그 재현 거리 전시관으로 (서쪽 벽 → 북쪽 벽 → 동쪽 벽, 시대 순)
   - 남쪽 벽: 1층으로 내려가는 계단, 이상 현상 기록장, 공사 중인 3층 계단
   좌표: 로비 안쪽 기준 (x: 서 -16 ~ 동 16, z: 북 -14 ~ 남 14)
   ========================================================= */
(function () {
  const W2 = 16, D2 = 14, HL = 7;
  const DOOR_W = 2.4, DOOR_H = 3.4, TUN = 3.2, R = 0.35;
  const SHORT = ['조선의 건국', '유교 질서', '세종', '주변 나라', '경제 변화', '달라진 사회', '서민 문화', '개항'];
  const DOWN = { x: -9, w: 3.2 }, UP = { x: 9, w: 3.2 };
  const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const roomName = (r) => r.name;

  function build(env) {
    const { THREE, tex, ART, ROOMS, X0 } = env;
    const FONT = ART.FONT, SANS = ART.SANS;
    const group = new THREE.Group(); group.position.set(X0, 0, 0);
    const pickables = [];
    function plane(w, h, mat, x, y, z, ry, parent) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.rotation.y = ry || 0; (parent || group).add(m); return m;
    }
    function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); group.add(m); return m; }
    const ryOf = (nx, nz) => Math.atan2(nx, nz);

    /* 나무 마루와 벽: 1층보다 어두운 복원실 분위기 (밝은 박물관은 산뜻하게) */
    function floorTex(bright) {
      const c = cnv(512, 512), x = c.getContext('2d');
      for (let j = 0; j < 8; j++) for (let i = -1; i < 3; i++) {
        const v = (i + j * 3 + 9) % 4;
        x.fillStyle = bright ? ['#d9c29a', '#cfb88e', '#e2cda6', '#c8ae84'][v] : ['#2a2118', '#231b14', '#30261b', '#1e1711'][v];
        x.fillRect(i * 200 + (j % 2 ? 100 : 0), j * 64, 200, 64);
        x.strokeStyle = bright ? 'rgba(120,90,50,0.4)' : 'rgba(0,0,0,0.7)'; x.lineWidth = 2; x.strokeRect(i * 200 + (j % 2 ? 100 : 0), j * 64, 200, 64);
      }
      const t = tex(c, 6, 6); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    }
    function wallTex(bright) { const t = tex(bright ? ART.wallTexBright() : ART.wallTex(), 8, 2); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
    const T = { floor: [floorTex(false), floorTex(true)], wall: [wallTex(false), wallTex(true)] };
    const floorMat = new THREE.MeshLambertMaterial({ map: T.floor[0] });
    const wallMat = new THREE.MeshLambertMaterial({ map: T.wall[0] });
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x14110d });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const tunMat = new THREE.MeshLambertMaterial({ color: 0x14110d });
    const floor = plane(W2 * 2, D2 * 2, floorMat, 0, 0, 0); floor.rotation.x = -Math.PI / 2;
    const ceil = plane(W2 * 2, D2 * 2, ceilMat, 0, HL, 0); ceil.rotation.x = Math.PI / 2;

    // 천장 조명 (2층 로비는 빛을 늘리지 않고 밝은 면으로 표현한다)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    [[-8, -6], [8, -6], [-8, 6], [8, 6], [0, 0]].forEach(([x, z]) => { const m = plane(3, 0.5, lampMat, x, HL - 0.03, z); m.rotation.x = Math.PI / 2; });

    /* 벽과 통로 */
    const passages = [];
    const walls = [
      { ax: -W2, az: D2, bx: -W2, bz: -D2, doors: [7, 0, -7].map(v => D2 - v) },        // 서쪽 벽 (남→북)
      { ax: -W2, az: -D2, bx: W2, bz: -D2, doors: [-5.5, 5.5].map(v => v + W2) },       // 북쪽 벽 (서→동)
      { ax: W2, az: -D2, bx: W2, bz: D2, doors: [-7, 0, 7].map(v => v + D2) },          // 동쪽 벽 (북→남)
      { ax: W2, az: D2, bx: -W2, bz: D2, doors: [] }                                    // 남쪽 벽
    ];
    walls.forEach(wl => {
      const len = Math.hypot(wl.bx - wl.ax, wl.bz - wl.az);
      const tx = (wl.bx - wl.ax) / len, tz = (wl.bz - wl.az) / len, nx = -tz, nz = tx, ry = ryOf(nx, nz);
      const at = s => [wl.ax + tx * s, wl.az + tz * s];
      let prev = 0;
      const seg = (s0, s1, y0, y1) => { if (s1 - s0 < 0.01) return; const [cx, cz] = at((s0 + s1) / 2); plane(s1 - s0, y1 - y0, wallMat, cx, (y0 + y1) / 2, cz, ry); };
      wl.doors.forEach(s => {
        seg(prev, s - DOOR_W / 2, 0, HL); seg(s - DOOR_W / 2, s + DOOR_W / 2, DOOR_H, HL); prev = s + DOOR_W / 2;
        const [cx, cz] = at(s); passages.push({ i: passages.length, cx, cz, nx, nz, tx, tz });
      });
      seg(prev, len, 0, HL);
      const [mx, mz] = at(len / 2);
      plane(len, 0.25, trimMat, mx + nx * 0.02, 0.125, mz + nz * 0.02, ry);
      plane(len, 0.35, trimMat, mx + nx * 0.02, HL - 0.6, mz + nz * 0.02, ry);
    });
    const signs = [];
    passages.forEach(p => {
      const ry = ryOf(p.nx, p.nz), sideRy = ryOf(p.tx, p.tz);
      const mx = p.cx - p.nx * TUN / 2, mz = p.cz - p.nz * TUN / 2;
      plane(TUN, DOOR_H, tunMat, mx - p.tx * DOOR_W / 2, DOOR_H / 2, mz - p.tz * DOOR_W / 2, sideRy);
      plane(TUN, DOOR_H, tunMat, mx + p.tx * DOOR_W / 2, DOOR_H / 2, mz + p.tz * DOOR_W / 2, sideRy + Math.PI);
      const top = plane(DOOR_W, TUN, tunMat, mx, DOOR_H, mz, ry); top.rotation.order = 'YXZ'; top.rotation.x = Math.PI / 2;
      const bot = plane(DOOR_W, TUN, floorMat, mx, 0.004, mz, ry); bot.rotation.order = 'YXZ'; bot.rotation.x = -Math.PI / 2;
      plane(DOOR_W, DOOR_H, new THREE.MeshBasicMaterial({ color: 0x060504 }), p.cx - p.nx * TUN, DOOR_H / 2, p.cz - p.nz * TUN, ry);
      [-1, 1].forEach(sd => { const b = box(0.22, DOOR_H + 0.2, 0.22, trimMat, p.cx + p.tx * sd * (DOOR_W / 2 + 0.1) + p.nx * 0.06, (DOOR_H + 0.2) / 2, p.cz + p.tz * sd * (DOOR_W / 2 + 0.1) + p.nz * 0.06); b.rotation.y = ry; });
      const lint = box(DOOR_W + 0.44, 0.24, 0.24, trimMat, p.cx + p.nx * 0.06, DOOR_H + 0.1, p.cz + p.nz * 0.06); lint.rotation.y = ry;
      const c = cnv(768, 300), t = tex(c);
      const s = plane(3.2, 1.25, new THREE.MeshBasicMaterial({ map: t }), p.cx + p.nx * 0.05, DOOR_H + 1.05, p.cz + p.nz * 0.05, ry);
      s.userData.lobby = 'sign'; s.userData.idx = p.i; pickables.push(s);
      signs.push({ c, t });
    });
    function drawSign(i, st, bright) {
      const { c, t } = signs[i], x = c.getContext('2d'), W = 768, H = 300;
      x.fillStyle = bright ? '#f4f7f1' : '#0e1412'; x.fillRect(0, 0, W, H);
      x.strokeStyle = bright ? '#3f7a6c' : '#3f6a60'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillStyle = bright ? '#3f7a6c' : '#8fb8ac'; x.font = `700 30px ${SANS}`; x.fillText(`2층 전시관 ${i + 1} · 재현 거리`, W / 2, 74);
      x.fillStyle = bright ? '#1f2d2a' : '#e8efe6';
      let fs = 62; do { x.font = `700 ${fs}px ${FONT}`; fs -= 2; } while (x.measureText(roomName(ROOMS[i])).width > W - 90 && fs > 30);
      x.fillText(roomName(ROOMS[i]), W / 2, 164);
      x.font = `500 30px ${SANS}`;
      x.fillStyle = st.done ? (bright ? '#2c6d3d' : '#9fd8a8') : st.saved ? (bright ? '#9a5d10' : '#e8c547') : (bright ? '#5a6a64' : '#7f958e');
      x.fillText(st.done ? '탈출 성공' : st.saved ? `이어하기 · 제 ${st.saved} 전시실까지 진행` : '제8 전시실을 지나 탈출하세요', W / 2, 238);
      t.needsUpdate = true;
    }

    /* 가운데: 기둥과 안내도 */
    const circles = [{ x: 0, z: 0, r: 1.1 }];
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x6a6256 });
    [[-6.5, -6], [6.5, -6], [-6.5, 6], [6.5, 6]].forEach(([x, z]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, HL, 16), pillarMat); c.position.set(x, HL / 2, z); group.add(c);
      box(1.2, 0.3, 1.2, trimMat, x, 0.15, z); circles.push({ x, z, r: 0.75 });
    });
    box(1.4, 1.0, 0.9, trimMat, 0, 0.5, 0);
    const mapC = cnv(1024, 900), mapT = tex(mapC);
    const mapMesh = plane(1.5, 1.32, new THREE.MeshBasicMaterial({ map: mapT }), 0, 1.35, 0.42, 0);
    mapMesh.rotation.order = 'YXZ'; mapMesh.rotation.x = -0.55; mapMesh.userData.lobby = 'map'; pickables.push(mapMesh);
    function drawMap(st, bright) {
      const x = mapC.getContext('2d'), W = 1024, H = 900;
      x.fillStyle = bright ? '#f4f7f1' : '#dfe4da'; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#3f6a60'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20);
      x.fillStyle = '#1f2d2a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 46px ${FONT}`; x.fillText('2층 로비 안내도', W / 2, 70);
      const ox = 140, oy = 130, sx = 744 / (W2 * 2), sz = 640 / (D2 * 2), P = (a, b) => [ox + (a + W2) * sx, oy + (b + D2) * sz];
      x.fillStyle = '#eef2ea'; x.strokeStyle = '#1f2d2a'; x.lineWidth = 6; x.fillRect(ox, oy, 744, 640); x.strokeRect(ox, oy, 744, 640);
      x.font = `700 21px ${SANS}`;
      passages.forEach(p => {
        const [a, b] = P(p.cx, p.cz);
        x.fillStyle = st.done[p.i] ? '#2c6d3d' : '#3f6a60';
        x.fillRect(a - 18 - Math.abs(p.nz) * 18, b - 18 - Math.abs(p.nx) * 18, 36 + Math.abs(p.nz) * 36, 36 + Math.abs(p.nx) * 36);
        const [la, lb] = P(p.cx + p.nx * 2.8, p.cz + p.nz * 2.2);
        x.fillStyle = '#1f2d2a'; x.fillText(`${p.i + 1} ${SHORT[p.i]}`, la, lb);
      });
      const [d0, d1] = P(DOWN.x, D2 - 1.4), [u0, u1] = P(UP.x, D2 - 1.4), [b0, b1] = P(0, D2 - 1.4), [c0, c1] = P(0, 0);
      const [k0, k1] = P(0, -D2 + 3.2); x.fillText(st.open ? '📖 기록관 책상 · 열린 문' : '📖 기록관 책상', k0, k1 + 26);
      x.fillText('▼ 1층 계단', d0, d1); x.fillText(st.upOpen ? '▲ 3층 (준비 중)' : '🚧 3층 (공사 중)', u0, u1); x.fillText('📜 기록장', b0, b1); x.fillText('★ 지금 보는 안내도', c0, c1);
      x.font = `500 24px ${SANS}`; x.fillStyle = '#44544f'; x.fillText('통로로 걸어 들어가면 재현 거리 전시관으로 이동합니다.', W / 2, H - 50);
      mapT.needsUpdate = true;
    }

    /* 남쪽 벽: 기록장, 내려가는 계단, 3층 공사 중 */
    const boardC = cnv(1024, 560), boardT = tex(boardC);
    const board = plane(5.0, 2.74, new THREE.MeshBasicMaterial({ map: boardT }), 0, 2.4, D2 - 0.13, Math.PI);
    board.userData.lobby = 'board'; pickables.push(board);
    box(5.4, 3.1, 0.12, trimMat, 0, 2.4, D2 - 0.03);
    function drawBoard(st, bright) {
      const x = boardC.getContext('2d'), W = 1024, H = 560;
      x.fillStyle = bright ? '#8fae9f' : '#22312c'; x.fillRect(0, 0, W, H);
      x.fillStyle = bright ? '#f7fbf4' : '#dfe4da'; x.fillRect(250, 24, 524, 80);
      x.fillStyle = '#1f2d2a'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `700 44px ${FONT}`; x.fillText('2층 이상 현상 기록장', 512, 82);
      ROOMS.forEach((r, i) => {
        const px = 34 + (i % 4) * 243, py = 128 + Math.floor(i / 4) * 170;
        x.fillStyle = bright ? '#fbfdf9' : '#cfd6cc'; x.fillRect(px, py, 225, 150);
        x.fillStyle = '#1f2d2a'; x.font = `700 25px ${FONT}`; x.fillText(SHORT[i], px + 112, py + 50);
        const [got, all] = st.rooms[i];
        x.font = `700 30px ${SANS}`; x.fillStyle = got === all ? '#2c6d3d' : '#3f6a60'; x.fillText(`${got} / ${all}`, px + 112, py + 104);
      });
      x.fillStyle = bright ? '#10201c' : '#dfe4da'; x.font = `700 26px ${SANS}`; x.fillText(`발견한 이상 현상 ${st.total[0]} / ${st.total[1]} · 눌러서 자세히 보기`, 512, 540);
      boardT.needsUpdate = true;
    }
    function stairSign(text, sub, col) {
      const c = cnv(512, 200), x = c.getContext('2d');
      x.fillStyle = col; x.fillRect(0, 0, 512, 200); x.fillStyle = '#10100e'; x.fillRect(12, 12, 488, 176);
      x.fillStyle = col; x.textAlign = 'center'; x.font = `700 58px ${SANS}`; x.fillText(text, 256, 92); x.font = `500 30px ${SANS}`; x.fillText(sub, 256, 150);
      return new THREE.MeshBasicMaterial({ map: tex(c) });
    }
    // 1층으로 내려가는 계단
    plane(DOWN.w, 3.2, new THREE.MeshBasicMaterial({ color: 0x050403 }), DOWN.x, 1.6, D2 - 0.03, Math.PI);
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x7d7465 });
    for (let i = 0; i < 4; i++) box(DOWN.w, 0.08, 0.32, stepMat, DOWN.x, 0.6 - i * 0.18, D2 - 0.05);
    const downSign = plane(2.4, 0.94, stairSign('▼ 1층', '내려가는 계단', '#8fb8ac'), DOWN.x, 4.0, D2 - 0.06, Math.PI);
    downSign.userData.lobby = 'down'; pickables.push(downSign);
    // 3층 계단: 공사 중 (올라갈 수 없음)
    const stripeC = cnv(256, 64), sx = stripeC.getContext('2d');
    sx.fillStyle = '#f2c230'; sx.fillRect(0, 0, 256, 64); sx.fillStyle = '#1a1a1a';
    for (let k = -64; k < 256; k += 48) { sx.beginPath(); sx.moveTo(k, 64); sx.lineTo(k + 24, 64); sx.lineTo(k + 88, 0); sx.lineTo(k + 64, 0); sx.fill(); }
    const stripeMat = new THREE.MeshLambertMaterial({ map: tex(stripeC), side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const h = (i + 1) * 0.5; box(UP.w, h, 0.4, stepMat, UP.x, h / 2, D2 - 0.2 - (5 - i) * 0.4); }
    [0.6, 1.1].forEach(y => { const b = plane(UP.w + 0.2, 0.3, stripeMat, UP.x, y, D2 - 2.7, Math.PI); b.userData.lobby = 'up'; pickables.push(b); });
    const upSign = plane(2.4, 0.94, stairSign('🚧 공사 중', '3층 전시실은 준비 중입니다', '#f2c230'), UP.x, 4.0, D2 - 0.06, Math.PI);
    upSign.userData.lobby = 'up'; pickables.push(upSign);
    const rects = [{ x0: UP.x - UP.w / 2 - 0.1, x1: UP.x + UP.w / 2 + 0.1, z0: D2 - 2.75, z1: D2, kind: 'up' }];
    const stripes = pickables.filter(p => p.userData.lobby === 'up' && p !== upSign);
    const upLight = plane(UP.w - 0.4, 2.6, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.0, depthWrite: false }), UP.x, 4.4, D2 - 0.05, Math.PI);
    const upOpenMat = stairSign('▲ 3층', '계단 위에서 빛이 새어 나온다', '#ffe2a0'), upClosedMat = upSign.material;

    /* 북쪽 벽 가운데: 기록관 책상과 기록책, 그 뒤 벽에 숨은 문 (기록 8쪽을 모두 끼우면 열린다) */
    const DESK = { x: 0, z: -D2 + 3.2 };
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x4a3120 });
    box(2.4, 0.9, 1.1, deskMat, DESK.x, 0.45, DESK.z);
    const bookC = cnv(512, 340), bookT = tex(bookC);
    const book = plane(1.5, 1.0, new THREE.MeshBasicMaterial({ map: bookT }), DESK.x, 0.98, DESK.z + 0.05, 0);
    book.rotation.order = 'YXZ'; book.rotation.x = -1.2; book.userData.lobby = 'door'; pickables.push(book);
    const deskHit = box(2.5, 1.0, 1.2, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), DESK.x, 0.5, DESK.z);
    deskHit.userData.lobby = 'door'; pickables.push(deskHit);
    circles.push({ x: DESK.x - 0.7, z: DESK.z, r: 0.75 }, { x: DESK.x + 0.7, z: DESK.z, r: 0.75 });
    const secretC = cnv(512, 640), secretT = tex(secretC);
    const secret = plane(2.4, 3.0, new THREE.MeshBasicMaterial({ map: secretT, transparent: true }), 0, 1.5, -D2 + 0.04, 0);
    secret.userData.lobby = 'door'; pickables.push(secret);
    function drawBook(st, bright) {
      const x = bookC.getContext('2d');
      x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 512, 340);
      x.fillStyle = bright ? '#f3e9cf' : '#d9cba6'; x.fillRect(16, 14, 236, 312); x.fillRect(260, 14, 236, 312);
      x.fillStyle = '#3a2614'; x.fillRect(250, 10, 12, 320);
      for (let i = 0; i < 8; i++) {
        const px = 34 + (i % 4) * 116 + (i > 3 ? 0 : 0) + (i % 4 > 1 ? 18 : 0), py = i < 4 ? 40 : 186;
        x.fillStyle = st.pages.has(i) ? '#b08848' : 'rgba(90,70,40,0.18)';
        x.fillRect(px, py, 82, 112);
        x.strokeStyle = '#6a5232'; x.lineWidth = 2; x.setLineDash(st.pages.has(i) ? [] : [6, 5]); x.strokeRect(px, py, 82, 112); x.setLineDash([]);
      }
      bookT.needsUpdate = true;
    }
    function drawSecret(st, bright) {
      const x = secretC.getContext('2d'); x.clearRect(0, 0, 512, 640);
      if (st.open) {
        const g = x.createRadialGradient(256, 380, 10, 256, 380, 340); g.addColorStop(0, '#6a5a2a'); g.addColorStop(0.4, '#1c1608'); g.addColorStop(1, '#000');
        x.fillStyle = g; x.fillRect(0, 0, 512, 640);
        x.fillStyle = '#f0d890'; x.textAlign = 'center'; x.font = `700 46px ${FONT}`; x.fillText('끝나지 않는 거리', 256, 90);
      } else {
        x.strokeStyle = bright ? 'rgba(80,100,90,0.45)' : 'rgba(150,170,160,0.35)'; x.lineWidth = 5; x.setLineDash([16, 12]);
        x.strokeRect(20, 20, 472, 600); x.setLineDash([]);
        x.fillStyle = bright ? 'rgba(60,80,70,0.55)' : 'rgba(170,190,180,0.5)'; x.textAlign = 'center'; x.font = `700 40px ${FONT}`;
        x.fillText('지워진 기록을', 256, 290); x.fillText('되찾아라', 256, 344);
        x.font = `700 34px ${SANS}`; x.fillText(`${st.pages.size} / 8`, 256, 420);
      }
      secretT.needsUpdate = true;
    }

    /* 분위기 / 상태 */
    let bright = false, last = null;
    function setTheme(b) {
      bright = !!b;
      floorMat.map = T.floor[bright ? 1 : 0]; floorMat.needsUpdate = true;
      wallMat.map = T.wall[bright ? 1 : 0]; wallMat.needsUpdate = true;
      wallMat.color.setHex(bright ? 0xf4fbf4 : 0xaab4a8);
      ceilMat.color.setHex(bright ? 0xeef3ec : 0x101412);
      tunMat.color.setHex(bright ? 0xcdd8cc : 0x0e1210);
      trimMat.color.setHex(bright ? 0x6f9184 : 0x24302b);
      pillarMat.color.setHex(bright ? 0xeef2e6 : 0x5a6258);
      if (last) refresh(last);
    }
    function refresh(st) {
      last = st;
      ROOMS.forEach((r, i) => drawSign(i, { done: st.done[i], saved: st.saved[i] }, bright));
      drawMap(st, bright); drawBoard(st, bright); drawBook(st, bright); drawSecret(st, bright);
      // 끝나지 않는 거리를 탈출하면 3층 계단의 가림막이 쓰러지고 빛이 새어 나온다 (3층은 아직 열리지 않음)
      stripes.forEach(p => { p.visible = !st.upOpen; });
      upSign.material = st.upOpen ? upOpenMat : upClosedMat;
      upLight.material.opacity = st.upOpen ? (bright ? 0.35 : 0.55) : 0;
    }

    function collide(x, z) {
      for (const p of passages) {
        const lat = (x - p.cx) * p.tx + (z - p.cz) * p.tz, dep = -((x - p.cx) * p.nx + (z - p.cz) * p.nz);
        if (Math.abs(lat) < DOOR_W / 2 - R && dep > -R - 0.05) {
          const l = Math.max(-(DOOR_W / 2 - R), Math.min(DOOR_W / 2 - R, lat)), d = Math.min(dep, TUN - 0.6);
          return { x: p.cx + p.tx * l - p.nx * d, z: p.cz + p.tz * l - p.nz * d, enter: d > 1.0 ? p.i : null };
        }
      }
      let touch = null, enter = null;
      x = Math.max(-W2 + R, Math.min(W2 - R, x));
      z = Math.max(-D2 + R, Math.min(D2 - R, z));
      if (z >= D2 - R - 0.02 && Math.abs(x - DOWN.x) < DOWN.w / 2) enter = 'down';
      if (z <= -D2 + R + 0.05 && Math.abs(x) < 1.0) { if (last && last.open) enter = 'mystery'; else touch = 'secret'; }
      circles.forEach(c => { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + R; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } });
      rects.forEach(r => {
        const x0 = r.x0 - R, x1 = r.x1 + R, z0 = r.z0 - R, z1 = r.z1 + R;
        if (x > x0 && x < x1 && z > z0 && z < z1) {
          const opts = [[x - x0, () => { x = x0; }], [x1 - x, () => { x = x1; }], [z - z0, () => { z = z0; }]];
          opts.sort((a, b) => a[0] - b[0])[0][1](); touch = r.kind;
        }
      });
      return { x, z, enter, touch };
    }
    function spawn(which) {
      if (typeof which === 'number' && passages[which]) {
        const p = passages[which];
        return { x: p.cx + p.nx * 2.2, z: p.cz + p.nz * 2.2, yaw: Math.atan2(-p.nx, -p.nz) };
      }
      if (which === 'mystery') return { x: 0, z: -D2 + 1.6, yaw: Math.PI };
      return { x: DOWN.x, z: D2 - 2.2, yaw: 0 };
    }
    return { group, pickables, setTheme, refresh, update() {}, collide, spawn, setBoard() {}, signCanvas: i => signs[i].c, mapCanvas: () => mapC };
  }
  window.LOBBY2 = { build };
})();
