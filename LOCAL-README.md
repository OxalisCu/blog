# 本地博客说明

当前项目：Astro 7 + AstroPaper 6.1 + TypeScript + Tailwind CSS。
上游模板：https://github.com/satnaing/astro-paper
origin 指向自己的博客仓库：https://github.com/OxalisCu/blog.git
upstream 指向模板作者的仓库，用于参考上游更新。

## 本地运行

```powershell
cd C:\A-WORK\ideas\blog
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 4321
```

访问 http://127.0.0.1:4321/ 。Astro 7 开发服务在后台运行；停止命令：pnpm exec astro dev stop。

pnpm build：类型检查、生成 dist/ 静态站点及 Pagefind 搜索索引。
pnpm preview：预览构建结果。
pnpm lint：检查代码。

## 写作与配置

- 文章：src/content/posts/*.md（支持 .mdx）
- 关于：src/content/pages/about.md
- 网站信息：astro-paper.config.ts
- 中文导航：src/i18n/lang/zh-CN.ts
- 字体：src/styles/theme.css；正文排版：src/styles/global.css
- 上游演示文章和动态分享图代码在 .template-reference/，不参与构建。

标题、导航和正文使用系统无衬线字体，Mac 优先苹方，Windows 优先微软雅黑，后备 Noto Sans 和 Arial。代码块及行内代码使用 SFMono-Regular、Consolas 等等宽字体；文章正文行高 1.9。各设备字形取决于已安装字体。

动态分享图已关闭，使用静态默认图。部署前将 site.url 改为正式域名，替换 public/default-og.jpg 为自己的分享图。

## 本地配图（暂不使用图床）

图片与网站一起部署。推荐按文章建子目录：

```text
.local-images/旅行/photo.jpg       # 原图，仅本地保存，Git 忽略
public/images/旅行/photo.webp      # 发布版，提交到 Git 并随网站部署
src/content/posts/travel.md        # Markdown 文章
```

先手动创建 `.local-images`，放入原图，然后运行：

```powershell
pnpm images:optimize
```

工具递归处理 PNG、JPG、JPEG 和 WebP：默认最大宽度 1600px，不放大；WebP 有损质量为 82。SVG 和 GIF 原样复制，动画 WebP 也原样复制。所有原图始终保留，子目录保持不变。已有发布图片默认跳过，更新原图后加 `--overwrite`。同目录下 `photo.png` 和 `photo.jpg` 会因输出同名而报错，请先改名。

文字截图或需要无损压缩的图片单独处理，保留原始尺寸：

```powershell
pnpm images:optimize --input .local-images/screenshots --output public/images/screenshots --lossless
```

也可以指定宽度和质量：

```powershell
pnpm images:optimize --input .local-images/旅行 --output public/images/旅行 --width 1200 --quality 85 --overwrite
```

文章引用发布图片：

```markdown
![沿途的风景](/images/旅行/photo.webp)
```

`public/` 下的图片原样复制到 `dist/`；这里的压缩发生在手动运行工具时，构建不会再次压缩。PNG/JPG 也可以直接放入 `public/images/` 引用，无需强制转换。WebP 不保证每张都更小，应查看工具输出的大小并检查画质。

`.local-images/` 不上传 Git，也不会部署，因此请自行备份原图。该工具依赖项目已有的 `sharp`，无需另装图片软件。
