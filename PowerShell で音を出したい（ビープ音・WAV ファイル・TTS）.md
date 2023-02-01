# PowerShell で音を出したい（ビープ音・WAV ファイル・TTS）

長時間動作するような PowerShell スクリプトを書く必要がある場合、終了時に音による通知がほしくなります。本記事では、PowerShell 標準の機能で利用できる 3 種類のアプローチをご紹介します。

## ビープ音を鳴らす

まずは古式ゆかしいビープ音です。[Console クラス](https://learn.microsoft.com/ja-jp/dotnet/api/system.console?view=net-7.0)の [Beep メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.beep?view=net-7.0)を利用します。

```powershell
# デフォルト設定でビープ音を鳴らす
[Console]::Beep()

# 指定の周波数、再生時間でビープ音鳴らす
[Console]::Beep(524, 1000)
```

## WAV ファイルを再生する

せっかくなのでお好みの音楽で通知してほしい場合もあるでしょう。そんな時は [SoundPlayer クラス](https://learn.microsoft.com/ja-jp/dotnet/api/system.media.soundplayer?view=dotnet-plat-ext-7.0)を利用します。

```powershell
# 同期的に再生
(New-Object Media.SoundPlayer <WAV ファイルへのパス>).PlaySync()
```

非同期的に再生・停止したい場合は `SoundPlayer` クラスのインスタンスを変数に格納しておき、`SoundPlayer#Stop()` で停止します。

```powershell
# 非同期的に再生
$sp = New-Object Media.SoundPlayer <WAV ファイルへのパス>
$sp.Play()

# 停止
$sp.Stop()
```

## TTS で日本語を喋らせる

ビープ音や音楽ファイルでなく、任意のメッセージを発話させる（Text-to-Speech）こともできます。PowerShell から簡単に呼び出せる TTS には 2 種類あります。

[Microsoft Speech API 5.4 (COM) の ISpVoice::Speak](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ee125024(v=vs.85))：

```powershell
(New-Object -ComObject SAPI.SpVoice).Speak("喋らせたい内容")
```

[.NET Framework 3.0 - 4.8.1 の SpeechSynthesizer クラス](https://learn.microsoft.com/ja-jp/dotnet/api/system.speech.synthesis.speechsynthesizer)：

```powershell
# 同期的に再生
(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("喋らせたい内容")

# 非同期的に再生
$ss = New-Object System.Speech.Synthesis.SpeechSynthesizer
$ss.SpeakAsync("looooooooooooooooooooooooooong text")

# 停止
$ss.SpeakAsyncCancelAll()
```

## 参考リンク

* [Console.Beep メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.beep?view=net-7.0)
* [PowerShellでビープ音の「ドレミの歌」を奏でてみよう](https://tech.guitarrapc.com/entry/2013/02/05/000226)
* [SoundPlayer クラス](https://learn.microsoft.com/ja-jp/dotnet/api/system.media.soundplayer?view=dotnet-plat-ext-7.0)
* [ISpVoice::Speak](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ee125024(v=vs.85))
* [Windows 10は好きな文章を合成音声で簡単に喋らせることができる](https://ascii.jp/elem/000/004/055/4055975/)
* [SpeechSynthesizer クラス](https://learn.microsoft.com/ja-jp/dotnet/api/system.speech.synthesis.speechsynthesizer)