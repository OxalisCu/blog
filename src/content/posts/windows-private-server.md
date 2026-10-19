---
title: 把闲置电脑变成私人服务器
author: 酢浆草
pubDatetime: 2026-10-20T01:33:21+08:00
description: 把大学时留下的旧电脑用作私人服务器，通过 SSH 远程管理，用 Tailscale 访问自己的网页和小工具。
tags: [Windows, 自建服务, Tailscale]
draft: false
---

我还留着一台大学时用的电脑，后来屏幕坏了，就一直放着没怎么用。最近做了些自娱自乐的个人项目，只给自己用，没必要专门租云服务器、买域名，就正好拿它当服务器，放在家里跑项目。平时用 SSH 远程操作，再通过 Tailscale 把手机和电脑连到同一个私人网络里，出门也能访问，不用开放公网入口。自己搭个博客、信息流、日记或者小网盘，都可以这样搞。

![日常电脑通过 Tailscale 和 SSH 管理家里的旧电脑，手机通过私人 HTTPS 入口访问部署的服务](/images/windows-private-server/connection.svg)

## 1. 开启 SSH，远程管理电脑

先把闲置电脑接上电源和网络，关闭自动睡眠。

在闲置电脑上，用管理员 PowerShell 安装并启动 Windows OpenSSH Server：

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
```

安装通常会同时创建允许 TCP 22 入站的防火墙规则，具体见[微软安装说明](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)。

先让两台电脑连接同一个局域网，在日常电脑上执行下面的命令，将尖括号部分替换成闲置电脑的 Windows 用户名和局域网 IP：

```powershell
ssh "<Windows用户名>@<闲置电脑的局域网IP>"
```

首次连接时核对主机指纹，确认是自己的电脑后接受，再输入 Windows 用户密码。登录成功后，就能远程执行命令、安装依赖和启动应用，不必一直开着远程桌面。

## 2. 用 Tailscale 连接自己的设备

从[Tailscale 官方下载页](https://tailscale.com/download)安装客户端，让两台电脑和手机使用同一账号登录，并确认设备已连接。

它们会加入同一个私人网络。以后即使手机使用流量、电脑连接不同 Wi-Fi，也可以通过这个网络互相访问，不需要在路由器上配置公网端口映射。

在 Tailscale 的设备列表里找到闲置电脑的地址，在日常电脑上连接：

```powershell
tailscale ping <闲置电脑的Tailscale-IP>
ssh "<Windows用户名>@<闲置电脑的Tailscale-IP>"
```

这里仍由 Windows OpenSSH 提供 SSH 服务，Tailscale 只负责联网。确认连接可用后，可以把 Windows 防火墙的 SSH 放行范围收窄到日常电脑的 Tailscale IP。

如果希望退出 Windows 登录后仍能远程连接，在服务器的 Tailscale 托盘菜单中开启 **Preferences → Run unattended**，见[官方说明](https://tailscale.com/docs/how-to/run-unattended)。

## 3. 部署应用，提供私人 HTTPS 入口

### 先把服务运行起来

在闲置电脑上安装应用需要的环境和依赖，再按项目说明启动。应用运行在这台电脑上，数据库、文件和配置也放在这里。

下面用一个简单网页演示。闲置电脑已安装 Python 时，可以在 PowerShell 中执行：

```powershell
New-Item -ItemType Directory -Path C:\Apps\my-site -Force
Set-Content -LiteralPath C:\Apps\my-site\index.html -Value 'Hello from my Windows server.'
python -m http.server 8877 --bind 127.0.0.1 --directory C:\Apps\my-site
```

现在，在闲置电脑的浏览器打开 `http://127.0.0.1:8877/`，应能看到刚才写入的文字。保持这个终端运行，按 `Ctrl+C` 会停止服务。

`127.0.0.1` 表示只接受本机连接。接下来由 Tailscale Serve 接收私人网络中的访问，再转给这个端口。

### 用 Serve 提供访问地址

在闲置电脑另开一个 PowerShell，执行：

```powershell
tailscale serve --bg http://127.0.0.1:8877
tailscale serve status
```

首次运行时，按提示打开授权页面并启用 HTTPS。这里只需要 **Serve**，不要启用用于公网分享的 **Funnel**。两者的访问范围见[官方 Serve 说明](https://tailscale.com/docs/features/tailscale-serve)。

命令会显示一个以 `.ts.net` 结尾的 HTTPS 地址。手机保持 Tailscale 已连接，用浏览器打开这个完整地址，就能访问闲置电脑上的网页，也可以把它添加到手机桌面。

`--bg` 会保存 Serve 的后台转发配置，但不会代替应用保持运行，详见[Serve 命令说明](https://tailscale.com/docs/reference/tailscale-cli/serve)。示例中的 Python 终端仍需保持开启。

换成博客、日记、信息流或网盘时，按相应项目的方式启动服务，再把 Serve 指向它实际监听的本机端口即可。如果应用限制访问域名或需要配置站点地址，使用 Serve 给出的完整 HTTPS 域名。

这套入口只供私人网络内获准的设备访问。HTTPS 证书中的设备域名会进入公开证书日志，命名时避免使用私人信息；域名公开不代表服务开放到公网，见[官方 HTTPS 说明](https://tailscale.com/docs/how-to/set-up-https-certificates)。
