const path = require("node:path");
const sharp = require("/Users/makaroshckamail.ru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

const siteRoot = path.resolve(__dirname, "..");
const source = path.join(siteRoot, "public/assets/logo-lab/transparent/59-transparent.png");

async function makeIcon(size, filename, { transparent = false } = {}) {
  // The browser renders this icon at only 16–32 px. Keep the tile fully opaque
  // and let the wordmark occupy almost the entire width so SKS stays readable.
  const inset = Math.max(1, Math.round(size * 0.02));
  const logo = await sharp(source)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: size - inset * 2,
      height: Math.round(size * 0.48),
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.65 })
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 17, g: 21, b: 24, alpha: 1 },
    },
  });
  const output = canvas
    .composite([{
      input: logo,
      left: Math.round((size - meta.width) / 2),
      top: Math.round((size - meta.height) / 2),
    }]);

  if (!transparent) output.removeAlpha();
  await output.png({ compressionLevel: 9 }).toFile(path.join(siteRoot, "public", filename));
}

Promise.all([
  makeIcon(32, "favicon-sks59-no-frame.png", { transparent: true }),
  makeIcon(32, "favicon-59-32.png", { transparent: true }),
  makeIcon(64, "favicon-59.png", { transparent: true }),
  makeIcon(180, "apple-touch-icon-59.png"),
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
