# -*- coding: utf-8 -*-
"""해설사·안내원·귀띔 음성을 Supertonic 3로 다시 만든다.
  사용법 (저장소 폴더에서):  D:/자동화/tts-tools/venv/Scripts/python.exe tools/make_voice.py [이름 일부...]
    이름을 주면 그 글자가 들어간 파일만 다시 만든다 (예: paleo, guide, whisper)
  필요한 것: D:/자동화/tts-tools (Supertonic 3 모델과 venv), node, ffmpeg (PATH 또는 FFMPEG 환경 변수)

  만들어지는 파일: voice/(으스스한 박물관), voice_bright/(밝은 박물관)
    전시실ID.mp3        해설사의 평소 대사
    이상현상ID.mp3      해설사의 말이 바뀐 이상 현상
    guide.mp3          귀신 안내원
    whisper_종류.mp3    해설사의 귀띔 (js/game.js whisper()의 tips와 같은 순서·글)

  음성: Supertonic 3 © Supertone Inc. (OpenRAIL-M) — THIRD-PARTY-NOTICES.txt 참고
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TT = os.environ.get('SUPERTONIC_DIR', r'D:\자동화\tts-tools')
FF = os.environ.get('FFMPEG', 'ffmpeg')
NORM = 'loudnorm=I=-21:TP=-2,aresample=22050'

# ---------- 효과 (ffmpeg) ----------
DARK_BASE = 'aecho=0.8:0.6:70|190:0.22|0.12'
FX = {
    # 1층 여자 해설사 시대: 시대마다 다른 울림
    'paleo':   'asetrate=22050*0.80,aresample=22050,atempo=1.12,lowpass=f=3200,aecho=0.8:0.7:120|260:0.35|0.2',   # 동굴 메아리
    'neo':     'atempo=0.95,tremolo=f=5:d=0.35,highpass=f=250,lowpass=f=4000,aecho=0.8:0.5:40:0.3',                 # 물결처럼 떨림
    'bronze':  'asetrate=22050*0.92,aresample=22050,aecho=0.6:0.6:12|19:0.55|0.4,aphaser',                          # 쇠가 울리는 금속성
    'samlife': 'asetrate=22050*0.95,aresample=22050,highpass=f=400,lowpass=f=2800,aecho=0.8:0.8:180|400:0.4|0.25',   # 고분 속 텅 빈 울림
    # 1층 남자 해설사 시대: 낮고 쉰 목소리에 깊은 메아리(A) + 시대마다 조금씩
    'maleA':   'asetrate=22050*0.84,aresample=22050,atempo=1.12,lowpass=f=2400,acompressor,aecho=0.8:0.85:110|260|480:0.45|0.3|0.2',
    'gojoseon': 'lowpass=f=2000',
    'samguk':   'acompressor',
    'unified':  'atempo=0.95',
    'goryeo1':  'chorus=0.6:0.9:50|60:0.3|0.25:0.25|0.4:2|1.3',
    'goryeo2':  'aformat=sample_fmts=dbl,vibrato=f=3:d=0.08',
    # 2층
    'street':  'lowpass=f=3400,aecho=0.8:0.5:60:0.2',                                                              # 낮고 조용한 울림
    'war':     'asetrate=22050*0.86,aresample=22050,atempo=1.1,acompressor,lowpass=f=2600,aecho=0.8:0.6:60|140:0.35|0.2',   # 낮고 단단한 호령
    'mural':   'asetrate=22050*0.95,aresample=22050,highpass=f=400,lowpass=f=2800,aecho=0.8:0.8:180|400:0.4|0.25',  # 텅 빈 방의 울림
    # 3층, 안내원
    'base':    'asetrate=22050*0.86,aresample=22050,atempo=1.08,lowpass=f=3800,' + DARK_BASE,
    'bright':  'asetrate=22050*1.04,aresample=22050,atempo=1.05',
}

# ---------- 배역: 전시실 ID → (으스스한 목소리, 효과), (밝은 목소리, 효과) ----------
def cast(rid):
    if rid in ('paleo', 'neo', 'bronze', 'samlife'): return ('F5', FX[rid]), ('F3', FX['bright'])
    if rid in ('gojoseon', 'samguk', 'unified', 'goryeo1', 'goryeo2'): return ('M5', FX['maleA'] + ',' + FX[rid]), ('M1', FX['bright'])
    if rid == 'jo_war': return ('M5', FX['war']), ('M1', FX['bright'])
    if rid in ('jo_econ', 'jo_folk'): return ('F5', FX['mural']), ('F2', FX['bright'])
    if rid.startswith('jo_') or rid == 'open_age': return ('M5', FX['street']), ('M1', FX['bright'])
    if rid.startswith('ko_'): return ('F3', FX['base']), ('F4', FX['bright'])
    if rid == 'guide': return ('M5', FX['base']), ('M3', FX['bright'])
    if rid == 'whisper': return ('F3', FX['bright']), ('F3', FX['bright'])
    raise ValueError('배역 없음: ' + rid)

# ---------- 읽는 법: AI 음성이 숫자를 잘못 읽지 않게 (긴 것부터 바꿈) ----------
READ = [
    ('1919년 3월 1일', '천구백십구 년 삼월 일일'), ('1919년', '천구백십구 년'),
    ('3·1 운동', '삼일 운동'), ('6·25 전쟁', '육이오 전쟁'), ('8·15 광복', '팔일오 광복'), ('6·10 만세 운동', '육십 만세 운동'),
]
def to_speech(text):
    for a, b in READ: text = text.replace(a, b)
    if re.search(r'[0-9]', text): raise ValueError('읽는 법이 없는 숫자: ' + text)
    return text.replace('…', ',').strip(', ') + '.'

WHISPER = {   # js/game.js whisper()의 tips
    'tag': '이름표에 적힌 시대나 나라를… 잘 확인해 보렴…',
    'visual': '유물의 생김새를… 설명과 잘 비교해 보렴…',
    'lines': '설명 문장을… 한 줄 한 줄 꼼꼼히 읽어 보렴…',
    'title': '전시물의 이름을… 잘 살펴보렴…',
    'sub': '설명판의 작은 제목까지… 잘 읽어 보렴…',
    'speech': '내가 하는 말도… 잘 들어 보렴…',
}

def lines():
    js = ("global.window={};['data','data2','data3'].forEach(f=>require('./js/'+f+'.js'));"
          "const R=window.ROOMS.concat(window.ROOMS2,window.ROOMS3),o=[];"
          "R.forEach(r=>{o.push([r.id,r.id,r.exhibits.docent.speech]);r.anomalies.forEach(a=>{if(a.patch.speech)o.push([a.id,r.id,a.patch.speech])})});"
          "process.stdout.write(JSON.stringify(o))")
    out = json.loads(subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, check=True).stdout.decode('utf-8'))
    out.append(['guide', 'guide', '로비로 돌아가서, 잠깐 쉬고 싶나.'])
    out += [['whisper_' + k, 'whisper', t] for k, t in WHISPER.items()]
    return out

def main():
    only = sys.argv[1:]
    todo = [l for l in lines() if not only or any(o in l[0] for o in only)]
    sys.path.insert(0, os.path.join(TT, 'supertonic', 'py'))
    import soundfile as sf
    from helper import load_text_to_speech, load_voice_style
    assets = os.path.join(TT, 'supertonic', 'assets')
    tts = load_text_to_speech(os.path.join(assets, 'onnx'), False)
    styles = {}
    def style(v):
        if v not in styles: styles[v] = load_voice_style([os.path.join(assets, 'voice_styles', v + '.json')])
        return styles[v]
    for name, rid, text in todo:
        speed = 0.85 if rid == 'guide' else 0.9
        for folder, (voice, fx) in zip(('voice', 'voice_bright'), cast(rid)):
            wav, dur = tts(to_speech(text), 'ko', style(voice), 8, speed)
            w = wav[0, : int(tts.sample_rate * dur[0].item())]
            tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            sf.write(tmp, w, tts.sample_rate)
            subprocess.run([FF, '-y', '-loglevel', 'error', '-i', tmp, '-af', 'aresample=22050,' + fx + ',' + NORM,
                            '-ac', '1', '-b:a', '48k', os.path.join(ROOT, folder, name + '.mp3')], check=True)
            os.remove(tmp)
        print(name, flush=True)
    print(f'음성 {len(todo)}줄 × 2 (voice/, voice_bright/)')

if __name__ == '__main__':
    main()
