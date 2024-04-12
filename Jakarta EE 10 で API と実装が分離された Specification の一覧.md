# Jakarta EE 10 で API と実装が分離された Specification の一覧

2022 年 9 月、[Jakarta EE 10](https://jakarta.ee/release/10/) がリリースされました。

<https://twitter.com/JakartaEE/status/1572933741529661441>

Jakarta EE となって初めての機能追加リリースですが、アプリケーションサーバの EoL 都合で Java / Jakarta EE 8 からジャンプアップを迫られるケースがありそうです。たとえば Red Hat JBoss EAP の場合、Jakarta EE 8 互換の 7.x は Full support が 2023 年 12 月 31 日に終了しています。Maintenance support ends も 2025 年 6 月 30 日に控えており、最近 GA となった 8.x は Jakarta EE 10 互換ですから、デッドラインは近いです。[^1]

||GA|Full support|Maintenance support|ELS-1|ELS-2|
|:----|:----|:----|:----|:----|:----|
|8.x|2024-02-05|2028-02-05|2031-02-05|2033-02-05|2034-02-05|
|7.x|2016-05-01|2023-12-31|2025-06-30|2027-10-31|2030-10-31|

[^1]: <https://access.redhat.com/ja/support/policy/updates/jboss_notes#Life_cycle_dates>

また、Red Hat による OpenJDK 8 サポートは 2026 年 11 月に Full support が終了します。[^2] EAP 7.x は Java SE 8 / 11 が前提ですので、ELS-1 でも実質的にここが潮時でしょう。

[^2]: <https://access.redhat.com/ja/articles/1457743>

だからといって Jakarta EE 10 対応を急いでも、簡単にはコンパイルさえ通らない場合があります。単純に名前空間を置換するだけでは終わらないということですね。本稿ではその具体例として、Jakarta EE 10 から API と実装が分離された Specification を紹介します。これらをライブラリとして使用している場合、実装も依存に追加しなくてはなりません。なお、Jakarta EE 10 から参照実装（Reference Implementations）でなく互換実装（Compatible Implementations）と呼ぶことになっています。

## [Jakarta Activation 2.1](https://jakarta.ee/specifications/activation/2.1/)

互換実装は [Eclipse Angus Activation](https://eclipse-ee4j.github.io/angus-activation/) です（[GitHub](https://github.com/eclipse-ee4j/angus-activation)）。

```xml
<dependency>
    <groupId>org.eclipse.angus</groupId>
    <artifactId>angus-activation</artifactId>
    <version>2.0.2</version>
</dependency>
```

[Eclipse Angus](https://projects.eclipse.org/projects/ee4j.angus) は Jakarta Activation および Jakarta Mail に実装を提供するプロジェクトです。Sun の時代から [JAF (JavaBeans Activation Framework)](https://www.oracle.com/java/technologies/downloads.html) と [JavaMail](https://www.oracle.com/java/technologies/javamail-api.html) はセットでしたから、そのままお引越ししたような形ですね。

## [Jakarta JSON Binding 3.0](https://jakarta.ee/specifications/jsonb/3.0/)

互換実装は [Eclipse Yasson](https://projects.eclipse.org/projects/ee4j.yasson) です（[GitHub](https://github.com/eclipse-ee4j/yasson)）。

```xml
<dependency>
    <groupId>org.eclipse</groupId>
    <artifactId>yasson</artifactId>
    <version>3.0.3</version>
</dependency>
```

Yasson という名前は古代ギリシャ神話の[イアーソーン](https://ja.wikipedia.org/wiki/%E3%82%A4%E3%82%A2%E3%83%BC%E3%82%BD%E3%83%BC%E3%83%B3)（英語ではジェイソンと発音）に由来するそうです[^3]。 JSON-B をもじって [Jason Bourne](https://ja.wikipedia.org/wiki/%E3%82%B8%E3%82%A7%E3%82%A4%E3%82%BD%E3%83%B3%E3%83%BB%E3%83%9C%E3%83%BC%E3%83%B3) と名付けたかったところ、法的な制限のため採用されなかったのだとか。ジェイソン・ボーン、私も好きな映画です。

[^3]: [Dmitry Kornilov氏のブログ](https://dmitrykornilov.net/2016/12/03/introducing-yasson/)

## [Jakarta JSON Processing 2.1](https://jakarta.ee/specifications/jsonp/2.1/)

互換実装は [Eclipse Parsson](https://projects.eclipse.org/projects/ee4j.parsson) です（[GitHub](https://github.com/eclipse-ee4j/parsson)）。

```xml
<dependency>
    <groupId>org.eclipse.parsson</groupId>
    <artifactId>parsson</artifactId>
    <version>1.1.6</version>
</dependency>
```

Parsson という名前の由来は見つけられませんでしたが、[Persson](https://en.wikipedia.org/wiki/Persson)（スウェーデンで一般的な姓）と JSON-P をかけたものでしょうか。

## [Jakarta Mail 2.1](https://jakarta.ee/specifications/mail/2.1/)

互換実装は [Eclipse Angus Mail](https://eclipse-ee4j.github.io/angus-mail/) です（[GitHub](https://github.com/eclipse-ee4j/angus-mail)）。

```xml
<dependency>
    <groupId>org.eclipse.angus</groupId>
    <artifactId>angus-mail</artifactId>
    <version>2.0.3</version>
</dependency>
```

Jakarta EE 10 を利用したい場合は自然と Java SE 11 以上を選択することになります。このとき、[JEP 320](https://openjdk.org/jeps/320) の影響により API および互換実装を依存に追加する必要があるケースで注意が必要です。

## おまけ: [Commons FileUpload 2.0](https://commons.apache.org/proper/commons-fileupload/index.html)

Commons FileUpload を利用している場合、Jakarta Servlet 6.0 に対応するため Commons FileUpload 2.0 への移行が必要となります。詳細は[移行ガイド](https://commons.apache.org/proper/commons-fileupload/migration.html)に従ってください。依存先が `org.apache.commons:commons-fileupload2-jakarta-serverl6` に変更され、`commons-fileupload2-core` にも依存します。

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-fileupload2-jakarta-servlet6</artifactId>
    <version>2.0.0-M2</version>
</dependency>
```

なお、本稿投稿時点で Commons FileUpload 2.0 はマイルストーン 2 (M2)であり、正式版ではないことに注意してください。

## 参考リンク

* [Jakarta® EE | Cloud Native Enterprise Java | Java EE | the Eclipse Foundation | The Eclipse Foundation](https://jakarta.ee/)
* [5年ぶりの本格的なメジャーバージョンアップ「Jakarta EE 10」正式リリース、クラウドネイティブなど対応 － Publickey](https://www.publickey1.jp/blog/22/5jakarta_ee_10.html)
* [Jakarta EE 10 変更内容総まとめ - A Memorandum](https://blog1.mammb.com/entry/2022/07/26/215426)
* [Jakarta EE 10 アップデート | ドクセル](https://www.docswell.com/s/maruTA-bis5/KGV6JK-jakarta-ee-10-updates)
* [Jakarta EE 10 - Feature by Feature - Speaker Deck](https://speakerdeck.com/ivargrimstad/jakarta-ee-10-feature-by-feature)
* [OpenJDK 11 以降で JavaMail が使えない場合の対処法](https://qiita.com/Targityen/items/08d2846c5b6639e805ef)
* [Java 9 で deprecated になったモジュールによる例外発生の問題にちゃんと対処したい - k11i.biz](https://k11i.biz/blog/2018/06/26/maven-artifacts-for-java9-deprecated-modules/)
* [maven - Alpha, Beta, Snapshot, Release, Nightly, Milestone, Release Candidate(RC)... When to use which terminology - Stack Overflow](https://stackoverflow.com/questions/46786486/alpha-beta-snapshot-release-nightly-milestone-release-candidaterc-whe)
