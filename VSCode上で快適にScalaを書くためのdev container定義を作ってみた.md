# VSCode 上で快適に Scala を書くための dev container 定義を作ってみた

`VisualStudio Code development container`（以下 `dev container`）、いいですよね。リポジトリに `dev container` 定義を同梱することで、VSCode のフル機能を備えた開発環境を簡単に配布できます。チームでの共同開発だけでなく、個人開発の場合でも、破壊・運搬可能な開発環境の利点を上げるとキリがありません。

公式の `dev container` 定義は [GitHub レポジトリ](https://github.com/microsoft/vscode-dev-containers/tree/main/containers)から参照できますが、残念ながら Scala 環境の定義は用意されていません。この記事では、公式の Java 開発用定義から派生させた Scala 開発用定義をご紹介します。

定義だけが必要な方は、こちらのリポジトリをご参照ください：
<https://github.com/yokra9/vscode-dev-containers-scala-sbt>

## `devcontainer.json`

Scala 用の `dev container` 定義ファイルです。公式の Java 開発用定義から派生しているため、凡その内容に変化はありません：

```javascript:devcontainer.json
{
  "name": "Scala",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      // Update the VARIANT arg to pick a Java version: 11, 15
      "VARIANT": "11",
      // Options
      "INSTALL_MAVEN": "false",
      "INSTALL_GRADLE": "false",
      "INSTALL_NODE": "false",
      "NODE_VERSION": "lts/*",
      "INSTALL_SBT": "true",　//　追加: sbt の要否
    }
  },
  /* （中略） */
  // Add the IDs of extensions you want installed when the container is created.
  "extensions": [
    "vscjava.vscode-java-pack",
    "scalameta.metals" // 追加: Scala 開発に便利な拡張機能
  ],
  /* （中略） */
}
```

まず、Docker イメージのビルド時に渡すオプションの中に、`INSTALL_SBT` フラグを追加しています。このフラグは `Dockerfile` 内で参照され、イメージに sbt をインストールするかどうかの判断に用います。

また、デフォルトの拡張機能として、[Scala (Metals)](https://marketplace.visualstudio.com/items?itemName=scalameta.metals) ( `scalameta.metals` )を追加しています。Metals は Scala 用の言語サーバで、VSCode を IDE のような使い勝手に向上させます。

![Completions](https://user-images.githubusercontent.com/1408093/56036958-725bac00-5d2e-11e9-9cf7-46249125494a.gif) [^1]

[^1]: https://marketplace.visualstudio.com/items?itemName=scalameta.metals

## `Dockerfile`

前述の `INSTALL_SBT` フラグが `true` である場合（デフォルト）、公式リポジトリから sbt をインストールします：

```Dockerfile
# [Option] Install sbt
ARG INSTALL_SBT="true"
RUN if [ "${INSTALL_SBT}" = "true" ]; then \
    echo "deb https://repo.scala-sbt.org/scalasbt/debian all main" > /etc/apt/sources.list.d/sbt.list \
    && echo "deb https://repo.scala-sbt.org/scalasbt/debian /" > /etc/apt/sources.list.d/sbt_old.list \
    && curl -sL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x2EE0EA64E40A89B84B2DF73499E82A75642AC823" | apt-key add \
    && apt-get update \
    && apt-get install sbt \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/* ; fi
```

## 参考リンク

* [VS Code Remote / GitHub Codespaces Container Definitions](https://github.com/microsoft/vscode-dev-containers/)
* [Metals · Scala language server with rich IDE features](https://scalameta.org/metals/)
* [Ubuntu and other Debian-based distributions](https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html#Ubuntu+and+other+Debian-based+distributions)
