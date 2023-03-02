# Windows ローカルの Git リポジトリと WSL2 上の Git リポジトリをお互いにリモートとして登録する

WSL2 は WSL1 と比較して Linux との互換性が向上している半面、ファイルシステム間でのパフォーマンスには優れていません[^1]。そのため、以下のパターンでは動作が遅くなってしまい、開発者体験がよくありません：

[^1]: https://learn.microsoft.com/ja-jp/windows/wsl/compare-versions

* Windows ローカル上にある Git リポジトリを WSL2 上のアプリケーションで操作する
* WSL2 上にある Git リポジトリを Windows 上のアプリケーションで操作する

従って、 Windows ローカルと WSL2 上のそれぞれに Git リポジトリを作成し、独立して運用することが望まれます。しかし、社内リポジトリとの通信に WSL2 との相性が悪い VPN クライアントを必須とする場合など、WSL2 上の Git リポジトリ運用が難しいケースもあります。そんなときは、Git の分散バージョン管理システムとしての利点を活用し、お互いをリモートとして登録してみましょう。

## Git のリモートとしてファイルシステム上のリポジトリを登録する

Git のリモートとして登録できる URL の形式はサポートされているプロトコルにより異なります：

* Git
  * `git://host.xz[:port]/path/to/repo.git/`
  * `git://host.xz[:port]/~[user]/path/to/repo.git/`
* HTTP / HTTPS
  * `http[s]://host.xz[:port]/path/to/repo.git/`
  * `ftp[s]://host.xz[:port]/path/to/repo.git/`
* SSH
  * `ssh://[user@]host.xz[:port]/path/to/repo.git/`
  * `ssh://[user@]host.xz[:port]/~[user]/path/to/repo.git/`
  * `[user@]host.xz:path/to/repo.git/`
  * `[user@]host.xz:/~[user]/path/to/repo.git/`
* ファイルシステム
  * `/path/to/repo.git/`
  * `file:///path/to/repo.git/`

Git プロトコルや HTTP / HTTPS 、SSH を通じたリモートホスト上のリポジトリだけではなく、ファイルシステム上のローカルリポジトリもリモートとして登録できます。ローカルリポジトリをリモートとして登録することは GitHub や GitLab が普及した現代ではそう多くないと思われますが、今回はこちらを利用します。

## WSL2 上の Git リポジトリに Windows ローカルの Git リポジトリをリモートとして登録する

まずは WSL2 上の Git リポジトリに Windows ローカルの Git リポジトリをリモートとして登録する方法です。Windows の `C:\path\to\windows\repo` は WSL2 上で `/mnt/c/path/to/windows/repo` にあるように見えますので、以下の通りになります：

```bash
# Windows の C:\path\to\windows\repo にリポジトリがある場合
git remote add windows /mnt/c/path/to/windows/repo
```

この状態で `git fetch` や `git pull` をすると、Windows 側の情報を取り込めます。注意点ですが、`git push` するとメインとなる Windows 側のリポジトリに思わぬ影響が出てしまう可能性があるため避けるべきです。

## Windows ローカルの Git リポジトリに WSL2 上の Git リポジトリをリモートとして登録する

では WSL2 上でコミットした内容は取り込めないのかというとそんなことはなく、逆に WSL2 側のリポジトリから `git fetch` して安全にマージすればいいのです。WSL2の `/path/to/wsl2/repo` は Windows 上で `\\wsl$\<ディストロ名>\path\to\wsl2\repo` にあるように見えますので、以下の通りになります：

```powershell
# Debian 上の /path/to/wsl2/repo にリポジトリがある場合
git remote add wsl2 \\wsl$\Debian\path\to\wsl2\repo
```

この状態で `git fetch` や `git pull` をすると、WSL2 側の情報を取り込めます。

## 参考リンク

* [Linux 用 Windows サブシステムで Git の使用を開始する](https://learn.microsoft.com/ja-jp/windows/wsl/tutorials/wsl-git)
* [git-remote - Manage set of tracked repositories](https://git-scm.com/docs/git-remote)
* [Windows および Linux ファイル システム間での作業](https://learn.microsoft.com/ja-jp/windows/wsl/filesystems)
* [GIT URLS](https://git-scm.com/docs/git-fetch#_git_urls)
* [ファイアウォールの影響で WSL2 からインターネットアクセスができないときの対処法](https://qiita.com/yokra9/items/6cf0068557ff62afb551)
* [Microsoft Store に繋がらない環境でも WSL2 で Linux ディストリビューションを利用したい](https://qiita.com/yokra9/items/e25fb4f459e6bd620a8d)
