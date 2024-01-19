# Dockerfile と docker build で Git リポジトリを直接参照してみる

私は以前[「実行可能な Dockerfile」を作ってみる](https://qiita.com/yokra9/items/c2dfa4218959703a6326)という記事を投稿しました。執筆にあたり Docker 関連のリポジトリ([buildkit](https://github.com/moby/buildkit), [buildx](https://github.com/docker/buildx) 等)のリリースノートを確認していて、Git リポジトリを直接参照できるようになった旨の記載が複数ある事に気が付きました。あまり目立つ機能追加でないためかこの点にフォーカスした日本語記事を見た覚えがなかったので、本記事でメモを残すことにします。

## Dockerfile の ADD コマンドで Git リポジトリを参照する

[Dockerfile/1.5.0-labs](https://github.com/moby/buildkit/releases/tag/dockerfile%2F1.5.0-labs) より、ADD コマンドでソースとして [Git URL](https://git-scm.com/docs/git-clone#_git_urls) を指定できるようになりました：

```Dockerfile
ADD [--keep-git-dir=<boolean>] <Git URL> <dir>
```

```Dockerfile:GitHub から Git のソースを ADD してソースからビルドする
# syntax=docker/dockerfile:1.6.0
FROM debian:12-slim AS builder

# GitHubからGitのソースをADD
ADD https://github.com/git/git.git /tmp/src/

# Gitをソースからビルド
RUN <<EOF
# ビルドに必要なツールをインストール
apt-get update
apt-get install -y libcurl4-gnutls-dev libexpat1-dev gettext libz-dev libssl-dev g++ make autoconf

# ソースからインストール
cd /tmp/src/
make configure
./configure --prefix=/usr
make all
make install

# ゴミ掃除
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/src/
EOF
```

このように、コンテナイメージ内に Git がインストールされていない状態でもソースが取得できています。実際に便利そうなケースとしては、ビルドステージ等でリポジトリ上のソースからビルドしたい場合が当てはまりそうです。

## docker build で Git リポジトリを参照する

また、[buildx v0.9.0](https://github.com/docker/buildx/releases/tag/v0.9.0) からビルド時に Git リポジトリを指定できるようになっています：

```plaintext
docker build [OPTIONS] <Git URL>
```

```bash
# GitHub から「GitHub から Git のソースを ADD してソースからビルド」する Dockerfile を取得してビルド
docker build https://github.com/yokra9/docker-add-git-example.git#main:/
```

`docker build` の場合は URL 指定の末尾でタグやブランチ、フォルダも指定できます。

| URL 指定の末尾                | 参照するコミット    | ビルドコンテキスト |
| ---------------------------- | ------------------- | ------------------ |
| myrepo.Git                   | refs/heads/master   | /                  |
| myrepo.Git#mytag             | refs/tags/mytag     | /                  |
| myrepo.Git#mybranch          | refs/heads/mybranch | /                  |
| myrepo.Git#pull/42/head      | refs/pull/42/head   | /                  |
| myrepo.Git#:myfolder         | refs/heads/master   | /myfolder          |
| myrepo.Git#master:myfolder   | refs/heads/master   | /myfolder          |
| myrepo.Git#mytag:myfolder    | refs/tags/mytag     | /myfolder          |
| myrepo.Git#mybranch:myfolder | refs/heads/mybranch | /myfolder          |

CI でリポジトリ上の Dockerfile からビルドするケースでは便利に使えそうですね。

## おまけ: URL からルート・ファイルシステムを読み込んでイメージを作成する

Docker イメージをスクラッチから作成する場合、`ADD` コマンドで Tar 化したファイルシステムを取り込むのが定石のようです[^1] [^2]：

```Dockerfile:Debian
FROM scratch
ADD rootfs.tar.xz /
CMD ["bash"]
```

```Dockerfile:alpine
FROM scratch
ADD alpine-minirootfs-3.19.0-x86_64.tar.gz /
CMD ["/bin/sh"]
```

[^1]: <https://github.com/debuerreotype/docker-debian-artifacts/blob/dist-amd64/bookworm/Dockerfile>

[^2]: <https://github.com/alpinelinux/docker-alpine/blob/v3.19/x86_64/Dockerfile>

ところで、`docker import` はルート・ファイルシステムのアーカイブを元にイメージを作成できるコマンドですが、取得元として URL を指定できます。そのため、インターネットからルート・ファイルシステムのアーカイブを取得してイメージとして取り込むこともできます：

```plaintext
docker import [OPTIONS] file|URL|- [REPOSITORY[:TAG]]
```

```bash
docker import https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.0-x86_64.tar.gz -c "CMD sh" alpine

docker run --rm -it alpine
```

```log
/ # cat /etc/os-release
NAME="Alpine Linux"
ID=alpine
VERSION_ID=3.19.0
PRETTY_NAME="Alpine Linux v3.19"
HOME_URL="https://alpinelinux.org/"
BUG_REPORT_URL="https://gitlab.alpinelinux.org/alpine/aports/-/issues"
```

ルート・ファイルシステムのアーカイブは各ディストリビューションのプロジェクトページからダウンロードできます：

* [Debian](https://docker.debian.net/)
* [alpine](https://www.alpinelinux.org/downloads/)

もしルート・ファイルシステムのアーカイブを GitHub Releases に置くディストリビューションが出てくれば `docker import` でも GitHub 上の資産を参照できますね。[^3] [^4]

[^3]: [ここ](https://github.com/debuerreotype/docker-debian-artifacts/blob/dist-amd64/bookworm/rootfs.tar.xz)や[そこ](https://github.com/alpinelinux/docker-alpine/blob/v3.19/x86_64/alpine-minirootfs-3.19.0-x86_64.tar.gz)から Raw URL を抜いてくれば現状でも可能ですがお行儀良くありませんね。

[^4]: GitHub 上でイメージを配布したいだけであればこんなトリッキーな手段でなく [GitHub Packages Container registry (ghcr.io)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) をお勧めします。

## 参考リンク

* [Dockerfile reference | Adding a Git repository `ADD <git ref> <dir>`](https://docs.docker.com/engine/reference/builder/#adding-a-git-repository-add-git-ref-dir)
* [dockerfile (labs): implement `ADD <git ref>` #2799](https://github.com/moby/buildkit/pull/2799)
* [dockerfile/1.5.0-labs](https://github.com/moby/buildkit/releases/tag/dockerfile%2F1.5.0-labs)
* [Git URL](https://git-scm.com/docs/git-clone#_git_urls)
* [Git のリモートとしてファイルシステム上のリポジトリを登録する](https://qiita.com/yokra9/items/ffc752d4a0092849808d#git-%E3%81%AE%E3%83%AA%E3%83%A2%E3%83%BC%E3%83%88%E3%81%A8%E3%81%97%E3%81%A6%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E4%B8%8A%E3%81%AE%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E3%82%92%E7%99%BB%E9%8C%B2%E3%81%99%E3%82%8B)
* [build: allow external Dockerfile on remote context #994](https://github.com/docker/buildx/pull/994)
* [docker build | Git repositories](https://docs.docker.com/engine/reference/commandline/build/#git-repositories)
* [docker import](https://docs.docker.com/engine/reference/commandline/import/)
