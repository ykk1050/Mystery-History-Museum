# 조합형 닉네임 + 명단(랭킹) 시스템 — AI에게 줄 설계 참고서

> **이 문서 쓰는 법**
> 다른 AI 대화창에 이 문서를 **통째로 붙여 넣고**, 맨 아래에 이렇게 덧붙이세요.
> 「위 설계 그대로 **[내 게임 이름/파일]** 에 닉네임 등록과 명단 기능을 넣어 줘. 명단 단위(BOARDS)는 **[스테이지1, 스테이지2 …]** 야.」
> (「미스터리 역사 박물관」 게임에서 실제로 만들어 학생들이 쓰고 있는 방식입니다.)

---

## 1. 목표와 꼭 지킬 원칙

초등학생이 게임을 클리어하면 **닉네임으로 명단(명예의 전당)에 이름을 올리는** 기능.

1. **자유 입력 금지** — 학생은 글자를 직접 치지 않는다. 미리 정한 단어 버튼만 골라 닉네임을 **조합**한다.
   → 실명·학교·반 같은 **개인정보**와 **욕설·이상한 말**이 원천적으로 들어갈 수 없다.
2. **4단계 조합**: `[색] + [좋아하는 것] + [모습] + [캐릭터]`
   예) 황금빛 + 보드게임 즐기는 + 위풍당당한 + 드래곤 → **황금빛 보드게임 즐기는 위풍당당한 드래곤**
3. **저장·전송은 단어 번호로만** — 닉네임은 `2-0-3-1` 같은 **번호 4개**로 서버에 보낸다. 서버도 번호가 범위 안인지만 확인하고 글자는 서버가 직접 만든다. (F12로 조작해도 아무 글자나 넣을 수 없음)
4. **중복 금지** — 이미 누가 만든 닉네임은 다른 기기에서 쓸 수 없다(모든 명단 공통).
5. **내 닉네임 다시 쓰기** — 이 기기에서 만든 닉네임은 기억해 두었다가 다음 클리어 때 버튼 한 번으로 다시 등록.
6. **별(★)** — 같은 닉네임이 같은 명단에 다시 등록될 때마다 ★ 하나 추가. 5개까지는 ★★★★★, 6번부터 `★×7`.
7. **한 번 클리어 = 한 번 등록** — 같은 클리어로 두 번 올릴 수 없다.
8. **치팅 방지** — 같은 닉네임·같은 기기는 마지막 등록 뒤 **N초(예: 120초)** 가 지나야 다시 등록. **서버 시계** 기준.
   막을 때 **이유나 남은 시간을 화면에도 서버 응답에도 드러내지 않는다**(일반 실패와 똑같이 `{"error":"fail"}` / "올리지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요."). 단서를 주지 않기 위해서.
9. **무료** — 서버는 선생님의 **구글 스프레드시트 + Apps Script 웹 앱**. 선생님이 시트에서 줄을 지우면 명단에서 사라진다(관리 쉬움).
10. **검색** — 명단 창에서 닉네임 일부 단어로 찾기(그 명단 / 모든 명단).

---

## 2. 단어 목록 (초등학생용, 덧붙이기만 할 것)

- 욕설·신체 부위·폭력·중독·"미친" 같은 표현 없음. 실존 인물·상표 없음.
- 닉네임은 **번호로 저장**되므로 **단어는 맨 뒤에 덧붙이기만** 하고, 순서를 바꾸거나 지우지 않는다(지우면 기존 닉네임이 다른 말로 바뀜).
- 경우의 수: {{COUNTS}}

```js
// nickwords.js — 게임(클라이언트)과 서버(Apps Script)가 똑같은 목록을 써야 한다
window.NICK_WORDS = {{WORDS_JS}};
window.NICK = {
  STEPS: [{ key: 'color', label: '색' }, { key: 'like', label: '좋아하는 것' }, { key: 'mood', label: '모습' }, { key: 'who', label: '캐릭터' }],
  text(ix) { return this.STEPS.map((s, k) => NICK_WORDS[s.key][ix[k]]).join(' '); },   // [a,b,c,d] → 닉네임 글자
  id(ix) { return ix.join('-'); },                                                      // [a,b,c,d] → "a-b-c-d"
  parse(id) {                                                                           // "a-b-c-d" → [a,b,c,d] (범위 밖이면 null)
    const ix = String(id).split('-').map(Number);
    return ix.length === 4 && ix.every((n, k) => Number.isInteger(n) && n >= 0 && n < NICK_WORDS[this.STEPS[k].key].length) ? ix : null;
  }
};
```

---

## 3. 화면 설계

### 3-1. 등록 창 (클리어 직후 자동으로 뜨는 떠 있는 창)
- 제목: "🏆 ○○ 명단에 이름 올리기" / 부제: "「스테이지 이름」을 클리어했어요! 명단에 이름을 올릴까요?"
- **내 닉네임으로 올리기**: 이 기기에서 만든 닉네임이 있으면 맨 위에 버튼으로(누르면 바로 등록).
- **새 닉네임 만들기 (슬롯머신)**
  - 칸 4개: `1. 색 | 2. 좋아하는 것 | 3. 모습 | 4. 캐릭터` — 누르면 그 단계의 단어 버튼들이 아래에 펼쳐짐(스크롤).
  - 단어 목록 맨 앞에 **🎲 아무거나**(그 칸만 무작위). 아래에 **🎰 모두 돌리기**(네 칸이 0.7·1.0·1.3·1.6초에 차례로 멈춤).
    ※ 슬롯 애니메이션은 `requestAnimationFrame` 말고 `setInterval(…, 70)` 로(태블릿에서 화면이 가려져도 멈추지 않게).
  - 네 칸이 다 차면 큰 글씨로 완성된 닉네임 미리보기 + 서버에 **중복 확인** → "✔ 사용할 수 있는 닉네임이에요" / "✖ 이미 누가 쓰고 있어요. 다른 조합을 골라 주세요"(이때 올리기 버튼 잠금) / "✔ 내가 만든 닉네임이에요".
  - **이 닉네임으로 올리기** → 성공: "🏆 (닉네임) — ○○ 명단에 올랐어요! ★★".
  - **다음에 할게요**(닫기). 결과 화면에 "🏆 명단에 올리기" 버튼을 두어 다시 열 수 있게(같은 클리어면 "이번 클리어는 이미 올렸어요" + 버튼 잠금).
  - 안내: "이름 대신 단어를 골라 만든 닉네임만 쓸 수 있어요. 내가 만든 닉네임은 이 기기에서 다시 쓸 수 있어요."
- 무서운/긴 연출이 있는 게임이면, 연출이 끝난 뒤에 등록 창을 띄운다.

### 3-2. 명단판 (게임 화면 속)
- 명단마다 판 하나: 맨 위 **명단 이름**(스테이지 이름), 그 아래 "정복자 명단 · ○명", 위 7명(★ 많은 순 → 먼저 등록한 순), 맨 아래 "눌러서 전체 보기 · 닉네임 찾기".
- 긴 닉네임은 글자를 조금 줄이고, 그래도 길면 두 줄로.

### 3-3. 명단 창 (판을 누르면)
- 오른쪽 위 **✕** 닫기. 검색칸 "🔍 닉네임 찾기 (예: 펭귄)" + "모든 명단에서 찾기" 체크.
- 줄마다: 순위 · 닉네임 · ★. **내 닉네임 줄은 노란 배경**. 아래: "○명 · ★ 하나가 클리어 한 번".
- 검색칸에 글자를 칠 때 게임 조작(W/A/S/D 등)이 같이 먹지 않게 키 입력을 막는다.

---

## 4. 서버: 구글 스프레드시트 + Apps Script

### 시트 (자동 생성)
- `nicknames`: 닉네임 번호 | 닉네임 | 만든 기기 표시(token) | 만든 때
- `clears`: 명단(보드) | 닉네임 번호 | 닉네임 | 횟수 | 처음 | 마지막

### API (웹 앱 주소 하나)
| 요청 | 하는 일 | 응답 |
|---|---|---|
| `GET ?action=list` | 모든 명단 | `{ board: { 보드: [{ id, n, c, t }] } }` (★ 많은 순 → 처음 등록 순) |
| `GET ?action=check&id=a-b-c-d` | 중복 확인 | `{ taken: true/false }` |
| `POST` 본문 `{"action":"register","id":"a-b-c-d","mode":"보드","token":"…"}` | 등록(없으면 닉네임 생성) + 횟수 +1 | `{ ok, id, name, count }` / 남의 닉네임 `{ error:'taken' }` / 그 밖(간격 제한 포함) `{ error:'fail' }` |

### Code.gs (그대로 붙여 넣고 `BOARDS`만 내 게임에 맞게)
```js
const SIZES = {{SIZES}};
const WORDS = {{WORDS_ARRAY}};
const BOARDS = ['stage1', 'stage2', 'stage3'];   // ← 내 게임의 명단(보드) 이름들
const MIN_GAP = 120;                              // 같은 닉네임·같은 기기 재등록 최소 간격(초). 한 판을 깨는 가장 짧은 시간보다 짧게

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
const nickSheet_ = () => sheet_('nicknames', ['닉네임 번호', '닉네임', '만든 기기 표시', '만든 때']);
const clearSheet_ = () => sheet_('clears', ['명단', '닉네임 번호', '닉네임', '횟수', '처음', '마지막']);
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
    if (!parse_(p.id)) return out_({ error: 'fail' });
    return out_({ taken: !!findRow_(nickSheet_(), v => String(v[0]) === p.id) });
  }
  const v = clearSheet_().getDataRange().getValues(), board = {};
  BOARDS.forEach(b => { board[b] = []; });
  for (let r = 1; r < v.length; r++) {
    const [b, id, , count, first] = v[r], ix = parse_(id);
    if (!board[b] || !ix) continue;
    board[b].push({ id: String(id), n: text_(ix), c: Number(count) || 1, t: first ? new Date(first).getTime() : 0 });
  }
  BOARDS.forEach(b => board[b].sort((a, c) => c.c - a.c || a.t - c.t));
  return out_({ board });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (er) { return out_({ error: 'fail' }); }
  const ix = parse_(body.id), token = String(body.token || '').slice(0, 64);
  if (body.action !== 'register' || !ix || !token || BOARDS.indexOf(body.mode) < 0) return out_({ error: 'fail' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = ix.join('-'), name = text_(ix), now = new Date();
    const ns = nickSheet_(), nick = findRow_(ns, v => String(v[0]) === id);
    if (nick && String(nick.values[2]) !== token) return out_({ error: 'taken' });   // 다른 기기가 만든 닉네임
    // 너무 빨리 다시 올리면 거절 — 이유·남은 시간은 알려 주지 않는다
    const cache = CacheService.getScriptCache(), cs = clearSheet_();
    let last = 0;
    const all = cs.getDataRange().getValues();
    for (let r = 1; r < all.length; r++) if (String(all[r][1]) === id && all[r][5]) last = Math.max(last, new Date(all[r][5]).getTime());
    const since = (now.getTime() - Math.max(last, Number(cache.get('t:' + token) || 0))) / 1000;
    if (since < MIN_GAP) return out_({ error: 'fail' });
    cache.put('t:' + token, String(now.getTime()), MIN_GAP + 30);
    if (!nick) ns.appendRow([id, name, token, now]);
    const row = findRow_(cs, v => v[0] === body.mode && String(v[1]) === id);
    let count = 1;
    if (row) { count = (Number(row.values[3]) || 0) + 1; cs.getRange(row.row, 4).setValue(count); cs.getRange(row.row, 6).setValue(now); }
    else cs.appendRow([body.mode, id, name, 1, now, now]);
    return out_({ ok: true, id, name, count });
  } finally { lock.releaseLock(); }
}
```
※ `SIZES`/`WORDS` 는 2번의 단어 목록과 **완전히 같아야** 한다(단어를 덧붙이면 둘 다 고치고 Apps Script를 새 버전으로 다시 배포).

---

## 5. 게임(클라이언트) 쪽 핵심 코드

```js
const BOARD_URL = 'https://script.google.com/macros/s/…/exec';   // 선생님이 배포한 웹 앱 주소 (비우면 기능 숨김)
const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
// 이 기기 표시: 처음 한 번 임의로 만들어 두고 계속 씀 (개인정보 아님)
let token = ls.get('nickToken', null);
if (!token) { token = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set('nickToken', token); }
const myNicks = () => ls.get('myNicks', []);              // [{ id, n }] — 이 기기에서 만든 닉네임

async function listBoards() { const r = await fetch(BOARD_URL + '?action=list'); return (await r.json()).board; }
async function checkNick(id) { const r = await fetch(BOARD_URL + '?action=check&id=' + encodeURIComponent(id)); return (await r.json()).taken; }
async function registerNick(id, mode) {
  // ⚠ headers 를 넣지 말 것: 본문이 text/plain 이어야 브라우저가 사전 요청(preflight)을 안 보내고, Apps Script도 받는다
  const r = await fetch(BOARD_URL, { method: 'POST', body: JSON.stringify({ action: 'register', id, mode, token }) });
  return r.json();   // { ok, name, count } | { error: 'taken' } | { error: 'fail' }
}
// 성공하면 내 닉네임에 기억:  if (!myNicks().some(m => m.id === id)) ls.set('myNicks', [{ id, n: r.name }, ...myNicks()].slice(0, 20));
// 실패(fail·연결 오류)는 모두 같은 문구:  "올리지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요."
// 별 표시:  const stars = c => c <= 5 ? '★'.repeat(c) : '★×' + c;
// 받은 명단은 localStorage에 저장해 두고(연결이 끊겨도 마지막 명단을 보여 줌), 명단 화면에 들어올 때마다 새로 받기.
```

**시험용 가짜 서버**: 주소에 `?boardtest=1` 이 있으면 위 세 함수가 서버 대신 localStorage에 같은 규칙(중복·간격·별)으로 저장하게 만들어 두면, 시트를 건드리지 않고 화면을 시험할 수 있다.

---

## 6. 선생님이 할 일 (배포 순서)

1. 구글 드라이브 → **새 스프레드시트** → 확장 프로그램 → **Apps Script**.
2. `Code.gs` 를 위 코드로 바꾸고(`BOARDS` 수정) 저장.
3. **배포 → 새 배포 → 유형: 웹 앱** / 실행: **나** / 액세스: **모든 사용자** → 배포 → 권한 허용
   ("확인하지 않은 앱" 화면이면 고급 → 이동).
4. 나온 **웹 앱 URL**을 게임의 `BOARD_URL` 에 넣는다.
5. 코드를 고친 뒤에는 **배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포** (주소 그대로).
6. 관리: 부적절한 줄은 시트에서 **행 삭제**. `nicknames` 줄을 지우면 그 닉네임을 다시 만들 수 있다(기기를 바꾼 학생 구제).

---

## 7. 만든 뒤 확인할 것

- [ ] 글자를 직접 칠 수 있는 칸이 등록 창에 하나도 없다 (검색칸만 예외).
- [ ] 범위 밖 번호(`999-0-0-0`)를 보내면 서버가 거절한다.
- [ ] 다른 기기 표시로 같은 닉네임을 보내면 `taken`.
- [ ] 같은 클리어로 두 번 못 올린다. 120초 안에 다시 보내면 `fail`(이유 노출 없음).
- [ ] 다시 클리어해서 "내 닉네임으로 올리기" → ★가 하나 늘어난다.
- [ ] 명단판·명단 창·검색(그 명단 / 모든 명단)이 맞게 나온다. 내 닉네임 줄은 노란색.
- [ ] 연결이 끊겨도 게임이 멈추지 않고, 마지막으로 받은 명단을 보여 준다.
