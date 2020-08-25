# vuls を Docker Desktop for Windows で利用したい

## TL;DR

簡単に利用できるよう作成した PowerShell スクリプトを OSS として公開しました。

**[vuls-on-docker4win](https://github.com/yokra9/vuls-on-docker4win)**

```powershell
# 初期化処理（初回だけ実行してください）
.\init.ps1

# セキュリティ情報を取得
.\fetch.ps1

# Docker for Windows 用にイメージをビルド
docker build -t vuls .

# vuls を実行する（事前に ~/.ssh/ に SSH 秘密鍵を設置してください）
.\vuls.ps1 configtest -config="/vuls/config.toml"
.\vuls.ps1 scan -config="/vuls/config.toml"
```

## vuls を Windows で利用するときの「つまづきポイント」

### fetch gost（Go Security Tracker）が失敗する問題

[公式のチュートリアル](https://vuls.io/docs/en/tutorial-docker.html) Step 3. を単純に PowerShell に翻訳すると、以下のようになります：

```powershell
docker run --rm -i -v "${PWD}:/vuls" -v "${PWD}/gost-log:/var/log/gost" "vuls/gost" fetch redhat
```

実際に試すとわかりますが、これは失敗してしまいます。理由は gost が clone する [aquasecurity/vuln-list](https://github.com/aquasecurity/vuln-list) というリポジトリに、ファイル名に Windows の禁則文字を含む箇所があるためです。[^1] [^2] マウント機能でコンテナとリポジトリの情報を共有しているため、エラーとなってしまうのです。

[^1]: https://github.com/aquasecurity/vuln-list/blob/master/oval/redhat/6/2010/RHSA-2010:0842.json

[^2]: https://github.com/aquasecurity/vuln-list/blob/master/alpine/3.9/main/xen/CVE-2020-%3F%3F%3F%3F%3F.json

幸い `redhat/` や `debian/` 以下には Windows の禁則文字が含まれていないので、これらに対する脆弱性診断であれば、[リポジトリの一部を Clone する方法](https://qiita.com/yokra9/items/90503b25f4cfe8de2242)で対応可能です。alpine ユーザの方はごめんなさい。

```powershell
git init
git config core.protectNTFS false
git config core.sparsecheckout true # git for Windows 2.25 以降で必須
git config core.longpaths true
git remote add origin "https://github.com/aquasecurity/vuln-list.git"
Copy-Item "..\sparse-checkout" ".git\info"
git pull origin master
```

```text:.git\info\sparse-checkout
/redhat/*
```

Windows 側で一度 sparse-checkout の設定をしておけば、docker コンテナ内でも滞りなく利用できるようになります。

### PowerShell で年次ごとに処理を繰り返す

[範囲演算子](https://docs.microsoft.com/ja-jp/powershell/scripting/learn/deep-dives/everything-about-arrays?view=powershell-7)を利用すれば簡単に実現できます：

```powershell
2002..(Get-Date).Year | ForEach-Object {
    # $_ に年次が格納される
    Write-Host $_;
}
```

### スキャン日時表記を JST にする / `UNPROTECTED PRIVATE KEY FILE!`

[チュートリアル](https://vuls.io/docs/en/tutorial-docker.html) Step 6. では `-v /etc/localtime:/etc/localtime:ro -e "TZ=Asia/Tokyo"` のように、ホストマシンのタイムゾーン設定をマウントし JST 表記に変更しています。しかし Windows には `/etc/localtime` ないので、別の方法で解決する必要があります。

また、スキャン対象との SSH 接続に利用する SSH 秘密鍵をホストマシンからマウントしますが、Windows からマウントしたファイル・フォルダはパーミッションが `777` になっています。SSH から鍵が `TOO OPEN` であると怒られてしまうので、entrypoint で `chmod` してしまいましょう。

```Dockerfile
FROM vuls/vuls

# タイムゾーンを取得する
RUN apk --no-cache add tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    apk del tzdata

COPY docker-entrypoint.sh /usr/local/bin

ENTRYPOINT ["sh", "docker-entrypoint.sh", "vuls"]
```

```bash:docker-entrypoint.sh
#!/bin/bash

cp -R /tmp/.ssh /root/.ssh
chmod 700 /root/.ssh
chmod 600 /root/.ssh/id_rsa

exec "$@"
```

## 参考リンク

* [Setting the timezone](https://wiki.alpinelinux.org/wiki/Setting_the_timezone)
* [Docker Tip #56: Volume Mounting SSH Keys into a Docker Container](https://nickjanetakis.com/blog/docker-tip-56-volume-mounting-ssh-keys-into-a-docker-container)
* [Vuls using Docker on Windows](https://qiita.com/soulhead/items/4b18759dfcf368168842)
