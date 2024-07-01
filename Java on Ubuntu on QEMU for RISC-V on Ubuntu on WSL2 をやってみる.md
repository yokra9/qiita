# Java on Ubuntu on QEMU for RISC-V on Ubuntu on WSL2 をやってみる

この所、[Eclipse Temurin 21 が RISC-Vで利用可能になった](https://adoptium.net/blog/2024/04/eclipse-temurin-21-and-22-available-on-riscv/)り、[Ubuntu 24.04 が RISC-V 搭載 SBC「Milk-V Mars」を正式サポートしたり](https://gihyo.jp/admin/clip/01/ubuntu-topics/202405/31)しましたね。ということは、RISC-V な市販ボード PC で Ubuntu の起動も、さらには Temurin の動作もサポートされることになります。30 億のデバイスで走ることが知られる Java ですが、まだまだその版図を広げていくつもりのようです。せっかくなので Milk-V Mars を買って試してみたかったのですが、どうやら品切れ中のようでした。というわけで、Ubuntu on QEMU for RISC-V on Ubuntu on WSL2 で Java を走らせてお茶を濁すこととします。

## Ubuntu on QEMU for RISC-V on Ubuntu on WSL2 を起動する

Ubuntu Wiki に [RISC-V/QEMU](https://wiki.ubuntu.com/RISC-V/QEMU) というそのものズバリな項目があるため、こちらを参照します。

まず、Ubuntu on WSL2 にて必要なパッケージをインストールします：

* [qemu-system-misc](https://packages.ubuntu.com/noble/qemu-system-misc)
  * `qemu-system-riscv64` ([QEMU RISC-V System emulator](https://www.qemu.org/docs/master/system/target-riscv.html))
* [opensbi](https://packages.ubuntu.com/noble/opensbi)
  * [RISC-V Open Source Supervisor Binary Interface (OpenSBI)](https://github.com/riscv-software-src/opensbi)
* [u-boot-qemu](https://packages.ubuntu.com/noble/u-boot-qemu)
  * [Das U-Boot](https://github.com/u-boot/u-boot) の [QEMU 版](https://docs.u-boot.org/en/latest/board/emulation/qemu-riscv.html)

```bash
sudo apt-get update
sudo apt-get install opensbi qemu-system-misc u-boot-qemu
```

次に、QEMU 用のプリインストール済イメージをダウンロードして解凍します。

```bash
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-riscv64.img.xz
xz -dk ubuntu-24.04-preinstalled-server-riscv64.img.xz
```

Windows 上のブラウザで [Ubuntu releases の 24.04 (Noble Numbat) ページ](https://cdimage.ubuntu.com/releases/24.04/release/)から落としてもよいでしょう。対象は `RISC-V preinstalled server image` です。

次に、解凍したイメージから `qemu-system-riscv64` で QEMU for RISC-V を起動します：

```bash
qemu-system-riscv64 \
-machine virt -nographic -m 2048 -smp 4 \
-bios /usr/lib/riscv64-linux-gnu/opensbi/generic/fw_jump.bin \
-kernel /usr/lib/u-boot/qemu-riscv64_smode/uboot.elf \
-device virtio-net-device,netdev=eth0 -netdev user,id=eth0 \
-device virtio-rng-pci \
-drive file=ubuntu-24.04-preinstalled-server-riscv64.img,format=raw,if=virtio
```

試しに Windows 上の img ファイルをネットワーク経由で読ませてみましたが、それでも 2 分ほどで起動しました[^1]。

[^1]: なお CPU は AMD Ryzen 7 3700X、RAM 容量は 32GB、ディスクは PCIe 3.0 SSD の環境です。

```log
OpenSBI v1.3
   ____                    _____ ____ _____
  / __ \                  / ____|  _ \_   _|
 | |  | |_ __   ___ _ __ | (___ | |_) || |
 | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
 | |__| | |_) |  __/ | | |____) | |_) || |_
  \____/| .__/ \___|_| |_|_____/|___/_____|
        | |
        |_|

Platform Name             : riscv-virtio,qemu

.
.
.

[  110.598857] cloud-init[974]: Cloud-init v. 24.1.3-0ubuntu3 finished at Fri, 14 Jun 2024 06:33:17 +0000. Datasource DataSourceNoCloud [seed=/var/lib/cloud/seed/nocloud-net][dsmode=net].  Up 110.51 seconds

ubuntu login: ubuntu
```

ユーザ名 `ubuntu`、パスワード `ubuntu` でログインします。

```log
Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-31-generic riscv64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Fri Jun 14 06:34:52 UTC 2024

  System load:           0.57
  Usage of /:            49.8% of 4.18GB
  Memory usage:          9%
  Swap usage:            0%
  Processes:             113
  Users logged in:       0
  IPv4 address for eth0: 10.0.2.15
  IPv6 address for eth0: fec0::5054:ff:fe12:3456
```

`Ubuntu 24.04 LTS (GNU/Linux 6.8.0-31-generic riscv64)` だと自己紹介していますね。基本情報を出力してみましょう：

```bash
cat /etc/os-release
```

```log
PRETTY_NAME="Ubuntu 24.04 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=noble
LOGO=ubuntu-logo
```

```bash
arch
```

```log
riscv64
```

どうやら RISC-V on QEMU で Ubuntu を立ち上げられたようです。

## Eclipse Temurin 21 on Ubuntu on QEMU for RISC-V on Ubuntu on WSL2

Temurin 21 for RISC-V は[ここ](https://adoptium.net/temurin/releases/?arch=riscv64)からダウンロードできますが、QEMU 内で [GitHub Releases](https://github.com/adoptium/temurin21-binaries/releases) から wget して展開するのがお手軽でしょう：

```bash
wget https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_riscv64_linux_hotspot_21.0.3_9.tar.gz
tar -xvf OpenJDK21U-jdk_riscv64_linux_hotspot_21.0.3_9.tar.gz

cd jdk-21.0.3+9/bin/
./java -version
```

```log
openjdk version "21.0.3" 2024-04-16 LTS
OpenJDK Runtime Environment Temurin-21.0.3+9 (build 21.0.3+9-LTS)
OpenJDK 64-Bit Server VM Temurin-21.0.3+9 (build 21.0.3+9-LTS, mixed mode, sharing)
```

せっかく Java 21 なので [JEP 445](https://openjdk.org/jeps/445)（と [JEP 330](https://openjdk.org/jeps/330)）で動作確認します。

```java:Arch.java
void main(String[] args){
  System.out.println(System.getProperty("os.arch"));
}
```

```bash
./java --enable-preview --source 21 /tmp/Arch.java
```

```log
Note: /tmp/Arch.java uses preview features of Java SE 21.
Note: Recompile with -Xlint:preview for details.
riscv64
```

![Eclipse Temurin 21 on Ubuntu on QEMU for RISC-V](<./img/Eclipse Temurin 21 on Ubuntu on QEMU for RISC-V.gif>)

やりました。

## Ubuntu 標準の OpenJDK 21 on Ubuntu on QEMU for RISC-V on Ubuntu on WSL2

そもそも、[JEP 422: Linux/RISC-V Port](https://openjdk.org/jeps/422) が取り込まれた Java 19 から標準的に RISC-V 上での動作は可能になっているはずです。実際、Ubuntu on RISC-V でも apt から標準の OpenJDK を導入可能です：

```bash
sudo apt update
sudo apt install openjdk-21-jdk

java -version
```

```log
openjdk version "21.0.3" 2024-04-16
OpenJDK Runtime Environment (build 21.0.3+9-Ubuntu-1ubuntu1)
OpenJDK 64-Bit Server VM (build 21.0.3+9-Ubuntu-1ubuntu1, mixed mode, sharing)
```

では、Temurin と同様に `Arch.java` を実行してみましょう：

```bash
java --enable-preview --source 21 /tmp/Arch.java
```

```log
Note: /tmp/Arch.java uses preview features of Java SE 21.
Note: Recompile with -Xlint:preview for details.
riscv64
```

問題なく動作しますね。ただし、インストール時の依存パッケージが多いため、リソースの限られた状況では Temurin をアーカイブで持ち込む方が手軽な可能性もあります。

なお、誤って JRE の方（`openjdk-21-jre-headless` パッケージ）をインストールすると以下のエラーになってしまいます：

```bash
sudo apt update
sudo apt install openjdk-21-jre-headless

java --enable-preview --source 21 /tmp/Arch.java
```

```log
Exception in thread "main" java.lang.IllegalArgumentException: error: release version 21 not supported
        at jdk.compiler/com.sun.tools.javac.main.Arguments.reportDiag(Arguments.java:886)
        at jdk.compiler/com.sun.tools.javac.main.Arguments.handleReleaseOptions(Arguments.java:312)
        at jdk.compiler/com.sun.tools.javac.main.Arguments.processArgs(Arguments.java:351)
        at jdk.compiler/com.sun.tools.javac.main.Arguments.init(Arguments.java:247)
        at jdk.compiler/com.sun.tools.javac.api.JavacTool.getTask(JavacTool.java:191)
        at jdk.compiler/com.sun.tools.javac.api.JavacTool.getTask(JavacTool.java:119)
        at jdk.compiler/com.sun.tools.javac.launcher.Main.compile(Main.java:400)
        at jdk.compiler/com.sun.tools.javac.launcher.Main.run(Main.java:205)
        at jdk.compiler/com.sun.tools.javac.launcher.Main.main(Main.java:135)
```

伝統的な書き方では問題ありません：

```java:Traditional.java
public class Traditional{
  public static void main(String[] args){
    System.out.println(System.getProperty("os.arch"));
  }
}
```

```bash
java /tmp/Traditional.java
```

```log
riscv64
```

## …という記事を書いているうちに

[アリエクの Milk-V Mars 在庫](https://ja.aliexpress.com/item/1005006777867681.html)が復活していました。しかし私はエミュレータで遊んでいるうちになんとなく満足してしまったので、物欲が湧いた頃に再検討することとします（トホホ）。

## 参考リンク

* [JEP 422: Linux/RISC-V Port](https://openjdk.org/jeps/422)
* [Ubuntu 24.04 LTSのMilk-V Marsサポートの公式発表、.NETパッケージツールチェインのメンテナンスツール“flamenco” | gihyo.jp](https://gihyo.jp/admin/clip/01/ubuntu-topics/202405/31)
* [【RISC-V・Ubuntu】QemuでRISC-Vシミュレータを構築する](https://qiita.com/daisukeokaoss/items/9d50e3394d25e18fefcc)
* [RISC-V/QEMU - Ubuntu Wiki](https://wiki.ubuntu.com/RISC-V/QEMU)
* [Download Ubuntu for RISC-V Platforms | Ubuntu](https://ubuntu.com/download/risc-v)
* [Eclipse Temurin 21 and 22 Available on RISC-V | Adoptium](https://adoptium.net/blog/2024/04/eclipse-temurin-21-and-22-available-on-riscv/)
* [Java 21 and 22 Now Available on RISC-V: A Collaboration Between RISE and Eclipse Adoptium – RISC-V International](https://riscv.org/blog/2024/04/java-21-and-22-now-available-on-risc-v-a-collaboration-between-rise-and-eclipse-adoptium/)
* [riscv64 - Eclipse Temurin™ Latest Releases](https://adoptium.net/temurin/releases/?arch=riscv64)
