# Gatling DSL の EL 式と Scala の変数展開が同居するとややこしい件

Gatling は Scala でテストコードを記述する負荷試験ツールですが、その多くを占めるシナリオ部分は [Gatling DSL](https://gatling.io/docs/current/general/concepts#scenario) と呼ばれる[ドメイン特化言語](https://ja.wikipedia.org/wiki/%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E5%9B%BA%E6%9C%89%E8%A8%80%E8%AA%9E)で記述します。

## Gatling DSL の EL 式（Expression Language）

`Gatling DSL` の EL 式は Gatling のセッション属性(`Session attributes`)への参照を埋め込む際に利用します。

```scala
// セッション属性 foo に値を設定する
session.set("foo", "FOO")

// Session API でセッション属性 foo の値を取り出す
session("foo").as[String] // FOO

// EL 式でセッション属性 foo の値を取り出し、文字列に埋め込む
"${foo} BAR" // FOO BAR
```

基本的には `${属性名}` という記法で参照を得ますが、EL 式に組み込まれた機能を利用してもっと複雑なこともできます：

```scala
// コレクション foo のサイズを得る
"${foo.size()}"

// インデックス付コレクション foo からランダムな要素を一つ取り出す
"${foo.random()}"

// インデックス付コレクション foo から 5 番目の要素を一つ取り出す
"${foo(5)}"

// インデックス付コレクションもしくはタプルである foo から n 番目の要素を取り出す
"${foo(n)}"

// タプル foo から 2 番目の要素を取り出す
"${foo._2}"

// マップ foo からキーが bar である要素を取り出す
"${foo.bar}"

// foo があれば true を、なければ false を得る
"${foo.exists()}"

// foo がなければ true を、あれば false を得る
"${foo.isUndefined()}"

// foo を JSON 形式でフォーマットした値を得る
"${foo.jsonStringify()}"
```

`Gatling DSL` の EL 式は **`Gatling DSL` の関数に渡される String に対してのみ動作します。**

## Scala の変数展開

一方、Scala には変数展開（あるいは「文字列の補完」、`string interpolation`）という機能があります。文字列の前に補間子（`interpolator`）をつけることで、変数へ参照を埋め込むことができます。

```scala
val foo = "FOO"
println(s"$foo BAR")  // FOO BAR
```

基本的には `$変数名` という記法で値を取り出しますが、`${式}` という記法で任意の式を埋め込むこともできます：

```scala
println(s"${1 + 1}")  // 2
```

Scala に組み込まれた補完子は三種類あります。

```scala
// s 補完子。シンプルな変数展開を実現します。
val foo = "FOO"
println(s"$foo")  // FOO

// raw 補完子。s 補完子の機能に加え、エスケープを実行しません。
println(raw"{"foo":"$foo"")  // {"foo":"FOO"}
// """～""" でも raw 補完子と同じ効果を実現します。
println("""{"foo":"$foo"}""") // {"foo":"FOO"}

// f 補完子。C の printf のようなフォーマット付文字列を実現します。
val decimal = 10
println(f"$foo%s $decimal%d") // FOO 10
```

## 混在するとなにがややこしいのか

さて、Scala の変数展開では、下のような記述も許されます：

```scala
s"${foo} BAR" // FOO BAR

"""${foo} BAR""" // FOO BAR
```

Gatling DSL の EL 式にそっくりですね。実際の所、Gatling DSL でも Scala の変数展開を利用することはできますが、それぞれの機能は排他的です：

```scala
session.set("foo", "FOO")
val bar = BAR

"${foo} BAR" // FOO BAR         -- 1
s"FOO ${bar}" // FOO BAR        -- 2

"${foo} ${bar}" // FOO ${bar}   -- 3
s"${foo} ${bar}" // error!      -- 4
```

3 や 4 のように変数とセッション属性の取得を同時に行いたい場合は、変数をセッション属性にセットするか、式展開で `Session API` を呼ぶことで実現できます。

## 参考リンク

* [EXPRESSION AND EL](https://gatling.io/docs/current/session/expression_el)
* [文字列の補間](https://docs.scala-lang.org/ja/overviews/core/string-interpolation.html)
