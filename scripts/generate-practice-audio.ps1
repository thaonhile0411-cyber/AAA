# Builds compact local narration from source material that AAA is permitted to reuse.
# The narration is an AAA accessibility/practice rendering, not VOA's original recording.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskExercises = Get-Content -LiteralPath (Join-Path $taskRoot 'content/practice-exercises-voa.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$taskAudioDirectory = Join-Path $taskRoot 'public/audio'
New-Item -ItemType Directory -Force -Path $taskAudioDirectory | Out-Null
Add-Type -AssemblyName System.Speech
$taskSpeech = New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskEnglishVoice = $taskSpeech.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1
if (-not $taskEnglishVoice) { throw 'An English Windows speech voice is required.' }
$taskSpeech.SelectVoice($taskEnglishVoice.VoiceInfo.Name)
$taskSpeech.Rate = -1
$taskEncoder = & python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'
if ($LASTEXITCODE -ne 0) { throw 'Install the development-only encoder helper: python -m pip install imageio-ffmpeg' }
foreach ($taskExercise in $taskExercises | Where-Object { $_.skill -eq 'listening' }) {
  $taskWav = Join-Path $env:TEMP ($taskExercise.slug + '.wav')
  $taskMp3 = Join-Path $taskAudioDirectory ($taskExercise.slug + '.mp3')
  $taskSpeech.SetOutputToWaveFile($taskWav)
  $taskSpeech.Speak($taskExercise.transcript)
  $taskSpeech.SetOutputToNull()
  & $taskEncoder -hide_banner -loglevel error -y -i $taskWav -codec:a libmp3lame -b:a 64k -ar 24000 -ac 1 $taskMp3
  if ($LASTEXITCODE -ne 0) { throw 'MP3 encoding failed.' }
  Get-Item -LiteralPath $taskMp3 | Select-Object Name, Length
}
$taskSpeech.Dispose()
