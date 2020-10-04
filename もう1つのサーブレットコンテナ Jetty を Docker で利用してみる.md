# もう1つのサーブレットコンテナ Jetty を Docker で利用してみる

Eclipse Jetty は Java サーブレットの実行環境（サーブレットコンテナ、Java EE の部分実装）であり、Web サーバです。サーブレットコンテナの実装としては Apache Tomcat が著名ですが、Jetty はより歴史が古く[^1]、より軽量[^2]です。商業サポートがアクティブコントリビュータである [Webtide 社](https://webtide.com/)から提供されるほか、[Apache Hadoop に組み込まれ](https://cwiki.apache.org/confluence/display/CAMEL/Jetty)ていたり、[Google App Engine で利用されて](https://cloud.google.com/appengine/docs/flexible/java/dev-jetty9)いたりします。

[^1]: Jetty の初版リリースは 1995 年で、Tomcat の初版リリースは 1999 年です。

[^2]: https://webtide.com/why-choose-jetty/

Jetty は Tomcat と比較してメモリフットプリントが小さいことから、コンテナ型仮想化環境で Java サーブレットを運用する際のリソース節約に役立ちます。本記事はそんな Jetty を Docker 上で利用する手順を紹介するものです。

## Jetty を Docker で利用する

[Docker Official Image](https://hub.docker.com/_/jetty/) が提供されています[^3]。Jetty の各バージョンに対して OpenJDK LTS(Red Hat ビルド)と JRE、Debian と Debian slim の組み合わせからイメージを選べます。

|バージョン|開発元|Java|Java EE|サーブレット|JSP|サポート期間|状態|備考|
|:----|:----|:----|:----|:----|:----|:----|:----|:----|
|11|Eclipse|11～|8|4.0.2|2.3|2020～|アルファ|JakartaEE Namespaceに変更|
|10|Eclipse|11～|8|4.0.2|2.3|2019～|ベータ| |
|9.4|Eclipse|1.8～|7|3.1|2.3|2016～|安定版| |
|9.3|Eclipse|1.8～|7|3.1|2.3|2015～|非推奨|HTTP/2、FastCGIをサポート|
|9.2|Eclipse|1.7～|7|3.1|2.3|2014～2018|EOL|Dockerイメージ配布を開始|
|9.1|Eclipse|1.7～|7|3.1|2.3|2013～2014|EOL| |
|9|Eclipse|1.7～|7|3.1-beta|2.3|2013～2013|EOL| |
|8|Eclipse/Codehaus|1.6～|6|3|2.2|2009～2014|EOL| |
|7|Eclipse/Codehaus|1.5～|5|2.5|2.1|2008～2014|EOL|WebSocket、SPDY v3をサポート|
|6|Codehaus|1.4～1.5|5|2.5|2|2006～2010|EOL| |
|5|Sourceforge|1.2～1.5|1.4|2.4|2|2003～2009|Antique（骨董品）| |
|4|Sourceforge|1.2、J2ME|1.3|2.3|1.2|2001～2006|Ancient（古代）| |
|3|Sourceforge|1.2|1.2|2.2|1.1|1999～2002|Fossilized（化石）|HTTP/1.1をサポート|
|2|Mortbay|1.1|-|2.1|1|1998～2000|Legendary（伝説）| |
|1|Mortbay|1|-|-|-|1995～1998|Mythical（神話）| |

ここでは Jetty9 on OpenJDK11 on Debian10 を選択します：

[^3]: ちなみに [Google Cloud Platform Jetty Docker Image](https://github.com/GoogleCloudPlatform/jetty-runtime) も Apache-2.0 ライセンスで公開されていたりします。

```shell
docker pull jetty:9.4.31-jdk11
```

サーブレットのデプロイ方法は簡単で、`/var/lib/jetty/webapps` に WAR ファイル、もしくは圧縮前のサーブレットディレクトリを設置するだけです：

```Dockerfile
FROM jetty:9.4.31-jdk11
ADD sample.war /var/lib/jetty/webapps
```

`コンテキスト.xml` で任意の設置場所の指定も可能です：

```Dockerfile
FROM jetty:9.4.31-jdk11
ADD sampleApp.xml /var/lib/jetty/webapps
ADD sample /usr/local/sample
```

```sampleApp.xml
<Configure class="org.eclipse.jetty.webapp.WebAppContext">
    <Set name="contextPath">/sample</Set>
    <Set name="war">/usr/local/sample</Set>
</Configure>
```

## 環境設定

`--list-config` オプションを指定することで、現在の環境設定を参照できます：

```shell
$ docker run --rm jetty:9.4.31-jdk11 --list-config

Java Environment:
-----------------
 java.home = /usr/local/openjdk-11 (null)
 java.vm.vendor = Oracle Corporation (null)
 java.vm.version = 11.0.8+10 (null)
 java.vm.name = OpenJDK 64-Bit Server VM (null)
 java.vm.info = mixed mode (null)
 java.runtime.name = OpenJDK Runtime Environment (null)
 java.runtime.version = 11.0.8+10 (null)
 java.io.tmpdir = /tmp/jetty (null)
 user.dir = /var/lib/jetty (null)
 user.language = en (null)
 user.country = null (null)

Jetty Environment:
-----------------
 jetty.version = 9.4.31.v20200723
 jetty.tag.version = master
 jetty.home = /usr/local/jetty
 jetty.base = /var/lib/jetty

Config Search Order:
--------------------
 <command-line>
 ${jetty.base} -> /var/lib/jetty
 ${jetty.home} -> /usr/local/jetty


JVM Arguments:
--------------
 (no jvm args specified)

System Properties:
------------------
 (no system properties specified)

Properties:
-----------
 java.version = 11.0.8
 java.version.major = 11
 java.version.micro = 8
 java.version.minor = 0
 java.version.platform = 11
 jetty.base = /var/lib/jetty
 jetty.base.uri = file:///var/lib/jetty
 jetty.home = /usr/local/jetty
 jetty.home.uri = file:///usr/local/jetty

Jetty Server Classpath:
-----------------------
Version Information on 37 entries in the classpath.
Note: order presented here is how they would appear on the classpath.
      changes to the --module=name command line options will be reflected here.
 0:      1.4.1.v201005082020 | ${jetty.home}/lib/mail/javax.mail.glassfish-1.4.1.v201005082020.jar
 1:                    (dir) | ${jetty.base}/resources
 2:                    3.1.0 | ${jetty.home}/lib/servlet-api-3.1.jar
 3:                 3.1.0.M0 | ${jetty.home}/lib/jetty-schemas-3.1.jar
 4:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-http-9.4.31.v20200723.jar
 5:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-server-9.4.31.v20200723.jar
 6:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-xml-9.4.31.v20200723.jar
 7:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-util-9.4.31.v20200723.jar
 8:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-io-9.4.31.v20200723.jar
 9:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-jndi-9.4.31.v20200723.jar
10:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-security-9.4.31.v20200723.jar
11:                      1.3 | ${jetty.home}/lib/transactions/javax.transaction-api-1.3.jar
12:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-servlet-9.4.31.v20200723.jar
13:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-webapp-9.4.31.v20200723.jar
14:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-plus-9.4.31.v20200723.jar
15:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-annotations-9.4.31.v20200723.jar
16:                    7.3.1 | ${jetty.home}/lib/annotations/asm-7.3.1.jar
17:                    7.3.1 | ${jetty.home}/lib/annotations/asm-analysis-7.3.1.jar
18:                    7.3.1 | ${jetty.home}/lib/annotations/asm-commons-7.3.1.jar
19:                    7.3.1 | ${jetty.home}/lib/annotations/asm-tree-7.3.1.jar
20:                      1.3 | ${jetty.home}/lib/annotations/javax.annotation-api-1.3.jar
21:    3.19.0.v20190903-0936 | ${jetty.home}/lib/apache-jsp/org.eclipse.jdt.ecj-3.19.0.jar
22:         9.4.31.v20200723 | ${jetty.home}/lib/apache-jsp/org.eclipse.jetty.apache-jsp-9.4.31.v20200723.jar
23:                   8.5.54 | ${jetty.home}/lib/apache-jsp/org.mortbay.jasper.apache-el-8.5.54.jar
24:                   8.5.54 | ${jetty.home}/lib/apache-jsp/org.mortbay.jasper.apache-jsp-8.5.54.jar
25:                    1.2.5 | ${jetty.home}/lib/apache-jstl/org.apache.taglibs.taglibs-standard-impl-1.2.5.jar
26:                    1.2.5 | ${jetty.home}/lib/apache-jstl/org.apache.taglibs.taglibs-standard-spec-1.2.5.jar
27:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-client-9.4.31.v20200723.jar
28:         9.4.31.v20200723 | ${jetty.home}/lib/jetty-deploy-9.4.31.v20200723.jar
29:                      1.0 | ${jetty.home}/lib/websocket/javax.websocket-api-1.0.jar
30:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/javax-websocket-client-impl-9.4.31.v20200723.jar
31:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/javax-websocket-server-impl-9.4.31.v20200723.jar
32:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/websocket-api-9.4.31.v20200723.jar
33:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/websocket-client-9.4.31.v20200723.jar
34:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/websocket-common-9.4.31.v20200723.jar
35:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/websocket-server-9.4.31.v20200723.jar
36:         9.4.31.v20200723 | ${jetty.home}/lib/websocket/websocket-servlet-9.4.31.v20200723.jar

Jetty Active XMLs:
------------------
 ${jetty.home}/etc/jetty-bytebufferpool.xml
 ${jetty.home}/etc/jetty-threadpool.xml
 ${jetty.home}/etc/jetty.xml
 ${jetty.home}/etc/jetty-webapp.xml
 ${jetty.home}/etc/jetty-plus.xml
 ${jetty.home}/etc/jetty-annotations.xml
 ${jetty.home}/etc/jetty-deploy.xml
 ${jetty.home}/etc/jetty-http.xml
```

設定可能な項目については[公式ドキュメント](https://www.eclipse.org/jetty/documentation/current/quickstart-config-what.html)を参照してください。

なお JVM のオプションは環境変数 `JAVA_OPTIONS` で指定できます。

## 参考リンク

* [Eclipse Jetty](https://www.eclipse.org/jetty/index.html)
* [What Version Do I Use?](https://www.eclipse.org/jetty/documentation/current/what-jetty-version.html)
* [Google App EngineにJettyを採用](https://www.infoq.com/jp/news/2009/08/google-chose-jetty/)
