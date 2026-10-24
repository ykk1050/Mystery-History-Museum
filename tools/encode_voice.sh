#!/usr/bin/env bash
# 녹음 원본(wav)을 게임용 음성(mp3)으로 바꾼다.
#   voice/        으스스한 박물관 — 전시실(시대)마다 다른 목소리
#   voice_bright/ 밝은 박물관 — 밝고 또렷한 목소리
# 파일 이름이 전시실 ID로 시작한다 (예: neo.mp3, neo.doc_alone.mp3) → 앞부분으로 시대를 고른다.
# 남자 목소리 시대(js/eras.js의 voice: 'male'과 같게): gojoseon samguk unified goryeo1 goryeo2
#   → 원래 음성(여자)의 음 높이만 낮추고 말하는 속도는 되돌린다.
# 사용법: bash tools/encode_voice.sh <wav 폴더>
set -e
cd "$(dirname "$0")/.."
WAV="$1"
FF="${FFMPEG:-ffmpeg}"
mkdir -p voice voice_bright

MALE="asetrate=22050*0.70,aresample=22050,atempo=1.429"   # 음 높이 0.70배, 속도는 그대로
NORM="loudnorm=I=-21:TP=-2,aresample=22050"              # 모든 음성 크기를 같게

is_male() { case "$1" in gojoseon|samguk|unified|goryeo1|goryeo2) return 0 ;; *) return 1 ;; esac; }

era_filter() {
  case "$1" in
    # 여자 목소리
    paleo)    echo "asetrate=22050*0.80,aresample=22050,atempo=1.12,lowpass=f=3200,aecho=0.8:0.7:120|260:0.35|0.2,$NORM" ;;   # 동굴 메아리
    neo)      echo "atempo=0.95,tremolo=f=5:d=0.35,highpass=f=250,lowpass=f=4000,aecho=0.8:0.5:40:0.3,$NORM" ;;               # 물결처럼 떨림
    bronze)   echo "asetrate=22050*0.92,aresample=22050,aecho=0.6:0.6:12|19:0.55|0.4,aphaser,$NORM" ;;                        # 쇠가 울리는 금속성
    samlife)  echo "asetrate=22050*0.95,aresample=22050,highpass=f=400,lowpass=f=2800,aecho=0.8:0.8:180|400:0.4|0.25,$NORM" ;; # 고분 속 텅 빈 울림
    # 남자 목소리
    gojoseon) echo "$MALE,asetrate=22050*0.92,aresample=22050,atempo=1.087,lowpass=f=2400,acompressor,$NORM" ;;               # 아주 낮고 굵게
    samguk)   echo "$MALE,acompressor,aecho=0.8:0.4:60:0.2,$NORM" ;;                                                         # 낮고 단단한 호령
    unified)  echo "$MALE,atempo=0.92,lowpass=f=3000,aecho=0.8:0.6:30:0.4,$NORM" ;;                                          # 느리고 돌처럼 무겁게
    goryeo1)  echo "$MALE,chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3,aecho=0.8:0.6:90:0.25,$NORM" ;;                      # 여러 겹으로 겹친 목소리
    goryeo2)  echo "$MALE,vibrato=f=3:d=0.12,aphaser=type=t:speed=0.6,lowpass=f=3500,aecho=0.8:0.5:70:0.25,$NORM" ;;         # 흔들리고 일렁임
    *)        echo "asetrate=22050*0.86,aresample=22050,atempo=1.08,lowpass=f=3800,aecho=0.8:0.6:70|190:0.22|0.12,$NORM" ;;
  esac
}
bright_filter() {
  if is_male "$1"; then echo "$MALE,$NORM"; else echo "asetrate=22050*1.04,aresample=22050,atempo=1.05,$NORM"; fi
}

n=0
for f in "$WAV"/*.wav; do
  name="$(basename "$f" .wav)"
  era="${name%%.*}"
  "$FF" -loglevel error -y -i "$f" -af "$(era_filter "$era")" -ac 1 -b:a 48k "voice/$name.mp3"
  "$FF" -loglevel error -y -i "$f" -af "$(bright_filter "$era")" -ac 1 -b:a 48k "voice_bright/$name.mp3"
  n=$((n+1))
done
echo "음성 파일 ${n}개씩 만들었습니다 (voice/, voice_bright/)"
