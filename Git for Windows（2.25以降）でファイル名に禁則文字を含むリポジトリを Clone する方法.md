# Git for Windows（2.25以降）でファイル名に禁則文字を含むリポジトリを Clone する方法

Git for Windows ではファイル名に禁則文字を含むリポジトリを Clone できません。[^1]

[^1]: Windows 10 の場合、「\」「/」「:」「*」「?」「"」「<」「>」「|」がファイル名に利用できません。

Linux での利用を前提としたリポジトリの場合、ファイル名にWindows の禁則文字を含んでしまっている場合があります。[^2] とはいえ禁則文字を含まないファイルまで Clone できないのでは不便です。どうにかできないものか。

[^2]: [一例](https://github.com/aquasecurity/vuln-list/blob/master/oval/redhat/6/2010/)です。

## 「まばらに」 Clone して問題を回避する

[protectNTFS](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coreprotectNTFS) をオフにした状態で、[sparse-checkout](https://www.git-scm.com/docs/git-sparse-checkout) を活用すれば無事に Clone できます。

```powershell
# 空のリポジトリを作成する
mkdir <リポジトリ名>
Set-Location <リポジトリ名>
git init
git remote add origin <リポジトリのURL>

# 禁則文字を含むファイルをチェックアウトするとエラーになる機能を無効化
git config core.protectNTFS false
# sparse-checkout を有効化
git config core.sparsecheckout true

# .git\info\sparse-checkout にクローン対象とするパスを記述する
# このとき、エンコードが UTF-8（BOMなし）であることに注意する
[System.IO.File]::WriteAllLines("${PWD}\.git\info\sparse-checkout", @("クローン対象1";"クローン対象2";...), (New-Object "System.Text.UTF8Encoding" -ArgumentList $false))

# 「まばらに」 Clone
git pull origin master
```

core.protectNTFS が有効なままだと、禁則文字を含むファイルが sparse-checkout で除外されたディレクトリにある場合でさえ問答無用でエラーになってしまいまいます。なお、protectNTFS は [Git for Windows 2.25.0](https://github.com/git-for-windows/git/releases/tag/v2.25.0.windows.1) から含まれており、以前のバージョンでは sparse-checkout するだけで問題を回避できていました。

## 参考リンク

* [Git for Windows now fails as expected when trying to check out files with illegal characters in their file names.](https://github.com/git-for-windows/git/releases/tag/v2.25.0.windows.1)
* [git sparse checkout で clone せずに一部のサブディレクトリだけを pull/checkout する](https://mseeeen.msen.jp/git-sparse-checkout/)
* [Git pullエラー：ファイルを作成できません（無効な引数）](https://www.it-swarm.dev/ja/windows/git-pull%E3%82%A8%E3%83%A9%E3%83%BC%EF%BC%9A%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E4%BD%9C%E6%88%90%E3%81%A7%E3%81%8D%E3%81%BE%E3%81%9B%E3%82%93%EF%BC%88%E7%84%A1%E5%8A%B9%E3%81%AA%E5%BC%95%E6%95%B0%EF%BC%89/1049291468/)
* [Partial Clone](https://docs.gitlab.com/ee/topics/git/partial_clone.html)