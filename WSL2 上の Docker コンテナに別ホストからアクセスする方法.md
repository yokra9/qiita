# WSL2 上のアプリケーションに別ホストからアクセスする方法（管理者権限なし）

WSL2 上のアプリケーション（Docker コンテナを含む）に別ホストからアクセスするには、[`netsh interface portproxy` でポートフォワードさせる方法](https://github.com/microsoft/WSL/issues/4150)が有名です。

しかし、WSL2 はホストを再起動するたびに IP アドレスが変動します。したがって、毎回マッピングの修正（以前のマッピングの削除と新規登録）が必要となるのですが、そのたび `netsh` に管理者権限を要求されるのは嬉しくありません。[^1]

[^1]: 本稿の内容の他、バッチを Windows サービスとして登録し、管理者として実行させる方法もいいでしょう。

そこで、サードパーティーのアプリケーションを利用してポートフォワードしてみましょう。管理者権限が不要ですし、ファイアウォールの許可設定もより単純にできます。

## ホストから WSL2 にポートフォワードさせる

ポートフォワード機能を持ったアプリケーションの一例として、[stone](http://www.gcd.org/sengoku/stone/Welcome.ja.html) を利用してみましょう。

```powershell:forward.ps1
Param(
    $WSL2_PORT, # WSL2 側のポート
    $HOST_PORT # フォワード先のポート
)

# 既定のディストリビューションからIPアドレスを取得する
$WSL2_HOST = bash -c "ip -4 a show eth0 | grep -oP '(?<=inet\s)[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'"

# stone でポートフォワード
stone "${WSL2_HOST}:${WSL2_PORT}" ${HOST_PORT}
```

stone 以外のアプリケーションを利用する場合は、最終行を適切に修正してください。

実行方法は以下の通りです：

```powershell
.\forward.ps1 <WSL2 側のポート> <フォワード先のポート>

# WSL2 の Port 8080 <=> ホストの Port 8081
.\forward.ps1 8080 8081
```

ファイアウォールで stone が許可されていれば、別ホストから WSL2 内に到達できるはずです。

## 接続元ホストを限定してセキュリティを強化する

このままでは任意のホストがファイアウォールを抜けて WSL2 上に侵入できてしまうので、接続元ホストを制限しましょう：

```powershell:forward.ps1
Param(
    $WSL2_PORT, # WSL2 側のポート
    $HOST_PORT, # フォワード先のポート
    $ALLOWED_LIST # 接続許可リスト
)

# 既定のディストリビューションからIPアドレスを取得する
$WSL2_HOST = bash -c "ip -4 a show eth0 | grep -oP '(?<=inet\s)[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'"

# stone でポートフォワード
stone "${WSL2_HOST}:${WSL2_PORT}" ${HOST_PORT} ${ALLOWED_LIST}
```

実行方法は以下の通りです：

```powershell
.\forward.ps1 <WSL2 側のポート> <フォワード先のポート> <接続許可リスト>

# WSL2 の Port 8080 <=> ホストの Port 8081
# ただし接続元ホストを 192.168.1.* に限定する
.\forward.ps1 8080 8081 "192.168.1.0/255.255.255.0"
```

接続許可リストの書式については [stone の解説記事](https://www.gcd.org/sengoku/docs/NikkeiLinux00-08/relay.ja.html)を参考としてください。

## 参考リンク

* [Netsh interface portproxy コマンド](https://docs.microsoft.com/ja-jp/windows-server/networking/technologies/netsh/netsh-interface-portproxy)
* [grepの-oオプションと-Pオプションの組み合わせが便利](https://greymd.hatenablog.com/entry/2014/09/27/154305)
