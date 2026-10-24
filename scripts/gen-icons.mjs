// Render public/icons/icon.svg (also the favicon) into the PWA / iOS icon PNGs in public/icons.
// Run after changing the SVG: `pnpm icons`. Output is committed (not generated at build).
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const fontCss = await readFile(
  new URL(
    "../node_modules/@fontsource-variable/noto-sans-thai/files/noto-sans-thai-thai-wght-normal.woff2",
    import.meta.url,
  ),
).then(
  (buf) =>
    `@font-face { font-family: "Noto Sans Thai"; src: url(data:font/woff2;base64,${buf.toString("base64")}); }`,
);

// name, size, corner radius (fraction of size), glyph scale (maskable keeps content in the safe zone)
const ICONS = [
  ["icon-192.png", 192, 0.22, 1],
  ["icon-512.png", 512, 0.22, 1],
  ["icon-maskable-512.png", 512, 0, 0.8],
  ["apple-touch-icon.png", 180, 0, 1], // iOS rounds the corners itself
];

const browser = await chromium.launch();
for (const [name, size, radius, scale] of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><style>${fontCss}
    html,body{margin:0;background:transparent}
    .icon{width:${size}px;height:${size}px;border-radius:${radius * size}px;overflow:hidden}
    .icon svg{width:100%;height:100%;display:block}
    .icon text{transform-origin:256px 256px;transform:scale(${scale})}
  </style><div class="icon">${svg}</div>`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator(".icon").screenshot({ omitBackground: true });
  await writeFile(new URL(`../public/icons/${name}`, import.meta.url), png);
  await page.close();
  console.log(`public/icons/${name}`);
}
await browser.close();
