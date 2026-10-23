#!/usr/bin/env bash
# 해설사 대사(js/data.js)를 음성 파일(voice/*.mp3)로 다시 만든다.
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

mkdir -p voice
for f in "$TMP"/wav/*.wav; do
  # 목소리를 조금 낮추고 울림을 더해 으스스하게
  ffmpeg -loglevel error -y -i "$f" \
    -af "asetrate=22050*0.86,aresample=22050,atempo=1.08,lowpass=f=3800,aecho=0.8:0.6:70|190:0.22|0.12,volume=1.4" \
    -ac 1 -b:a 48k "voice/$(basename "$f" .wav).mp3"
done
rm -rf "$TMP"
echo "voice/ 에 $(ls voice | wc -l)개 파일"
