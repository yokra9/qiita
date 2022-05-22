# VSCode のカレントディレクトリを Windows Terminal で開く

VSCode 画面下部の統合ターミナル（PowerShell）で以下のコマンドを実行すると、統合ターミナルのカレントディレクトリで Windows Terminal が起動します：

```powershell
wt -d .
```

なお、統合ターミナルのカレントディレクトリは通常ワークスペースのルートディレクトリですが、設定で `terminal.integrated.cwd` を変更している場合は異なります。

特定のプロファイルで開きたい場合は `-p` オプションでプロファイル名を指定します。以下の場合、Windows Terminal は Visual Studio 2019 の開発者コマンドプロンプトでカレントディレクトリを開きます：

```powershell
wt -d . -p "Developer Command Prompt for VS 2019"
```

既に Windows Terminal を起動している場合、新規ウィンドウではなく新規タブで開いてほしい時もあるでしょう。`-w` オプションと `nt` サブコマンドを組み合わせることで実現できます：

```powershell
wt -w 0 nt -d . -p "Developer Command Prompt for VS 2019"
```

その他のオプションやサブコマンドは Microsoft 公式のドキュメント([日本語版](https://docs.microsoft.com/ja-jp/windows/terminal/command-line-arguments?tabs=windows)/[英語版](https://github.com/MicrosoftDocs/terminal/blob/main/TerminalDocs/command-line-arguments.md))を参照してください。たとえば、以下の画像のようにタブではなくペイン分割で表示させることもできます：

![Windows Terminal command line argument for split panes](https://raw.githubusercontent.com/MicrosoftDocs/terminal/main/TerminalDocs/images/terminal-command-args.gif) [^1]

[^1]: https://github.com/MicrosoftDocs/terminal/blob/main/TerminalDocs/command-line-arguments.md

## 参考リンク

* [Windows ターミナルに対するコマンド ライン引数を使用する](https://docs.microsoft.com/ja-jp/windows/terminal/command-line-arguments?tabs=windows)
* [Windows Terminal でエクスプローラーのカレントディレクトリを開く](https://qiita.com/yokra9/items/8b771583fe4404646841)
* [Windows Terminal で Git Bash を表示する](https://qiita.com/yokra9/items/bdd0882268b308cf22ca)
