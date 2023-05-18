# WSL2 上の Docker を起動したら cgroup の mount で wrong fs type エラーが出た場合に読むページ

## TL;DR

WSL2 v1.2.3 以上にアップデートしましょう。

## `Error: 0x80040326` で WSL2 が起動しない

年度末の忙しいある日、WSL2 が以下のエラーを吐いて起動しなくなってしまいました：

```log
Error: 0x80040326
Error code: Wsl/Service/0x80040326
Press any key to continue...
```

この現象は [WSL2 の Issue でも言及されている](https://github.com/microsoft/WSL/issues/9866)ように WSL2 を更新することで解決します（この現象が報告され始めた 2023-03-30 時点では [v1.1.5](https://github.com/microsoft/WSL/releases/tag/1.1.5) が適用されました）：

```powershell
wsl --shutdown
wsl --update
```

```log
更新プログラムを確認しています。
Linux 用 Windows サブシステムを更新しています。..
```

これで WSL2 の起動はできるようになりました。しかし今度は Docker サービスの起動時に以下のエラーが表示されてしまいました：

```bash
sudo service docker start
```

```log
mount: /sys/fs/cgroup/cpuset: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/cpu: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/cpuacct: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/blkio: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/memory: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/devices: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/freezer: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/net_cls: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/perf_event: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/net_prio: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/hugetlb: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/pids: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/rdma: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
mount: /sys/fs/cgroup/misc: wrong fs type, bad option, bad superblock on cgroup, missing codepage or helper program, or other error.
 * Starting Docker: docker                                                                         [ OK ]
```

一見コンテナの使用には差し支えないようですが、謎のエラーが羅列されるのは気持ちが悪いです。どうにかしたい。

## 解決策（2023-04-14 以前 : WSL2 v1.2.3 未満の場合）

このエラーは、[WSL2 v1.1.5](https://github.com/microsoft/WSL/releases/tag/1.1.5) で行われた以下の変更が原因です：

> Do not mount cgroup v1 for WSL2

`service` コマンドによる Docker サービスの起動では `/etc/init.d/docker` が呼び出されますが、このスクリプトには以下の処理が含まれます：

```bash:/etc/init.d/docker
cgroupfs_mount() {
    # see also https://github.com/tianon/cgroupfs-mount/blob/master/cgroupfs-mount
    if grep -v '^#' /etc/fstab | grep -q cgroup \
        || [ ! -e /proc/cgroups ] \
        || [ ! -d /sys/fs/cgroup ]; then
        return
    fi
    if ! mountpoint -q /sys/fs/cgroup; then
        mount -t tmpfs -o uid=0,gid=0,mode=0755 cgroup /sys/fs/cgroup
    fi
    (
        cd /sys/fs/cgroup
        for sys in $(awk '!/^#/ { if ($4 == 1) print $1 }' /proc/cgroups); do
            mkdir -p $sys
            if ! mountpoint -q $sys; then
                if ! mount -n -t cgroup -o $sys cgroup $sys; then
                    rmdir $sys || true
                fi
            fi
        done
    )
}
```

`mount -t tmpfs -o uid=0,gid=0,mode=0755 cgroup /sys/fs/cgroup` という行がありますね。ここで `/sys/fs/cgroup` を `tmpfs` としてマウントしています。`/sys/fs/cgroup` のファイルシステムタイプは cgroup v2 で `tmpfs` から `cgroup2fs` に変更されたため、`wrong fs type` と言われてしまったのです。

```bash
stat -fc %T /sys/fs/cgroup/
```

```log
cgroup2fs
```

問題は init 用のシェルスクリプトで起きているので、systemd に切り替えれば回避できるはずです。幸い、[WSL2 v0.67.6](https://github.com/microsoft/WSL/releases/tag/0.67.6) 以降では systemd が利用できます。[公式の手順](https://learn.microsoft.com/ja-jp/windows/wsl/wsl-config)を参考に systemd を有効化してください：

```ini:/etc/wsl.conf
[boot]
systemd=true
```

```powershell
wsl --shutdown
```

設定に成功していれば、`systemctl` で Docker サービスを起動できるはずです：

```bash
sudo systemctl start docker
```

## 解決策（2023-04-15 以後 : WSL2 v1.2.3 以上の場合）

[WSL2 v1.2.3](https://github.com/microsoft/WSL/releases/tag/1.2.3) にて再度 cgroup v1 が有効化されました：

> Mount cgroup v1 for WSL2 to resolve issues with certain versions of docker (solves #9962)

そのため、現在では再度 WSL2 をアップデートするだけで解決します。

## 参考リンク

* [Error: 0x80040326 when opening WSL #9866](https://github.com/microsoft/WSL/issues/9866)
* [In WSL2's docker container : GPU access blocked by the operating system #9962](https://github.com/microsoft/WSL/issues/9962)
* [How to enable cgroup v2 in WSL2?](https://stackoverflow.com/questions/73021599/how-to-enable-cgroup-v2-in-wsl2)
* [Wsl/Service/CreateInstance/ERROR_FILE_NOT_FOUND #9862](https://github.com/microsoft/WSL/issues/9862)
* [mount cgroup v2 error (Docker) #9868](https://github.com/microsoft/WSL/issues/9868)
* [Linux Nodeのcgroupバージョンを特定する](https://kubernetes.io/ja/docs/concepts/architecture/cgroups/)
* [WSL での詳細設定の構成](https://learn.microsoft.com/ja-jp/windows/wsl/wsl-config)
