// Minimal static server for the exported site in out/ (local preview and e2e tests only).
// It applies out/_headers the way Cloudflare's static assets do, so tests run under the real CSP.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", // module workers (pdf.js) need a JS MIME type
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

// Parses the _headers subset we generate: a path pattern line (optional single trailing *), then indented
// "Name: value" lines. Rules are applied in file order; later identical names are joined with ", " like Cloudflare.
async function loadHeaderRules() {
  const text = await readFile(path.join(root, "_headers"), "utf8").catch(() => "");
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: [] });
    else {
      const i = line.indexOf(":");
      rules.at(-1)?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}
const matches = (pattern, urlPath) =>
  pattern.endsWith("*") ? urlPath.startsWith(pattern.slice(0, -1)) : urlPath === pattern;

async function resolveFile(urlPath) {
  const target = path.resolve(root, "." + urlPath);
  // Refuse anything that escapes out/ (e.g. /../package.json).
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  try {
    const s = await stat(target);
    return s.isDirectory() ? path.join(target, "index.html") : target;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const extra = {};
  for (const rule of await loadHeaderRules()) {
    if (!matches(rule.pattern, urlPath)) continue;
    for (const [name, value] of rule.headers) extra[name] = extra[name] ? `${extra[name]}, ${value}` : value;
  }
  const file = urlPath.endsWith("/_headers") ? null : await resolveFile(urlPath); // never serve _headers itself
  try {
    if (!file) throw new Error("not found");
    const body = await readFile(file);
    res.writeHead(200, {
      ...extra,
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    const notFound = await readFile(path.join(root, "404.html")).catch(() => "Not found");
    res.writeHead(404, { ...extra, "Content-Type": "text/html; charset=utf-8" });
    res.end(notFound);
  }
}).listen(port, "127.0.0.1", () => console.log(`serving out/ at http://127.0.0.1:${port}`));
