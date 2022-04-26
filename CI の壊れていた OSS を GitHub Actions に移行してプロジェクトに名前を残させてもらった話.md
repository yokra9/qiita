# CI の壊れていた OSS を GitHub Actions に移行してプロジェクトに名前を残させてもらった話

私はいくつかの自作ツールを GitHub で公開したり、稀に PR を出したりしている程度のしがないエンジニアです。今回、他の方が公開している OSS のコントリビューター・コラボレータとなり、プロジェクト中に名前を残させてもらうという貴重な経験をさせてもらいましたので、記録としてポエムを残します。

## 2021年9月中ごろ

わけもなく[^1] Log4j 1.x のドキュメントを読んでいたところ、 `NTEventLogAppender` という Appender があり、Windows のイベントログに出力できることを知りました。

[^1]: 当時はまだLog4Shellが明るみになっておらず、Log4jは特にホットな話題ではありませんでした。

しかし Log4j 2.x には `NTEventLogAppender` に相当するものが存在しないため、デフォルトでは Windows のイベントログに出力できません。代替手段として、[Log4JNA](https://github.com/dblock/log4jna/) というライブラリを見つけました。Log4j と [JNA](https://github.com/java-native-access/jna) をかけた名前が面白く、私は興味を惹かれました。

ドキュメントを読んでいるうちに、typo とリンク切れ（MinGW のプロジェクトページが <http://www.mingw.org/> から <https://mingw.osdn.io/> に移動していました）に気が付きました。[直近でクローズされた PR も typo の指摘だった](https://github.com/dblock/log4jna/pull/44)ことから、私も PR を作成することにしました。

## 2021-09-28

[typo とリンク切れを修正する PR](https://github.com/dblock/log4jna/pull/45) を投げました。すると、当日中（US 時間）にマージされ、オーナーである [Daniel "dB." Doubrovkine (@dblock)](https://github.com/dblock) さんから以下の返信がありました：

> Not sure what's up with CI. If you're using this project, any help is appreciated.

CI が上手く動作していないようなので、助けてほしいということでした。即マージ＆即レスで承認欲求が満たされていた私は、喜び勇んで👍ボタンを押しました。

## 2021-09-29

Log4JNA の CI は、[AppVeyor](https://www.appveyor.com/) というサービスでホストされていました。Windows のイベントログに出力するという特質上、Windows を利用してビルド・テストする必要があったからです。

AppVeyor のマニフェストファイルを確認すると、以下の問題がありました：

* OS を指定するための文法が変わっていた
* Maven のダウンロードリンクが壊れていた

私は[それらを修正する PR](https://github.com/dblock/log4jna/pull/46) を作成し、やはりその日のうちにマージされました。さらに、dB. さんから以下の返信がありました：

> Do you want to come help out make a 2.0 release off what we have here on master and maybe take a look at existing issues, @yokra9?  
> We have pretty thorough docs on releasing to maven and such, but I haven't done it in a long time, you lmk if you need anything like access and how I can grant that.

既存の Issue を解決したり、次期リリース[^2]を出したりするのを手伝いたいか？　というのです。実は dB. さんは [OpenSearch](https://github.com/opensearch-project) のメンテナであり、他にもスターが数千クラスの OSS を抱える多忙な方なのでした。利用者の少ない Log4JNA は長らく放置状態にあるようでした。かくして私はコラボレータとしてインビテーションをもらい、次期リリースに向けた作業を手伝うことになりました。

[^2]: 実はすでに2.0はすでにリリース済みで、次期リリースは2.1でした。

## 2021-10-05 ～ 2021-10-08

[v2.1 リリースに向けた ToDo リスト](https://github.com/dblock/log4jna/issues/47)を作成し、作業を開始しました。まずはリリースに向けて実施すべき内容が知りたかったので、リポジトリ内のリリースに関するドキュメントに目を通しました。そこには、AppVeyor を通じてリリース作業が半自動化されている旨が記載されていました。

AppVeyor のマニフェストファイルは 3 種類ありました：

* JUnit で自動テストをかけるための `Default`
* OSSRH にスナップショットをデプロイするための `Deploy`
* Maven セントラルにリリースするための `Release`

これらのマニフェストは [Claudio Trajtenberg (@claudiow)](https://github.com/claudiow) さんが作成したものであり、dB. さんは詳しいことを覚えていませんでした。後に分かりますが、Claudio さんは 2020 年に他界されており、我々は連絡を取ることができませんでした。

まずは `Deploy` の動きを確認することにしました。ドキュメントによると `Deploy` はナイトリービルドをしているとのことでしたが、OSSRH にそれらしき形跡は確認できません。

仕方がないので `Release` を確認すると、こちらは AppVeyor から手動でキックするようでした。しかし、該当の AppVeyor プロジェクトを見つけられません。dB. さんに尋ねると、Claudio さんのプライベートプロジェクトとなっており、dB. さんもアクセスできないとのことでした。仕方がないので、我々は新しくリリース用プロジェクトを立ち上げることにしました。

## 2021-10-09 ～ 2021-12-06

AppVeyor はアカウントごとに暗号化されたシークレットを使用できました。加えて、[secure-file](https://www.appveyor.com/docs/how-to/secure-files/) という暗号化ツールが提供されており、GPG キーや `settings.xml` といった秘匿したい情報を安全にリポジトリに格納できました。

新しいプロジェクトは dB. さんのアカウントで作成したため、シークレットの再登録にあたりメールボックスをひっくり返してもらったり、`secure-file` で暗号化されたファイルを復号化と再暗号化したりする必要がありました。加えて、[フォークレポジトリからの PRではシークレットが使用できない](https://help.appveyor.com/discussions/questions/2615-secure-variables-for-pull-request#comment_41358480)という AppVeyor の仕様に気づかず、なかなか手間取りました。

コラボレータ権限をもらっていたので、[メインリポジトリに直接 PR を作成できました](https://github.com/dblock/log4jna/pull/49)が、今度はアーティファクトの署名に利用する GnuPG 周りで問題が多発しました：

* GnuPG for Windows がキーのインポート時にパスフレーズを求めるため CI が失敗する
  * `gpg --batch --passphrase <パスフレーズ> --import <キーファイル>` とすることで解決しました。
* `maven-gpg-plugin` が `gpg: can't connect to the agent: IPC connect call failed` で失敗する
  * ネット上にある様々な解決法を試しましたが、解決しませんでした。
* 代わりに Git for Windows (MSYS2) の GnuPG を使用しようとしたが、`maven-gpg-plugin` との連携が上手く動作しない

そうこうしているうちに2カ月ほどが経過しており、私の知識量と解決能力では対応不可能かのように思われました。OSS ですから他の人に助けてもらえることもあるだろうと思い、現在詰まっている点を PR に書き残してプロジェクトから離れることにしました。

## 2022-01-07

[ToDo のうちのひとつを解決する PR](https://github.com/dblock/log4jna/pull/50) を [shamus13](https://github.com/shamus13) さんが作成しました。この PR は `Default` マニフェストの CI を通過していたため、dB. さんから「CI に関する PR もクローズ可能か？」という確認がありました。しかし `Release` および `Deploy` マニフェストが動作しない問題は解決していなかったので、その旨を回答しました。

## 2022-02-16 ～ 2022-02-19

さらに1カ月ほど経過しましたが、投げっぱなしとなってしまうのは嫌な気持ちがありました。そこで、私は思い切って [AppVeyor から GitHub Actions への移行を提案しました。](https://github.com/dblock/log4jna/pull/49#issuecomment-1041527474)

GitHub Actions の `Windows Server 2019` ランナーは Log4JNA の CI に必要な以下の要素を揃えることができます[^3]：

[^3]: https://github.com/actions/virtual-environments/blob/main/images/win/Windows2019-Readme.md

* [GnuPG(MSYS2)](https://packages.msys2.org/base/gnupg)
* [Developer Command Prompt for Microsoft Visual C++](https://github.com/marketplace/actions/enable-developer-command-prompt)
* [Maven および JDK](https://github.com/marketplace/actions/setup-java-jdk)

マニフェストは作り直すことになりますが、モダンな CI 環境を整備する良い契機になると考えました。事前に[サンプルプロジェクト](https://github.com/yokra9/log4jna_sample/actions/runs/1853174209)を用意し、提案の材料としました。

> Yes, please! That would be amazing.

という返答がもらえたので、早速 `Default` マニフェストを GitHub Actions に移植し、満足に動くことを確認しました。ついでに (Java SE 8 / 11 / 17) x (Eclipse Temurin / Microsoft Build of OpenJDK) のマトリックスでテストをするよう改良しました。

続いて `Deploy` マニフェストに必要な OSSRH のパスワードを確認するため Claudio さんに連絡して返答を待つことになりました[^4]。

[^4]: ちなみにこの間、dB. さんは別の OSS で [Travis CI から GitHub Actions に移行する](https://github.com/slack-ruby/slack-ruby-bot-server/pull/142)作業をしていたようです。もしかしたら自分の活動が間接的に影響を与えたのかもしれないと思い、嬉しくなりました。

## 2022-04-02 ～ 2022-04-18

dB. さんが [Sonatype の Community Support に連絡をとり](https://issues.sonatype.org/browse/OSSRH-79529)、パスワードをリセットしました。また、Claudio さんが既に亡くなっているとの情報が届きました。私は Log4JNA について調査する中で、Claudio さんのコミットやコメントなどを頻繁に見かけていたので、直接のやり取りこそないものの非常に悲しい気持ちになりました。

私は `Deploy` と `Release` のマニフェストを作成し、マージしてもらいました。また、以下のコメントを頂きました。

> And huge thanks for hanging in here and helping with this!

GitHub Actions 移行のための作業だけでなく、無駄に終わった2カ月にも価値が生まれたように感じ、とても嬉しくなりました。そして、これは憧れていた「OSS に貢献してプロジェクトのどこかに名前を載せてもらう」という希望を叶えるまたとない機会と考え、ダメ元で打診してみました。結果はタイトルの通りです。

## その後

* [GitHub Pages](http://dblock.github.io/log4jna/) へのデプロイを [GitHub Actions で自動化](https://github.com/dblock/log4jna/issues/40#issuecomment-1101478356)
* [dependabot で依存のアップデートを自動生成](https://github.com/dblock/log4jna/pull/57)

などの寄り道をしつつ、v2.1 リリースに向け作業を続けています。

## まとめ・学び

OSS 開発の経験が豊富な方と事実上1対1で活動できたのは、未熟な私にとって大変刺激的な経験でした。これまでは自分用のツールを OSS として公開している程度だったので、しっかりとコミュニケーションを取りつつ作業を進められたのは良い学びになったと感じます。

技術的な観点においては、GnuPG に関する問題を根本的に解決こそできませんでしたが、その過程でこれまで知らなかった署名に関する種々の知識が身に付きました。また、ある程度試してダメだったら方針転換が課題解決に繋がることもある、という学びも得られました。

また、GitHub には [Successor （後継者）を指名する機能](https://docs.github.com/ja/account-and-profile/setting-up-and-managing-your-github-user-account/managing-access-to-your-personal-repositories/maintaining-ownership-continuity-of-your-user-accounts-repositories)があることを知りました。

> 指名された後継者は、死亡証明書の提出から 7 日間経ってから、または死亡記事が掲載されてから 21 日間経ってから、あなたのパブリックリポジトリを管理できるようになります。

もしこの記事を読んでいる方が重要なリポジトリの所有者である場合は、ぜひ Successor の指名を検討してください。

副次的な作用として、Grammerly と DeepL の使い方が上手くなりました。これまでは英語でのコミュニケーションを怖がって「PR と簡単な説明を送って終わり！」というスタイルが多かったのですが、今回の取り組みでは必要とされたので自然と鍛えられました。Grammerly は文法エラーを正してくれる「賢いコンパイラ」、DeepL は一種の「自動テスト」と捉えるとコーディング感覚で英文が書けるので作文体験が良かったです。
