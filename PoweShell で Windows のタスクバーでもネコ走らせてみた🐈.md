# PoweShell で Windows のタスクバーでもネコ走らせてみた🐈

[Windowsのタスクバーでもネコ走らせてみた🐈](https://qiita.com/Kyome/items/47aac4979933dac12263)という記事を読みました。筆者の方は「しょうもないアプリ」と謙遜されていますが、可愛いネコチャンがタスクトレイに常駐してくれれば、開発で殺伐とした心は劇的に癒されていくことでしょう。CPU 負荷に応じて走る速度が変わるというのも、単なるジョークアプリに終わらせない素晴らしいアイデアです。

しかし私は思いました。

「CPU 負荷に合わせて走る速度の変わるネコをタスクトレイ上に表示するくらいなら、 PowerShell でも書けちゃうのでは？」

PowerShell は Windows にビルトインされた強力なスクリプト言語です。Windows にできることはだいたい記述できますし、[新型コロナウイルスの世界の感染状況を把握](https://qiita.com/yokra9/items/1e7cee82bd172f8fac7a)だってできる PowerShell なら、当然ネコを走らせることもできるはずです。

## 結果

できました。

![メディア1.gif](img/97d11f45-5e75-a790-03ce-29c9e3bb6157.gif)

<https://github.com/yokra9/RunCat_for_Windows_on_PowerShell>

とりあえず動かしたいときは、[こちら](https://github.com/yokra9/RunCat_for_Windows_on_PowerShell/releases/tag/v0.2)からダウンロードした Zip ファイルを解凍し `init.vbs` を実行してください。

### 2020/08/21追記

インターネットから取得した PowerShell ファイルはセキュリティ上の都合で実行できないようになっているので、初回実行時に `unblock.bat` を実行してブロックを解除してください。@okahashi117 さん、ご指摘ありがとうございました！

## ソースコード

短いので全文を貼ってしまいます。

```powershell:runcat.ps1
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ウィンドウを非表示化
$cscode = @"
    // Win32Api を読み込むための C# コード
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    // ウィンドウの状態を制御するため ShowWindowAsync() を extern する
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
"@
$Win32Functions = Add-Type -MemberDefinition $cscode -name Win32ShowWindowAsync -namespace Win32Functions -PassThru
$Win32Functions::ShowWindowAsync((Get-Process -PID $pid).MainWindowHandle, 0) > $null # bool 値を返すので null に捨てる

# タスクトレイにアイコンを作成する
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Visible = $true

# ダークモード判定
$theme = "light"
if ((Get-ItemProperty -Path "Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize").AppsUseLightTheme -eq 0) {
    $theme = "dark"
}

# リソースの読みこみ
$path = Split-Path -Parent $MyInvocation.MyCommand.Path
$cats = @(
    New-Object System.Drawing.Icon -ArgumentList "$path\\resources\\${theme}_cat0.ico";
    New-Object System.Drawing.Icon -ArgumentList "$path\\resources\\${theme}_cat1.ico";
    New-Object System.Drawing.Icon -ArgumentList "$path\\resources\\${theme}_cat2.ico";
    New-Object System.Drawing.Icon -ArgumentList "$path\\resources\\${theme}_cat3.ico";
    New-Object System.Drawing.Icon -ArgumentList "$path\\resources\\${theme}_cat4.ico"
)

# CPU 負荷の取得が GUI プロセスをブロックしないよう、バックグラウンドジョブとして実行する
$job = Start-Job -ScriptBlock {
    Get-Counter -Counter "\Processor(_Total)\% Processor Time" -Continuous | ForEach-Object {
        $_.CounterSamples.CookedValue
    }
}

# CPU使用率を定期的に取得するため、タイマーオブジェクトを作成する
$cpuTimer = New-Object Windows.Forms.Timer

# タイマーのイベントハンドラからも書き込みたい変数を script スコープで宣言
$script:cpuUsage = 1

$cpuTimer.Add_Tick( {
        $cpuTimer.Stop()

        # バックグラウンドジョブから結果を取得する
        $script:cpuUsage = [double](Receive-Job $job)[0]

        $cpuTimer.Start()
    })

$cpuTimer.Interval = 3 * 1000
$cpuTimer.Start()

# タスクトレイアイコンを任意のタイミングで差し替えるため、タイマーオブジェクトを作成する
$animateTimer = New-Object Windows.Forms.Timer

# タイマーのイベントハンドラからも書き込みたい変数を script スコープで宣言
$script:idx = 0

$animateTimer.Add_Tick( {
        $animateTimer.Stop()
  
        # 次のコマを表示
        $notifyIcon.Icon = $cats[$script:idx++]
        if ($script:idx -eq 5) { $script:idx = 0 }

        # CPU 使用率をバックグラウンド処理結果から取得
        $notifyIcon.Text = $script:cpuUsage
        # ネコチャンの速さを変更
        $animateTimer.Interval = (200.0 / [System.Math]::Max(1.0, [System.Math]::Min(20.0, $script:cpuUsage / 5)))

        $animateTimer.Start()
    })
  
$animateTimer.Interval = 200
$animateTimer.Start()

# メッセージループで利用する ApplicationContext を作成する
$applicationContext = New-Object System.Windows.Forms.ApplicationContext
  
# アイコンクリック時のイベントハンドラ
$notifyIcon.add_Click( {
        # メッセージループを終了
        $applicationContext.ExitThread()
    })

# アイコンを押すまで終わらないよう、メッセージループを回す
[System.Windows.Forms.Application]::Run( $applicationContext )

# 終了処理
$cpuTimer.Stop()
$animateTimer.Stop()
$notifyIcon.Visible = $false

```

Win32API の読み込みには C# のスニペットを使っていますが、おおよそ PowerShell っぽく書けたのではないでしょうか。PowerShell からタストレイアイコンを触る方法や DOS 窓を表示しない起動については[こちら](https://qiita.com/magiclib/items/cc2de9169c781642e52d)の記事の記載が非常に参考になりました。ありがとうございます。

小ネタとして、パフォーマンス情報を取得する `Get-Counter` のレスポンスが遅かったため、描画をブロックしないようにバックグラウンドジョブで処理させています。`Get-Counter` には継続して情報を取得し続ける `-Continuous` オプションがあるため、ジョブは1つだけ立ち上げています。開発中このオプションに気づかず一定間隔でジョブを増やし続けてメモリ消費がとんでもないことになってしまいました。PowerShell のジョブは別プロセスとして立ち上がるので、そのコストが馬鹿にできないようです。

なおコード中にエラーが表示されていますが PowerShell ISE や VS Code の公式拡張機能からは怒られていないので Qiita / Rouge 側の問題と思われます。

ネコチャンとともに楽しい PowerShell ライフを。

## 参考リンク

* [私PowerShellだけど、君のタスクトレイで暮らしたい](https://qiita.com/magiclib/items/cc2de9169c781642e52d)
* [Win32アプリケーションでWindows 10のライト/ダークモードを検出する方法](https://www.it-swarm.dev/ja/windows/win32%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%A7windows-10%E3%81%AE%E3%83%A9%E3%82%A4%E3%83%88%E3%83%80%E3%83%BC%E3%82%AF%E3%83%A2%E3%83%BC%E3%83%89%E3%82%92%E6%A4%9C%E5%87%BA%E3%81%99%E3%82%8B%E6%96%B9%E6%B3%95/806091802/)
* [PowerShellでサーバで動いているプロセスを知りたい](https://tech.guitarrapc.com/entry/2013/01/08/030100)
* [get-counter as job -continuous](https://social.technet.microsoft.com/Forums/windowsserver/en-US/883ef4e5-e1ee-459d-b085-a19d3a0b86cb/getcounter-as-job-continuous?forum=winserverpowershell)
* [PowerShell で ブロックされたファイルの Zone を解除する](https://tech.guitarrapc.com/entry/2013/07/03/200739)
