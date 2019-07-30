# Docker コンテナの監視ツールについて

Docker コンテナのリソース消費状況などを知りたいとき、ありますよね。今回はそれぞれのツールの立ち位置を整理がてら、記事にしていきたいと思います。

## 組み込みツール `docker stats` を使う

<pre>
$ docker stats
</pre>

上記のコマンドを実行すると、以下のように各コンテナのリソース消費状況を確認できます：

<pre>
CONTAINER ID        NAME                 CPU %               MEM USAGE / LIMIT     MEM %               NET I/O             BLOCK I/O           PIDS
4d6670c8c134        slightly_gray        0.02%               19.15MiB / 1.733GiB   1.08%               14.7kB / 3.19kB     91.8MB / 0B         8
6d4bf5c43dac        blue_garage          0.05%               53.67MiB / 1.733GiB   3.03%               5.03kB / 1.55kB     86.6MB / 61.4kB     8
1731729e82b1        orange_lobby         6.78%               21.63MiB / 1.733GiB   1.22%               1.4kB / 0B          62.8MB / 0B         9
</pre>

リダイレクトを利用してログファイルに出力することもできます。以下のコマンドは中止するまで `stats.txt` にリソース消費状況を追記し続けます（[出典](https://github.com/moby/moby/issues/22618)）：

<pre>
$ while true; do docker stats -a --no-stream >> stats.txt; done
</pre>

用途によってはこれでも十分かもとは思いますが、いろいろと<del>味気がない</del>分かりづらいので何かしらの可視化ツールが欲しくなりますね。

## [Dockerコンテナの監視を行うサービス](https://thinkit.co.jp/article/9318)を使う

すぐさまZabbixなど既存の監視ツールとかを使いたくなってくるのですが、そう上手くはいきません。だいぶ古めの資料ですが……

> 既存の監視ツールはサーバが固定で存在することを前提としており、Immutable（Disposable） Computing環境のように生成と廃棄を繰り返す状態は想定していない。
> クラスタリングのために同一サーバを廃棄後に生成した場合は監視を継続する必要があるが、コンテナの場合はIPアドレスも変わるため、どのコンテナを継続監視すべきかの判定を行う必要がある。
> （中略）
> Docker環境の監視も行えるSaaSの利用が、非常に有効な解決策である。

ということらしいです。既存のものをそのまま使おうとするとしんどいので SaaS にまるっと投げてしまおうという発想ですね。上記記事の中で挙げられた SaaS は以下の通りです：

1.	[New Relic](http://newrelic.com/)
2.	[AppDynamics](http://www.appdynamics.jp/)
3.	[sysdig cloud](http://www.sysdig.org/)
4.	[DATADOG](https://www.datadoghq.com/)
5.	[SignalFx](https://signalfx.com/)
6.	[Librato](https://www.librato.com/)
7.	[Scout Monitoring](https://www.scoutapp.com/)
8.	[Mackerel](https://mackerel.io/ja/)

とはいえ SaaS に投げるコストが惜しかったり、そもそも外部に投げちゃいけなかったりする場合のほうが多いかもしれません。僕自身も利用できたことはありません。ということで、Docker コンテナの可視化に最適化されたツールをセルフホスティングしよう！という方向になってきます。

## Zabbix + [Zabbix Docker Monitoring](https://github.com/monitoringartist/dockbix-agent-xxl) を使う

Zabbix Docker Monitoring はホスト上のコンテナを自動で検出してモニタリング対象とし、Zabbix エージェントとして働いてくれるツールです。コンテナではなくホストにインストールするだけでいいので、コンテナに手を加える必要はありません。これ自身も Docker コンテナとして動かすことができます：

<pre>
$ docker run \
  --name=dockbix-agent-xxl \
  --net=host \
  --privileged \
  -v /:/rootfs \
  -v /var/run:/var/run \
  --restart unless-stopped \
  -e "ZA_Server=[ZABBIX SERVER IP/DNS NAME/IP_RANGE]" \
  -e "ZA_ServerActive=[ZABBIX SERVER IP/DNS NAME]" \
  -d monitoringartist/dockbix-agent-xxl-limited:latest
</pre>

基本的には Docker ホストとは別に Zabbix サーバを立てることになるので、単一ホストなどミニマルな運用をしたい場合は以後のツールが検討対象になります。

## [cAdvisor](https://github.com/google/cadvisor) を使う

Dcoker ホストおよび Dcoker ホスト上の Docker コンテナのリソース消費状況を監視してくれるツールです。Kubernetes の一部を構成しており、 Google によって開発が進められてきました。これ自身も Docker コンテナとして動かすことができます：

<pre>
$ docker run \
  --volume=/var/run:/var/run:rw \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  --detach=true \
  --privileged \
  google/cadvisor:latest
</pre>

Docker ホストのポート 8080 にアクセスすると cAdvisor の WebUI が表示され、リソースの消費状況を確認することができます。cAdvisor の欠点としてデータを RAM 上にしか保持しないため、データ永続化には他ツールとの併用が必要になります。

## cAdvisor + [InfluxDB](https://www.influxdata.com/time-series-platform/) を使う

InfluxDBは時系列DBの一種で、cAdvisor が吐いた情報を永続化できます。これ自身も Docker コンテナとして動かすことができます：

<pre>
$ docker run -d -p 8086:8086 -v /var/lib/influxdb:/var/lib/influxdb influxdb
</pre>

InfluxDB コンテナが起動したら、以下の要領で初期設定を行います：

<pre>
$ docker exec -it influxdb bash # InfluxDB コンテナに入る
# hostname -i                   # IP アドレスを調べる
# influx                        # InfluxDB と対話
> CREATE DATABASE cadvisor      # cAdvisor 用の DB を作成
</pre>

なお、DB 作成は[API リファレンス](https://docs.influxdata.com/influxdb/v1.7/tools/api/)を参考に WebAPI 経由で行うこともできます。

次に、cAdvisor コンテナにオプションを添えて起動します：

<pre>
$ docker run -d \
  --volume=/var/run:/var/run:rw\
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  --detach=true --privileged \
  google/cadvisor:latest \
  --log_dir=/ \
  --storage_driver=influxdb \
  --storage_driver_host=[influxDB コンテナの IP アドレス]:8086 \
  --storage_driver_user=root \
  --storage_driver_user=root \
  --storage_driver_password=root \
  --storage_driver_secure=False
</pre>

InfluxDB の WebAPI を叩けば、cAdvisor が保存したリソース消費状況の履歴が確認できるはずです。

## cAdvisor + InfluxDB + [Grafana](https://grafana.com/docs/installation/docker/) を使う

……が、これでは当初の目的となる可視化ができていないので、 Grafana という Kibana派生のグラフ描画ツールを利用して可視化します。これ自身も Docker コンテナとして動かすことができます：

<pre>
$ docker run -d -p 3000:3000 grafana/grafana
</pre>

Docker ホストのポート 3000 にアクセスすると Grafana の WebUI が表示されます。データソースとして `http://[influxDB コンテナの IP アドレス]:8086` を指定すると可視化できます。

[cAdvisor with InfluxDB](https://grafana.com/grafana/dashboards/4637/) をダッシュボードにインポートすれば、すぐにリソース監視に入ることができるでしょう。

## cAdvisor + InfluxDB + Grafana を docker-compose.yml で使う

毎度 `hostname -i` したりするのは非現実的なので docker-compose.yml で一括成型します：

<pre>
version: '2'
services:
 influxdb:
   image: influxdb
   volumes:
     - ~/influxdb:/var/lib/influxdb
   ports:
     - 8086:8086
 cadvisor:
   image: google/cadvisor:latest
   ports:
     - "8080:8080"
   volumes:
     - /var/run:/var/run:rw
     - /sys:/sys:ro
     - /var/lib/docker/:/var/lib/docker:ro
   command: --log_dir=/ --storage_driver=influxdb --storage_driver_host=influxdb:8086 --storage_driver_user=root --storage_driver_user=root --storage_driver_password=root --storage_driver_secure=False
   depends_on:
     - "influxdb"
 grafana:
   image: grafana/grafana
   ports:
     - 3000:3000
</pre>

ホスト名で名前解決ができるようになっているので、Grafana のデータソース指定では `http://influxdb:8086` と入力します。

## cAdvisor + [Prometheus](https://prometheus.io) + ( | Grafana | Zabbix )  を使う

Prometheus はプル型の監視ツールです。Zabbix などのプッシュ型の監視ツールは監視対象にエージェントをインストールする必要がありますが、Prometheus はこちらから監視対象にアクセスを行って各種データを取得します。

Prometheus はすぐれた監視ツールですが、UI が複雑ですので、Grafana や Zabbix に可視化をまかせる構成も考えられるでしょう。

Grafanaでの可視化を行う場合、cAdvisor と Grafana の間には InfluxDB と Prometheus のいずれを挟むべきなのでしょうか。Prometheus 公式の [Comparison to alternatives](https://prometheus.io/docs/introduction/comparison/#prometheus-vs-influxdb) のページでは以下のように述べられています：

<pre>
Where InfluxDB is better:

    If you're doing event logging.
    Commercial option offers clustering for InfluxDB, which is also better for long term data storage.
    Eventually consistent view of data between replicas.

Where Prometheus is better:

    If you're primarily doing metrics.
    More powerful query language, alerting, and notification functionality.
    Higher availability and uptime for graphing and alerting.
</pre>

ということなので、自分の用途に合った方を選びましょう。

ちなみに、Grafana のダッシュボードストアに掲載されているダッシュボードの数だと cAdvisor + InfluxDB より Prometheus のほうがかなり多いようです。
