---
title: VPS 自建代理指南：选购、搭建与监控
author: 酢浆草
pubDatetime: 2026-10-11T16:57:57+08:00
modDatetime: 2026-10-11T17:27:56+08:00
description: 从 MeowVPS 推荐中选择服务器，检测 IP 类型，部署 VLESS Reality、香港 TCP 中转与本地监控。
tags: [VPS, VPN, Reality, 网络, 自建服务]
featured: false
draft: false
---

本文整理一套 **美国 VPS 出口 + 香港中转** 的搭建流程。服务端使用 Xray + VLESS Reality，客户端使用 Clash Verge Rev；服务器地址和节点参数均以占位符表示。

![美国直连、香港 TCP 中转与监控数据采集架构](/images/vps-reality-hk-relay/architecture.svg)

## 1. 参考推荐，选择服务器

先看 [MeowVPS 的各地区 VPS 推荐](https://meowvps.com/blog/resrec/)，按用途筛选：

- **线路机**：主要看本地到服务器的连接质量，适合做中转入口。
- **落地机**：主要看出口 IP 和国际互连，适合连接目标网站。

此次选购时，优先考虑的几款机器没有库存，最终选择 **BlossomHost 美国 VPS**：价格低、服务器出网快。分配到的 IP 按此次查询结果属于机房 IP；用途主要是 Codex，先按可用、便宜的思路选择，实际使用效果以应用测试为准。

本地移动宽带直连美国存在波动，因此另购 **Evoxt 香港 VPS** 做中转。最终分工如下：

| 服务器           | 购买入口                                              | 用途                   | 配置                              |
| ---------------- | ----------------------------------------------------- | ---------------------- | --------------------------------- |
| BlossomHost 美国 | [官方控制台](https://blossomhost.us/#/dashboard)      | Reality 节点、最终出口 | Ubuntu 24.04，约 1 GB 内存        |
| Evoxt 香港       | [官方控制台](https://console.evoxt.com/dashboard.php) | TCP 中转               | Ubuntu 24.04，1 vCPU、512 MB 内存 |

在官网注册、选择地域和套餐、付款部署后，保存公网 IP、SSH 端口及登录凭据。购买时核对带宽、月流量和续费价格；香港入口还需要公网 IPv6，本地网络也要支持 IPv6。

## 2. 检测服务器 IP

将分配到的公网 IP 输入 [IP2Location 查询页面](https://www.ip2location.io/demo)，查看国家、运营商及用途分类，辅助判断 IP 属性。

**商家宣传、数据库分类和实际网站访问结果要分开看。** IP 查询用于选型参考；是否适合 Codex，还需要实际测试登录和使用，不能仅凭“住宅 IP”或“机房 IP”下结论。

## 3. 在美国 VPS 部署 Reality

参考 [VPS + Clash 搭建教程](https://github.com/huasanai/vps-vpn-clash-setup)，实际安装使用 [mack-a/v2ray-agent](https://github.com/mack-a/v2ray-agent) 脚本。

### 登录并安装

```bash
ssh -p <SSH_PORT> <USER>@<US_IP>

# 检查系统及端口占用
cat /etc/os-release
ss -lntup

# 下载脚本，查看后运行
curl -fsSL https://raw.githubusercontent.com/mack-a/v2ray-agent/master/install.sh \
  -o /tmp/v2ray-install.sh
sudo bash /tmp/v2ray-install.sh
```

在菜单中选择 **Xray + VLESS Reality 无域名方案**，监听端口设为 `443`，flow 使用 `xtls-rprx-vision`。按脚本提示选择握手目标，保存生成的 UUID、Reality 公钥、short-id 和 servername。

该方案无需购买自己的域名；客户端 servername 必须与服务端配置匹配。安装后检查服务并放行端口：

```bash
sudo systemctl is-active xray
sudo systemctl is-enabled xray
sudo ufw allow 443/tcp
sudo ss -lntp
```

同时在供应商安全组放行 TCP 443，并保留 SSH 管理端口。

### 导入客户端

使用支持 Reality 的 **Clash Verge Rev / Mihomo**，在“配置”页面新建本地配置，导入脚本导出的节点文件。节点结构如下，完整字段可参考 [Mihomo VLESS 文档](https://wiki.metacubex.one/en/config/proxies/vless/)：

```yaml
proxies:
  - name: 美国直连
    type: vless
    server: "<US_IP>"
    port: 443
    uuid: "<UUID>"
    network: tcp
    udp: true
    tls: true
    flow: xtls-rprx-vision
    servername: "<SERVER_NAME>"
    client-fingerprint: chrome
    reality-opts:
      public-key: "<PUBLIC_KEY>"
      short-id: "<SHORT_ID>"
```

启用配置，在代理组中选中节点，再开启系统代理或 TUN。确认能访问目标网站、出口 IP 为美国 VPS。节点文件和订阅链接包含连接凭据，不要公开。

## 4. 用香港 VPS 中转美国节点

直连速度不稳定时，可以增加香港入口，保留美国出口：

```text
本机 → 香港 Evoxt（IPv6:443）→ 美国 BlossomHost（IPv4:443）→ 网站
```

此次正式中转使用 **HAProxy TCP 转发**，香港只转发 Reality 流量，握手仍由美国 Xray 处理。原理见 [HAProxy TCP 模式文档](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/)。

### 配置 HAProxy

在香港机安装：

```bash
sudo apt update
sudo apt install -y haproxy
```

下面是可参考的最小配置。先备份已有 `/etc/haproxy/haproxy.cfg`，确认 443 没有其他服务占用，再将配置写入该文件并替换美国 IP：

```text
 global
     log /dev/log local0

 defaults
     mode tcp
     timeout connect 10s
     timeout client 5m
     timeout server 5m

 frontend reality_in
     bind [::]:443 v6only
     default_backend reality_us

 backend reality_us
     server us <US_IP>:443 check
```

校验并启动：

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl enable haproxy
sudo systemctl restart haproxy
sudo systemctl is-active haproxy
sudo ss -lntp
```

这是使用系统默认 HAProxy 服务的复现示例；此次实际部署使用了独立的 `hk-relay` systemd 服务，转发逻辑相同。

香港机的云防火墙和系统防火墙都要允许 IPv6 TCP 443。此次云防火墙仅允许家庭 IPv6 `/64` 网段访问；家庭前缀变化后需更新规则。

### 增加中转节点

复制美国 Reality 节点，只修改名称和入口地址：

```yaml
name: 香港中转 → 美国
server: "<HK_IPV6>"
port: 443
```

UUID、公钥、short-id、servername 和 flow 保持不变。在同一个 `select` 代理组里加入“美国直连”和“香港中转 → 美国”，即可手动切换。

此次合并文件为 `clash-dual-route.yaml`，在 Clash Verge Rev 导入后，通过 `PROXY` 分组选择线路。两条线路的最终出口都是美国 VPS。

中转是否加速要实测。此次一轮 2 MiB 完整下载对照中，美国直连约 **0.49 Mbps**，香港中转约 **9.17 Mbps**；这是当时的结果，不代表全天速度。

## 5. 搭建链路监控面板

监控面板采用 **Python 采集服务 + SQLite + HTML/JavaScript 页面**，将客户端、服务器和链路探测数据汇总到一个页面，方便判断速度瓶颈在哪一段。

| 数据                                   | 来源与采集方式                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 当前节点、连接数、活跃域名、上传下载量 | 读取 Mihomo 控制 API 的 `/proxies`、`/configs`、`/connections`；Windows 下通过 named pipe 连接内核                          |
| 服务器 CPU、内存、网卡流量             | Python 使用 Paramiko 经 SSH 读取 Linux `/proc/stat`、`/proc/meminfo`、`/proc/net/dev`；CPU 使用率和网速通过相邻采样差值计算 |
| 磁盘与代理服务状态                     | 经 SSH 调用 `shutil.disk_usage` 和 `systemctl is-active`，检查美国 Xray、香港中转服务                                       |
| 三段链路的建连延迟                     | 本机分别对香港、美国入口发起 TCP 连接；香港到美国的探测在香港机执行。本机探测绑定物理网卡，避免被 TUN 接管                  |
| 节点可用性、网站响应、出口 IP          | 使用 Mihomo 节点延迟接口请求 Google 204；经当前代理请求目标网站和 IP 查询接口，记录耗时、状态码与出口                       |
| 两条线路的下载速度                     | 临时启动独立 Mihomo 客户端，分别经直连和中转下载同一测试文件，不切换日常使用的节点                                          |

采集服务每约 **2 秒**更新客户端状态，服务器和链路检查每轮结束后等待 **30 秒**。结果由 Python HTTP 服务以 JSON 提供，网页定时拉取并展示流量曲线、资源状态和探测结果。

历史采样写入 SQLite，滚动保留七天，用于统计采样成功率和近期失败。统计仅覆盖实际采样时段；TCP 建连延迟不等于下载速度，网站返回 403 也应与连接超时分开显示。
