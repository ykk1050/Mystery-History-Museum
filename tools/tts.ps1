param([string]$Lines, [string]$OutDir)
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $Lines | ConvertFrom-Json
New-Item -ItemType Directory -Force $OutDir | Out-Null
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Heami Desktop')
$s.Rate = -3
foreach ($it in $items) {
  $text = $it.text.Replace([string][char]0x2026, ', ')
  $wav = Join-Path $OutDir ($it.id + '.wav')
  $s.SetOutputToWaveFile($wav)
  $s.Speak($text)
}
$s.SetOutputToNull()
$s.Dispose()
"done $($items.Count)"
