# Amazon Cognito のマネージドログイン画面をクイックに日本語化する

## TL;DR

`react-oidc-context` のサインイン用メソッドで引数を指定するだけです。

```typescript
await auth.signinRedirect({ extraQueryParams: {"lang": "ja"} });
```

## Amazon Cognito のマネージドログイン画面が日本語化できるようになっていた

2024 年 11 月、Amazon Cognito の大規模なアップデートが発表されました。内容は[料金プランの変更](https://aws.amazon.com/jp/about-aws/whats-new/2024/11/new-feature-tiers-essentials-plus-amazon-cognito/)が大きなところですが、[マネージドログイン画面のリニューアル](https://aws.amazon.com/jp/about-aws/whats-new/2024/11/amazon-cognito-managed-login/)等の機能向上も含まれています。リニューアル後のマネージドログイン画面はカスタマイズ性とユーザビリティが大きく向上しており、かつて採用を躊躇した方も再検討する価値がありそうな仕上がりです。

![AWS Blog](https://d2908q01vomqb2.cloudfront.net/da4b9237bacccdf19c0760cab7aec4a8359010b0/2024/11/14/news-2024-cognito-2.3_BrandingDesigner.png) [^1]

[^1]: <https://aws.amazon.com/jp/blogs/aws/improve-your-app-authentication-workflow-with-new-amazon-cognito-features/>

私も「かつて採用を躊躇した」うちの一人なのですが、その理由は文言が日本語化されていないことでした。システムの利用者層にも寄りますが、英語が表示されているだけで怪しく感じてしまう日本語話者は少なくないものです。しかし、新たなマネージドログイン画面では [AWS Management Console で利用可能な全言語に対するローカライゼーションが提供](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html#managed-login-localization)されるようになりました。やったね！

## ローカライゼーション設定は AWS Management Console 上で設定できない

しかし、マネージドログイン画面の設定を探してもローカライゼーションに関する項目は見つけられません。[ドキュメント](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html#managed-login-localization)に記載があるように、クエリパラメータを介して設定する仕組みになっているからです：

```plaintext
https://<カスタムドメイン>/oauth2/authorize?lang=ja&response_type=code&client_id=<アプリケーションクライアントID>&redirect_uri=<リダイレクト先>
```

一度設定すると Cookie に保存されますが、少なくとも初回サインイン時のリクエストにはクエリパラメータを付けてあげる必要がありますね。

## react-oidc-context でも日本語化したい

Quick Setup ガイド内のサンプルコードで案内されている [react-oidc-context](https://github.com/authts/react-oidc-context) でも日本語化したいところですが、いかにもな下記の箇所では設定できません：

```javascript:index.js
const cognitoAuthConfig = {
  authority: "your authority",
  client_id: "your client_id",
  redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "email openid phone",
};
```

その代わり、[サインイン用メソッド](https://authts.github.io/oidc-client-ts/classes/UserManager.html#signinredirect)の引数として `extraQueryParams` を渡すことで、任意のクエリパラメータを付加できるようになっています[2]：

```typescript:OidcClientSettings.ts
/**
 * An object containing additional query string parameters to be including in the authorization request.
 * E.g, when using Azure AD to obtain an access token an additional resource parameter is required. extraQueryParams: `{resource:"some_identifier"}`
*/
extraQueryParams?: Record<string, string | number | boolean>;
```

[2]: <https://github.com/authts/oidc-client-ts/blob/fcb067dc91c180537009edef21c7995a300e20fc/src/OidcClientSettings.ts#L123>

というわけで、下記の箇所を変更してあげることで、クイックにセットアップしたログイン画面をクイックに日本語化できました。よいマネージドログインライフを。

```diff:App.js
- <button onClick={() => auth.signinRedirect()}>Sign in</button>
+ <button onClick={() => auth.signinRedirect({extraQueryParams:{'lang':'ja'}})}>Sign in</button>
```

## 参考リンク

* [authts/react-oidc-context](https://github.com/authts/react-oidc-context)
* [Amazon Cognito 新しい機能ティア Essentials と Plus のお知らせ - AWS](https://aws.amazon.com/jp/about-aws/whats-new/2024/11/new-feature-tiers-essentials-plus-amazon-cognito/)
* [Amazon Cognito がエンドユーザー体験に対する豊富なブランディングをサポートする Managed Login を導入 - AWS](https://aws.amazon.com/jp/about-aws/whats-new/2024/11/amazon-cognito-managed-login/)
* [[アップデート] Amazon Cognito で「マネージドログイン」機能が導入され、ログインメニューのブランディングのカスタマイズが可能となりました | DevelopersIO](https://dev.classmethod.jp/articles/amazon-cognito-managed-login/)
* [Managed login localization - Amazon Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html#managed-login-localization)
* [AWS Cognitoを使ってログイン認証を実装する – SOHOBB AI/BI Advent Calendar 2024 | sohobbオフィシャル](https://www.sohobb.jp/event/aws-cognito-example/)
