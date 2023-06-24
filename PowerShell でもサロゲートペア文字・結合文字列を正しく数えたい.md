# PowerShell でもサロゲートペア文字・結合文字列を正しく数えたい

PowerShell では内部的に UTF-16LE を利用しています。そのため、Windows API や Java を利用した開発と同様、文字列を取り扱う際にはサロゲートペア文字に関する問題を考慮しなければなりません。

## `String.Length` で文字数を数えてみる

まずは素直に `String.Length` で文字数を数えてみましょう：

```powershell:基本多言語面内（非サロゲートペア文字）
"a".Length
# 1

"あ".Length
# 1
```

```powershell:基本多言語面外（サロゲートペア文字）
"🎵".Length
# 2
```

サロゲートペア文字の場合はハイサロゲート・ローサロゲートで合計2文字のカウントになっていますね。

同様に、結合文字列についても確認してみましょう：

```powershell:結合文字列
"ぬ゙".Length
# 2 (1+1)

"👨🏻‍🎤".Length
# 7 (2+2+1+2)
```

結合に利用した分の文字数（サロゲートペア文字の場合は2文字として）でカウントされていますね。

なお、PowerShell には Linux 版もリリースされていますが、こちらでも同じ挙動となります。

```log
$ docker run --rm mcr.microsoft.com/powershell:lts-7.2-debian-buster-slim pwsh -Command '"👨🏻‍🎤".Length'
7
```

## `StringInfo.LengthInTextElements` で文字数を数えてみる

`System.Globalization.StringInfo` はサロゲートペア文字や結合文字列を考慮しながら文字列を取り扱うためのクラスです。コンストラクタでインスタンスを生成した後、`LengthInTextElements` プロパティで以下の要素数を数えます：

* 基本文字
* サロゲートペア文字
* 結合文字列

```powershell
[System.Globalization.StringInfo]::new("👨🏻‍🎤<ぬ゙～🎵").LengthInTextElements
# 5
```

やったね。期待通り 5 文字として数えることができました！

## 参考リンク

* [文字エンコードについて - PowerShell | Microsoft Learn](https://learn.microsoft.com/ja-jp/powershell/module/microsoft.powershell.core/about/about_character_encoding?view=powershell-7.2)
* [String クラス (System) | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/api/system.string?view=net-7.0)
* [String.Length プロパティ (System) | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.length?view=net-7.0#system-string-length)
* [StringInfo.LengthInTextElements プロパティ (System.Globalization) | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/api/system.globalization.stringinfo.lengthintextelements?view=net-7.0)
* [サロゲート文字と補助文字 | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/intl/surrogates-and-supplementary-characters)
* [文字列の長さ（文字数）を取得する - .NET Tips (VB.NET,C#...)](https://dobon.net/vb/dotnet/string/stringlength.html)
* [サロゲートペア・結合文字列・合字](https://qiita.com/Nabetani/items/8c69bdd8060f2503683c)
* [絵文字👨🏻‍🦱は何文字としてカウントする？関連する文字コードの仕様を詳しく調べてみた](https://qiita.com/comware_harase/items/59c60ab1c6e1797f0821)
* [UTF-16](https://ja.wikipedia.org/wiki/UTF-16)
* [基本多言語面](https://ja.wikipedia.org/wiki/%E5%9F%BA%E6%9C%AC%E5%A4%9A%E8%A8%80%E8%AA%9E%E9%9D%A2)
* [結合文字](https://ja.wikipedia.org/wiki/%E7%B5%90%E5%90%88%E6%96%87%E5%AD%97)
* [合成済み文字](https://ja.wikipedia.org/wiki/%E5%90%88%E6%88%90%E6%B8%88%E3%81%BF%E6%96%87%E5%AD%97)
* [カオス過ぎる Unicode, UTF-8, UTF-16, UTF-32 の違い概要まとめ](https://qiita.com/tatsubey/items/0ba0d3b84c012fd4d19b)
