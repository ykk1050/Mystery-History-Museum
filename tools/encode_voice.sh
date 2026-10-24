#!/usr/bin/env bash
# 녹음 원본(wav)을 게임용 음성(mp3)으로 바꾼다.
#   voice/        으스스한 박물관 — 전시실(시대)마다 다른 목소리
#   voice_bright/ 밝은 박물관 — 밝고 또렷한 목소리
# 파일 이름이 전시실 ID로 시작한다 (예: neo.mp3, neo.doc_alone.mp3) → 앞부분으로 시대를 고른다.
# 사용법: bash tools/encode_voice.sh <wav 폴더>
set -e
cd "$(dirname "$0")/.."
WAV="$1"
FF="${FFMPEG:-ffmpeg}"
mkdir -p voice voice_bright

era_filter() {
  case "$1" in
    paleo)    echo "asetrate=22050*0.80,aresample=22050,atempo=1.12,lowpass=f=3200,aecho=0.8:0.7:120|260:0.35|0.2,loudnorm=I=-21:TP=-2,aresample=22050" ;;      # 동굴 메아리
    neo)      echo "atempo=0.95,tremolo=f=5:d=0.35,highpass=f=250,lowpass=f=4000,aecho=0.8:0.5:40:0.3,loudnorm=I=-21:TP=-2,aresample=22050" ;;                  # 물결처럼 떨림
    bronze)   echo "asetrate=22050*0.92,aresample=22050,aecho=0.6:0.6:12|19:0.55|0.4,aphaser,loudnorm=I=-21:TP=-2,aresample=22050" ;;                           # 쇠가 울리는 금속성
    gojoseon) echo "asetrate=22050*0.70,aresample=22050,atempo=1.18,lowpass=f=2400,acompressor,loudnorm=I=-21:TP=-2,aresample=22050" ;;                          # 아주 낮고 굵게
    samguk)   echo "asetrate=22050*0.84,aresample=22050,atempo=1.1,acompressor,aecho=0.8:0.4:60:0.2,loudnorm=I=-21:TP=-2,aresample=22050" ;;                    # 낮고 단단한 호령
    samlife)  echo "asetrate=22050*0.95,aresample=22050,highpass=f=400,lowpass=f=2800,aecho=0.8:0.8:180|400:0.4|0.25,loudnorm=I=-21:TP=-2,aresample=22050" ;;    # 고분 속 텅 빈 울림
    unified)  echo "asetrate=22050*0.78,aresample=22050,atempo=0.92,lowpass=f=3000,aecho=0.8:0.6:30:0.4,loudnorm=I=-21:TP=-2,aresample=22050" ;;                 # 느리고 돌처럼 무겁게
    goryeo1)  echo "asetrate=22050*0.93,aresample=22050,chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,aecho=0.8:0.6:90:0.25,loudnorm=I=-21:TP=-2,aresample=22050" ;; # 여러 겹으로 겹친 목소리
    goryeo2)  echo "asetrate=22050*0.90,aresample=22050,vibrato=f=3:d=0.12,aphaser=type=t:speed=0.6,lowpass=f=3500,aecho=0.8:0.5:70:0.25,loudnorm=I=-21:TP=-2,aresample=22050" ;;   # 흔들리고 일렁임
    *)        echo "asetrate=22050*0.86,aresample=22050,atempo=1.08,lowpass=f=3800,aecho=0.8:0.6:70|190:0.22|0.12,loudnorm=I=-21:TP=-2,aresample=22050" ;;
  esac
}

n=0
for f in "$WAV"/*.wav; do
  name="$(basename "$f" .wav)"
  era="${name%%.*}"
  "$FF" -loglevel error -y -i "$f" -af "$(era_filter "$era")" -ac 1 -b:a 48k "voice/$name.mp3"
  "$FF" -loglevel error -y -i "$f" -af "asetrate=22050*1.04,aresample=22050,atempo=1.05,loudnorm=I=-21:TP=-2,aresample=22050" -ac 1 -b:a 48k "voice_bright/$name.mp3"
  n=$((n+1))
done
echo "음성 파일 ${n}개씩 만들었습니다 (voice/, voice_bright/)"
