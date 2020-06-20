# Windows Terminal でエクスプローラーのカレントディレクトリを開く

アドレスバーに以下の文字列を入力して、[Enter] キーを押下するだけです：

```bat
wt -d .
```

![](./wt-current.gif)

Visual Studio Code のターミナル（PowerShell）からも同様に開くことができますが、表現を少し変えましょう。バックグラウンドプロセスとして起動した方が便利だからです：

```powershell
Start-Process wt -ArgumentList "-d ."
```

## コンテキストメニューから開く

[Add a context menu entry to "Open Windows Terminal here"](https://github.com/microsoft/terminal/pull/6100) という PR が Windows Terminal Preview v1.1.1671 にてマージされています。問題が無ければ無印でも利用できるようになるでしょう。

## 参考リンク

* [Windows ターミナルに対するコマンド ライン引数を使用する](https://docs.microsoft.com/ja-jp/windows/terminal/command-line-arguments?tabs=windows)