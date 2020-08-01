# Windows 10 環境で接触式 IC カードリーダーライター HX-520UJ を導入する

急遽接触式 IC カードリーダーライターが必要となったので、手元にあった 2008 年 12 月発売（！）の日立 HX-520UJ.K を Windows 10 端末に接続してみました。ところが PnP ではドライバがインストールされず、付属のCDに入っているドライバも動作しませんでした。

[ユーザサポート](https://www.hitachi.co.jp/Prod/comp/ic-card/support/index.html)を訪問したところ、`HX-520UJ.K/HX-520UJ.J(本体型式：M-520U）リーダライタドライバはWindows8および10をサポートしておりません。` という表記がありました。12 年も前の HW ですから無理もありません。しかし [ISO 7816](https://www.ipa.go.jp/security/enc/smartcard/node16.html) に変化があったわけではないので、対応ドライバさえ手に入ればまだ利用できるはずです。どうにかできないものか。

## 同型カードリーダーライターからドライバを流用する

HX-520UJ.K および HX-520UJ.J の形式番号は M-520U とされています。実は M-520U という形式番号を持った同型のカードリーダーライターはほかに二点存在しています（いずれも販売終了）：

* [マクセル MR-520UJ](https://biz.maxell.com/ja/security_peripherals/mr-520uj.html)
* [三菱電機インフォメーションシステムズ MM-520U](https://www.mdis.co.jp/service/mm-520u/download.html)

これらの商品は **OEM 元/先の関係にある**と推測できます。根拠となるのは HX-520UJ.K に付属するのドライバの著作権がマクセル精器株式会社にあることです。マクセル精器は日立マクセル（現・マクセル）傘下で IC カードリーダーライターなどを開発していた企業です。[^1] [^2] [^3]

[^1]: [マクセル精機は日立マクセルに吸収され、現存しません。](https://www.maxell.co.jp/news/pdf/maxell_news120123_1.pdf)

[^2]: [マクセル精機 WEB サイトの WebArchive には MR-500UJ / MR-520UJ が記載されており、当時は HW もマクセル精機から発売されていたことがわかります。](https://web.archive.org/web/20120510051014/http://www.maxei.co.jp/products/ic_card_rw/mr-500_520uj/index.html)

[^3]: MDIS に卸されていた理由はわかりませんでしたが、現在提供されているドライバの製造元は日立マクセル表記でした。

![hitm500u.sys.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/dc3cb591-4b94-1d7f-69f1-451255e8b5ff.png)

上記リンクから MR-520UJ および MM-520U のサポートサイトにアクセスすることで、 Windows 10 に対応したドライバ（バージョン1.0.1.4）を入手できます。[^4]

[^4]: MR-520UJ のサポートページでは Windows 10 対応は謳われていませんが、MM-520U 提供のドライバとバージョン番号は同じです。

## インストール時の注意点

[MM-520U のドライバインストールマニュアル](https://www.mdis.co.jp/service/mm-520u/install_mm520u.pdf)は非常に親切で、Windows 10 でのインストール手順も詳細に記載されています。いずれのドライバを利用するにせよ、このマニュアルを参照するとよいでしょう。[^5]

[^5]: マニュアルでは PnP でドライバがインストールされるような記載がありましたが、自分の環境では再現しませんでした。

気を付ける必要があるのは、ドライバをインストールしても Windows の Smart Card サービスは自動起動に設定されないことです。Smart Card サービスが実行されていない場合、HX-520UJ.K に IC カードを挿入しても認識されません。

また、スリーブ時に HX-520UJ.K 接続が接続されていると、スリープからの復帰に失敗することがありました。これはドライバを無理やりあてたことに起因するものではなく、サポートされていたころからある既知の不具合です。

最後に、この記事は動作確認情報を共有するものであり、サポートされていない環境・ドライバでの利用を推奨するものではありません。

## 参考リンク

* [マイナンバーカードでe-Tax。[HITACHI M-520U]](https://ameblo.jp/tencho82/entry-12241178365.html)
* [M-520UのWindows 8/8.1ドライバ](https://axion.sakura.ne.jp/blog/index.php?mode=show&date=20140502&view=box)
* [Windows 7でHX-520UJ.K/HX-520UJ.Jをお使いのお客様へ](http://www.hitachi.co.jp/Prod/comp/ic-card/support/popup/w7_notice.html)
