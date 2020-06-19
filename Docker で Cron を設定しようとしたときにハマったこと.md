# Docker で Cron を設定しようとしたときにハマったこと

こんな感じの Dockerfile で Cron が動くかな、と思って作業を開始しました：

```Dockerfile:Dockerfile
FROM tomcat

ADD crontab /var/spool/crontab/root

ADD run.sh /bin/run.sh
CMD ["sh","/bin/run.sh"]
```

```crontab:crontab
* * * * * echo "test" >> /var/tmp/test
```

```run.sh
/etc/init.d/cron start

tail -f /dev/null
```

はたして、crontab に記載した通りに動きません。シェルにログインして確認してみましょう：

```shell
# ps -aef | grep cron
root        63    57  0 12:49 pts/0    00:00:00 grep cron
```

Cron デーモンが動いていません。たたき起こしてみましょう：

```shell
# cron
bash: cron: command not found
```

そもそも cron が入っていませんので、それは動きませんね。

## Cron を追加する

今回はベースイメージが debian 系なので、`apt install cron` でインストールしてみましょう：

```shell
# apt install cron
Reading package lists... Done
Building dependency tree
Reading state information... Done
E: Unable to locate package cron
```

今度はパッケージが見つからないようです。`apt update` を実施します。

```shell
# apt update
Get:1 http://security.debian.org/debian-security stretch/updates InRelease [94.3 kB]
Ign:2 http://deb.debian.org/debian stretch InRelease
Get:3 http://deb.debian.org/debian stretch-updates InRelease [91.0 kB]
Get:4 http://deb.debian.org/debian stretch Release [118 kB]
Get:5 http://deb.debian.org/debian stretch Release.gpg [2410 B]
Get:6 http://security.debian.org/debian-security stretch/updates/main amd64 Packages [520 kB]
Get:7 http://deb.debian.org/debian stretch-updates/main amd64 Packages [27.9 kB]
Get:8 http://deb.debian.org/debian stretch/main amd64 Packages [7083 kB]
Fetched 7937 kB in 1s (5230 kB/s)
Reading package lists... Done
Building dependency tree
Reading state information... Done
10 packages can be upgraded. Run 'apt list --upgradable' to see them.

# apt install -y cron
Reading package lists... Done
Building dependency tree
Reading state information... Done
Suggested packages:
  checksecurity
The following NEW packages will be installed:
  cron
0 upgraded, 1 newly installed, 0 to remove and 10 not upgraded.
Need to get 95.4 kB of archives.
After this operation, 257 kB of additional disk space will be used.
Get:1 http://deb.debian.org/debian stretch/main amd64 cron amd64 3.0pl1-128+deb9u1 [95.4 kB]
Fetched 95.4 kB in 0s (3799 kB/s)
debconf: delaying package configuration, since apt-utils is not installed
Selecting previously unselected package cron.
(Reading database ... 13740 files and directories currently installed.)
Preparing to unpack .../cron_3.0pl1-128+deb9u1_amd64.deb ...
Unpacking cron (3.0pl1-128+deb9u1) ...
Setting up cron (3.0pl1-128+deb9u1) ...
update-rc.d: warning: start and stop actions are no longer supported; falling back to defaults
invoke-rc.d: could not determine current runlevel
invoke-rc.d: policy-rc.d denied execution of start.
```

状態を確認してみましょう：

```shell
# ps -aef | grep cron
root        46     0  0 13:23 ?        00:00:00 /usr/sbin/cron
root        80    10  0 13:43 pts/0    00:00:00 grep cron

# crontab -l
no crontab for root
```

Cron デーモンは稼働していますが、crontab が読み込まれていません。あれ？

## Crontab を読み込ませる

たしかに Cron の設定ファイルは `/var/spool/cron/[ユーザ名]` に保存されますが、**ファイルを追加しただけでは Crontab をインストールしてくれません。** そのため、Dockerfile は以下のように修正する必要があります：

```Dockerfile
FROM tomcat

RUN apt update
RUN apt install -y cron

ADD crontab /var/spool/crontab/root
RUN crontab /var/spool/crontab/root

ADD run.sh /bin/run.sh
CMD ["sh","/bin/run.sh"]
```

`crontab [ファイル名]` を利用して、配置したファイルを元に crontab をインストールしています。なんだか冗長ですが致し方ありません。最後に、インストールに成功したか確認してみましょう：

```shell
# crontab -l
* * * * * echo "test" >> /var/tmp/test

# tail -f /var/tmp/test
test
test

```

大丈夫そうですね！ ちなみに、以下のように crontab をインラインで記載することで構成をシンプルにすることができます：

```shell
(crontab -l; echo " * * * * * echo 'test' >> /var/tmp/test") | crontab
```

## ちなみに

`apt install <パッケージ名>` でパッケージが見つからないソースリストを確認します：

```/etc/apt/sources.list
# deb http://snapshot.debian.org/archive/debian/20191224T000000Z stretch main
deb http://deb.debian.org/debian stretch main
# deb http://snapshot.debian.org/archive/debian-security/20191224T000000Z stretch/updates main
deb http://security.debian.org/debian-security stretch/updates main
# deb http://snapshot.debian.org/archive/debian/20191224T000000Z stretch-updates main
deb http://deb.debian.org/debian stretch-updates main
```

ベースにしているDockerイメージを変更した場合、ソースリストに違いがあってインストールに失敗するパターンもあります。上記の場合、`main` レポジトリのみが有効化されおり、公式にサポートされるソフトウェア以外はインストールできなくなっています。サポート外のソフトウェアをインストールしたいときは、`universe` レポジトリを有効化してあげる必要がありますね。Dockerfile を修正しておきましょう：

```Dockerfile
FROM tomcat

ADD sources.list /etc/apt/sources.list
RUN apt update
RUN apt install -y <パッケージ名>
```

```sources.list
# deb http://snapshot.debian.org/archive/debian/20191224T000000Z stretch main
deb http://deb.debian.org/debian stretch main universe
# deb http://snapshot.debian.org/archive/debian-security/20191224T000000Z stretch/updates main universe
deb http://security.debian.org/debian-security stretch/updates main universe
# deb http://snapshot.debian.org/archive/debian/20191224T000000Z stretch-updates main universe
deb http://deb.debian.org/debian stretch-updates main universe
```

## 参考リンク

* [Ubuntu 18.04のapt installで”Unable to locate package”のエラーはsources.listを編集して解決できる](https://tech.sairilab.com/2018/09/post-171/)
* [第16回 1つのDockerコンテナでサービスをたくさん動かすには？（応用編）](https://www.itmedia.co.jp/enterprise/articles/1602/17/news004.html)
* [crontabのガイドライン](https://qiita.com/onomame/items/71646c5517a39bcd01cc)
