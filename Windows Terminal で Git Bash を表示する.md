# Windows Terminal で Git Bash を表示する

[Windows Terminal](https://github.com/microsoft/terminal) は Build 2019 で発表された Windows 向けの新たなターミナルです。マルチタブが導入されており、複数の PowerShell やコマンドプロンプトなどを切り替えながら利用できます。また、Windows10 v1809 から UNIX / Linux 互換の擬似コンソール [ConPTY](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/) が導入されたため Bash on Ubuntu on WSL などの Linux シェルを表示することも可能です。せっかくなので [Git Bash](https://gitforwindows.org/) も利用できるように設定してみました。

![git-bash-on-windows-terminal.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/24ab28df-45f3-a57a-65bf-af896cbdff15.png)

## 設定手順

1. PowerShell を起動して適当な GUID を取得します。

```powershell
    [guid]::NewGuid()
```
<br>
2. Windows Terminal を起動し、[ Settings ] から `profiles.json` を開きます。
3. `"profiles" : [ { ... } ]` の末尾に以下のオブジェクトを追記して保存します。`"guid"` の値は先ほど取得した GUID に差し替えてください:

```json
{

    "guid" : "{e635c1d7-d15f-f81e-4665-c60b3f27a3f6}",
    "acrylicOpacity" : 0.5,
    "closeOnExit" : true,
    "colorScheme" : "Campbell",
    "commandline" : "C:\\Program Files\\Git\\bin\\bash.exe",
    "cursorColor" : "#FFFFFF",
    "cursorShape" : "bar",
    "fontFace" : "consolas",
    "fontSize" : 14,
    "historySize" : 9001,
    "icon" : "C:\\Program Files\\Git\\mingw64\\share\\git\\git-for-windows.ico",
    "name" : "Git Bash",
    "padding" : "0, 0, 0, 0",
    "snapOnInput" : true,
    "startingDirectory" : "%USERPROFILE%",
    "useAcrylic" : true
}
```
<br>
4. 新規タブの選択肢に `Git Bash` が追加されました！

![git-bash-added-selection.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/8ff677e8-7b96-cfb6-84ee-d96b47c1da47.png)

※ここでは同様の手順で [PowerShell Core 6](https://aka.ms/pscore6) も追加しています。

## 日本語対応

上記の作業だけでも利用することはできますが、ロケールの設定が行われていないため日本語が文字化けしてしまいます。そこで、`~/.bashrc` で環境変数 `LANG` を指定します：

```shell:.barhrc
export LANG=ja_JP.UTF-8
```

日本語が文字化けしなくなりました。

![git-bash-on-windows-terminal-ja.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/3fe5e15e-1284-dd0f-80eb-22ac86259197.png)

※ここでは同様の手順で [Cygwin](https://qiita.com/yokra9/items/e8b184021091dbabb8a1) も追加しています。

もしフォントの崩れが気になる場合は、任意の**等幅フォント**を指定します。<del>このとき、マルチバイト文字をUnicodeエスケープシーケンスで記載しなければならないことに注意します</del> 現在は修正されています：

```json-doc
{
    // MSゴシック
    "fontFace" : "MS\u30b4\u30b7\u30c3\u30af",
    // BIZ UDゴシック
    "fontFace" : "BIZ UD\u30b4\u30b7\u30c3\u30af"
}
```

## 参考リンク

* [Adding Git-Bash to the new Windows Terminal
](https://stackoverflow.com/questions/56839307/adding-git-bash-to-the-new-windows-terminal)
* [Windows Terminal で Cygwin Bash を表示したい](https://qiita.com/yokra9/items/e8b184021091dbabb8a1)
