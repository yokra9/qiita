# PowerShell で LZMS なる圧縮アルゴリズムを試さむとしてするなり

## TL;DR

本記事の内容は実用性重点というより検証過程のメモに近いものです。追加インストールなしにコマンドラインで高圧縮したいケースなら、[Windows 11 付属の tar.exe で 7z を指定する](https://qiita.com/yokra9/items/b1b2e92e534f5d39990a)方法をおすすめします。

## LZMS ってなんだ？

Windows 11 Build 25992 以降、[エクスプローラーが 7z や tar などの圧縮・解凍を標準でサポート](https://blogs.windows.com/windows-insider/2023/11/08/announcing-windows-11-insider-preview-build-25992-canary-channel/)するようになりました。この機能は [libarchive](https://www.libarchive.org/)（`archiveint.dll`）により実現されていますが、bsdtar が `tar.exe` として同梱されているので[コマンドラインでも圧縮・解凍できます](https://qiita.com/yokra9/items/b1b2e92e534f5d39990a)。

一方で、`Compress-Archive` / `Expand-Archive` コマンドレットでは依然として ZIP 形式しかサポートされていないようです。ですが、この探索の過程で [Windows 10 Build 10240 から WinRT API を通じて `LZMS` なる圧縮アルゴリズムが利用できる](https://learn.microsoft.com/ja-jp/uwp/api/windows.storage.compression.compressalgorithm?view=winrt-10240)という情報をキャッチしました。`LZMA` の誤字ではなく、です。

## LZMA と LZMS の違い

[LZMA (Lempel-Ziv-Markov chain Algorithm)](https://ja.wikipedia.org/wiki/Lempel-Ziv-Markov_chain-Algorithm) は、7-Zip の作者である Igor Pavlov 氏によって開発された、非常に圧縮率の高いアルゴリズムです。現在ではその改良版である LZMA2 が`.7z` 形式のデフォルトアルゴリズムとして採用されています。7-zip の大部分には GNU LGPL が適用されますが、[LZMA SDK](https://7-zip.opensource.jp/sdk.html) はパブリックドメインで公開されています。

対する LZMS ですが、こちらは何の略称なのか公式な情報源を見つけることができませんでした。というのも、LZMS は Microsoft が Windows のインストールイメージ (`.esd` ファイルなど) で利用するために開発した独自アルゴリズムのようなのです。2012 年ごろにリリースされたらしく、Windows 8 または Windows Server 2012 以降で使用できる [Win32 Compression API](https://learn.microsoft.com/ja-jp/windows/win32/cmpapi/-compression-portal) のドキュメントにも登場します。その仕様は公開されていませんが、リバースエンジニアリングによって開発された [wimlib](https://github.com/ebiggers/wimlib) というオープンソース実装が存在します。作者の ebiggers 氏曰く、当該リポジトリに含まれる [lzms_decompress.c](https://github.com/ebiggers/wimlib/blob/master/src/lzms_decompress.c) 内のコメントとコードが、LZMS に関する入手可能な最良のドキュメントである可能性があるとのことです。[^1]

[^1]: <https://github.com/ebiggers/wimlib/blob/master/README.md#references>

[wimlib の解説](https://wimlib.net/compression.html#LZMS)によると、LZMS は [LZ77](https://ja.wikipedia.org/wiki/LZ77) 系の辞書式符号化をベースとしている点で LZMA と同様です。エントロピー符号化の観点では LZMA が[レンジ符号](https://ja.wikipedia.org/wiki/%E3%83%AC%E3%83%B3%E3%82%B8%E7%AC%A6%E5%8F%B7)を使用しているのに対し、LZMS はレンジ符号と[ハフマン符号](https://ja.wikipedia.org/wiki/%E3%83%8F%E3%83%95%E3%83%9E%E3%83%B3%E7%AC%A6%E5%8F%B7)のハイブリッドになっています。ハフマン符号はレンジ符号に比べて仕組みがシンプルで、一般的に展開処理が高速です。おそらく、LZMS はインストールイメージという高圧縮率と展開速度のバランスが求められる用途に最適化されたアルゴリズムなのでしょう。

## PowerShell で LZMS 圧縮・解凍をやってみる

さて、PowerShell からは直接利用できない LZMS ですが、WinRT API を少し工夫して呼び出すことで、PowerShell スクリプトからでも利用できます。なお、本コードは [microsoft/Windows-universal-samples の Samples/Compression](https://github.com/microsoft/Windows-universal-samples/tree/main/Samples/Compression) を PowerShell に移植したものです。

<details>
<summary><code>Compress-Lzms.ps1</code></summary>

```powershell
try {
    # WinRT アセンブリから必要なクラスをロード
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    [void][Windows.Storage.Streams.RandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
    [void][Windows.Storage.Compression.Compressor, Windows.Storage.Compression, ContentType = WindowsRuntime]
    [void][Windows.Storage.Compression.Decompressor, Windows.Storage.Compression, ContentType = WindowsRuntime]

    # GetAwaiter<TResult>メソッドを取得
    $script:getAwaiter = [WindowsRuntimeSystemExtensions].GetMember('GetAwaiter', 'Method', 'Public,Static') |
    Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
    Select-Object -First 1

    # GetAwaiter<TResult,TProgress>メソッドを取得
    $script:getAwaiterWithProgress = [WindowsRuntimeSystemExtensions].GetMember('GetAwaiter', 'Method', 'Public,Static') |
    Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperationWithProgress`2' } |
    Select-Object -First 1
}
catch {
    Write-Error "初期化中にエラーが発生しました: $($_.Exception.Message)"
}

# 非同期操作を同期的に実行するヘルパー関数
function Invoke-Async {
    param (
        [object]$AsyncTask, # 非同期操作（IAsyncOperation もしくは IAsyncOperationWithProgress）
        [Type]$ResultType,  # 戻り値の型
        [Type]$ProgressType # 進捗の型 (IAsyncOperation の場合は指定しない)
    )

    try {
        if ($ProgressType -eq $null) {
            # 進捗なしの非同期操作
            $genericMethod = $getAwaiter.MakeGenericMethod($ResultType)
        }
        else {
            # 進捗付きの非同期操作
            $genericMethod = $getAwaiterWithProgress.MakeGenericMethod($ResultType, $ProgressType)
        }

        $awaiter = $genericMethod.Invoke($null, @($AsyncTask))
        return $awaiter.GetResult()
    }
    catch {
        Write-Error "非同期操作の実行中にエラーが発生しました: $($_.Exception.Message)"
    }
}

# ソースファイルのストリームを開く内部用関数
function Get-SourceStream {
    param (
        [string]$Path # ソースのパス
    )

    try {
        # ソースファイルの取得
        $getSourcefileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)
        $sourceFile = Invoke-Async $getSourcefileTask -ResultType ([Windows.Storage.StorageFile])

        # ソースファイルのストリームを開く
        $openSourceFileTask = $sourceFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)
        return Invoke-Async $openSourceFileTask -ResultType ([Windows.Storage.Streams.IRandomAccessStream])
    }
    catch {
        Write-Error "ファイル '$Path' の読込中にエラーが発生しました。詳細: $($_.Exception.Message)"
    }
}

# 出力先のパスに空ファイルを作成してストリームを開く内部用関数
function Get-DestStream {
    param (
        [string]$Output # ソースのパス
    )

    try {
        # 出力先のパスに空ファイルを作成
        [void](New-Item $Output -ItemType file -Force)

        # 出力先ファイルの取得
        $getDestfileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($Output)
        $destFile = Invoke-Async $getDestfileTask -ResultType ([Windows.Storage.StorageFile])

        # 出力先ファイルのストリームを開く
        $openDestFileTask = $destFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)
        return Invoke-Async $openDestFileTask -ResultType ([Windows.Storage.Streams.IRandomAccessStream])
    }
    catch {
        Write-Error "ファイル '$Output' の読込中にエラーが発生しました。詳細: $($_.Exception.Message)"
    }
}

# LZMS 形式で圧縮するコマンドレット
function Compress-Lzms {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$Path, # ソースのパス

        [Parameter(Mandatory)]
        [string]$Output # 出力先のパス
    )

    $sourceFileStream = $null
    $destFileStream = $null
    $compressor = $null

    try {
        # ソースファイルのストリームを開く
        $sourceFileStream = Get-SourceStream -Path $Path

        # 出力先ファイルのストリームを開く
        $destFileStream = Get-DestStream -Output $Output

        # LZMS 圧縮アルゴリズムを使用する Compressor インスタンスを作成
        # ブロックサイズ: 0 = デフォルト
        $compressor = New-Object Windows.Storage.Compression.Compressor ($destFileStream.GetOutputStreamAt(0), [Windows.Storage.Compression.CompressAlgorithm]::Lzms, 0)

        # ソースファイルのストリームを Compressor インスタンスにコピー
        $copyTask = [Windows.Storage.Streams.RandomAccessStream]::CopyAsync($sourceFileStream, $compressor)
        $bytesProcessed = Invoke-Async $copyTask -ResultType ([UInt64]) -ProgressType ([UInt64])

        # 終了処理
        [void](Invoke-Async $compressor.FinishAsync() -ResultType ([Boolean]))

        Write-Verbose "処理したバイト数: $bytesProcessed"
        Write-Verbose "圧縮後のバイト数: $($destFileStream.size)"
    }
    catch {
        Write-Error "ファイル '$Path' の圧縮中にエラーが発生しました。詳細: $($_.Exception.Message)"
    }
    finally {
        # リソースを解放
        if ($null -ne $compressor) { $compressor.Dispose() }
        if ($null -ne $destFileStream) { $destFileStream.Dispose() }
        if ($null -ne $sourceFileStream) { $sourceFileStream.Dispose() }
        Write-Verbose "すべてのリソースを解放しました。"
    }
}

# LZMS 形式のデータを解凍するコマンドレット
function Expand-Lzms {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$Path, # ソースのパス
        
        [Parameter(Mandatory)]
        [string]$Output # 出力先のパス
    )
    
    $sourceFileStream = $null
    $destFileStream = $null
    $decompressor = $null

    try {
        # ソースファイルのストリームを開く
        $sourceFileStream = Get-SourceStream -Path $Path

        # 出力先ファイルのストリームを開く
        $destFileStream = Get-DestStream -Output $Output

        # Decompressor インスタンスを作成
        $decompressor = New-Object Windows.Storage.Compression.Decompressor ($sourceFileStream)

        # Decompressor インスタンスのストリームを出力先にコピー
        $copyTask = [Windows.Storage.Streams.RandomAccessStream]::CopyAsync($decompressor, $destFileStream)
        $bytesProcessed = Invoke-Async $copyTask -ResultType ([UInt64]) -ProgressType ([UInt64])
    
        Write-Verbose "処理したバイト数: $bytesProcessed"
    }
    catch {
        Write-Error "ファイル '$Path' の解凍中にエラーが発生しました。詳細: $($_.Exception.Message)"
    }
    finally {
        # リソースを解放
        if ($null -ne $decompressor) { $decompressor.Dispose() }
        if ($null -ne $destFileStream) { $destFileStream.Dispose() }
        if ($null -ne $sourceFileStream) { $sourceFileStream.Dispose() }
        Write-Verbose "すべてのリソースを解放しました。"
    }
}
```

</details>

### 使い方

このスクリプトには `Compress-Lzms` と `Expand-Lzms` という 2 つの関数が含まれています。

```powershell
# コマンドレットをインポートする
. .\Compress-Lzms.ps1

# 圧縮
Compress-Lzms -Path "元のファイル" -Output "圧縮後.lzmsdat"

# 解凍
Expand-Lzms -Path "圧縮後.lzmsdat" -Output "解凍後のファイル"
```

念のため、出力されたデータは生の LZMS データであって、7-Zip 等で開くことができる WIM 形式アーカイブではありません。

なお、動作環境は Windows 10 以降の WinRT API が利用可能な環境で実行された Windows PowerShell（`powershell.exe`）です。PowerShell Core（`pwsh.exe`）では以下エラーとなり実行できません：

```log
Write-Error: 初期化中にエラーが発生しました: Unable to find type [Windows.Storage.StorageFile,Windows.Storage, ContentType=WindowsRuntime].
```

### 内部の解説

WinRT API のメソッドは基本的に非同期 (`IAsyncOperation<T>` や `IAsyncOperationWithProgress<T,U>`) となっています。そのままでは PowerShell から扱いづらいため、同期的に結果を取得するヘルパー関数 `Invoke-Async` を用意しています。これは [TobiasPSP/PsOcr](https://github.com/TobiasPSP/PsOcr) や [aburaage3 氏の投稿](https://note.com/aburaage3/n/nca0e4d34d69a)が紹介しているものに基づきますが、`IAsyncOperationWithProgress<T,U>` にも対応させたのが特色です。

## まとめ

当初の目的だった「PowerShell で LZMA 圧縮・解凍してみる」ことは叶いませんでしたが、その過程で LZMS という面白い技術を発見できました。実用面では [tar.exe で 7z を指定する](https://qiita.com/yokra9/items/b1b2e92e534f5d39990a)方法を推奨しますが、WinRT API を PowerShell から呼び出すテクニックとしても参考になれば幸いです。

## 余談、あるいは[「生成 AI 開発の珍プレー」キャンペーン](https://qiita.com/official-events/5114a25130bf833bbe10)に寄せたこぼれ話

初期の調査において Copilot や Gemini に対し（Web グラウンディングを有効にした状態で）LZMS に関する質問をしたものの、マイナーすぎるためか適切な回答をしてくれませんでした：

* LZMA と取り違えて回答する
* 推測で正式名称を答える
  * Lempel-Ziv-MicroSoft
  * Lempel-Ziv-Microsoft-Scheme
  * Lempel-Ziv-Markov chain with Segmentation
* [CAB（Microsoft Cabinet Format）](https://en.wikipedia.org/wiki/Cabinet_(file_format))で利用されていると回答する
  * 少なくとも [2013 年が最終更新日のドキュメント](https://learn.microsoft.com/ja-jp/previous-versions/bb417343(v=msdn.10))では MSZIP と LZX のみをサポートすると記述

結果としては Gemini の DeepResearch が wimlib の存在を教えてくれたので、そこを踏み台として理解を深めていきました。専門外の分野だと同様レベルのミスをしていても気が付けなさそう（特に Gemini のポッドキャスト風レポートなどの形式では）なので、普段から信用しすぎないように気を付けたいものです。

## 参考リンク

* [CompressAlgorithm 列挙型 (Windows.Storage.Compression) - Windows UWP applications | Microsoft Learn](https://learn.microsoft.com/ja-jp/uwp/api/windows.storage.compression.compressalgorithm?view=winrt-10240)
* [Windows.Storage.Compression 名前空間 - Windows apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/uwp/api/windows.storage.compression?view=winrt-10240)
* [圧縮 API - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/cmpapi/-compression-portal)
* [wimlib - Compression](https://wimlib.net/compression.html)
* [Windows-universal-samples/Samples/Compression at main · microsoft/Windows-universal-samples](https://github.com/microsoft/Windows-universal-samples/tree/main/Samples/Compression)
* [Powershell WinRT(WindowsRuntime)用 awaitの実装例 - papanda925.com](https://papanda925.com/?p=2278)
* [【PowerShell】Windows標準機能のみを使ってOCR実行｜地獄の油揚げ](https://note.com/aburaage3/n/nca0e4d34d69a)
* [TobiasPSP/PsOcr: Home of the PowerShell module "PsOcr" which uses the native Windows 10 OCR engine to convert image files to text](https://github.com/TobiasPSP/PsOcr)
* [Windows 11 では 7z をコマンドラインでも圧縮・解凍できるようになっていた](https://qiita.com/yokra9/items/b1b2e92e534f5d39990a)
