# PostgreSQL で現在のコネクション数をリアルタイムに確認する

負荷試験を実施しているときなど、PostgreSQL に対するコネクション数の増減をリアルタイムに監視したいことがあります。そんなとき、`psql` で実行できる以下のクエリ・メタコマンドが便利です：

```sql
SELECT numbackends FROM pg_stat_database; \watch <間隔(秒)>

-- 1秒ごとに監視したい場合
SELECT numbackends FROM pg_stat_database; \watch 1

-- 0.5秒ごとに監視したい場合
SELECT numbackends FROM pg_stat_database; \watch 0.5
```

## PostgreSQL で現在のコネクション数を確認する

現在のコネクション数は `SELECT numbackends FROM pg_stat_database;` で取得できます。`pg_stat_database` は**標準統計情報ビュー**と呼ばれるものの1つで、PostgreSQL の統計情報コレクタが収集した情報を取得できます。

## クエリの実行結果をリアルタイムに確認する

`\watch` は psql 9.3 から追加されたメタコマンドです。直前に入力したクエリを指定した間隔（秒）で繰り返して実行します。間隔を指定しない場合は2秒間隔がデフォルト値となります。[^1]

[^1]: `watch` コマンドとデフォルト秒数含めて挙動を合わせくれる配慮がにくいですね。

## 参考リンク

* [27.2. 統計情報コレクタ](https://www.postgresql.jp/document/9.2/html/monitoring-stats.html#PG-STAT-DATABASE-VIEW)
* [よく使うpsqlの便利技10選](https://masahikosawada.github.io/2018/03/16/%E3%82%88%E3%81%8F%E4%BD%BF%E3%81%86psql%E3%81%AE%E4%BE%BF%E5%88%A9%E6%8A%8010%E9%81%B8/)
* [paql PostgreSQL Client Applications](https://www.postgresql.org/docs/current/app-psql.html)
