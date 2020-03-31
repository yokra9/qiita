# Linux ではコマンドを使って新型コロナウイルスの世界の感染状況を把握できるらしいけど Windows ではどうやるの？（あるいは PowerShell でも curl っぽいことをしたい）

こんなツイートを見かけました。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">Linuxコマンド「curl」を使って新型コロナウイルスの世界の感染状況を把握できます。Ubuntuでは最初にcurlコマンドをインストールします。<br>$ sudo apt install curl<br>次のように実行します。（：は半角に置き換え）<br>$ curl https：//corona-stats.online<br>$ curl https：//corona-stats.online/Japan <a href="https://t.co/xY6op824Ha">pic.twitter.com/xY6op824Ha</a></p>&mdash; 日経Linux | ラズパイマガジン (@nikkei_Linux) <a href="https://twitter.com/nikkei_Linux/status/1244537560656838657?ref_src=twsrc%5Etfw">March 30, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

`curl` コマンドで感染状況が確認できるWebサイトがあるようです。せっかくなので Windows でも似たようなことをやってみましょう。[^1]

[^1]: あるいは PowerShell で curl っぽいことをする備忘録です（いつも忘れる）

## PowerShell でもやってみた

PowerShell には curl がご用意されていないため、代わりに `Invoke-WebRequest` コマンドレットを使います[^2]：

[^2]: [official curl binary builds for Microsoft Windows](https://curl.haxx.se/windows/) はご用意できました。また、後述のように Windows 10 v1803 からは標準で `curl.exe` がインストールされています。なお、PowerShell における `curl` と `wget` は `Invoke-WebRequest` コマンドレットのエイリアスです。

```Powershell
(Invoke-WebRequest https://corona-stats.online/Japan -UserAgent curl).Content
```

![スクショ.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/7692a3de-d3fd-2fdf-743c-82d48350a180.png)

また、以下のバッチファイルをパスが通ったディレクトリ配置すると、`durl <URL>` でコンテンツを取得することができるようになります：

```durl.bat
@echo off
powershell -Command " (Invoke-WebRequest %* -UserAgent curl).Content"
```

### Windows 10 v1803 以降の場合

`curl.exe` がインストールされているので直接実行できたりしますが、PowerShell の<del>色々とややこしい</del>脳の筋トレに役立つエンコード周りを考慮に入れなければいけないので個人的にはおすすめしません。

![無題.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/767c6cef-c225-d920-69c9-3c396e7ce3d0.png)

#### 2020-04-07 追記

[コメント](https://qiita.com/yokra9/items/1e7cee82bd172f8fac7a#comment-d6a474544bcddd440346)にて @7cc さんがエンコード周りの解説を書いてくださっています。感謝！

## 参考リンク

* [Invoke-WebRequest](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-7)
* [PowerShell: ◆Split演算子](https://mtgpowershell.blogspot.com/2010/11/split.html)
* [「tar」「curl」がWindows 10に、“WSL”も強化 ～Insider Preview Build 17063](https://forest.watch.impress.co.jp/docs/news/1097996.html)
* [Powershell で文字コードを変更する(clip.exe へのリダイレクトもね)](https://www.vwnet.jp/Windows/PowerShell/CharCode.htm)
* [PowerShell でも tail -f がしたいし grep もしたい](https://qiita.com/yokra9/items/d95abda8a795d4e19e0e)
