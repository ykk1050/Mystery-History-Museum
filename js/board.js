/* =========================================================
   정복자 명단: 전시실을 탈출하면 조합형 닉네임으로 이름을 올리고, 로비의 명단판에서 보고 찾는다.
   - 서버: 구글 스프레드시트 + Apps Script (js/config.js 의 boardUrl)
   - 닉네임은 단어 번호 4개로만 주고받는다 (js/nickwords.js)
   - 이 기기에서 만든 닉네임은 '내 닉네임'으로 기억해 두었다가 다시 등록할 수 있다 (만든 기기만 쓸 수 있음)
   - 주소에 ?boardtest=1 을 붙이면 서버 대신 이 브라우저 안의 가짜 서버로 시험한다
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const N = window.NICK, W = window.NICK_WORDS;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mhm_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('mhm_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  const test = /[?&]boardtest=1/.test(location.search);
  const url = (window.MHM_CONFIG && window.MHM_CONFIG.boardUrl) || '';
  const enabled = () => test || !!url;
  let token = store.get('nickToken', null);
  if (!token) { token = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('nickToken', token); }
  const myNicks = () => store.get('myNicks', []);          // [{ id, n }]
  const isMine = id => myNicks().some(m => m.id === id);
  let modes = [], hooks = {};
  const isMys = id => id === 'mystery';
  const listName = m => isMys(m.id) ? '미스터리 역사 박물관 탈출자 명단' : `「${m.name}」 정복자 명단`;
  let board = store.get('boardCache', null);               // { mode: [{ id, n, c, t }] }

  /* ---------- 서버 (진짜 / 가짜) ---------- */
  const mock = {
    db: () => store.get('mockServer', { nicks: {}, clears: [] }),
    save: d => store.set('mockServer', d),
    list() {
      const d = mock.db(), b = {};
      modes.forEach(m => { b[m.id] = []; });
      d.clears.forEach(c => { if (b[c.mode]) b[c.mode].push({ id: c.id, n: N.text(N.parse(c.id)), c: c.count, t: c.first }); });
      Object.values(b).forEach(a => a.sort((x, y) => y.c - x.c || x.t - y.t));
      return { board: b };
    },
    check: id => ({ taken: !!mock.db().nicks[id] }),
    register(id, mode, tok) {
      const d = mock.db();
      if (d.nicks[id] && d.nicks[id] !== tok) return { error: 'taken' };
      const last = Math.max(0, ...d.clears.filter(x => x.id === id).map(x => x.last || x.first), d.tokLast && d.tokLast[tok] || 0);
      const since = (Date.now() - last) / 1000;
      if (since < 120) return { error: 'fail' };   // 진짜 서버처럼 이유를 알려 주지 않음
      d.tokLast = d.tokLast || {}; d.tokLast[tok] = Date.now();
      d.nicks[id] = tok;
      let c = d.clears.find(x => x.mode === mode && x.id === id);
      if (c) { c.count++; c.last = Date.now(); } else d.clears.push(c = { mode, id, count: 1, first: Date.now(), last: Date.now() });
      mock.save(d);
      return { ok: true, id, name: N.text(N.parse(id)), count: c.count };
    }
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function api(action, args) {
    if (test) { await wait(250); return action === 'list' ? mock.list() : action === 'check' ? mock.check(args.id) : mock.register(args.id, args.mode, token); }
    if (action === 'register') {
      // text/plain 으로 보내야 브라우저가 미리 묻지 않는다 (Apps Script는 preflight를 받지 못함)
      const r = await fetch(url, { method: 'POST', body: JSON.stringify({ action, id: args.id, mode: args.mode, token }) });
      return r.json();
    }
    const q = action === 'check' ? `?action=check&id=${encodeURIComponent(args.id)}` : '?action=list';
    const r = await fetch(url + q);
    return r.json();
  }
  async function refresh() {
    if (!enabled()) return board;
    try {
      const r = await api('list');
      if (r && r.board) { board = r.board; store.set('boardCache', board); }
    } catch (e) { /* 연결이 안 되면 마지막으로 받은 명단을 그대로 */ }
    return board;
  }

  /* ---------- 별 ---------- */
  const stars = c => c <= 5 ? '★'.repeat(c) : '★×' + c;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* ---------- 등록 창: 내 닉네임 다시 쓰기 / 새 닉네임 만들기(슬롯머신) ---------- */
  let reg = null;   // { mode, name, pick: [a,b,c,d] | null 들, step, avail, key }
  let lastKey = null;   // 이미 이름을 올린 탈출 (같은 탈출로 두 번 올리지 않게)
  function openRegister(modeId, clearKey) {
    const m = modes.find(x => x.id === modeId); if (!m) return;
    if (!enabled()) return;
    reg = { mode: m.id, name: m.name, pick: [null, null, null, null], step: 0, avail: null, busy: false, done: clearKey != null && clearKey === lastKey, key: clearKey };
    $('nickSkip').textContent = reg.done ? '닫기' : '다음에 할게요';
    hooks.onOpen && hooks.onOpen();
    $('nickTitle').textContent = isMys(m.id) ? '🏆 탈출자 명단에 이름 올리기' : '🏆 정복자 명단에 이름 올리기';
    $('nickSub').innerHTML = isMys(m.id) ? '미스터리 역사 박물관을 탈출했어요! 탈출자 명단에 이름을 올릴까요?'
      : `「${esc(m.name)}」을(를) 탈출했어요! 정복자 명단에 이름을 올릴까요?`;
    $('nickMsg').className = 'nick-msg'; $('nickMsg').textContent = reg.done ? '이번 탈출은 이미 정복자 명단에 올렸어요.' : '';
    renderMine(); renderSlots(); renderWords(); renderState();
    $('nickPop').classList.add('on');
  }
  function closeRegister() {
    $('nickPop').classList.remove('on');
    reg = null;
    hooks.onClose && hooks.onClose();
  }
  function renderMine() {
    const mine = myNicks();
    $('nickMine').innerHTML = mine.length
      ? `<div class="nick-h">내 닉네임으로 올리기</div>` + mine.map(m => `<button class="nick-mine" data-id="${m.id}">${esc(m.n)}</button>`).join('')
        + `<div class="nick-h" style="margin-top:12px">또는 새 닉네임 만들기</div>`
      : `<div class="nick-h">닉네임 만들기 <small>(4가지를 골라 조합해요)</small></div>`;
    $('nickMine').querySelectorAll('.nick-mine').forEach(b => { b.onclick = () => submit(b.dataset.id); });
  }
  function renderSlots() {
    $('nickSlots').innerHTML = N.STEPS.map((s, k) => {
      const w = reg.pick[k] == null ? '?' : W[s.key][reg.pick[k]];
      return `<button class="nslot${reg.step === k ? ' on' : ''}${reg.pick[k] == null ? ' empty' : ''}" data-k="${k}"><small>${k + 1}. ${s.label}</small><b>${esc(w)}</b></button>`;
    }).join('');
    $('nickSlots').querySelectorAll('.nslot').forEach(b => { b.onclick = () => { reg.step = +b.dataset.k; renderSlots(); renderWords(); }; });
    const full = reg.pick.every(v => v != null);
    $('nickPreview').textContent = full ? N.text(reg.pick) : '닉네임을 골라 주세요';
    $('nickPreview').classList.toggle('empty', !full);
  }
  function renderWords() {
    const s = N.STEPS[reg.step];
    $('nickWords').innerHTML = `<button class="nword dice" data-r="1">🎲 아무거나</button>` +
      W[s.key].map((w, i) => `<button class="nword${reg.pick[reg.step] === i ? ' sel' : ''}" data-i="${i}">${esc(w)}</button>`).join('');
    $('nickWords').scrollTop = 0;
    $('nickWords').querySelectorAll('.nword').forEach(b => {
      b.onclick = () => {
        const i = b.dataset.r ? Math.floor(Math.random() * W[s.key].length) : +b.dataset.i;
        choose(reg.step, i, true);
      };
    });
  }
  function choose(k, i, next) {
    reg.pick[k] = i;
    if (next) { const e = reg.pick.findIndex(v => v == null); if (e >= 0) reg.step = e; }
    renderSlots(); renderWords(); checkAvail();
  }
  // 🎰 모두 돌리기: 네 칸이 차례로 멈춘다
  function spin() {
    if (!reg || reg.busy) return;
    reg.busy = true;
    const t0 = Date.now(), stops = [700, 1000, 1300, 1600];
    const timer = setInterval(() => {
      if (!reg) return clearInterval(timer);
      const now = Date.now() - t0;
      N.STEPS.forEach((s, k) => { if (now < stops[k]) reg.pick[k] = Math.floor(Math.random() * W[s.key].length); });
      renderSlots();
      if (now >= stops[3]) { clearInterval(timer); reg.busy = false; renderWords(); checkAvail(); }
    }, 70);
  }
  let checkSeq = 0;
  async function checkAvail() {
    reg.avail = null; renderState();
    if (!reg.pick.every(v => v != null)) return;
    const id = N.id(reg.pick), my = ++checkSeq;
    if (isMine(id)) { reg.avail = 'mine'; return renderState(); }
    reg.avail = 'checking'; renderState();
    try {
      const r = await api('check', { id });
      if (my !== checkSeq || !reg) return;
      reg.avail = r.taken ? 'taken' : 'free';
    } catch (e) { if (my === checkSeq && reg) reg.avail = 'offline'; }
    renderState();
  }
  function renderState() {
    if (!reg) return;
    const st = $('nickState'), ok = $('nickOk');
    const msg = { checking: '확인하는 중…', free: '✔ 사용할 수 있는 닉네임이에요', taken: '✖ 이미 누가 쓰고 있어요. 다른 조합을 골라 주세요', mine: '✔ 내가 만든 닉네임이에요', offline: '인터넷 연결을 확인해 주세요' };
    st.textContent = msg[reg.avail] || '';
    st.className = 'nick-state ' + (reg.avail === 'taken' || reg.avail === 'offline' ? 'bad' : reg.avail === 'free' || reg.avail === 'mine' ? 'good' : '');
    ok.disabled = !(reg.avail === 'free' || reg.avail === 'mine') || reg.busy || reg.done;
  }
  async function submit(id) {
    if (!reg || reg.done) return;
    const msg = $('nickMsg');
    msg.className = 'nick-msg'; msg.textContent = '명단에 올리는 중…';
    $('nickOk').disabled = true;
    try {
      const r = await api('register', { id, mode: reg.mode });
      if (r.error === 'taken') { msg.className = 'nick-msg bad'; msg.textContent = '그 닉네임은 다른 친구가 먼저 만들었어요. 다른 조합을 골라 주세요.'; reg.avail = 'taken'; renderState(); return; }
      if (!r.ok) throw new Error('fail');
      if (!isMine(id)) { const l = myNicks(); l.unshift({ id, n: r.name || N.text(N.parse(id)) }); store.set('myNicks', l.slice(0, 20)); }
      reg.done = true; lastKey = reg.key;
      msg.className = 'nick-msg good';
      msg.innerHTML = `🏆 <b>${esc(r.name || N.text(N.parse(id)))}</b> — ${esc(listName({ id: reg.mode, name: reg.name }))}에 올랐어요! <span class="stars">${stars(r.count || 1)}</span>`;
      $('nickSkip').textContent = '닫기';
      refresh().then(b => hooks.onBoard && hooks.onBoard(b));
    } catch (e) {
      msg.className = 'nick-msg bad'; msg.textContent = '올리지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
      renderState();
    }
  }

  /* ---------- 명단 보기와 닉네임 찾기 ---------- */
  let listMode = null;
  function openList(modeId) {
    listMode = modeId;
    hooks.onOpen && hooks.onOpen();
    const m = modes.find(x => x.id === modeId);
    $('conqTitle').textContent = m ? listName(m) : '정복자 명단';
    $('conqSearch').value = ''; $('conqAll').checked = false;
    renderList();
    $('conqPop').classList.add('on');
    if (!enabled()) return;
    refresh().then(b => { hooks.onBoard && hooks.onBoard(b); if (listMode === modeId) renderList(); });
  }
  function closeList() { $('conqPop').classList.remove('on'); listMode = null; hooks.onClose && hooks.onClose(); }
  function renderList() {
    const q = $('conqSearch').value.trim().replace(/\s+/g, ' ');
    const all = $('conqAll').checked;
    const box = $('conqList');
    if (!enabled()) { box.innerHTML = `<p class="conq-empty">정복자 명단이 아직 연결되지 않았어요.<br>(선생님 설정이 필요해요)</p>`; $('conqFoot').textContent = ''; return; }
    if (!board) { box.innerHTML = `<p class="conq-empty">명단을 불러오는 중…</p>`; return; }
    const match = r => !q || r.n.includes(q);
    if (all && q) {
      const hits = [];
      modes.forEach(m => (board[m.id] || []).forEach(r => { if (match(r)) hits.push({ m, r }); }));
      box.innerHTML = hits.length ? hits.map(({ m, r }) => `<div class="conq-row${isMine(r.id) ? ' mine' : ''}"><span class="cn">${esc(r.n)}</span><span class="cm">${esc(isMys(m.id) ? '미스터리 역사 박물관 탈출' : m.name)}</span><span class="stars">${stars(r.c)}</span></div>`).join('')
        : `<p class="conq-empty">“${esc(q)}”이(가) 들어간 정복자가 없어요.</p>`;
      $('conqFoot').textContent = `모든 전시실에서 ${hits.length}명 찾음`;
      return;
    }
    const rows = (board[listMode] || []);
    const shown = rows.filter(match);
    box.innerHTML = shown.length ? shown.map((r, i) => `<div class="conq-row${isMine(r.id) ? ' mine' : ''}"><span class="rk">${rows.indexOf(r) + 1}</span><span class="cn">${esc(r.n)}</span><span class="stars">${stars(r.c)}</span></div>`).join('')
      : `<p class="conq-empty">${q ? `“${esc(q)}”이(가) 들어간 ${isMys(listMode) ? '탈출자' : '정복자'}가 없어요.` : `아직 ${isMys(listMode) ? '탈출자' : '정복자'}가 없습니다.`}</p>`;
    $('conqFoot').textContent = `${isMys(listMode) ? '탈출자' : '정복자'} ${rows.length}명 · ★ 하나가 탈출 한 번` + (myNicks().length ? ' · 노란 줄이 내 닉네임' : '');
  }

  function init(opts) {
    modes = opts.modes; hooks = opts;
    $('nickSpin').onclick = spin;
    $('nickOk').onclick = () => { if (reg && reg.pick.every(v => v != null)) submit(N.id(reg.pick)); };
    $('nickSkip').onclick = closeRegister;
    $('conqClose').onclick = closeList;
    $('conqSearch').oninput = renderList;
    $('conqAll').onchange = renderList;
    $('conqPop').addEventListener('keydown', e => e.stopPropagation());
  }

  window.BOARD = { init, refresh, openRegister, openList, enabled, cached: () => board, stars, isMine, mine: myNicks };
})();
