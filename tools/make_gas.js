// 정복자 명단용 구글 Apps Script 코드(apps-script/Code.gs)를 만든다. 닉네임 단어 수를 js/nickwords.js 에서 가져온다.
// 사용: node tools/make_gas.js  → apps-script/Code.gs 내용을 Apps Script 편집기에 붙여 넣기
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'js/nickwords.js'), 'utf8'));
const W = window.NICK_WORDS;
const sizes = window.NICK.STEPS.map(s => W[s.key].length);

const code = `/* 미스터리 역사 박물관 ─ 정복자 명단 (구글 스프레드시트 + Apps Script)
   이 파일은 tools/make_gas.js 로 만들어졌습니다. 직접 고치지 말고 다시 만드세요.
   - 닉네임은 정해진 단어 번호 4개(예: 2-0-3-1)로만 받습니다 → 아무 글자나 저장될 수 없습니다.
   - 시트 'nicknames': 닉네임 번호 | 닉네임 | 만든 기기 표시 | 만든 때
   - 시트 'clears'   : 전시실 | 닉네임 번호 | 닉네임 | 탈출 횟수 | 처음 탈출 | 마지막 탈출
   부적절하다고 생각되는 줄은 시트에서 지우면 명단에서 사라집니다. */
const SIZES = ${JSON.stringify(sizes)};
const WORDS = ${JSON.stringify(window.NICK.STEPS.map(s => W[s.key]))};
const MODES = ['mystery', 'era0', 'era1', 'era2', 'era3', 'era4', 'era5', 'era6', 'era7', 'era8'];

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
const nickSheet_ = () => sheet_('nicknames', ['닉네임 번호', '닉네임', '만든 기기 표시', '만든 때']);
const clearSheet_ = () => sheet_('clears', ['전시실', '닉네임 번호', '닉네임', '탈출 횟수', '처음 탈출', '마지막 탈출']);
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function parse_(id) {
  const ix = String(id || '').split('-').map(Number);
  if (ix.length !== 4 || !ix.every((n, k) => Number.isInteger(n) && n >= 0 && n < SIZES[k])) return null;
  return ix;
}
const text_ = ix => ix.map((n, k) => WORDS[k][n]).join(' ');
function findRow_(sh, test) {
  const v = sh.getDataRange().getValues();
  for (let r = 1; r < v.length; r++) if (test(v[r])) return { row: r + 1, values: v[r] };
  return null;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'check') {
    const ix = parse_(p.id); if (!ix) return out_({ error: 'bad' });
    return out_({ taken: !!findRow_(nickSheet_(), v => String(v[0]) === p.id) });
  }
  // 기본: 전시실별 정복자 명단
  const v = clearSheet_().getDataRange().getValues();
  const board = {};
  MODES.forEach(m => { board[m] = []; });
  for (let r = 1; r < v.length; r++) {
    const [mode, id, , count, first] = v[r];
    const ix = parse_(id);
    if (!board[mode] || !ix) continue;
    board[mode].push({ id: String(id), n: text_(ix), c: Number(count) || 1, t: first ? new Date(first).getTime() : 0 });
  }
  MODES.forEach(m => board[m].sort((a, b) => b.c - a.c || a.t - b.t));
  return out_({ board });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (er) { return out_({ error: 'bad' }); }
  if (body.action !== 'register') return out_({ error: 'bad' });
  const ix = parse_(body.id), token = String(body.token || '').slice(0, 64);
  if (!ix || !token || MODES.indexOf(body.mode) < 0) return out_({ error: 'bad' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = ix.join('-'), name = text_(ix), now = new Date();
    const ns = nickSheet_();
    const nick = findRow_(ns, v => String(v[0]) === id);
    if (nick && String(nick.values[2]) !== token) return out_({ error: 'taken' });   // 다른 사람이 만든 닉네임
    if (!nick) ns.appendRow([id, name, token, now]);
    const cs = clearSheet_();
    const row = findRow_(cs, v => v[0] === body.mode && String(v[1]) === id);
    let count = 1;
    if (row) { count = (Number(row.values[3]) || 0) + 1; cs.getRange(row.row, 4).setValue(count); cs.getRange(row.row, 6).setValue(now); }
    else cs.appendRow([body.mode, id, name, 1, now, now]);
    return out_({ ok: true, id, name, count });
  } finally { lock.releaseLock(); }
}
`;
fs.mkdirSync(path.join(root, 'apps-script'), { recursive: true });
fs.writeFileSync(path.join(root, 'apps-script/Code.gs'), code);
console.log('apps-script/Code.gs written', sizes);
