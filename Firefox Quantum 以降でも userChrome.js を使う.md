# Firefox Quantum 以降でも userChrome.js を使う

## userChromeJS とは

[userChromeJS](http://userchromejs.mozdev.org/) は任意のユーザスクリプトを導入することで Firefox の Chrome[^1] をカスタマイズするための拡張機能**でした**。この拡張機能は Firefox Quantum（Firefox v57以降）には対応していません。[userChromeJS Mozillazine thread](http://forums.mozillazine.org/viewtopic.php?f=48&t=1006795) で開発が行われていましたが、現在はスレッドがクローズされています。

[^1]: Firefox の GUI 部分。[クロムめっき](https://en.wikipedia.org/wiki/Chrome_plating)（英: *Chrome Plating* または単に *Chrome*）が語源であるのか、そして Google Chrome の名付けに影響があったかについては諸説あります。

## firefox-quantum-userchromejs を利用する

*firefox-quantum-userchromejs は 2020-01-07 に公開された Firefox 72 以降は動作しなくなりました。詳しくは[こちら](https://github.com/nuchi/firefox-quantum-userchromejs)*

----

上記スレの末尾で言及されていますが、[nuchi](https://github.com/nuchi/) さんが [firefox-quantum-userchromejs](https://github.com/nuchi/firefox-quantum-userchromejs) リポジトリに userChromeJS の後継案を公開しています。拡張機能ではなく、ファイルを指定のディレクトリに配置して利用します。詳細な利用法は [ReadMe](https://github.com/nuchi/firefox-quantum-userchromejs/blob/master/README.md) に譲りますが、以下に簡単な説明を記載します。

### `userChrome.css` と `userChrome.xml` を入手する

上記のリポジトリから以下のファイルを入手してください：

* [userChrome.xml](https://raw.githubusercontent.com/nuchi/firefox-quantum-userchromejs/master/userChrome.xml)
* [userChrome.css](https://raw.githubusercontent.com/nuchi/firefox-quantum-userchromejs/master/userChrome.css)

なお Firefox のアップデートに従って随時更新されていくので、導入後に動作が怪しくなった場合はリポジトリに更新がないか確認してください。

### 使用中のプロファイルの場所を見つける

[about:profiles](about:profiles) を開きます。使用中のプロファイルを探し、ルートディレクトリを開きます。

![openProfile.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/acda06a3-273c-6bcb-8fef-8434732ef8c4.jpeg)


### `userChrome.css` と `userChrome.xml` を配置する

プロファイルディレクトリに `chrome` という名前のディレクトリを作成し、 `userChrome.css` と `userChrome.xml` を配置します。既に `chorme/userChrome.css` が存在した場合は追記してください。

### userChrome.js を作成する

`chrome` ディレクトリに `userChrome.js` を作成し、任意のユーザスクリプトを記述してください。

## 動作原理

Firefox はデフォルトで `chrome/userChrome.css` を読み込みます。今回追記した `userChrome.css` は、 `-moz-binding` 要素を利用して `userChrome.xml` の id が `js` な要素を Firefox の UI 要素（執筆時のバージョンでは `toolbarbutton#alltabs-button`）にバインドします。そしてこの `userChrome.xml` の該当箇所には `userChrome.js` を読み込み、動作させるための JS が記述されています。JS を XML の中に仕込んで CSS から無理矢理読み込ませているのは発想の勝利という感があります……。こういう仕組みなので Firefox 側の UI 要素の名前が変わったりすると対応が必要になります。

## 参考リンク

* [nuchi/firefox-quantum-userchromejs](https://github.com/nuchi/firefox-quantum-userchromejs)
* [firefox用スクリプトアップローダー](https://u6.getuploader.com/script/)
* [userChrome.js用スクリプト](http://wiki.nothing.sh/page/userChrome.js%CD%D1%A5%B9%A5%AF%A5%EA%A5%D7%A5%C8)
* [Firefoxを鍛え直せ！　フォクすけブートキャンプ：第4日目：クラフトマンシップを持て――userChrome.js](https://www.itmedia.co.jp/enterprise/articles/0708/04/news012.html)
