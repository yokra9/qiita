# sbt-assembly で FAT JAR を生成しようとしたら module-info.class の重複で怒られた話

FAT JAR（もしくは über JAR）とは、Java アプリケーション本体と依存ライブラリ等を1つの JAR ファイルに「アセンブル」したものです。依存ライブラリを含めてパッケージングされており、単体で実行可能になっています。メインクラスを持つ FAT JAR であれば、以下のように特にクラスパスを設定をしなくても実行できます：

```bash
java -jar <jarfile>
```

`-jar` オプションで起動したとき、JAR ファイル内に含まれるクラスファイルが唯一のユーザークラス・ソースとなります。FAT JAR には実行時に必要とされる全てのクラスが含まれているため、これで問題ありません。ファイル構成・起動コマンドがシンプルになるので、デプロイ時に便利ですよね[^1]。

[^1]: とはいいつつ、デプロイを易化するという意味では [JDK ごと Docker コンテナに押し込んでしまう方法](https://qiita.com/yokra9/items/dd560305ccb5fc8cd6e1)が普及した感もあります。

さて、[sbt-assembly](https://github.com/sbt/sbt-assembly) は FAT JAR を生成するための sbt プラグインです。[Maven Assembly Plugin](https://maven.apache.org/plugins/maven-assembly-plugin/index.html) の sbt 版ですね。ためしに `logback-classic` を `libraryDependencies` に追加して `sbt assembly` すると以下のようなエラーとなります。

```log
[error] (assembly) deduplicate: different file contents found in the following:
[error] /root/.cache/coursier/v1/https/repo1.maven.org/maven2/ch/qos/logback/logback-classic/1.4.4/logback-classic-1.4.4.jar:module-info.class
[error] /root/.cache/coursier/v1/https/repo1.maven.org/maven2/ch/qos/logback/logback-core/1.4.4/logback-core-1.4.4.jar:module-info.class
```

`module-info.class` というファイルが重複してエラーになっているようですが、これはなんでしょう？

## Java のモジュールシステム（Project Jigsaw）と `module-info.class`

Java SE 9 以降（LTS としては Java SE 11 以降）で導入された新しい[^2]仕様であり、いわゆるクラスパス地獄だとか JAR 地獄といわれる問題を回避するために提案されました。モジュールシステムについてはこちらの記事に詳しいです：[モジュールシステムを学ぶ](https://qiita.com/opengl-8080/items/93c8e0cf58654d5f73cb)

[^2]: Java SE 11 が新しいといっていいものかどうかには諸説あります。

`module-info.class` (ソースとしては `module-info.java` ) はモジュールの定義情報ファイルです。これがない場合は「自動モジュール」（モジュールパスにある場合。クラスパスの場合は「無名モジュール」）として、以下のように扱われます：

* すべてのパッケージを `exports` している
* モジュールグラフに読み込まれたすべてのモジュールを `requires` している

なお、Scala / sbt はモジュールシステムをサポートしていないため、成果物は状況に応じて自動モジュールないしは無名モジュールとして認識されることになります。

## `assemblyMergeStrategy` でエラーを解消する

Java SE 8 準拠の環境の場合、モジュールシステムを認識しないので [assemblyMergeStrategy](https://github.com/sbt/sbt-assembly#merge-strategy) を定義して破棄してしまえば問題ありません。

```sbt:build.sbt
ThisBuild / assemblyMergeStrategy := {
    case PathList(ps @ _*) if ps.last endsWith "module-info.class" =>
        MergeStrategy.discard
    case x =>
        val oldStrategy = (assembly / assemblyMergeStrategy).value
        oldStrategy(x)
}
```

Java SE 9 以降（LTS としては Java SE 11 以降）の場合でも、FAT JAR 内に必要なクラスがそろっているため、元のライブラリが持っていたモジュール情報は必要ありません。FAT JAR をライブラリとして利用する場合ならともかく、FAT JAR の主な用途となる起動可能な単一ファイルとして利用するケースでは問題になりません。

## 参考リンク

* [What is an uber jar?](https://stackoverflow.com/questions/11947037/what-is-an-uber-jar)
* [javaコマンド](https://docs.oracle.com/javase/jp/17/docs/specs/man/java.html)
* [sbt-assemblyを使用してjarを生成する際の同名ファイルのマージ指定方法](https://www.sassy-blog.com/entry/20171220/1513777494)
* [JSR 376: Java™ Platform Module System](https://jcp.org/en/jsr/detail?id=376)
* [モジュールシステムを学ぶ](https://qiita.com/opengl-8080/items/93c8e0cf58654d5f73cb)
* [Javaのモジュールシステムを理解しよう（その1）](https://news.mynavi.jp/techplus/article/imajava-4/)
* [Duplicate file exception occurs when packing graal vm #370](https://github.com/sbt/sbt-assembly/issues/370)
* [Ignore module-info.class #391](https://github.com/sbt/sbt-assembly/issues/391)
* [Play JSON library and sbt assembly merge error](https://stackoverflow.com/a/60114988/86485)
* [sbt assembly: deduplicate module-info.class](https://stackoverflow.com/questions/54834125/sbt-assembly-deduplicate-module-info-clas)
* [JDK9: Support module-info.java #3368](https://github.com/sbt/sbt/issues/3368)
* [Support JEP-261 Module System #529](https://github.com/scala/scala-dev/issues/529)
