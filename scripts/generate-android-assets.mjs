#!/usr/bin/env node
/**
 * Generates Capacitor icon + splash PNGs for Android.
 * Run: node scripts/generate-android-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const resourcesDir = join(root, "resources");

const BG = "#0a0a0a";
const INDIGO = "#6366f1";

function infinitySvg(size, showLabel = false) {
  const fontSize = Math.round(size * 0.42);
  const labelSize = Math.round(size * 0.09);
  const labelY = size * 0.72;
  const label = showLabel
    ? `<text x="50%" y="${labelY}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${labelSize}" font-weight="600" fill="#ffffff">Refine<tspan fill="${INDIGO}">AI</tspan></text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="${fontSize}" fill="${INDIGO}">∞</text>
  ${label}
</svg>`;
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Install sharp: npm install sharp --save-dev");
    process.exit(1);
  }

  await mkdir(resourcesDir, { recursive: true });

  const iconSvg = infinitySvg(1024, false);
  const splashSvg = infinitySvg(2732, true);

  await sharp(Buffer.from(iconSvg)).png().toFile(join(resourcesDir, "icon.png"));
  await sharp(Buffer.from(splashSvg)).png().toFile(join(resourcesDir, "splash.png"));
  await writeFile(join(resourcesDir, "icon.svg"), iconSvg);

  console.log("Generated resources/icon.png and resources/splash.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
