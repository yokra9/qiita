# window.open()で開いたウィンドウ間でデータをやりとりする

`window.open()` は新しいウィンドウを開くメソッドですが、戻り値として開いたウィンドウの参照を返します。
また、`window.opener` プロパティは現在のウィンドウを開いたウィンドウへの参照を返します。クライアントサイドJavaScriptにおけるグローバル変数は `window` オブジェクトのプロパティなので、`window.open()` で開いたウィンドウはお互いのグローバル変数を参照できることになります。

## サンプル

ここではサンプルとして、ウィンドウ間でリアクティブに値が共有されるテキストインプットを作成してみましょう：

```test1.html
<!DOCTYPE html>
<html>
    <head>
        <script>
            let w1 = window
            let w2 = window.open("test2.html")
            
            Object.defineProperty(w1, "inputValue", {
                set(v){
                    console.log("w1.inputValue was set!:" + v)
                    w2.document.getElementById("input2").value = v
                }
            });

            function func(e){
                w1.inputValue = e.target.value
            }
        </script>
    </head>
    <body>
        input1 :
        <input type="text" id="input1" oninput="func(event)">
    </body>
</html>
```

```test2.html
<!DOCTYPE html>
<html>
    <head>
        <script>
            let w1 = window.opener
            let w2 = window

            Object.defineProperty(w2, "inputValue", {
                set(v){
                    console.log("w2.inputValue was set!:" + v)
                    w1.document.getElementById("input1").value = v
                }
            });

            function func(e){
                w2.inputValue = e.target.value
            }
        </script>
    </head>
    <body>
        input2 :
        <input type="text" id="input2" oninput="func(event)">
    </body>
</html>
```

`test1.html` をブラウザで開くと：

![reactive.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/b60b39df-6696-91f6-7c88-02c3949444a5.gif)

このように、お互いのグローバル変数 `document` を参照しリアクティブな描画を実現しています。


当然ですが、片側に寄せて書き直すこともできます：


```test3.html
<!DOCTYPE html>
<html>
    <head>
        <script>
            let w3 = window
            let w4 = window.open("test4.html")
            
            Object.defineProperty(w3, "inputValue", {
                set(v){
                    console.log("w3.inputValue was set!:"+v)
                    w4.document.getElementById("input4").value=v
                }
            });

            Object.defineProperty(w4, "inputValue", {
                set(v){
                    console.log("w4.inputValue was set!:" + v)
                    w3.document.getElementById("input3").value = v
                }
            });

            function func(e){
                w3.inputValue = e.target.value
            }
        </script>
    </head>
    <body>
        input3 :
        <input type="text" id="input3" oninput="func(event)">
    </body>
</html>
```

```test4.html
<!DOCTYPE html>
<html>
    <head>
        <script>
            function func(e){
                inputValue = e.target.value
            }
        </script>
    </head>
    <body>
        input4 :
        <input type="text" id="input4" oninput="func(event)">
    </body>
</html>
```

ソースはこちらから：<https://github.com/yokra9/reactive-over-window>

## 参考リンク

* [window.open - Web API | MDN](https://developer.mozilla.org/ja/docs/Web/API/Window/open)
* [window.opener - Web API | MDN](https://developer.mozilla.org/ja/docs/Web/API/window.opener)
* [Object.defineProperty() - JavaScript | MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
