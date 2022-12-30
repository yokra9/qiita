# ModiTect Maven Plugin で非モジュールなライブラリをオレオレモジュールにしてみる

[Java Platform Module System](https://en.wikipedia.org/wiki/Java_Platform_Module_System) は Java SE 9 以降で導入された仕様であり、いわゆるクラスパス地獄だとか JAR 地獄といわれる問題を回避するために提案されました。

モジュールの定義情報は `module-info.class` (ソースとしては `module-info.java` ) に格納されています：

```java:module-info.java
module モジュール名 {
    requires 依存するモジュール;
    exports 公開するパッケージ;
}
```

モジュールシステムにより、依存関係が明確になったり、呼び出されたくないクラスを非公開にできたりします。実行時のオプションも変化しており、モジュールの場所を示す `--module-path` と、実行するモジュール・クラスを示す `--module` を指定します：

```powershell
java --module-path "<実行するモジュールを含むJAR>.jar;<依存モジュールを含むJAR1>.jar;<依存モジュールを含むJAR2>.jar;..." --module <モジュール名>/<クラス名>
```

一方、`module-info.class` がない場合は「自動モジュール」（モジュールパスにある場合。クラスパスの場合は「無名モジュール」）として、以下のように扱われます[^1]：

* すべてのパッケージを `exports` している
* モジュールグラフに読み込まれたすべてのモジュールを `requires` している

[^1]: Java Platform Module System についてはこちらの記事に詳しいです：[モジュールシステムを学ぶ](https://qiita.com/opengl-8080/items/93c8e0cf58654d5f73cb)

多少の複雑性はありますが、地獄を回避する代償なので仕方ありません。さて、そうなると既存の非モジュールなライブラリをオレオレモジュールにして JAR 地獄を回避したいという気持ちも湧いてきます[^2]。そのような場合は、既存の JAR ファイルを元にモジュール定義情報を書き加えてしまいましょう。

[^2]: 単純に非モジュールなライブラリを `requires` したいだけなら、`jar --describe-module --file <JARファイル>` で確認できる自動モジュール名を指定します。

## ModiTect で非モジュールな JAR をモジュール化してみる

[ModiTect](https://github.com/moditect/moditect) はモジュールシステムを操作する Maven プラグインです。たとえば [jetty-javax-servlet-api](https://github.com/eclipse/jetty.toolchain/blob/master/jetty-javax-servlet-api/pom.xml) などの Jetty が内部的に使用するライブラリで、非モジュールな JAR をモジュール化するのに使用されています[^3]。

[^3]: このほか、[OSGi](https://en.wikipedia.org/wiki/OSGi) に準拠したマニフェストを追加するなどの処理もなされています。

今回の場合、以下の流れとなるようにプロジェクトを作成します：

1. 依存関係として元の JAR を取得する（[今回のサンプル](https://github.com/yokra9/moditect-sample/)では `commons-codec` を題材としました）
2. `maven-dependency-plugin` で依存関係のソースを展開する
3. `build-helper-maven-plugin` で依存関係のソースをソースコードとして追加する
4. コンパイルする
5. `moditect-maven-plugin` でモジュール定義情報を追加する
6. 再度 JAR 化する

`pom.xml` はこのようになります（全文は[こちら](https://github.com/yokra9/moditect-sample/blob/master/commons-codec/pom.xml)）：

```xml:pom.xml（抜粋）
<plugins>
    <!-- 依存関係のソースを target/sources/ に展開する -->
    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-dependency-plugin</artifactId>
        <executions>
            <execution>
                <?m2e ignore?>
                <id>unpack-source</id>
                <phase>generate-sources</phase>
                <goals>
                    <goal>unpack-dependencies</goal>
                </goals>
                <configuration>
                    <classifier>sources</classifier>
                    <failOnMissingClassifierArtifact>false</failOnMissingClassifierArtifact>
                    <outputDirectory>${project.build.directory}/sources</outputDirectory>
                </configuration>
            </execution>
        </executions>
    </plugin>

    <!-- 展開した依存関係のソースをソースコードとして追加する -->
    <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>build-helper-maven-plugin</artifactId>
        <executions>
            <execution>
                <id>add-source</id>
                <phase>generate-sources</phase>
                <goals>
                    <goal>add-source</goal>
                </goals>
                <configuration>
                    <sources>
                        <source>${project.build.directory}/sources</source>
                    </sources>
                </configuration>
            </execution>
        </executions>
    </plugin>

    <!-- コンパイル -->
    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
            <source>11</source>
            <target>11</target>
            <release>11</release>
        </configuration>
    </plugin>

    <!-- module-info.class を追加する -->
    <plugin>
        <groupId>org.moditect</groupId>
        <artifactId>moditect-maven-plugin</artifactId>
        <executions>
            <execution>
                <id>add-module-info</id>
                <phase>package</phase>
                <goals>
                    <goal>add-module-info</goal>
                </goals>
                <configuration>
                    <overwriteExistingFiles>true</overwriteExistingFiles>
                    <module>
                        <!-- ここに module-info.java の内容を記述する -->
                        <moduleInfoSource>
                            // オレオレモジュール名
                            module com.github.yokra9.moditect {
                                // エクスポートするパッケージを指定
                                exports org.apache.commons.codec.binary;
                            }
                        </moduleInfoSource>
                    </module>
                </configuration>
            </execution>
        </executions>
    </plugin>

</plugins>
```

[オレオレモジュール JAR を利用する側のプロジェクト](https://github.com/yokra9/moditect-sample/tree/master/moditect-sample)では、`module-info.java` でオレオレモジュールを `requires` してあげます：

```java:module-info.java
module com.github.yokra9.moditectSample {
    requires com.github.yokra9.moditect;
}
```

エクスポートしているパッケージは `org.apache.commons.codec.binary` のみなので、それ以外のパッケージをインポートするとコンパイルエラーになります：

```java
// コンパイルが通る
import org.apache.commons.codec.binary.Base64;

// コンパイルエラーになる
import org.apache.commons.codec.EncoderException;
import org.apache.commons.codec.net.URLCodec;
```

上述の通り実行時にはモジュールパスとメインモジュール・メインクラスを指定する必要がありますが、`ModuleMainClass` が定義された JAR ファイルではクラス名の指定を省略できます。

```powershell
# メインモジュールとオレオレモジュールにパスを通し、メインモジュールとメインクラスを指定する
java --module-path "moditect-sample-0.0.1.jar;yokra9-commons-codec-0.0.1.jar" --module com.github.yokra9.moditectSample/com.github.yokra9.moditectSample.Binary

# maven-jar-plugin v3.1.2 以降では configuration.archive.manifest.mainClass を定義していると自動的に ModuleMainClass も設定される
java --module-path "moditect-sample-0.0.1.jar;yokra9-commons-codec-0.0.1.jar" --module com.github.yokra9.moditectSample
```

ということで `com.github.yokra9.moditectSample` を `require` しているソースからしか呼び出せない安全（？）な JAR を作成できました。このようなリパッケージド版 JAR を活用できる場面の一例が、モジュールパス内に同ライブラリの複数バージョンが設置されうるケースです。たとえば、自作ライブラリの依存として `commons-codec` を追加したいとして、そのライブラリのユーザが別バージョンの `commons-codec` を使用したい可能性もあります。このとき、自作ライブラリ側でリパッケージド版を使用しておけばユーザ側は自由にバージョンを選択できます。

さて、モジュール情報がいじれるということは、逆に `exports` されていないパッケージを `exports` させることも可能な訳ですが、こちらはあまりお勧めできません。そもそも外部から利用されないことを前提としたパッケージですから、特に断りなく仕様が変わったり使えなくなったりする可能性があります。あまりアクロバティックな使い方はせず、JAR 地獄を回避する用途にとどめることをお勧めします。

## 参考リンク

* [ModiTect](https://github.com/moditect/moditect)
* [モジュールシステムを学ぶ](https://qiita.com/opengl-8080/items/93c8e0cf58654d5f73cb)
* [sbt-assembly で FAT JAR を生成しようとしたら module-info.class の重複で怒られた話](https://qiita.com/yokra9/items/1e72646623f962ce02ee)
* [Javaのモジュールシステムを理解しよう（その1）](https://news.mynavi.jp/techplus/article/imajava-4/)
* [Automatic Moduleを（続）](https://torutk.hatenablog.jp/entry/20171011/p1)
* [m2eでプロジェクトインポートすると出るエラー "Plugin execution not covered by lifecycle configuration"](https://qiita.com/tkatochin/items/4909d329e62562e76af8)
