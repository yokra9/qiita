# PowerShell でも su とか sudo っぽいことをする

PowerShell には  `su` コマンドおよび `sudo` コマンドがありません。そのため、管理者としてコマンドを実行したい場合は `powershell.exe` ないしは `pwsh.exe`[^1] などのシェルを「管理者として実行」する必要があります。

[^1]: PowerShell Core の実行ファイル名です。

だからといってすべてのコマンドを管理者として実行するのは危険ですよね。というわけで、Windows でも su とか sudo っぽいことがする方法を考えてみました。

## TL;DR

[こちら](https://github.com/yokra9/sudo)の Git Repositry から  `git clone` するなり `Download ZIP` するなりしたファイル群を任意の場所に配置し、ルートディレクトリ（下図の場合は `C:\Scripts` ）にパスを通して下さい。

<pre>
C:\Scripts\
    ├ su.bat
    ├ sudo.bat
    └ sudo\
        └ main.ps1
</pre>

使い方：

<pre>
PS> su
</pre>

<pre>
PS> sudo < コマンド | ファイル名 > [オプション...]
</pre>

## PowerShell で `su` っぽいことがしたい

PowerShell で以下のコマンドを実行すると、管理者権限をもった PowerShell が新しいウィンドウで起動します：

<pre>
PS> su
</pre>

### 解説

```su.bat
@echo off
powershell -Command "Start-Process powershell -Verb runas"
```

PowerShell からバッチファイルを実行し、バッチファイルから PowerShell の `Start-Process` コマンドを実行し、`Start-Process` コマンドで管理者権限つきの PowerShell を立ち上げています。はちゃめちゃに迂遠ですが、これは ExecutionPolicy の制約で `.ps1` ファイルが直接叩けない環境での利用を想定しているためです。コンプラに厳しい職場でも安心。

ちなみに `Start-Process` コマンドには新たなウィンドウを立ち上げないオプションも存在しますが、`-Verb runas` と排他になっています。無念。

## PowerShell で `sudo` っぽいことがしたい

PowerShell で以下のコマンドを実行すると、管理者権限をもった PowerShell が新しいウィンドウで起動し、指定したコマンドや `.ps1` ファイルが実行されます：

<pre>
PS> sudo < コマンド | ファイル名.ps1 > [オプション...]
</pre>

なおファイル名やオプションに `` " `` （ダブルクォーテーション）を入力したい場合は `` ` `` （バッククォート）でエスケープする必要があります（ PowerShell は `` "  " `` の内側を文字列として解釈するため）：

<pre>
PS> sudo Start-VM `"CentOS 7`"
</pre>

<pre>
PS> sudo `"C:\path to scripts\script.ps1`" argument_1 `"argument 2`"
</pre>

### 解説

```sudo.bat
@echo off
REM 「 」「,」「=」「;」で区切らず、引数を全部取得する
set arg=%*
REM 「"」を「\"」にエスケープする
set replacedArg=%arg:"=\"%
REM .\sudo\main.ps1にエスケープ済みの引数を渡す。
powershell -ExecutionPolicy Unrestricted -File "%~dp0sudo\main.ps1" "%replacedArg%"
```

ExecutionPolicy に怒られないように `sudo.bat` を経由しています。バッチファイル内で ` " ` を渡す際にはエスケープシーケンスとして ` \ ` をつけなければなりません。コマンドプロンプトと PowerShell と挙動が違うのがめんどくさいですね。

```powershell:sudo\main.ps1
# 確認
Write-Host "sudo"$Args[0]

# ダブルクォーテーションで始まっているとき
if ( $Args[0].StartsWith("`"") ) { 

    # 一つ目のダブルクォーテーションと二つ目のダブルクォーテーションの間がファイル名
    $s = $Args[0].Split("`"") 
    $filename = $s[1]

    # 「"ファイル名"」直後に1文字以上あったら = 引数があったら
    if ( $s[2].Length -gt 0) {
        $arguments = $Args[0].Substring($filename.Length + 3, $Args[0].Length - $filename.Length - 3)
    }
  
    # 絶対パスに展開（管理者シェルは C:\WINDOWS\system32で開かれるため）
    $path = "`"" + (Resolve-Path $filename).Path + "`""

    Write-Host "ファイル名`t$filename" 
    Write-Host "フルパス`t$path"
    Write-Host "オプション`t$arguments "

    # コマンドラインオプションを生成
    $argument_list = "-ExecutionPolicy Unrestricted -File " + $path + " " + $arguments

}
# ダブルクォーテーションで始まってないとき
else {

    # スペースより手前がファイル名かコマンド
    $s = $Args[0].Split(" ")
    $filename = $s[0]

    # スペースで区切ったとき２つ以上に分割されたら = 引数があったら
    if ( $s.Length -gt 1) {
        $arguments = $Args[0].Substring($filename.Length + 1, $Args[0].Length - $filename.Length - 1)
    } else {
        $arguments = ""
    }

    # ファイル名なら
    if ( Test-Path $filename ) {
  
        # 絶対パスに展開（管理者シェルは C:\WINDOWS\system32で開かれるため）
        $path = "`"" + (Resolve-Path $filename).Path + "`""

        Write-Host "ファイル名`t$filename"
        Write-Host "フルパス`t$path"
        Write-Host "オプション`t$arguments "

        # コマンドラインオプションを生成
        $argument_list = "-ExecutionPolicy Unrestricted -File " + $path + " " + $arguments
  
    }
    # コマンドなら
    else {

        Write-Host "コマンド`t$filename"
        Write-Host "オプション`t$arguments "

        # コマンドラインオプションを生成
        #「"」 を 「\」 でエスケープ
        $argument_list = "-Command " + $filename + " " + $arguments.replace("`"", "\`"")

    }
}

# 管理者シェルを起動する
Start-Process powershell -ArgumentList $argument_list -Verb runas -Wait
```

`Start-Process powershell -Command <コマンド> [オプション]` を呼び出す際に `` " `` を `` `\ `` でエスケープしています。PowerShell のエスケープシーケンスは `` ` `` ですが、 `-Command` オプションではコマンドプロンプトと同様のエスケープ処理が走るため `` \ `` も追加する必要があるようです。[^2]

[^2]: `conhost.exe` （cmd や powershell などが利用するコンソールホスト）によるエスケープが働くためという説があります。詳細は[こちら](https://blog.shibata.tech/entry/2016/03/30/195726)の記事をご覧ください。
