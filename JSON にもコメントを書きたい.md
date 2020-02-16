# JSON にもコメントを書きたい

[JSON](https://www.json.org/json-ja.html) の構文は至ってシンプルです。

1. JSON は名前（キー）と値のペアがセットになった「オブジェクト」から構成されています。
2. キーは**ダブルクォートでくくられた**文字列です。
3. 値は**ダブルクォートでくくられた**文字列、数値、真偽値、null 値、配列、またはオブジェクトです。
4. キーと値はコロン（ `:` ）で区切ります。
5. ペアとペアの間はカンマ（ `,` ）で区切ります。
5. 前後を中括弧（ `{` , `}`）で挟みます。

```JSON
{
    "文字列": "文字列",
    "数値": 0,
    "真偽値": true,
    "null値": null,
    "配列": [
        "要素1",
        "要素2"
    ],
    "オブジェクト": {
        "キー": "値"
    }
}
```

そう、JSON にはコメントを記載するための構文がないのです。近年では設定ファイルなどで利用されることも多い JSON ですが、コメントによる説明が不要なキーを名付けることは現実的ではありません。どうしよう、困ったな。

## TL;DR

コメントをつけるだけなら [JSONC](#jsonc-jsonc--%E3%81%8A%E3%81%99%E3%81%99%E3%82%81) を使いましょう。

**（2020-02-17追記）**
各フォーマットの比較などに使える[デモページ](https://yokra9.github.io/JSONdemo/index.html)を公開してみました。

**（2020-03-15追記）**
[続編](https://qiita.com/yokra9/items/e4907e319b6f6c58b404)を書きました。

## どうしても JSON にコメントを書きたい

同じようなことに悩む先人は多いため、インターネット上には様々なアイデアが提案されています。

たとえば [JSON Schema Core Draft 2019-09](https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.section.8.3)[^1] では以下のような記述があります：

[^1]: JSON のデータ構造を定義するためのスキーマ言語です。JSON Schema 自身も JSON で記述します。
```
8.3.  Comments With "$comment"

   This keyword reserves a location for comments from schema authors to readers or maintainers of the schema.

   The value of this keyword MUST be a string.  Implementations MUST NOT present this string to end users. Tools for editing schemas SHOULD support displaying and editing this keyword.  The value of this keyword MAY be used in debug or error output which is intended for   developers making use of schemas.
   
   Schema vocabularies SHOULD allow "$comment" within any object containing vocabulary keywords. Implementations MAY assume $comment" is allowed unless the vocabulary specifically forbids it. Vocabularies MUST NOT specify any effect of "$comment" beyond what is described in this specification.

  （後略）
```

上記のアイデアを真似てみるとこうなります：

```JSON
{
    "$comment": "コメント"
}
```

String にしろということなので複数行コメントには非対応です。ですが、配列を利用すれば複数行コメントのようにすることもできます：

```json
{
    "$comment": [
        "1行目",
        "2行目"
    ]
}
```

キーの頭に `$` が付与されているので、コメントであることが若干わかりやすいですね。インターネット上を見ていると、同じ発想からアンダースコアをつけて `____comment` のようにするパターンもあるようです。

また、JavaScriptでコメント行を表す `//` をキーとして利用しようという考えもあります。

```json
{
    "//": "コメント"
}
```

あるいは、空文字をキーにしてしまう人もいるようです：

```json
{
    "": "コメント"
}
```

これらの方法に共通する問題点として、一つのオブジェクトにつき一箇所しかコメントを書けないことが挙げられます。<del>JSON はキーの重複を許していないためです。万が一 JSON の仕様を無視してでも</del> [^6] キーの重複が許される場合は、以下のような奥深い記法も可能になります：

[^6]: コメントでご指摘を頂きましたが、[JSON の仕様](https://tools.ietf.org/html/rfc8259#section-4)ではキーの重複を禁止しておらず、ユニークであるべきという表現に留まっています。VS Code でもエラーではなく警告という扱いで 「⚠ Duplicate object key」と表示されます。

```json
{
    "#########": "#################################",
    "#########": "# コメントコメントコメントコメント #",
    "#########": "#################################"
}
```

## あきらめて JSON っぽい他のフォーマットを利用したほうがいいのでは？

孔明「お気づきになりましたか」

### YAML（`.yml`）

JSON っぽいというか、実は JSON は [YAML](https://yaml.org/) のサブセットです。YAML にはオブジェクト[^2]と配列[^3]を表現する記法が「ブロックスタイル」と「フロースタイル」の二つ用意されています。そして、そのうち「フロースタイル」が JSON と同様の記法なのです。たとえば、以下の JSON な記述は YAML の lint にかけてもエラーになりません：

[^2]: YAML ではマッピングと呼びます。
[^3]: YAML ではシーケンスと呼びます。

```YAML
{
    "文字列": "文字列",
    "数値": 0,
    "真偽値": true,
    "null値": null,
    "配列": [
        "要素1",
        "要素2"
    ],
    "オブジェクト": {
        "キー": "値"
    }
}
```

YAMLでは `#` で始まる記述がコメントアウトされます。

```YAML
{
    "文字列": "文字列", # コメント
    "数値": 0,
    "真偽値": true,
    "null値": null,
    "配列": [
        "要素1",
        "要素2"
    ],
    "オブジェクト": {
        "キー": "値"
    }
}

# 複数行コメントはありません
```

また、JSON よりも柔軟な記載が許されています。たとえば、以下の YAML の記述と JSON による記述は等価です：

```YAML
{ 
    文字列: 文字列, # キーも値もダブルクォートが不要
    真偽値: True, # 大文字始まりで書ける
    オブジェクト: {
        キー: 値, # ケツカンマ（Trailing Comma）が許される
    }
}
```

```json
{
  "文字列": "文字列",
  "真偽値": true,
  "オブジェクト": {
    "キー": "値"
  }
}
```


YAML をコメント付き JSON として使う場合の弱点は、その自由すぎる書き方に伴うデメリットを受け入れる必要があることです。たとえば、以下の JSON っぽいなにかは YAML としては妥当です：

```YAML
#{ 
    文字列: 文字列, 
    真偽値: True, 
    オブジェクト: {
        キー: 値, 
    }
#}
```

しかし、期待とは異なり、以下のような JSON として理解されます：

```json
{
  "文字列": "文字列,",
  "真偽値": "True,",
  "オブジェクト": {
    "キー": "値"
  }
}
```

ルートの中括弧を書き忘れた場合、YAML のパーサはブロックスタイルの記述であると理解します。その結果、行末のカンマまでが文字列であると解釈されてしまいました。

JSON の良さの一つは簡潔な記法です。あくまで「コメント付き JSON 」としての利用を想定する場合、自由度が高すぎる YAML はそぐわないかもしれません。

### CSON（`.cson`）

[CSON](https://github.com/bevry/cson) は CoffeeScript Object Notation の略です。その名の通り、今は懐かしき CoffeeScript のために作られた記法です。コメントが記載できるほか、YAML 風記法が利用可能になっています。

```coffeescript

# コメント

# オブジェクトの中括弧やカンマ不要
"オブジェクト":
    # ヒアドキュメント
    "文字列": '''
    文字列
    文字列
    ''' 
    # 配列のカンマ不要
    "配列": [
        "要素1"   
        "要素2"
    ]
```

GitHub のコミットログを見ると現在も継続的にメンテナンスされているようですが、CoffeeScript 関係に今から手を出すのは不安があります（※個人の感想です）。

### Hjson（ `.hjson` ）

というわけで CSON の上位互換にあたるのが [Hjson](https://hjson.github.io/) です。 コメントは `#` のほか JS 風コメント（ `//` および `/* */` ）や YAML 風記法が利用可能です。

```hjson
{
    #   コメント
    //  コメント
    /*
        コメント
    */

    // キーも値もダブルクォートが不要
    文字列1: 文字列

    // ヒアドキュメント
    文字列2:'''
        文字列2
        文字列2
        文字列2
    '''

    // カンマなしOK
    配列: [
        要素1
        要素2
    ]

    // ケツカンマも OK
    オブジェクト: {
        "キー": "値",
    }
}
```

`a user interface for JSON` を謳うフォーマットで、JSON を人間にやさしくしようというコンセプトで開発されました。まさしく設定ファイル向けですね。ただ、複雑なことができるだけに、CSON と同様「それなら YAML でいいのでは……」という指摘がつきまといます。[^4]

[^4]: その理由でメイン開発者がコミュニティを離れました。https://news.ycombinator.com/item?id=17989647

### JSON5（`.json5` : おすすめ）

[JSON5](https://json5.org/) は JSON に対して [ECMAScript 5.1](https://www.ecma-international.org/ecma-262/5.1/) から影響を受けた拡張を施したフォーマットです。ついでにコメントが書けるようになっています。

```json5
{
    /* 
        コメント
    */

    // キーはダブルクォートが不要
    // シングルクォートも使える
    文字列1: '文"字"列',
    // ヒアドキュメント
    // \nで改行文字を挿入
    文字列2: "文\
字\n列",
    // 16進表記とか使える
    数値: [
        0xdecaf,
        NaN,
        +Infinity,
        -Infinity
    ],
    // ケツカンマ OK
    配列: [
        "要素",
    ],
    オブジェクト: {
        "キー": "値",
    }
}
```

実は JSON5 は身近なところで使われています。たとえば、[Babel の設定ファイルである `.babelrc` は JSON5 として解釈される](https://babeljs.io/docs/en/config-files#supported-file-extensions)ようになっています。拡張がシンプルな点だけでなく、すでに広く使われている安心感があるため導入しやすいですね。

### JSONC （`.jsonc` : おすすめ）

[JSONC](https://github.com/microsoft/node-jsonc-parser) は Visual Studio Code の設定ファイルで JSON にコメントを書くために生まれた Node.js 用 JSON パーサとフォーマットです。Visual Studio Code には標準で JSONC を取り扱う機能が含まれています。Windows Terminal の `profiles.json` も JSONC 形式ですが、こちらは C++ プロジェクトのためパーサとしては [JsonCpp](https://github.com/open-source-parsers/jsoncpp)を採用しています。[^5]

[^5]: 詳しくはこちらの [Issue](https://github.com/microsoft/terminal/pull/1005) から。

```json-
{
    // コメント
    
    /* 
        コメント
    */

    "文字列": "文字列",
    "数値": 0,
    "真偽値": true,
    "null値": null,
    "配列": [
        "要素1",
        "要素2"
    ],
    "オブジェクト": {
        "キー": "値"
    }
}
```

コメントを書くことができるだけです。必要十分ですね。Visual Studio Code が元気な限りは保守されるだろうという安心感も良いと思います。

## 参考リンク

* [JSON の紹介](https://www.json.org/json-ja.html)
* [Can comments be used in JSON?](https://stackoverflow.com/questions/244777/can-comments-be-used-in-json)
* [JSONにはコメント行が付けられない？ネットで見つけた方法の有用性を試してみた](https://dev.classmethod.jp/etc/adding-comment-to-json/)
* [YAMLの基本について](https://www.task-notes.com/entry/20150922/1442890800)
* [Hjson, a user interface for JSON](https://hjson.github.io/)
* [CSON](https://github.com/bevry/cson)
* [JSON5 | JSON for Humans](https://json5.org/)
* [知らないうちにJSON5 in Babel](https://qiita.com/jkr_2255/items/026e0fdb4570c88c4f51)
* [microsoft/node-jsonc-parser](https://github.com/microsoft/node-jsonc-parser)
