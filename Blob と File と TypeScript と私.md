# Blob と File と TypeScript と私

`Blob` は JavaScript で生データを扱う際に使用するインタフェース（オブジェクト型）です。
一方、`File` はファイルについての情報（ファイル名、最終更新時...）を持っていて、Blob インタフェースを継承しています。

[MDN](https://developer.mozilla.org/ja/docs/Web/API/File) では以下のように記述されています：

> File オブジェクトは特別な種類の Blob オブジェクトであり、 Blob が利用できる場面ではどこでも利用できます。特に、FileReader、URL.createObjectURL()、createImageBitmap() 、XMLHttpRequest.send() は、Blob と File の両方を受け付けます。
>
> File インターフェイスはメソッドを定義せず、Blob インターフェイスからメソッドを継承しています。

実際のところ、Blob インタフェースとの違いは以下の4つの読み取り専用プロパティを持っているかどうかということになります。

* `File.prototype.name`
* `File.prototype.lastModified`
* `File.prototype.lastModifiedDate`（非推奨）
* `File.prototype.webkitRelativePath`（標準外）

TypeScript組み込みの型定義情報では、`Blob` のプロパティ・メソッドに加え標準・推奨の2プロパティを持っていれば `File` という判定になっています。

```typescript:typescript/lib/lib.dom.d.ts
/** Provides information about files and allows JavaScript in a web page to access their content. */
interface File extends Blob {
    readonly lastModified: number;
    readonly name: string;
}
```

なるほど、**何等かの事情**[^1]で `Blob` から `File` にキャストしたい場合は、`lastModified` と `name` を補ってしまえばよさそうに見えます。

[^1]: たとえば `Blob` しか吐き出さない関数から、`File` しか受け付けない関数にデータを受け渡したい場合など。上述のように、多くの組み込み関数は `Blob` 全体を受け付けてくれるので、あてはまりません。

## いつわらないでいて　ブラウザの指摘は鋭いもの

以下のようなシンプルな例で試してみましょう。

```typescript
function read(file: File): void {
  const reader = new FileReader();
  reader.readAsDataURL(file);
}

// 実際には適当なデータを格納する
const blob = new Blob();
```

`File` 型のオブジェクトを受け取り、`FileReader.readAsDataURL(blob: Blob): void` で読み取るだけの `read` 関数と、`Blob` 型のオブジェクトを用意します。

それでは、`read()` に `blob` を与えてみましょう：

```typescript
read(blob)
// 型 'Blob' の引数を型 'File' のパラメーターに割り当てることはできません。
// 型 'Blob' には 型 'File' からの次のプロパティがありません: lastModified, name
```

コンパイルエラーになりました。型が違うので当然ですね。ここで、エラーメッセージに従い、プロパティを補ってあげましょう：

```typescript
read({...blob, lastModified: 0, name: "name"});
// コンパイルエラーにならない
```

型定義に合致しているので、コンパイルエラーにはなりません。しかしこのコードをブラウザ上で実行すると、`'readAsDataURL' parameter 1 is not of type 'Blob'` として怒られてしまいます。開発者ツールで見ても `File` オブジェクトではなく単なる `Object` だと認識されています。

```typescript
// 本当に有効なコード！
read(new File([blob], "name", {lastModified: 0}));
```

ということで、ちゃんと `File()` コンストラクタを通してあげると実行時エラーにはなりません。追加している情報は同じなのですが、横着をしてはいけませんね。

気が付いてみるとしょうもないことなのですが、エラーメッセージで検索しても事例が見つかりづらいため、記事として残しておきました。

## 愛する型定義のため　コンパイルエラーでいさせて

今回の例の場合は `readAsDataURL()` が `Blob` 型を引数に取るため、`as` で無理やり型アサーションをしても問題なく動作します。

```typescript
// 型アサーションでお茶を濁す
read(blob as File);
```

とはいえ `lastModified` や `name` に依存する処理が `read()` にあった場合は実行時エラーになってしまいます。`Blob` ではなく `File` 型の引数を求めている以上、想定されるべき事態でしょう。

## 参考リンク

* <https://developer.mozilla.org/ja/docs/Web/API/Blob>
* <https://developer.mozilla.org/ja/docs/Web/API/File>
