# 酢浆草 · 正在蒸馏 AI

一个 AI 味很浓的博客。AI 干完活了，我还在问：“这咋弄的？”

问明白了就记下来，忘了再回来抄自己的。

这里记录技术学习、实践过程，以及各种有趣的小玩意。文章和配图都保存在仓库里，通过静态站点发布，暂不使用数据库或图床。

## 技术栈与功能

- Astro 7、TypeScript、Tailwind CSS 4，构建生成静态页面。
- Markdown / MDX 写作，Shiki 代码高亮，支持表格、引用和提示块。
- 中文界面、浅色 / 深色主题、标签、归档、分页、RSS 和站点地图。
- Pagefind 本地静态搜索，无需搜索服务。
- 首页只展示“最近文章”，首页、文章列表和标签列表按发布时间倒序排列。
- 标题、导航、正文使用系统无衬线字体：Mac 优先苹方，Windows 优先微软雅黑；代码使用系统等宽字体。

## 本地运行

需要 **Node.js 22.12.0 或更高版本**，以及 **pnpm**。没有 pnpm 时可先安装：

```sh
npm install -g pnpm
```

克隆并启动：

```sh
git clone git@github.com:OxalisCu/blog.git
cd blog
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 4321
```

访问 [http://127.0.0.1:4321/](http://127.0.0.1:4321/)。

SSH 克隆需要已配置 GitHub SSH 密钥，也可以使用 HTTPS：

```sh
git clone https://github.com/OxalisCu/blog.git
```

在 Astro 7 中，开发服务默认在后台运行，可用以下命令停止：

```sh
pnpm exec astro dev stop
```

### 构建与检查

| 命令                                      | 用途                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `pnpm dev`                                | 启动本地开发服务                                 |
| `pnpm build`                              | 类型检查、生成静态页面和搜索索引，输出到 `dist/` |
| `pnpm preview`                            | 预览已构建的站点，需先运行 `pnpm build`          |
| `pnpm lint`                               | ESLint 检查                                      |
| `pnpm format:check`                       | 检查代码格式                                     |
| `pnpm images:optimize --input <输入目录>` | 按需压缩图片，生成发布版                         |

搜索索引在构建时生成。首次启动开发服务前，可以先运行一次 `pnpm build`；文章修改后若需更新搜索结果，也需重新构建。

## 目录结构

```text
.
├── AGENTS.md                   # 项目开发与架构规范
├── ARTICLE-AGENTS.md           # 文章写作与配图规范
├── astro-paper.config.ts       # 网站信息与功能配置
├── astro.config.ts             # Astro、Markdown 和代码高亮配置
├── public/
│   └── images/                 # 随网站发布的文章配图
├── scripts/
│   ├── optimize-images.mjs     # 本地图片压缩
│   └── copy-search.mjs         # 将搜索索引复制到开发服务目录
├── src/
│   ├── content/
│   │   ├── posts/              # Markdown / MDX 文章
│   │   └── pages/about.md      # 关于页面
│   ├── components/             # 页面组件
│   ├── layouts/                # 页面布局
│   ├── pages/                  # 首页、文章、标签等路由
│   ├── i18n/lang/zh-CN.ts      # 中文文案
│   └── styles/                 # 字体、颜色与正文排版
```

Agent 协作规范均放在项目根目录：`AGENTS.md` 约定项目开发方式，并要求写作前读取 `ARTICLE-AGENTS.md`；后者约定写作、日期和配图规则。

## 写文章

在 `src/content/posts/` 新建 `.md` 或 `.mdx` 文件。下面是最小示例：

```markdown
---
title: 今天又懂了一点
description: 记录一个问题从折腾到弄明白的过程。
pubDatetime: 2026-10-11T16:00:00+08:00
draft: false
tags:
  - 学习
---

## 从一个问题开始

正文写在这里。
```

- `pubDatetime`：实际发布时间，建议使用北京时间偏移 `+08:00`；同一天的文章也按具体时间倒序排列。
- `modDatetime`：可选，记录后续更新时间；不会改变文章列表的发布顺序。
- `draft: true`：草稿，本地 `pnpm dev` 时可浏览，正式构建时不生成文章页面或进入公开列表。
- `tags`：文章标签，用于自动生成标签页面。

日期需要手动填写，Git 提交或推送不会自动修改。首页不再区分精选，文章无需填写 `featured`。

生产构建会过滤草稿，以及尚未到发布时间的文章，具体容差由 `posts.scheduledPostMargin` 配置控制；本地 `pnpm dev` 显示全部文章，便于审阅草稿。`pnpm preview` 预览的是正式构建结果，仍会隐藏草稿。

## 文章配图

暂不使用图床。图片统一放在 `public/images/` 并提交 Git，让本地与远端一致。每篇文章使用与文章文件名（不含 `.md` / `.mdx`）相同的子目录，方便查找，不要求另存一套原图：

```text
src/content/posts/vps-reality-hk-relay.md
public/images/vps-reality-hk-relay/architecture.svg
```

PNG、JPG、WebP、SVG 都可以直接引用：

```markdown
![架构图](/images/vps-reality-hk-relay/architecture.svg)
```

可以直接保存 PNG / JPG 等图片。如果需要减小体积，先将待处理图片放在临时输入目录，再生成最终图片。以下示例的 `../image-input/my-post` 是自行准备的临时目录，不属于项目必需结构：

```sh
pnpm images:optimize --input ../image-input/my-post --output public/images/my-post
```

默认将 PNG / JPG / JPEG / WebP 转为 WebP，最大宽度 1600px、有损质量 82，不放大图片。SVG、GIF 和动画 WebP 原样复制。已有输出默认跳过，更新图片时加 `--overwrite`。

文字截图可以使用无损压缩，保留原始尺寸：

```sh
pnpm images:optimize --input ../image-input/my-post --output public/images/my-post --lossless
```

工具不会删除输入文件，但项目只需维护实际使用的图片，无需长期保留临时输入。图片压缩需要手动运行，构建不会再次压缩 `public/` 下的图片。

## 网站配置与部署

修改 `astro-paper.config.ts` 可以调整网站名称、描述、作者、分页数量和功能开关。首页介绍位于 `src/pages/index.astro`，关于页面位于 `src/content/pages/about.md`。

目前配置为 GitHub Pages：`https://oxaliscu.github.io/blog/`。`astro-paper.config.ts` 中的 `site.url` 用于 RSS、站点地图和规范链接，`astro.config.ts` 中的 `base` 为 `/blog`。本地开发地址也带此路径：`http://localhost:4321/blog/`。Markdown 中以 `/` 开头的站内链接和图片会自动补上 `/blog` 前缀。

仓库 Settings → Pages → Source 选择 **GitHub Actions**。`.github/workflows/deploy.yml` 会在代码推送到 `main` 时安装依赖、检查代码与格式、运行 `pnpm build`，然后将 `dist/` 上传并部署到 Pages；也可以在 Actions → Deploy to GitHub Pages → Run workflow 手动运行。无需将 `dist/` 提交到仓库。

首次发布后，在 Actions 查看 build 和 deploy 两个任务是否成功，再访问网站。现有 `ci.yml` 继续负责 PR 检查。若更换域名或仓库名称，需要同步调整 `site.url` 与 `base`；使用独立域名根目录时，`base` 改为 `/`。

目前使用静态分享图 `public/default-og.jpg`，可以替换成自己的图片。推送代码到 GitHub 与部署网站是两个独立步骤。

## 来源与许可

本项目基于 [AstroPaper 官方仓库](https://github.com/satnaing/astro-paper) 定制，感谢原作者与贡献者。保留原项目的 [MIT 许可证](LICENSE)。
