/* 미스터리 역사 박물관 ─ 정복자 명단 (구글 스프레드시트 + Apps Script)
   이 파일은 tools/make_gas.js 로 만들어졌습니다. 직접 고치지 말고 다시 만드세요.
   - 닉네임은 정해진 단어 번호 4개(예: 2-0-3-1)로만 받습니다 → 아무 글자나 저장될 수 없습니다.
   - 시트 'nicknames': 닉네임 번호 | 닉네임 | 만든 기기 표시 | 만든 때
   - 시트 'clears'   : 전시실 | 닉네임 번호 | 닉네임 | 탈출 횟수 | 처음 탈출 | 마지막 탈출
   부적절하다고 생각되는 줄은 시트에서 지우면 명단에서 사라집니다. */
const SIZES = [48,130,60,100];
const WORDS = [["민트빛","칠흑의","황금빛","파스텔","형광색","보랏빛","투명한","노을빛","하늘빛","은빛","무지갯빛","진홍빛","연둣빛","새하얀","바닷빛","별빛","달빛","햇살빛","복숭앗빛","레몬빛","초록빛","산호빛","라벤더빛","청록빛","구릿빛","샛노란","오로라빛","벚꽃빛","단풍빛","쪽빛","주황빛","우윳빛","크림빛","숲빛","비취빛","호박빛","은하수빛","진주빛","새파란","분홍빛","초콜릿빛","솜사탕빛","봄빛","눈빛","푸른","붉은","하얀","노란"],["보드게임 즐기는","떡볶이 좋아하는","노래 부르는","수학을 사랑하는","야식을 탐내는","코딩하는","젤리 좋아하는","책 읽는","그림 그리는","축구하는","피아노 치는","줄넘기하는","춤추는","요리하는","별을 보는","공룡 박사인","곤충을 관찰하는","식물을 키우는","블록 쌓는","종이접기하는","퍼즐 푸는","역사를 탐험하는","박물관 좋아하는","유물을 찾는","지도를 그리는","여행을 꿈꾸는","수영하는","자전거 타는","농구하는","배드민턴 치는","달리기하는","태권도하는","바둑 두는","체스 두는","만화 그리는","동화를 쓰는","시를 쓰는","일기 쓰는","사진 찍는","우쿨렐레 치는","리코더 부는","드럼 치는","콧노래 부르는","과학 실험하는","로봇 만드는","발명하는","우주를 꿈꾸는","바다를 좋아하는","산을 오르는","캠핑 가는","낚시하는","김밥 싸는","아이스크림 좋아하는","붕어빵 좋아하는","귤 좋아하는","수박 좋아하는","딸기 좋아하는","호떡 좋아하는","쿠키 굽는","핫초코 마시는","라면 끓이는","볶음밥 만드는","고구마 좋아하는","감자 좋아하는","옥수수 좋아하는","팝콘 좋아하는","강아지 좋아하는","고양이 좋아하는","꽃을 가꾸는","구름을 세는","낮잠 자는","수수께끼 내는","퀴즈 푸는","탐정놀이 하는","보물을 찾는","마술하는","노을을 보는","비눗방울 부는","연날리기 하는","눈사람 만드는","줄다리기 하는","팽이 돌리는","공기놀이 하는","제기 차는","윷놀이 하는","딱지 치는","실뜨기 하는","썰매 타는","스케이트 타는","인라인 타는","탁구 치는","야구하는","배구하는","피구하는","등산하는","산책하는","별자리 찾는","돌멩이 모으는","스티커 모으는","우표 모으는","조개 줍는","나뭇잎 모으는","화석을 찾는","고분을 탐사하는","탑을 그리는","도자기 빚는","한자 공부하는","영어 공부하는","받아쓰기 잘하는","구구단 외우는","과일 깎는","샌드위치 만드는","케이크 굽는","주먹밥 만드는","만두 빚는","떡 좋아하는","송편 빚는","수제비 좋아하는","팥빙수 좋아하는","식혜 마시는","기타 치는","바이올린 켜는","하모니카 부는","노래 만드는","동요 부르는","랩 하는","박수 치는","휘파람 부는","실로폰 치는","장구 치는"],["전설의","엉뚱한","느긋한","위풍당당한","수줍은","재빠른","천재적인","씩씩한","용감한","다정한","똑똑한","명랑한","신비로운","차분한","부지런한","호기심 많은","행복한","꿈꾸는","상냥한","활발한","든든한","웃음 많은","친절한","슬기로운","날쌘","침착한","유쾌한","귀여운","멋진","늠름한","끈기 있는","성실한","기운찬","포근한","당당한","지혜로운","상상력 넘치는","꼼꼼한","대담한","졸린","배고픈","빛나는","즐거운","신나는","조용한","평화로운","반가운","사랑스러운","듬직한","재치 있는","센스 있는","깜찍한","총명한","부드러운","튼튼한","날렵한","산뜻한","말랑말랑한","보송보송한","반짝반짝한"],["고양이","드래곤","펭귄","마법사","너구리","해적","탐정","슬라임","개발자","강아지","토끼","다람쥐","판다","수달","고래","돌고래","거북이","부엉이","독수리","여우","사슴","기린","코끼리","사자","호랑이","곰","햄스터","알파카","미어캣","카멜레온","공룡","유니콘","로봇","우주인","기사","탐험가","고고학자","박물관장","역사가","화가","요리사","과학자","발명가","음악가","작가","시인","선장","비행사","정원사","등대지기","우체부","사서","천문학자","마술사","요정","도깨비","해태","봉황","장수풍뎅이","무당벌레","나비","반딧불이","해파리","문어","상어","앵무새","참새","까치","두루미","백조","홍학","코알라","캥거루","고슴도치","두더지","아기 양","아기 염소","망아지","병아리","오리","청설모","물개","바다사자","북극곰","눈표범","치타","얼룩말","하마","낙타","라마","거북선 선장","탐사대장","해설사","큐레이터","복원 전문가","지도 제작자","파수꾼","수호신","용사","모험가"]];
const MODES = ['mystery', 'era0', 'era1', 'era2', 'era3', 'era4', 'era5', 'era6', 'era7', 'era8'];
// 별 부풀리기 막기: 같은 닉네임·같은 기기는 이 시간(초)이 지나야 다시 올릴 수 있다 (전시실 하나를 탈출하는 데 걸리는 가장 짧은 시간보다 짧게)
const MIN_GAP = 120;

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
    // 너무 빨리 다시 올리면 거절 (서버 시계 기준: 기기 시계는 조작할 수 있다)
    const cache = CacheService.getScriptCache();
    let last = 0;
    const cs0 = clearSheet_().getDataRange().getValues();
    for (let r = 1; r < cs0.length; r++) if (String(cs0[r][1]) === id && cs0[r][5]) last = Math.max(last, new Date(cs0[r][5]).getTime());
    const tokLast = Number(cache.get('t:' + token) || 0);
    const since = (now.getTime() - Math.max(last, tokLast)) / 1000;
    if (since < MIN_GAP) return out_({ error: 'tooFast', wait: Math.ceil(MIN_GAP - since) });
    cache.put('t:' + token, String(now.getTime()), MIN_GAP + 30);
    if (!nick) ns.appendRow([id, name, token, now]);
    const cs = clearSheet_();
    const row = findRow_(cs, v => v[0] === body.mode && String(v[1]) === id);
    let count = 1;
    if (row) { count = (Number(row.values[3]) || 0) + 1; cs.getRange(row.row, 4).setValue(count); cs.getRange(row.row, 6).setValue(now); }
    else cs.appendRow([body.mode, id, name, 1, now, now]);
    return out_({ ok: true, id, name, count });
  } finally { lock.releaseLock(); }
}
