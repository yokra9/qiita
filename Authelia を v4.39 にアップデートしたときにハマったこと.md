# Authelia を v4.39 にアップデートしたときにハマったこと

[Authelia](https://github.com/authelia/authelia) はオープンソースの認証・認可サーバー兼 Web ポータルです。非常に軽量かつ多機能で Docker イメージも用意されていることから、 ローカル環境上に OIDC の IdP(Identity Provider) を立てたいときの有力な選択肢となり得ます。

さて、Authelia の最新メジャーバージョンは 2025 年 3 月 16 日にリリースされた v4.39 です。v4.38 は 2024 年 3 月 14 日にリリースされましたので、きっかり 1 年ぶりのメジャーバージョンアップとなります。OIDC IdP 機能は [Beta 7](https://www.authelia.com/roadmap/active/openid-connect-1.0-provider/#beta-7) に到達し、GA までもう一踏ん張りといったところでしょうか。

さて、このアップデートを適用したところ、JWT のペイロードに含まれていた以下の情報が消えてしまいました：

* `client_id`
* `email`
* `email_verified`
* `name`
* `preferred_username`

```json:v4.38.9
{                     
  "amr": ["pwd"],
  "aud": ["test_client"],
  "auth_time": 1746866065,
  "azp": "test_client",
  "client_id": "test_client",
  "email": "user1@example.com",
  "email_verified": true,
  "exp": 1746869668,
  "iat": 1746866068,
  "iss": "http://127.0.0.1:9091",
  "jti": "3c55ee67-7274-41e2-b57d-c3302b482787",
  "name": "User 1",
  "nonce": "fGyBVZ5A2eH2DwVLKATtrb",
  "preferred_username": "user1",
  "sub": "bc5bfc78-4831-4725-936d-9e158e14d6da"
}
```

```json:v4.39.1
{ 
  "amr": ["pwd", "kba"],
  "aud": ["test_client"],
  "auth_time": 1746866147,
  "azp": "test_client",
  "exp": 1746869749,
  "iat": 1746866149,
  "iss": "http://127.0.0.1:9091",
  "jti": "2927bc89-6d9e-4e5c-852f-6f6fa65e8fd6",
  "nonce": "kYxdfK8KW7XP5NgZL2jLVi",
  "rat": 1746866141,
  "sub": "bc5bfc78-4831-4725-936d-9e158e14d6da"
}
```

なお、クライアント側の要求するスコープは `openid,profile,email` から変えていません。

## Authelia はデフォルトで OIDC 1.0 仕様の標準的なクレームを反映するようになっていた

原因は [4.39: Release Notes](https://www.authelia.com/blog/4.39-release-notes/#id-token-changes) にしっかりと記載されていました：

> IDトークンの変更  
> IDトークンのデフォルトのクレームは、仕様の標準的なクレームを反映するようになりました。これはセキュリティを向上させ、プライバシーを改善し、追加のクレームを要求する正しい手段であるクレーム認可パラメータを適切にサポートするための取り組みです。これは一部のクライアントに予期せぬ影響を与える可能性がありますが、この問題のワークアラウンドを記載しています。（DeepL 訳を元に修正）

[OIDC 1.0 仕様](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#IDToken)で定められている標準的なクレームのみを反映するよう変更したということですね。仕様では以下のクレームを標準として定めており、他のクレームは「含んでもよい」という扱いです。

* 必須
  * `iss` : 発行者
  * `sub` : 用途
  * `aud` : 想定利用者のリスト（Relying Party の OAuth 2.0 Client ID）
  * `exp` : 有効期限
  * `iat` : 発行時刻
* 条件付き
  * `auth_time` : End-User の認証が発生した時刻
  * `nonce` : Client セッションと ID Token を紐づける文字列値
* 任意
  * `acr` : Authentication Context Class Reference
  * `amr` : 認証時に用いられた認証方式を示す識別子文字列の JSON 配列
  * `azp` : ID Token 発行対象（受け取り手の OAuth 2.0 Client ID）

[ワークアラウンド](https://www.authelia.com/integration/openid-connect/openid-connect-1.0-claims/#restore-functionality-prior-to-claims-parameter)では以下の説明と、設定例が示されています：

> claims パラメータの導入により、ID トークンからほとんどのクレームが削除され、プライバシーとパフォーマンスを向上させるために仕様で要求されているクレームのみが残されました。これは、ほとんどまたはすべてのクレームを含む必要がある UserInfo Endpoint へのリクエストを行わない一部の Relying Party にとっては機能しない可能性があり、さらにそれらは claims パラメータをサポートしない可能性があります。クレーム取得のために Relying Party が UserInfo Endpoint をサポートできるかどうか調査することを推奨しますが、保守が終了したプロジェクトや、このようなことに取り組む十分な時間を持つ開発者がいないプロジェクトのために、すべての状況で完全に可能というわけではありません。  
> 以下の例は、そのようなクライアントの動作を復元するクレームポリシーです。ユーザは希望に応じて、これを独自に拡張することができます。この例では、claims_policy オプションを使用してこのポリシーをクライアントに適用する方法も示しています。この例では、以前 ID トークン内に誤って存在したクレームをすべて復元しています。ユーザは必要なクレームを正確に確認し、必要に応じてこの例を修正して、それらのクレームのみを含めることを推奨します。  
> 実装者は、UserInfo エンドポイントからそれらを取得するためにアクセストークンを使用することで、一般的に ID トークンに含まれることが意図されていない余分なクレームを取得するための標準的なプロセスを使用することを強く推奨します。このプロセスは著しく安定していると考えられ、将来の保証の基礎を形成します。このオプションは緊急回避策としてのみ存在し、ベストエフォートベースでのみ提供されます。（DeepL 訳を元に修正）

```yaml
identity_providers:
  oidc:
    claims_policies:
      ## 'default' クレームポリシーを作成する
      default:
        id_token: ['rat', 'groups', 'email', 'email_verified', 'alt_emails', 'preferred_username', 'name']
    clients:
      - client_id: 'client_example_id'
        ## 'default' クレームポリシーをこのクライアントに割り当てる
        claims_policy: 'default'
```

「このオプションは緊急回避策としてのみ存在し、ベストエフォートベースでのみ提供されます」とありますので、クライアント側に [/userinfo](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#UserInfo) からユーザ情報を取得する改修を加えるべきでしょう。

ですが、現実には緊急回避策を適用しなければならない状況も存在します。そこで実際にこの設定を適用してみると、次のエラーが発生して起動に失敗します。回避失敗です。

```log
time="2025-05-10T08:44:02Z"
level=error
msg="Configuration: identity_providers: oidc: claims_policies: default: id_token: claim with name 'rat' can't be used in a claims policy as it's a standard claim"
stack="github.com/authelia/authelia/v4/internal/commands/context.go:157
       NewRootCmd.(*CmdCtx).ChainRunE.func1\ngithub.com/spf13/cobra@v1.9.1/command.go:1000
       (*Command).execute\ngithub.com/spf13/cobra@v1.9.1/command.go:1148
       (*Command).ExecuteC\ngithub.com/spf13/cobra@v1.9.1/command.go:1071
       (*Command).Execute\ngithub.com/authelia/authelia/v4/cmd/authelia/main.go:10
       main\ninternal/runtime/atomic/types.go:194
       (*Uint32).Load\nruntime/asm_amd64.s:1700
       goexit"
```

## v4.39.1 までは `rat` をクレームポリシーに追加すると起動に失敗する

エラーメッセージは「`rat` クレームは標準クレームに含まれてるのでクレームポリシーで指定できないよ」と言っています。素直に従い、ワークアラウンドの設定例から `rat` を除くと起動に成功します：

```diff
-        id_token: ['rat', 'groups', 'email', 'email_verified', 'alt_emails', 'preferred_username', 'name']
+        id_token: ['groups', 'email', 'email_verified', 'alt_emails', 'preferred_username', 'name']
```

```json:v4.39.1
{
  "amr": ["pwd", "kba"],
  "aud": ["test_client"],
  "auth_time": 1746866892,
  "azp": "test_client",
  "email": "user1@example.com",
  "email_verified": true,
  "exp": 1746870494,
  "iat": 1746866894,
  "iss": "http://127.0.0.1:9091",
  "jti": "f6093efa-493b-403e-8522-80416e614970",
  "name": "User 1",
  "nonce": "6nWanboag3qWFoNCuRJL3Z",
  "preferred_username": "user1",
  "rat": 1746866886,
  "sub": "bc5bfc78-4831-4725-936d-9e158e14d6da"
}
```

`rat` は OIDC 標準でもなければ、[JWT 仕様上の標準クレーム（`email` や `name` 等）](https://openid-foundation-japan.github.io/openid-connect-core-1_0.ja.html#StandardClaims)、[IANA に登録されたクレーム](https://www.iana.org/assignments/jwt/jwt.xhtml) にも該当しないので、<del>設定例が正しくない可能性もありますね。</del>

## v4.39.2 では `rat` をクレームポリシーに追加しても起動に失敗しない

…という記事を投稿しようとしていたちょうどその日（2025 年 5 月 10 日）、[v4.39.2](https://github.com/authelia/authelia/releases/tag/v4.39.2) がリリースされました。このバージョンでは、設定例をそのまま適用しても起動に成功します。JWT のペイロードは以下のようになっていました：

```json
{
  "amr": ["pwd", "kba"],
  "aud": ["test_client"],
  "auth_time": 1746886818,
  "azp": "test_client",
  "email": "user1@example.com",
  "email_verified": true,
  "exp": 1746890420,
  "iat": 1746886820,
  "iss": "http://127.0.0.1:9091",
  "jti": "8048e3f7-74c6-4d11-a3b0-eafef3d44f73",
  "name": "User 1",
  "nonce": "GP8grkG5QvoAZvVwZBYRzR",
  "preferred_username": "user1",
  "sub": "6a9f96b1-d4de-4695-b279-1b6203693a4f",
  "updated_at": 1746886820
}
```

というわけでせっかく書いた記事はそのまま公開しておきますが、類似の事象にハマった人はこの記事の内容を忘れて v4.39.2 以降にアップデートしてください（トホホ）。

## 参考リンク

* [4.39: Release Notes | Blog | Authelia](https://www.authelia.com/blog/4.39-release-notes/)
* [OpenID Connect 1.0 Claims | Integration | Authelia](https://www.authelia.com/integration/openid-connect/openid-connect-1.0-claims/#restore-functionality-prior-to-claims-parameter)
* [Autheliaでローカル開発用のOIDC環境を簡単に構築してみた](https://qiita.com/ssc-ynakamura/items/76f6fd753e295301f385)
* [JSON Web Token（JWT）のClaimについて · なるはやで いい感じの 動作確認](https://kamichidu.github.io/post/2017/01/24-about-json-web-token/)
