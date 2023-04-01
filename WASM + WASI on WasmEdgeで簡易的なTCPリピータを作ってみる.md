# WASM + WASI on WasmEdge で 簡易的な TCP プロキシを作ってみる with ChatGPT

WebAssembly System Interface (WASI) は WebAssembly (WASM) をブラウザを介さずにホスト上のサンドボックス環境で動作させる仕様です。[「もし WASI が 2008 年に存在していたら、Docker を開発する必要はなかった」とその創業者が言及](https://thinkit.co.jp/article/17486)したり、[Docker Desktop が実行をサポート](https://docs.docker.com/desktop/wasm/)したことは記憶に新しいですよね。高速・軽量かつポータビリティの高い実行環境ということで、現在のコンテナ技術に加わる新たな選択肢として注目されているようです。

中でも [WASI Sockets](https://github.com/WebAssembly/wasi-sockets) によるソケット通信のサポートにより、CLI やプラグインでない本格的なサーバアプリとしても WASM を使えることになります。[^0] 本稿ではその勉強をかねて、WASI で簡易的な TCP プロキシを作ってみることにしました（[レポジトリ](https://github.com/yokra9/wasiter)）。[^1]

[^0]: 単純に WASM でサーバアプリを作りたいだけなら、[Fermyon Spin](https://github.com/fermyon/spin) フレームワークなどを利用することも有用です。

[^1]: 勉強用なので実用に供せられるものではありません。TCP プロキシが必要な場合は [stone](http://www.gcd.org/sengoku/stone/Welcome.ja.html) や ncat など、既成の「いいもの」を使いましょう。

## ごく初歩的な TCP プロキシの作成

[WASI Sockets](https://github.com/WebAssembly/wasi-sockets) は現在 `Phase 1` であり、まだ標準に取り込まれていません。そのため、現時点で実装されている WASI ランタイムは限られます。

[WasmEdge](https://wasmedge.org/) は実装していますが、Windows 版ではまだ実装されていません。[^2]

[^2]: https://github.com/WasmEdge/WasmEdge/issues/1918

```log:wasmedge on windows
thread 'main' panicked at '{ code: 52, kind: Unsupported, message: "Function not implemented" }', src/main.rs:13:10
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
[2023-03-19 10:58:31.029] [error] execution failed: unreachable, Code: 0x89
[2023-03-19 10:58:31.030] [error]     In instruction: unreachable (0x00) , Bytecode offset: 0x000343e4
[2023-03-19 10:58:31.030] [error]     When executing function name: "_start"
```

また、`debian:11` ベースの devContainer で作業していたところ、`wasmedge_wasi_socket::nslookup()` が動作しませんでした。WasmEdge は名前解決に glibc の `getaddrinfo()` を使用しているのですが、これがコンテナ環境では失敗することがあるようです。[^3] `wasmedge/wasmedge` イメージをベースに環境を作り直したところ、動作しました。

[^3]: https://github.com/WasmEdge/WasmEdge/issues/1987

以下は WasmEdge for Linux 上で動作するソースです：

```rust
use std::io::{Read, Write};
use wasmedge_wasi_socket::{Shutdown, TcpListener, TcpStream};

fn main() -> std::io::Result<()> {
    // パラメタを受け取る
    let local = get_required_env("LOCAL");
    let remote = get_required_env("REMOTE");

    // TCP ソケットを作成し、ローカル側のアドレスにバインドする
    let listener = TcpListener::bind(local, false).expect("TCP ソケットを作成できませんでした");

    // クライアントから新しい接続があるたびにストリームを返す
    for stream in listener.incoming() {
        match stream {
            Ok(client) => {
                // プロキシ先のサーバーに接続する
                let server = TcpStream::connect(&remote).expect("プロキシ先のサーバーに接続できませんでした");

                println!(
                    "{} <-> {} // {} <-> {}",
                    client.local_addr().unwrap(),
                    client.peer_addr().unwrap(),
                    server.local_addr().unwrap(),
                    server.peer_addr().unwrap()
                );

                proxy(client, server)?;
            }
            Err(e) => {
                eprintln!("クライアントからの接続を受け入れられませんでした: {}", e);
            }
        }
    }

    return Ok(());
}

fn get_required_env(key: &str) -> String {
    std::env::var(key).expect(&format!("{} が未設定です。", key))
}

fn proxy(mut client: TcpStream, mut server: TcpStream) -> std::io::Result<()> {
    // クライアントからリクエストを受け取る
    let mut request: Vec<u8> = Vec::new();
    loop {
        let mut buf = [0; 1024];
        let bytes_read = client.read(&mut buf).unwrap();
        request.extend_from_slice(&buf[..bytes_read]);

        if bytes_read < 1024 {
            break;
        }
    }

    println!("request :\n{}", std::str::from_utf8(&request).unwrap());

    // プロキシ先のサーバーにリクエストを送信する
    server.write(&request).unwrap();

    // プロキシ先のサーバーからレスポンスを受け取り、クライアントに送信する
    loop {
        let mut response = [0; 1024];
        let bytes_read = server.read(&mut response).unwrap();
        client.write(&response[..bytes_read]).unwrap();

        if bytes_read < 1024 {
            break;
        }
    }

    // ストリームを閉じる
    client.shutdown(Shutdown::Both).unwrap();
    server.shutdown(Shutdown::Both).unwrap();

    Ok(())
}
```

他のランタイムを参照すると、[wasmtime](wasmtime.dev) では明示的にサポートされていません。[^4]

[^4]: https://docs.wasmtime.dev/stability-wasi-proposals-support.html

```log:wasmtime
Error: failed to run main module `target/wasm32-wasi/release/wasiter.wasm`

Caused by:
    0: failed to instantiate "target/wasm32-wasi/release/wasiter.wasm"
    1: unknown import: `wasi_snapshot_preview1::sock_setsockopt` has not been defined
```

一方、[Wasmer](https://wasmer.io/) では [3.0.0-beta.2](https://github.com/wasmerio/wasmer/releases/tag/3.0.0-beta.2) で実装されている[^5] はずなのですが、自分の環境ではうまく動きませんでした。[同様の事例](https://stackoverflow.com/questions/74414498/unknown-import-wasi-snapshot-preview1sock-setsockopt-has-not-been-defined-w)は StackOverflow で見つかりましたが、解決策は見つけられませんでした。[^6]

[^5]: https://github.com/wasmerio/wasmer/pull/3116

[^6]: 単純に `wasmedge_wasi_socket` を利用しているからかな？　とも思ったのですが、エラーメッセージ的には違う気もします。問題にお気づきの方がいらっしゃいましたらコメント等で教えてくださると幸いです。

```log:wasmer
error: failed to run `target/wasm32-wasi/release/wasiter.wasm`
│   1: failed to instantiate WASI module
╰─▶ 2: Error while importing "wasi_snapshot_preview1"."sock_setsockopt": unknown import. Expected Function(FunctionType { params: [I32, I32, I32, I32, I32], results: [I32] })
```

## リアルタイム転送に対応する

TCP プロキシといいつつ、上記のコードでは ncat で生 TCP を触るようなケースでは利用できません。通信の切れ目まで処理を待機しているため、HTTP のように通信の切れ目が明確なプロトコルでしか使えないのです。リアルタイム転送を実現するには、クライアント側とサーバ側で複数のソケットに対して同時に通信する必要があります。このような場合、マルチスレッドや非同期 IO が使えると便利です。

[WASI Threads](https://github.com/WebAssembly/wasi-threads) も現在 `Phase 1` であり、まだ標準に取り込まれていません。実装しているランタイムは wasmtime と Wasmer で、WasmEdge では未サポートです。[^7] しかし、WasmEdge が提供している [Tokio for WebAssembly](https://github.com/WasmEdge/tokio) を利用することで非同期 IO を簡単に実装できます：

[^7]: https://github.com/WasmEdge/WasmEdge/issues/2273

```rust
use tokio::net::{TcpListener, TcpStream};

// WasmEdge はマルチスレッドをサポートしていない
#[tokio::main(flavor = "current_thread")]
async fn main() -> std::io::Result<()> {
    // パラメタを受け取る
    let local = get_required_env("LOCAL");
    let remote = get_required_env("REMOTE");

    // TCP ソケットを作成し、ローカル側のアドレスにバインドする
    let listener = TcpListener::bind(&local)
        .await
        .expect("TCP ソケットを作成できませんでした");

    loop {
        // クライアントからの接続を受け入れる
        let mut client = match listener.accept().await {
            Ok((c, _)) => c,
            Err(e) => {
                eprintln!("クライアントからの接続を受け入れられませんでした: {}", e);
                continue;
            }
        };

        // リモートサーバーに接続する
        let mut server = match TcpStream::connect(&remote).await {
            Ok(s) => s,
            Err(e) => {
                eprintln!("リモートサーバーに接続できませんでした: {}", e);
                continue;
            }
        };

        println!(
            "{} <-> {} // {} <-> {}",
            client.local_addr().unwrap(),
            client.peer_addr().unwrap(),
            server.local_addr().unwrap(),
            server.peer_addr().unwrap()
        );

        // それぞれのストリームから読み取ったデータをリアルタイムで反対側のストリームに書き込む
        let (c2s, s2c) = match tokio::io::copy_bidirectional(&mut client, &mut server).await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("IO エラーが発生しました: {}", e);
                break;
            }
        };

        println!(
            "{} bytes from client to server, {} bytes from server to client\n",
            c2s, s2c
        );
    }

    return Ok(());
}

fn get_required_env(key: &str) -> String {
    std::env::var(key).expect(&format!("{} が未設定です。", key))
}
```

ということで、ランタイム・ライブラリ共々 WasmEdge のおんぶにだっこ状態とはいえリアルタイム転送版もサクっと実装できてしまいました。現在はランタイムやプラットフォーム間で使用できる機能の差異が大きいですが、いずれ `Write Once, Run Anywhere` なアプリケーションを作成したい場合の有力な選択肢となりそうです。

## ポエム : AI との共同作業をした感想

今回のサンプルコードは実験的に ChatGPT (GPT 3.5) との共同作業で作成しています。動作しない箇所や気になるところ（エラーハンドリング・無限ループなど）を手直ししていったので原型はあまり残っていませんが、大本のコードは ChatGPT が生成してくれたものです。ChatGPT に 2021 年までの情報しかなく、またコードベースに特化した学習をしていないのですから、これは驚異的な性能に感じました。[^8]

[^8]: `wasmedge_wasi_socket` と `tokio_wasi` の作りが良く派生元ライブラリと同じ使い勝手だったことも大きいはずですが。また、コードに関する情報はテキストと別枠で学習しているようです。[^9]

[^9]: https://platform.openai.com/docs/model-index-for-researchers/models-referred-to-as-gpt-3-5

また、設計においても ChatGPT との共同作業が有効でした。ChatGPT に「Rust でリアルタイム転送をしたいがスレッドを使用したくない場合はどうすれば良い？」と聞いて Tokio の利用を薦められたことで、`tokio_wasi` の存在に気がつけました。その時の自分が持っていない発想でアドバイスをもらえるのは、人間との共同作業と同じ利点ですね。

ということで、今回の共同作業での主観的な「感想」は以下の通りです[^10]：

[^10]: 巷でよく聞くような内容になってしまっていますが、今この時期に自身が感じ取った内容を残しておくべきである気がしました。

### 人間側には AI の間違いに気が付けるだけの知識・レビュー力が必要になりそう

* AI はいかにも正しそうな話っぷりで嘘を言うことがあって厄介です。ほとんどは正しいことが多いのでますます厄介です。
  * この欠点を補う方式として、アイデア出しやペアプログラミングの相手として接するアプローチは良さそうです。AI の成果物にダメ出しをするという考えだから厄介なのであって、最初から完璧な回答を求めなければ問題になりません。
* 基礎的なコードは AI まかせにできてしまいそうですが、そうすると新人プログラマはどこで経験を積むのでしょうか？　あるいは、人間はコードのことを考えなくても済むようになっていくのでしょうか？
  * 現在の単純な Web アプリ開発において OS やハードを意識する必要はなくなっていますし、そういう側面は少なからずあるでしょう。ただし、性能を求めるとディープダイブが求められる局面もありますから、同様に AI と協働してコードをチューニングできる人間の需要は残りそうです。
* AI を知の高速道路もしくは巨人の肩として機能させるにしても、ある程度人間側にスペックが求められるように感じます。
  * 幼い頃から AI と接して使い方を体得した世代が今後出てくるのであれば、我々も上手く使う方法を学ばなければなりません。

### 情報を深く調べ、複雑な問題を解決するには、人間が引き続き泥臭い作業をする必要がありそう

* New Bing は検索エンジンの代わりに要約を提示してくれますが、逆に必要な情報しか提示してくれないとも言えます。公式ドキュメントや GitHub の Issue 、技術ブログなどから情報をかき集め、一見関係なさそうなものでも試してみるなどのトラブルシューティング作業は相変わらず人間の仕事です。
  * Issue を立てたり記事を執筆したりするのは（深く調査をした）人間の仕事ですし、AI の学習元として使用されるのもインターネット上のドキュメントですから、完全に人間が不要となることはないでしょう。場合によっては必要とされる人数は減ってしまうかしれませんが。
* そもそも出典にない情報まで答えてしまったりするようでは、「泥臭い」作業のサポートとして心もとありません。
  * ただし、これはあくまで現時点での限界でしかない可能性に留意すべきです。ここ 1 年の進歩っぷりを見ていると、部外者が現状だけで未来を予測することは困難です。

### 仕事のペースが今よりも高速になり、認知負荷が高い作業や高度な責任を伴う作業の割合が増えていく可能性もありそう

* 産業革命で人間が楽にはなっておらず、むしろ厳しい環境で労働するようになったという説がありますよね。同様の現象が我々エンジニアを襲う可能性を危惧しています。
  * 単純な労働時間で言うと、法整備が進んで産業革命直後ほど極端な伸びにはなっていませんが、デスクワークによる身体・精神の不調などは現在も続く問題です。AI も同様に、短期・長期の両面で影響があるでしょう。
* 以下は [Salesforce のイノベーション戦略担当シニアバイスプレジデントが ZDNet に語った内容](https://japan.zdnet.com/article/35200483/) からの引用です：
  > 書類の書式の記入や、契約の評価や、予想や、資材の発注や、すでに述べてきたような仕事はどれも数学的な問題であり、AIが得意とするものです。その延長線上には、2つのシナリオしか残されていません。人間の従業員に残される選択肢は、AIやロボットを作る費用が惜しいような些細な仕事をするか、答えが1つではないような非常に複雑な課題に常にさらされる知識労働者になるかのどちらかです。
  > AIの導入を注意深く進めない限り、未来の労働者は、低賃金で退屈な仕事をするか、報酬は高いがストレスも高い仕事をするかのどちらかになります。従って、AIがある未来で人間の尊厳と幸福を生み出すにはどうしたらいいかを考える必要があります。
  > このまま行けば、職場における人間の役割はどうなるでしょうか。おそらく、はっきりした解決策がない状況に対するハイレベルな分析が必要とされる複雑な作業に、多くの時間を費やすことになるでしょう。そうなれば、不安や疲労を抱えることになります。
  * IT 業界は精神的な問題を抱える人が多いとされますが、AI との共存はエンジニアを幸せにするものなのでしょうか？　それとも、さらにストレスを与え不幸せにするものなのでしょうか？

### 現段階の AI により IT 業界における「エンジニアリング」の仕事は無くならなさそう

* （完全に感覚および周囲の人間をサンプルとした話になってしまうのですが）現在 ChatGPT で遊んでいるようなエンジニアの皆さんが入力するプロンプトは十分「的確な指示」になっているように見えます。一方で、AI というか IT に興味がない人に ChatGPT を渡してみても、良い回答を得られないケースを目にしています。
  * これは、（SEOによって陳腐化する以前の）検索エンジンから的確な結果を得るのに一種のスキルが必要だった状況と似ています。この点において、AI がコーディングそのものを行えるようにまでなったとしても、「機械に命令と入力を与えて出力を得る」というエンジニアの仕事は特殊技能であり続けるでしょう。
  * エンジニアリングで食べていける人間の数がどう増減するかは不明ですが、AI 自体が市場を拡大すれば付随して必要とされる人間の数は変わらない可能性もあります。

## 参考リンク

* [WasmEdge](https://wasmedge.org/)
* [WasmEdge WASI Socket](https://github.com/second-state/wasmedge_wasi_socket)
* [wasmtime](https://wasmtime.dev)
* [WASI Proposals Support](https://docs.wasmtime.dev/stability-wasi-proposals-support.html)
* [Wasmer](https://wasmer.io/)
* [WasmEdge でサーバープログラム](https://qiita.com/watawuwu/items/91052a93484d19d4fb1f)
* [[Windows] Review the WASI Host API #1918](https://github.com/WasmEdge/WasmEdge/issues/1918)
* [Can not connect k8s service when using xxx.yyy.svc.cluster.local in container. #1987](https://github.com/WasmEdge/WasmEdge/issues/1987)
* [TCPのストリーム通信の切れ目・区切りについて](https://qiita.com/Gin/items/620f4a7bec246004ee89)
* [Tokio for WebAssembly](https://github.com/WasmEdge/tokio)
* [Announcing wasi-threads](https://bytecodealliance.org/articles/wasi-threads)
* [feat: Support the wasi-threads proposal](https://github.com/WasmEdge/WasmEdge/issues/2273)
* [海外コメンタリー -- 生成型AIは企業をどう変えるのか](https://japan.zdnet.com/article/35200483/)
  * [ZDNet.com の原文](https://www.zdnet.com/article/generative-ai/)
* [GPT-4との新たな開発体験: AIとペアプロを極める](https://zenn.dev/okunokentaro/articles/01gvcmft5t9dc21nb0gc43c64a)
