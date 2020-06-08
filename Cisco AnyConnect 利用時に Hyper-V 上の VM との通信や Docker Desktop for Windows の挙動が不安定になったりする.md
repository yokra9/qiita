# Cisco AnyConnect 利用時に Hyper-V 上の VM との通信や Docker Desktop for Windows の挙動が不安定になったりする


## TL;DR

管理者が許していない場合はあきらめてください。

## Cisco AnyConnect 利用時に Hyper-V 上の VM との通信や Docker Desktop for Windows の挙動が不安定になったりする理由

Cisco AnyConnect は VPN クライアントソフトウェアです。一般ユーザが利用する端末にインストールし、SSL-VPN 接続を利用します。一方、企業側に設置され VPN サーバとして稼働するのが Cisco のファイアウォール製品である Cisco Adaptive Security Appliance 5500 シリーズおよび 5500-X シリーズ（以下 Cisco ASA）です。Cisco ASA の SSL-VPN 接続は**デフォルトでローカル LAN 宛てのトラフィックを遮断します。**[^1]

[^1]: インターネット宛てのトラフィックをトンネリングするだけでなくローカル LAN 接続に制限を与えているのは情報持ち出し等のセキュリティリスクを低減させるためでしょうか？

たとえば[インターネット接続の共有を利用した仮想マシンのネットワーク接続](https://www.gmo.jp/report/single/?art_id=212)を行っている VM へのアクセス、および Docker Desktop for Windows で利用されている DockerDesktopVM への通信はローカル LAN 宛てのトラフィックとなるため、Cisco AnyConnect による VPN 接続時にはアクセスが遮断されてしまうのです。リモートワークに差し支えたりしますが仕様や規定ならばあきらめるほかありません。

## 管理者がローカル LAN アクセスを許可する方法

Cisco サポートの [VPN クライアントと AnyConnect クライアントからローカル LAN へのアクセスの設定例](https://www.cisco.com/c/ja_jp/support/docs/security/asa-5500-x-series-next-generation-firewalls/70847-local-lan-pix-asa.html) を参照します。ローカル LAN アクセスが許可されている場合は、AnyConnect の設定画面に `Allow local (LAN) access when using VPN (if configured)` というオプションが現れています。

![](https://www.cisco.com/c/dam/en/us/support/docs/security/asa-5500-x-series-next-generation-firewalls/70847-local-lan-pix-asa-13.gif)（出典：<https://community.cisco.com/t5/vpn/how-to-enable-quot-allow-local-lan-access-quot-on-ssl-vpn-client/td-p/596279>）

## 管理者に怒られてもローカル LAN アクセスがしたいとき

許されていないことを**無理に**実行しようとした場合、一般的に怒られが発生します。しかし、それでもローカル LAN アクセスがしたいひとはいるかもしれません。私は試していませんが、解決法となりうる情報を見つけましたので共有しておきます。

SuperUser に [How to allow local LAN access while connected to Cisco VPN?](https://superuser.com/questions/284709/how-to-allow-local-lan-access-while-connected-to-cisco-vpn) というトピックがあり、Cisco AnyConnect の代替として OSS の VPN クライアントである [OpenConnect VPN client](https://www.infradead.org/openconnect/) を利用するという提案がありました：

>For those looking to maintain control of their routing table when using a Cisco AnyConnect SSL VPN, check out OpenConnect. It both supports the Cisco AnyConnect SSL VPN and doesn't attempt to disrupt or 'secure' routing table entries. @Vadzim alludes to this in a comment above.
>
>After trying everything but patching the AnyConnect Secure Mobility Client, I was able to successfully replace it on Windows with OpenConnect GUI. This enabled me to maintain connectivity to local resources (and update the routing table).
>
>I use OpenConnect on Windows but it also supports Linux, BSD, and macOS (among other platforms) according to the project page.

参考和訳です：

>Cisco AnyConnect SSL VPN の使用時にルーティングテーブルの制御を維持したい場合は、OpenConnect を調べてみてください。 同様に Cisco AnyConnect SSL VPN をサポートしますが、ルーティングテーブルエントリをさまたげたり、「保護」したりしようとしません。 @Vadzimは、上記のコメントでこれを暗示しています。
>
>AnyConnect Secure Mobility Client にパッチを適用する以外のすべての方法を試した後、Windows で OpenConnect GUI を使用して正常に置換できました。 これによってローカルリソースへの接続を維持できました（そしてルーティングテーブルを更新しました）。
>
>私は Windows で OpenConnect を使用していますが、プロジェクトページによると、Linux、BSD、macOS（他のプラットフォームの中でも）もサポートしています。

VPN クライアントを OpenConnect に差し替えることでローカル LAN アクセスを維持するわけですね。

## 参考リンク

* [VPN クライアントと AnyConnect クライアントからローカル LAN へのアクセスの設定例
](https://www.cisco.com/c/ja_jp/support/docs/security/asa-5500-x-series-next-generation-firewalls/70847-local-lan-pix-asa.html)
* [Cisco ASA - SSL-VPN Part 1](https://www.infraexpert.com/study/ciscoasa12.html)
* [VPN(SSL-VPN)接続時にローカルのネットワークにアクセスできない |
 広島大学情報メディア教育研究センター](https://www.media.hiroshima-u.ac.jp/helpdesk/faq/network/sslvpn-local-accsess)
