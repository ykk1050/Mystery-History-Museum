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
  // 시대별 전시실을 탈출하면 얻는 유물 모양 열쇠 조각 (9개를 모두 끼우면 미스터리 전시실이 열린다)
  const KEY_ART = ['handaxe', 'comb', 'mirror', 'dagger', 'crown', 'horsepot', 'censer', 'lantern', 'celadon'];
  const KEY_NAMES = ['주먹도끼', '빗살무늬 토기', '청동 거울', '비파형 동검', '금동관', '말 탄 무사 모양 토기', '발해 삼채 향로', '연등회 등불', '고려청자'];
  const LX = 300;        // 로비는 전시실과 멀리 떨어진 곳에 짓는다
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
  // 지금 게임에 있는 이상 현상만 센다 (내용을 바꾸어 없어진 이상 현상의 기록은 버림)
  const found = new Set(store.get('found_v2', []).filter(id => window.ANOMALIES.some(a => a.id === id)));
  store.set('found_v2', [...found]);
  let cleared = store.get('cleared_v2', false);
  const clearedModes = new Set(store.get('clearedModes', []));   // 탈출에 성공한 전시실(모드) id
  const keysIn = new Set(store.get('keysIn', []));               // 미스터리 전시실 입구에 끼운 열쇠 조각 (시대 번호)
  const hasKey = i => clearedModes.has('era' + i);
  const settings = Object.assign({ sound: true, voice: true, low: false, invertX: false, invertY: false, scares: true, theme: null, gender: null, mild: null }, store.get('settings', {}));

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
  let storeDoor = null;
  let lobby = null;          // 로비 (js/lobby.js)
  let doorLeaves = [], doorLeafMat = null;
  let guide = null, guideHit = null, guideTex = null;
  // 안내원이 나타날 수 있는 자리 (전시물·모형을 가리지 않는 벽 쪽). 전시실마다 무작위
  const GUIDE_SPOTS = [
    { x: 2.55, z: -5.8 },    // 입구 옆 '관계자 외 출입금지' 문 근처
    { x: 2.6, z: -13.5 },    // 오른쪽 벽, 첫 설명판들 사이
    { x: 2.6, z: -22.5 },    // 수장고 문 앞
    { x: 2.6, z: -31.5 },    // 오른쪽 벽 가운데
    { x: 2.6, z: -38.5 },    // 출구 쪽 오른쪽 벽
    { x: -2.6, z: -12 },     // 왼쪽 진열장 사이
    { x: -2.6, z: -36 },     // 왼쪽 진열장 사이 (안쪽)
    { x: 1.8, z: -46 }       // 출구 바로 앞
  ];
  const GUIDE = { x: 2.55, z: -5.8 };

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
      bright: { floor: tex(ART.floorTexBright(), 2, (L + 8) / 4), wall: tex(ART.wallTexBright(), L / 4, 1), docent: tex(ART.drawDocentBright()), docentMale: tex(ART.drawDocentBright(true)) }
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
      const door = addBox(0.08, 2.4, 1.2, doorMat, HW - 0.04, 1.2, z);
      if (label === '수장고') storeDoor = door;
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

    // 입구와 출구의 문짝: 전시물을 3개 이상 봐야 덜컹 하고 열린다 (경첩을 축으로 통로 쪽으로 젖혀짐)
    const leafMat = new THREE.MeshLambertMaterial({ map: tex(doorLeafCanvas()) });
    doorLeaves = [[0, 1], [-L, -1]].map(([z, dir]) => [-1, 1].map(side => {
      const pivot = new THREE.Group();
      pivot.position.set(side * dw / 2, 0, z);
      addBox(dw / 2 - 0.02, dh - 0.02, 0.07, leafMat, -side * (dw / 4), dh / 2, 0, pivot);
      scene.add(pivot);
      return { pivot, ang: side * dir * Math.PI / 2 * 0.96 };
    })).flat();
    doorLeafMat = leafMat;

    const sign = addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: signTex }), 0, 3.35, -6.5, 0);
    sign.userData.key = 'sign'; pickables.push(sign);
    addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('← 지나온 전시실', 'BACK', '#c9b48a')) }), 0, 3.35, -6.52, Math.PI);
    addBox(0.03, 0.5, 0.03, darkMat, -0.9, 3.95, -6.51);
    addBox(0.03, 0.5, 0.03, darkMat, 0.9, 3.95, -6.51);
  }

  // 나무 문짝 그림 (한 짝): 테두리 판, 쇠 장식, 손잡이
  function doorLeafCanvas() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 640;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, '#5a3c24'); g.addColorStop(0.5, '#6e4a2c'); g.addColorStop(1, '#4e3420');
    x.fillStyle = g; x.fillRect(0, 0, 256, 640);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '20,12,6' : '140,100,60'},0.12)`; x.fillRect(Math.random() * 256, Math.random() * 640, 2, 20 + Math.random() * 60); }
    x.strokeStyle = '#2e1e12'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 630);
    x.lineWidth = 6; x.strokeRect(36, 40, 184, 250); x.strokeRect(36, 340, 184, 260);
    x.fillStyle = '#2b2b2b'; [70, 570].forEach(y => x.fillRect(0, y, 256, 18));
    x.fillStyle = '#b08a4a'; x.beginPath(); x.arc(220, 320, 13, 0, 7); x.fill();
    return c;
  }
  // 로비로 데려다주는 귀신 안내원 (으스스한 박물관: 창백하고 눈이 텅 빈 모습 / 밝은 박물관: 순한 유령)
  function guideCanvas(bright) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const x = c.getContext('2d');
    const body = x.createLinearGradient(0, 80, 0, 512);
    body.addColorStop(0, bright ? 'rgba(235,245,255,0.95)' : 'rgba(200,215,225,0.85)'); body.addColorStop(1, 'rgba(200,215,225,0)');
    // 몸 (아래로 갈수록 흐려지는 제복)
    x.fillStyle = body;
    x.beginPath(); x.moveTo(78, 170); x.quadraticCurveTo(128, 150, 178, 170); x.lineTo(206, 500); x.quadraticCurveTo(128, 470, 50, 500); x.closePath(); x.fill();
    x.fillStyle = bright ? 'rgba(70,90,140,0.5)' : 'rgba(40,50,60,0.55)';
    x.fillRect(118, 175, 20, 220);                                      // 제복 가운데 단
    [205, 245, 285].forEach(y => { x.fillStyle = bright ? '#e8c060' : 'rgba(190,170,110,0.8)'; x.beginPath(); x.arc(128, y, 5, 0, 7); x.fill(); });
    // 머리
    x.fillStyle = bright ? 'rgba(245,250,255,0.98)' : 'rgba(215,225,232,0.9)';
    x.beginPath(); x.ellipse(128, 112, 44, 52, 0, 0, Math.PI * 2); x.fill();
    // 모자
    x.fillStyle = bright ? '#4a5a8a' : 'rgba(30,34,40,0.92)';
    x.fillRect(78, 58, 100, 22); x.beginPath(); x.ellipse(128, 60, 46, 18, 0, Math.PI, 0); x.fill();
    x.fillStyle = bright ? '#e8c060' : 'rgba(170,150,90,0.8)'; x.fillRect(118, 62, 20, 12);
    if (bright) {   // 순한 눈과 미소
      x.fillStyle = '#2d2a3a'; x.beginPath(); x.arc(110, 112, 6, 0, 7); x.arc(146, 112, 6, 0, 7); x.fill();
      x.strokeStyle = '#2d2a3a'; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 14, 0.2, Math.PI - 0.2); x.stroke();
      x.fillStyle = 'rgba(255,150,150,0.4)'; x.beginPath(); x.arc(96, 130, 8, 0, 7); x.arc(160, 130, 8, 0, 7); x.fill();
    } else {        // 텅 빈 검은 눈과 벌어진 입
      x.fillStyle = 'rgba(5,5,10,0.95)';
      x.beginPath(); x.ellipse(110, 110, 11, 15, 0.1, 0, 7); x.ellipse(146, 110, 11, 15, -0.1, 0, 7); x.fill();
      x.beginPath(); x.ellipse(128, 145, 9, 13, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,90,60,0.9)'; x.beginPath(); x.arc(110, 112, 2.5, 0, 7); x.arc(146, 112, 2.5, 0, 7); x.fill();
    }
    // 손에 든 등불
    const lg = x.createRadialGradient(196, 300, 4, 196, 300, 60);
    lg.addColorStop(0, bright ? 'rgba(255,240,190,0.95)' : 'rgba(150,220,255,0.9)'); lg.addColorStop(1, 'rgba(150,220,255,0)');
    x.fillStyle = lg; x.fillRect(136, 240, 120, 120);
    x.strokeStyle = bright ? '#7a6040' : 'rgba(60,60,60,0.9)'; x.lineWidth = 3; x.strokeRect(184, 284, 24, 32);
    x.beginPath(); x.moveTo(196, 284); x.lineTo(196, 262); x.lineTo(172, 236); x.stroke();
    return c;
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

  /* ---------- 귀신 안내원: 가까이 가면 "로비로 돌아가서, 잠깐 쉬고 싶나." / 누르면 로비로 ---------- */
  function buildGuide() {
    guideTex = { dark: tex(guideCanvas(false)), bright: tex(guideCanvas(true)) };
    guide = new THREE.Sprite(new THREE.SpriteMaterial({ map: guideTex.dark, transparent: true, depthWrite: false }));
    guide.scale.set(0.95, 1.9, 1);
    guide.position.set(GUIDE.x, 1.05, GUIDE.z);
    scene.add(guide);
    guideHit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    guideHit.position.set(GUIDE.x, 1.0, GUIDE.z);
    guideHit.userData.key = 'guide';
    scene.add(guideHit); pickables.push(guideHit);
  }
  const GUIDE_LINE = '로비로 돌아가서, 잠깐 쉬고 싶나.';
  // 전시실마다 다른 자리에 (바로 전과 같은 자리는 피함)
  function placeGuide() {
    if (!guide) return;
    let spot;
    do { spot = GUIDE_SPOTS[Math.floor(Math.random() * GUIDE_SPOTS.length)]; } while (spot.x === GUIDE.x && spot.z === GUIDE.z);
    GUIDE.x = spot.x; GUIDE.z = spot.z;
    guide.position.set(GUIDE.x, 1.05, GUIDE.z);
    guideHit.position.set(GUIDE.x, 1.0, GUIDE.z);
  }
  function updateGuide(dt, now) {
    const on = S.place === 'gallery' && !S.exitRoom;
    guide.visible = guideHit.visible = on;
    if (!on) return;
    const bright = isBright();
    guide.material.map = bright ? guideTex.bright : guideTex.dark;
    guide.position.y = 1.05 + Math.sin(now / 800) * 0.07;
    guide.material.opacity = bright ? 0.92 : 0.7 + Math.sin(now / 130) * 0.05 + (Math.random() < 0.02 ? -0.4 : 0);
    // 가까이 가면 전시실마다 한 번 말한다 (해설사가 말하는 중이면 말하기 줄에서 기다림)
    const near = Math.hypot(camera.position.x - GUIDE.x, camera.position.z - GUIDE.z) < 5;
    if (near && !S.guideSpoke && S.mode === 'play') {
      S.guideSpoke = true;
      showSubtitle(GUIDE_LINE, '— 안내원 —', (bright ? 'voice_bright/' : 'voice/') + 'guide.mp3');
    }
  }
  // 안내원을 누르면: 로비로 돌아갈지 묻는 창
  function askGuide() {
    S.mode = 'note'; keys.fwd = keys.back = keys.run = false;
    const card = $('noteCard');
    card.innerHTML = `<h2>${isBright() ? '👻 안내원' : '…안내원'}</h2>
      <p style="font-size:19px">로비로 돌아가시겠습니까?</p>
      <p style="font-size:14px;color:#6d5a3a">지금까지의 진행(제 ${S.streak} 전시실)은 저장되어, 로비에서 이 통로로 다시 들어가면 이어서 할 수 있어요.</p>
      <button class="btn" id="gYes">네</button>
      <button class="btn ghost" id="gNo" style="width:100%;margin-top:10px">아니요</button>`;
    $('note').classList.add('on');
    $('gYes').onclick = () => { $('note').classList.remove('on'); backToLobby(); };
    $('gNo').onclick = () => { $('note').classList.remove('on'); S.mode = 'play'; };
  }
  // 전시실에서 로비로 (진행 저장)
  function backToLobby() {
    stopTalk(); saveProgress(); S.started = false;
    showScreen(null); S.mode = 'trans'; SFX.whoosh();
    fadeTo(1, 500).then(() => goLobby(S.gameMode));
  }

  /* ---------- 전시실 문: 관람 3개 전에는 닫혀 있다가 덜컹 열린다 ---------- */
  const doorsShouldOpen = () => S.exitRoom || S.review || S.viewed.size >= MIN_VIEWS;
  function setDoors(open, animate) {
    S.doorTarget = open ? 1 : 0;
    if (!animate) S.doorK = S.doorTarget;
  }
  function updateDoors(dt) {
    const k0 = S.doorK || 0, tgt = S.doorTarget || 0;
    if (k0 === tgt) return;
    // 처음 0.15초는 덜컹 걸리듯 살짝 움직였다가 확 열린다
    S.doorT = (S.doorT || 0) + dt;
    let k = tgt > k0 ? Math.min(1, k0 + dt / 0.9) : Math.max(0, k0 - dt / 0.6);
    S.doorK = k;
    const ease = 1 - Math.pow(1 - k, 3);
    const jolt = S.doorT < 0.18 ? Math.sin(S.doorT * 80) * 0.03 : 0;
    doorLeaves.forEach(d => { d.pivot.rotation.y = d.ang * ease + jolt; });
    if (S.doorK === tgt) S.doorT = 0;
  }
  function applyDoors() { doorLeaves.forEach(d => { d.pivot.rotation.y = d.ang * (S.doorK || 0); }); }

  /* ---------- 게임 상태 ---------- */
  const S = {
    mode: 'title',          // title | play | inspect | note | menu | trans | ending | door | record
    place: 'lobby',         // lobby(로비) | gallery(전시실)
    lx: 0, lz: 10.6,        // 로비 안 위치
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
  const era = () => (!isBright() && !S.exitRoom && S.place !== 'lobby' && window.ERAS) ? ERAS.CONF[room().id] : null;
  // 로비는 조금 더 넓게 보이도록 안개·조명을 따로 둔다
  const LOBBY_THEME = {
    dark: { bg: 0x070504, fog: 0x070504, fogDensity: 0.03, ambient: [0x8a7a66, 0.5], lantern: [0xffd9a0, 0.9] },
    bright: { bg: 0xf2eadb, fog: 0xf2eadb, fogDensity: 0.006, ambient: [0xfff6e8, 0.95], lantern: [0xfff3dc, 0.35] }
  };
  function applyTheme() {
    const bright = isBright();
    const lob = S.place === 'lobby';
    const t = lob ? Object.assign({}, theme(), LOBBY_THEME[bright ? 'bright' : 'dark']) : theme();
    if (!texSet) return;
    const e = era();
    scene.background.setHex(e ? e.fog : t.bg);
    scene.fog.color.setHex(e ? e.fog : t.fog); scene.fog.density = e ? e.density : t.fogDensity;
    ambient.color.setHex(e ? e.ambient[0] : t.ambient[0]); ambient.intensity = e ? e.ambient[1] : t.ambient[1];
    S.ambientBase = ambient.intensity;
    lantern.color.setHex(e ? e.lantern[0] : t.lantern[0]);
    S.lanternBase = e ? e.lantern[1] : t.lantern[1];
    S.lampColor = new THREE.Color(e ? e.lamp : 0xffe7bf);
    S.flicker = lob ? 'none' : e ? e.flicker : (t.flicker ? 'normal' : 'none');
    if (lobby) lobby.setTheme(bright);
    const set = bright ? texSet.bright : texSet.dark;
    floorMat.map = set.floor; floorMat.needsUpdate = true;
    wallMat.map = set.wall; wallMat.needsUpdate = true;
    if (!S.exitRoom) wallMat.color.copy(wallTint(room().wall || 0xffffff));
    ceilMat.color.setHex(t.ceil); endMat.color.setHex(t.end);
    tunnelMat.color.setHex(t.tunnel); tunnelBackMat.color.setHex(t.tunnelBack);
    lamps.forEach(l => { l.flick = 0; l.lampMat.color.copy(S.lampColor); l.pool.material.opacity = t.pool; });
    washMat.opacity = t.wash;
    docent.material.map = e ? eraDocentTex(e.docent.look) : (bright && maleRoom() ? set.docentMale : set.docent); docent.material.needsUpdate = true;
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
  // 남자 목소리 시대인지 (밝은 박물관에서도 같은 시대 구분으로 해설사 모습을 고른다)
  function maleRoom() { const c = window.ERAS && !S.exitRoom ? ERAS.CONF[room().id] : null; return !!(c && c.voice === 'male'); }
  function eraDocentCanvas() {
    const e = era();
    if (e) return ERAS.docentCanvas(e.docent.look);
    return isBright() && maleRoom() ? ART.drawDocentBright(true) : null;
  }
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
    S.shake = 0.55;
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

  /* ---------- 은근한 공포 요소 (으스스한 박물관, 깜짝 효과 설정을 따름) ----------
     따라오는 발소리 / 수장고 문 두드림 / 먼 끝의 창백한 형체 / 어둠 속 빛나는 눈 / 해설사가 가까우면 심장 소리 */
  let farGhost = null, darkEyes = null;
  function creepSprite(draw, sx, sy) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; draw(c.getContext('2d'));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(sx, sy, 1); sp.visible = false; scene.add(sp);
    return sp;
  }
  function planCreeps() {
    const on = !!era() && settings.scares && !S.review;
    S.follow = on && Math.random() < 0.35;
    S.knockReady = on && Math.random() < 0.45;
    S.farReady = on && Math.random() < 0.35;
    S.eyesT = on ? 12 + Math.random() * 20 : Infinity;
    S.farT = 0; S.eyesShow = 0; S.doorShake = 0; S.heartT = 0;
    if (!farGhost) {
      farGhost = creepSprite(x => {   // 창백하고 흐릿한 사람 형체
        const g = x.createLinearGradient(0, 30, 0, 256); g.addColorStop(0, 'rgba(210,215,225,0.75)'); g.addColorStop(1, 'rgba(210,215,225,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(64, 50, 22, 28, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.moveTo(40, 84); x.lineTo(88, 84); x.lineTo(104, 256); x.lineTo(24, 256); x.fill();
        x.fillStyle = 'rgba(20,20,30,0.85)'; x.beginPath(); x.ellipse(56, 50, 5, 4, 0, 0, Math.PI * 2); x.ellipse(72, 50, 5, 4, 0, 0, Math.PI * 2); x.fill();
      }, 0.9, 1.9);
      darkEyes = creepSprite(x => {   // 어둠 속 두 눈
        [44, 84].forEach(cx => {
          const g = x.createRadialGradient(cx, 128, 1, cx, 128, 22); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.3, 'rgba(255,200,120,0.7)'); g.addColorStop(1, 'rgba(255,160,80,0)');
          x.fillStyle = g; x.fillRect(cx - 22, 106, 44, 44);
        });
      }, 0.5, 1.0);
    }
    farGhost.visible = false; darkEyes.visible = false;
    if (storeDoor) storeDoor.position.x = HW - 0.04;
  }
  function updateCreeps(dt, now) {
    if (!farGhost) return;
    const on = !!era() && settings.scares && S.mode === 'play';
    // 먼 끝 문간의 형체: 멀리서 앞을 볼 때 나타났다가, 다가가거나 시간이 지나면 사라짐
    if (on && S.farReady && S.z > -30 && -Math.cos(S.yaw) < -0.85) {
      S.farReady = false; S.farT = 4;
      farGhost.position.set((Math.random() - 0.5) * 1.2, 1.0, -L - 0.9); farGhost.visible = true;
    }
    if (farGhost.visible) {
      S.farT -= dt;
      farGhost.material.opacity = Math.min(0.85, S.farT * 0.6);
      if (S.farT <= 0 || S.z < -L + 26) farGhost.visible = false;
    }
    // 천장 구석 어둠 속에서 빛나는 두 눈 (깜빡이다 사라짐)
    if (on) S.eyesT -= dt;
    if (on && S.eyesT <= 0) {
      S.eyesT = 25 + Math.random() * 20; S.eyesShow = 2.4;
      const dir = -Math.cos(S.yaw) < 0 ? -1 : 1;
      const z = Math.max(-L + 2, Math.min(-2, S.z + dir * (7 + Math.random() * 5)));
      darkEyes.position.set((Math.random() < 0.5 ? -1 : 1) * (HW - 0.35), 3.7, z); darkEyes.visible = true;
    }
    if (darkEyes.visible) {
      S.eyesShow -= dt;
      const blink = (S.eyesShow > 1.1 && S.eyesShow < 1.25);
      darkEyes.material.opacity = blink ? 0 : Math.min(0.95, S.eyesShow * 1.5);
      if (S.eyesShow <= 0) darkEyes.visible = false;
    }
    // 수장고 문 앞을 지나면 안에서 두드리고 덜컹거림
    if (on && S.knockReady && Math.abs(S.z - (-22.5)) < 1.8) { S.knockReady = false; S.doorShake = 0.9; SFX.knock(); }
    if (storeDoor) {
      if (S.doorShake > 0) { S.doorShake -= dt; storeDoor.position.x = HW - 0.04 - Math.abs(Math.sin(now / 40)) * 0.025; }
      else storeDoor.position.x = HW - 0.04;
    }
    // 해설사가 아주 가까우면 심장 소리와 어두워지는 화면 가장자리
    const near = on && docent.visible && docent.material.opacity > 0.4 && Math.abs(S.docZ - S.z) < 3.5 && Math.abs(S.docX - camera.position.x) < 3;
    document.body.classList.toggle('tense', near);
    if (near) { S.heartT -= dt; if (S.heartT <= 0) { S.heartT = 0.85; SFX.heart(); } }
    if (S.shake > 0) S.shake -= dt;
  }

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
    planCreeps();
    S.review = false;
    resetHelp();
    setDoors(doorsShouldOpen(), false); applyDoors();
    S.guideSpoke = false;
    placeGuide();
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
      S.mode = 'trans'; SFX.whoosh(); stopTalk();
      fadeTo(1, 700).then(() => { newGallery(); setTimeout(() => { S.mode = 'play'; fadeTo(0, 900); }, 350); });
      return;
    }
    if (S.exitRoom && dir === 'forward') {
      S.mode = 'trans'; SFX.whoosh(); stopTalk();
      fadeTo(1, 900).then(showEnding);
      return;
    }
    if (dir === 'back' && !S.exitRoom) {
      // 되돌아갈 때는 어느 전시물이 이상했는지 근거를 고르게 한다
      S.mode = 'pick'; stopTalk();
      showPick(key => judge('back', key), () => { S.z = -1.4; S.mode = 'play'; });
      return;
    }
    judge(dir, null);
  }

  function judge(dir, picked) {
    S.mode = 'trans';
    SFX.whoosh(); stopTalk();
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
    const m = curMode(), newKey = m.room != null && !clearedModes.has(m.id);
    clearedModes.add(m.id); store.set('clearedModes', [...clearedModes]);
    // 시대별 전시실: 그 시대의 유물 모양 열쇠 조각
    $('endKey').innerHTML = m.room != null
      ? `<img src="${keyURL(m.room, 'gold')}" alt="">🗝 「${KEY_NAMES[m.room]}」 조각${newKey ? '을 얻었다! 가방에 넣어 두었다.' : '은 이미 가방에 있다.'}`
        + `<br><small style="font-size:14px">가진 조각 ${ROOMS.filter((r, i) => hasKey(i)).length} / 9 · 9개를 모두 모으면 로비 어딘가의 문이 열린다…</small>`
      : '최고 난이도 미스터리 전시실을 탈출했다!';
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
    closeBag();
    // 아직 탈출하지 못한 전시실이 남아 있으면 마지막으로 한 번 더 놀라게 한다
    if (!isBright() && !settings.mild && clearedModes.size < MODES.length) setTimeout(playMeetAgain, 2600);
  }

  // 갑자기 화면이 검어지고 빨간 글씨 "넌, 또 만나게 될 거야." + 쿵 소리와 낮은 목소리
  const meetVoice = new Audio('intro/meet_again.mp3?v=6');
  let meetPlaying = false;
  function playMeetAgain() {
    if (meetPlaying) return; meetPlaying = true;
    const el = $('meetAgain');
    el.classList.remove('out'); el.classList.add('on');
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      el.classList.add('out');
      setTimeout(() => { el.classList.remove('on', 'out'); meetPlaying = false; }, 1250);
    };
    if (settings.sound) {
      meetVoice.currentTime = 0;
      meetVoice.onended = () => setTimeout(end, 1500);
      meetVoice.play().catch(() => setTimeout(end, 3800));
    } else setTimeout(end, 3800);
    setTimeout(end, 7000);   // 혹시 소리가 끝나지 않아도 돌아오도록
  }

  /* ---------- 화면(스크린) ---------- */
  function showScreen(id) {
    ['menu', 'record', 'ending'].forEach(s => $(s).classList.toggle('on', s === id));
  }
  // 이상 현상 기록장: 로비의 게시판을 누르면 떠 있는 창으로 자세히 본다
  function openRecord() {
    S.mode = 'record'; keys.fwd = keys.back = false;
    const list = $('recordList');
    list.innerHTML = '';
    ROOMS.forEach((r, no) => {
      const got = r.anomalies.filter(a => found.has(a.id)).length;
      const h = document.createElement('div');
      h.className = 'roomhead';
      h.textContent = `전시관 ${no + 1} · ${r.name}  (${got} / ${r.anomalies.length})`;
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
  // left/right: 화살표(돌아보기) · a/d: A·D 키 (전시실에서는 돌아보기, 로비에서는 옆걸음) · sl/sr: 로비의 ◀ ▶ 단추
  const keys = { fwd: false, back: false, left: false, right: false, a: false, d: false, sl: false, sr: false, run: false };
  window.addEventListener('keydown', e => {
    if (blocked || document.querySelector('.flow.on, .pop.on')) return;
    if (S.mode === 'inspect' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); closeInspect(); return; }
    if (S.mode === 'play' && e.key === 'Escape') { openMenu(); return; }
    if (S.mode === 'menu' && e.key === 'Escape') { closeMenu(); return; }
    if (S.mode !== 'play') return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.fwd = true;
    if (k === 's' || k === 'arrowdown') keys.back = true;
    if (k === 'arrowleft') keys.left = true;
    if (k === 'arrowright') keys.right = true;
    if (k === 'a') keys.a = true;
    if (k === 'd') keys.d = true;
    if (k === 'shift') keys.run = true;
    if (k === ' ' || k === 'q') { e.preventDefault(); turnAround(); }
    if (k === 'e' || k === 'enter') { pickAt(0, 0, true); }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.fwd = false;
    if (k === 's' || k === 'arrowdown') keys.back = false;
    if (k === 'arrowleft') keys.left = false;
    if (k === 'arrowright') keys.right = false;
    if (k === 'a') keys.a = false;
    if (k === 'd') keys.d = false;
    if (k === 'shift') keys.run = false;
  });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => { keys[k] = false; }); });

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
  holdBtn($('tLeft'), () => { keys.sl = true; }, () => { keys.sl = false; });
  holdBtn($('tRight'), () => { keys.sr = true; }, () => { keys.sr = false; });
  holdBtn($('tRun'), () => { keys.run = true; }, () => { keys.run = false; });
  holdBtn($('tTurn'), () => { if (S.mode === 'play') turnAround(); });
  ['tFwd', 'tBack', 'tLeft', 'tRight', 'tRun', 'tTurn'].forEach(id => $(id).addEventListener('contextmenu', e => e.preventDefault()));

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
    if (h.object.userData.lobby) {
      if (h.distance > 12) { showHint('더 가까이 다가가세요…', 1600); return; }
      return lobbyPick(h.object.userData);
    }
    if (h.distance > (h.object.userData.key === 'docent' ? 9 : INSPECT_RANGE)) { showHint('더 가까이 다가가세요…', 1600); return; }
    const u = h.object.userData;
    if (u.key === 'docent') { markViewed('docent'); stopTalk(); SFX.voice(S.docVoice, S.docSpeech); return openInspect(ART.drawDocentCard(S.docSpeech, isBright(), eraDocentCanvas())); }
    if (u.key === 'guide') return askGuide();
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
  // 말하기 줄: 해설사·안내원·귀띔이 겹치면 앞의 말이 끝난 뒤에 다음 말이 (자막도 함께)
  const talkQ = [];
  let talkCur = null;
  function showSubtitle(text, who, voiceUrl) {
    if (!text) return;
    if ((talkCur && talkCur.text === text) || talkQ.some(q => q.text === text)) return;
    talkQ.push({ text, who, url: voiceUrl, doc: !who ? S.docVoice : null });
    if (!talkCur) nextTalk();
  }
  function nextTalk() {
    const t = talkQ.shift();
    talkCur = t || null;
    clearTimeout(subTimer);
    if (!t) { subTimer = setTimeout(hideSubtitle, 1500); return; }
    $('subWho').textContent = t.who || '— 해설사 —';
    $('subText').textContent = t.text;
    $('subtitle').classList.add('on');
    let fin = false;
    const done = () => { if (fin || talkCur !== t) return; fin = true; setTimeout(() => { if (talkCur === t) nextTalk(); }, 400); };
    if (t.url) SFX.voice(t.url, t.text, done); else if (t.who) SFX.speak(t.text, done); else SFX.voice(t.doc, t.text, done);
    setTimeout(done, 15000);   // 혹시 끝 알림이 오지 않아도 다음으로
  }
  function stopTalk() { talkQ.length = 0; talkCur = null; SFX.stopSpeak(); }

  /* ---------- 도움: 관람 수, 힌트 등불, 해설사의 귀띔, 정상 전시 다시 보기 ---------- */
  function exhibitName(ex, key) { return key === 'docent' ? '해설사의 말' : ex.title; }
  function markViewed(key) {
    if (!key || S.review) return;
    const wasOpen = doorsShouldOpen();
    S.viewed.add(key);
    updateHelpHud();
    // 3개째를 보는 순간 덜컹! 하고 입구와 출구가 열린다
    if (!wasOpen && doorsShouldOpen()) {
      SFX.clunk(); setDoors(true, true); S.shake = 0.25;
      setTimeout(() => showHint('덜컹… 입구와 출구의 문이 열렸다', 3000), 400);
    }
  }
  function resetHelp() {
    S.viewed = new Set();
    S.helped = false; S.lampTarget = null;
    Object.values(lampGlow).forEach(m => { m.visible = false; });
  }
  function updateHelpHud() {
    const playing = S.place === 'gallery' && !S.exitRoom && !S.review;
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
    setDoors(true, false); applyDoors();
    setupRoom();
    signTex.image = ART.drawSign(S.streak, room().name + ' · 정상 전시', false); signTex.needsUpdate = true;
    S.z = -2; S.yaw = 0; S.pitch = 0; S.turning = 0;
    applyTheme();
    resetDocent();
    planScare();
    planCreeps();
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
    $('quitBtn').style.display = S.place === 'gallery' ? '' : 'none';
    showScreen('menu');
  }
  function closeMenu() { showScreen(null); S.mode = 'play'; }
  $('menuBtn').onclick = openMenu;
  $('resumeBtn').onclick = closeMenu;
  // 전시실에서 로비로 나가기 (지금까지 진행은 저장되어 통로로 다시 들어가면 이어서 할 수 있다)
  $('quitBtn').onclick = backToLobby;
  $('recordClose').onclick = () => { showScreen(null); S.mode = 'play'; };
  $('recordReset').onclick = () => {
    if (!confirm('발견한 이상 현상 기록과 탈출 기록, 열쇠 조각을 모두 지울까요?')) return;
    found.clear(); cleared = false; store.set('found_v2', []); store.set('cleared_v2', false);
    clearedModes.clear(); store.set('clearedModes', []);
    keysIn.clear(); store.set('keysIn', []);
    lobbyRefresh();
    openRecord();
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
    S.place = 'gallery'; S.entering = false;
    document.body.classList.remove('in-lobby'); keys.sl = keys.sr = false;
    closeBag();
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
  function setTheme(t) {
    settings.theme = t; store.set('settings', settings);
    applyTheme();
    $('themeBtn').textContent = isBright() ? '🌙 으스스한 박물관으로 바꾸기' : '☀️ 밝은 박물관으로 바꾸기';
    document.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('sel', b.dataset.theme === settings.theme));
    renderBag();
  }
  $('themeBtn').onclick = () => setTheme(isBright() ? 'dark' : 'bright');
  $('againBtn').onclick = () => { fadeEl.style.opacity = 1; startGame(null); };
  $('lobbyBtn').onclick = () => { fadeEl.style.opacity = 1; goLobby(S.gameMode); };

  $('controlsInfo').innerHTML = isTouch
    ? '▲ 걷기 · ▼ 뒷걸음 · (로비) ◀ ▶ 옆으로 걷기 · » 뛰어서 이동하기(누른 채로 걷기) · ⟳ 90° 돌기<br>화면을 끌어서 둘러보기 · 전시물과 해설사를 눌러 자세히 보기 · 🎒 가방 · ⚙ 설정'
    : 'W/↑ 걷기 · S/↓ 뒷걸음 · A/D/←/→ 둘러보기 · 마우스로 끌어서 둘러보기 (로비에서는 A/D 옆으로 걷기)<br>Space 90° 돌기 · Shift 뛰기 · 클릭 자세히 보기 · 🎒 가방 · ⚙ 설정(Esc)';

  /* ---------- 로비 ---------- */
  const keyURLCache = {};
  function keyURL(i, kind) {
    const k = i + kind;
    return keyURLCache[k] || (keyURLCache[k] = ART.drawKeyPiece(KEY_ART[i], 160, kind).toDataURL());
  }
  function lobbyState() {
    return {
      cleared: ROOMS.map((r, i) => hasKey(i)),
      saved: ROOMS.map((r, i) => { const p = loadProgress('era' + i); return p ? p.streak : 0; }),
      keys: keysIn, open: keysIn.size >= KEY_ART.length,
      rooms: ROOMS.map(r => [r.anomalies.filter(a => found.has(a.id)).length, r.anomalies.length]),
      total: [found.size, window.ANOMALIES.length]
    };
  }
  function lobbyRefresh() { if (lobby) lobby.refresh(lobbyState()); renderBag(); }
  // 로비로: 처음이면 정문 앞, 전시실에서 돌아오면 그 통로 앞에 선다
  function goLobby(fromMode) {
    const m = modeOf(fromMode);
    const sp = lobby.spawn(m ? (m.room != null ? m.room : 'mystery') : null);
    S.place = 'lobby'; S.started = false; S.entering = false; S.review = false;
    document.body.classList.add('in-lobby');
    S.lx = sp.x; S.lz = sp.z; S.yaw = sp.yaw; S.pitch = 0; S.turning = 0;
    S.scareAt = null; S.blackout = 0; S.boost = 0; S.shake = 0;
    if (ghost) ghost.visible = false;
    if (farGhost) { farGhost.visible = false; darkEyes.visible = false; }
    docent.visible = false; docentHit.visible = false; docentGlow.intensity = 0;
    document.body.classList.remove('tense');
    hideSubtitle(); stopTalk();
    lobbyRefresh(); applyTheme(); updateHelpHud();
    showScreen(null);
    $('hud').classList.add('on'); $('touch').classList.add('on');
    $('lookHint').style.display = isTouch ? '' : 'none';
    $('crosshair').style.display = isTouch ? 'none' : 'block';
    S.mode = 'play';
    fadeTo(0, 1000);
  }
  // 통로·문으로 들어가기: 저장된 진행이 있으면 이어서 할지 묻는다
  function enterMode(id) {
    const m = modeOf(id); if (!m) return;
    settings.mode = id; store.set('settings', settings);
    keys.fwd = keys.back = keys.run = false;
    const go = resume => { S.mode = 'trans'; SFX.whoosh(); fadeTo(1, 700).then(() => startGame(resume)); };
    const p = loadProgress(id);
    if (!p || !p.streak) return go(null);
    S.mode = 'note';
    const card = $('noteCard');
    card.innerHTML = `<h2>${m.name}</h2>
      <p>제 ${p.streak} 전시실까지 진행한 기록이 있어요.</p>
      <button class="btn" id="rsCont">이어서 하기 (제 ${p.streak} 전시실)</button>
      <button class="btn ghost" id="rsNew" style="width:100%;margin-top:10px">처음부터 하기</button>
      <button class="btn ghost" id="rsStay" style="width:100%;margin-top:8px">← 로비에 남기</button>`;
    $('note').classList.add('on');
    const close = () => $('note').classList.remove('on');
    $('rsCont').onclick = () => { close(); go(p); };
    $('rsNew').onclick = () => { close(); clearProgress(id); lobbyRefresh(); go(null); };
    $('rsStay').onclick = () => {
      close();
      const sp = lobby.spawn(m.room != null ? m.room : 'mystery');
      S.lx = sp.x; S.lz = sp.z; S.yaw = sp.yaw; S.entering = false; S.mode = 'play';
    };
  }
  function lobbyPick(u) {
    if (u.lobby === 'board') return openRecord();
    if (u.lobby === 'map') return openInspect(lobby.mapCanvas());
    if (u.lobby === 'sign') return openInspect(lobby.signCanvas(u.idx));
    if (u.lobby === 'door') { if (keysIn.size < KEY_ART.length) SFX.chain(); return openDoor(); }
    if (u.lobby === 'stair') return showHint('🚧 2층 전시실은 아직 공사 중이에요', 2600);
    if (u.lobby === 'entrance') return SFX.chain(), showHint(isBright() ? '정문은 지금 닫혀 있어요. 통로로 들어가 전시실을 둘러보세요!' : '문이 굳게 잠겨 있다… 돌아갈 수 없다.', 3000);
  }
  // 로비에서 걷기: 바라보는 쪽으로 자유롭게 (벽·기둥·계단에 막힌다)
  function lobbyMove(dt, active) {
    let moving = 0;
    if (!active || S.turning !== 0) return 0;
    const fwd = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
    const side = ((keys.d || keys.sr) ? 1 : 0) - ((keys.a || keys.sl) ? 1 : 0);   // 오른쪽 +
    const input = fwd || side;
    let x = S.lx, z = S.lz;
    if (input) {
      const speed = keys.run ? 4.6 : 2.8, k = fwd && side ? Math.SQRT1_2 : 1;   // 대각선도 같은 빠르기
      const sn = Math.sin(S.yaw), cs = Math.cos(S.yaw);
      x += (-sn * fwd + cs * side) * k * speed * dt;
      z += (-cs * fwd - sn * side) * k * speed * dt;
      moving = keys.run ? 1.6 : 1;
    }
    const r = lobby.collide(x, z);
    S.lx = r.x; S.lz = r.z;
    S.touchCool = Math.max(0, (S.touchCool || 0) - dt);
    S.chainCool = Math.max(0, (S.chainCool || 0) - dt);
    if (r.touch && r.touch !== 'stair' && input && !S.chainCool) { S.chainCool = 1.5; SFX.chain(); }
    if (r.touch && input && !S.touchCool) {
      S.touchCool = 3;
      showHint(r.touch === 'stair' ? '🚧 2층 전시실은 아직 공사 중이에요'
        : r.touch === 'entrance' ? (isBright() ? '정문은 쇠사슬로 잠겨 있어요. 통로로 들어가 전시실을 둘러보세요!' : '쇠사슬이 철컹거린다… 돌아갈 수 없다.')
        : `🗝 쇠사슬로 잠긴 문… 열쇠 조각 ${keysIn.size} / 9 (문을 눌러 보세요)`, 2600);
    }
    if (r.enter != null && !S.entering) {
      S.entering = true;
      enterMode(r.enter === 'mystery' ? 'mystery' : 'era' + r.enter);
    }
    return moving;
  }

  /* ---------- 가방과 열쇠 조각 ---------- */
  let bagOpen = false;
  function renderBag() {
    if (!$('bagGrid')) return;
    const have = ROOMS.filter((r, i) => hasKey(i)).length;
    $('bagCount').textContent = `열쇠 조각 ${have} / 9 · 입구에 끼운 조각 ${keysIn.size} / 9`;
    $('bagGrid').innerHTML = ROOMS.map((r, i) => {
      const got = hasKey(i), used = keysIn.has(i);
      const cls = got && !used ? 'kcell piece' : used ? 'kcell used' : 'kcell';
      return `<div class="${cls}" data-i="${i}"><img src="${keyURL(i, got ? 'gold' : 'locked')}" alt="">
        <b>${got ? KEY_NAMES[i] : '???'}</b><small>${used ? '입구에 끼움' : r.name}</small></div>`;
    }).join('');
    $('bagTip').textContent = S.place === 'lobby'
      ? (have > keysIn.size ? '조각을 끌어서 로비 구석의 미스터리 전시실 입구에 끼워 보세요.' : '시대별 전시실을 탈출하면 그 시대의 유물 모양 열쇠 조각을 얻어요.')
      : '열쇠 조각은 로비에 있는 미스터리 전시실 입구에 끼울 수 있어요.';
    bindPieces($('bagGrid'));
  }
  function openBag() { bagOpen = true; renderBag(); $('bag').classList.add('on'); document.body.classList.add('bag-open'); keys.fwd = keys.back = false; }
  function closeBag() { bagOpen = false; $('bag').classList.remove('on'); document.body.classList.remove('bag-open'); }
  $('bagBtn').onclick = () => { if (S.mode !== 'play') return; bagOpen ? closeBag() : openBag(); };
  $('bagClose').onclick = closeBag;

  // 조각 끌기: 열쇠판의 홈이나, 로비 화면 속 입구 위에 놓으면 끼워진다
  let drag = null;
  function bindPieces(root) {
    root.querySelectorAll('.piece').forEach(el => {
      el.onpointerdown = e => {
        e.preventDefault(); e.stopPropagation();
        const i = +el.dataset.i;
        drag = { i, x0: e.clientX, y0: e.clientY, moved: 0 };
        const g = $('dragGhost'); g.src = keyURL(i, 'gold'); g.style.display = 'block';
        moveGhost(e.clientX, e.clientY);
      };
    });
  }
  function moveGhost(x, y) { $('dragGhost').style.left = x + 'px'; $('dragGhost').style.top = y + 'px'; }
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    moveGhost(e.clientX, e.clientY);
    document.querySelectorAll('.hole.hot').forEach(h => h.classList.remove('hot'));
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const hole = el && el.closest && el.closest('.hole:not(.filled)');
    if (hole) hole.classList.add('hot');
  });
  window.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null;
    $('dragGhost').style.display = 'none';
    document.querySelectorAll('.hole.hot').forEach(h => h.classList.remove('hot'));
    if (d.moved < 8) { showHint(`「${KEY_NAMES[d.i]}」 열쇠 조각 · ${ROOMS[d.i].name} 전시실을 탈출해 얻었다`, 2600); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const hole = el && el.closest && el.closest('.hole');
    if (hole) return tryInsert(d.i, +hole.dataset.i, hole);
    if (el === canvasEl) return dropOnWorld(d.i, e.clientX, e.clientY);
  });
  window.addEventListener('pointercancel', () => { if (drag) { drag = null; $('dragGhost').style.display = 'none'; } });
  function dropOnWorld(i, x, y) {
    if (S.place !== 'lobby') return showHint('열쇠 조각은 로비에 있는 미스터리 전시실 입구에 끼울 수 있어요', 2600);
    const h = rayAt(x, y);
    if (!h || h.object.userData.lobby !== 'door') return showHint('여기에는 끼울 수 없어요. 로비 구석 어딘가의 수상한 문을 찾아보세요…', 2800);
    if (h.distance > 10) return showHint('문에 더 가까이 다가가서 끼우세요', 2000);
    // 문 그림에서 놓은 자리에 가장 가까운 홈 (문 그림: 512×720)
    if (!h.uv || h.object.geometry.parameters.height < 3) return showHint('문에 파인 홈 위에 놓아 보세요', 2000);
    const px = h.uv.x * 512, py = (1 - h.uv.y) * 720;
    for (let k = 0; k < KEY_ART.length; k++) {
      const [hx, hy] = lobby.holePos(k);
      if (Math.abs(px - hx) < 75 && Math.abs(py - hy) < 72) return tryInsert(i, k);
    }
    showHint('조각과 같은 모양의 홈 위에 놓아 보세요', 2200);
  }
  function tryInsert(i, holeIdx, holeEl) {
    if (keysIn.has(holeIdx)) return;
    if (i !== holeIdx) {
      SFX.wrong();
      if (holeEl) { holeEl.classList.remove('bad'); void holeEl.offsetWidth; holeEl.classList.add('bad'); }
      return showHint('모양이 맞지 않아요! 조각과 같은 모양의 홈을 찾아보세요', 2400);
    }
    keysIn.add(i); store.set('keysIn', [...keysIn]);
    SFX.chime();
    lobbyRefresh();
    if ($('doorPop').classList.contains('on')) renderDoor();
    if (keysIn.size >= KEY_ART.length) {
      SFX.clunk(); setTimeout(() => SFX.exitBell(), 900);
      showHint('🗝 아홉 개의 조각이 모두 맞춰졌다… 미스터리 전시실의 문이 열렸다!', 4500);
    } else showHint(`「${KEY_NAMES[i]}」 조각을 끼웠다 (${keysIn.size} / 9)`, 2600);
  }
  // 입구 열쇠판: 문을 누르면 가까이에서 홈과 가방 속 조각을 본다
  function renderDoor() {
    const open = keysIn.size >= KEY_ART.length;
    $('doorTitle').textContent = open ? '🗝 최고 난이도 미스터리 전시실' : '??? 굳게 닫힌 문';
    $('doorMsg').innerHTML = open
      ? '문이 열렸다. 모든 시대가 무작위로 나오는 <b>제16 전시실</b>까지 이어진다…'
      : '“아홉 시대의 유물을 모두 바쳐라.”<br>시대별 전시실을 탈출해 얻은 열쇠 조각을 같은 모양의 홈에 끌어다 끼우세요.';
    $('doorBoard').innerHTML = ROOMS.map((r, i) => {
      const f = keysIn.has(i);
      return `<div class="hole${f ? ' filled' : ''}" data-i="${i}"><img src="${keyURL(i, f ? 'gold' : 'hole')}" alt=""><span>${f ? LOBBY.SHORT[i] : ''}</span></div>`;
    }).join('');
    const tray = ROOMS.map((r, i) => i).filter(i => hasKey(i) && !keysIn.has(i));
    $('doorTray').innerHTML = tray.length
      ? tray.map(i => `<div class="kcell piece" data-i="${i}"><img src="${keyURL(i, 'gold')}" alt=""><small>${KEY_NAMES[i]}</small></div>`).join('')
      : `<div class="empty">${open ? '모든 조각을 끼웠어요.' : `끼울 조각이 없어요. 시대별 전시실을 탈출하면 열쇠 조각을 얻어요. (${keysIn.size} / 9)`}</div>`;
    bindPieces($('doorTray'));
    $('doorEnter').style.display = open ? '' : 'none';
  }
  function openDoor() {
    S.mode = 'door'; keys.fwd = keys.back = false;
    closeBag(); renderDoor();
    $('doorPop').classList.add('on');
  }
  function closeDoor() { $('doorPop').classList.remove('on'); S.mode = 'play'; }
  $('doorClose').onclick = closeDoor;
  $('doorEnter').onclick = () => { $('doorPop').classList.remove('on'); enterMode('mystery'); };

  /* ---------- 처음 들어올 때: 규칙 안내 창 → 분위기 고르기 → 로비 ---------- */
  function showRules() {
    S.mode = 'title';
    fadeTo(0, 1200);
    $('rulesPop').classList.add('on');
  }
  $('rulesOk').onclick = () => {
    $('rulesPop').classList.remove('on');
    document.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('sel', b.dataset.theme === settings.theme));
    $('themePop').classList.add('on');
  };
  document.querySelectorAll('#themePop .theme-card').forEach(b => {
    b.onclick = () => {
      setTheme(b.dataset.theme);
      $('themePop').classList.remove('on');
      SFX.init();
      fadeTo(1, 500).then(() => {
        goLobby(null);
        setTimeout(() => showHint('통로로 걸어 들어가면 그 시대의 전시실로 이동해요', 5000), 1200);
      });
    };
  });

  /* ---------- 매 프레임 ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode === 'title') {
      // 처음 안내 창 뒤로 로비가 천천히 돌아 보인다
      if (S.place === 'lobby' && lobby) {
        S.yaw += dt * 0.05;
        camera.position.set(LX + S.lx, EYE, S.lz); camera.rotation.set(-0.04, S.yaw, 0);
        lantern.position.set(LX + S.lx, 2.6, S.lz);
        lobby.update(dt, now / 1000);
      }
      renderer.render(scene, camera); return;
    }

    const active = S.mode === 'play';
    // 뒤돌기 애니메이션
    if (S.turning > 0) {
      S.turning = Math.min(1, S.turning + dt / 0.35);
      const t = S.turning, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      S.yaw = S.turnFrom + (S.turnTo - S.turnFrom) * e;
      if (S.turning >= 1) S.turning = 0;
    }
    if (active) {
      const inL = S.place === 'lobby';
      if (keys.left || (!inL && keys.a)) S.yaw += 1.8 * dt;
      if (keys.right || (!inL && keys.d)) S.yaw -= 1.8 * dt;
    }
    // 바라보는 방향 쪽으로 복도를 따라 걷는다
    let moving = 0;
    const inLobby = S.place === 'lobby';
    if (inLobby) moving = lobbyMove(dt, active);
    else if (active && S.turning === 0) {
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
        // 닫힌 문을 밀면 덜그럭
        if (!S.rattleT || performance.now() - S.rattleT > 900) { S.rattleT = performance.now(); SFX.rattle(); }
        showHint(`전시물을 ${MIN_VIEWS}개 이상 자세히 봐야 문이 열립니다 (${S.viewed.size}/${MIN_VIEWS})`, 1800);
      }
      if (S.z > -0.25) { S.z = -0.25; exitGallery('back'); }
      else if (S.z < -L + 0.25) { S.z = -L + 0.25; exitGallery('forward'); }
    }
    // 흔들림 & 발소리
    if (moving) {
      S.bob += dt * 7.5 * moving;
      const sgn = Math.sign(Math.sin(S.bob));
      if (sgn !== S.lastStepSign) {
        S.lastStepSign = sgn; SFX.step(0.55, 1);
        // 뒤에서 한 박자 늦게 따라오는 발소리 (내가 멈추면 같이 멈춤)
        if (S.follow && era() && settings.scares) setTimeout(() => { if (S.mode === 'play') SFX.step(0.24, 0.82); }, 330);
      }
    }
    const bobY = moving ? Math.abs(Math.sin(S.bob)) * 0.045 : 0;
    const sway = Math.sin(S.bob * 0.5) * (moving ? 0.03 : 0);
    camera.rotation.set(-S.pitch, S.yaw, 0);
    if (inLobby) {
      camera.position.set(LX + S.lx + sway * Math.cos(S.yaw), EYE + bobY, S.lz - sway * Math.sin(S.yaw));
      lantern.position.set(LX + S.lx - Math.sin(S.yaw) * 1.2, 2.6, S.lz - Math.cos(S.yaw) * 1.2);
      lobby.update(dt, now / 1000);
      lantern.intensity = S.lanternBase || 1;
      ambient.intensity = S.ambientBase;
      renderer.render(scene, camera);
      return;
    }
    camera.position.set(sway, EYE + bobY, S.z);
    if (S.shake > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.05, 0));
    lantern.position.set(0, 2.6, S.z - Math.cos(S.yaw) * 1.2);

    updateDoors(dt);
    updateGuide(dt, now);
    // 해설사: 시대마다 다른 방식으로 나타난다
    if (docent.visible && S.mode !== 'ending') updateDocent(dt, now, active);
    // 깜짝 효과, 시대별 장식·떠다니는 것 (깜짝 효과 중에는 더 세게)
    updateScare(dt);
    updateCreeps(dt, now);
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
    ambient.intensity = blackoutOn() ? 0.05 : S.ambientBase;

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

  /* ---------- 처음 흐름: 성별 고르기 → 인트로 영상 → 타이틀 화면 → 시작 화면 ----------
     인트로를 처음 볼 때는 조작하면 "건너뛸까요?"를 묻고, 그다음부터는 아무 조작이나 하면 바로 넘어간다. */
  const flowOn = id => ['gender', 'fear', 'intro', 'splash'].forEach(f => $(f).classList.toggle('on', f === id));
  // 순한 맛: 인트로 끝의 무서운 장면(쿵·암전·빨간 글씨·"너, 돌아갈 수 없어.")을 빼고 영상만 본다
  function setMild(on) {
    settings.mild = !!on; store.set('settings', settings);
    document.querySelectorAll('.optMild').forEach(c => { c.checked = !!on; });
  }
  document.querySelectorAll('.optMild').forEach(c => { c.onchange = () => setMild(c.checked); });
  // 처음 접속 질문: "무서운 것을 보면 많이 힘든가요?" → 예(순한 맛) / 아니오, 고른 뒤 확인
  let fearPick = null;
  function askFear() {
    fearPick = null;
    document.querySelectorAll('.f-card').forEach(b => b.classList.remove('sel'));
    $('fearOk').disabled = true;
    showScreen(null); flowOn('fear');
  }
  document.querySelectorAll('.f-card').forEach(b => {
    b.onclick = () => {
      fearPick = b.dataset.mild === '1';
      document.querySelectorAll('.f-card').forEach(x => x.classList.toggle('sel', x === b));
      $('fearOk').disabled = false;
    };
  });
  $('fearOk').onclick = () => { if (fearPick == null) return; setMild(fearPick); SFX.init(); playIntro(true); };
  function setGender(g) {
    settings.gender = g; store.set('settings', settings);
    document.querySelectorAll('.p-btn').forEach(b => b.classList.toggle('sel', b.dataset.g === g));
  }
  document.querySelectorAll('.p-btn').forEach(b => { b.onclick = () => setGender(b.dataset.g); });
  document.querySelectorAll('#gender .g-card').forEach(b => {
    b.onclick = () => { setGender(b.dataset.g); SFX.init(); if (settings.mild == null) askFear(); else playIntro(true); };
  });
  // 설정에서 인트로 다시 보기: 다 보면(또는 건너뛰면) 타이틀 화면을 거쳐 설정 창으로 돌아온다
  let afterSplash = null;
  $('replayIntro').onclick = () => { afterSplash = () => showScreen('menu'); SFX.init(); playIntro(true); };

  let introDone = null, introInput = null;
  function playIntro(fromGesture) {
    const v = $('introVideo');
    const firstTime = !store.get('introSeen', false);
    showScreen(null); flowOn('intro');
    $('introTrapped').classList.remove('on');
    $('skipAsk').classList.remove('on');
    $('introHint').style.display = firstTime ? 'none' : 'block';
    $('introUnmute').style.display = 'none';
    v.src = 'intro/intro_' + (settings.gender === 'female' ? 'female' : 'male') + '.mp4?v=1';
    v.currentTime = 0; v.muted = !settings.sound;
    let trapped = false, finished = false;
    const trappedVoice = new Audio('intro/trapped.mp3?v=5');   // 쿵 소리 + "너, 돌아갈 수 없어." (한 파일이라 어긋나지 않음)
    const finish = () => {
      if (finished) return; finished = true;
      store.set('introSeen', true);
      v.pause(); trappedVoice.pause();
      removeEventListener('keydown', introInput, true);
      $('intro').removeEventListener('click', introInput, true);
      showSplash();
    };
    introDone = finish;
    // 끝부분: 쿵! 화면이 모두 검게 → 빨간 글씨 "너, 돌아갈 수 없어." 와 음성
    const trap = () => {
      if (trapped) return; trapped = true;
      v.pause();
      $('introTrapped').classList.add('on');
      $('introHint').style.display = 'none'; $('introUnmute').style.display = 'none'; $('skipAsk').classList.remove('on');
      if (settings.sound) {
        trappedVoice.currentTime = 0;
        trappedVoice.onended = () => setTimeout(finish, 1300);
        trappedVoice.play().catch(() => setTimeout(finish, 3800));
      } else setTimeout(finish, 3800);
      setTimeout(finish, 7000);   // 혹시 소리가 끝나지 않아도 넘어가도록
    };
    if (settings.mild) {
      v.ontimeupdate = null;
      v.onended = () => setTimeout(finish, 600);
    } else {
      v.ontimeupdate = () => { if (v.duration && v.currentTime >= v.duration - 0.6) trap(); };
      v.onended = trap;
    }
    // 조작: 소리가 막혀 있으면 먼저 소리를 켜고, 처음 보는 중이면 건너뛸지 묻고, 아니면 바로 넘어간다
    introInput = e => {
      if (e.target && e.target.closest && e.target.closest('#skipAsk .btn')) return;
      e.preventDefault();
      if (v.muted && settings.sound && $('introUnmute').style.display !== 'none') {
        v.muted = false; $('introUnmute').style.display = 'none'; SFX.init();
        // 그래도 브라우저가 막으면 소리 없이 계속 보여 준다
        const pp = v.play();
        if (pp && pp.catch) pp.catch(() => { v.muted = true; v.play().catch(() => {}); $('introUnmute').style.display = 'block'; });
        return;
      }
      // 어떤 이유로든 영상이 멈춰 있으면 먼저 다시 재생
      if (v.paused && !trapped && !finished && !v.ended) {
        v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
        return;
      }
      if (store.get('introSeen', false)) finish();
      else $('skipAsk').classList.add('on');
    };
    setTimeout(() => {
      addEventListener('keydown', introInput, true);
      $('intro').addEventListener('click', introInput, true);
    }, 300);
    const p = v.play();
    if (p && p.catch) p.catch(() => {   // 브라우저가 소리 나는 자동 재생을 막으면 소리 없이 시작
      v.muted = true; v.play().catch(() => finish());
      if (settings.sound) $('introUnmute').style.display = 'block';
    });
  }
  $('skipYes').onclick = () => introDone && introDone();
  $('skipNo').onclick = () => $('skipAsk').classList.remove('on');

  // 타이틀 화면: 무서운 BGM + 신비한 애니메이션, 아무것이나 누르면 시작 화면으로
  let splashRaf = 0;
  function showSplash() {
    flowOn('splash');
    SFX.init(); SFX.titleMusic(true);
    const cv = $('splashFx'), ctx = cv.getContext('2d');
    const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 2, v: 0.02 + Math.random() * 0.05, p: Math.random() * 6 }));
    const t0 = performance.now();
    const draw = now => {
      splashRaf = requestAnimationFrame(draw);
      const W = cv.width = cv.clientWidth * Math.min(2, devicePixelRatio || 1), Hh = cv.height = cv.clientHeight * Math.min(2, devicePixelRatio || 1);
      const t = (now - t0) / 1000, cx = W / 2, cy = Hh * 0.42, R = Math.min(W, Hh) * 0.36;
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, Hh) * 0.75);
      bg.addColorStop(0, '#1e1309'); bg.addColorStop(0.5, '#080503'); bg.addColorStop(1, '#000');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, Hh);
      // 천천히 도는 청동 거울 무늬 고리
      ctx.save(); ctx.translate(cx, cy);
      [[1, 0.06, 0.35], [0.78, -0.09, 0.25], [0.56, 0.13, 0.18]].forEach(([k, sp, a]) => {
        ctx.save(); ctx.rotate(t * sp);
        ctx.strokeStyle = `rgba(214,170,90,${a * (0.75 + 0.25 * Math.sin(t * 1.3))})`; ctx.lineWidth = 1.2 * (devicePixelRatio || 1);
        ctx.beginPath(); ctx.arc(0, 0, R * k, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 36; i++) {
          const an = i / 36 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * k, Math.sin(an) * R * k);
          ctx.lineTo(Math.cos(an + 0.08) * R * (k - 0.07), Math.sin(an + 0.08) * R * (k - 0.07)); ctx.stroke();
        }
        ctx.restore();
      });
      ctx.restore();
      // 떠오르는 불티와 먼지
      motes.forEach(m => {
        m.y -= m.v * 0.016; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        const x = (m.x + Math.sin(t * 0.5 + m.p) * 0.01) * W, y = m.y * Hh;
        const al = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + m.p));
        ctx.fillStyle = `rgba(255,${190 + (m.p * 10 | 0)},120,${al})`;
        ctx.beginPath(); ctx.arc(x, y, m.s * (devicePixelRatio || 1), 0, Math.PI * 2); ctx.fill();
      });
      // 가끔 어둠 속에서 깜빡이는 두 눈
      const e = (t % 9);
      if (e > 6.2 && e < 7.4 && !(e > 6.7 && e < 6.8)) {
        const ex = W * 0.82, ey = Hh * 0.2, gap = 18 * (devicePixelRatio || 1);
        [-gap, gap].forEach(d => { const g = ctx.createRadialGradient(ex + d, ey, 1, ex + d, ey, 12 * (devicePixelRatio || 1)); g.addColorStop(0, 'rgba(255,230,180,0.9)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(ex + d - 20, ey - 20, 40, 40); });
      }
    };
    cancelAnimationFrame(splashRaf); splashRaf = requestAnimationFrame(draw);
    const go = e => {
      e.preventDefault();
      removeEventListener('keydown', go, true); $('splash').removeEventListener('pointerdown', go, true);
      cancelAnimationFrame(splashRaf);
      SFX.titleMusic(false);
      flowOn(null);
      const next = afterSplash || showRules; afterSplash = null;
      next();
    };
    setTimeout(() => { addEventListener('keydown', go, true); $('splash').addEventListener('pointerdown', go, true); }, 600);
  }
  function startFlow() {
    setGender(settings.gender);
    if (params.get('demo') === 'meet') {
      $('endStat').innerHTML = '(미리보기) 탈출 뒤, 아직 클리어하지 않은 전시실이 남아 있을 때의 연출입니다.<br><b>화면(빈 곳)을 누를 때마다 다시 볼 수 있어요.</b>';
      showScreen('ending');
      const go = () => { SFX.init(); playMeetAgain(); };
      window.addEventListener('click', e => { if (!e.target.closest('button')) go(); });
      window.addEventListener('keydown', go);
      return;
    }
    // 교사용 주소: ?room=, ?test= 는 그 전시실로 바로, ?nointro=1 은 인트로 없이 규칙 안내부터
    if (params.has('test') || params.has('room')) {
      if (!settings.theme) settings.theme = 'dark';
      setTheme(settings.theme); startGame(null); return;
    }
    if (params.has('nointro')) { showRules(); return; }
    document.querySelectorAll('.optMild').forEach(c => { c.checked = !!settings.mild; });
    if (!settings.gender) { showScreen(null); flowOn('gender'); }
    else if (settings.mild == null) askFear();
    else playIntro(false);
  }

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
    buildGuide();
    const forced = S.forced;
    S.streak = 0;
    S.place = 'gallery';
    newGallery();
    S.forced = forced;
    S.history = [];
    lobby = LOBBY.build({ THREE, tex, ART, ROOMS, X0: LX, keyCanvas: (i, kind) => ART.drawKeyPiece(KEY_ART[i], 256, kind) });
    scene.add(lobby.group);
    lobby.pickables.forEach(p => pickables.push(p));
    // 처음 안내 창 뒤로는 로비가 보인다
    S.place = 'lobby'; S.lx = 0; S.lz = 4; S.yaw = 0;
    docent.visible = false; docentHit.visible = false; docentGlow.intensity = 0;
    lobbyRefresh();
    $('loading').textContent = '';
    S.ready = true;
    if (settings.theme) setTheme(settings.theme); else applyTheme();
    startFlow();
    requestAnimationFrame(frame);
  }
  boot();

  window.MHM = {
    state: S,
    show(id) { S.anomaly = window.ANOMALIES.find(a => a.id === id) || null; setupRoom(); },
    goRoom(n) { S.forcedRoom = n; newGallery(); S.anomaly = null; setupRoom(); },
    tick(n) { for (let i = 0; i < (n || 1); i++) frame(last + 16.7); },   // 화면이 가려져도 몇 프레임 진행 (점검용)
    view(n) { room(); Object.keys(room().exhibits).slice(0, n).forEach(markViewed); },
    ending: () => showEnding(),   // 탈출 화면 바로 보기 (점검용)
    lobby: () => goLobby(null),
    guidePos: () => Object.assign({}, GUIDE),   // 안내원 자리 (점검용)
    // 시대별 전시실 탈출 기록(=열쇠 조각)을 n개 준다 (점검용)
    giveKeys(n) { for (let i = 0; i < n; i++) clearedModes.add('era' + i); store.set('clearedModes', [...clearedModes]); lobbyRefresh(); }
  };
})();
