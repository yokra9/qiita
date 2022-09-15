# Scala で作った Web アプリを Dockerize して動かす(令和最新版)

既存の Java アプリをコンテナ化するにあたり「JVM でマイクロサービスといえば Scala と Akka-HTTP だよな～」という気持ちで Qiita を徘徊していたところ、[Scalaで作ったWebアプリをDockerizeして動かす](https://qiita.com/petitviolet/items/cf5d699521b08e6ec933)という素晴らしい記事を発見できました。

とはいえ、上記は 3 年前の記事ということで若干手直しが必要な部分もありましたので、改めて記事としてまとめておくことにしました。参考になれば幸いです。

**(2022-09-06追記)** さらに 1 年が経過したので諸々のバージョンアップに対応しました。sbt-native-packager の配布元が `com.typesafe.sbt` から `com.github.sbt` へ移動したことに注意が必要です。

**(2022-09-11追記)** [Akka-HTTP を含む Akka ファミリのライセンス変更](https://www.lightbend.com/akka/license-faq)に伴い、Scalatra 版の記述を追加しました。

## 環境

* Scala 2.13.8
* sbt 1.7.1
* [sbt-native-packager](http://www.scala-sbt.org/sbt-native-packager/) 1.9.11

## Scala + Akka-HTTP で Web アプリを作成する

最初に、`build.sbt` に依存ライブラリを追加します。元記事との違いとしては、 Akka シリーズのバージョンのほか、SLF4J 対応のロギングライブラリとして logback を追加しています。[^1]

[^1]: logback は設定ファイルを追加しない場合ロギング出力は直接コンソールに出力されるので、コンテナレディなアプリを作成するには最適です。

```scala:build.sbt
ThisBuild / scalaVersion := "2.13.8"

// sbt run でサーバを起動したまま維持できるようにします
run / fork := true

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor-typed" % "2.6.20",
  "com.typesafe.akka" %% "akka-stream" % "2.6.20",
  "com.typesafe.akka" %% "akka-http" % "10.2.10",
  "ch.qos.logback" % "logback-classic" % "1.4.0",
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
import org.slf4j.{Logger, LoggerFactory}

object Main {
  val logger = LoggerFactory.getLogger(getClass)

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

    val host = sys.props.getOrElse("http.host", "0.0.0.0")
    val port = sys.props.getOrElse("http.port", "8080").toIntOption match {
      case Some(port) => port
      case None => {
        logger.error("システムプロパティ http.port には整数値を指定してください")
        8080
      }
    }

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

## Scala + Scalatra で Web アプリを作成する

[公式ドキュメント](https://scalatra.org/guides/)に従いましょう。[Generate a Scalatra project](https://scalatra.org/getting-started/first-project.html) にテンプレートからプロジェクトを作成する方法が記載されています。

Scalatra はマイクロな Web フレームワークであり、Scalatra で作成した Web アプリは Java サーブレットになります。上記のコードのうち、ルーティングに相当する部分をサーブレットとして切り出します：

```scala:MyScalatraServlet.scala
import org.scalatra._
import org.slf4j.{Logger, LoggerFactory}

class MyScalatraServlet extends ScalatraServlet {

  val logger = LoggerFactory.getLogger(getClass)

  // GET /indexでリクエストのURLパラメータとUserAgentを返却する
  get("/index") {
    contentType = "text/plain"

    val str =
      s"param: ${params.toMap}, user-agent: ${request.getHeader("User-Agent")}"
    logger.info(str)

    Ok(str)
  }

}
```

サーブレットは実行に Jetty や Tomcat などのサーブレット・コンテナを必要とします。これはシンプルな HTTP ツールキットである Akka-HTTP とは異なる点ですね。sbt-assembly を利用して FAT JAR にしたり、sbt-native-packager を利用して Dockerize するためには、Jetty を起動するメインクラスを用意します：

```scala:Main.scala
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.servlet.{DefaultServlet, ServletHolder}
import org.eclipse.jetty.webapp.WebAppContext
import org.scalatra.servlet.ScalatraListener
import org.slf4j.{Logger, LoggerFactory}

object Main {
  val logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    val context = new WebAppContext()
    context.setContextPath("/")
    context.setResourceBase("/src/main/webapp")
    context.addEventListener(new ScalatraListener)
    context.addServlet(classOf[DefaultServlet], "/")

    val port = sys.props.getOrElse("http.port", "8080").toIntOption match {
      case Some(port) => port
      case None => {
        logger.error("システムプロパティ http.port には整数値を指定してください")
        8080
      }
    }

    val server = new Server(port)
    server.setHandler(context)
    server.start()

    server.join()
  }
}
```

特にそれらへのこだわりがなければ `sbt package` コマンドで WAR ファイルを生成し、適当なサーブレット・コンテナの Docker イメージにデプロイしてもいいでしょう。

## sbt-native-packager で Docker イメージを作成する

`project/plugins.sbt` に `sbt-native-packager` を追加します。同プラグインは `msi` | `rpm` | `deb` などのネイティブパッケージのほか、Docker イメージも出力できるすぐれものです。

```scala:project/plugins.sbt
addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.9.11")
```

`build.sbt` に Docker ビルド用の設定を追加します。

```scala:build.sbt
// DockerPlugin は JavaAppPackaging に依存します
enablePlugins(JavaAppPackaging)
enablePlugins(DockerPlugin)

// 普段 Dockerfile で指定する内容を記載します
// MAINTAINER タグは非推奨になったので記載の必要はありません。
Docker / packageName := "sample-webapp" // イメージ名に反映されます
Docker / version := "2.0.0" // タグに反映されます
dockerBaseImage := "eclipse-temurin:latest" // 利用したい JDK/JRE イメージが指定できます
dockerExposedPorts := List(8080)
```

その他 DockerPlugin で利用可能な設定は[公式マニュアル](https://www.scala-sbt.org/sbt-native-packager/formats/docker.html)を参照してください。

`sbt docker:publishLocal` で Docker イメージがビルドできます：

```plaintext
$ sbt docker:publishLocal
（中略）
[success] All package validations passed
[info] Sending build context to Docker daemon  26.37MB
[info] Step 1/20 : FROM eclipse-temurin:latest as stage0
（中略）
[info] Built image sample-webapp with tags [2.0.0]
[success] Total time: 7 s, completed 2021/03/06 23:17:24
```

Dockerfile の生成のみを行うこともできます：

```plaintxt
sbt docker:stage
```

生成された Dockerfile は以下のようになっていました：

```Dockerfile:target/docker/stage/Dockerfile
FROM eclipse-temurin:latest as stage0
LABEL snp-multi-stage="intermediate"
LABEL snp-multi-stage-id="7943caea-0791-42a0-8d29-55430bc54cae"
WORKDIR /opt/docker
COPY 2/opt /2/opt
COPY 4/opt /4/opt
USER root
RUN ["chmod", "-R", "u=rX,g=rX", "/2/opt/docker"]
RUN ["chmod", "-R", "u=rX,g=rX", "/4/opt/docker"]
RUN ["chmod", "u+x,g+x", "/4/opt/docker/bin/scalatra-example"]

FROM eclipse-temurin:latest as mainstage
USER root
RUN id -u demiourgos728 1>/dev/null 2>&1 || (( getent group 0 1>/dev/null 2>&1 || ( type groupadd 1>/dev/null 2>&1 && groupadd -g 0 root || addgroup -g 0 -S root )) && ( type useradd 1>/dev/null 2>&1 && useradd --system --create-home --uid 1001 --gid 0 demiourgos728 || adduser -S -u 1001 -G root demiourgos728 ))
WORKDIR /opt/docker
COPY --from=stage0 --chown=demiourgos728:root /2/opt/docker /opt/docker
COPY --from=stage0 --chown=demiourgos728:root /4/opt/docker /opt/docker
EXPOSE 8080
USER 1001:0
ENTRYPOINT ["/opt/docker/bin/scalatra-example"]
CMD []
```

マルチステージビルドを活用していていい感じですね。

ソース全文は GitHub 上のリポジトリ（[Akka](https://github.com/yokra9/akka-http-example) / [Scalatra](https://github.com/yokra9/scalatra-example)）に置いておきましたので、ご参考まで。

## 参考リンク

* [Scalaで作ったWebアプリをDockerizeして動かす](https://qiita.com/petitviolet/items/cf5d699521b08e6ec933)
* [Standalone deployment - Scalatra](https://scalatra.org//guides/2.8/deployment/standalone.html)
* [Migration Guide to and within Akka HTTP 10.2.x](https://doc.akka.io/docs/akka-http/current/migration-guide/migration-guide-10.2.x.html)
* [logback の設定](http://logback.qos.ch/manual/configuration_ja.html)
* [Docker Plugin](https://sbt-native-packager.readthedocs.io/en/stable/formats/docker.html)
