const fs = require("node:fs/promises");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const sharp = require("sharp");

const DEFAULT_RENDER_WIDTH = 1200;
const DEFAULT_RENDER_HEIGHT = 630;
const DEFAULT_JPEG_QUALITY = 92;
const DEFAULT_BACKGROUND = "rgba(255,255,255,0)";

/**
 * Returns the repository root directory for script-local file resolution.
 * @returns {string} Absolute repository root path.
 */
function getRootDir() {
  return path.resolve(__dirname, "..");
}

/**
 * Loads and parses the OG image build config.
 * @param {string} rootDir - Absolute repository root path.
 * @returns {Promise<object>} Parsed config object.
 */
async function readConfig(rootDir) {
  const configPath = path.join(rootDir, "og-image.config.json");
  const rawConfig = await fs.readFile(configPath, "utf8");
  return JSON.parse(rawConfig);
}

/**
 * Reads the configured SVG source file for OG rendering.
 * @param {string} rootDir - Absolute repository root path.
 * @param {object} config - Parsed OG image config.
 * @returns {Promise<string>} SVG source as UTF-8 text.
 */
async function readSourceSvg(rootDir, config) {
  const sourcePath = path.join(rootDir, config.source);
  return await fs.readFile(sourcePath, "utf8");
}

/**
 * Builds normalized render settings from config defaults.
 * @param {object} config - Parsed OG image config.
 * @returns {{renderWidth: number, renderHeight: number, loadSystemFonts: boolean, background: string}} Render settings.
 */
function getRenderSettings(config) {
  const renderConfig = config.render && typeof config.render === "object"
    ? config.render
    : {};

  const renderWidth = Number(renderConfig.width) || DEFAULT_RENDER_WIDTH;
  const renderHeight = Number(renderConfig.height) || DEFAULT_RENDER_HEIGHT;
  const loadSystemFonts = renderConfig.loadSystemFonts !== false;
  const background = renderConfig.background || DEFAULT_BACKGROUND;

  return {
    renderWidth,
    renderHeight,
    loadSystemFonts,
    background,
  };
}

/**
 * Renders the configured SVG to a PNG buffer.
 * @param {string} svg - SVG markup text.
 * @param {{renderWidth: number, loadSystemFonts: boolean, background: string}} renderSettings - Normalized render settings.
 * @returns {Buffer} Rendered PNG bytes.
 */
function renderSvgToPng(svg, renderSettings) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: renderSettings.renderWidth },
    font: { loadSystemFonts: renderSettings.loadSystemFonts },
    background: renderSettings.background,
  });

  const rendered = resvg.render();
  return rendered.asPng();
}

/**
 * Verifies that the rendered PNG matches the configured OG image size.
 * @param {Buffer} pngBuffer - Rendered PNG bytes.
 * @param {{renderWidth: number, renderHeight: number}} renderSettings - Expected dimensions.
 * @returns {Promise<void>} Resolves when the size is correct.
 */
async function assertRenderedSize(pngBuffer, renderSettings) {
  const metadata = await sharp(pngBuffer).metadata();
  if (metadata.width !== renderSettings.renderWidth || metadata.height !== renderSettings.renderHeight) {
    throw new Error(
      `Unexpected OG image size: got ${metadata.width}x${metadata.height}, expected ${renderSettings.renderWidth}x${renderSettings.renderHeight}`,
    );
  }
}

/**
 * Normalizes one configured JPEG quality value to Sharp's supported range.
 * @param {object} output - One output entry from the config.
 * @returns {number} JPEG quality from 1 to 100.
 */
function getJpegQuality(output) {
  const quality = Number(output.quality) || DEFAULT_JPEG_QUALITY;
  return Math.max(1, Math.min(100, quality));
}

/**
 * Writes one configured output file in the requested format.
 * @param {string} rootDir - Absolute repository root path.
 * @param {object} output - One output entry from the config.
 * @param {Buffer} pngBuffer - Canonical PNG render buffer.
 * @returns {Promise<void>} Resolves after the file was written.
 */
async function writeOutputFile(rootDir, output, pngBuffer) {
  const targetPath = path.join(rootDir, output.path);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  if (output.format === "png") {
    await fs.writeFile(targetPath, pngBuffer);
    return;
  }

  if (output.format === "jpeg" || output.format === "jpg") {
    const quality = getJpegQuality(output);
    const jpegBuffer = await sharp(pngBuffer)
      .flatten({ background: "#f3f8ff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(targetPath, jpegBuffer);
    return;
  }

  throw new Error(`Unsupported OG image output format: ${output.format}`);
}

/**
 * Returns the configured output list in array form.
 * @param {object} config - Parsed OG image config.
 * @returns {object[]} Output definitions from the config.
 */
function getOutputs(config) {
  if (!Array.isArray(config.outputs)) {
    return [];
  }
  return config.outputs;
}

/**
 * Runs the OG image build from config to final files.
 * @returns {Promise<void>} Resolves when all output files were written.
 */
async function main() {
  const rootDir = getRootDir();
  const config = await readConfig(rootDir);
  const svg = await readSourceSvg(rootDir, config);
  const renderSettings = getRenderSettings(config);
  const pngBuffer = renderSvgToPng(svg, renderSettings);

  await assertRenderedSize(pngBuffer, renderSettings);

  const outputs = getOutputs(config);
  for (const output of outputs) {
    await writeOutputFile(rootDir, output, pngBuffer);
  }

  process.stdout.write(`Built OG images from ${config.source}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
