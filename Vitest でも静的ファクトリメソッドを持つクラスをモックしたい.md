# Vitest でも静的ファクトリメソッドを持つクラスをモックしたい

以下のような [ES6 / TypeScript のクラス構文](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Classes)で定義された `Klass` クラスと、それを利用する `viaConstructer()` 関数があったとします。

```typescript:Klass.ts
export class Klass {
    field: string;

    constructor() {
        console.log("constructor() called");
        this.field = "initialzed";
    }
}
```

```typescript:main.ts
import { Klass } from "./Klass";

export function viaConstructer() {
    const klass = new Klass();
    console.log("viaConstructer called:", klass, klass.field);
};
```

Vitest で `viaConstructer()` 関数のテストコードを作成するにあたり、`Klass` クラスをモックするにはどうすればよいでしょうか？

この例では、クラスを宣言しているモジュールをモックすることで、クラス全体をモックに置き換られます。[ES6 / TypeScript のクラスは糖衣構文であり実体として関数](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Using_classes)なので、モックは普通に `vi.fn()` で宣言できます：

```typescript
import { test, vi } from "vitest"
import { viaConstructer } from "./main";

test("コンストラクタを含め、クラス全体をモックする", () => {

    vi.mock("./Klass", () => {
        return {
            Klass: vi.fn().mockImplementation(() => console.log("mocked Klass"))
        }
    });

    viaConstructer();
});
```

このテストを実行すると、`Klass` のコンストラクタが呼び出されておらず、無事にモック出来たことを確認できます。

```log
stdout | main.test.ts > コンストラクタを含め、クラス全体をモックする
mocked Klass
viaConstructer called: spy {} undefined
```

## 静的ファクトリメソッドでもモックしたい

ではこのように、スタティックなファクトリメソッド `create()` と、それを利用する `viaCreate()` があった場合はどうでしょう。

```typescript:Klass.ts
export class Klass {
    field: string;

    private constructor() {
        console.log("constructor() called");
        this.field = "initialzed";
    }

    static create(): Klass {
        console.log("create() called");
        return new Klass();
    }
}
```

```typescript:main.ts
import { Klass } from "./Klass";

export function viaCreate() {
    const klass = Klass.create();
    console.log("viaCreate called:", klass, klass.field);
};
```

元のコードのままだと、このように `create()` が関数ではないということで怒られてしまいます。

```log
 FAIL  viaConstructer.test.ts > コンストラクタを含め、クラス全体をモックする
TypeError: Klass.create is not a function
 ❯ Module.viaCreate main.ts:4:25
      7| 
      8| export function viaCreate() {
      9|     const klass = Klass.create();
       |                         ^
     10|     console.log("viaCreate called:", klass, klass.field);
     11| };
 ❯ main.test.ts:12:5
```

`Klass.create` は `undefined` なので当然といえば当然です。

そこで、クラス全体を `vi.fn()` に置き換えるのではなく、ファクトリメソッドと同名の関数をプロパティとして持つオブジェクトに置き換えてあげます。

```typescript
import { test, vi } from "vitest"
import { viaCreate } from "./main";

test("スタティックなファクトリメソッドをモックする", () => {

    vi.mock("./Klass", () => {
        return {
            Klass: {
                create: vi.fn().mockImplementation(() => {
                    console.log("mocked Klass.create()")

                    return {}
                })
            }
        }
    });

    viaCreate();
});
```

無事ファクトリメソッドがモックされたことを確認できますね。

```log
stdout | viaCreate.test.ts > スタティックなファクトリメソッドをモックする
mocked Klass.create()
viaCreate called: {} undefined
```

[式本体記法の暗黙 return](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions#%E9%96%A2%E6%95%B0%E3%81%AE%E6%9C%AC%E4%BD%93) を活用することで、もう少しスマートにも書けます：

```typescript
import { test, vi } from "vitest"
import { viaCreate } from "./main";

test("スタティックなファクトリメソッドをモックする", () => {

    vi.mock("./Klass", () => ({
        Klass: {
            create: vi.fn().mockImplementation(() => {
                console.log("mocked Klass.create()")

                return {}
            })
        }
    }));

    viaCreate();
});
```

また、モック化されたファクトリメソッドの返り値としてフィールド（やメソッド定義）を含めることも可能です。

```diff
- return {}
+ return { field: "mocked field" }
```

```log
stdout | viaCreate.test.ts > スタティックなファクトリメソッドをモックする
mocked Klass.create()
viaCreate called: { field: 'mocked field' } mocked field
```

## スタティックなファクトリメソッドでも呼び出し回数をチェックしたい

ファクトリメソッドに対する呼び出しを検証したい場合は、モック関数を `vi.hoisted()` で定義して変数に保持しておくことで `expect()` の引数として参照できるようになります。ES Modules の static import はトップレベルで評価される都合、`vi.hoisted()` で宣言した変数でなければモック関数内で参照できません。

```typescript
import { test, vi, expect } from "vitest"
import { viaCreate } from "./main";

const { create } = vi.hoisted(() => {
    return {
        create: vi.fn().mockImplementation(() => {
            return {}
        })
    }
})

test("スタティックなファクトリメソッドをモックし、呼び出し回数をチェックする", () => {

    vi.mock("./Klass", () => {
        return {
            Klass: {
                create
            }
        }
    });

    viaCreate();

    expect(create).toBeCalledTimes(1);
});
```

## まとめ

簡単に検索した範囲では Vitest で静的ファクトリメソッドを持つクラスをモックする方法を解説した記事が見つからなかったため執筆した本稿ですが、あまり直感的なコードにできませんでした。静的ファクトリメソッドには「インスタンスの取得方法をわかりやすい名前で表現できる」等のメリットがある一方、テスタビリティ（テストコードの読みやすさ）の観点では優れていると言い難いですね。同様のメリットを得たい場合、クラス外に別途ビルダーメソッドを設けることで `vi.spyOn()` による一般的なモック方法に寄せることが可能です：

```typescript:Klass.ts
export class Klass {
    field: string;

    constructor() {
        console.log("constructor() called");
        this.field = "initialzed";
    }
}

export function klassBuilder() {
    console.log("klassBuilder() called");
    return new Klass();
};
```

```typescript:main.ts
import { Klass } from "./Klass";

export function viaBuilder() {
    const klass = klassBuilder();
    console.log("viaBuilder called:", klass, klass.field);
};
```

```typescript
import { test, vi } from "vitest"
import { viaBuilder } from "./main";
import * as klassModule from "./Klass";

test("ビルダーメソッドをモックする", () => {

    vi.spyOn(klassModule, "klassBuilder").mockImplementation(() => {
        console.log("mocked klassBuilder")

        return { field: "mocked field" }
    })

    viaBuilder();
});
```

```log
stdout | viaBuilder.test.ts > ビルダーメソッドをモックする
mocked klassBuilder
viaBuilder called: { field: 'mocked field' } mocked field
```

## 参考リンク

* [クラス - JavaScript | MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Classes)
* [TypeScriptで学ぶプログラミングの世界 Part 6 [staticってなんなんだ？]](https://qiita.com/JavaLangRuntimeException/items/3ec567955e3b0be8b58d#%E3%83%95%E3%82%A1%E3%82%AF%E3%83%88%E3%83%AA%E3%83%BC%E3%83%A1%E3%82%BD%E3%83%83%E3%83%89%E3%82%84%E6%8A%BD%E8%B1%A1%E5%8C%96%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3)
* [Mocking classes from mocked modules in Vitest tests | Snippets • Soorria Saruva](https://soorria.com/snippets/mocking-classes-vitest)
* [ESMのmock巻き上げ問題とVitestのvi.hoistedについて](https://zenn.dev/ptna/articles/617b0884f6af0e)
* [コード例で深ぼるEffectiveJava~「第2章コンストラクタの代わりにstaticファクトリメソッドの使用を検討する」の深掘り~ - AYukky’s blog](https://ayukky.hatenablog.com/entry/2023/07/29/172133)
