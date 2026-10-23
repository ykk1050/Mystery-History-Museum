/* =========================================================
   미스터리 역사 박물관 - 게임 본체 (three.js)
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);

  /* ---------- 기본 치수 ---------- */
  const L = 48;          // 전시실 길이
  const HW = 3.5;        // 전시실 폭의 절반
  const H = 4.2;         // 천장 높이
  const EYE = 1.6;       // 눈 높이
  const GOAL = 8;        // 출구까지 필요한 연속 정답 수
  const ANOMALY_RATE = 0.55;
  const INSPECT_RANGE = 6.5;

  /* ---------- 저장 (실패해도 게임은 동작) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mhm_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mhm_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const found = new Set(store.get('found', []));
  let cleared = store.get('cleared', false);
  const settings = Object.assign({ sound: true, voice: true, low: false }, store.get('settings', {}));

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  if (settings.low == null) settings.low = false;

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

  scene.add(new THREE.AmbientLight(0x6b5c4c, 0.42));
  const lantern = new THREE.PointLight(0xffd9a0, 1.15, 15, 1.6);
  scene.add(lantern);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function tex(cnv, repeatX, repeatY) {
    const t = new THREE.CanvasTexture(cnv);
    t.anisotropy = Math.min(8, maxAniso);
    if (repeatX) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY || 1); }
    return t;
  }

  /* ---------- 전시실 만들기 ---------- */
  const pickables = [];
  const exhibitObj = {};     // key -> { mesh, texture, draw }
  const lamps = [];
  let signTex, signBackTex, rulesTex, farSignMesh, exitGroup, farTunnel;

  function addPlane(w, h, mat, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    scene.add(m);
    return m;
  }
  function addBox(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); scene.add(m);
    return m;
  }

  const wood = new THREE.MeshLambertMaterial({ color: 0x2a1c12 });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  function buildMuseum() {
    // 바닥, 천장, 벽
    const floorMat = new THREE.MeshLambertMaterial({ map: tex(ART.floorTex(), 2, (L + 8) / 4) });
    const floor = addPlane(HW * 2, L + 8, floorMat, 0, 0, -L / 2);
    floor.rotation.x = -Math.PI / 2;
    const ceil = addPlane(HW * 2, L + 8, new THREE.MeshLambertMaterial({ color: 0x15130f }), 0, H, -L / 2);
    ceil.rotation.x = Math.PI / 2;
    const wallMat = new THREE.MeshLambertMaterial({ map: tex(ART.wallTex(), L / 4, 1) });
    addPlane(L, H, wallMat, -HW, H / 2, -L / 2, Math.PI / 2);
    addPlane(L, H, wallMat, HW, H / 2, -L / 2, -Math.PI / 2);

    // 양 끝 벽 (가운데 문 구멍)
    const endMat = new THREE.MeshLambertMaterial({ color: 0x23251f });
    const dw = 2.2, dh = 2.9;
    [[0, 0], [-L, Math.PI]].forEach(([z, ry]) => {
      const sideW = HW - dw / 2;
      addPlane(sideW, H, endMat, -(dw / 2 + sideW / 2), H / 2, z, ry === 0 ? Math.PI : 0);
      addPlane(sideW, H, endMat, (dw / 2 + sideW / 2), H / 2, z, ry === 0 ? Math.PI : 0);
      addPlane(dw, H - dh, endMat, 0, dh + (H - dh) / 2, z, ry === 0 ? Math.PI : 0);
      // 문틀
      addBox(0.12, dh, 0.25, wood, -dw / 2, dh / 2, z);
      addBox(0.12, dh, 0.25, wood, dw / 2, dh / 2, z);
      addBox(dw + 0.24, 0.12, 0.25, wood, 0, dh, z);
    });
    // 문 너머 어두운 통로
    function tunnel(z0, dir) {
      const g = new THREE.Group();
      const m = new THREE.MeshLambertMaterial({ color: 0x15140f });
      const len = 5;
      const zc = z0 + dir * len / 2;
      const w1 = new THREE.Mesh(new THREE.PlaneGeometry(len, dh), m); w1.position.set(-dw / 2, dh / 2, zc); w1.rotation.y = Math.PI / 2; g.add(w1);
      const w2 = w1.clone(); w2.position.x = dw / 2; w2.rotation.y = -Math.PI / 2; g.add(w2);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(dw, len), m); top.position.set(0, dh, zc); top.rotation.x = Math.PI / 2; g.add(top);
      const bot = new THREE.Mesh(new THREE.PlaneGeometry(dw, len), m); bot.position.set(0, 0.001, zc); bot.rotation.x = -Math.PI / 2; g.add(bot);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), darkMat); back.position.set(0, dh / 2, z0 + dir * len); back.rotation.y = dir > 0 ? Math.PI : 0; g.add(back);
      scene.add(g);
      return g;
    }
    tunnel(0, 1);
    farTunnel = tunnel(-L, -1);

    // 출구 (8번째 이후에만 보임)
    exitGroup = new THREE.Group();
    const light = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false }));
    light.position.set(0, dh / 2 + 1.2, -L - 4.9); exitGroup.add(light);
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x8c877a });
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.1, 0.18, 0.5), stepMat);
      s.position.set(0, 0.09 + i * 0.18, -L - 0.6 - i * 0.5); exitGroup.add(s);
    }
    const exitGlow = new THREE.PointLight(0xfff0d0, 2.2, 12, 1.2);
    exitGlow.position.set(0, 2, -L - 2); exitGroup.add(exitGlow);
    exitGroup.visible = false;
    scene.add(exitGroup);

    // 문 위 작은 표지판
    farSignMesh = addPlane(1.6, 0.42, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('다음 전시실 →', 'NEXT')) }), 0, 3.3, -L + 0.02, 0);
    addPlane(1.6, 0.42, new THREE.MeshBasicMaterial({ map: tex(ART.drawSmallSign('← 되돌아가기', 'BACK', '#c9b48a')) }), 0, 3.3, -0.02, Math.PI);

    // 천장 조명
    const glowFloor = tex(ART.glowTex('rgba(255,215,160,0.55)'));
    for (let z = -3; z > -L; z -= 6) {
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe7bf });
      const lamp = addPlane(1.6, 0.32, lampMat, 0, H - 0.02, z);
      lamp.rotation.x = Math.PI / 2;
      const pool = addPlane(4.2, 4.2, new THREE.MeshBasicMaterial({ map: glowFloor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }), 0, 0.012, z);
      pool.rotation.x = -Math.PI / 2;
      lamps.push({ lampMat, pool, z, flick: 0 });
    }

    const wash = tex(ART.glowTex('rgba(255,210,150,0.45)'));
    const washMat = new THREE.MeshBasicMaterial({ map: wash, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });

    // 왼쪽 벽 진열장
    const leftCases = [['handaxe', -9], ['comb', -13.5], ['knife', -18], ['dagger', -30], ['gaya', -34.5], ['celadon', -39]];
    leftCases.forEach(([key, z]) => {
      const x = -HW + 0.02;
      addBox(0.6, 0.45, 1.7, wood, -HW + 0.3, 0.225, z);              // 받침장
      addBox(0.06, 2.4, 0.06, wood, -HW + 0.55, 1.62, z - 0.83);       // 유리장 기둥
      addBox(0.06, 2.4, 0.06, wood, -HW + 0.55, 1.62, z + 0.83);
      addBox(0.6, 0.08, 1.72, wood, -HW + 0.3, 2.84, z);
      const glass = addBox(0.02, 2.36, 1.62, new THREE.MeshBasicMaterial({ color: 0x9fb5c0, transparent: true, opacity: 0.06, depthWrite: false }), -HW + 0.58, 1.64, z);
      glass.renderOrder = 2;
      makeExhibit(key, 1.5, 2.25, x, 1.6, z, Math.PI / 2, ART.drawCase);
      const w = addPlane(2.6, 2.6, washMat, x + 0.01, 2.6, z, Math.PI / 2);
      w.renderOrder = 1;
    });
    // 고분 벽화 (왼쪽 벽 끝)
    addBox(0.08, 2.2, 3.2, wood, -HW + 0.02, 1.75, -44.5);
    makeExhibit('mural', 3.0, 2.0, -HW + 0.08, 1.75, -44.5, Math.PI / 2, ART.drawMural);
    addPlane(4, 3.4, washMat, -HW + 0.04, 2.3, -44.5, Math.PI / 2);

    // 오른쪽 벽 패널
    const rightPanels = [['timeline', -10, ART.drawTimeline], ['gojoseon', -16, ART.drawPanel], ['samguk', -26.5, ART.drawPanel],
      ['unified', -32, ART.drawPanel], ['goryeo', -37.5, ART.drawPanel], ['goryeoCulture', -43, ART.drawPanel]];
    rightPanels.forEach(([key, z, fn]) => {
      addBox(0.06, 2.0, 2.76, wood, HW - 0.02, 1.85, z);
      makeExhibit(key, 2.6, 1.86, HW - 0.06, 1.85, z, -Math.PI / 2, fn);
      addPlane(3.6, 3.2, washMat, HW - 0.04, 2.5, z, -Math.PI / 2);
    });

    // 문 (분위기용)
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a3631 });
    [[-21, '수장고'], [-4, '관계자 외 출입금지']].forEach(([z, label]) => {
      addBox(0.08, 2.4, 1.2, doorMat, HW - 0.04, 1.2, z);
      addPlane(0.9, 0.28, new THREE.MeshBasicMaterial({ map: tex(ART.drawDoorPlate(label)) }), HW - 0.09, 2.0, z, -Math.PI / 2);
      addBox(0.1, 0.06, 0.18, new THREE.MeshLambertMaterial({ color: 0x8a8070 }), HW - 0.12, 1.1, z + 0.4);
    });

    // 고인돌 복제품
    const stone = new THREE.MeshLambertMaterial({ map: tex(ART.stoneTex()) });
    const dz = -24.5, dx = -1.95;
    addBox(2.5, 0.2, 2.2, new THREE.MeshLambertMaterial({ color: 0x1d1a16 }), dx, 0.1, dz);
    const parts = [
      addBox(0.25, 1.15, 1.4, stone, dx - 0.7, 0.78, dz),
      addBox(0.25, 1.15, 1.4, stone, dx + 0.7, 0.78, dz),
      addBox(2.2, 0.32, 1.9, stone, dx, 1.5, dz)
    ];
    parts[2].rotation.z = 0.04; parts[2].rotation.y = 0.05;
    parts.forEach(p => { p.userData.key = 'dolmen'; pickables.push(p); });
    const dl = makeExhibit('dolmen', 1.05, 0.58, dx + 0.15, 0.9, dz + 1.75, 0.35, ART.drawDolmenLabel);
    dl.rotation.x = -0.5;
    addBox(0.06, 0.75, 0.06, wood, dx + 0.15, 0.38, dz + 1.82);
    const dPool = addPlane(4.5, 4.5, new THREE.MeshBasicMaterial({ map: glowFloor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }), dx, 0.21, dz);
    dPool.rotation.x = -Math.PI / 2;

    // 입구: 관람 안내판 + 전시실 번호 표지판
    rulesTex = tex(ART.drawRules(''));
    const rules = addPlane(1.2, 1.64, new THREE.MeshBasicMaterial({ map: rulesTex, color: 0xd8d0c0 }), -HW + 0.04, 1.75, -4.2, Math.PI / 2);
    rules.userData.key = 'rules'; pickables.push(rules);
    addPlane(2.4, 2.6, washMat, -HW + 0.05, 2.3, -4.2, Math.PI / 2);

    signTex = tex(ART.drawSign(0));
    const sign = addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: signTex }), 0, 3.35, -6.5, 0);
    sign.userData.key = 'sign'; pickables.push(sign);
    signBackTex = tex(ART.drawSmallSign('← 지나온 전시실', 'BACK', '#c9b48a'));
    addPlane(2.4, 0.7, new THREE.MeshBasicMaterial({ map: signBackTex }), 0, 3.35, -6.52, Math.PI);
    addBox(0.03, 0.5, 0.03, darkMat, -0.9, 3.95, -6.51);
    addBox(0.03, 0.5, 0.03, darkMat, 0.9, 3.95, -6.51);
  }

  function makeExhibit(key, w, h, x, y, z, ry, drawFn) {
    const cnv = drawFn(window.EXHIBITS[key]);
    const t = tex(cnv);
    const mat = new THREE.MeshBasicMaterial({ map: t, color: 0xd6cdbd });
    const mesh = addPlane(w, h, mat, x, y, z, ry);
    mesh.userData.key = key;
    pickables.push(mesh);
    exhibitObj[key] = { mesh, texture: t, draw: drawFn, canvas: cnv };
    return mesh;
  }

  /* ---------- 떠도는 해설사 ---------- */
  let docent, docentGlow;
  function buildDocent() {
    const mat = new THREE.SpriteMaterial({ map: tex(ART.drawDocent()), transparent: true, opacity: 0.88, depthWrite: false });
    docent = new THREE.Sprite(mat);
    docent.scale.set(0.88, 1.92, 1);
    docent.userData.key = 'docent';
    scene.add(docent);
    pickables.push(docent);
    docentGlow = new THREE.PointLight(0xffb070, 0.9, 5, 2);
    scene.add(docentGlow);
  }

  /* ---------- 게임 상태 ---------- */
  const S = {
    mode: 'title',          // title | play | inspect | note | menu | trans | ending
    streak: 0,
    anomaly: null,
    lastAnomalyId: null,
    firstGallery: true,
    exitRoom: false,
    z: -2, yaw: 0, pitch: 0,
    turning: 0, turnFrom: 0, turnTo: 0,
    bob: 0, lastStepSign: 0,
    docZ: -L + 2, docStep: 0, spoke: false, docSpeech: '',
    startTime: 0, mistakes: 0, foundThisRun: 0,
    hintTimer: 0
  };

  function current(key) {
    const base = window.EXHIBITS[key];
    if (S.anomaly && S.anomaly.target === key) return applyPatch(base, S.anomaly.patch);
    return applyPatch(base, null);
  }

  function redrawExhibits() {
    Object.keys(exhibitObj).forEach(key => {
      const o = exhibitObj[key];
      const cnv = o.draw(current(key));
      o.canvas = cnv;
      o.texture.image = cnv;
      o.texture.needsUpdate = true;
    });
    S.docSpeech = current('docent').speech;
  }

  function rulesInfo() {
    const remain = window.ANOMALIES.filter(a => !found.has(a.id)).length;
    if (!cleared) return '';
    if (remain === 0) return '모든 이상 현상을 발견했습니다. 관람해 주셔서 감사합니다.';
    return `아직 발견하지 못한 이상 현상: ${remain}개`;
  }

  function pickAnomaly() {
    if (S.forced) { const f = S.forced; S.forced = null; return f; }
    if (S.firstGallery || S.exitRoom) return null;
    if (Math.random() > ANOMALY_RATE) return null;
    let pool = window.ANOMALIES.filter(a => !found.has(a.id));
    if (pool.length === 0) pool = window.ANOMALIES.slice();
    if (pool.length > 1) pool = pool.filter(a => a.id !== S.lastAnomalyId);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function newGallery() {
    S.exitRoom = S.streak >= GOAL;
    S.anomaly = pickAnomaly();
    if (S.anomaly) S.lastAnomalyId = S.anomaly.id;
    redrawExhibits();
    signTex.image = ART.drawSign(S.streak); signTex.needsUpdate = true;
    rulesTex.image = ART.drawRules(rulesInfo()); rulesTex.needsUpdate = true;
    exitGroup.visible = S.exitRoom;
    farTunnel.visible = !S.exitRoom;
    farSignMesh.visible = !S.exitRoom;
    S.z = -2; S.yaw = 0; S.pitch = 0; S.turning = 0;
    S.docZ = -L + 1.5; S.spoke = false;
    docent.visible = !S.exitRoom;
    hideSubtitle();
    S.firstGallery = false;
  }

  /* ---------- 화면 전환 ---------- */
  const fadeEl = $('fade');
  function fadeTo(op, ms) {
    fadeEl.style.transition = `opacity ${ms || 700}ms`;
    fadeEl.style.opacity = op;
    return new Promise(r => setTimeout(r, ms || 700));
  }

  function exitGallery(dir) {
    if (S.mode !== 'play') return;
    S.mode = 'trans';
    keys.fwd = keys.back = false;
    SFX.whoosh(); SFX.stopSpeak();
    const had = S.anomaly;

    if (S.exitRoom && dir === 'forward') {
      fadeTo(1, 900).then(showEnding);
      return;
    }
    const correct = dir === 'forward' ? !had : !!had;
    let note = null;
    if (correct) {
      S.streak++;
      if (had) {
        const isNew = !found.has(had.id);
        found.add(had.id); store.set('found', Array.from(found));
        S.foundThisRun++;
        note = { good: true, a: had, isNew };
      }
    } else {
      S.streak = 0;
      S.mistakes++;
      note = { good: false, a: had, dir };
    }

    fadeTo(1, 700).then(() => {
      if (note) {
        if (note.good) SFX.chime(); else { SFX.wrong(); flashRed(); }
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
    let html = '';
    if (n.good) {
      html = `<h2 class="good">이상 현상을 발견했다${n.isNew ? '' : ' (이미 기록됨)'}</h2>
        <div class="k">이상했던 점</div><p class="wrongtxt">${n.a.wrong}</p>
        <div class="k">교과서 속 사실</div><p class="right">${n.a.right}</p>`;
    } else if (n.a) {
      html = `<h2 class="bad">…놓쳤다. 처음부터 다시.</h2>
        <div class="k">이 전시실의 이상 현상</div><p class="wrongtxt">${n.a.wrong}</p>
        <div class="k">교과서 속 사실</div><p class="right">${n.a.right}</p>`;
    } else {
      html = `<h2 class="bad">…되돌아갈 필요가 없었다.</h2>
        <p>이 전시실에는 이상한 전시가 하나도 없었다.<br>정상인 전시를 잘 기억해 두면, 다음엔 헷갈리지 않을 것이다.</p>
        <p style="margin-top:10px;color:#7a6a4e">처음부터 다시.</p>`;
    }
    html += `<button class="btn" id="noteOk">계속</button>`;
    card.innerHTML = html;
    $('note').classList.add('on');
    const ok = () => { $('note').classList.remove('on'); window.removeEventListener('keydown', onKey); done(); };
    const onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ok(); } };
    $('noteOk').onclick = ok;
    setTimeout(() => window.addEventListener('keydown', onKey), 300);
  }

  function showEnding() {
    S.mode = 'ending';
    SFX.exitBell();
    const firstClear = !cleared;
    cleared = true; store.set('cleared', true);
    const sec = Math.round((performance.now() - S.startTime) / 1000);
    const remain = window.ANOMALIES.filter(a => !found.has(a.id)).length;
    $('endStat').innerHTML = `
      당신은 박물관을 빠져나왔다.<br>
      걸린 시간: ${Math.floor(sec / 60)}분 ${sec % 60}초 · 놓친 횟수: ${S.mistakes}번<br>
      이번에 발견한 이상 현상: ${S.foundThisRun}개<br>
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
    window.ANOMALIES.forEach(a => {
      const d = document.createElement('div');
      const name = window.EXHIBITS[a.target].title || '해설사';
      if (found.has(a.id)) {
        d.className = 'item';
        d.innerHTML = `<div class="t">✔ [${name}] ${a.wrong}</div><div class="r">→ ${a.right}</div>`;
      } else {
        d.className = 'item unknown';
        d.innerHTML = `<div class="t">??? — ${a.target === 'docent' ? '해설사' : name} 주변에서 무언가가…</div>`;
      }
      list.appendChild(d);
    });
    $('recordCount').textContent = `발견한 이상 현상 ${found.size} / ${window.ANOMALIES.length}`;
    showScreen('record');
  }

  /* ---------- 입력 ---------- */
  const keys = { fwd: false, back: false, left: false, right: false, run: false };
  window.addEventListener('keydown', e => {
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
    look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0 };
    try { canvasEl.setPointerCapture(e.pointerId); } catch (er) {}
  });
  canvasEl.addEventListener('pointermove', e => {
    if (look && e.pointerId === look.id) {
      const dx = e.clientX - look.x, dy = e.clientY - look.y;
      look.x = e.clientX; look.y = e.clientY;
      look.moved += Math.abs(dx) + Math.abs(dy);
      const sens = e.pointerType === 'mouse' ? 0.0045 : 0.006;
      S.yaw -= dx * sens;
      S.pitch = Math.max(-0.55, Math.min(0.55, S.pitch + dy * sens * 0.8));
    } else if (e.pointerType === 'mouse' && S.mode === 'play') {
      hoverAt(e.clientX, e.clientY);
    }
  });
  function endLook(e) {
    if (!look || e.pointerId !== look.id) return;
    const wasTap = look.moved < 10;
    look = null;
    if (wasTap && S.mode === 'play') pickAt(e.clientX, e.clientY, false);
  }
  canvasEl.addEventListener('pointerup', endLook);
  canvasEl.addEventListener('pointercancel', e => { if (look && e.pointerId === look.id) look = null; });

  // 터치 버튼
  function holdBtn(el, onDown, onUp) {
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('active'); onDown(); try { el.setPointerCapture(e.pointerId); } catch (er) {} });
    const up = e => { el.classList.remove('active'); onUp && onUp(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  }
  holdBtn($('tFwd'), () => { keys.fwd = true; }, () => { keys.fwd = false; });
  holdBtn($('tBack'), () => { keys.back = true; }, () => { keys.back = false; });
  holdBtn($('tTurn'), () => { if (S.mode === 'play') turnAround(); });

  function turnAround() {
    if (S.turning > 0) return;
    S.turning = 0.0001; S.turnFrom = S.yaw; S.turnTo = S.yaw + Math.PI;
  }

  /* ---------- 자세히 보기 ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function rayAt(cx, cy, center) {
    if (center) ndc.set(0, 0);
    else ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables.filter(o => o.visible), false);
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
    if (h.distance > INSPECT_RANGE) { showHint('더 가까이 다가가세요…', 1600); return; }
    const key = h.object.userData.key;
    if (key === 'docent') { showSubtitle(S.docSpeech); return; }
    openInspect(key);
  }
  function openInspect(key) {
    let src;
    if (key === 'rules') src = rulesTex.image;
    else if (key === 'sign') src = signTex.image;
    else if (exhibitObj[key]) src = exhibitObj[key].canvas;
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
  function showSubtitle(text) {
    $('subText').textContent = text;
    $('subtitle').classList.add('on');
    clearTimeout(subTimer);
    subTimer = setTimeout(hideSubtitle, 6500);
    SFX.speak(text);
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
  $('quitBtn').onclick = () => { SFX.stopSpeak(); $('hud').classList.remove('on'); fadeEl.style.opacity = 1; S.mode = 'title'; showScreen('title'); };
  $('recordBtn1').onclick = () => openRecord('title');
  $('recordBtn2').onclick = () => openRecord('menu');
  $('recordBtn3').onclick = () => openRecord('ending');
  $('recordClose').onclick = () => showScreen(recordReturn);
  $('recordReset').onclick = () => {
    if (!confirm('발견한 이상 현상 기록을 모두 지울까요?')) return;
    found.clear(); cleared = false; store.set('found', []); store.set('cleared', false);
    openRecord(recordReturn);
  };
  $('optSound').checked = settings.sound; $('optVoice').checked = settings.voice; $('optLow').checked = settings.low;
  SFX.setEnabled(settings.sound); SFX.setVoice(settings.voice);
  $('optSound').onchange = e => { settings.sound = e.target.checked; SFX.setEnabled(settings.sound); store.set('settings', settings); };
  $('optVoice').onchange = e => { settings.voice = e.target.checked; SFX.setVoice(settings.voice); store.set('settings', settings); };
  $('optLow').onchange = e => { settings.low = e.target.checked; applyPixelRatio(); applyLow(); store.set('settings', settings); };
  function applyLow() { $('grain').style.display = settings.low ? 'none' : 'block'; }
  applyLow();

  /* ---------- 시작 ---------- */
  function startGame() {
    SFX.init();
    if (window.speechSynthesis) try { speechSynthesis.getVoices(); } catch (e) {}
    S.streak = 0; S.firstGallery = true; S.mistakes = 0; S.foundThisRun = 0;
    S.startTime = performance.now();
    newGallery();
    showScreen(null);
    $('hud').classList.add('on');
    $('touch').classList.add('on');
    $('lookHint').style.display = isTouch ? '' : 'none';
    $('crosshair').style.display = isTouch ? 'none' : 'block';
    S.mode = 'play';
    fadeTo(0, 1600);
    setTimeout(() => showHint(isTouch ? '전시물을 눌러 자세히 볼 수 있습니다' : '전시물을 클릭하면 자세히 볼 수 있습니다', 4500), 1800);
  }
  $('startBtn').onclick = startGame;
  $('againBtn').onclick = () => { fadeEl.style.opacity = 1; startGame(); };

  $('controlsInfo').innerHTML = isTouch
    ? '▲ 걷기 · ▼ 뒷걸음 · ⟲ 뒤돌기 · 화면을 끌어서 둘러보기 · 전시물을 눌러 자세히 보기'
    : 'W/↑ 걷기 · S/↓ 뒷걸음 · A/D/←/→ 둘러보기 · 마우스로 끌어서 둘러보기<br>Space 뒤돌기 · Shift 빨리 걷기 · 클릭 자세히 보기 · Esc 메뉴';

  /* ---------- 매 프레임 ---------- */
  let last = performance.now();
  let flickerT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode === 'title') { renderer.render(scene, camera); return; }

    const active = S.mode === 'play';
    // 뒤돌기 애니메이션
    if (S.turning > 0) {
      S.turning = Math.min(1, S.turning + dt / 0.6);
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

    // 해설사: 반대편에서 천천히 걸어와 입구 근처에서 멈춘다
    if (docent.visible && S.mode !== 'ending') {
      if (S.docZ < -2.4) {
        S.docZ += 0.72 * dt;
        S.docStep += dt;
        if (S.docStep > 0.72) {
          S.docStep = 0;
          const d = Math.abs(S.docZ - S.z);
          SFX.step(Math.max(0, 0.45 - d * 0.025), 0.75);
        }
      }
      const sway = Math.sin(now / 900) * 0.02;
      docent.position.set(1.35 + sway, 0.96, S.docZ);
      docentGlow.position.set(1.55, 1.1, S.docZ + 0.3);
      if (!S.spoke && Math.abs(S.docZ - S.z) < 5 && active) { S.spoke = true; showSubtitle(S.docSpeech); }
    }

    // 깜빡이는 조명
    flickerT -= dt;
    lamps.forEach(l => {
      if (l.flick > 0) {
        l.flick -= dt;
        const on = Math.random() > 0.5;
        l.lampMat.color.setHex(on ? 0xffe7bf : 0x3a3020);
        l.pool.material.opacity = on ? 0.5 : 0.05;
        if (l.flick <= 0) { l.lampMat.color.setHex(0xffe7bf); l.pool.material.opacity = 0.5; }
      } else if (Math.random() < dt * 0.05) {
        l.flick = 0.2 + Math.random() * 0.5;
        if (Math.abs(l.z - S.z) < 10) SFX.buzz();
      }
    });
    lantern.intensity = 1.15 + (Math.random() < 0.01 ? -0.6 : 0);

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
    newGallery();
    S.forced = forced;
    camera.position.set(0, EYE, -2);
    $('loading').textContent = '';
    $('startBtn').disabled = false;
    requestAnimationFrame(frame);
  }
  boot();

  // 교사용 미리보기: 주소 뒤에 ?test=이상현상ID 를 붙이면 첫 전시실에 그 이상 현상이 나온다
  const testId = new URLSearchParams(location.search).get('test');
  if (testId) S.forced = window.ANOMALIES.find(a => a.id === testId) || null;

  window.MHM = {
    show(id) { S.anomaly = window.ANOMALIES.find(a => a.id === id) || null; redrawExhibits(); },
    state: S
  };
})();
