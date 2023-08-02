# 「実行可能な Dockerfile」を作ってみる

タイトルは「実行可能な Docker イメージ」の間違いではありません。「実行可能な **Dockerfile**」で正解です。実行するとこのようにイメージのビルドが走ります：

```bash
chmod +x Dockerfile
./Dockerfile
```

![ExecutableDockerfile](./img/ExecutableDockerfile.gif)

仕掛けは単純で、シバンで `docker build` を呼び出しているだけです：

```Dockerfile
#!/usr/bin/env -S docker build . -f
# syntax=docker/dockerfile:1.5.0
FROM busybox
```

Dockerfile は `#` で始まる行がコメントとして扱われるため、1 行目のコメントとしてシバンを仕込めるわけですね。

`env` コマンドの `-S` オプションはシバン行で複数の引数を渡すのに使用されます。このオプションを付加しないと `docker build . -f` で 1 コマンド扱いとなり `No such file or directory` となります。

```log
/usr/bin/env: `docker build . -f': そのようなファイルやディレクトリはありません
/usr/bin/env: shebang 行でオプションを渡すには -[v]S を使ってください
```

`docker build` の `-f` オプションは Dockerfile のパスを指定するものです。シバン行で指定されたインタプリタには実行されたファイルのパスが渡されるので、これを `-f` オプションで受けられる順番にしています。

## `syntax` ディレクティブとの相性問題（解決済み）

このトリックは以前から使用可能だったのですが、`syntax` ディレクティブとの相性問題がありました。`syntax` ディレクティブは通常 1 行目にありますが、シバンを書くと 2 行目に移動してしまいます。この結果、Buildkit はその行を `syntax` ディレクティブではなく通常のコメントとして理解し、拡張構文が使用できない状態になってました。

この点について、2023-01-10 リリースの [Dockerfile v1.5.0](https://github.com/moby/buildkit/releases/tag/dockerfile%2F1.5.0) で `syntax` ディレクティブの拡張が行われ、シバン行の次にある場合でも理解されるようになりました。同時に `// syntax = ...` や `{ "syntax": "..." }` といった形式の表記も理解されるようになっています：

```go:frontend/dockerfile/parser/directives.go
// DetectSyntax returns the syntax of provided input.
//
// The traditional dockerfile directives '# syntax = ...' are used by default,
// however, the function will also fallback to c-style directives '// syntax = ...'
// and json-encoded directives '{ "syntax": "..." }'. Finally, starting lines
// with '#!' are treated as shebangs and ignored.
//
// This allows for a flexible range of input formats, and appropriate syntax
// selection.
```

<https://github.com/moby/buildkit/blob/dc706a966d050323082c44de9c5bfe49b7251191/frontend/dockerfile/parser/directives.go#L103-L111>

Buildkit には同日リリースの [v0.11.0](https://github.com/moby/buildkit/releases/tag/v0.11.0) でビルトインされ、Docker Engine には 2023-05-17 リリースの [v24.0](https://github.com/moby/moby/releases/tag/v24.0.0) で取り込まれました。

Dockerfile が実行可能であることのメリットは正直あまりないですが、タグ等 `docker build` に渡してほしいオプションを明示する際には使えそうです：

```Dockerfile
#!/usr/bin/env -S docker build --no-cache --progress plain --tag tag --build-arg KEY=build-time . -f
# syntax=docker/dockerfile:1.5.0
FROM busybox

ARG KEY
RUN echo $KEY
```

なお、`ARG` についてはこんなことをしなくても `ARG KEY=value`形式でデフォルト値を明示可能です。

## 参考リンク

* [Proposal: Directives should be parsed even if they appear after a shebang line in the dockerfile #2904](https://github.com/moby/buildkit/issues/2904)
* [Proposal: support multiple formats for syntax directives #2937](https://github.com/moby/buildkit/pull/2937)
* [dockerfile/1.5.0](https://github.com/moby/buildkit/releases/tag/dockerfile%2F1.5.0)
* [Dockerfile v1.4.0 以降のヒアドキュメント機能を使うときにハマったこと](https://qiita.com/yokra9/items/8eec13c83e4c59eb0f8e)
* [Man page of ENV](https://linuxjm.osdn.jp/html/GNU_coreutils/man1/env.1.html)
* [Denoでshebangを使って実行する](https://qiita.com/the_red/items/d1ab611983da310ef00c)
* [これは Java スクリプトですか？](https://qiita.com/hanohrs/items/c4b519739e4d733b9aba)
