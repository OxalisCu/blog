/* eslint-disable no-console -- This command-line tool reports processing results to the user. */
import { constants } from "node:fs";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";

const { values } = parseArgs({
  options: {
    input: { type: "string", default: ".local-images" },
    output: { type: "string", default: "public/images" },
    width: { type: "string", default: "1600" },
    quality: { type: "string", default: "82" },
    lossless: { type: "boolean", default: false },
    overwrite: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(filename)));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

function contains(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function main() {
  if (values.help) {
    console.log(`本地图片处理（保留原图）
pnpm images:optimize [--input .local-images] [--output public/images]
                    [--width 1600] [--quality 82] [--lossless] [--overwrite]

PNG/JPG/JPEG/WebP 转为 WebP；默认缩至不超过 1600px 宽，不放大。
--lossless 用于文字截图：保留尺寸，使用无损 WebP。
SVG/GIF 原样复制；动画 WebP 原样复制，避免丢失帧。
保留子目录；已有输出默认不覆盖，更新图片时加 --overwrite。`);
    return;
  }
  const input = path.resolve(values.input);
  const output = path.resolve(values.output);
  const width = Number(values.width);
  const quality = Number(values.quality);
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 100
  ) {
    throw new Error("width 必须是正整数，quality 必须是 1–100 的整数。");
  }
  if (contains(input, output) || contains(output, input)) {
    throw new Error("原图与输出目录必须分开，且不能互相包含。");
  }
  const files = (await collect(input)).filter(file =>
    /\.(png|jpe?g|webp|svg|gif)$/i.test(file)
  );
  const targets = new Set();
  const jobs = files.map(source => {
    const relative = path.relative(input, source);
    const extension = path.extname(source).toLowerCase();
    const copy = extension === ".svg" || extension === ".gif";
    const destination = path.join(
      output,
      copy ? relative : relative.replace(/\.[^.]+$/, ".webp")
    );
    const key =
      process.platform === "win32" ? destination.toLowerCase() : destination;
    if (targets.has(key))
      throw new Error(`同名图片会产生相同输出：${destination}。请先改名。`);
    targets.add(key);
    return { source, destination, copy };
  });
  let processed = 0;
  for (const job of jobs) {
    if (!values.overwrite) {
      try {
        await stat(job.destination);
        console.log(`跳过已有文件：${path.relative(output, job.destination)}`);
        continue;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    const metadata = job.copy ? null : await sharp(job.source).metadata();
    if (
      (metadata?.pages ?? 1) > 1 &&
      path.extname(job.source).toLowerCase() !== ".webp"
    ) {
      throw new Error(`暂不转换多帧 PNG，请原样保存这张图片：${job.source}`);
    }
    const copy = job.copy || (metadata.pages ?? 1) > 1;
    await mkdir(path.dirname(job.destination), { recursive: true });
    if (copy) {
      await copyFile(
        job.source,
        job.destination,
        values.overwrite ? 0 : constants.COPYFILE_EXCL
      );
    } else {
      let image = sharp(job.source).rotate();
      if (!values.lossless)
        image = image.resize({ width, withoutEnlargement: true });
      const buffer = await image
        .webp({ quality, lossless: values.lossless, effort: 6 })
        .toBuffer();
      await writeFile(job.destination, buffer, {
        flag: values.overwrite ? "w" : "wx",
      });
    }
    const original = await stat(job.source);
    const published = await stat(job.destination);
    console.log(
      `${path.relative(output, job.destination)}：${(original.size / 1024).toFixed(1)} → ${(published.size / 1024).toFixed(1)} KB${copy ? "（原样复制）" : ""}`
    );
    processed++;
  }
  console.log(`完成 ${processed} 张，原图全部保留。`);
}

main().catch(error => {
  console.error(`图片处理失败：${error.message}`);
  process.exitCode = 1;
});
