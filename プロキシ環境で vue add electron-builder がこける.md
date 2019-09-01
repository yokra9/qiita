# プロキシ環境で vue add electron-builder がこける

よっしゃー ` vue-cli-plugin-electron-builder` で Electron アプリ開発したるでー！ と意気込んで `vue add electron-builder` を叩いたら `Error: connect ECONNREFUSED` などと怒られて困った。

## 結論

```
npm config https-proxy http://<user>:<pass>@<host>:<port>
```

こういうときはやっぱりプロキシのせいでした。あれ？ でも npm のプロキシ設定なんてとっくの昔に済ませていたような……

## 原因

同じ箇所でハマっておられる先人がいらっしゃって助かりました。

[npm config -g でプロキシの設定をしているのに electron-quick-start や electron-prebuilt でコケる](https://aquasoftware.net/blog/?p=927) によると…


>electron-prebuilt のコードを見てみると、 どうやら electron-download というパッケージを使って electron のビルド済zip をダウンロードしているらしい。

>では、その electron-download の中身はというと…

>おや？ なんか rc モジュール使って、 npm config の proxy, https-proxy 設定取得しているっぽいぞ？

> `–global` オプションの保存先の `%APPDATA%\npm\etc\npmrc` や `%ALLUSERSPROFILE%\npm\etc\npmrc` が読み込まれていねぇじゃねぇか！

というわけで、こと Electron の取得に関してはグローバルなプロキシ設定は効かないようです。ローカルな設定を追加してあげるとすんなり通りました。マジかおまえ。

## 参考リンク

* [プロキシ環境下でElectron開発環境の初期セットアップをするときに困ったこと](https://qiita.com/ota-meshi/items/69ed2333ed2ba0768178)
