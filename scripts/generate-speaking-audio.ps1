param([string]$VoiceName = 'Microsoft Zira Desktop')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$audioRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'public/audio/speaking'))
if (-not $audioRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Audio output must stay inside the speaking project.'
}
$manifestPath = Join-Path $audioRoot 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Run node scripts/speaking-audio-manifest.mts first.' }
$manifest = [IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.SelectVoice($VoiceName)
  $synth.Rate = -1
  $synth.Volume = 100
  $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo -ArgumentList 22050, ([System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen), ([System.Speech.AudioFormat.AudioChannel]::Mono)
  foreach ($recording in $manifest.recordings) {
    if ($recording.id -notmatch '^[a-z0-9-]+$') { throw 'Invalid recording ID.' }
    $outputPath = Join-Path $audioRoot ($recording.id + '.wav')
    $synth.SetOutputToWaveFile($outputPath, $format)
    $synth.Speak([string]$recording.text)
    $synth.SetOutputToNull()
  }
  $manifest.voice = $VoiceName
  [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 6) + [Environment]::NewLine)
  Write-Output ('Generated ' + $manifest.recordings.Count + ' WAV files using ' + $VoiceName + '.')
} finally { $synth.Dispose() }
