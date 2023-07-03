# JavaCV で動画ファイルをアニメーション GIF に変換してみる

[JavaCV](https://github.com/bytedeco/javacv) は [OpenCV](http://opencv.org/) や [FFmpeg](http://ffmpeg.org/) 等をラップして Java で扱えるようにしたライブラリです。内部的には JNI および [JavaCPP](https://github.com/bytedeco/javacpp) が使用されています。各プラットフォーム向けにコンパイルされたネイティブライブラリを JAR 化して Maven 上の依存関係としているので、ネイティブライブラリの力を手軽に借りられます。別途ネイティブライブラリをインストールしたり、パスを設定したりする必要はありません。

[OpenCV には公式で Java / Scala 向けのポートが用意されています](https://docs.opencv.org/4.x/d9/d52/tutorial_java_dev_intro.html)が、OpenCV のビルドをはじめ使用までの手順が煩雑ですので Maven 依存関係の追加で済むのは嬉しいですね。ffmpeg はパッケージ導入が簡単なので `Runtime.exec()` から CLI を呼び出すのもアリですが、JavaCV ならプラットフォームごとの違いを自力で吸収しなくて済みます。Java のマルチプラットフォーム性を魅力とする環境なら良い選択肢と言えそうですね。

## 動画ファイルをアニメーション GIF に変換してみるサンプル

というわけで、ffmpeg のユースケースの1つである動画ファイルのアニメーション GIF 変換を試してみました。なお、CLI なら以下のようになります：

```bash
ffmpeg -i big_buck_bunny.mp4 -s 640x320 -r 5 output.gif
```

プロジェクト全体は[こちらのレポジトリ](https://github.com/yokra9/JavaCV-Movie2Gif-example)で公開していますが、小規模なので Java ソース全文を掲載します：

```java:Movie2Gif.java
import java.util.Date;
import java.util.Objects;
import org.bytedeco.javacv.FFmpegFrameFilter;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.FFmpegFrameRecorder;
import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.FrameGrabber;
import org.bytedeco.javacv.FrameRecorder;
import org.bytedeco.ffmpeg.global.avutil;

public class Movie2Gif {

    public static void main(String[] args) {

        String inputFile = args[0]; // "big_buck_bunny.mp4"
        String outputFile = String.format("%1$s_%2$tY%2$tm%2$td%2$tH%2$tM%2$tS.gif", inputFile, new Date());
        int width = Integer.parseInt(args[1]); // 640
        int height = Integer.parseInt(args[2]); // 360
        int fps = Integer.parseInt(args[3]); // 5
        Movie2Gif.convert(inputFile, outputFile, width, height, fps);

    }

    /**
     * 動画ファイルをアニメーション GIF に変換する
     * 
     * @param input  ソース動画のファイル名
     * @param output GIF のファイル名
     * @param width  GIF の幅
     * @param height GIF の高さ
     * @param fps    GIF のFPS
     */
    public static void convert(String input, String output, int width, int height, int fps) {

        try (
                FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(input);
                // ファイルサイズ削減のために FPS を下げる。JavaCV では r オプションが使えないため、代わりに FPS フィルタを利用する。
                FFmpegFrameFilter filter = new FFmpegFrameFilter(String.format("fps=fps=%d", fps), width, height);
                FFmpegFrameRecorder recorder = new FFmpegFrameRecorder(output, width, height)) {

            grabber.start();

            filter.setSampleFormat(grabber.getSampleFormat());
            filter.setSampleRate(grabber.getSampleRate());
            filter.setPixelFormat(grabber.getPixelFormat());
            filter.setFrameRate(grabber.getFrameRate());
            filter.start();

            // GIF 出力に対応したピクセルフォーマットを指定する
            recorder.setPixelFormat(avutil.AV_PIX_FMT_RGB8);
            recorder.setSampleRate(grabber.getSampleRate());
            recorder.setFrameRate(fps);
            recorder.start();

            Frame frame, filteredFrame;
            while (Objects.nonNull((frame = grabber.grabFrame(false, true, true, false)))) {

                if (Objects.nonNull(frame.image) || Objects.nonNull(frame.samples)) {
                    filter.push(frame);
                }

                if (Objects.nonNull((filteredFrame = filter.pull()))) {
                    if (Objects.nonNull(filteredFrame.image) || Objects.nonNull(filteredFrame.samples)) {
                        recorder.record(filteredFrame);
                    }
                }

            }

        } catch (FrameGrabber.Exception e) {
            e.printStackTrace();
        } catch (FrameRecorder.Exception e) {
            e.printStackTrace();
        } catch (org.bytedeco.javacv.FrameFilter.Exception e) {
            e.printStackTrace();
        }

    }

}
```

コメントに記載のある通り、`-r` オプションのようなフレームレート指定ができないため、代替手段として FPS フィルタを使用しています。また、GIF 出力に対応したピクセルフォーマットを指定する必要がありました（`rgb8`, `bgr8`, `rgb4_byte`, `bgr4_byte`）。

## 参考リンク

* [JavaでOpenCVを使う](https://qiita.com/ketaro-m/items/86564ecb5737099d21f5)
* [OpenCV: Introduction to Java Development](https://docs.opencv.org/4.x/d9/d52/tutorial_java_dev_intro.html)
* [FFmpegで動画をGIFに変換](https://qiita.com/wMETAw/items/fdb754022aec1da88e6e)
* [FFmpeg Filters Documentation](http://ffmpeg.org/ffmpeg-filters.html#fps)
* [How to make GIFs with FFMPEG](https://engineering.giphy.com/how-to-make-gifs-with-ffmpeg/)
* [Audio and video are out of sync still appear when i change the recorder frame rate(I use a fixed frame rate) #1398](https://github.com/bytedeco/javacv/issues/1398)
* [FFMPEG: Incompatible pixel format 'rgb24' for codec 'gif', auto-selecting format 'rgb8'](https://stackoverflow.com/questions/45762670/ffmpeg-incompatible-pixel-format-rgb24-for-codec-gif-auto-selecting-format)
