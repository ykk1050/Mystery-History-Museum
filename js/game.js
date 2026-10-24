/* =========================================================
   미스터리 역사 박물관 - 게임 본체 (three.js)
   제0~16 전시실을 지나면 출구. 전시실마다 주제(ROOMS)가 무작위로 나온다
   (같은 주제는 최대 3번 연속). 4개 전시실마다 중간 저장.
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const ROOMS = window.ROOMS;

  /* ---------- 기본 치수 ---------- */
  const L = 48;          // 전시실 길이
  const HW = 3.5;        // 전시실 폭의 절반
  const H = 4.2;         // 천장 높이
  const EYE = 1.6;       // 눈 높이
  // 모드: 최고 난이도 미스터리 전시실(모든 시대 무작위, 제0~16) / 시대별 전시실(그 시대만, 제0~8)
  //   checks: 중간 저장되는 전시실 번호
  const MODES = [{ id: 'mystery', name: '최고 난이도 미스터리 전시실', goal: 17, checks: [4, 8, 12] }]
    .concat(ROOMS.map((r, i) => ({ id: 'era' + i, name: r.name, goal: 9, checks: [4, 6], room: i })));
  const modeOf = id => MODES.find(m => m.id === id) || null;
  const curMode = () => modeOf(S.gameMode) || MODES[0];
  const goal = () => curMode().goal;              // 이 수만큼 연속으로 지나면 출구
  const modeRooms = () => curMode().room != null ? [curMode().room] : ROOMS.map((r, i) => i);
  const MAX_SAME = 3;    // 같은 주제가 연속으로 나올 수 있는 최대 횟수
  const MIN_VIEWS = 3;   // 전시물을 이만큼 자세히 봐야 문이 열린다
  const LAMP_AFTER = 2;  // 같은 주제에서 연속으로 이만큼 틀리면 힌트 등불
  const WHISPER_AFTER = 3; // 같은 주제에서 연속으로 이만큼 틀리면 해설사의 귀띔
  const REVIEW_AFTER = 2;  // 같은 주제에서 연속으로 이만큼 틀리면 '정상 전시 다시 보기'
  const ANOMALY_RATE = 0.55;
  const INSPECT_RANGE = 6.5;
  const CX = -1.95, CZ = -27;  // 가운데 모형 자리

  /* ---------- 저장 (실패해도 게임은 동작) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mhm_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mhm_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const found = new Set(store.get('found_v2', []));
  let cleared = store.get('cleared_v2', false);
  const settings = Object.assign({ sound: true, voice: true, low: false, invertX: false, invertY: false, scares: true, theme: null }, store.get('settings', {}));

  /* ---------- 분위기: 밝은 박물관 / 으스스한 박물관 ----------
     전시물은 그대로 두고 조명·안개·벽·바닥·해설사·소리·화면 효과만 바꾼다 */
  const THEMES = {
    dark: {
      bg: 0x030202, fog: 0x040302, fogDensity: 0.052, ambient: [0x6b5c4c, 0.42], lantern: [0xffd9a0, 1.15],
      ceil: 0x15130f, end: 0x23251f, tunnel: 0x15140f, tunnelBack: 0x000000,
      pool: 0.5, wash: 0.55, docentOpacity: 0.88, flicker: true, fade: '#000'
    },
    bright: {
      bg: 0xf3ede0, fog: 0xf2eadb, fogDensity: 0.012, ambient: [0xfff6e8, 1.05], lantern: [0xfff3dc, 0.45],
      ceil: 0xf4f0e8, end: 0xe8e0cf, tunnel: 0xd9cfbc, tunnelBack: 0xbfb39c,
      pool: 0.12, wash: 0.18, docentOpacity: 1, flicker: false, fade: '#f4ecdc'
    }
  };
  const theme = () => THEMES[settings.theme] || THEMES.dark;
  const isBright = () => settings.theme === 'bright';

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  /* ---------- 렌더러 ---------- */
  const canvasEl = $('c');
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: !coarse, powerPreference: 'default' });
  function applyPixelRatio() {
    const cap = settings.low ? 0.8 : (coarse ? 1.25 : 1.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }
  applyPixelRatio();
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030202);
  scene.fog = new THREE.FogExp2(0x040302, 0.052);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  // 조명 개수가 바뀌면 셰이더를 다시 만들어 끊기므로, 조명은 늘 그대로 두고 밝기만 바꾼다
  const ambient = new THREE.AmbientLight(0x6b5c4c, 0.42);
  scene.add(ambient);
  const lantern = new THREE.PointLight(0xffd9a0, 1.15, 15, 1.6);
  const docentGlow = new THREE.PointLight(0xffb070, 0.9, 5, 2);
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 9, 1.6);
  const exitLight = new THREE.PointLight(0xfff0d0, 0, 12, 1.2);
  fireLight.position.set(CX, 1.0, CZ);
  exitLight.position.set(0, 2, -L - 2);
  scene.add(lantern, docentGlow, fireLight, exitLight);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function tex(cnv, repeatX, repeatY) {
    const t = new THREE.CanvasTexture(cnv);
    t.anisotropy = Math.min(8, maxAniso);
    if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || 1); }
    return t;
  }

  /* ---------- 전시실 뼈대 ---------- */
  const pickables = [];
  const slots = {};          // L0~L4, R0~R4, M, C → { group, mesh, texture, draw, key }
  const lamps = [];
  let signTex, rulesTex, farSignMesh, exitGroup, farTunnel, wallMat, centerModel = null, fireFx = null;
  let floorMat, ceilMat, endMat, tunnelMat, tunnelBackMat, texSet;
  const lampGlow = {};

  function addPlane(w, h, mat, x, y, z, ry, parent) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    (parent || scene).add(m);
    return m;
  }
  function addBox(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); (parent || scene).add(m);
    return m;
  }

  const wood = new THREE.MeshLambertMaterial({ color: 0x2a1c12 });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  let glowFloor, washMat;

  function buildMuseum() {
    glowFloor = tex(ART.glowTex('rgba(255,215,160,0.55)'));
    washMat = new THREE.MeshBasicMaterial({ map: tex(ART.glowTex('rgba(255,210,150,0.45)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });

    // 바닥, 천장, 벽
    texSet = {
      dark: { floor: tex(ART.floorTex(), 2, (L + 8) / 4), wall: tex(ART.wallTex(), L / 4, 1), docent: tex(ART.drawDocent()) },
      bright: { floor: tex(ART.floorTexBright(), 2, (L + 8) / 4), wall: tex(ART.wallTexBright(), L / 4, 1), docent: tex(ART.drawDocentBright()) }
    };
    floorMat = new THREE.MeshLambertMaterial({ map: texSet.dark.floor });
    const floor = addPlane(HW * 2, L + 8, floorMat, 0, 0, -L / 2);
    floor.rotation.x = -Math.PI / 2;
    ceilMat = new THREE.MeshLambertMaterial({ color: 0x15130f });
    const ceil = addPlane(HW * 2, L + 8, ceilMat, 0, H, -L / 2);
    ceil.rotation.x = Math.PI / 2;
    wallMat = new THREE.MeshLambertMaterial({ map: texSet.dark.wall });
    addPlane(L, H, wallMat, -HW, H / 2, -L / 2, Math.PI / 2);
    addPlane(L, H, wallMat, HW, H / 2, -L / 2, -Math.PI / 2);

    // 양 끝 벽 (가운데 문 구멍)
    endMat = new THREE.MeshLambertMaterial({ color: 0x23251f });
    tunnelMat = new THREE.MeshLambertMaterial({ color: 0x15140f });
    tunnelBackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const dw = 2.2, dh = 2.9;
    [0, -L].forEach(z => {
      const ry = z === 0 ? Math.PI : 0;
      const sideW = HW - dw / 2;
      addPlane(sideW, H, endMat, -(dw / 2 + sideW / 2), H / 2, z, ry);
      addPlane(sideW, H, endMat, (dw / 2 + sideW / 2), H / 2, z, ry);
      addPlane(dw, H - dh, endMat, 0, dh + (H - dh) / 2, z, ry);
      addBox(0.12, dh, 0.25, wood, -dw / 2, dh / 2, z);
      addBox(0.12, dh, 0.25, wood, dw / 2, dh / 2, z);
      addBox(dw + 0.24, 0.12, 0.25, wood, 0, dh, z);
    });
    // 문 너머 어두운 통로
    function tunnel(z0, dir) {
      const g = new THREE.Group();
      const m = tunnelMat;
      const len = 5, zc = z0 + dir * len / 2;
      addPlane(len, dh, m, -dw / 2, dh / 2, zc, Math.PI / 2, g);
      addPlane(len, dh, m, dw / 2, dh / 2, zc, -Math.PI / 2, g);
      addPlane(dw, len, m, 0, dh, zc, 0, g).rotation.x = Math.PI / 2;
      addPlane(dw, len, m, 0, 0.001, zc, 0, g).rotation.x = -Math.PI / 2;
      addPlane(dw, dh, tunnelBackMat, 0, dh / 2, z0 + dir * len, dir > 0 ? Math.PI : 0, g);
      scene.add(g);
      return g;
    }
    tunnel(0, 1);
    farTunnel = tunnel(-L, -1);

    // 출구 계단 (마지막 전시실을 지난 뒤에만 보임)
    exitGroup = new THREE.Group();
    addPlane(dw, dh, new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false }), 0, dh / 2 + 1.2, -L - 4.9, 0, exitGroup);
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x8c877a });
    for (let i = 0; i < 8; i++) addBox(dw - 0.1, 0.18, 0.5, stepMat, 0, 0.09 + i * 0.18, -L - 0.6 - i * 0.5, exitGroup);
    exitGroup.visible = false;
    scene.add(exitGroup);

    // 문 위 작은 표지판
    farSignMesh = addPlane(1.6, 0.42, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('다음 전시실 →', 'NEXT')) }), 0, 3.3, -L + 0.02, 0);
    addPlane(1.6, 0.42, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('← 되돌아가기', 'BACK', '#c9b48a')) }), 0, 3.3, -0.02, Math.PI);

    // 천장 조명
    for (let z = -3; z > -L; z -= 6) {
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe7bf });
      addPlane(1.6, 0.32, lampMat, 0, H - 0.02, z).rotation.x = Math.PI / 2;
      const pool = addPlane(4.2, 4.2, new THREE.MeshBasicMaterial({ map: glowFloor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }), 0, 0.012, z);
      pool.rotation.x = -Math.PI / 2;
      lamps.push({ lampMat, pool, z, flick: 0 });
    }

    // 왼쪽 벽 진열장 자리
    [['L0', -9], ['L1', -15], ['L2', -21], ['L3', -33], ['L4', -39]].forEach(([name, z]) => {
      const g = new THREE.Group();
      addBox(0.6, 0.45, 1.7, wood, -HW + 0.3, 0.225, z, g);
      addBox(0.06, 2.4, 0.06, wood, -HW + 0.55, 1.62, z - 0.83, g);
      addBox(0.06, 2.4, 0.06, wood, -HW + 0.55, 1.62, z + 0.83, g);
      addBox(0.6, 0.08, 1.72, wood, -HW + 0.3, 2.84, z, g);
      addBox(0.02, 2.36, 1.62, new THREE.MeshBasicMaterial({ color: 0x9fb5c0, transparent: true, opacity: 0.06, depthWrite: false }), -HW + 0.58, 1.64, z, g).renderOrder = 2;
      addPlane(2.6, 2.6, washMat, -HW + 0.03, 2.6, z, Math.PI / 2, g).renderOrder = 1;
      makeSlot(name, g, 1.5, 2.25, -HW + 0.02, 1.6, z, Math.PI / 2, ART.drawCase);
    });
    // 왼쪽 끝 큰 그림 자리
    {
      const g = new THREE.Group();
      addBox(0.08, 2.35, 3.2, wood, -HW + 0.02, 1.8, -45, g);
      addPlane(4, 3.4, washMat, -HW + 0.04, 2.3, -45, Math.PI / 2, g);
      makeSlot('M', g, 3.0, 2.15, -HW + 0.08, 1.8, -45, Math.PI / 2, ART.drawMural);
    }
    // 오른쪽 벽 패널 자리
    [['R0', -10], ['R1', -17], ['R2', -28], ['R3', -35], ['R4', -42]].forEach(([name, z]) => {
      const g = new THREE.Group();
      addBox(0.06, 2.0, 2.76, wood, HW - 0.02, 1.85, z, g);
      addPlane(3.6, 3.2, washMat, HW - 0.04, 2.5, z, -Math.PI / 2, g);
      makeSlot(name, g, 2.6, 1.86, HW - 0.06, 1.85, z, -Math.PI / 2, ART.drawPanel);
    });
    // 가운데 모형 설명판 자리
    {
      const g = new THREE.Group();
      addBox(0.06, 0.75, 0.06, wood, CX + 0.15, 0.38, CZ + 1.97, g);
      const pool = addPlane(4.5, 4.5, new THREE.MeshBasicMaterial({ map: glowFloor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }), CX, 0.02, CZ, 0, g);
      pool.rotation.x = -Math.PI / 2;
      const label = makeSlot('C', g, 1.05, 0.58, CX + 0.15, 0.9, CZ + 1.9, 0.35, ART.drawLabel);
      label.rotation.x = -0.5;
    }

    // 문 (분위기용)
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a3631 });
    [[-22.5, '수장고'], [-4, '관계자 외 출입금지']].forEach(([z, label]) => {
      addBox(0.08, 2.4, 1.2, doorMat, HW - 0.04, 1.2, z);
      addPlane(0.9, 0.28, new THREE.MeshBasicMaterial({ map: tex(ART.drawDoorPlate(label)) }), HW - 0.09, 2.0, z, -Math.PI / 2);
      addBox(0.1, 0.06, 0.18, new THREE.MeshLambertMaterial({ color: 0x8a8070 }), HW - 0.12, 1.1, z + 0.4);
    });

    // 입구: 관람 안내판 + 전시실 번호 표지판
    rulesTex = tex(ART.drawRules(''));
    const rules = addPlane(1.2, 1.64, new THREE.MeshBasicMaterial({ map: rulesTex, color: 0xd8d0c0 }), -HW + 0.04, 1.75, -4.2, Math.PI / 2);
    rules.userData.key = 'rules'; pickables.push(rules);
    addPlane(2.4, 2.6, washMat, -HW + 0.05, 2.3, -4.2, Math.PI / 2);

    signTex = tex(ART.drawSign(0, ROOMS[0].name));
    const lampGlowMat = () => new THREE.MeshBasicMaterial({ color: 0xffc850, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    lampGlow.left = addPlane(40, 3.2, lampGlowMat(), -HW + 0.66, 1.7, -27, Math.PI / 2);
    lampGlow.right = addPlane(40, 3.2, lampGlowMat(), HW - 0.12, 1.8, -27, -Math.PI / 2);
    lampGlow.center = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.6, 24, 1, true), lampGlowMat());
    lampGlow.center.position.set(CX, 1.8, CZ); scene.add(lampGlow.center);
    lampGlow.docent = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(ART.glowTex('rgba(255,200,80,0.9)')), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    lampGlow.docent.scale.set(2.2, 3, 1); scene.add(lampGlow.docent);
    Object.values(lampGlow).forEach(m => { m.visible = false; m.renderOrder = 3; });

    const sign = addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: signTex }), 0, 3.35, -6.5, 0);
    sign.userData.key = 'sign'; pickables.push(sign);
    addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('← 지나온 전시실', 'BACK', '#c9b48a')) }), 0, 3.35, -6.52, Math.PI);
    addBox(0.03, 0.5, 0.03, darkMat, -0.9, 3.95, -6.51);
    addBox(0.03, 0.5, 0.03, darkMat, 0.9, 3.95, -6.51);
  }

  function makeSlot(name, group, w, h, x, y, z, ry, drawFn) {
    const cnv = drawFn({ title: '', tag: '', lines: [], steps: [], art: 'handaxe' });
    const t = tex(cnv);
    const mesh = addPlane(w, h, new THREE.MeshBasicMaterial({ map: t, color: 0xd6cdbd }), x, y, z, ry, group);
    mesh.userData.slot = name;
    pickables.push(mesh);
    scene.add(group);
    slots[name] = { group, mesh, texture: t, draw: drawFn, canvas: cnv, key: null };
    return mesh;
  }

  /* ---------- 가운데 3D 모형 ---------- */
  const stoneMatCache = {};
  function stoneMat(color) {
    if (!stoneMatCache[color]) stoneMatCache[color] = new THREE.MeshLambertMaterial({ map: tex(ART.stoneTex()), color });
    return stoneMatCache[color];
  }
  const MODELS = {
    dolmen(g) {
      const stone = stoneMat(0xffffff);
      addBox(2.5, 0.2, 2.2, new THREE.MeshLambertMaterial({ color: 0x1d1a16 }), 0, 0.1, 0, g);
      addBox(0.25, 1.15, 1.4, stone, -0.7, 0.78, 0, g);
      addBox(0.25, 1.15, 1.4, stone, 0.7, 0.78, 0, g);
      const cap = addBox(2.2, 0.32, 1.9, stone, 0, 1.5, 0, g);
      cap.rotation.z = 0.04; cap.rotation.y = 0.05;
    },
    firepit(g) {
      const stone = stoneMat(0x9a958a);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17), stone);
        m.position.set(Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55); m.rotation.set(a, a * 2, 0); g.add(m);
      }
      const logMat = new THREE.MeshLambertMaterial({ color: 0x2a1a0e });
      [0.4, -0.5, 1.4].forEach(r => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6), logMat);
        log.rotation.z = Math.PI / 2 - 0.3; log.rotation.y = r; log.position.y = 0.18; g.add(log);
      });
      const flameTex = tex(ART.glowTex('rgba(255,170,70,0.95)'));
      const flames = [0, 1, 2].map(i => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.position.set((i - 1) * 0.12, 0.45, 0); sp.scale.set(0.6, 0.9, 1); g.add(sp);
        return sp;
      });
      fireFx = { flames, t: 0 };
    },
    pithouse(g) {
      const pitMat = new THREE.MeshLambertMaterial({ color: 0x241a12 });
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 18), pitMat);
      pit.position.y = 0.04; g.add(pit);
      const roofTex = document.createElement('canvas'); roofTex.width = 256; roofTex.height = 256;
      const c = roofTex.getContext('2d');
      c.fillStyle = '#6b5232'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 500; i++) { c.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,28,14' : '150,120,70'},0.5)`; c.beginPath(); const x = Math.random() * 256; c.moveTo(x, Math.random() * 256); c.lineTo(x + (Math.random() - 0.5) * 6, Math.random() * 256); c.stroke(); }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.3, 14, 1, true), new THREE.MeshLambertMaterial({ map: tex(roofTex, 3, 1), side: THREE.DoubleSide }));
      roof.position.y = 1.2; g.add(roof);
      const door = addPlane(0.55, 0.85, new THREE.MeshBasicMaterial({ color: 0x050302 }), 0.32, 0.45, 0.98, 0.35, g);
      door.rotation.x = -0.45;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 0.4, 6), new THREE.MeshLambertMaterial({ color: 0x3a2a18 }));
      top.position.y = 2.45; g.add(top);
    },
    stele(g) {
      const cnv = document.createElement('canvas'); cnv.width = 256; cnv.height = 1024;
      const c = cnv.getContext('2d');
      c.fillStyle = '#7d7a70'; c.fillRect(0, 0, 256, 1024);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '30,30,26' : '200,198,185'},${0.12 * Math.random()})`; c.beginPath(); c.arc(Math.random() * 256, Math.random() * 1024, Math.random() * 10, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(30,28,24,0.6)'; c.font = '600 26px "Noto Serif KR", serif'; c.textAlign = 'center';
      const han = '天地人王國民山川高句麗太王廣開土境好太王百濟新羅城東西南北中年月日';
      for (let x = 230; x > 20; x -= 32) for (let y = 40; y < 1000; y += 30) if (Math.random() > 0.15) c.fillText(han[Math.floor(Math.random() * han.length)], x, y);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.3, 0.75), new THREE.MeshLambertMaterial({ map: tex(cnv) }));
      m.position.y = 1.85; m.rotation.y = 0.12; m.rotation.z = 0.015; g.add(m);
      addBox(1.5, 0.2, 1.3, new THREE.MeshLambertMaterial({ color: 0x1d1a16 }), 0, 0.1, 0, g);
    },
    pagoda(g, ex) {
      const tiers = (ex.visual && ex.visual.tiers) || ex.tiers || 3;
      const octa = ex.shape === 'octa';
      const stone = stoneMat(0xc8c2b4);
      const seg = octa ? 8 : 4;
      const prism = (rTop, rBot, h, y) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), stone);
        m.position.y = y; m.rotation.y = octa ? 0 : Math.PI / 4; g.add(m);
        return m;
      };
      // 기단 2단
      prism(0.95, 1.0, 0.35, 0.175);
      prism(0.75, 0.8, 0.3, 0.5);
      // 층수가 달라도 전체 높이는 비슷하게 → 층의 수로만 구별된다
      const total = 2.7, th = total / tiers;
      let y = 0.65;
      for (let i = 0; i < tiers; i++) {
        const k = 1 - i / (tiers + 2) * 0.6;
        const bodyH = th * 0.55;
        prism(0.42 * k, 0.45 * k, bodyH, y + bodyH / 2);
        y += bodyH;
        const roofH = th * 0.22;
        prism(0.62 * k, 0.75 * k, roofH, y + roofH / 2);
        y += roofH + th * 0.06;
      }
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.55, 6), new THREE.MeshLambertMaterial({ color: 0x5a5444 }));
      fin.position.y = y + 0.27; g.add(fin);
    }
  };

  function buildCenter(ex) {
    if (centerModel) {
      scene.remove(centerModel);
      centerModel.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      centerModel = null;
    }
    for (let i = pickables.length - 1; i >= 0; i--) if (pickables[i].userData.centerPart) pickables.splice(i, 1);
    fireFx = null;
    fireLight.intensity = 0;
    if (!ex || !MODELS[ex.model]) return;
    const g = new THREE.Group();
    MODELS[ex.model](g, ex);
    g.position.set(CX, 0, CZ);
    g.traverse(o => { if (o.isMesh) { o.userData.slot = 'C'; o.userData.centerPart = true; pickables.push(o); } });
    scene.add(g);
    centerModel = g;
  }

  /* ---------- 떠도는 해설사 ---------- */
  let docent, docentHit;
  function buildDocent() {
    docent = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(ART.drawDocent()), transparent: true, opacity: 0.88, depthWrite: false }));
    docent.scale.set(0.88, 1.92, 1);
    docent.userData.key = 'docent';
    scene.add(docent);
    // 스프라이트는 작아서 손가락으로 누르기 어렵다 → 보이지 않는 큰 상자로 누름 판정
    docentHit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 1.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    docentHit.userData.key = 'docent';
    scene.add(docentHit);
    pickables.push(docentHit);
  }

  /* ---------- 게임 상태 ---------- */
  const S = {
    mode: 'title',          // title | play | inspect | note | menu | trans | ending
    streak: 0,              // = 지금 전시실 번호
    roomIdx: 0,             // 지금 전시실의 주제 (ROOMS 번호)
    history: [],            // 지금까지 나온 주제 (연속 제한용)
    checkpoint: 0,          // 중간 저장된 전시실 번호
    forcedRoom: null,
    elapsed: 0,
    viewed: new Set(),      // 이번 전시실에서 자세히 본 전시물
    wrongStreak: {},        // 주제별 연속 오답 수
    lampReady: false, lampTarget: null, helped: false, helpCount: 0,
    review: false,          // 정상 전시 다시 보기 중
    anomaly: null,
    lastAnomalyId: null,
    firstGallery: true,
    exitRoom: false,
    startRoom: 0,
    forced: null,
    z: -2, yaw: 0, pitch: 0,
    turning: 0, turnFrom: 0, turnTo: 0,
    bob: 0, lastStepSign: 0,
    docZ: -L + 2, docStep: 0, spoke: false, docSpeech: '',
    startTime: 0, mistakes: 0, foundThisRun: 0
  };

  function room() { return ROOMS[S.roomIdx]; }

  // 다음 주제: 무작위, 단 같은 주제가 3번 연속이면 다른 주제
  function pickRoom() {
    if (S.forcedRoom != null) { const r = S.forcedRoom; S.forcedRoom = null; return r; }
    if (curMode().room != null) return curMode().room;   // 시대별 모드: 그 시대만
    const h = S.history, n = h.length;
    let pool = ROOMS.map((r, i) => i);
    if (n >= MAX_SAME && h.slice(n - MAX_SAME).every(x => x === h[n - 1])) pool = pool.filter(i => i !== h[n - 1]);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function current(key) {
    const base = room().exhibits[key];
    return applyPatch(base, S.anomaly && S.anomaly.target === key ? S.anomaly.patch : null);
  }

  // 전시실마다 벽 색을 조금씩 다르게 (밝은 박물관은 파스텔 톤)
  function wallTint(hex) {
    const c = new THREE.Color(hex);
    if (isBright()) c.lerp(new THREE.Color(0xffffff), 0.72);
    return c;
  }

  // 지금 시대의 으스스한 분위기 설정 (밝은 박물관이거나 출구면 없음)
  const era = () => (!isBright() && !S.exitRoom && window.ERAS) ? ERAS.CONF[room().id] : null;
  function applyTheme() {
    const t = theme(), bright = isBright();
    if (!texSet) return;
    const e = era();
    scene.background.setHex(e ? e.fog : t.bg);
    scene.fog.color.setHex(e ? e.fog : t.fog); scene.fog.density = e ? e.density : t.fogDensity;
    ambient.color.setHex(e ? e.ambient[0] : t.ambient[0]); ambient.intensity = e ? e.ambient[1] : t.ambient[1];
    lantern.color.setHex(e ? e.lantern[0] : t.lantern[0]);
    S.lanternBase = e ? e.lantern[1] : t.lantern[1];
    S.lampColor = new THREE.Color(e ? e.lamp : 0xffe7bf);
    S.flicker = e ? e.flicker : (t.flicker ? 'normal' : 'none');
    const set = bright ? texSet.bright : texSet.dark;
    floorMat.map = set.floor; floorMat.needsUpdate = true;
    wallMat.map = set.wall; wallMat.needsUpdate = true;
    if (!S.exitRoom) wallMat.color.copy(wallTint(room().wall || 0xffffff));
    ceilMat.color.setHex(t.ceil); endMat.color.setHex(t.end);
    tunnelMat.color.setHex(t.tunnel); tunnelBackMat.color.setHex(t.tunnelBack);
    lamps.forEach(l => { l.flick = 0; l.lampMat.color.copy(S.lampColor); l.pool.material.opacity = t.pool; });
    washMat.opacity = t.wash;
    docent.material.map = e ? eraDocentTex(e.docent.look) : set.docent; docent.material.needsUpdate = true;
    S.docOpacity = t.docentOpacity;
    applyEraDecor(e);
    fadeEl.style.background = t.fade;
    document.body.classList.toggle('bright', bright);
    SFX.setTheme(bright ? 'bright' : 'dark');
    SFX.setAmbience(e ? e.sound : null);
    if (S.docSpeech) setDocVoice();
  }

  /* ---------- 시대별 장식·떠다니는 것·해설사 ---------- */
  const eraTexCache = {}, eraDecorCache = {}, eraPartCache = {};
  let eraDecor = null, eraParts = null;
  function eraDocentTex(look) { return eraTexCache[look] || (eraTexCache[look] = tex(ERAS.docentCanvas(look))); }
  function eraDocentCanvas() { const e = era(); return e ? ERAS.docentCanvas(e.docent.look) : null; }
  function applyEraDecor(e) {
    const env = { THREE, tex, HW, L, H };
    if (eraDecor) eraDecor.group.visible = false;
    if (eraParts) eraParts.points.visible = false;
    eraDecor = eraParts = null;
    if (!e) return;
    if (e.decor) {
      eraDecor = eraDecorCache[e.decor] || (eraDecorCache[e.decor] = ERAS.buildDecor(e.decor, env));
      if (!eraDecor.group.parent) scene.add(eraDecor.group);
      eraDecor.group.visible = true;
    }
    if (e.particles) {
      eraParts = eraPartCache[e.particles] || (eraPartCache[e.particles] = ERAS.buildParticles(e.particles, env));
      if (!eraParts.points.parent) scene.add(eraParts.points);
      eraParts.points.visible = true;
    }
  }
  /* ---------- 깜짝 효과 (으스스한 박물관, 전시실마다 최대 한 번, 약 50%) ---------- */
  const SCARE_CHANCE = 0.5;
  let ghost = null;
  function planScare() {
    const e = era();
    S.scareAt = null; S.blackout = 0; S.boost = 0;
    if (ghost) ghost.visible = false;
    if (!e || !e.scare || !settings.scares || S.review || S.firstGallery || Math.random() > SCARE_CHANCE) return;
    S.scareAt = -12 - Math.random() * 18;     // 복도 가운데쯤 어딘가에서
  }
  function placeAround(where, dist, side) {
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const p = camera.position.clone();
    if (where === 'front') p.addScaledVector(fwd, dist);
    if (where === 'behind') p.addScaledVector(fwd, -dist);
    if (where === 'side') p.add(new THREE.Vector3(-fwd.z, 0, fwd.x).multiplyScalar(dist));
    if (side != null) p.x = side;
    p.x = Math.max(-HW + 0.5, Math.min(HW - 0.4, p.x));
    p.z = Math.max(-L + 0.6, Math.min(-0.4, p.z));
    return p;
  }
  function runScare() {
    const e = era(); if (!e || !e.scare) return;
    const sc = e.scare;
    SFX.scare(sc.sound);
    if (sc.blackout) S.blackout = sc.blackout + (sc.blackoutDelay || 0), S.blackoutDelay = sc.blackoutDelay || 0;
    if (sc.boost) S.boost = sc.boost;
    if (sc.flash) { const f = $('scareFlash'); f.style.background = sc.flash; f.style.transition = 'none'; f.style.opacity = 1; setTimeout(() => { f.style.transition = 'opacity 0.9s'; f.style.opacity = 0; }, 80); }
    if (sc.footRing) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; S.docX = Math.cos(a) * 0.9; const z = S.docZ; S.docZ = S.z + Math.sin(a) * 0.9; dropFootprint(); S.docZ = z; S.docX = docMove() === 'wallSlide' ? 2.95 : 1.35; }
    if (sc.docentBehind) { S.docZ = Math.min(-0.6, S.z + sc.docentBehind); S.docX = 0.6; }
    if (sc.ghost) {
      if (!ghost) {
        ghost = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
        ghost.scale.set(0.95, 2.1, 1); scene.add(ghost);
      }
      ghost.material.map = eraDocentTex(e.docent.look); ghost.material.needsUpdate = true;
      const p = placeAround(sc.ghost.where, sc.ghost.dist, sc.ghost.side);
      ghost.position.set(p.x, 1.02, p.z);
      ghost.userData = { t: sc.ghost.sec, total: sc.ghost.sec, dash: sc.ghost.dash, dir: Math.random() < 0.5 ? 1 : -1 };
      ghost.material.opacity = 0.95; ghost.visible = true;
    }
    if (sc.hint) setTimeout(() => showHint(sc.hint, 2600), 350);
  }
  function updateScare(dt) {
    if (S.scareAt != null && S.mode === 'play' && S.z < S.scareAt) { S.scareAt = null; runScare(); }
    if (S.boost > 0) S.boost -= dt;
    if (S.blackout > 0) { S.blackout -= dt; if (S.blackoutDelay > 0) S.blackoutDelay -= dt; }
    if (ghost && ghost.visible) {
      const u = ghost.userData; u.t -= dt;
      if (u.dash) ghost.position.z += u.dir * dt * 9;
      ghost.material.opacity = Math.max(0, Math.min(0.95, u.t / Math.min(0.4, u.total) ));
      if (u.t <= 0) ghost.visible = false;
    }
  }
  const blackoutOn = () => S.blackout > 0 && !(S.blackoutDelay > 0);

  // 해설사가 나타나는 방식 (밝은 박물관은 늘 보통 걸음)
  const docMove = () => { const e = era(); return e ? e.docent.move : 'walk'; };
  const footprints = [];
  function resetDocent() {
    const m = docMove();
    S.docDir = m === 'fromBehind' ? -1 : 1;
    S.docZ = m === 'fromBehind' ? -0.6 : -L + 1.5;
    S.docX = m === 'wallSlide' ? 2.95 : 1.35;
    S.docT = 0; S.docBlinkT = 0; S.docAlpha = 1; S.docTravel = 0; S.footIdx = 0;
    S.spoke = false;
    footprints.forEach(f => { f.visible = false; });
  }
  function dropFootprint() {
    if (!footprints.length) {
      const mat = new THREE.MeshBasicMaterial({ map: tex(ERAS.footprintCanvas()), transparent: true, depthWrite: false });
      for (let i = 0; i < 14; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), mat);
        f.rotation.x = -Math.PI / 2; f.visible = false; scene.add(f); footprints.push(f);
      }
    }
    const f = footprints[S.footIdx++ % footprints.length];
    f.position.set(S.docX + (S.footIdx % 2 ? 0.14 : -0.14), 0.015, S.docZ);
    f.rotation.z = S.docDir > 0 ? Math.PI : 0;
    f.visible = true;
  }
  function docentSeen() {   // 해설사가 지금 내 화면 안에 보이는지
    const dx = S.docX - camera.position.x, dz = S.docZ - camera.position.z;
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const ang = Math.acos(Math.max(-1, Math.min(1, (fwd.x * dx + fwd.z * dz) / (Math.hypot(dx, dz) * Math.hypot(fwd.x, fwd.z) || 1))));
    const half = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
    return ang < half + 0.1;
  }
  function updateDocent(dt, now, active) {
    const m = docMove();
    const end = S.docDir > 0 ? -2.4 : -L + 3;
    const canMove = S.docDir > 0 ? S.docZ < end : S.docZ > end;
    let speed = 0.72, moving = canMove, y = 0.96, steps = true;
    if (m === 'float') { speed = 0.55; steps = false; y = 1.08 + Math.sin(now / 700) * 0.12; }
    if (m === 'stopgo') { S.docT += dt; speed = 1.0; moving = canMove && (S.docT % 3.4) < 1.6; }
    if (m === 'statue') { speed = 1.4; moving = canMove && !docentSeen(); }
    if (m === 'blink') {
      moving = false; steps = false; S.docBlinkT += dt;
      if (canMove && S.docBlinkT > 2.8) {
        S.docBlinkT = 0; S.docAlpha = 0;
        S.docZ = S.docDir > 0 ? Math.min(end, S.docZ + 3.5 + Math.random() * 2.5) : Math.max(end, S.docZ - 3.5 - Math.random() * 2.5);
        SFX.chime();
      }
    }
    if (moving) {
      const d = S.docDir * speed * dt;
      S.docZ += d; S.docTravel += Math.abs(d);
      S.docStep += dt;
      if (steps && S.docStep > 0.72) { S.docStep = 0; SFX.step(Math.max(0, 0.45 - Math.abs(S.docZ - S.z) * 0.025), m === 'statue' ? 0.45 : 0.75); }
      if (m === 'footprints' && S.docTravel > 0.75) { S.docTravel = 0; dropFootprint(); }
    }
    const dist = Math.abs(S.docZ - S.z);
    // 얼마나 보이는지: 다가올수록 서서히 / 발자국만 먼저 / 순간이동 뒤 서서히
    let alpha = 1;
    if (m === 'fadeIn') alpha = Math.max(0, Math.min(1, (16 - dist) / 8));
    if (m === 'footprints') alpha = Math.max(0, Math.min(1, (8 - dist) / 3));
    if (m === 'blink') { S.docAlpha = Math.min(1, S.docAlpha + dt * 2.5); alpha = S.docAlpha; }
    if (m === 'wallSlide') alpha = 0.92;
    docent.material.opacity = (S.docOpacity || 0.88) * alpha;
    // 가까이 오면 가끔 고개를 까딱 비튼다 (으스스한 박물관)
    if (era() && dist < 7) {
      if (S.twitch > 0) { S.twitch -= dt; docent.material.rotation = S.twitchAng; }
      else { docent.material.rotation *= 0.8; if (Math.random() < dt * 0.35) { S.twitch = 0.12 + Math.random() * 0.15; S.twitchAng = (Math.random() - 0.5) * 0.18; } }
    } else docent.material.rotation = 0;
    docentHit.visible = docent.visible && alpha > 0.3;
    const sway = (m === 'statue' || m === 'wallSlide') ? 0 : Math.sin(now / 900) * 0.02;
    if (era()) { docent.scale.set(0.92, 2.08, 1); y += 0.06; } else docent.scale.set(0.88, 1.92, 1);
    docent.position.set(S.docX + sway, y, S.docZ);
    docentHit.position.set(S.docX, 1.05, S.docZ);
    docentGlow.position.set(S.docX + 0.2, 1.1, S.docZ + 0.3);
    lampGlow.docent.position.set(S.docX, 1.0, S.docZ);
    if (!S.spoke && dist < 5 && active && alpha > 0.5) { S.spoke = true; showSubtitle(S.docSpeech); }
  }
  function setDocVoice() {
    const id = S.anomaly && S.anomaly.target === 'docent' ? S.anomaly.id : room().id;
    S.docVoice = (isBright() ? 'voice_bright/' : 'voice/') + id + '.mp3';
    SFX.preloadVoice(S.docVoice);
  }

  function setupRoom() {
    const r = room();
    Object.values(slots).forEach(s => { s.group.visible = false; s.key = null; });
    buildCenter(null);
    S.docSpeech = '';
    if (S.exitRoom) return;
    wallMat.color.copy(wallTint(r.wall || 0xffffff));
    Object.keys(r.exhibits).forEach(key => {
      const ex = current(key);
      if (ex.kind === 'docent') {
        S.docSpeech = ex.speech;
        // 녹음 파일: 정상 대사는 voice/전시실ID.mp3, 바뀐 대사는 voice/이상현상ID.mp3 (밝은 박물관은 voice_bright/)
        setDocVoice();
        return;
      }
      const slot = slots[ex.slot];
      const cnv = slot.draw(ex);
      slot.canvas = cnv;
      slot.texture.image = cnv;
      slot.texture.needsUpdate = true;
      slot.group.visible = true;
      slot.key = key;
      if (ex.kind === 'center') buildCenter(ex);
    });
  }

  function rulesInfo() {
    const scope = modeRooms();
    const remain = window.ANOMALIES.filter(a => scope.includes(a.room) && !found.has(a.id)).length;
    if (!cleared) return '';
    if (remain === 0) return '모든 이상 현상을 발견했습니다. 관람해 주셔서 감사합니다.';
    return `아직 발견하지 못한 이상 현상: ${remain}개`;
  }

  function pickAnomaly() {
    if (S.forced) { const f = S.forced; S.forced = null; return f; }
    if (S.firstGallery || S.exitRoom) return null;
    if (Math.random() > ANOMALY_RATE) return null;
    const all = room().anomalies;
    let pool = all.filter(a => !found.has(a.id));
    if (pool.length === 0) pool = all.slice();
    if (pool.length > 1) pool = pool.filter(a => a.id !== S.lastAnomalyId);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function newGallery(restore) {
    S.exitRoom = S.streak >= goal();
    if (!restore) {
      if (S.forced) S.forcedRoom = S.forced.room;
      S.roomIdx = pickRoom();
      S.history.push(S.roomIdx);
      if (S.history.length > 10) S.history.shift();
      S.anomaly = pickAnomaly();
      if (S.anomaly) S.lastAnomalyId = S.anomaly.id;
      // 정해진 전시실에 도착하면 중간 저장
      if (!S.exitRoom && S.streak > S.checkpoint && curMode().checks.includes(S.streak)) {
        S.checkpoint = S.streak;
        setTimeout(() => showHint(`중간 저장 ─ 이제 틀려도 제 ${S.checkpoint} 전시실부터 다시 시작합니다`, 4500), 1200);
      }
    }
    setupRoom();
    signTex.image = ART.drawSign(S.streak, S.exitRoom ? '' : room().name, S.exitRoom); signTex.needsUpdate = true;
    rulesTex.image = ART.drawRules(rulesInfo(), goal() - 1); rulesTex.needsUpdate = true;
    exitGroup.visible = S.exitRoom;
    exitLight.intensity = S.exitRoom ? 2.2 : 0;
    farTunnel.visible = !S.exitRoom;
    farSignMesh.visible = !S.exitRoom;
    S.z = -2; S.yaw = 0; S.pitch = 0; S.turning = 0;
    applyTheme();
    resetDocent();
    planScare();
    S.review = false;
    resetHelp();
    const wrongs = S.exitRoom ? 0 : (S.wrongStreak[S.roomIdx] || 0);
    S.lampReady = wrongs >= LAMP_AFTER;
    if (wrongs >= WHISPER_AFTER) setTimeout(() => { if (S.mode === 'play') whisper(); }, 2600);
    updateHelpHud();
    docent.visible = !S.exitRoom;
    docentHit.visible = !S.exitRoom;
    docentGlow.intensity = S.exitRoom ? 0 : 0.9;
    hideSubtitle();
    S.firstGallery = false;
    saveProgress();
  }

  /* ---------- 진행 저장 (창을 닫거나 뒤로 가도 이어서 하기) ---------- */
  function playTime() { return S.elapsed + (S.mode === 'title' ? 0 : performance.now() - S.startTime); }
  function saveProgress() {
    if (!S.started) return;
    store.set('progress_' + S.gameMode, {
      streak: S.streak, checkpoint: S.checkpoint, roomIdx: S.roomIdx, history: S.history,
      anomaly: S.anomaly ? S.anomaly.id : null, lastAnomalyId: S.lastAnomalyId,
      mistakes: S.mistakes, foundThisRun: S.foundThisRun, elapsed: playTime()
    });
  }
  function loadProgress(mode) {
    const p = store.get('progress_' + mode, null);
    if (!p || typeof p.streak !== 'number' || !ROOMS[p.roomIdx]) return null;
    return p;
  }
  function clearProgress(mode) { try { localStorage.removeItem('mhm_progress_' + (mode || S.gameMode)); } catch (e) {} }
  window.addEventListener('pagehide', () => { if (S.started && S.mode !== 'ending') saveProgress(); });

  /* ---------- 화면 전환 ---------- */
  const fadeEl = $('fade');
  function fadeTo(op, ms) {
    fadeEl.style.transition = `opacity ${ms || 700}ms`;
    fadeEl.style.opacity = op;
    return new Promise(r => setTimeout(r, ms || 700));
  }

  function exitGallery(dir) {
    if (S.mode !== 'play') return;
    keys.fwd = keys.back = keys.run = false;
    // 정상 전시 다시 보기를 마치면 원래 가려던 다음 전시실로
    if (S.review) {
      S.mode = 'trans'; SFX.whoosh(); SFX.stopSpeak();
      fadeTo(1, 700).then(() => { newGallery(); setTimeout(() => { S.mode = 'play'; fadeTo(0, 900); }, 350); });
      return;
    }
    if (S.exitRoom && dir === 'forward') {
      S.mode = 'trans'; SFX.whoosh(); SFX.stopSpeak();
      fadeTo(1, 900).then(showEnding);
      return;
    }
    if (dir === 'back' && !S.exitRoom) {
      // 되돌아갈 때는 어느 전시물이 이상했는지 근거를 고르게 한다
      S.mode = 'pick'; SFX.stopSpeak();
      showPick(key => judge('back', key), () => { S.z = -1.4; S.mode = 'play'; });
      return;
    }
    judge(dir, null);
  }

  function judge(dir, picked) {
    S.mode = 'trans';
    SFX.whoosh(); SFX.stopSpeak();
    const had = S.anomaly;
    const roomName = S.exitRoom ? '' : `제 ${S.streak} 전시실 · ${room().name}`;
    const roomIdx = S.roomIdx;
    // 앞으로: 이상 현상이 없어야 정답 / 되돌아가기: 이상 현상이 있고, 고른 전시물까지 맞아야 정답
    const correct = dir === 'forward' ? !had : (!!had && picked === had.target);
    const helped = S.helped;
    let note = null;
    if (correct) {
      S.streak++;
      S.wrongStreak[roomIdx] = 0;
      if (had) {
        const isNew = !found.has(had.id);
        found.add(had.id); store.set('found_v2', Array.from(found));
        S.foundThisRun++;
        note = { good: true, a: had, isNew, roomName, helped };
      }
    } else {
      S.streak = S.checkpoint;
      S.mistakes++;
      S.wrongStreak[roomIdx] = (S.wrongStreak[roomIdx] || 0) + 1;
      const pickedWrong = dir === 'back' && !!had && picked !== had.target;
      note = { good: false, a: had, roomName, to: S.streak, roomIdx, helped, pickedWrong, picked: picked ? exhibitName(room().exhibits[picked], picked) : '' };
    }

    fadeTo(1, 700).then(() => {
      if (note) {
        if (note.good) SFX.chime(); else { SFX.wrong(); if (!isBright()) flashRed(); }
        showNote(note, () => { newGallery(); S.mode = 'play'; fadeTo(0, 900); });
      } else {
        newGallery();
        setTimeout(() => { S.mode = 'play'; fadeTo(0, 900); }, 350);
      }
    });
  }

  function flashRed() {
    const r = $('redflash');
    r.style.opacity = 1; setTimeout(() => { r.style.opacity = 0; }, 500);
  }

  function showNote(n, done) {
    S.mode = 'note';
    const card = $('noteCard');
    const back = !n.to ? '처음부터 다시.' : `제 ${n.to} 전시실${n.to === S.checkpoint ? '(중간 저장)' : ''}부터 다시.`;
    let html = n.roomName ? `<div class="k" style="margin-top:0">${n.roomName}</div>` : '';
    if (n.helped) html += `<div class="k" style="margin-top:4px">🏮 힌트 등불 도움 받음</div>`;
    if (n.good) {
      html += `<h2 class="good">${isBright() ? '이상 현상을 찾았어요!' : '이상 현상을 발견했다'}${n.isNew ? '' : ' (이미 기록됨)'}</h2>
        <div class="k">이상했던 점</div><p class="wrongtxt">${n.a.wrong}</p>
        <div class="k">교과서 속 사실</div><p class="right">${n.a.right}</p>`;
    } else if (n.pickedWrong) {
      html += `<h2 class="bad">${isBright() ? '되돌아간 건 맞았지만, 고른 전시물이 달라요!' : '…되돌아간 것은 맞았다. 하지만 고른 전시물이 틀렸다.'} ${back}</h2>
        <div class="k">내가 고른 전시물</div><p>${n.picked}</p>
        <div class="k">이 전시실의 진짜 이상 현상</div><p class="wrongtxt">${n.a.wrong}</p>
        <div class="k">교과서 속 사실</div><p class="right">${n.a.right}</p>`;
    } else if (n.a) {
      html += `<h2 class="bad">${isBright() ? '앗, 놓쳤어요!' : '…놓쳤다.'} ${back}</h2>
        <div class="k">이 전시실의 이상 현상</div><p class="wrongtxt">${n.a.wrong}</p>
        <div class="k">교과서 속 사실</div><p class="right">${n.a.right}</p>`;
    } else {
      html += `<h2 class="bad">${isBright() ? '이 전시실은 정상이었어요.' : '…되돌아갈 필요가 없었다.'}</h2>
        <p>이 전시실에는 이상한 전시가 하나도 없었다.<br>교과서 내용과 꼼꼼히 비교해 보면, 다음엔 헷갈리지 않을 것이다.</p>
        <p style="margin-top:10px;color:#7a6a4e">${back}</p>`;
    }
    if (!n.good && n.roomIdx != null && (S.wrongStreak[n.roomIdx] || 0) >= REVIEW_AFTER) html += `<button class="btn ghost" id="noteReview" style="margin-top:16px;width:100%">🔍 이 주제의 정상 전시 다시 보기</button>`;
    html += `<button class="btn" id="noteOk">계속</button>`;
    card.innerHTML = html;
    card.scrollTop = 0;
    $('note').classList.add('on');
    const close = () => { $('note').classList.remove('on'); window.removeEventListener('keydown', onKey); };
    const ok = () => { close(); done(); };
    const onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ok(); } };
    $('noteOk').onclick = ok;
    if ($('noteReview')) $('noteReview').onclick = () => { close(); startReview(n.roomIdx); };
    setTimeout(() => window.addEventListener('keydown', onKey), 300);
  }

  function showEnding() {
    S.mode = 'ending';
    SFX.exitBell();
    const firstClear = !cleared;
    cleared = true; store.set('cleared_v2', true);
    const sec = Math.round(playTime() / 1000);
    S.started = false;
    clearProgress();
    const remain = window.ANOMALIES.filter(a => !found.has(a.id)).length;
    $('endStat').innerHTML = `
      당신은 「${curMode().name}」에서 빠져나왔다.<br>
      걸린 시간: ${Math.floor(sec / 60)}분 ${sec % 60}초 · 놓친 횟수: ${S.mistakes}번<br>
      이번에 발견한 이상 현상: ${S.foundThisRun}개${S.helpCount ? ` · 힌트 등불 도움: ${S.helpCount}번` : ''}<br>
      전체 기록: ${found.size} / ${window.ANOMALIES.length}개<br>
      ${remain ? `<b>아직 ${remain}개의 이상 현상이 박물관 어딘가에 남아 있다…</b>` : '<b>모든 이상 현상을 발견했다!</b>'}
      ${firstClear ? '<br><span style="font-size:15px">다시 들어가면 안내판의 내용이 달라져 있을지도…</span>' : ''}`;
    showScreen('ending');
    $('hud').classList.remove('on');
  }

  /* ---------- 화면(스크린) ---------- */
  function showScreen(id) {
    ['title', 'menu', 'record', 'ending'].forEach(s => $(s).classList.toggle('on', s === id));
  }
  let recordReturn = 'title';
  function openRecord(from) {
    recordReturn = from;
    const list = $('recordList');
    list.innerHTML = '';
    ROOMS.forEach((r, no) => {
      const got = r.anomalies.filter(a => found.has(a.id)).length;
      const h = document.createElement('div');
      h.className = 'roomhead';
      h.textContent = `제 ${no} 전시실 · ${r.name}  (${got} / ${r.anomalies.length})`;
      list.appendChild(h);
      r.anomalies.forEach(a => {
        const d = document.createElement('div');
        const ex = r.exhibits[a.target];
        const name = a.target === 'docent' ? '해설사' : ex.title;
        if (found.has(a.id)) {
          d.className = 'item';
          d.innerHTML = `<div class="t">✔ [${name}] ${a.wrong}</div><div class="r">→ ${a.right}</div>`;
        } else {
          d.className = 'item unknown';
          d.innerHTML = `<div class="t">??? — ${name} 주변에서 무언가가…</div>`;
        }
        list.appendChild(d);
      });
    });
    $('recordCount').textContent = `발견한 이상 현상 ${found.size} / ${window.ANOMALIES.length}`;
    showScreen('record');
  }

  /* ---------- 입력 ---------- */
  const keys = { fwd: false, back: false, left: false, right: false, run: false };
  window.addEventListener('keydown', e => {
    if (blocked) return;
    if (S.mode === 'inspect' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); closeInspect(); return; }
    if (S.mode === 'play' && e.key === 'Escape') { openMenu(); return; }
    if (S.mode === 'menu' && e.key === 'Escape') { closeMenu(); return; }
    if (S.mode !== 'play') return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.fwd = true;
    if (k === 's' || k === 'arrowdown') keys.back = true;
    if (k === 'a' || k === 'arrowleft') keys.left = true;
    if (k === 'd' || k === 'arrowright') keys.right = true;
    if (k === 'shift') keys.run = true;
    if (k === ' ' || k === 'q') { e.preventDefault(); turnAround(); }
    if (k === 'e' || k === 'enter') { pickAt(0, 0, true); }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.fwd = false;
    if (k === 's' || k === 'arrowdown') keys.back = false;
    if (k === 'a' || k === 'arrowleft') keys.left = false;
    if (k === 'd' || k === 'arrowright') keys.right = false;
    if (k === 'shift') keys.run = false;
  });
  window.addEventListener('blur', () => { keys.fwd = keys.back = keys.left = keys.right = keys.run = false; });

  // 끌어서 둘러보기 / 눌러서 자세히 보기
  let look = null;
  canvasEl.addEventListener('pointerdown', e => {
    if (S.mode !== 'play' || look) return;
    look = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, touch: e.pointerType !== 'mouse' };
    try { canvasEl.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvasEl.addEventListener('pointermove', e => {
    if (look && e.pointerId === look.id) {
      const dx = e.clientX - look.x, dy = e.clientY - look.y;
      look.x = e.clientX; look.y = e.clientY;
      look.moved += Math.abs(dx) + Math.abs(dy);
      const sens = e.pointerType === 'mouse' ? 0.0045 : 0.006;
      // 기본: 오른쪽으로 끌면 오른쪽, 위로 끌면 위를 본다. 메뉴에서 좌우·상하를 따로 반대로 바꿀 수 있다.
      S.yaw -= dx * sens * (settings.invertX ? -1 : 1);
      S.pitch = Math.max(-0.55, Math.min(0.55, S.pitch + dy * sens * 0.8 * (settings.invertY ? -1 : 1)));
    } else if (e.pointerType === 'mouse' && S.mode === 'play') {
      hoverAt(e.clientX, e.clientY);
    }
  });
  function endLook(e) {
    if (!look || e.pointerId !== look.id) return;
    const wasTap = look.moved < (look.touch ? 24 : 10);   // 손가락은 누를 때 조금 흔들린다
    look = null;
    if (wasTap && S.mode === 'play') pickAt(e.clientX, e.clientY, false);
  }
  canvasEl.addEventListener('pointerup', endLook);
  canvasEl.addEventListener('pointercancel', e => { if (look && e.pointerId === look.id) look = null; });

  // 화면 버튼
  function holdBtn(el, onDown, onUp) {
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('active'); onDown(); try { el.setPointerCapture(e.pointerId); } catch (er) {} });
    const up = () => { el.classList.remove('active'); onUp && onUp(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  }
  holdBtn($('tFwd'), () => { keys.fwd = true; }, () => { keys.fwd = false; });
  holdBtn($('tBack'), () => { keys.back = true; }, () => { keys.back = false; });
  holdBtn($('tRun'), () => { keys.run = true; }, () => { keys.run = false; });
  holdBtn($('tTurn'), () => { if (S.mode === 'play') turnAround(); });
  ['tFwd', 'tBack', 'tRun', 'tTurn'].forEach(id => $(id).addEventListener('contextmenu', e => e.preventDefault()));

  function turnAround() {
    const target = (S.turning > 0 ? S.turnTo : S.yaw) - Math.PI / 2;
    S.turnFrom = S.yaw; S.turnTo = target; S.turning = 0.0001;
  }

  /* ---------- 자세히 보기 ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
  function rayAt(cx, cy, center) {
    if (center) ndc.set(0, 0);
    else ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables.filter(shown), false);
    return hits[0] || null;
  }
  let hoverT = 0;
  function hoverAt(x, y) {
    const now = performance.now();
    if (now - hoverT < 80) return;
    hoverT = now;
    const h = rayAt(x, y);
    canvasEl.style.cursor = (h && h.distance < INSPECT_RANGE) ? 'zoom-in' : 'grab';
  }
  function pickAt(x, y, center) {
    const h = rayAt(x, y, center);
    if (!h) return;
    if (h.distance > (h.object.userData.key === 'docent' ? 9 : INSPECT_RANGE)) { showHint('더 가까이 다가가세요…', 1600); return; }
    const u = h.object.userData;
    if (u.key === 'docent') { markViewed('docent'); SFX.voice(S.docVoice, S.docSpeech); return openInspect(ART.drawDocentCard(S.docSpeech, isBright(), eraDocentCanvas())); }
    if (u.key === 'rules') return openInspect(rulesTex.image);
    if (u.key === 'sign') return openInspect(signTex.image);
    if (u.slot && slots[u.slot]) { markViewed(slots[u.slot].key); openInspect(slots[u.slot].canvas); }
  }
  function openInspect(src) {
    if (!src) return;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    const box = $('inspectBox'); box.innerHTML = ''; box.appendChild(c);
    $('inspect').classList.add('on');
    keys.fwd = keys.back = false;
    S.mode = 'inspect';
  }
  function closeInspect() { $('inspect').classList.remove('on'); S.mode = 'play'; }
  $('inspectClose').onclick = closeInspect;
  $('inspect').addEventListener('pointerdown', e => { if (e.target.id === 'inspect') closeInspect(); });

  /* ---------- 자막 / 힌트 ---------- */
  let subTimer = 0;
  function showSubtitle(text, who) {
    if (!text) return;
    $('subWho').textContent = who || '— 해설사 —';
    $('subText').textContent = text;
    $('subtitle').classList.add('on');
    clearTimeout(subTimer);
    subTimer = setTimeout(hideSubtitle, who ? 9000 : 6500);
    if (who) SFX.speak(text); else SFX.voice(S.docVoice, text);
  }

  /* ---------- 도움: 관람 수, 힌트 등불, 해설사의 귀띔, 정상 전시 다시 보기 ---------- */
  function exhibitName(ex, key) { return key === 'docent' ? '해설사의 말' : ex.title; }
  function markViewed(key) {
    if (!key || S.review) return;
    S.viewed.add(key);
    updateHelpHud();
  }
  function resetHelp() {
    S.viewed = new Set();
    S.helped = false; S.lampTarget = null;
    Object.values(lampGlow).forEach(m => { m.visible = false; });
  }
  function updateHelpHud() {
    const playing = !S.exitRoom && !S.review;
    const vc = $('viewCount');
    vc.style.display = playing ? '' : 'none';
    vc.textContent = S.viewed.size >= MIN_VIEWS ? `🔍 관람 ${S.viewed.size} · 문이 열렸습니다` : `🔍 관람 ${S.viewed.size}/${MIN_VIEWS}`;
    vc.classList.toggle('done', S.viewed.size >= MIN_VIEWS);
    $('lampBtn').style.display = playing && S.lampReady && !S.helped ? '' : 'none';
  }
  // 이상 현상이 있는 쪽(왼쪽 벽/오른쪽 벽/가운데/해설사)을 은은하게 비춘다
  function useLamp() {
    if (!S.lampReady || S.helped || S.mode !== 'play') return;
    S.helped = true; S.helpCount++;
    updateHelpHud();
    const a = S.anomaly;
    if (!a) { showHint('🏮 등불이 아무 곳도 비추지 않는다… 이 전시실에는 이상한 곳이 없는 것 같다.', 5000); return; }
    const slot = a.target === 'docent' ? 'docent' : room().exhibits[a.target].slot;
    const side = slot === 'docent' ? 'docent' : slot === 'C' ? 'center' : slot[0] === 'R' ? 'right' : 'left';
    S.lampTarget = side;
    lampGlow[side].visible = true;
    showHint({ left: '🏮 왼쪽 벽이 은은하게 빛난다…', right: '🏮 오른쪽 벽이 은은하게 빛난다…', center: '🏮 가운데 전시물이 은은하게 빛난다…', docent: '🏮 해설사 주변이 은은하게 빛난다…' }[side], 5000);
  }
  $('lampBtn').addEventListener('click', e => { e.stopPropagation(); useLamp(); });
  // 해설사의 귀띔: 어디인지는 알려 주지 않고 무엇을 살펴볼지만
  function whisper() {
    const p = S.anomaly ? S.anomaly.patch : null;
    const tips = {
      tag: '이름표에 적힌 시대나 나라를… 잘 확인해 보렴…',
      visual: '유물의 생김새를… 설명과 잘 비교해 보렴…',
      lines: '설명 문장을… 한 줄 한 줄 꼼꼼히 읽어 보렴…',
      title: '전시물의 이름을… 잘 살펴보렴…',
      sub: '설명판의 작은 제목까지… 잘 읽어 보렴…',
      speech: '내가 하는 말도… 잘 들어 보렴…'
    };
    let key = p && Object.keys(tips).find(k => p[k] !== undefined);
    if (!key) key = Object.keys(tips)[Math.floor(Math.random() * 5)];   // 정상 전시실이어도 귀띔은 한다
    showSubtitle(tips[key], '— 해설사의 귀띔 —');
  }
  // 틀린 주제의 정상 전시(이상 현상 없음)를 시간 제한 없이 둘러보고 돌아온다
  function startReview(roomIdx) {
    S.review = true;
    S.roomIdx = roomIdx;
    S.anomaly = null;
    resetHelp();
    setupRoom();
    signTex.image = ART.drawSign(S.streak, room().name + ' · 정상 전시', false); signTex.needsUpdate = true;
    S.z = -2; S.yaw = 0; S.pitch = 0; S.turning = 0;
    applyTheme();
    resetDocent();
    planScare();
    updateHelpHud();
    S.mode = 'play';
    fadeTo(0, 900);
    setTimeout(() => showHint('이상한 곳이 없는 원래 모습입니다. 다 둘러봤으면 아무 문으로나 나가세요.', 6000), 900);
  }
  // 어느 전시물이 이상했는지 고르기
  const SLOT_ORDER = ['L0', 'L1', 'L2', 'C', 'L3', 'L4', 'M', 'R0', 'R1', 'R2', 'R3', 'R4'];
  function showPick(onPick, onCancel) {
    const ex = room().exhibits;
    const keysInRoom = Object.keys(ex).filter(k => k !== 'docent')
      .sort((a, b) => SLOT_ORDER.indexOf(ex[a].slot) - SLOT_ORDER.indexOf(ex[b].slot)).concat(['docent']);
    const card = $('noteCard');
    card.innerHTML = `<h2>${isBright() ? '어느 전시물이 이상했나요?' : '…무엇이 이상했지?'}</h2>
      <p style="font-size:15px;color:#6d5a3a">이상하다고 생각한 전시물을 하나 고르세요. 틀리게 고르면 정답으로 인정되지 않습니다.</p>
      <div class="pick-list">${keysInRoom.map(k => `<button class="pick" data-k="${k}">${S.viewed.has(k) ? '🔍 ' : ''}${exhibitName(ex[k], k)}</button>`).join('')}</div>
      <button class="btn ghost" id="pickCancel" style="margin-top:14px;width:100%">← 전시실로 돌아가 다시 둘러보기</button>`;
    card.scrollTop = 0;
    $('note').classList.add('on');
    card.querySelectorAll('.pick').forEach(b => {
      b.onclick = () => { $('note').classList.remove('on'); onPick(b.dataset.k); };
    });
    $('pickCancel').onclick = () => { $('note').classList.remove('on'); onCancel(); };
  }
  function hideSubtitle() { $('subtitle').classList.remove('on'); }
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('hint'); h.textContent = text; h.classList.add('on');
    clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('on'), ms || 3000);
  }

  /* ---------- 메뉴 ---------- */
  function openMenu() {
    if (S.mode !== 'play') return;
    S.mode = 'menu'; keys.fwd = keys.back = false;
    showScreen('menu');
  }
  function closeMenu() { showScreen(null); S.mode = 'play'; }
  $('menuBtn').onclick = openMenu;
  $('resumeBtn').onclick = closeMenu;
  $('quitBtn').onclick = () => {
    SFX.stopSpeak(); saveProgress(); S.elapsed = playTime(); S.started = false;
    $('hud').classList.remove('on'); fadeEl.style.opacity = 1; S.mode = 'title'; refreshTitle(); showScreen('title');
  };
  $('recordBtn1').onclick = () => openRecord('title');
  $('recordBtn2').onclick = () => openRecord('menu');
  $('recordBtn3').onclick = () => openRecord('ending');
  $('recordClose').onclick = () => showScreen(recordReturn);
  $('recordReset').onclick = () => {
    if (!confirm('발견한 이상 현상 기록을 모두 지울까요?')) return;
    found.clear(); cleared = false; store.set('found_v2', []); store.set('cleared_v2', false);
    openRecord(recordReturn);
  };
  const opts = { optSound: 'sound', optVoice: 'voice', optLow: 'low', optInvX: 'invertX', optInvY: 'invertY', optScare: 'scares' };
  Object.keys(opts).forEach(id => { $(id).checked = settings[opts[id]]; });
  SFX.setEnabled(settings.sound); SFX.setVoice(settings.voice);
  $('optSound').onchange = e => { settings.sound = e.target.checked; SFX.setEnabled(settings.sound); store.set('settings', settings); };
  $('optVoice').onchange = e => { settings.voice = e.target.checked; SFX.setVoice(settings.voice); store.set('settings', settings); };
  $('optLow').onchange = e => { settings.low = e.target.checked; applyPixelRatio(); applyLow(); store.set('settings', settings); };
  $('optScare').onchange = e => { settings.scares = e.target.checked; store.set('settings', settings); if (!settings.scares) { S.scareAt = null; S.blackout = 0; } };
  $('optInvX').onchange = e => { settings.invertX = e.target.checked; store.set('settings', settings); };
  $('optInvY').onchange = e => { settings.invertY = e.target.checked; store.set('settings', settings); };
  function applyLow() { $('grain').style.display = settings.low ? 'none' : 'block'; }
  applyLow();

  /* ---------- 시작 ---------- */
  function startGame(resume) {
    S.gameMode = settings.mode;
    SFX.init();
    if (window.speechSynthesis) try { speechSynthesis.getVoices(); } catch (e) {}
    S.startTime = performance.now();
    S.started = true;
    if (resume) {
      Object.assign(S, { streak: resume.streak, checkpoint: resume.checkpoint || 0, roomIdx: resume.roomIdx,
        history: resume.history || [], lastAnomalyId: resume.lastAnomalyId, mistakes: resume.mistakes || 0,
        foundThisRun: resume.foundThisRun || 0, elapsed: resume.elapsed || 0, firstGallery: false });
      S.anomaly = window.ANOMALIES.find(a => a.id === resume.anomaly && a.room === resume.roomIdx) || null;
      newGallery(true);
    } else {
      Object.assign(S, { streak: 0, checkpoint: 0, history: [], firstGallery: true, mistakes: 0, foundThisRun: 0, elapsed: 0 });
      newGallery();
    }
    showScreen(null);
    $('hud').classList.add('on');
    $('touch').classList.add('on');
    $('lookHint').style.display = isTouch ? '' : 'none';
    $('crosshair').style.display = isTouch ? 'none' : 'block';
    S.mode = 'play';
    fadeTo(0, 1600);
    setTimeout(() => showHint(isTouch ? '전시물을 눌러 자세히 볼 수 있습니다' : '전시물을 클릭하면 자세히 볼 수 있습니다', 4500), 1800);
  }
  $('startBtn').onclick = () => startGame(S.resumeData);
  function setTheme(t) {
    settings.theme = t; store.set('settings', settings);
    applyTheme(); refreshTitle();
    $('themeBtn').textContent = isBright() ? '🌙 으스스한 박물관으로 바꾸기' : '☀️ 밝은 박물관으로 바꾸기';
  }
  document.querySelectorAll('.theme-card').forEach(b => { b.onclick = () => setTheme(b.dataset.theme); });
  $('themeBtn').onclick = () => setTheme(isBright() ? 'dark' : 'bright');
  $('newBtn').onclick = () => { clearProgress(settings.mode); S.resumeData = null; startGame(null); };
  function setMode(id) {
    settings.mode = id; store.set('settings', settings);
    refreshTitle();
  }
  // 모드 고르기 단추 만들기
  (function buildModeButtons() {
    const grid = $('modeGrid');
    MODES.forEach(m => {
      const b = document.createElement('button');
      b.className = 'mode-card' + (m.room == null ? ' hard' : '');
      b.dataset.mode = m.id;
      b.innerHTML = m.room == null
        ? `<span class="badge">최고 난이도</span><b>🗝 ${m.name}</b><small>모든 시대가 무작위로 · 제16 전시실까지</small>`
        : `<b>${m.name}</b><small>제8 전시실까지</small>`;
      b.onclick = () => setMode(m.id);
      grid.appendChild(b);
    });
  })();
  $('againBtn').onclick = () => { fadeEl.style.opacity = 1; S.resumeData = null; startGame(null); };
  function refreshTitle() {
    const m = modeOf(settings.mode);
    S.resumeData = (!m || S.forced) ? null : loadProgress(m.id);
    const r = S.resumeData;
    document.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('sel', b.dataset.theme === settings.theme));
    document.querySelectorAll('.mode-card').forEach(b => {
      b.classList.toggle('sel', b.dataset.mode === settings.mode);
      b.classList.toggle('saved', !!loadProgress(b.dataset.mode));
    });
    $('goalText').textContent = m && m.room != null ? '제8 전시실' : '제16 전시실';
    $('checkInfo').textContent = `제${(m || MODES[0]).checks.join('·')} 전시실에서 중간 저장됩니다.`;
    $('modeInfo').textContent = !m ? '' : m.room != null
      ? `「${m.name}」 전시실만 나옵니다.`
      : '전시실마다 구석기 시대부터 고려까지 여러 시대가 무작위로 나옵니다.';
    $('startBtn').disabled = !S.ready || !settings.theme || !m;
    $('startBtn').textContent = !settings.theme ? '박물관 분위기를 먼저 고르세요'
      : !m ? '전시실을 먼저 고르세요'
      : r ? `이어서 하기 (제 ${r.streak} 전시실)` : '입장하기';
    $('newBtn').style.display = r ? '' : 'none';
  }

  $('controlsInfo').innerHTML = isTouch
    ? '▲ 걷기 · ▼ 뒷걸음 · » 뛰어서 이동하기(누른 채로 걷기) · ⟳ 90° 돌기<br>화면을 끌어서 둘러보기 · 전시물과 해설사를 눌러 자세히 보기'
    : 'W/↑ 걷기 · S/↓ 뒷걸음 · A/D/←/→ 둘러보기 · 마우스로 끌어서 둘러보기<br>Space 90° 돌기 · Shift 뛰기 · 클릭 자세히 보기 · Esc 메뉴';

  /* ---------- 매 프레임 ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode === 'title') { renderer.render(scene, camera); return; }

    const active = S.mode === 'play';
    // 뒤돌기 애니메이션
    if (S.turning > 0) {
      S.turning = Math.min(1, S.turning + dt / 0.35);
      const t = S.turning, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      S.yaw = S.turnFrom + (S.turnTo - S.turnFrom) * e;
      if (S.turning >= 1) S.turning = 0;
    }
    if (active) {
      if (keys.left) S.yaw += 1.8 * dt;
      if (keys.right) S.yaw -= 1.8 * dt;
    }
    // 바라보는 방향 쪽으로 복도를 따라 걷는다
    let moving = 0;
    if (active && S.turning === 0) {
      const facing = -Math.cos(S.yaw);              // -1: 앞(출구 쪽), +1: 뒤(입구 쪽)
      const dir = Math.abs(facing) < 0.2 ? 0 : Math.sign(facing);
      const input = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
      if (input && dir) {
        const speed = keys.run ? 4.2 : 2.5;
        S.z += dir * input * speed * dt;
        moving = keys.run ? 1.6 : 1;
      } else if (input && !dir) {
        showHint('복도 쪽을 바라보고 걸으세요', 1200);
      }
      const open = S.exitRoom || S.review || S.viewed.size >= MIN_VIEWS;
      if (!open && (S.z > -1.1 || S.z < -L + 1.1)) {
        S.z = Math.max(-L + 1.1, Math.min(-1.1, S.z));
        showHint(`전시물을 ${MIN_VIEWS}개 이상 자세히 봐야 문이 열립니다 (${S.viewed.size}/${MIN_VIEWS})`, 1800);
      }
      if (S.z > -0.25) { S.z = -0.25; exitGallery('back'); }
      else if (S.z < -L + 0.25) { S.z = -L + 0.25; exitGallery('forward'); }
    }
    // 흔들림 & 발소리
    if (moving) {
      S.bob += dt * 7.5 * moving;
      const sgn = Math.sign(Math.sin(S.bob));
      if (sgn !== S.lastStepSign) { S.lastStepSign = sgn; SFX.step(0.55, 1); }
    }
    const bobY = moving ? Math.abs(Math.sin(S.bob)) * 0.045 : 0;
    camera.position.set(Math.sin(S.bob * 0.5) * (moving ? 0.03 : 0), EYE + bobY, S.z);
    camera.rotation.y = S.yaw;
    camera.rotation.x = -S.pitch;
    lantern.position.set(0, 2.6, S.z - Math.cos(S.yaw) * 1.2);

    // 해설사: 시대마다 다른 방식으로 나타난다
    if (docent.visible && S.mode !== 'ending') updateDocent(dt, now, active);
    // 깜짝 효과, 시대별 장식·떠다니는 것 (깜짝 효과 중에는 더 세게)
    updateScare(dt);
    const boost = S.boost > 0 ? 4 : 1;
    if (eraDecor) eraDecor.update(dt * boost, now / 1000, S.z, S.boost > 0);
    if (eraParts) eraParts.update(dt * boost, now / 1000, S.z);

    // 힌트 등불 빛
    if (S.lampTarget) {
      const k = 0.5 + 0.5 * Math.sin(now / 450);
      const m = lampGlow[S.lampTarget].material;
      m.opacity = S.lampTarget === 'docent' ? 0.5 + 0.4 * k : (isBright() ? 0.14 : 0.08) + 0.12 * k;
    }

    // 모닥불
    if (fireFx) {
      fireFx.t += dt;
      fireFx.flames.forEach((f, i) => {
        const k = 0.85 + Math.sin(fireFx.t * (7 + i * 3)) * 0.12 + Math.random() * 0.08;
        f.scale.set(0.55 * k, 0.95 * k, 1);
      });
      fireLight.intensity = 1.6 + Math.sin(fireFx.t * 11) * 0.25 + Math.random() * 0.2;
    }

    // 조명 움직임: 시대마다 다르게 (가끔 깜빡 / 횃불 / 숨쉬기 / 맥박 / 촛불 / 고요 / 차례로)
    const fl = S.flicker || 'none', ts = now / 1000, pool = theme().pool;
    lamps.forEach((l, i) => {
      let k = 1;
      if (fl === 'normal') {
        if (l.flick > 0) { l.flick -= dt; k = Math.random() > 0.5 ? 1 : 0.1; if (l.flick <= 0) k = 1; }
        else if (Math.random() < dt * 0.05) { l.flick = 0.2 + Math.random() * 0.5; if (Math.abs(l.z - S.z) < 10) SFX.buzz(); }
      }
      if (fl === 'torch') k = 0.75 + Math.sin(ts * 9 + i * 2) * 0.12 + Math.random() * 0.13;
      if (fl === 'slow') k = 0.55 + 0.45 * Math.sin(ts * 0.6 + i * 0.4);
      if (fl === 'pulse') k = 0.6 + 0.4 * Math.pow(Math.max(0, Math.sin(ts * 1.6)), 3);
      if (fl === 'candle') k = 0.55 + Math.random() * 0.12;
      if (fl === 'sequence') { const head = -((ts * 6) % (L + 10)) + 2; k = Math.max(0.12, 1 - Math.abs(l.z - head) / 7); }
      if (blackoutOn()) k = 0.02;
      l.lampMat.color.copy(S.lampColor).multiplyScalar(k);
      l.pool.material.opacity = pool * k;
    });
    let lk = 1;
    if (fl === 'torch') lk = 0.85 + Math.random() * 0.2;
    if (fl === 'slow') lk = 0.8 + 0.2 * Math.sin(ts * 0.6);
    if (fl === 'normal' && Math.random() < 0.01) lk = 0.5;
    lantern.intensity = (S.lanternBase || 1) * (blackoutOn() ? 0.06 : lk);
    ambient.intensity = blackoutOn() ? 0.05 : (era() ? era().ambient[1] : theme().ambient[1]);

    renderer.render(scene, camera);
  }

  /* ---------- 화면 크기 / 탭 전환 ---------- */
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 85 : 72;
    camera.updateProjectionMatrix();
  });
  window.dispatchEvent(new Event('resize'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { SFX.suspend(); keys.fwd = keys.back = false; if (S.mode === 'play') openMenu(); }
    else SFX.resume();
  });

  /* ---------- 화면 잡음 ---------- */
  (function grainInit() {
    const g = document.createElement('canvas'); g.width = 160; g.height = 160;
    const ctx = g.getContext('2d'); const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    $('grain').style.backgroundImage = `url(${g.toDataURL()})`;
  })();

  /* ---------- 창 여러 개 막기 ----------
     새로 연 창이 "여기 있나요?"를 묻고, 이미 열린 창이 답하면 새 창에 안내를 띄운다.
     "이 창에서 계속하기"를 누르면 다른 창들이 멈추고 안내를 띄운다. */
  const tabId = Math.random().toString(36).slice(2);
  let blocked = false;
  const chan = (() => {
    if (window.BroadcastChannel) {
      const bc = new BroadcastChannel('mhm');
      return { send: m => bc.postMessage(m), on: f => { bc.onmessage = e => f(e.data); } };
    }
    // BroadcastChannel이 없는 옛 브라우저: localStorage 변경 알림으로 대신 주고받는다
    let handler = null;
    window.addEventListener('storage', e => { if (e.key === 'mhm_msg' && e.newValue && handler) handler(JSON.parse(e.newValue)); });
    return { send: m => { try { localStorage.setItem('mhm_msg', JSON.stringify(Object.assign({ t: Date.now() }, m))); } catch (er) {} }, on: f => { handler = f; } };
  })();
  function block(msg) {
    blocked = true;
    if (S.mode === 'play') { saveProgress(); openMenu(); }
    keys.fwd = keys.back = keys.run = false;
    SFX.suspend();
    $('dupeMsg').innerHTML = msg;
    $('dupe').classList.add('on');
  }
  chan.on(m => {
    if (!m || m.from === tabId) return;
    if (m.type === 'hello' && !blocked) chan.send({ type: 'here', from: tabId, to: m.from });
    if (m.type === 'here' && m.to === tabId) block('이 기기에서 이미 다른 창으로 게임을 하고 있습니다.<br>창이 여러 개면 기록이 꼬일 수 있으니 <b>이 창을 닫아 주세요.</b>');
    if (m.type === 'takeover') block('다른 창에서 게임을 이어서 하고 있습니다.<br><b>이 창은 닫아 주세요.</b>');
  });
  chan.send({ type: 'hello', from: tabId });
  $('dupeTake').onclick = () => {
    chan.send({ type: 'takeover', from: tabId });
    blocked = false;
    $('dupe').classList.remove('on');
    location.reload();   // 다른 창이 저장한 진행 상황을 다시 불러온다
  };

  /* ---------- 교사용 미리보기 ---------- */
  // ?room=번호  → 그 전시실부터 시작
  // ?test=이상현상ID (예: goryeo2.ce_white) → 그 전시실에서 그 이상 현상이 바로 나온다
  const params = new URLSearchParams(location.search);
  const roomParam = parseInt(params.get('room'), 10);
  if (roomParam >= 0 && roomParam < ROOMS.length) settings.mode = 'era' + roomParam;   // 그 시대 모드
  const testId = params.get('test');
  if (testId) {
    S.forced = window.ANOMALIES.find(a => a.id === testId || a.id.endsWith('.' + testId)) || null;
    if (S.forced) settings.mode = 'era' + S.forced.room;
  }
  S.gameMode = settings.mode || 'mystery';

  /* ---------- 불러오기 ---------- */
  function timeout(ms) { return new Promise(r => setTimeout(r, ms)); }
  async function boot() {
    try {
      if (document.fonts && document.fonts.load) {
        const text = ART.allText();
        await Promise.race([
          Promise.all([
            document.fonts.load(`700 40px "Noto Serif KR"`, text),
            document.fonts.load(`500 40px "Noto Serif KR"`, text),
            document.fonts.load(`700 40px "Noto Sans KR"`, text),
            document.fonts.load(`500 40px "Noto Sans KR"`, text)
          ]),
          timeout(5000)
        ]);
      }
    } catch (e) { /* 기본 글꼴 사용 */ }
    await Promise.race([ART.loadImages(), timeout(4000)]);
    buildMuseum();
    buildDocent();
    const forced = S.forced;
    S.streak = 0;
    newGallery();
    S.forced = forced;
    S.history = [];
    refreshTitle();
    camera.position.set(0, EYE, -2);
    $('loading').textContent = '';
    S.ready = true;
    if (settings.theme) setTheme(settings.theme); else refreshTitle();
    requestAnimationFrame(frame);
  }
  boot();

  window.MHM = {
    state: S,
    show(id) { S.anomaly = window.ANOMALIES.find(a => a.id === id) || null; setupRoom(); },
    goRoom(n) { S.forcedRoom = n; newGallery(); S.anomaly = null; setupRoom(); },
    tick(n) { for (let i = 0; i < (n || 1); i++) frame(last + 16.7); },   // 화면이 가려져도 몇 프레임 진행 (점검용)
    view(n) { room(); Object.keys(room().exhibits).slice(0, n).forEach(markViewed); }
  };
})();
