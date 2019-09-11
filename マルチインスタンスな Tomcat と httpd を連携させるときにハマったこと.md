# マルチインスタンスな Tomcat と httpd を連携させるときにハマったこと

## tomcat をマルチインスタンス化する

環境変数 `CATALINA_BASE` を変更することで複数の Tomcat インスタンスを同時に起動できます。

`/bin/catalina.sh run` を複数回実行しても Tomcat インスタンスを増やすことはできません。ポートの衝突が発生するためです。しかし `conf/server.xml` には Tomcat が利用するポートを指定する項目があります。`conf/` の設定ファイル類は `CATALINA_BASE` に指定されたパスから相対パスで検索されますから、インスタンスごとに `CATALINA_BASE` を切り替えてしまいましょう。

### 実際にやってみる

まずは Tomcat をマルチインスタンス化しましょう。`yum install tomcat` で Tomcatを導入した場合はデフォルトでマルチインスタンス化に対応しています（[参考](https://www.uramiraikan.net/Works/entry-2518.html)）。以下では `wget` などでバイナリを入手して設置している場合の方法をご紹介します。なお、JDK が `/usr/local/java` 、Tomcat 本体が `/usr/local/tomcat` に配置してある想定です。

#### tomcat1

##### 環境定義の準備

```
# mkdir /etc/tomcat1
# cp -r /usr/local/tomcat/conf  /etc/tomcat1
# cp -r /usr/local/tomcat/logs  /etc/tomcat1  
# cp -r /usr/local/tomcat/temp  /etc/tomcat1 
# cp -r /usr/local/tomcat/webapps  /etc/tomcat1   
# cp -r /usr/local/tomcat/work  /etc/tomcat1
```

##### ポートの変更

```/etc/tomcat1/conf/server.xml
...

<Server port="8015" shutdown="SHUTDOWN">

...

<!-- A "Connector" represents an endpoint by which requests are received 
    and responses are returned. Documentation at :
    Java HTTP Connector: /docs/config/http.html
    Java AJP  Connector: /docs/config/ajp.html
    APR (HTTP/AJP) Connector: /docs/apr.html
    Define a non-SSL/TLS HTTP/1.1 Connector on port 8080
-->
<Connector port="8081" protocol="HTTP/1.1"
 connectionTimeout="20000" />     

...

<!-- Define an AJP 1.3 Connector on port 8009 -->
<Connector port="8019" protocol="AJP/1.3" />

...

```

##### サービスの登録

```/etc/systemd/system/tomcat1.service
[Unit]
Description=Tomcat1: Apache Tomcat Servlet Container
After=syslog.target network.target

[Service]
Type=forking
EnvironmentFile=/etc/sysconfig/tomcat1
ExecStart=/usr/local/tomcat/bin/startup.sh
ExecStop=/usr/local/tomcat/bin/shutdown.sh
KillMode=none

[Install]
WantedBy=multi-user.target
```

```config:/etc/sysconfig/tomcat1
JAVA_HOME=/usr/local/java
CATALINA_BASE=/etc/tomcat1
```


#### tomcat2

##### 環境定義の準備

```
# mkdir /etc/tomcat2
# cp -r /etc/tomcat1/*  /etc/tomcat2
```

##### ポートの変更

```/etc/tomcat1/conf/server.xml
...

<Server port="8025" shutdown="SHUTDOWN">

...

<!-- A "Connector" represents an endpoint by which requests are received 
    and responses are returned. Documentation at :
    Java HTTP Connector: /docs/config/http.html
    Java AJP  Connector: /docs/config/ajp.html
    APR (HTTP/AJP) Connector: /docs/apr.html
    Define a non-SSL/TLS HTTP/1.1 Connector on port 8080
-->
<Connector port="8082" protocol="HTTP/1.1"
 connectionTimeout="20000" />     

...

<!-- Define an AJP 1.3 Connector on port 8009 -->
<Connector port="8029" protocol="AJP/1.3" />

...

```

##### サービスの登録

```/etc/systemd/system/tomcat2.service
[Unit]
Description=Tomcat2: Apache Tomcat Servlet Container
After=syslog.target network.target

[Service]
Type=forking
EnvironmentFile=/etc/sysconfig/tomcat2
ExecStart=/usr/local/tomcat/bin/startup.sh
ExecStop=/usr/local/tomcat/bin/shutdown.sh
KillMode=none

[Install]
WantedBy=multi-user.target
```

```config:/etc/sysconfig/tomcat2
JAVA_HOME=/usr/local/java
CATALINA_BASE=/etc/tomcat2
```

#### サービスの反映と起動

```
# systemctl daemon-reload
# systemctl start tomcat1
# systemctl start tomcat2
```

`http://localhost:8081` と `http://localhost:8082` にアクセスできれば成功です。`firewalld` にでも邪魔されていなければ問題なく見れると思います。

## httpd との連携

httpd がインストールされており、 `mod_proxy` と `mod_proxy_ajp` が有効化されているものとします。いつものように `proxy-ajp.conf` にプロキシ設定を追加してみましょう：

```/etc/httpd/conf.d/proxy-ajp.conf 
<location /docs >
        ProxyPass ajp://localhost:8019/docs
</location>

<location /examples >
        ProxyPass ajp://localhost:8029/examples
</location>
```

```
# sudo systemctl restart httpd
```

しかし、この状態だと正常にプロキシされません。 httpd が以下のようなエラーを吐いていることが確認できるはずです：

```/var/log/httpd/error_log
[Tue Sep 10 21:47:48.938608 2019] [proxy:error] [pid 4646] (13)Permission denied: AH00957: AJP: attempt to connect to 127.0.0.1:8019 (localhost) failed
[Tue Sep 10 21:47:48.938745 2019] [proxy:error] [pid 4646] AH00959: ap_proxy_connect_backend disabling worker for (localhost) for 60s
[Tue Sep 10 21:47:48.938773 2019] [proxy_ajp:error] [pid 4646] [client ***.***.***.*:*****] AH00896: failed to make connection to backend: localhost
```

AJP のポートをデフォルトの 8009 から変更したことで SELinux に怒られてしまいました。`setsebool` で許可してあげましょう：

```
# sudo /usr/sbin/setsebool httpd_can_network_connect true
```

## 結論

めんどくさいのでつかえるなら Docker をつかいましょう

## 参考リンク

* [ApacheとTomcatを連携させてみた](https://qiita.com/Dace_K/items/9d0419aefcb969335ca5)
* [CentOS7 での Tomcat8 の自動起動設定](https://qiita.com/Monota/items/3f715def67d53ba2f2a2)
* [1台のサーバにTomcatを複数インストールしてポートを変えて起動する](https://qiita.com/zkangaroo/items/4ac3f60ab7b1338b567b)
* [Tomcat8のマルチインスタンス化](https://qiita.com/ochiba/items/fb25dee6f75d659f1320)
* [server.xmlを書いてTomcatを設定してみよう](https://www.atmarkit.co.jp/ait/articles/0711/20/news125_2.html)
* [「SELinuxのせいで動かない」撲滅ガイド](https://qiita.com/yunano/items/857ab36faa0d695573dd)
* [Apache Tomcat Configuration Reference](https://tomcat.apache.org/tomcat-5.5-doc/config/http.html)
