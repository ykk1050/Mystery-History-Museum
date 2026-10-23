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
    droneGain.gain.linearRampToValueAtTime(0.5, ac.currentTime + 3);

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
      const g = ac.createGain(); g.gain.value = 2.2;
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

  window.SFX = { init, step, buzz, whoosh, wrong, chime, exitBell, speak, voice, preloadVoice, stopSpeak, setEnabled, setVoice, suspend, resume };
})();
