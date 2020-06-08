# 社内環境で Docker for Windows を使うときにハマったこと

普段 Docker (for Linux) を利用している人が Docker for Windows を試したらドツボにハマったのでメモ。

## server gave HTTP response to HTTPS client => insecure registry を追加する

社内環境に立てた Docker Registry が HTTPS に対応していない場合、イメージを pull したときに以下のようなエラーが発生します：

```shell
ERROR: Get http://<社内レジストリ>:5000  http: server gave HTTP response to HTTPS client
```
このような場合、当該レジストリを insecure registry として登録すれば解決します。Linux の場合は `/etc/docker/daemon.json` を編集しますが、Docker for Windows の場合は [Settings] - [Docker Engine] で編集します：

```json:daemon.json
{
  "insecure-registries" : ["<社内レジストリ>:5000"]
}
```

このとき注意すべきことは、**プロコトルは記述しない**ということです。記述しても問題なく適用＆再起動できてしまうので注意してください。間違った設定のせいで Settings が開けなくなった場合はあきらめて再インストールしてください。

## dial tcp: lookup registry-1.docker.io: no such host. => プロキシを設定する

社**外**環境にある Docker Registory（公式など）から pull したときに以下のようなエラーが発生する場合があります：

```
docker: Error response from daemon: Get https://registry-1.docker.io/v2/: dial tcp: lookup registry-1.docker.io: no such host.
```

そんなホストみつからないよ！　といっていますが DNS の問題ではなく、プロキシが効いていないためのエラーです。そのため、[Settings] - [Resources] - [Proxies] でプロキシの設定を行います。プロキシサーバに BASIC 認証がかかっている場合は以下のように設定します。

```
http://<ユーザ名>:<パスワード>@<プロキシサーバ>:<ポート>
```

## 参考リンク

* [Deploy a plain HTTP registry](https://docs.docker.com/registry/insecure/)
* [lookup registry-1.docker.io: no such host](https://stackoverflow.com/questions/46036152/lookup-registry-1-docker-io-no-such-host)
