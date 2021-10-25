# ファイアウォールの影響で WSL2 からインターネットアクセスができないときの対処法

[一部のセキュリティ対策ソフトウェアがインストールされている環境では、WSL2 からインターネットアクセスできないことがあります](https://docs.microsoft.com/ja-jp/windows/wsl/faq#wsl---------------------------)。ファイアウォールの設定で除外することがベストですが、WSL2 はその特異さから相性が悪い製品・環境も存在します。[^1]

[^1]: 許可リストの制御に Windows のプロセス名や宛先ホストなどしか指定できず、WSL2 上のプロセスを安全に許可できないパターンなど。

WSL2 の主な用途は開発環境の構築でしょうから、いまどきスタンドアローンなのは辛すぎます。どうにかしたいですね。

## ローカル HTTP プロキシを利用する

そんなときは、[stone](http://www.gcd.org/sengoku/stone/Welcome.ja.html) や [Squid for Windows](https://squid.diladele.com/) などを利用してローカル HTTP プロキシを立てることで問題を回避できる可能性があります。まず、Windows 側でプロキシサーバを起動します。

```powershell
# Windows 側の 3128 ポートでプロキシを起動
stone proxy 3128
```

この状態で、HTTP プロキシとして Windows 側の 3128 ポートを参照するとインターネットと通信できるようになります。環境変数を設定してあげましょう。[^2] [^3]

[^2]: 出来ない場合はファイアウォールのログを確認し、必要に応じてプロキシのプロセスを許可リストに追加してください。

[^3]: 非対話シェルでも環境変数が設定されるよう、`~/.profile` か `~/.bash_profile` に追記することをお勧めします。`~/.bashrc` だと、たとえば VSCode の `devcontainer.json` でホスト側の環境変数を渡せなくなります。

```bash
proxyAddress=$(ip route | grep 'default via' | grep -Eo '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}')
proxyPort=3128
export http_proxy="http://${proxyAddress}:${proxyPort}"
export https_proxy="http://${proxyAddress}:${proxyPort}"
export HTTP_PROXY=${http_proxy}
export HTTPS_PROXY=${https_proxy}
```

WSL2 から Windows 側にアクセス可能な IP アドレスは `localhost` で引けないので、デフォルトルートとして指定されている IP アドレスを参照し動的に設定します。この IP アドレスは Windows を再起動するたびに再作成される WSL2 用の仮想アダプタのものなので、静的に設定するべきではありません。

## 参考リンク

* [WSL2側からWindows側のIPアドレスを調べる方法](https://qiita.com/samunohito/items/019c1432161a950892be)
* [devcontainer.json not loading custom localEnv values correctly using WSL2](https://github.com/microsoft/vscode-remote-release/issues/3456)
* [Linuxがほぼそのまま動くようになった「WSL2」のネットワーク機能](https://atmarkit.itmedia.co.jp/ait/articles/1909/09/news020.html)
