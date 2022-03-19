# AKS 上にデプロイした httpd で Azure Files をドキュメントルートに指定すると異常なレスポンスを返却することがある

AKS (Azure Kubernetes Service) で PV を利用する場合、Azure ディスクか Azure Files が主な選択肢となります。Azure Files を PV として扱う際に利用する [Azure Files CSI Driver](https://github.com/kubernetes-sigs/azurefile-csi-driver/blob/master/docs/driver-parameters.md) は、内部的には SMB もしくは NFS でネットワークマウントを行っています。

一方、httpd にはネットワークマウント時に考慮しなければならない設定項目があります。その結果、ドキュメントルートとして Azure Files を指定すると、ネットワークマウントに起因する問題が発生し異常な（冒頭が欠落する等）レスポンスを返却することがあります。

## ネットワークマウントに起因する問題を修正する

ネットワークマウント時に考慮しなければならない設定項目は2点です。configMap 等を通じて以下の設定となるよう修正してください。

### EnableSendfile

この項目は httpd がクライアントにファイルの内容を返す際に `sendfile(2)` システムコールを使うか否かを制御します。

`sendfile(2)` システムコールは、あるファイル記述子から別のファイル記述子へデータをコピーします。同様の処理はアプリケーション側で `read(2)` システムコールと `write(2)` システムコールを組み合わせることでも実現できますが、カーネル空間とユーザ空間の間でデータ転送が発生します。一方、`sendfile(2)` では処理がカーネル内で完結するため、無駄な転送が発生せず効率的です。[^1]

[^1]: https://man7.org/linux/man-pages/man2/sendfile.2.html

そのため、デフォルト設定では `sendfile(2)` を使用する設定が有効化されています。しかしマニュアルでは、DocumentRoot としてネットワークマウントされたディレクトリが指定されている場合、カーネルがキャッシュを通してファイルを提供できない場合があると記載されています。[^2] マニュアルに従い、以下のように設定しましょう。

[^2]: https://httpd.apache.org/docs/2.4/en/mod/core.html#enablesendfile

```conf
EnableSendfile Off
```

なお、[stackoverflow のこの質問](https://stackoverflow.com/questions/46367130/why-does-apache-recommend-against-using-sendfile-with-nfs-on-linux)ではネットワークマウントで EnableSendfile をオフにすることが推奨とされた経緯について推測を交えながら説明がなされており、興味深いです。

### EnableMMAP

この項目は httpd がファイルを読み込む際、メモリマッピングを使うかどうかを制御します。

DocumentRoot として NFS でマウントされたディレクトリが指定されている場合、クラッシュする可能性があるとされています。メモリマップされたファイルが削除・トランケートされたとき、セグメンテーションフォールトが発生するためです。[^3]

[^3]: https://httpd.apache.org/docs/2.4/en/mod/core.html#enablemmap

マニュアルでは明記されていませんが、SMB の場合も EnableMMAP を Off にしなければならない症例が報告されていますので、どちらにせよ以下のように設定しましょう。[^4] [^5] [^6]

[^4]: https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=900821

[^5]: https://q.hatena.ne.jp/1263439075#c231883

[^6]: https://bz.apache.org/bugzilla/show_bug.cgi?id=46688

```conf
EnableMMAP Off
```

## 参考リンク

* [core - Apache HTTP サーバ バージョン 2.4](https://httpd.apache.org/docs/2.4/mod/core.html)
* [Apache HTTP Server en AKS con Azure Files](https://www.returngis.net/2021/06/apache-http-server-en-aks-con-azure-files/)
* [Why does Apache recommend against using sendfile() with NFS on Linux](https://stackoverflow.com/questions/46367130/why-does-apache-recommend-against-using-sendfile-with-nfs-on-linux)
* [apache reads wrong data over cifs filesystems served by samba](https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=900821)
