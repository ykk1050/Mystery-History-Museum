/* =========================================================
   소리: 파일 없이 Web Audio로 직접 만드는 으스스한 소리
   ========================================================= */
(function () {
  let ac = null, master = null, droneGain = null;
  let enabled = true;

  function init() {
    unlockSpeech();
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    master.connect(ac.destination);
    startDrone();
    const k = ambKind; ambKind = null; setAmbience(k);
    loadClips();
  }

  // 녹음된 효과음 (잠긴 문의 쇠사슬 소리, 잠겼던 문이 열리는 소리): 미리 받아 두었다가 바로 재생
  const CLIPS = { chain: ['sfx/chain1.mp3', 'sfx/chain2.mp3'], doorOpen: ['sfx/door_open.mp3'] };
  const clipBuf = {};
  function loadClips() {
    Object.keys(CLIPS).forEach(name => {
      clipBuf[name] = [];
      CLIPS[name].forEach(url => {
        fetch(url).then(r => r.arrayBuffer())
          .then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
          .then(buf => clipBuf[name].push(buf)).catch(() => {});
      });
    });
  }
  function playClip(name, vol, dest, exact) {
    const list = clipBuf[name];
    if (!list || !list.length) return false;
    const s = ac.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)];
    if (!exact) s.playbackRate.value = 0.94 + Math.random() * 0.12;   // 매번 조금씩 다르게
    const g = ac.createGain(); g.gain.value = vol || 1;
    s.connect(g); g.connect(dest || master); s.start();
    return true;
  }

  function noiseBuffer(sec, brown) {
    const len = Math.floor(ac.sampleRate * sec);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  // 낮게 웅웅거리는 배경음 + 공조기 바람 소리
  function startDrone() {
    droneGain = ac.createGain();
    droneGain.gain.value = 0.0;
    droneGain.connect(master);
    droneGain.gain.linearRampToValueAtTime(theme === 'dark' ? 0.5 : 0, ac.currentTime + 3);
    startBrightPad();

    [55, 55.6, 82.4].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ac.createGain(); g.gain.value = i === 2 ? 0.025 : 0.06;
      o.connect(g); g.connect(droneGain); o.start();
    });
    const n = ac.createBufferSource();
    n.buffer = noiseBuffer(4, true); n.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ac.createGain(); lfoG.gain.value = 180;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    const ng = ac.createGain(); ng.gain.value = 0.22;
    n.connect(lp); lp.connect(ng); ng.connect(droneGain); n.start();
  }

  // 밝은 박물관: 은은한 화음 (어둡게 웅웅거리는 소리 대신)
  let theme = 'dark', brightGain = null;
  // 밝은 박물관 배경음: 마림바 느낌의 경쾌한 짧은 곡 (C-Am-F-G 반복)
  const BGM_STEP = 0.27;            // 8분음표 길이(초) ≈ 111 BPM
  const BGM_MELODY = [              // 마디마다 8분음표 8개, null은 쉼표 (MIDI 음 번호)
    [76, null, 79, null, 84, null, 79, null],
    [76, null, 72, null, 74, 76, null, null],
    [77, null, 81, null, 84, null, 81, null],
    [79, null, 77, 76, 74, null, null, null],
    [76, null, 79, null, 84, null, 86, null],
    [84, null, 81, null, 79, 76, null, null],
    [77, 79, 81, null, 79, null, 77, 76],
    [74, null, 71, null, 72, null, null, null]
  ];
  const BGM_CHORDS = [[48, 64, 67], [45, 60, 64], [41, 60, 65], [43, 59, 62], [48, 64, 67], [45, 60, 64], [41, 60, 65], [43, 59, 65]];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  let bgmNext = 0, bgmStep = 0;
  function pluck(freq, t, vol, len) {
    // 사인파 + 높은 배음을 빨리 줄여 나무 건반처럼 '통' 하는 소리
    [[1, vol], [4, vol * 0.25]].forEach(([mul, v]) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mul;
      const g = ac.createGain(); env(g, t, 0.004, v, mul === 1 ? len : len * 0.25);
      o.connect(g); g.connect(brightGain); o.start(t); o.stop(t + len + 0.1);
    });
  }
  function scheduleBgm() {
    if (theme !== 'bright' || !enabled || ac.state !== 'running') { bgmNext = 0; return; }
    if (bgmNext < ac.currentTime) bgmNext = ac.currentTime + 0.1;
    while (bgmNext < ac.currentTime + 0.4) {
      const bar = Math.floor(bgmStep / 8) % BGM_MELODY.length, beat = bgmStep % 8;
      const note = BGM_MELODY[bar][beat];
      if (note) pluck(midi(note), bgmNext, 0.055, 0.6);
      const ch = BGM_CHORDS[bar];
      if (beat === 0 || beat === 4) pluck(midi(ch[0]), bgmNext, 0.07, 0.9);       // 베이스
      if (beat === 2 || beat === 6) ch.slice(1).forEach(n => pluck(midi(n), bgmNext, 0.018, 0.35)); // 가벼운 화음
      bgmNext += BGM_STEP; bgmStep++;
    }
  }
  function startBrightPad() {
    brightGain = ac.createGain();
    brightGain.gain.value = 0;
    brightGain.connect(master);
    brightGain.gain.linearRampToValueAtTime(theme === 'bright' ? 1 : 0, ac.currentTime + 2);
    setInterval(scheduleBgm, 100);
  }
  function setTheme(t) {
    theme = t;
    if (!ac) return;
    const now = ac.currentTime;
    [[droneGain, t === 'dark' ? 0.5 : 0], [brightGain, t === 'bright' ? 1 : 0]].forEach(([g, v]) => {
      if (!g) return;
      g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(v, now + 1.5);
    });
  }

  /* ---------- 시대별 배경 소리 (으스스한 박물관에서만) ----------
     drip 물방울 / river 물소리 / bell 먼 종 / breath 낮은 숨소리 / wind 바람 / echo 먼 발소리 메아리
     chime 풍경 / drum 먼 북소리 / paper 종이 넘기는 소리 */
  let ambKind = null, ambGain = null, ambLoop = [], ambTimer = 0;
  function setAmbience(kind) {
    if (kind === ambKind) return;
    ambKind = kind;
    if (!ac) return;
    stopAmbience();
    if (!kind) return;
    ambGain = ac.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
    ambGain.gain.linearRampToValueAtTime(1, ac.currentTime + 2);
    // 계속 이어지는 소리
    const cont = { river: [650, 0.7, 0.09, 0.15], breath: [260, 1.2, 0.16, 0.17], wind: [520, 1.5, 0.08, 0.06] }[kind];
    if (cont) {
      const n = ac.createBufferSource(); n.buffer = noiseBuffer(4, kind !== 'wind'); n.loop = true;
      const f = ac.createBiquadFilter(); f.type = kind === 'breath' ? 'lowpass' : 'bandpass'; f.frequency.value = cont[0]; f.Q.value = cont[1];
      const g = ac.createGain(); g.gain.value = cont[2];
      const lfo = ac.createOscillator(); lfo.frequency.value = cont[3];
      const lg = ac.createGain(); lg.gain.value = cont[2] * 0.9;
      lfo.connect(lg); lg.connect(g.gain);
      if (kind === 'wind') { const lf2 = ac.createGain(); lf2.gain.value = 350; lfo.connect(lf2); lf2.connect(f.frequency); }
      n.connect(f); f.connect(g); g.connect(ambGain); n.start(); lfo.start();
      ambLoop.push(n, lfo);
    }
    // 가끔 들리는 소리
    const every = { drip: [0.8, 2.6], bell: [7, 12], echo: [6, 10], chime: [3, 6], drum: [5, 8], paper: [2.5, 5], river: [3, 7] }[kind];
    if (every) {
      const tick = () => {
        if (ambKind !== kind) return;
        playAmbOnce(kind);
        ambTimer = setTimeout(tick, (every[0] + Math.random() * (every[1] - every[0])) * 1000);
      };
      ambTimer = setTimeout(tick, 1200);
    }
  }
  function stopAmbience() {
    clearTimeout(ambTimer);
    if (ambGain) {
      const g = ambGain, loops = ambLoop;
      g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 1);
      setTimeout(() => { loops.forEach(n => { try { n.stop(); } catch (e) {} }); g.disconnect(); }, 1200);
    }
    ambGain = null; ambLoop = [];
  }
  function tone(freq, t, vol, len, type, dest) {
    const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = ac.createGain(); env(g, t, 0.005, vol, len);
    o.connect(g); g.connect(dest || ambGain); o.start(t); o.stop(t + len + 0.1);
  }
  function playAmbOnce(kind) {
    if (!ac || !ambGain || !enabled || ac.state !== 'running') return;
    const t = ac.currentTime;
    if (kind === 'drip') { const f = 1100 + Math.random() * 900; tone(f, t, 0.06, 0.25); tone(f * 0.75, t + 0.28, 0.02, 0.3); }
    if (kind === 'river') tone(420 + Math.random() * 120, t, 0.015, 0.12, 'triangle');        // 개구리 같은 작은 소리
    if (kind === 'bell') [196, 523, 784].forEach((f, i) => tone(f, t, [0.05, 0.025, 0.012][i], 4.5));
    if (kind === 'echo') [0, 0.55, 1.1].forEach((d, i) => step(0.18 - i * 0.05, 0.7));
    if (kind === 'chime') [0, 0.12, 0.3].forEach(d => tone(1800 + Math.random() * 1400, t + d, 0.025, 1.6));
    if (kind === 'drum') [0, 0.45].forEach(d => { tone(62, t + d, 0.16, 0.6); tone(124, t + d, 0.04, 0.2, 'triangle'); });
    if (kind === 'paper') {
      const s = ac.createBufferSource(); s.buffer = noiseBuffer(0.4, false);
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
      const g = ac.createGain(); env(g, t, 0.05, 0.05, 0.3);
      s.connect(hp); hp.connect(g); g.connect(ambGain); s.start(t);
    }
  }

  /* ---------- 깜짝 효과 소리 (짧고, 비명·괴성 없이) ---------- */
  function noiseHit(t, dur, type, freq, q, vol, sweepTo, dest) {
    const s = ac.createBufferSource(); s.buffer = noiseBuffer(dur + 0.2, type === 'lowpass');
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ac.createGain(); env(g, t, 0.02, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t + dur + 0.2);
  }
  // 타이틀 화면 BGM: 낮은 울림 위로 음이 어긋난 오르골이 느리게 (A 단조)
  let titleGain = null, titleTimer = 0, titleStep = 0;
  function titleMusic(on) {
    if (!ac) return;
    if (!on) {
      clearInterval(titleTimer); titleTimer = 0;
      if (titleGain) { const g = titleGain; g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2); setTimeout(() => g.disconnect(), 1500); titleGain = null; }
      return;
    }
    if (titleGain) return;
    titleGain = ac.createGain(); titleGain.gain.value = 0; titleGain.connect(master);
    titleGain.gain.linearRampToValueAtTime(1, ac.currentTime + 2);
    // 메아리
    const dly = ac.createDelay(1.5); dly.delayTime.value = 0.42;
    const fb = ac.createGain(); fb.gain.value = 0.45; const wet = ac.createGain(); wet.gain.value = 0.5;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(titleGain);
    const g0 = titleGain;
    // 낮은 울림
    [55, 55.4, 82.4].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      const g = ac.createGain(); g.gain.value = i === 2 ? 0.03 : 0.05;
      o.connect(lp); lp.connect(g); g.connect(g0); o.start();
      setTimeout(() => { try { o.stop(); } catch (e) {} }, 600000);
    });
    const tune = [69, 72, 76, 81, 80, 76, 72, 71, 69, null, 76, 74, 72, 71, 68, null];   // 끝이 살짝 어긋나는 선율
    titleStep = 0;
    titleTimer = setInterval(() => {
      if (!titleGain || ac.state !== 'running') return;
      const n = tune[titleStep++ % tune.length];
      const t = ac.currentTime;
      if (n) {
        const f = 440 * Math.pow(2, (n - 69) / 12) * (1 + (Math.random() - 0.5) * 0.012);
        [1, 2.01].forEach((m, k) => {
          const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
          const g = ac.createGain(); env(g, t, 0.004, k ? 0.012 : 0.05, 1.6);
          o.connect(g); g.connect(g0); g.connect(dly); o.start(t); o.stop(t + 1.8);
        });
      }
      if (titleStep % 16 === 1) { const o = ac.createOscillator(); o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.4); const g = ac.createGain(); env(g, t, 0.01, 0.18, 1.6); o.connect(g); g.connect(g0); o.start(t); o.stop(t + 1.8); }
    }, 620);
  }

  // 문 두드리는 소리 (똑, 똑, 똑 + 덜컹)
  function knock() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    [0, 0.32, 0.64].forEach((d, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, t + d); o.frequency.exponentialRampToValueAtTime(70, t + d + 0.12);
      const g = ac.createGain(); env(g, t + d, 0.003, 0.32 - i * 0.04, 0.18);
      o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.25);
      noiseHit(t + d, 0.08, 'bandpass', 900, 1.5, 0.12);
    });
    noiseHit(t + 0.95, 0.5, 'bandpass', 1500, 2, 0.1);
  }
  // 쇠사슬이 부딪히는 소리 (잠긴 문): 짤그랑거리는 쇳소리 여러 번
  function chain() {
    if (!ac || !enabled) return;
    if (playClip('chain', 1.1)) return;
    const t = ac.currentTime;   // 녹음 파일을 아직 못 받았으면 만든 소리로
    for (let i = 0; i < 7; i++) {
      const d = i * 0.055 + Math.random() * 0.04, v = 0.16 * (1 - i / 9);
      [2300, 3400, 5100].forEach((f, k) => {
        const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f * (0.94 + Math.random() * 0.12);
        const g = ac.createGain(); env(g, t + d, 0.001, v / (k + 1), 0.09 + Math.random() * 0.08);
        o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.25);
      });
      noiseHit(t + d, 0.04, 'highpass', 3000, 1, v * 0.8);
    }
    noiseHit(t + 0.02, 0.18, 'bandpass', 180, 1.2, 0.18);   // 문이 살짝 밀리는 둔탁한 소리
  }
  // 덜컹: 문이 풀리며 열리는 소리 (낮은 쿵 + 걸쇠 소리 + 삐걱)
  // 크게 내야 하는 소리용: 2배로 키운 뒤 리미터로 찢어지는 소리를 막는다
  let loudBus = null;
  function loud() {
    if (loudBus) return loudBus;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.25;
    const make = ac.createGain(); make.gain.value = 1.5;
    loudBus = ac.createGain(); loudBus.gain.value = 2;
    loudBus.connect(comp); comp.connect(make); make.connect(master);
    return loudBus;
  }
  function clunk() {   // 처음보다 4배 크게 (태블릿 스피커에서도 들리도록 중간 음역 '쿵'을 더함)
    if (!ac || !enabled) return;
    if (playClip('doorOpen', 1, loud(), true)) return;   // 녹음 파일 (못 받았으면 아래 만든 소리)
    const t = ac.currentTime, out = loud();
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    const g = ac.createGain(); env(g, t, 0.004, 1.0, 0.35);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
    const m = ac.createOscillator(); m.type = 'triangle'; m.frequency.setValueAtTime(190, t); m.frequency.exponentialRampToValueAtTime(95, t + 0.2);
    const mg = ac.createGain(); env(mg, t, 0.003, 0.8, 0.25);
    m.connect(mg); mg.connect(out); m.start(t); m.stop(t + 0.4);
    noiseHit(t, 0.12, 'bandpass', 600, 1.2, 0.6, null, out);
    noiseHit(t + 0.09, 0.05, 'highpass', 2500, 1, 0.32, null, out);
    const c = ac.createOscillator(); c.type = 'sawtooth'; c.frequency.setValueAtTime(240, t + 0.25); c.frequency.linearRampToValueAtTime(170, t + 0.95);
    const cf = ac.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 900; cf.Q.value = 6;
    const cg = ac.createGain(); env(cg, t + 0.25, 0.08, 0.1, 0.6);
    c.connect(cf); cf.connect(cg); cg.connect(out); c.start(t + 0.25); c.stop(t + 1.1);
  }
  // 닫힌 나무문을 밀었을 때 덜그럭
  function rattle() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    [0, 0.07, 0.15].forEach((d, i) => noiseHit(t + d, 0.06, 'bandpass', 380 + i * 60, 2, 0.16 - i * 0.03));
  }
  // 심장 소리 (쿵-쿵)
  function heart() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    [[0, 0.32], [0.22, 0.2]].forEach(([d, v]) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t + d); o.frequency.exponentialRampToValueAtTime(40, t + d + 0.15);
      const g = ac.createGain(); env(g, t + d, 0.01, v, 0.18);
      o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.3);
    });
  }
  function scare(kind) {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    if (kind === 'gust') { noiseHit(t, 1.4, 'bandpass', 300, 0.8, 0.5, 1400); }
    if (kind === 'splash') { noiseHit(t, 0.5, 'bandpass', 900, 0.7, 0.45); noiseHit(t + 0.08, 0.7, 'lowpass', 500, 1, 0.3); }
    if (kind === 'clang') [262, 330, 415, 523, 698].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * 0.01);
      const g = ac.createGain(); env(g, t + i * 0.03, 0.005, 0.09, 2.6);
      o.connect(g); g.connect(master); o.start(t + i * 0.03); o.stop(t + 3);
    });
    if (kind === 'growl') { noiseHit(t, 1.6, 'lowpass', 180, 1, 0.75); const o = ac.createOscillator(); o.frequency.value = 52; const g = ac.createGain(); env(g, t, 0.3, 0.12, 1.4); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.8); }
    if (kind === 'drum') [0, 0.18].forEach(d => { const o = ac.createOscillator(); o.frequency.setValueAtTime(110, t + d); o.frequency.exponentialRampToValueAtTime(45, t + d + 0.4); const g = ac.createGain(); env(g, t + d, 0.005, 0.5, 0.6); o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 0.8); });
    if (kind === 'whoosh') { noiseHit(t, 1.1, 'bandpass', 1600, 0.6, 0.35, 250); }
    if (kind === 'grind') { noiseHit(t, 1.5, 'bandpass', 220, 4, 0.5); noiseHit(t + 0.2, 1.2, 'bandpass', 140, 6, 0.35); }
    if (kind === 'boom') { const o = ac.createOscillator(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(35, t + 1); const g = ac.createGain(); env(g, t, 0.005, 0.6, 1.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.5); }
    if (kind === 'rustle') { noiseHit(t, 1.2, 'highpass', 2200, 0.7, 0.3); noiseHit(t + 0.3, 0.9, 'highpass', 3200, 0.7, 0.2); }
  }

  function env(g, t, a, peak, d) {
    peak = Math.max(peak, 0.0002);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  let stepBuf = null;
  function step(vol, pitch) {
    if (!ac || !enabled || (vol != null && vol < 0.01)) return;
    if (!stepBuf) stepBuf = noiseBuffer(0.3, false);
    const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = stepBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = (pitch || 1) * (260 + Math.random() * 80); bp.Q.value = 1.2;
    const g = ac.createGain(); env(g, t, 0.005, 0.5 * (vol == null ? 1 : vol), 0.16);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.3);
    // 울림
    const o = ac.createOscillator(); o.frequency.value = 70 * (pitch || 1);
    const og = ac.createGain(); env(og, t, 0.004, 0.12 * (vol == null ? 1 : vol), 0.1);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.2);
  }

  function buzz() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
    const g = ac.createGain(); env(g, t, 0.01, 0.035, 0.25);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
  }

  function whoosh() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuffer(1.6, true);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(900, t + 0.6); lp.frequency.linearRampToValueAtTime(150, t + 1.5);
    const g = ac.createGain(); env(g, t, 0.4, 0.7, 1.1);
    s.connect(lp); lp.connect(g); g.connect(master); s.start(t);
  }

  // 틀렸을 때: 불협화음
  function wrong() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    if (theme === 'bright') {   // 밝은 박물관: 무섭지 않은 '띠-리' 소리
      [392, 311.1].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = ac.createGain(); env(g, t + i * 0.22, 0.01, 0.14, 0.4);
        o.connect(g); g.connect(master); o.start(t + i * 0.22); o.stop(t + i * 0.22 + 0.5);
      });
      return;
    }
    [98, 103.8, 146.8, 155.6].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      o.frequency.linearRampToValueAtTime(f * 0.94, t + 2.2);
      const g = ac.createGain(); env(g, t, 0.05, 0.08, 2.3);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 2.5);
    });
  }

  // 발견했을 때: 오르골 같은 낮은 종소리
  function chime() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    [659.3, 523.3, 622.3].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); env(g, t + i * 0.22, 0.01, 0.12, 1.6);
      o.connect(g); g.connect(master); o.start(t + i * 0.22); o.stop(t + i * 0.22 + 1.8);
    });
  }

  function exitBell() {
    if (!ac || !enabled) return;
    const t = ac.currentTime;
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); env(g, t + i * 0.18, 0.01, 0.12, 2.2);
      o.connect(g); g.connect(master); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 2.5);
    });
  }

  // 해설사 목소리
  // 1순위: 미리 녹음한 음성 파일(voice/*.mp3)을 Web Audio로 재생 — 스마트패드에서도 확실히 들린다
  // 2순위: 파일을 못 불러오면 기기의 한국어 음성(TTS)
  let voiceOn = true;
  let voiceSrc = null;
  const voiceCache = {};
  function decode(buf) {
    // 옛 Safari는 decodeAudioData가 Promise를 돌려주지 않는다
    return new Promise((res, rej) => { const p = ac.decodeAudioData(buf, res, rej); if (p && p.catch) p.catch(rej); });
  }
  function loadVoice(url) {
    if (!ac) return Promise.reject(new Error('no audio'));
    if (!voiceCache[url]) {
      voiceCache[url] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode);
      voiceCache[url].catch(() => { delete voiceCache[url]; });
    }
    return voiceCache[url];
  }
  function preloadVoice(url) { if (url) loadVoice(url).catch(() => {}); }
  function voice(url, text) {
    if (!voiceOn || !enabled) return;
    stopSpeak();
    resume();
    if (!url || !ac) { speak(text); return; }
    loadVoice(url).then(buf => {
      stopSpeak();
      const src = ac.createBufferSource(); src.buffer = buf;
      const g = ac.createGain(); g.gain.value = 1.3;
      src.connect(g); g.connect(master); src.start();
      voiceSrc = src;
    }).catch(() => speak(text));
  }
  function speak(text) {
    if (!voiceOn || !enabled || !window.speechSynthesis || !text) return;
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(text.replace(/…/g, ', '));
      u.lang = 'ko-KR'; u.rate = 0.8; u.pitch = 0.6; u.volume = 1;
      const v = speechSynthesis.getVoices().find(v => /^ko/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* 음성 미지원 */ }
  }
  // iPad는 화면을 누른 순간에 한 번 말해 두어야 이후에도 말할 수 있다 → 입장 버튼에서 호출
  function unlockSpeech() {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; u.lang = 'ko-KR';
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopSpeak() {
    if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} voiceSrc = null; }
    try { window.speechSynthesis && speechSynthesis.speaking && speechSynthesis.cancel(); } catch (e) {}
  }
  // 전화·알림 등으로 오디오가 멈췄다가 다시 화면을 누르면 되살린다
  ['pointerdown', 'touchend', 'keydown'].forEach(t => document.addEventListener(t, () => resume(), true));

  function setEnabled(on) {
    enabled = on;
    if (master) master.gain.value = on ? 0.9 : 0;
    if (!on) stopSpeak();
  }
  function setVoice(on) { voiceOn = on; if (!on) stopSpeak(); }
  function suspend() { if (ac && ac.state === 'running') ac.suspend(); stopSpeak(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  window.SFX = { titleMusic, knock, chain, clunk, rattle, heart, scare, setTheme, setAmbience, init, step, buzz, whoosh, wrong, chime, exitBell, speak, voice, preloadVoice, stopSpeak, setEnabled, setVoice, suspend, resume };
})();
