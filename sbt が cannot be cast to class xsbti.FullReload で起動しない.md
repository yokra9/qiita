# sbt が `cannot be cast to class xsbti.FullReload` で起動しない

sbt を起動する際、以下のようなエラーが表示されました：

```log
[error] [launcher] error during sbt launcher: java.lang.ClassCastException: class java.util.concurrent.TimeoutException cannot be cast to class xsbti.FullReload (java.util.concurrent.TimeoutException is in module java.base of loader 'bootstrap'; xsbti.FullReload is in unnamed module of loader 'app')...
```

## よくある（？）原因

自分が経験した事象はおそらく特殊なケースですので、まず一般的な情報を記載します。

sbt の GitHub リポジトリに [#6592](https://github.com/sbt/sbt/issues/6592) という issue があり、`cannot be cast to class xsbti.FullReload` が発生するケースが投稿されています。

issue で報告された問題は順次解消されているようなので、まずは sbt を最新版に上げてみることをお勧めします。

## 経験した事象

起動に失敗するプロジェクトは、[VSCode の dev container](https://qiita.com/yokra9/items/351b9847c5f1e49a215c) 上で開発していました。

そのディレクトリをエクスプローラー経由で Windows から WSL2 に複製し、 WSL2 上の sbt を起動したところ、上記のエラーが発生しました。`target` 等の自動生成されるディレクトリを削除して再試行してみましたが、状況は変わりません。

問題の切り分けのため、WSL2 上にシンプルなプロジェクトを新規作成したところ、問題なく起動できました。そのため、原因はプロジェクト固有だと考えられます。

## 根本原因

プロジェクト配下の一部ディレクトリで所有者が `root:root` になっており、権限が不足していました。試しに、`sudo` を付けて無理やり実行すると起動することが確認できました。

```bash
sudo -E sbt
```

このような場合、`chown` で実行ユーザに所有者を変更すると起動できるようになります。

```bash
cd ../
sudo chown -R <ユーザ>:<グループ> <対象ディレクトリ>
cd <対象ディレクトリ>
sbt
```

パーミッション関係というありがちな事象なのですが、エラーメッセージから原因が特定しづらいため記事としてまとめることにしました。ご参考になれば幸いです。

## 参考リンク

* [java.lang.ClassCastException: class java.util.concurrent.TimeoutException cannot be cast to class xsbti.FullReload #6592](https://github.com/sbt/sbt/issues/6592)
* [sbtの密結合な内部アーキテクチャ](https://xuwei-k.hatenablog.com/entry/20131211/1386755890)：「そもそも `xsbti` って何？」という部分が分かりやすく解説されています。
