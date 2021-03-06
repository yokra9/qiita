# Scala で作った Web アプリを Dockerize して動かす(令和最新版)

既存の Java アプリをコンテナ化するにあたり「JVM でマイクロサービスといえば Scala と Akka-HTTP だよな～」という気持ちで Qiita を徘徊していたところ、[Scalaで作ったWebアプリをDockerizeして動かす](https://qiita.com/petitviolet/items/cf5d699521b08e6ec933)という素晴らしい記事を発見できました。

とはいえ、上記の 3 年前の記事ということで若干手直しが必要な部分もありましたので、改めて記事としてまとめておくことにしました。参考になれば幸いです。

## 環境

* Scala 2.7.4
* sbt 1.4.7
* [Akka-HTTP](https://doc.akka.io/docs/akka-http/current/) 10.2.4
* [sbt-native-packager](http://www.scala-sbt.org/sbt-native-packager/) 1.8.0

## Scala + Akka-HTTP で Web アプリを作成する

最初に、`build.sbt` に依存ライブラリを追加します。元記事との違いとしては、 Akka シリーズのバージョンのほか、SLF4J 対応のロギングライブラリとして logback を追加しています。[^1]

[^1]: logback は設定ファイルを追加しない場合ロギング出力は直接コンソールに出力されるので、コンテナレディなアプリを作成するには最適です。

```sbt:build.sbt
val AkkaVersion = "2.6.8"
val AkkaHttpVersion = "10.2.4"
libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor-typed" % AkkaVersion,
  "com.typesafe.akka" %% "akka-stream" % AkkaVersion,
  "com.typesafe.akka" %% "akka-http" % AkkaHttpVersion,
  // ロギングライブラリがないと SLF4J が怒るので logback も入れておきます
  "ch.qos.logback" % "logback-classic" % "1.2.3"
)
```

続いてソース本文です。[Akka HTTP 10.2.0 での仕様変更](https://doc.akka.io/docs/akka-http/current/migration-guide/migration-guide-10.2.x.html)を反映しています。

```scala:main.scala
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.event.Logging
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.http.scaladsl.server.Directives._
import scala.concurrent.Await
import scala.concurrent.duration.Duration

object main {

  def main(args: Array[String]): Unit = {

    // typed ActorSystem が導入されましたが、旧 ActorSystem も利用可能です。
    implicit val system = ActorSystem(Behaviors.empty, "my-sample-app")

    // GET /indexでリクエストのURLパラメータとUserAgentを返却する
    val route =
      (get & pathPrefix("index") & extractUri & headerValueByName(
        "User-Agent"
      )) { (uri, ua) =>
        logRequestResult("/index", Logging.InfoLevel) {
          complete(s"param: ${uri.query().toMap}, user-agent: ${ua}}")
        }
      }

    val host = sys.props.get("http.host") getOrElse "0.0.0.0"
    val port = sys.props.get("http.port").fold(8080) { _.toInt }

    // akka.http.scaladsl.HttpExt.bindAndHandle が非推奨になりました
    val f = Http().newServerAt(host, port).bind(route)

    println(s"server at [$host:$port]")

    Await.ready(f, Duration.Inf)
  }
}
```

`sbt run` でコンパイル・実行し、 `http://localhost:8080/index?<クエリ>=<値>` にアクセスして以下のように表示されたら成功です。

```plaintext
$ curl -f "http://localhost:8080/index?query=string"
param: Map(query -> string), user-agent: curl/7.66.0}
```

## sbt-native-packager で Docker イメージを作成する

`project/plugins.sbt` に `sbt-native-packager` を追加します。同プラグインは `msi` | `rpm` | `deb` などのネイティブパッケージのほか、[OpenJDK イメージ](https://hub.docker.com/_/openjdk/) をベースとした Docker イメージも出力できるすぐれものです。

```snt:project/plugins.sbt
addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.8.0")
```

`build.sbt` に Docker ビルド用の設定を追加します。

```sbt:build.sbt
// DockerPlugin は JavaAppPackaging に依存します
enablePlugins(JavaAppPackaging)
enablePlugins(DockerPlugin)

// 普段 Dockerfile で指定する内容を記載します
// MAINTAINER タグは非推奨になったので記載の必要はありません。
packageName in Docker := "sample-webapp" // イメージ名に反映されます
version in Docker := "2.0.0" // タグに反映されます
dockerBaseImage := "openjdk:latest" // 利用したい JDK/JRE イメージが指定できます
dockerExposedPorts := List(8080)
```

その他 DockerPlugin で利用可能な設定は[公式マニュアル](https://www.scala-sbt.org/sbt-native-packager/formats/docker.html)を参照してください。

`sbt docker:publishLocal` で Docker イメージがビルドできます。

```plaintext
$ sbt docker:publishLocal
（中略）
[success] All package validations passed
[info] Sending build context to Docker daemon  26.37MB
[info] Step 1/20 : FROM openjdk:latest as stage0
（中略）
[info] Built image sample-webapp with tags [2.0.0]
[success] Total time: 7 s, completed 2021/03/06 23:17:24
```

自動生成された Dockerfile は以下のようになっていました。

```Dockerfile:target\docker\stage\Dockerfile
FROM openjdk:latest as stage0
LABEL snp-multi-stage="intermediate"
LABEL snp-multi-stage-id="2b6164e8-16a3-449b-a436-30bc51408376"
WORKDIR /opt/docker
COPY 1/opt /1/opt
COPY 2/opt /2/opt
USER root
RUN ["chmod", "-R", "u=rX,g=rX", "/1/opt/docker"]
RUN ["chmod", "-R", "u=rX,g=rX", "/2/opt/docker"]
RUN ["chmod", "u+x,g+x", "/1/opt/docker/bin/akka-http-example"]

FROM openjdk:latest as mainstage
USER root
RUN id -u demiourgos728 1>/dev/null 2>&1 || (( getent group 0 1>/dev/null 2>&1 || ( type groupadd 1>/dev/null 2>&1 && groupadd -g 0 root || addgroup -g 0 -S root )) && ( type useradd 1>/dev/null 2>&1 && useradd --system --create-home --uid 1001 --gid 0 demiourgos728 || adduser -S -u 1001 -G root demiourgos728 ))
WORKDIR /opt/docker
COPY --from=stage0 --chown=demiourgos728:root /1/opt/docker /opt/docker
COPY --from=stage0 --chown=demiourgos728:root /2/opt/docker /opt/docker
EXPOSE 8080
USER 1001:0
ENTRYPOINT ["/opt/docker/bin/akka-http-example"]
CMD []
```

マルチステージビルドを活用していていい感じですね。

ソース全文は[こちらの GitHub 上のレポジトリ](https://github.com/yokra9/akka-http-example)に置いておきましたので、ご参考まで。

## 参考リンク

* [Scalaで作ったWebアプリをDockerizeして動かす](https://qiita.com/petitviolet/items/cf5d699521b08e6ec933)
* [Migration Guide to and within Akka HTTP 10.2.x](https://doc.akka.io/docs/akka-http/current/migration-guide/migration-guide-10.2.x.html)
* [logback の設定](http://logback.qos.ch/manual/configuration_ja.html)
* [Docker Plugin](https://www.scala-sbt.org/sbt-native-packager/formats/docker.html)
