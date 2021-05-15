# GitHub の Git LFS 無料枠をうまくやりくりする方法

[Git Large File Storage (LFS)](https://git-lfs.github.com/) とは、リポジトリ内の巨大なファイルをテキスト形式のポインタに置き換えつつ、実体をリポジトリ外のファイル置き場に逃がす仕組みです。

![a diagram showing how Git LFS works](https://git-lfs.github.com/images/graphic.gif)[^1]

[^1]: https://git-lfs.github.com/

Git は比較的小さなファイル（ソースコード等）を格納することを主眼に置いているため、リポジトリホスティングサービスによってはファイルサイズの上限が設定されていることがあります。例えば GitHub の場合、プッシュしたファイルサイズが 50MB より大きいと警告が表示され、 100MB を超えるとブロックされます。[^2] 巨大ファイルをコミットと関連付けてバージョニングしたい場合、ホスティングサービスが LFS をサポートしているか確認してみましょう。

[^2]: https://docs.github.com/ja/github/managing-large-files/conditions-for-large-files

幸い、GitHub は LFS をサポートしています。[^3] 無料アカウントの場合ストレージの上限は 1GB で、不足分は購入する必要があります。[^4] 素直に必要経費として払えば良い話なのですが、過去にコミットした巨大ファイルが無駄にストレージを食べているなど、お掃除してうまくやりくりしたい時もあるでしょう。本記事では過去にコミットした巨大ファイルを歴史から抹消する方法と、それを利用してストレージを節約する方法をご紹介します。

[^3]: https://docs.github.com/ja/github/managing-large-files/about-git-large-file-storage
[^4]: https://docs.github.com/ja/github/managing-large-files/about-storage-and-bandwidth-usage

## 過去のコミットから不要なファイルを削除する

**歴史を改ざんする危険な処理なので事前にブランチを切って実験することをお勧めします。**

GitHub 公式ドキュメントの [機密データをリポジトリから削除する](https://docs.github.com/ja/github/authenticating-to-github/removing-sensitive-data-from-a-repository) で紹介されている方法を利用します。

```bash
git filter-branch --force --index-filter \
 "git rm --cached --ignore-unmatch <不要なファイルへのパス>" \
  --prune-empty --tag-name-filter cat -- --all
```

`filter-branch` は任意の「フィルタ」処理を指定して過去のコミットを書き換えます。各引数の意味は以下の通りです[^5]：

[^5]: https://git-scm.com/docs/git-filter-branch

* `--force`
  * 一時ディレクトリで実行している場合等を除き、`--force` オプションを指定しなければ実行できないようになっています。
* `--index-filter <コマンド>`
  * インデックスに対するフィルタ処理を指定します。[^6]
  * 今回の場合、指定したファイルをコミット対象から除外しています。
* `--prune-empty`
  * フィルタ処理の結果「空コミット」になったコミットを削除します。
* `--tag-name-filter <コマンド>`
  * タグ名を書き換えます。
  * 今回の場合、タグ名はそのまま、タグが書き換え後のコミットを指すように書き換えます。
* `-- <rev-listオプション>`
  * 内部的に呼び出される `git rev-list` への引数です。
  * 今回の場合、全コミットに対して処理を行います。

[^6]: インデックスを直接操作するオプションを利用しているのは、チェックアウトしてからワークツリーを操作する`--tree-filter`オプションよりも高速に動作するためです。

リポジトリの規模にもよりますが、`filter-branch` の実行にはそれなりに時間とマシンパワーを必要とします。コーヒーでも入れて気長に待ちましょう。

## GitHub リポジトリを移行してストレージを開放する

さて、ブランチから忌まわしき巨大ファイルを抹消できました。しかし、この状態でリポジトリにフォースプッシュしても LFS のストレージ消費は減りません。過去のコミットからポインタが抹消されたに過ぎず、LFS サーバ上の実体はリポジトリが削除されるまで保持されるからです。[^7] そのため現行リポジトリを削除して、新リポジトリへ移行する必要があります。

[^7]: https://docs.github.com/ja/github/managing-large-files/removing-files-from-git-large-file-storage

```bash
git remote add <新リポジトリ>
git push <新リポジトリ> <ブランチ名>
```

ここまでの作業を移行したいブランチの数だけ繰り返します。また、移行したいタグがあれば、それらもプッシュします。なお一度にプッシュするサイズが大きすぎると、以下のようなエラーになる可能性があります：

```text
RPC failed; curl 92 HTTP/2 stream 0 was not closed cleanly: PROTOCOL_ERROR (err 8)
```

そのような場合は、一時ブランチを作成し、過去から遡るように少しずつチェックアウト＆プッシュすることで回避できます。そして最後に、旧リポジトリをGitHub上から削除すればお掃除は完了です！

## 参考リンク

* [How to delete a file tracked by git-lfs and release the storage quota?](https://stackoverflow.com/questions/34579211/how-to-delete-a-file-tracked-by-git-lfs-and-release-the-storage-quota)
* [Git Large File Storage (LFS)](https://git-lfs.github.com/)
* [機密データをリポジトリから削除する](https://docs.github.com/ja/github/authenticating-to-github/removing-sensitive-data-from-a-repository)
* [filter-branch](https://git-scm.com/docs/git-filter-branch)
