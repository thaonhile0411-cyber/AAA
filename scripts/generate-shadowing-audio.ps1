$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$audioRoot = Join-Path $projectRoot 'public/audio/shadowing'
[IO.Directory]::CreateDirectory($audioRoot) | Out-Null
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies System.Speech -TypeDefinition @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Speech.Synthesis;
using System.Speech.AudioFormat;
public class ShadowWord { public string text; public double start; public double end; public int offset; }
public class ShadowSentence { public string id; public string text; public double start; public double end; public List<ShadowWord> words = new List<ShadowWord>(); }
public class ShadowAudio {
  public static List<ShadowSentence> Generate(string[] lines, string output) {
    var result = new List<ShadowSentence>();
    using (var pcm = new MemoryStream()) using (var synth = new SpeechSynthesizer()) {
      synth.SelectVoice("Microsoft Zira Desktop"); synth.Rate = -1;
      var format = new SpeechAudioFormatInfo(16000, AudioBitsPerSample.Sixteen, AudioChannel.Mono);
      foreach (var line in lines) {
        var sentence = new ShadowSentence { id = "s" + (result.Count + 1), text = line, start = pcm.Length / 32000.0 };
        EventHandler<SpeakProgressEventArgs> progress = (sender, e) => {
          if (e.CharacterPosition < line.Length) sentence.words.Add(new ShadowWord { text = line.Substring(e.CharacterPosition, Math.Min(e.CharacterCount, line.Length - e.CharacterPosition)), offset = e.CharacterPosition, start = sentence.start + e.AudioPosition.TotalSeconds });
        };
        using (var wave = new MemoryStream()) {
          synth.SpeakProgress += progress;
          synth.SetOutputToAudioStream(wave, format); synth.Speak(line); synth.SetOutputToNull();
          synth.SpeakProgress -= progress;
          var bytes = wave.ToArray();
          pcm.Write(bytes, 0, bytes.Length);
        }
        sentence.end = pcm.Length / 32000.0;
        for (int i = 0; i < sentence.words.Count; i++) {
          sentence.words[i].end = i + 1 < sentence.words.Count ? sentence.words[i + 1].start : sentence.end;
          int nextOffset = i + 1 < sentence.words.Count ? sentence.words[i + 1].offset : line.Length;
          sentence.words[i].text = line.Substring(sentence.words[i].offset, nextOffset - sentence.words[i].offset);
        }
        result.Add(sentence);
      }
      using (var writer = new BinaryWriter(File.Create(output))) {
        writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); writer.Write((int)pcm.Length + 36);
        writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); writer.Write(16); writer.Write((short)1); writer.Write((short)1);
        writer.Write(16000); writer.Write(32000); writer.Write((short)2); writer.Write((short)16);
        writer.Write(System.Text.Encoding.ASCII.GetBytes("data")); writer.Write((int)pcm.Length); writer.Write(pcm.ToArray());
      }
    }
    return result;
  }
}
'@
$sources = [IO.File]::ReadAllText((Join-Path $projectRoot 'src/features/shadowing/models.source.json')) | ConvertFrom-Json
$models = @()
foreach ($source in $sources) {
  if ($source.id -notmatch '^[a-z0-9-]+$') { throw 'Invalid model ID.' }
  $sentences = [ShadowAudio]::Generate([string[]]$source.sentences, (Join-Path $audioRoot ($source.id + '.wav')))
  $models += [ordered]@{ id=$source.id; title=$source.title; part=$source.part; topic=$source.topic; targetBand=$source.targetBand; prompt=$source.prompt; cuePoints=$source.cuePoints; audioSrc=('/audio/shadowing/' + $source.id + '.wav'); audioKind='synthetic-demo'; voice='Microsoft Zira Desktop (en-US)'; duration=$sentences[$sentences.Count-1].end; sentences=@($sentences) }
}
[IO.File]::WriteAllText((Join-Path $projectRoot 'src/features/shadowing/models.generated.json'), (ConvertTo-Json -InputObject $models -Depth 10))
Write-Output ('Generated ' + $models.Count + ' model responses with measured sentence and word timestamps.')
