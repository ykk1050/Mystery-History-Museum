#!/usr/bin/env bash
# 해설사 대사(js/data.js)를 음성 파일로 다시 만든다.
#   1) 한국어 음성(Microsoft Heami)으로 녹음 → wav
#   2) tools/encode_voice.sh 로 시대별 목소리(voice/)와 밝은 목소리(voice_bright/) mp3로 변환
# 필요한 것: Windows(한국어 음성 'Microsoft Heami'), node, ffmpeg
# 사용법: 저장소 폴더에서  bash tools/make_voice.sh
set -e
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"

node -e "
global.window = {}; require('./js/data.js');
const out = [];
window.ROOMS.forEach(r => {
  out.push({ id: r.id, text: r.exhibits.docent.speech });
  r.anomalies.forEach(a => { if (a.patch.speech) out.push({ id: a.id, text: a.patch.speech }); });
});
require('fs').writeFileSync('$TMP/lines.json', JSON.stringify(out), 'utf8');
"

powershell -NoProfile -ExecutionPolicy Bypass -File tools/tts.ps1 -Lines "$(cygpath -w "$TMP/lines.json")" -OutDir "$(cygpath -w "$TMP/wav")"

bash tools/encode_voice.sh "$TMP/wav"
rm -rf "$TMP"
