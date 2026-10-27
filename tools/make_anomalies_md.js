// js/data.js 에서 교사용 이상 현상 목록(ANOMALIES.md)을 다시 만든다.
// 사용: node tools/make_anomalies_md.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'));

const KIND = { tag: '시대·나라 표시', title: '이름', sub: '부제', lines: '설명 문장', visual: '그림', speech: '해설사 말' };
const kindOf = a => {
  const keys = Object.keys(a.patch || {});
  const k = ['speech', 'visual', 'lines', 'tag', 'title', 'sub'].find(x => keys.includes(x));
  return KIND[k] || '설명 문장';
};
const cell = t => String(t).replace(/\|/g, '\\|');

let out = `# 이상 현상 전체 목록

교사용 참고 자료입니다. 게임에 나오는 이상 현상 ${window.ANOMALIES.length}개를 전시실 주제별로 정리했습니다.
(\`node tools/make_anomalies_md.js\` 로 js/data.js 에서 다시 만들 수 있습니다.)

- **유형**: 시대·나라 표시 / 이름 / 부제 / 설명 문장 / 그림 / 해설사 말
- **ID**: 주소 뒤에 \`?test=ID\`를 붙이면 그 이상 현상을 바로 확인할 수 있습니다.
`;
window.ROOMS.forEach((r, no) => {
  out += `\n## ${no + 1}. ${r.name} (${r.anomalies.length}개)\n\n| # | 전시물 | 유형 | 이상한 점 | 교과서 속 사실 | ID |\n|---|---|---|---|---|---|\n`;
  r.anomalies.forEach((a, i) => {
    const ex = r.exhibits[a.target];
    const name = a.target === 'docent' ? '해설사' : ex.title;
    out += `| ${i + 1} | ${cell(name)} | ${kindOf(a)} | ${cell(a.wrong)} | ${cell(a.right)} | \`${a.id}\` |\n`;
  });
});
fs.writeFileSync(path.join(root, 'ANOMALIES.md'), out);
console.log('ANOMALIES.md:', window.ANOMALIES.length);
