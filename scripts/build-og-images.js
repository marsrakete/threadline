const fs = require("node:fs/promises");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const sharp = require("sharp");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const configPath = path.join(rootDir, "og-image.config.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const sourcePath = path.join(rootDir, config.source);
  const svg = await fs.readFile(sourcePath, "utf8");

  const renderWidth = Number(config.render?.width) || 1200;
  const renderHeight = Number(config.render?.height) || 630;
  const loadSystemFonts = config.render?.loadSystemFonts !== false;
  const background = config.render?.background || "rgba(255,255,255,0)";

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: renderWidth },
    font: { loadSystemFonts },
    background,
  });

  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const metadata = await sharp(pngBuffer).metadata();
  if (metadata.width !== renderWidth || metadata.height !== renderHeight) {
    throw new Error(`Unexpected OG image size: got ${metadata.width}x${metadata.height}, expected ${renderWidth}x${renderHeight}`);
  }

  for (const output of config.outputs || []) {
    const targetPath = path.join(rootDir, output.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    if (output.format === "png") {
      await fs.writeFile(targetPath, pngBuffer);
      continue;
    }

    if (output.format === "jpeg" || output.format === "jpg") {
      const quality = Math.max(1, Math.min(100, Number(output.quality) || 92));
      const jpegBuffer = await sharp(pngBuffer)
        .flatten({ background: "#f3f8ff" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      await fs.writeFile(targetPath, jpegBuffer);
      continue;
    }

    throw new Error(`Unsupported OG image output format: ${output.format}`);
  }

  process.stdout.write(`Built OG images from ${config.source}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
