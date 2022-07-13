# Dockerfile v1.4.0 以降のヒアドキュメント機能を使うときにハマったこと

## TL;DR

Linux ベースの Dockerfile でヒアドキュメントを使用する場合は改行コードを `LF` に統一して保存しましょう。特に Docker Toolbox や Docker Desktop for Windows の頃から引き継ぐ資産がある方は改行コードを改めて確認しましょう。

## Dockerfile 構文の拡張

Docker v18.09以降では、クライアント側で設定することで [BuildKit](https://github.com/moby/buildkit) バックエンドを使用してイメージをビルドできるようになりました。

BuildKit を使用するメリットのひとつが、`syntax` ディレクティブによる Dockerfile 構文の拡張です。たとえば、BuildKit を有効にして以下の Dockerfile をビルドすると、`docker/dockerfile:1.4.1` イメージが BuildKit フロントエンドとして使用されます。このとき、Dockerfile は v1.4.1 の文法で読み込まれます：

```Dockerfile
# syntax=docker/dockerfile:1.4.1
FROM debian:11-slim

ENV SAMPLE sample

SHELL ["/bin/bash", "-c"]

RUN  echo "line1" >> test.txt && \
     echo "line2" >> test.txt && \
     echo "${SAMPLE}" >> test.txt

ENTRYPOINT ["cat", "test.txt"]
```

```bash
# 一時的に BuildKit を有効にしてビルド
$ DOCKER_BUILDKIT=1 docker build -t test .

$ docker run --rm test
line1
line2
sample
```

## ヒアドキュメント機能を使用する

これまで Dockerfile の `RUN` 命令内で複数のコマンドを記述したい場合には `&& \` で区切っていました。`RUN` 命令を多発すると無駄にレイヤ数が増えてしまいますし、単純な `&&` による連結では非常に読みづらくなってしまうからです[^1]。しかし、最終行以外の行末に毎度「おまじない」を書く必要があるのは億劫ですし、ケアレスミスを誘発します。

[^1]: 行末に `\` を、行頭に `&&` を置くパターンも有名で、[ベストプラクティスで紹介されている](https://docs.docker.jp/develop/develop-images/dockerfile_best-practices.html#env)のはこちらです。

そこで、Dockerfile v1.4.0 以降で追加されたヒアドキュメント機能を活用しましょう。bash でおなじみ `<<` ないし `<<-`（ハードタブ無視）が利用できます：

```Dockerfile
# syntax=docker/dockerfile:1.4.1
FROM debian:11-slim

ENV SAMPLE sample

SHELL ["/bin/bash", "-c"]

RUN <<EOF
# ヒアドキュメント in ヒアドキュメント
cat <<- _DOC_ > test.txt
	line1
	line2
	${SAMPLE}
_DOC_
EOF

ENTRYPOINT ["cat", "test.txt"]
```

```bash
$ docker run --rm test
line1
line2
sample
```

ヒアドキュメントは `COPY` 命令でも利用できます：

```Dockerfile
# syntax=docker/dockerfile:1.4.1
FROM debian:11-slim

ENV SAMPLE sample

COPY <<-EOF test.txt
	line1
	line2
	${SAMPLE}
EOF

ENTRYPOINT ["cat", "test.txt"]
```

```bash
$ docker run --rm test
line1
line2
sample
```

## 既存の Dockerfile をヒアドキュメント仕様に移行するときにハマったこと

さて、既存の Dockerfile をヒアドキュメントを使用するように変更した場合、ビルドは成功してもシェルの実行に失敗するパターンがあります：

```bash
$ docker run --rm test
cat: test.txt: No such file or directory
```

私の場合、Docker Toolbox 以来数年間育ててきた Dockerfile の移行でこの問題が発生してしまいました。

その原因は **Dockerfile の改行コードが `CRLF` になっていたため**でした。RUN 命令内に記述されたヒアドキュメントは（SHELL 命令で設定できる）標準シェルによって実行されます。ヒアドキュメントが改行コード `CRLF` で記述されている場合、改行コード `LF` の世界では以下のように見えます：

```bash
cat <<- _DOC_ > test.txt\r
	line1\r
	line2\r
	${SAMPLE}\r
_DOC_\r
```

結果、出力ファイル名に `CR` が混ざってしまい、ヒアドキュメントも正常に終了されていませんでした。

```bash
$ ls -la 
-rw-r--r-- 1 root root   29 Jul 12 23:15 'test.txt'$'\r'

$ cat "test.txt\r"
line1
line2
sample
_DOC_
```

どうやら Docker Toolbox を利用しつつ Windows 上でファイルを作成・編集していた頃に作った Dockerfile であったため、無意識的に `CRLF` で保存していたようです。むしろこれまでよく問題なく動いていたな、というところですね。現在の私は WSL 上の Docker を利用しているため、Dockerfile の新規作成時に `CRLF` を選ぶことはほぼないでしょう。

改行コードに起因するという意味では、[他にも「予期しないファイル終了（EOF）」や 「sh: 0: Can't open」 などの怒られ方をする可能性もあります](https://qiita.com/yokra9/items/b56ee5334436f890fd19)。同様のトラブルにハマられた方の参考となれば幸いです。

## 参考リンク

* [Dockerfile reference](https://docs.docker.com/engine/reference/builder/#syntax)
  * [日本語版](https://docs.docker.jp/engine/reference/builder.html#syntax)
* [Dockerfile frontend syntaxes](https://github.com/moby/buildkit/blob/master/frontend/dockerfile/docs/syntax.md#here-documents)
* [絶対に動くはずのシェルスクリプトを実行して「予期しないファイル終了（EOF）」とか「sh: 0: Can't open」とか怒られたときによむページ](https://qiita.com/yokra9/items/b56ee5334436f890fd19)
