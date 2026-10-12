// Minimal static server for the exported site in out/ (local preview and e2e tests only).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", // module workers (pdf.js) need a JS MIME type
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = path.resolve(root, "." + decoded);
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
  const file = await resolveFile(req.url ?? "/");
  try {
    if (!file) throw new Error("not found");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    const notFound = await readFile(path.join(root, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(notFound);
  }
}).listen(port, "127.0.0.1", () => console.log(`serving out/ at http://127.0.0.1:${port}`));
