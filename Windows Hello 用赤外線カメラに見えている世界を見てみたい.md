# Windows Hello 用赤外線カメラに見えている世界を見てみたい

先日、長年使用していた Web カメラが壊れてしまったため、Windows Hello 対応の Web カメラ [Elecom UCAM-CF20FBBK](https://www.elecom.co.jp/products/UCAM-CF20FBBK.html) を購入しました。実売価格 5000 円程度でスマートなログイン体験ができるようになり、大満足です。

ところで、Windows Hello では顔認証のために IR（赤外線）画像が利用されています。[^1] 通常のカメラでは環境光の影響を受け、顔認証に必要な情報を取得できないケースがあるためです。

[^1]: より正確には NIR = Near Infrared (近赤外線) 画像です。サーモグラフィに使用されるものは LWIR = Long Wavelength Infrared (長波長赤外線)であり、波長が異なります。

> 低照度の場合
>
> ![通常画像1](https://learn.microsoft.com/en-us/windows-hardware/design/images/hello1.png) ![IR画像1](https://learn.microsoft.com/en-us/windows-hardware/design/images/hello2.png)

> 横から光を当てられている場合
>
> ![通常画像2](https://learn.microsoft.com/en-us/windows-hardware/design/images/hello3.png) ![IR画像2](https://learn.microsoft.com/en-us/windows-hardware/design/images/hello4.png) [^2]

[^2]: <https://learn.microsoft.com/ja-jp/windows-hardware/design/device-experiences/windows-hello-face-authentication>

せっかく手元に IR カメラがあるならば、それが見ている世界を見たいのがエンジニア心というもの。しかし、Zoom 等でカメラの一覧を確認しても IR カメラは選択肢に出てきません。Windows Hello は利用でき、デバイスマネージャにも見えているのになぜでしょうか。

![device-manager.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/2f8e0c17-ebc4-f163-98dd-297bdc3d4866.png)

どうやら IR カメラは通常のカメラと並列には扱われないようです。[^3] というのも、IR カメラの映像は通常カメラのそれと比べて特殊な見え方をします。意図せず IR カメラを選択したライトユーザが「カメラが壊れた！」と思わないためにも、選択肢から隠すのは妥当なように思えます。では、IR カメラの映像を確認する方法は本当にないのでしょうか？

[^3]: [Windows 10 の特定バージョンまでは選択肢にあったという情報もインターネットにはありました](https://www.reddit.com/r/Surface/comments/ryip6o/comment/hrqesyo/)が、真相は不明です。

## UWP で Windows Hello 用 IR カメラの映像を表示する

実は、WinRT API に含まれる [Windows.Media.Capture.Frames.InfraredMediaFrame](https://learn.microsoft.com/ja-jp/uwp/api/windows.media.capture.frames.infraredmediaframe?view=winrt-22621) で IR カメラの映像を取得できます。[UWP の公式サンプル集](https://github.com/microsoft/Windows-universal-samples/) には `Windows.Media.Capture.Frames` のサンプルもありますので、これが利用できます。GitHub からクローン後、Visual Studio で `Samples\CameraFrames\cs\CameraFrames.sln` を開いてビルドします。

![process-media-frames-with-mediaframereader.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/cc0ca8d5-8d00-3e2e-58f1-9e006cd00bb9.png)

見えました! 映像が奇妙な色調になっているのは、サンプルが[赤外線の値を疑似カラーグラデーションに変換している](https://learn.microsoft.com/ja-JP/windows/uwp/audio-video-camera/process-media-frames-with-mediaframereader#the-framerenderer-helper-class)ためです。

## WPF で Windows Hello 用 IR カメラの映像を表示する

[WPF でも TargetFramework を指定することで WinRT API を使用できます](https://learn.microsoft.com/ja-jp/windows/apps/desktop/modernize/desktop-to-uwp-enhance)ので、IR カメラの映像は表示できるはずです。試したところ、`MediaCapture.CapturePhotoToStreamAsync()` ではエラーとなり、IR カメラの映像をキャプチャできませんでした：

```log
メディアの種類に指定されたデータが無効か、矛盾するか、またはこのオブジェクトではサポートされていません。
Passthrough mode, sink media type does not match source media type
```

そのため、素直に上記サンプルと同様 `MediaFrameReader` を使ったメディア フレームの処理を行います：

```csharp
private async void Start(object sender, RoutedEventArgs e)
{
    // デバイスで現在利用可能な MediaFrameSourceGroup のリストを取得する
    var frameSourceGroups = await MediaFrameSourceGroup.FindAllAsync();

    // IR データを生成する FrameSourceGroups を選択
    var selectedGroup = frameSourceGroups.FirstOrDefault(group => group.SourceInfos.Any(info => info.SourceKind == MediaFrameSourceKind.Infrared));
    if (selectedGroup == null)
    {
        Debug.WriteLine("IR カメラが見つかりませんでした");
        return;
    }

    var mediaCapture = new MediaCapture();
    try
    {
        // MediaCapture に選択したソースを設定して初期化
        await mediaCapture.InitializeAsync(new MediaCaptureInitializationSettings()
        {
            SourceGroup = selectedGroup,
            SharingMode = MediaCaptureSharingMode.ExclusiveControl,
            MemoryPreference = MediaCaptureMemoryPreference.Cpu,
            StreamingCaptureMode = StreamingCaptureMode.Video
        });
    }
    catch (Exception ex)
    {
        Debug.WriteLine("MediaCapture の初期化に失敗しました: " + ex.Message);
        return;
    }

    // 選択したソースから MediaFrameReader を作成
    var mediaFrameReader = await mediaCapture.CreateFrameReaderAsync(mediaCapture.FrameSources[selectedGroup.SourceInfos[0].Id]);

    // MediaFrameReader の FrameArrived イベントハンドラに処理を登録
    mediaFrameReader.FrameArrived += MediaFrameReader_FrameArrived;

    // MediaFrameReader の開始
    await mediaFrameReader.StartAsync();
}


/// <summary>
/// MediaFrameReader にフレームが到着した時の処理
/// </summary>
private void MediaFrameReader_FrameArrived(MediaFrameReader sender, MediaFrameArrivedEventArgs args)
{
    // sender から最新フレームへの参照を取得
    using var latestFrameReference = sender.TryAcquireLatestFrame();

    // 最新フレームのビットマップ
    var softwareBitmap = latestFrameReference.VideoMediaFrame.SoftwareBitmap;

    // WPF の Image コントロールで表示できるよう、BGRA8 のアルファ乗算済みに変換する
    if (softwareBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 ||
        softwareBitmap.BitmapAlphaMode != BitmapAlphaMode.Premultiplied)
    {
        softwareBitmap = SoftwareBitmap.Convert(softwareBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
    }

    // UI スレッドで画像を更新する
    CameraImage.Dispatcher.BeginInvoke(async () =>
    {
        // 同時実行させない
        if (_running) return;
        _running = true;

        // WPF の Image コントロールで表示できるよう、SoftwareBitmap から BitmapImage に変換する
        CameraImage.Source = await ConvertSoftwareBitmap2BitmapImage(softwareBitmap);

        _running = false;
    });
}

/// <summary>
/// インメモリで SoftwareBitmap から BitmapImage に変換する
/// </summary>
/// <param name="src">変換元</param>
/// <returns>変換結果</returns>
private static async Task<BitmapImage> ConvertSoftwareBitmap2BitmapImage(SoftwareBitmap src)
{
    // インメモリストリームに SoftwareBitmap をセット
    using var stream = new Windows.Storage.Streams.InMemoryRandomAccessStream();
    var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.BmpEncoderId, stream);
    encoder.SetSoftwareBitmap(src);
    await encoder.FlushAsync();

    // インメモリストリームから BitmapImage を作成
    var result = new BitmapImage();
    result.BeginInit();
    result.StreamSource = stream.AsStream();
    result.CacheOption = BitmapCacheOption.OnLoad;
    result.EndInit();
    result.Freeze();

    return result;
}
```

![InfraredMediaFrameSample.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/efb54c45-6251-101e-5105-cedc4fb5dac0.png)

成功です! IR カメラの映像を WPF アプリケーションでも表示できました。なお、ソースの全文と成果物は[こちら](https://github.com/yokra9/InfraredMediaFrameSample)に格納しています（MIT License）。

## 参考リンク

* [Windows Hello 顔認証 | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows-hardware/design/device-experiences/windows-hello-face-authentication)
* [How do i access the Microsoft IR camera? : r/Surface](https://www.reddit.com/r/Surface/comments/ryip6o/how_do_i_access_the_microsoft_ir_camera/)
* [Access and record using your IR laptop camera using Matlab - YouTube](https://www.youtube.com/watch?v=YJjS9lhZi6g)
* [Access Integrated IR Camera - Microsoft Community](https://answers.microsoft.com/en-us/windows/forum/all/access-integrated-ir-camera/702c7d11-ef7f-4701-b79b-a237dbe4ac90)
* [webcam - How to access Windows Hello IR Camera - Super User](https://superuser.com/questions/1713968/how-to-access-windows-hello-ir-camera)
* [Infrared Camera in Media Foundation – Fooling Around](https://alax.info/blog/1911)
* [Windows.Media.Capture.Frames 名前空間 - Windows UWP applications | Microsoft Learn](https://learn.microsoft.com/ja-jp/uwp/api/windows.media.capture.frames?view=winrt-22621)
* [InfraredMediaFrame クラス (Windows.Media.Capture.Frames) - Windows UWP applications | Microsoft Learn](https://learn.microsoft.com/ja-jp/uwp/api/windows.media.capture.frames.infraredmediaframe?view=winrt-22621)
* [MediaFrameReader を使ったメディア フレームの処理 - UWP applications | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/uwp/audio-video-camera/process-media-frames-with-mediaframereader)
* [Camera frames sample : microsoft/Windows-universal-samples](https://github.com/microsoft/Windows-universal-samples/tree/main/Samples/CameraFrames)
* [.NET 6からWindows Runtime APIを呼ぶのが劇的に楽な件 - はつねの日記](https://hatsune.hatenablog.jp/entry/2022/01/25/193922)
* [デスクトップ アプリで Windows ランタイム API を呼び出す - Windows apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/apps/desktop/modernize/desktop-to-uwp-enhance)
* [Display SoftwareBitmap on image control without saving to file in UWP C# - Stack Overflow](https://stackoverflow.com/questions/48156631/display-softwarebitmap-on-image-control-without-saving-to-file-in-uwp-c-sharp)
* [ビットマップ画像の作成、編集、保存 - UWP applications | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/uwp/audio-video-camera/imaging)
* [wpf - Convert memory stream to BitmapImage? - Stack Overflow](https://stackoverflow.com/questions/5346727/convert-memory-stream-to-bitmapimage)
* [Known trimming incompatibilities - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/incompatibilities)
* [Support IL trimming · Issue #2478 · microsoft/WindowsAppSDK](https://github.com/microsoft/WindowsAppSDK/issues/2478)
