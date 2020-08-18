# オフライン環境でも yum で簡単にパッケージを導入したい

**オンライン環境**の CentOS で任意のパッケージを導入したいときは、以下のように入力します：

```bash
# yum install httpd
```

`yum install <RPM パッケージ名>` を実行すると、指定した RPM パッケージと、それの依存するパッケージが同時にインストールされます。

yum はデフォルトではインターネット上にあるリポジトリから RPM パッケージを取得します。したがって、オフライン環境で同様の体験を得るためには、少し工夫が必要になります。

## yum で RPM パッケージをダウンロードする

yum で RPM パッケージをダウンロードするのは簡単です：

```bash
# yum install --downloadonly --downloaddir=/tmp/httpd-repo httpd
```

`yum install --downloadonly --downloaddir=<保存先> <RPM パッケージ名>` で任意の RPM パッケージをダウンロードできます。[^1] 確認してみましょう：

[^1]: CentOS 6 では標準機能ではないため、プラグインをインストールする必要があります： `yum install yum-plugin-downloadonly`

```bash
# ls -l /tmp/httpd-repo/
total 24960
-rw-r--r-- 1 root root   105968 Aug 22  2019 apr-1.4.8-5.el7.x86_64.rpm
-rw-r--r-- 1 root root    94132 Jul  4  2014 apr-util-1.5.2-6.el7.x86_64.rpm
-rw-r--r-- 1 root root 22354804 Sep 30  2015 centos-logos-70.0.6-3.el7.centos.noarch.rpm
-rw-r--r-- 1 root root  2843664 Apr  3 20:53 httpd-2.4.6-93.el7.centos.x86_64.rpm
-rw-r--r-- 1 root root    94308 Apr  3 20:53 httpd-tools-2.4.6-93.el7.centos.x86_64.rpm
-rw-r--r-- 1 root root    31264 Jul  4  2014 mailcap-2.1.41-2.el7.noarch.rpm
```

いくつかの RPM パッケージがダウンロードされています。`rpm -ivh` でまとめてインストールしてみましょう：

```bash
# cd /tmp/httpd-repo/
# rpm -ivh apr-1.4.8-5.el7.x86_64.rpm httpd-2.4.6-93.el7.centos.x86_64.rpm apr-util-1.5.2-6.el7.x86_64.rpm httpd-tools-2.4.6-93.el7.centos.x86_64.rpm centos-logos-70.0.6-3.el7.centos.noarch.rpm  mailcap-2.1.41-2.el7.noarch.rpm
Preparing...                          ################################# [100%]
Updating / installing...
   1:apr-1.4.8-5.el7                  ################################# [ 17%]
   2:apr-util-1.5.2-6.el7             ################################# [ 33%]
   3:httpd-tools-2.4.6-93.el7.centos  ################################# [ 50%]
   4:mailcap-2.1.41-2.el7             ################################# [ 67%]
   5:centos-logos-70.0.6-3.el7.centos ################################# [ 83%]
   6:httpd-2.4.6-93.el7.centos        ################################# [100%]
```

この手順は一見して問題ないように見えますが、実際にこれらの RPM パッケージをオフライン環境に持っていっても、以下のような「依存性の欠如」エラーが発生してしまうことがあります：

```bash
# rpm -ivh glibc-devel-2.17-260.el7_6.5.x86_64.rpm
error: Failed dependencies:
        glibc-headers is needed by glibc-devel-2.17-260.el7_6.5.x86_64
```

実は、`--downloadonly` スイッチを利用しても、（通常のインストールプロセスと同様に）インストール済みの RPM パッケージはスキップされてしまいます。それでは、依存するすべての RPM パッケージを取得するにはどうすればよいのでしょうか？

答えは、`--installroot` スイッチを利用することです：

```bash
# yum install --downloadonly --releasever=7 --installroot=/tmp/httpd-installroot --downloaddir=/tmp/httpd-repo httpd
```

`--installroot` スイッチは、通常とは別の場所へインストールするために利用します。今回はダミーディレクトリを指定してすべての RPM パッケージをダウンロードさせています。[^2]

[^2]: `--releasever` はリポジトリ情報の `$releasever` を置き換える値です。通常は `centos-release` からバージョン情報を取得しますが、この操作では手動で設定する必要があります。

結果は以下の通りです：

<details><div>

```bash
# cd /tmp/httpd-repo/
# ls -l
total 91780
-rw-r--r-- 1 root root    83408 Apr  3 20:48 acl-2.2.51-15.el7.x86_64.rpm
-rw-r--r-- 1 root root   105968 Aug 22  2019 apr-1.4.8-5.el7.x86_64.rpm
-rw-r--r-- 1 root root    94132 Jul  4  2014 apr-util-1.5.2-6.el7.x86_64.rpm
-rw-r--r-- 1 root root   104408 Aug 22  2019 audit-libs-2.8.5-4.el7.x86_64.rpm
-rw-r--r-- 1 root root     5124 Jul  4  2014 basesystem-10.0-7.el7.centos.noarch.rpm
-rw-r--r-- 1 root root  1037976 Apr  3 20:49 bash-4.2.46-34.el7.x86_64.rpm
-rw-r--r-- 1 root root  6196672 May 13 17:09 binutils-2.27-43.base.el7_8.1.x86_64.rpm
-rw-r--r-- 1 root root    40740 Nov 25  2015 bzip2-libs-1.0.6-13.el7.x86_64.rpm
-rw-r--r-- 1 root root   391340 Jun 23 17:38 ca-certificates-2020.2.41-70.0.el7_8.noarch.rpm
-rw-r--r-- 1 root root 22354804 Sep 30  2015 centos-logos-70.0.6-3.el7.centos.noarch.rpm
-rw-r--r-- 1 root root    27116 Apr 14 15:54 centos-release-7-8.2003.0.el7.centos.x86_64.rpm
-rw-r--r-- 1 root root   185720 Aug 10  2017 chkconfig-1.7.4-1.el7.x86_64.rpm
-rw-r--r-- 1 root root  3415080 Aug 22  2019 coreutils-8.22-24.el7.x86_64.rpm
-rw-r--r-- 1 root root   216084 Apr 25  2018 cpio-2.11-27.el7.x86_64.rpm
-rw-r--r-- 1 root root    81964 Jul  4  2014 cracklib-2.9.0-11.el7.x86_64.rpm
-rw-r--r-- 1 root root  3751124 Jul  4  2014 cracklib-dicts-2.9.0-11.el7.x86_64.rpm
-rw-r--r-- 1 root root   346748 Apr  3 20:50 cryptsetup-libs-2.0.3-6.el7.x86_64.rpm
-rw-r--r-- 1 root root   276860 Apr  3 20:50 curl-7.29.0-57.el7.x86_64.rpm
-rw-r--r-- 1 root root   159156 Apr 25  2018 cyrus-sasl-lib-2.1.26-23.el7.x86_64.rpm
-rw-r--r-- 1 root root   251296 Mar 19  2019 dbus-1.10.24-13.el7_6.x86_64.rpm
-rw-r--r-- 1 root root   173096 Mar 19  2019 dbus-libs-1.10.24-13.el7_6.x86_64.rpm
-rw-r--r-- 1 root root   302564 May 13 17:09 device-mapper-1.02.164-7.el7_8.2.x86_64.rpm
-rw-r--r-- 1 root root   331908 May 13 17:13 device-mapper-libs-1.02.164-7.el7_8.2.x86_64.rpm
-rw-r--r-- 1 root root   329696 Aug 22  2019 diffutils-3.3-5.el7.x86_64.rpm
-rw-r--r-- 1 root root   336836 Apr  3 20:51 dracut-033-568.el7.x86_64.rpm
-rw-r--r-- 1 root root    33596 Apr  3 21:18 elfutils-default-yama-scope-0.176-4.el7.noarch.rpm
-rw-r--r-- 1 root root   199264 Apr  3 20:51 elfutils-libelf-0.176-4.el7.x86_64.rpm
-rw-r--r-- 1 root root   297776 Apr  3 20:51 elfutils-libs-0.176-4.el7.x86_64.rpm
-rw-r--r-- 1 root root    82612 Apr  3 20:51 expat-2.1.0-11.el7.x86_64.rpm
-rw-r--r-- 1 root root  1067124 Apr 25  2018 filesystem-3.2-25.el7.x86_64.rpm
-rw-r--r-- 1 root root   572216 Nov 12  2018 findutils-4.5.11-6.el7.x86_64.rpm
-rw-r--r-- 1 root root   894476 Jun 29  2017 gawk-4.0.2-4.el7_3.1.x86_64.rpm
-rw-r--r-- 1 root root  2571348 Aug 22  2019 glib2-2.56.1-5.el7.x86_64.rpm
-rw-r--r-- 1 root root  3815032 Apr  3 20:52 glibc-2.17-307.el7.1.x86_64.rpm
-rw-r--r-- 1 root root 12057552 Apr  3 20:52 glibc-common-2.17-307.el7.1.x86_64.rpm
-rw-r--r-- 1 root root   287768 Aug 10  2017 gmp-6.0.0-15.el7.x86_64.rpm
-rw-r--r-- 1 root root   352624 Aug 10  2017 grep-2.20-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   132636 Apr 25  2018 gzip-1.5-10.el7.x86_64.rpm
-rw-r--r-- 1 root root    14640 Jul  4  2014 hardlink-1.0-19.el7.x86_64.rpm
-rw-r--r-- 1 root root  2843664 Apr  3 20:53 httpd-2.4.6-93.el7.centos.x86_64.rpm
-rw-r--r-- 1 root root    94308 Apr  3 20:53 httpd-tools-2.4.6-93.el7.centos.x86_64.rpm
-rw-r--r-- 1 root root   238564 Apr 25  2018 info-5.1-5.el7.x86_64.rpm
-rw-r--r-- 1 root root    31312 Jul  5  2014 json-c-0.11-4.el7_0.x86_64.rpm
-rw-r--r-- 1 root root    25920 Jul  4  2014 keyutils-libs-1.5.8-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   125760 Apr  3 20:55 kmod-20-28.el7.x86_64.rpm
-rw-r--r-- 1 root root    52412 Apr  3 20:55 kmod-libs-20-28.el7.x86_64.rpm
-rw-r--r-- 1 root root    81768 Apr  3 20:55 kpartx-0.4.9-131.el7.x86_64.rpm
-rw-r--r-- 1 root root   828000 Apr  3 20:55 krb5-libs-1.15.1-46.el7.x86_64.rpm
-rw-r--r-- 1 root root    27976 Apr  3 20:55 libacl-2.2.51-15.el7.x86_64.rpm
-rw-r--r-- 1 root root    18656 Apr 25  2018 libattr-2.4.46-13.el7.x86_64.rpm
-rw-r--r-- 1 root root   186216 Apr  3 20:55 libblkid-2.23.2-63.el7.x86_64.rpm
-rw-r--r-- 1 root root    48548 Apr  3 20:56 libcap-2.22-11.el7.x86_64.rpm
-rw-r--r-- 1 root root    25244 Nov 25  2015 libcap-ng-0.7.5-4.el7.x86_64.rpm
-rw-r--r-- 1 root root    42600 Apr  3 20:56 libcom_err-1.42.9-17.el7.x86_64.rpm
-rw-r--r-- 1 root root   228184 Apr  3 20:56 libcurl-7.29.0-57.el7.x86_64.rpm
-rw-r--r-- 1 root root   737156 Aug 22  2019 libdb-5.3.21-25.el7.x86_64.rpm
-rw-r--r-- 1 root root   135576 Aug 22  2019 libdb-utils-5.3.21-25.el7.x86_64.rpm
-rw-r--r-- 1 root root    30960 Apr  3 20:56 libffi-3.0.13-19.el7.x86_64.rpm
-rw-r--r-- 1 root root   104736 Aug 22  2019 libgcc-4.8.5-39.el7.x86_64.rpm
-rw-r--r-- 1 root root   269660 Aug 10  2017 libgcrypt-1.5.3-14.el7.x86_64.rpm
-rw-r--r-- 1 root root    89332 Jul  4  2014 libgpg-error-1.12-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   213816 Nov 25  2015 libidn-1.28-4.el7.x86_64.rpm
-rw-r--r-- 1 root root   188048 Apr  3 20:56 libmount-2.23.2-63.el7.x86_64.rpm
-rw-r--r-- 1 root root    86540 Apr 25  2018 libpwquality-1.2.3-5.el7.x86_64.rpm
-rw-r--r-- 1 root root   166012 Apr  3 20:59 libselinux-2.5-15.el7.x86_64.rpm
-rw-r--r-- 1 root root   154244 Nov 12  2018 libsemanage-2.5-14.el7.x86_64.rpm
-rw-r--r-- 1 root root   304196 Nov 12  2018 libsepol-2.5-10.el7.x86_64.rpm
-rw-r--r-- 1 root root   145116 Apr  3 21:00 libsmartcols-2.23.2-63.el7.x86_64.rpm
-rw-r--r-- 1 root root    89648 Aug 22  2019 libssh2-1.8.0-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   312504 Aug 22  2019 libstdc++-4.8.5-39.el7.x86_64.rpm
-rw-r--r-- 1 root root   328028 Aug 10  2017 libtasn1-4.10-1.el7.x86_64.rpm
-rw-r--r-- 1 root root   409732 Apr 25  2018 libuser-0.60-9.el7.x86_64.rpm
-rw-r--r-- 1 root root    25428 Jul  4  2014 libutempter-1.1.6-4.el7.x86_64.rpm
-rw-r--r-- 1 root root    85312 Apr  3 21:00 libuuid-2.23.2-63.el7.x86_64.rpm
-rw-r--r-- 1 root root    16820 Jul  4  2014 libverto-0.2.5-4.el7.x86_64.rpm
-rw-r--r-- 1 root root   684460 Apr  3 21:01 libxml2-2.9.1-6.el7.4.x86_64.rpm
-rw-r--r-- 1 root root   205412 Nov 20  2016 lua-5.1.4-15.el7.x86_64.rpm
-rw-r--r-- 1 root root   100896 Aug 22  2019 lz4-1.7.5-3.el7.x86_64.rpm
-rw-r--r-- 1 root root    31264 Jul  4  2014 mailcap-2.1.41-2.el7.noarch.rpm
-rw-r--r-- 1 root root   310928 Sep  7  2017 ncurses-5.9-14.20130511.el7_4.x86_64.rpm
-rw-r--r-- 1 root root    69900 Sep  7  2017 ncurses-base-5.9-14.20130511.el7_4.noarch.rpm
-rw-r--r-- 1 root root   323192 Sep  7  2017 ncurses-libs-5.9-14.20130511.el7_4.x86_64.rpm
-rw-r--r-- 1 root root   129772 Aug 22  2019 nspr-4.21.0-1.el7.x86_64.rpm
-rw-r--r-- 1 root root   874504 Dec 11  2019 nss-3.44.0-7.el7_7.x86_64.rpm
-rw-r--r-- 1 root root    75584 Aug 22  2019 nss-pem-1.0.3-7.el7.x86_64.rpm
-rw-r--r-- 1 root root   337704 Dec 11  2019 nss-softokn-3.44.0-8.el7_7.x86_64.rpm
-rw-r--r-- 1 root root   229824 Dec 11  2019 nss-softokn-freebl-3.44.0-8.el7_7.x86_64.rpm
-rw-r--r-- 1 root root    66128 Dec 11  2019 nss-sysinit-3.44.0-7.el7_7.x86_64.rpm
-rw-r--r-- 1 root root   541024 Dec 11  2019 nss-tools-3.44.0-7.el7_7.x86_64.rpm
-rw-r--r-- 1 root root    80704 Dec 11  2019 nss-util-3.44.0-4.el7_7.x86_64.rpm
-rw-r--r-- 1 root root   364232 Feb  1  2019 openldap-2.4.44-21.el7_6.x86_64.rpm
-rw-r--r-- 1 root root  1254680 Aug 22  2019 openssl-libs-1.0.2k-19.el7.x86_64.rpm
-rw-r--r-- 1 root root   257620 Aug 10  2017 p11-kit-0.23.5-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   131984 Aug 10  2017 p11-kit-trust-0.23.5-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   737960 Apr  3 21:03 pam-1.1.8-23.el7.x86_64.rpm
-rw-r--r-- 1 root root   432020 Aug 10  2017 pcre-8.32-17.el7.x86_64.rpm
-rw-r--r-- 1 root root    54928 Jul  4  2014 pkgconfig-0.27.1-4.el7.x86_64.rpm
-rw-r--r-- 1 root root    42740 Jul  4  2014 popt-1.13-16.el7.x86_64.rpm
-rw-r--r-- 1 root root   297872 Apr  3 21:06 procps-ng-3.3.10-27.el7.x86_64.rpm
-rw-r--r-- 1 root root    51112 Jul  4  2014 qrencode-libs-3.4.1-3.el7.x86_64.rpm
-rw-r--r-- 1 root root   197696 Aug 22  2019 readline-6.2-11.el7.x86_64.rpm
-rw-r--r-- 1 root root  1219660 Apr  3 21:07 rpm-4.11.3-43.el7.x86_64.rpm
-rw-r--r-- 1 root root   284848 Apr  3 21:07 rpm-libs-4.11.3-43.el7.x86_64.rpm
-rw-r--r-- 1 root root   236536 Apr  3 21:08 sed-4.2.2-6.el7.x86_64.rpm
-rw-r--r-- 1 root root   170000 Apr  3 21:21 setup-2.8.71-11.el7.noarch.rpm
-rw-r--r-- 1 root root  1250180 Aug 22  2019 shadow-utils-4.6-5.el7.x86_64.rpm
-rw-r--r-- 1 root root   319576 Apr  3 21:08 shared-mime-info-1.8-5.el7.x86_64.rpm
-rw-r--r-- 1 root root   403100 Jan 28 16:54 sqlite-3.7.17-8.el7_7.1.x86_64.rpm
-rw-r--r-- 1 root root  5317720 Jun 30 19:50 systemd-219-73.el7_8.8.x86_64.rpm
-rw-r--r-- 1 root root   426004 Jun 30 19:50 systemd-libs-219-73.el7_8.8.x86_64.rpm
-rw-r--r-- 1 root root   865848 Nov 12  2018 tar-1.26-35.el7.x86_64.rpm
-rw-r--r-- 1 root root   506652 Apr 30 17:07 tzdata-2020a-1.el7.noarch.rpm
-rw-r--r-- 1 root root    94456 Jul  4  2014 ustr-1.0.4-16.el7.x86_64.rpm
-rw-r--r-- 1 root root  2074740 Apr  3 21:10 util-linux-2.23.2-63.el7.x86_64.rpm
-rw-r--r-- 1 root root   234160 Nov 20  2016 xz-5.2.2-1.el7.x86_64.rpm
-rw-r--r-- 1 root root   105728 Nov 20  2016 xz-libs-5.2.2-1.el7.x86_64.rpm
-rw-r--r-- 1 root root    91960 Nov 12  2018 zlib-1.2.7-18.el7.x86_64.rpm
```

</div></details>

どうやらすべての依存パッケージを落とせています。しかし、これだけの RPM パッケージを手動でインストールするのは面倒ですね。

## ダウンロードした RPM パッケージをもとにローカルリポジトリを作成する

これらの RPM パッケージを含むローカルリポジトリを作成します：

```bash
# yum install createrepo
# createrepo /tmp/httpd-repo/
```

`createrepo` コマンドで作成したリポジトリはディレクトリごと持ち運ぶことができますので、オフライン環境にも簡単に持ち込むことができます。そのあとは、yum に登録するだけです：

```bash
# cat /etc/yum.repos.d/httpd-repo.repo
[httpd-repo]
name=CentOS-$releasever - httpd
baseurl=file:///var/httpd-repo
enabled=0
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-$releasever

# yum -y --disablerepo=\* --enablerepo=httpd-repo install httpd
Loaded plugins: fastestmirror, ovl
Determining fastest mirrors
httpd-repo                                                                                       | 2.9 kB  00:00:00
httpd-repo/primary_db                                                                            |  95 kB  00:00:00
Resolving Dependencies
--> Running transaction check
---> Package httpd.x86_64 0:2.4.6-93.el7.centos will be installed
--> Processing Dependency: httpd-tools = 2.4.6-93.el7.centos for package: httpd-2.4.6-93.el7.centos.x86_64
--> Processing Dependency: system-logos >= 7.92.1-1 for package: httpd-2.4.6-93.el7.centos.x86_64
--> Processing Dependency: /etc/mime.types for package: httpd-2.4.6-93.el7.centos.x86_64
--> Processing Dependency: libaprutil-1.so.0()(64bit) for package: httpd-2.4.6-93.el7.centos.x86_64
--> Processing Dependency: libapr-1.so.0()(64bit) for package: httpd-2.4.6-93.el7.centos.x86_64
--> Running transaction check
---> Package apr.x86_64 0:1.4.8-5.el7 will be installed
---> Package apr-util.x86_64 0:1.5.2-6.el7 will be installed
---> Package centos-logos.noarch 0:70.0.6-3.el7.centos will be installed
---> Package httpd-tools.x86_64 0:2.4.6-93.el7.centos will be installed
---> Package mailcap.noarch 0:2.1.41-2.el7 will be installed
--> Finished Dependency Resolution

Dependencies Resolved

========================================================================================================================
 Package                     Arch                  Version                              Repository                 Size
========================================================================================================================
Installing:
 httpd                       x86_64                2.4.6-93.el7.centos                  httpd-repo                2.7 M
Installing for dependencies:
 apr                         x86_64                1.4.8-5.el7                          httpd-repo                103 k
 apr-util                    x86_64                1.5.2-6.el7                          httpd-repo                 92 k
 centos-logos                noarch                70.0.6-3.el7.centos                  httpd-repo                 21 M
 httpd-tools                 x86_64                2.4.6-93.el7.centos                  httpd-repo                 92 k
 mailcap                     noarch                2.1.41-2.el7                         httpd-repo                 31 k

Transaction Summary
========================================================================================================================
Install  1 Package (+5 Dependent packages)

Total download size: 24 M
Installed size: 32 M
Downloading packages:
warning: /var/httpd-repo/apr-1.4.8-5.el7.x86_64.rpm: Header V3 RSA/SHA256 Signature, key ID f4a80eb5: NOKEY
Public key for apr-1.4.8-5.el7.x86_64.rpm is not installed
------------------------------------------------------------------------------------------------------------------------
Total                                                                                   1.3 GB/s |  24 MB  00:00:00
Retrieving key from file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
Importing GPG key 0xF4A80EB5:
 Userid     : "CentOS-7 Key (CentOS 7 Official Signing Key) <security@centos.org>"
 Fingerprint: 6341 ab27 53d7 8a78 a7c2 7bb1 24c6 a8a7 f4a8 0eb5
 Package    : centos-release-7-8.2003.0.el7.centos.x86_64 (@CentOS)
 From       : /etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
Running transaction check
Running transaction test
Transaction test succeeded
Running transaction
  Installing : apr-1.4.8-5.el7.x86_64                                                                               1/6
  Installing : apr-util-1.5.2-6.el7.x86_64                                                                          2/6
  Installing : httpd-tools-2.4.6-93.el7.centos.x86_64                                                               3/6
  Installing : centos-logos-70.0.6-3.el7.centos.noarch                                                              4/6
  Installing : mailcap-2.1.41-2.el7.noarch                                                                          5/6
  Installing : httpd-2.4.6-93.el7.centos.x86_64                                                                     6/6
  Verifying  : mailcap-2.1.41-2.el7.noarch                                                                          1/6
  Verifying  : apr-util-1.5.2-6.el7.x86_64                                                                          2/6
  Verifying  : httpd-2.4.6-93.el7.centos.x86_64                                                                     3/6
  Verifying  : apr-1.4.8-5.el7.x86_64                                                                               4/6
  Verifying  : httpd-tools-2.4.6-93.el7.centos.x86_64                                                               5/6
  Verifying  : centos-logos-70.0.6-3.el7.centos.noarch                                                              6/6

Installed:
  httpd.x86_64 0:2.4.6-93.el7.centos

Dependency Installed:
  apr.x86_64 0:1.4.8-5.el7                   apr-util.x86_64 0:1.5.2-6.el7   centos-logos.noarch 0:70.0.6-3.el7.centos
  httpd-tools.x86_64 0:2.4.6-93.el7.centos   mailcap.noarch 0:2.1.41-2.el7

Complete!
```

やった！　無事にオフライン環境でも `yum install` でインストールできるようになりました。

## ローカルリポジトリを更新したいときの注意点

ディレクトリにファイルを追加して `createrepo` するだけで、ローカルリポジトリにパッケージを追加できます。

リポジトリを更新しても `yum list` で追加したパッケージが表示されなかったり、`yum install` でオフラインインストールできないことがあります。これは前回実行時のキャッシュが残っているせいなので、ローカルリポジトリのキャッシュをクリアしてあげましょう：

```bash
# yum clean all --disablerepo=\* --enablerepo=httpd-repo
```

## 参考リンク

* [How to use yum to get all RPMs required, for offline use?](https://unix.stackexchange.com/questions/259640/how-to-use-yum-to-get-all-rpms-required-for-offline-use)
* [yum を使用して、パッケージをインストールせずにダウンロードだけ行う](https://access.redhat.com/ja/solutions/395763)
* [【CentOS7】yum の $releasever、$basearch と $infra を知る方法](https://oki2a24.com/2016/09/11/how-to-know-yum-releaserver-basearch-infra/)
* [9.5.3. Yum 変数の使用](https://access.redhat.com/documentation/ja-jp/red_hat_enterprise_linux/7/html/system_administrators_guide/sec-configuring_yum_and_yum_repositories#sec-Using_Yum_Variables)
