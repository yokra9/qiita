# MailHog をリバースプロキシに通したら Error during WebSocket handshake: Unexpected response code: 400 と怒られたときに読むページ

私はメール送信機能を持つアプリの開発時にダミーSMTPサーバとして [Mailhog](https://github.com/mailhog/MailHog) を利用しています。シングルバイナリながらも Web UI まで備える等お手軽・便利な点が気に入っていて、[ISO-2022-JP を文字化けさせないための PR をマージして生成したバイナリ](https://github.com/yokra9/MailHog-UI/releases)を配布しているくらいです。

そんな Mailhog ですが、Web UI をリバプロ経由で利用したい場合には WebSocket が貫通するように調整する必要があります。

## debian 用 Apache の場合

2つのモジュールを有効化する必要があります。HTTPのリバースプロキシを担当する `proxy_http` と WebSocket のリバースプロキシを担当する `proxy_wstunnel` です：

```shell
a2enmod proxy_http proxy_wstunnel
```

次に、ProxyPass を設定します。`apache2.conf` や `sites-available/000-default.conf` など、状況に応じて適切なものを選択してください。ここでは後者を利用します。

```000-default.conf
<VirtualHost *:80>

    # 中略

    ProxyPass "/mailhog/api/v2/websocket" ws://localhost:8025/api/v2/websocket
    ProxyPassReverse "/mailhog/api/v2/websocket" ws://localhost:8025/api/v2/websocket

    ProxyPass "/mailhog/" http://localhost:8025/
    ProxyPassReverse "/mailhog/"  http://localhost:8025/
</VirtualHost>
```

ポイントは、設定を記載する順番です。制限が厳しい順に記すルールとなっていますので、アプリ本体より API のエンドポイントを先に記載しなければなりません。エンドポイントの URL は `ws://localhost:8025/api/v2/websocket/` でないので注意しましょう。

## おまけ：Dockerfile

```Dockerfile
FROM debian:latest

USER root
RUN apt update
RUN apt install -y wget apache2
RUN a2enmod proxy_http proxy_wstunnel
RUN mkdir /opt/mailhog \
 && cd /opt/mailhog \
 && wget https://github.com/mailhog/MailHog/releases/download/v1.0.0/MailHog_linux_amd64
RUN chmod +x /opt/MailHog_linux_amd64
ADD 000-default.conf /etc/apache2/sites-available/
EXPOSE 80

ADD run.sh /bin/run.sh
CMD ["sh","/bin/run.sh"]
```

```shell:run.sh
/etc/init.d/apache2 start
/opt/mailhog/MailHog_linux_amd64
```

## 参考リンク

* [Always "disconnected" #142](https://github.com/mailhog/MailHog/issues/142)
