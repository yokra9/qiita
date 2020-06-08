# PowerShell でも tail -f がしたいし grep もしたい

Linux では `tail -f` でファイルの更新を監視してリアルタイムに表示を更新させることができます。ログファイルの監視などを行う際お世話になるお便利コマンドですが、PowerShell にはそもそも `tail` がありません。困った。

## PowerShell でも `tail -f` がしたい

そんなときには `Get-Content` コマンドレットを利用しましょう：

```Powershell:
Get-Content -Path <ファイルパス> -Wait -Tail <行数>
```
おおよそ `tail <ファイルパス> -f -n <行数>` と同じ挙動を示します。文字コードが SJIS でない場合は文字化けしてしまいますが、 `-Encoding UTF8` などと指定して回避できます。

## PowerShell でも `tail -f | grep` がしたい

ログファイルの監視をする際、任意の文字列が含まれる行だけをリアルタイムに抽出して表示したいことがあります。Linux では `grep` すればすむ話ですが、PowerShell には `grep` コマンドもありません。そんなときには `Select-String` コマンドレットを利用しましょう：

```Powershell:
Get-Content -Path <ファイルパス> -Wait -Tail <行数> | Select-String "GET","POST" -CaseSensitive 
```

 `grep` コマンドとの目立った違いとしては、OR 検索が `-e` オプションではなくカンマ区切りであること、デフォルトで大文字小文字を区別しないことがあげられます。

正規表現を利用したい場合は `-Pattern` オプションを利用します：

```Powershell:
Get-Content -Path <ファイルパス> -Wait -Tail <行数> | Select-String -Pattern "http*"
```

## PowerShell でもパイプラインでテキストを渡したい

PowerShell のパイプラインは、Linux のそれとは異なりオブジェクトを渡す仕様になっています。それが便利なこともありますが、画面上に表示されているコマンドの実行結果を「見たまま」grep にかけたいこともありますよね。そんなときには `Out-String` コマンドレットを利用しましょう：

```Powershell:
Get-ChildItem | Out-String -Stream | Select-String ".log"
```

`Get-ChildItem` からパイプラインで渡したオブジェクトを直接 grep するとカレントディレクトリにある各ファイルに対して grep が走ってしまいますが、`Out-String -Stream` を挟むことによってファイル名で絞り込むことができます。

## 参考リンク

* [Get-Content](https://docs.microsoft.com/ja-jp/powershell/module/Microsoft.PowerShell.Management/Get-Content?view=powershell-5.1)
* [【 tail 】 ファイルの末尾を表示する](https://tech.nikkeibp.co.jp/it/article/COLUMN/20060227/230894/)
* [grep的なPowerShellコマンドSelect-String](https://qiita.com/kmr_hryk/items/101c15c8c1c95469f53e)
* [文字列の一致検索 Select-String、Out-String](https://news.mynavi.jp/itsearch/article/hardware/3761)
