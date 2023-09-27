# RemoteIpFilter と RemoteIpValve の違いってなんだ？

[Tomcat 9.0.76 (2023-06-09)](https://tomcat.apache.org/tomcat-9.0-doc/changelog.html#Tomcat_9.0.76_(remm)) および [10.1.9 (2023-05-19)](https://tomcat.apache.org/tomcat-10.1-doc/changelog.html#Tomcat_10.1.9_(schultz)) にて、`RateLimitFilter` というフィルタが追加されていました。このフィルタにより DoS 攻撃やブルートフォース攻撃を軽減できるとされています：

> Add: Add RateLimitFilter which can be used to mitigate DoS and Brute Force attacks. (isapir)

ここで [RateLimitFilter](https://tomcat.apache.org/tomcat-9.0-doc/config/filter.html#Rate_Limit_Filter) のリファレンスを参照すると、以下のような記載があります：

> WARNING: if Tomcat is behind a reverse proxy then you must make sure that the Rate Limit Filter sees the client IP address, so if for example you are using the Remote IP Filter, then the filter mapping for the Rate Limit Filter must come after the mapping of the Remote IP Filter to ensure that each request has its IP address resolved before the Rate Limit Filter is applied. Failure to do so will count requests from different IPs in the same bucket and will result in a self inflicted DoS attack.

日本語訳：

> 警告: Tomcat がリバースプロキシの後ろにある場合、Rate Limit Filter がクライアント IP アドレスを見れていることを確認する必要があります。例えば Remote IP Filter を使用している場合、Rate Limit Filter のフィルタマッピングは Remote IP Filter のマッピングの後に行われ、Rate Limit Filter が適用される前に各リクエストの IP アドレスが解決されていることを確認する必要があります。これを怠ると、異なる IP からのリクエストを同じバケットでカウントすることになり、自作自演の DoS 攻撃を受けることになります。

「自作自演の DoS 攻撃」とは中々怖いことが書かれていますね。[RemoteIpFilter](https://tomcat.apache.org/tomcat-9.0-doc/api/org/apache/catalina/filters/RemoteIpFilter.html) を使用している場合は設定状況を確認した方が良さそうです。

## 「自作自演の DoS 攻撃」を発生させてみる

「自作自演の DoS 攻撃」は `RateLimitFilter` が作動する段階で、プロキシサーバーやロードバランサのアドレスからクライアントのアドレスに置換されていないことで発生します。`url-pattern` が同じフィルタの適用順序は `filter-mapping` が定義されている順番に依存します。そのため、`RemoteIpFilter` の `filter-mapping` を `RateLimitFilter` より上方で定義する必要があることになります：

```xml:web.xml
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                      http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
  version="4.0"
  metadata-complete="true">

    <display-name>自作自演にならない例</display-name>

    <filter>
        <filter-name>RemoteIpFilter</filter-name>
        <filter-class>org.apache.catalina.filters.RemoteIpFilter</filter-class>
    </filter>

    <filter>
        <filter-name>RateLimitFilter</filter-name>
        <filter-class>org.apache.catalina.filters.RateLimitFilter</filter-class>
        <init-param>
            <param-name>bucketRequests</param-name>
            <param-value>5</param-value>
        </init-param>
    </filter>

    <filter-mapping>
        <filter-name>RemoteIpFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

    <filter-mapping>
        <filter-name>RateLimitFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

</web-app>
```

```xml:web.xml
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                      http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
  version="4.0"
  metadata-complete="true">

    <display-name>自作自演になる例</display-name>

    <filter>
        <filter-name>RemoteIpFilter</filter-name>
        <filter-class>org.apache.catalina.filters.RemoteIpFilter</filter-class>
    </filter>

    <filter>
        <filter-name>RateLimitFilter</filter-name>
        <filter-class>org.apache.catalina.filters.RateLimitFilter</filter-class>
        <init-param>
            <param-name>bucketRequests</param-name>
            <param-value>5</param-value>
        </init-param>
    </filter>

    <filter-mapping>
        <filter-name>RateLimitFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

    <filter-mapping>
        <filter-name>RemoteIpFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

</web-app>
```

`RateLimitFilter` は「自作自演にならない例」ではクライアント IP アドレスを見てくれますが、「自作自演になる例」ではプロキシサーバーやロードバランサの IP アドレスを見てしまします。

なお `RateLimitFilter` によって遮断されると、クライアントには `HTTP Status 429 – Too Many Requests` が返却され、ログに下記のような警告が出力されます：

```log
25-Sep-2023 13:34:56.279 WARNING [http-nio-8080-exec-6] org.apache.catalina.filters.RateLimitFilter.doFilter [RateLimitFilter] [6] Requests from [172.17.0.2] have exceeded the maximum allowed of [5] in a [65] second window.
```

## RemoteIpFilter と RemoteIpValve

ということで `RemoteIpFilter` について情報収集をしていたのですが、その中で [RemoteIpValve](https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Remote_IP_Valve) という別機能を解説している記事に出会いました。あまりにも名前が類似していますが、どのような違いがあるのでしょうか。それぞれのドキュメントを読み比べてみましょう。なお、文中の [mod_remoteip](https://httpd.apache.org/docs/trunk/mod/mod_remoteip.html) とは Apache HTTPd 用モジュールの一種を指し、プロキシやロードバランサが HTTP ヘッダに付加した情報でクライアント IP アドレスを置換します。

RemoteIpValve:

> Tomcat port of mod_remoteip, this valve replaces the apparent client remote IP address and hostname for the request with the IP address list presented by a proxy or a load balancer via a request headers (e.g. "X-Forwarded-For").
>
> Another feature of this valve is to replace the apparent scheme (http/https) and server port with the scheme presented by a proxy or a load balancer via a request header (e.g. "X-Forwarded-Proto").

RemoteIpFilter:

> Servlet filter to integrate "X-Forwarded-For" and "X-Forwarded-Proto" HTTP headers.
>
> Most of the design of this Servlet Filter is a port of mod_remoteip, this servlet filter replaces the apparent client remote IP address and hostname for the request with the IP address list presented by a proxy or a load balancer via a request headers (e.g. "X-Forwarded-For").
>
> Another feature of this servlet filter is to replace the apparent scheme (http/https) and server port with the scheme presented by a proxy or a load balancer via a request header (e.g. "X-Forwarded-Proto").

やはり似たようなことが出来そうですが、RemoteIpFilter からは [Servlet filter](https://docs.oracle.com/cd/E18355_01/web.1013/B31859-01/filters.htm) の一種であることが読み取れます。その名の通り Filter はサーブレット仕様の一部であり、[Java EE / Jakarta EE で定義されています](https://javaee.github.io/javaee-spec/javadocs/javax/servlet/GenericFilter.html)。そのため、Tomcat に限らず Jetty や Glassfish など他のサーブレットコンテナでも使用可能です。

一方、[Tomcat Valve](https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html) は Tomcat に固有の機能です。Filter はサーブレット単位で動作しますが、Valve は `Catalina container` レベルで動作します。たとえば、Tomcat のアクセスログ設定は `Access Log Valve` で設定しますが、この Valve はどのサーブレットに来たリクエストもロギングできます。

Valve は Filter より処理されるタイミングが早いです。つまり、`RemoteIpValve` を使用する場合 `RateLimitFilter` との食い合わせを気にする必要はありません。`RateLimitFilter` が作動する段階でクライアントのアドレスに置換されているためです。実際、以下の設定を反映してみると「自作自演にならない例」と同様の挙動になることがわかります：

```xml:web.xml
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                      http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
  version="4.0"
  metadata-complete="true">

    <display-name>RemoteIpFilter を定義しない</display-name>

    <filter>
        <filter-name>RateLimitFilter</filter-name>
        <filter-class>org.apache.catalina.filters.RateLimitFilter</filter-class>
        <init-param>
            <param-name>bucketRequests</param-name>
            <param-value>5</param-value>
        </init-param>
    </filter>

    <filter-mapping>
        <filter-name>RateLimitFilter</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

</web-app>
```

```xml:server.xml
<Valve className="org.apache.catalina.valves.RemoteIpValve" />
```

## 参考リンク

* [RemoteIpValve (Apache Tomcat 9.0 API Documentation)](https://tomcat.apache.org/tomcat-9.0-doc/api/org/apache/catalina/valves/RemoteIpValve.html)
* [Apache Tomcat 9 Configuration Reference - The Valve Component](https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Remote_IP_Valve)
* [RemoteIpFilter (Apache Tomcat 9.0 API Documentation)](https://tomcat.apache.org/tomcat-9.0-doc/api/org/apache/catalina/filters/RemoteIpFilter.html)
* [Apache Tomcat 9 Configuration Reference - Container Provided Filters](https://tomcat.apache.org/tomcat-9.0-doc/config/filter.html#Rate_Limit_Filter)
* [Remote IP Valve (x-forwarding) with elastic load balancing](https://community.jamf.com/t5/jamf-pro/remote-ip-valve-x-forwarding-with-elastic-load-balancing/m-p/62879)
* [Tomcat's Valve, an alternative to Filter](https://blog.frankel.ch/tomcats-valve-an-alternative-to-filter/)
* [tomcat - difference between a valve and a filter - Stack Overflow](https://stackoverflow.com/questions/5537467/difference-between-a-valve-and-a-filter)
* [Anyone know the difference between Tomcat Valve and Filter? | Java | Coding Forums](https://www.thecodingforums.com/threads/anyone-know-the-difference-between-tomcat-valve-and-filter.147502/)
* [ValveでServletの前後に処理を追加する](https://nobrooklyn.hateblo.jp/entry/2013/11/04/213757)
