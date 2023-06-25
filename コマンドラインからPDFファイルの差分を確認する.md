# コマンドラインから PDF ファイルの差分を確認する

初投稿です。PDF ファイルの差分を確認したいときちょくちょくってありますよね。PDF で提供されるマニュアルの改訂版を確認するとき、どこが改訂されたのかがわからず困ってしまいます。そんなあなたにおすすめなのが [diff-pdf](https://vslavik.github.io/diff-pdf/) です。PDF の差分をテキスト・画像の両面から知ることができます。GUI 表示はもちろん、CLI 環境で実行し結果を PDF ファイルとして出力もできます。便利ですね！

![スクリーンショット](https://vslavik.github.io/diff-pdf/screenshot.png)
(出典：[公式 GitHub Pages](https://vslavik.github.io/diff-pdf/))

クロスプラットフォーム対応で、Windows 版はバイナリとしても提供されています。本稿では Linux 版のコンパイル方法を中心に記載していきます。

## コンパイル編

Debian 11 を想定しています。

### 前提：依存性を解消する

ビルドと実行に必要なパッケージをインストールします。GTK3 は wxWidgets が、poppler は diff-pdf が依存しているパッケージです。

```bash
apt install automake bzip2 git g++ libgtk-3-dev libpoppler-glib-dev make wget 
```

### wxWidgetsをインストールする

wxWidgets はクロスプラットフォームな GUI ライブラリです（[参考](https://qiita.com/496_/items/3c2929bc296d39ce708c)）。diff-pdf も wxWidgets3 を利用していますが、yum からインストールできるのは wxWidgets2 なので、ソースからコンパイルする必要があります。

1. wxWidgets のソースコードを[ここ](https://github.com/wxWidgets/wxWidgets/releases)からダウンロードして展開する

    ```bash
    wget https://github.com/wxWidgets/wxWidgets/releases/download/v3.2.2.1/wxWidgets-3.2.2.1.tar.bz2
    bzip2 -dc wxWidgets-3.2.2.1.tar.bz2 | tar xvf -
    ```

2. `configure` を実行する

    ```bash
    cd wxWidgets-3.2.2.1
    ./configure --disable-dependency-tracking
    ```

3. コンパイル＆インストール

    ```bash
    make
    make install
    ldconfig
    ```

### diff-pdf をコンパイルする

1. `git clone` する

    ```bash
    cd ~
    git clone https://github.com/vslavik/diff-pdf.git
    ```

2. `bootstrap` と `configure` を実行する

    ```bash
    cd diff-pdf
    ./bootstrap
    ./configure
    ```

3. コンパイル＆インストール

    ```bash
    make
    make install
    ```

## 使い方

### CLI

```bash
diff-pdf --output-diff=差分.pdf 比較元.pdf 比較先.pdf
```

### GUI

```bash
diff-pdf --view 比較元.pdf 比較先.pdf
```

## 参照

* [wxWidgetsの紹介](https://qiita.com/496_/items/3c2929bc296d39ce708c)
* [Automakeでmakeする](http://www.02.246.ne.jp/~torutk/cxx/automake/automake.html)
