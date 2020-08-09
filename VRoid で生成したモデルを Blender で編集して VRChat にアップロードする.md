# VRoid で生成したモデルを Blender で編集して VRChat にアップロードする

VRoid から VRChat にモデルをアップロードする最も簡単な手順は [VRMConverterForVRChat](https://github.com/esperecyan/VRMConverterForVRChat) を利用することです。しかし、ボーンの修正やアクセサリの追加など、Blender での編集が必要とされる場面もあります。本記事は Blender を介したアバターアップロードの手順を記載するものです。

## STEP0: 環境構築

VRChat SDK が対応しているバージョンの Unity [^1] と Blender 2.8 をインストールします。

[^1]: https://docs.vrchat.com/docs/current-unity-version

任意のバージョンの Unity を切り替えながら使用したい場合は、Unity Hub で管理する方法が便利です。

![vrm-blender-0.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/e8ce5066-482e-e3a2-d437-f65d073f9b9a.jpeg)

## STEP1: VRoid からのエクスポート

VRoid から VRM 形式でエクスポートします。このときマテリアル数を削減しておくと後の工程が楽になります。

![vrm-blender-1.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/593b516f-de81-8ff9-a21d-2086bd580cfc.jpeg)

## STEP2: Unity プロジェクトの準備

Unity で新規プロジェクトを作成します。

![vrm-blender-2.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/fed2875f-aaa9-9dcd-5374-8f4c23f992f2.jpeg)

以下の拡張機能を Unity に導入します。

* [VRCHAT SDK2](https://vrchat.com/home/download)
* [UniVRM](https://github.com/vrm-c/UniVRM/releases)

`.unitypackage` 形式のファイルを画面の下部にある Assets 欄へドラッグ&ドロップし、インポートします。

![vrm-blender-3.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/818e8001-a254-38c7-b29d-126d9029c96a.jpeg)

メニューバーに `VRChat SDK` と `VRM` が追加されました。

![vrm-blender-4.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/fe4d35b8-1cc6-743e-4350-bf6524e7f88a.jpeg)

VRM ファイルを画面の下部にある Assets 欄へドラッグ&ドロップし、インポートします。

![vrm-blender-5.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/2fc015ea-7d41-5719-db60-0f69716b0a0b.jpeg)

## STEP3: Blender でモデルを編集する

[VRM_IMPORTER_for_Blender2_8](https://github.com/saturday06/VRM_IMPORTER_for_Blender2_8) を入手します。

アドオンをインストールするには、`編集` - `プリファレンス` - `アドオン` - `インストール` からダウンロードした zip ファイルを選択します。

インストールした直後は有効化されていないので、チェックボックスをクリックしてください。

![vrm-blender-6.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/647da5b6-dc7a-c0ba-3e0e-0c62af2f6ceb.jpeg)

デフォルトで設置されている立方体とカメラ、ライトを削除します。

![vrm-blender-7.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/20515225-c45a-9c34-7211-3830fc0281c4.jpeg)

`ファイル` - `インポート` - `VRM` から VRM ファイルをインポートします。

![vrm-blender-8.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/8d79d3d0-4e7a-b8a9-a958-97fa7a3e4c71.jpeg)

初期状態ではテクスチャは表示されていませんが、`マテリアルプレビューモード`に切り替えることで表示できます。

![vrm-blender-9.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/06bdfd63-c680-4bbd-81bf-5572eb4df34e.jpeg)

続いて、モデルを編集します。たとえばボーンの修正が必要な場合は、Tab キーを押下して編集モードに移り、任意のボーンを選択します。

![vrm-blender-10.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/f78f4f29-4f28-b7c2-20ad-005db6d57ac4.jpeg)

編集が完了したら、ファイルに名前をつけて保存します。このとき、Unity プロジェクト内の Assets フォルダ下に配置することで、Blender で更新したデータを自動的に取り込んでくれるようになります。

![vrm-blender-11.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/003f97e4-0aeb-8028-888c-aa5a2c3b700d.jpeg)

## STEP4: Unity から VRChat へアップロードする

Blender で保存したファイルを確認すると、テクスチャがはがれてしまっています。

![vrm-blender-12.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/62742b74-7902-c099-b47f-6ffe572e6484.jpeg)

インスペクタのマテリアルタブからテクスチャをセットできます。Unity へ VRM をインポートしたときに抽出されたテクスチャを選択しましょう。

![vrm-blender-13.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/81fa6551-0335-aa27-1cc3-3ec82afecebf.jpeg)

Rig タブでアニメーションタイプに Humanoid を指定します。

![vrm-blender-14.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/d6ddc127-693d-0014-6d5a-a03aad95a098.jpeg)

モデルを Hierarchy にドラッグ&ドロップしてシーンに設置します。続いて、インスペクタで `Add Component` から `VRC_Avatar Descriptor` を追加します。

![vrm-blender-15.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/463983a3-79f0-9318-9697-810cfba07030.jpeg)

`View Position` の数値を変更し、ちょうど眉間のあたりに視線が来るように調整します。また、`Default Animation Set` で `female` を選択します。[^2]

[^2]: デフォルトアニメーションの性別を変更できますが、VRoid モデルで `male` を選択すると膝関節が破綻してダブルクロス状態になってしまう事例が報告されています。そのため、男性モデルでも `female` を選択しアニメーションオーバライドで個性を出したほうがよいでしょう。

既存のアバターを更新したい場合は次の手順で VRChat にログインした後、`Pipeline Manager` でアバターの Blueprint ID を attach してください。

![vrm-blender-16.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/f43478cd-1c78-b467-9ecb-6d61e53d63ca.jpeg)

`VRChat SDK` - `Show Control-Panel` からコントロールパネルを表示し、ログインします。`Avatar Creator Status` が `Allowed to publish avatars` でないときは trust level が足りていません。

![vrm-blender-17.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/76f091e6-91cf-44d2-8c9d-c6a36412bab4.jpeg)

`Builder` タブでビルドを実行します。エラーが表示されている場合は `Auto Fix` で修復を試みましょう。

![vrm-blender-18.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/a069c262-7d66-6f45-f7fa-d51e2b8033ef.jpeg)

ビルドが終了すると `Game` タブに切り替わりますので、表記に従って VRChat へアップロードします。

![vrm-blender-19.jpg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/463374/3f60854f-fa63-cb23-31d4-fc5beb15188d.jpeg)

## 参考リンク

* [Setting up the SDK](https://docs.vrchat.com/docs/current-unity-version)
* [VRMからVRChatへアップロードする流れ](https://qiita.com/100/items/7315fe3a7eb75732ae43)
* [Blenderで変更したVRMモデルをUnityで変更反映してVRMファイルを書き出す ②Blenderファイル編](https://styly.cc/ja/tips/blender-vrm-export2/)
