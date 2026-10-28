// 다른 게임에 쓸 '조합형 닉네임 + 명단' AI 지시용 참고서(NICKNAME_SYSTEM_GUIDE.md)를 만든다.
// 단어 목록은 js/nickwords.js 에서 그대로 가져온다.  사용: node tools/make_nickname_guide.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'js/nickwords.js'), 'utf8'));
const W = window.NICK_WORDS, steps = window.NICK.STEPS;
const sizes = steps.map(s => W[s.key].length);
const wordsJs = '{\n' + steps.map(s => `  ${s.key}: ${JSON.stringify(W[s.key])}`).join(',\n') + '\n}';
const counts = steps.map((s, k) => `${s.label} ${sizes[k]}개`).join(' × ') + ` = **${sizes.reduce((a, b) => a * b, 1).toLocaleString('en-US')}가지**`;
const md = fs.readFileSync(path.join(__dirname, 'nickname_guide_template.md'), 'utf8')
  .replace('{{WORDS_JS}}', wordsJs)
  .replace('{{SIZES}}', JSON.stringify(sizes))
  .replace('{{WORDS_ARRAY}}', JSON.stringify(steps.map(s => W[s.key])))
  .replace('{{COUNTS}}', counts);
fs.writeFileSync(path.join(root, 'NICKNAME_SYSTEM_GUIDE.md'), md);
console.log('NICKNAME_SYSTEM_GUIDE.md', md.length, 'chars');
