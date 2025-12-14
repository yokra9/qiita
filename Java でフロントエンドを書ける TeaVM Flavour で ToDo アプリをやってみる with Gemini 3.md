# Java でフロントエンドを書ける TeaVM Flavour で ToDo アプリをやってみる with Gemini 3

Java をブラウザで走らせる技術といえば Java Applet が思い出されますが、現役でメンテナンスされている選択肢もまた存在します。[^1]

[^1]: [GraalWasm](https://www.graalvm.org/webassembly) は Java アプリ に WebAssembly を埋め込むために使用できますが、ブラウザで Java が走る技術ではありません。

* [CheerpJ](https://cheerpj.com/)
  * WebAssembly ベースの JVM（OpenJDK 互換）
  * 個人利用は無償、商用ライセンスあり[^2]
* [GWT Web Toolkit（旧 Google Web Toolkit）](https://www.gwtproject.org/)
  * Java ソースコード（`.java`）を JavaScript に変換するトランスパイラ + Web アプリケーションフレームワーク
  * Apache License 2.0
* [TeaVM](https://www.teavm.org/)
  * Java バイトコード（`.class`）を JavaScript (や WebAssembly) に変換するトランスパイラ[^3]
  * Apache License 2.0

[^2]: <https://cheerpj.com/docs/ja/licensing.html>

[^3]: Kotlin や Scala から生成された Java バイトコードでも変換可能です。

そして [Flavour](https://flavour.sourceforge.io/) は TeaVM をベースとした Web アプリケーションフレームワークです。TeaVM の作者でもある Andrew Oliver 氏により開発されています。Flavour の主な特徴は以下の通りです。

* HTML テンプレート
  * 標準的な HTML に専用属性を付与したり特殊なタグを記載してバインディングを行います（ JSP や React のように）。
  * JSP と異なり、EL 式についてもコンパイル時に型誤りが検知されます。
* POJO (Plain Old Java Object) なコンポーネント
  * ビューのロジックを標準的な Java クラスとして記述できます。

私は [TechFeed に掲載されていた紹介記事](https://frequal.com/java/AppletsGoneButJavaInTheBrowserBetterThanEver.html) で Flavour の存在を知りましたが、日本語情報を探しても [Java Magazine の和訳記事](https://blogs.oracle.com/otnjp/java-in-the-browser-with-teavm-ja)くらいしか見つかりませんでした。せっかくなので公式ドキュメントを読み解きつつ、実際に Flavour を使って ToDo アプリを作成してみることにしました。

![flavourTodo.gif](./img/flavourTodo.gif)

<https://yokra9.github.io/flavourTodo/>

本記事はこの ToDo アプリを通じて、Flavour による Web フロントエンド開発についてご紹介するものです。生成 AI がほとんどコードを書いてくれる現代に、あえて AI が抑えていないフレームワークを使うと何が起きるのかトライした感想についても、末尾のポエムで触れています。

## 環境構築

<details><summary>依存関係は以下のようになります。</summary>

```xml:pom.xml
<properties>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  <java.version>11</java.version>
  <flavour.version>0.3.2</flavour.version>
  <teavm.version>0.8.0</teavm.version>
  <jackson.version>2.20</jackson.version>
</properties>

<dependencies>
  <dependency>
    <groupId>org.teavm</groupId>
    <artifactId>teavm-classlib</artifactId>
    <version>${teavm.version}</version>
  </dependency>
  <dependency>
    <groupId>org.teavm</groupId>
    <artifactId>teavm-metaprogramming-impl</artifactId>
    <version>${teavm.version}</version>
  </dependency>

  <dependency>
    <groupId>com.frequal.flavour</groupId>
    <artifactId>teavm-flavour-widgets</artifactId>
    <version>${flavour.version}</version>
  </dependency>
  <dependency>
    <groupId>com.frequal.flavour</groupId>
    <artifactId>teavm-flavour-rest</artifactId>
    <version>${flavour.version}</version>
  </dependency>

  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-annotations</artifactId>
    <version>${jackson.version}</version>
  </dependency>
</dependencies>
```

ビルドフェーズでは `teavm-maven-plugin` を利用し Java コードを JavaScript へ変換します。`mainClass` に指定したクラスがアプリケーションのエントリーポイントとなります。

```xml:pom.xml
<build>
  <plugins>
    <plugin>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.14.1</version>
      <configuration>
        <release>${java.version}</release>
      </configuration>
    </plugin>

    <plugin>
      <artifactId>maven-war-plugin</artifactId>
      <version>3.5.1</version>
      <configuration>
        <webResources>
          <resource>
            <directory>${project.build.directory}/generated/js</directory>
          </resource>
        </webResources>
        <packagingExcludes>WEB-INF/**</packagingExcludes>
        <failOnMissingWebXml>false</failOnMissingWebXml>
      </configuration>
    </plugin>

    <plugin>
      <groupId>org.teavm</groupId>
      <artifactId>teavm-maven-plugin</artifactId>
      <version>${teavm.version}</version>
      <executions>
        <execution>
          <id>web-client</id>
          <phase>prepare-package</phase>
          <goals>
            <goal>compile</goal>
          </goals>
          <configuration>
            <targetDirectory>${project.build.directory}/generated/js/teavm</targetDirectory>
            <mainClass>com.github.yokra9.flavourTodo.Client</mainClass>
            <minifying>true</minifying>
            <debugInformationGenerated>true</debugInformationGenerated>
            <sourceMapsGenerated>true</sourceMapsGenerated>
            <sourceFilesCopied>true</sourceFilesCopied>
            <optimizationLevel>ADVANCED</optimizationLevel>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

</details>

2025 年末において `java.version` に 11 を指定しているのは、現時点で Flavour は TeaVM 0.8 以下でしか動作しないようだったからです。なお、TeaVM そのものは 0.9 から JDK 21 に対応しています。

## ToDo アプリの実装

実装はシンプルに、データモデル (`Todo.java`)、ビュークラス (`Client.java`)、ビュー (`client.html`) の3点で構成しました。

### データモデル (`Todo.java`)

純粋な POJO です。特筆すべき依存関係はなく、これをそのままフロントエンドのモデルとして利用できる点はメリットと言えます。

```java:Todo.java
package com.github.yokra9.flavourTodo;

import java.time.Instant;

public class Todo {
    private String text;
    private boolean completed;
    private Instant creationDate;

    public Todo(String text) {
        this.text = text;
        this.creationDate = Instant.now();
    }

    // Getter, Setter 等は省略
}
```

### ビュークラス (`Client.java`)

アプリケーションの状態管理を担うクラスです。`@BindTemplate` アノテーションでHTMLテンプレートとの紐付けを行います。

```java:Client.java
package com.github.yokra9.flavourTodo;

import org.teavm.flavour.templates.BindTemplate;
import org.teavm.flavour.templates.Templates;
// import文省略

@BindTemplate("templates/client.html") // HTMLファイルを指定
public class Client {
    private List<Todo> todos = new ArrayList<>();
    private String newTodoText = "";
    private boolean hideCompleted;

    public static void main(String[] args) {
        // エントリーポイント：ID "application-content" の要素にバインド
        Templates.bind(new Client(), "application-content");
    }

    // 新しい TODO を追加
    public void addTodo() {
        if (newTodoText != null && !newTodoText.trim().isEmpty()) {
            todos.add(new Todo(newTodoText));
            newTodoText = "";
        }
    }
    
    // 表示用リストのフィルタリング
    public List<Todo> getVisibleTodos() {
        if (!hideCompleted) {
            return todos;
        }
        return todos.stream()
                .filter(todo -> !todo.isCompleted())
                .collect(Collectors.toList());
    }

    // Getter, Setter 等は省略
}
```

### ビュー（`client.html`）

ビューは HTML テンプレートです。`index.html` で `id="application-content"` と記載された箇所にレンダリングする内容を定義するため、テンプレート自体は完全な HTML ではありません。

#### 双方向バインディング

Flavour 専用のタグや属性を用いて Java 側のプロパティやメソッドと連携させます。[^4]

[^4]: 実際のコードでは Tailwind CSS でスタイリングを行っていますが、ここでは可読性のため属性の一部を省略しています。

```xml
<div>
  <input type="text"
    html:value="newTodoText" 
    html:change="newTodoText" 
    placeholder="新しいタスクを追加..." />
  <button event:click="addTodo()">追加</button>
</div>
```

* `html:value`
  * Java 側の `getNewTodoText()` の値を表示。
* `html:change`
  * 入力変更時に `setNewTodoText()` を呼び出して値を更新。
* `event:click`
  * クリックイベントで `addTodo()` メソッドを実行。

#### 変数の宣言

ビュー独自の変数も宣言できます。モデルに持たせるほどでもない計算結果の再利用に便利です。

```xml
<!-- ToDo の消化率を計算して変数 percent に格納 -->
<std:with var="percent" value="todos.isEmpty() ? 0 : (todos.size() - activeCount) * 100 / todos.size()">
  <div class="relative w-8 h-8">
    <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36"
      attr:aria-label="'消化率 ' + percent + ' %'">
      <!-- 変数の利用箇所（1） ↑ -->
      <path class="text-slate-100"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
        stroke="currentColor" stroke-width="4" />
      <path class="text-blue-500 transition-all duration-500 ease-out"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
        stroke="currentColor" stroke-width="4" stroke-linecap="round" 
        attr:stroke-dasharray="percent + ', 100'" />
      <!-- 変数の利用箇所（2） ↑ -->
    </svg>
  </div>
</std:with>
```

#### 条件分岐、ループ、EL 式

JSTL と似ているようですが、文法には結構な違いがあります。

```xml
<ul>
  <!-- 分岐 -->
  <std:if condition="todos.isEmpty()">
    <li>まだタスクがありません。</li>
  </std:if>

  <!-- ループ -->
  <std:foreach var="todo" in="visibleTodos">
    <li>
      <label>
        <input type="checkbox"
          html:checked="todo.completed" 
          html:checked-change="todo.completed" />

        <!-- 三項演算子 -->
        <span attr:class="todo.completed ? 'line-through' : ''">
          <html:text value="todo.text" />
        </span>
      </label>
    </li>
  </std:foreach>
</ul>
```

```xml
<div>
  <!-- 多分岐 -->
  <std:choose>
    <std:option when="activeCount == 0">
      <span>🎉 素晴らしい！全て完了です</span>
    </std:option>
    <std:option when="activeCount > 5">
      <span>🔥 タスクが山積みです</span>
    </std:option>
    <std:otherwise>
      <span>💪 その調子！</span>
    </std:otherwise>
  </std:choose>
</div>
```

#### ラムダ式

JavaScript のラムダ式を見慣れていると変な感じですが、Java 風に `Type param -> expression` と書きます。

```xml
<html:text value="() -> System.getProperties().toString()" />
```

## まとめ + 2025 年末における未来展望

エコシステムの規模ではモダンな JS フレームワークに及びませんが、Java に習熟したチームが社内ツール等を開発する際の選択肢としては検討の余地があると感じました。とはいえ Flavour はもちろん TeaVM もまだ v1.0 に到達していません（2025 年 11 月に [v0.13](https://github.com/konsoletyper/teavm/releases/tag/0.13.0) がリリース）ので、あくまで実験的な利用に留めるのが賢明です。

こうして文法紹介をするに際し、改めて ToDo アプリはチュートリアルに最適な題材であることを認識しました。伊達に色んな言語・フレームワークの教材に選ばれてはいませんね。

この ToDo アプリの実装にあたっては [Gemini Code Assist for individuals](https://codeassist.google/?hl=ja) の支援を受けました。せっかく Google AI Pro プランを契約しているので、話題の Gemini 3 パワーを開発にも適用してみたかったからです。

結論、Flavour 独自の構文（`std:choose` や `html:checked-change` など）については、適切なコードが提案されるわけではありませんでした。Flavour のドキュメントをコンテキストに加えていても JSTL 風に独自解釈したコードが大量発生するなど、いわゆる「Vibe Coding」で完結するほど甘くはありません。

```xml:Gemini 3 が生成した謎コード例。JSTL の c:choose のアレンジっぽい。
<std:choose>
  <std:when condition="activeCount == 0">
    <span>🎉 素晴らしい！全て完了です</span>
  </std:when>
  <std:when condition="activeCount > 5">
    <span>🔥 タスクが山積みです</span>
  </std:when>
  <std:otherwise>
    <span>💪 その調子！</span>
  </std:otherwise>
</std:choose>
```

一方で、Java ロジックの実装や Tailwind CSS によるデザインを一瞬で生成してくれるのは大きな時短になりましたし、デザインに関しては自分で書くより高品質なものを生成してくれさえします。

[IEEE Spectrum でも触れられている](https://spectrum.ieee.org/top-programming-languages-2025)ように、マイナーな言語でコーディングすると生成 AI の成果は明らかに劣化します。こうした特性は我々の技術選択をより狭めていくことでしょう。あえて難しい道を行く「オタク」でなければ、生成 AI に任せっきりで上手くいくほうがいいに決まっていますからね。

ツールは目的を達成するための手段に過ぎないと言う人もいますが、私の見解は異なります。優れたツールは思考を助け、優れたツールとの出会いは思考の枠組みを広げます。

> 普通の技術は速く変化する。でもプログラミング言語はちょっと違う。プログラミング言語は単なる技術ではなく、プログラマーがそれを道具として思考するものだからだ。プログラミング言語は半分技術で、半分は宗教なんだ。  
> ―― Paul Graham（[普通のやつらの上を行け](https://practical-scheme.net/trans/beating-the-averages-j.html)）

もちろん生成 AI 自体も優れたツールではありますが、思考そのものを侵食する性質を持っている点が他のツールとは異なるのです。これは果たして「プロメテウスの火」ではないのかと自問しつつ、その便利さに依存が深まっていく日々を送っています。

と言いつつ、[2023 年に GPT 3.5 とペアプログラミングしたときの未来展望](https://qiita.com/yokra9/items/72afea01bdf5991d80ad)を見返すと、現時点で正解と不正解が混ざっているような状態です。未来のことを悲観したって鬼が笑うと言いますし、大きな流れには身をゆだねるほかないのでしょうね。

## 参考リンク

* [Applets Are Officially Gone, But Java In The Browser Is Better Than Ever](https://frequal.com/java/AppletsGoneButJavaInTheBrowserBetterThanEver.html)
* [TeaVMを使ってブラウザでJavaを動かす | Oracle Technology Network Japan Blog](https://blogs.oracle.com/otnjp/java-in-the-browser-with-teavm-ja)
* [TeaVMを利用したJavaによるhtml5開発](https://qiita.com/sio29/items/b7ed0490eb935ac1aa7d)
* [TeaVMを使ってブラウザ上でJavaを実行する方法](https://qiita.com/blue_islands/items/d029719dc788f9784201)
* [Flavour: Single-Page Web Apps in Java](https://flavour.sourceforge.io/)
* [TeaVM](https://teavm.org/)
