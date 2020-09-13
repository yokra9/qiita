# テキストエリアや contenteditable な要素を自動で伸び縮みさせたい

`contenteditable` 属性が有効な要素について、入力したテキストの量に合わせて自動で伸び縮みさせる手法を調べていました。今回は、その際に発見したブラウザごと挙動の差違が興味深かったのでまとめます。

[サンプルページはこちらから](https://yokra9.github.io/contenteditable-autogrow/)。

`contenteditable` 属性が有効な要素について、入力したテキストの量に合わせて自動で伸び縮みさせる手法を調べていました。今回は、その際に発見したブラウザごと挙動の差違が興味深かったのでまとめます。

## テキストエリアを自動で伸び縮みさせたい

前提として、`textarea` 要素を自動で伸縮させるときのことを考えてみましょう。以下のサンプルに目を通して下さい：

```index.html
<!DOCTYPE html>
<html>

<head>
    <script>
        window.onload = function () {

            function stretchElem(target) {
                target.style.height = "0px"
                target.style.height = [target.scrollHeight, "px"].join("")
            }

            document.querySelector("textarea").addEventListener('input', function (e) {
                stretchElem(e.target)
            })

            // 初期表示時にも実行
            stretchElem(document.querySelector("textarea"))

        }

    </script>
    <style>
        textarea{
            overflow: hidden;
        }
    </style>
</head>

<body>

    <textarea>looooooooooooooooooooooooooooooooooooooooooooooooooong text</textarea>

</body>

</html>
```

テキストエリアの場合はこのようなシンプルな実装で解決できてしまいます。

```
target.style.height = [target.scrollHeight, "px"].join("")
```

で内容物の高さをテキストエリアの高さに反映しています。しかし `scrollHeight` で内容物の高さを取得するにはスクロールバーが出現している状態である必要があるため[^1] 

```
target.style.height = "0px"
```

でテキストエリアの高さを 0px にしています。

[^1]: スクロールが不可能な状態と可能な状態で計算方法が違うみたいです。詳しくは参考リンクのMDNなどをご覧ください。

こちらのサンプルは Chromium 系、Firefox 、IE のいずれでも問題なく動作します。

## `contenteditable` 属性が有効な要素を自動で伸び縮みさせたい

`contenteditable` 属性が有効な要素はユーザが自由に内容を編集できるため、入力エリアとして利用できます。今回は `<div contenteditable />` をテキストエリア的な用途で使用する場合を考えてみましょう。

まず、記事執筆時点（2019-10-26）での各ブラウザのデフォルト動作を確認しましょう：

| | 初期値に合わせて伸縮 | 自動で伸縮 | 右端で折り返す | 備考 |
| ---- | ---- |---- |---- |---- |
| Chromium 系 | 伸縮する | 伸縮する | 右端で折り返す | 編集中に空欄にすると scrollHeight が 0 になる |
| Firefox | 伸縮する | 伸縮しない | 右端で折り返さない | 初期値がない場合は高さが 0 になる |
| IE | 伸縮する | 伸縮しない | 右端で折り返さない | |

Chromium 系ブラウザはデフォルトで伸び縮みするため特別な対応を必要としませんが、編集中に内容を全消去したときの挙動が特徴的です。Firefox と IE は概ね同じ動きをしますが、前者は初期値がない場合は高さを 0 にするため CSS でデフォルトの高さを明示する必要があります。以下はこれらを踏まえたサンプルです：

```index.html
<!DOCTYPE html>
<html>

<head>
    <script>

        window.onload = function () {

            function stretchElem(target) {
                target.style.height = "0px"
                target.style.height = [target.scrollHeight, "px"].join("")
                if (target.style.height == "0px") target.style.height = "1.5em"
            }

            document.querySelector("div").addEventListener('input', function (e) {
                stretchElem(e.target)
            })

        }

    </script>
    <style>
        div {
            border: 1px solid black;
            height: 1.5em;
            width: 500px;
            word-wrap: break-word;
        }
    </style>
</head>

<body>
    <div contenteditable></div>
</body>

</html>
```

先ほどとの違いは CSS と

```
if (target.style.height == "0px") target.style.height = "1.5em"
```

です。Chromium 系で全消去した場合高さが 0 になってしまうため、デフォルトの高さに戻しています。ここでは簡単化のためデフォルトの高さをハードコーディングしていますが、実際上は定数にするなどしたほうがいい可能性もあります。

## 参考リンク

* [Element.scrollHeight - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight)
* [Element.scrollHeight - スクロール分を含めた高さを取得する](https://syncer.jp/javascript-reference/element/scrollheight)
* [テキストエリア(textarea)の高さを自動にする](https://webparts.cman.jp/input/textarea/)
* [contenteditable - HTML: HyperText Markup Language | MDN](https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/contenteditable)
