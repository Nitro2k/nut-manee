// Postbuild: write out/sw.js with a precache list of every file in out/ and a content hash
// as the cache version, so each deploy with changes gets a fresh cache.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("out");
const SKIP = new Set(["sw.js", ".DS_Store"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return files.flat();
}

/** out/reports/index.html → "/reports/", out/_next/x.js → "/_next/x.js" */
function toUrl(file) {
  const rel = "/" + path.relative(OUT, file).split(path.sep).join("/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}

const files = (await walk(OUT)).filter((f) => !SKIP.has(path.basename(f))).sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(toUrl(file));
  hash.update(await readFile(file));
}
const version = hash.digest("hex").slice(0, 12);
const urls = files.map(toUrl);

const template = await readFile(new URL("./sw-template.js", import.meta.url), "utf8");
const sw = template
  .replace('"__VERSION__"', JSON.stringify(version))
  .replace("__PRECACHE__", JSON.stringify(urls, null, 2));
await writeFile(path.join(OUT, "sw.js"), sw);
console.log(`sw.js: ${urls.length} files precached, version ${version}`);
