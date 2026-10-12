// Copies the PDF.js worker and standard font data into public/pdfjs/<version>/ (runs before every build).
// Versioned paths keep the worker in lockstep with the bundled library and make the files safe to cache forever.
import { cp, mkdir, readFile, rm } from "node:fs/promises";

const pkgDir = new URL("../node_modules/pdfjs-dist/", import.meta.url);
const { version } = JSON.parse(await readFile(new URL("package.json", pkgDir), "utf8"));
const outRoot = new URL("../public/pdfjs/", import.meta.url);
const out = new URL(`${version}/`, outRoot);

await rm(outRoot, { recursive: true, force: true }); // drop workers from older versions
await mkdir(out, { recursive: true });
await cp(new URL("build/pdf.worker.min.mjs", pkgDir), new URL("pdf.worker.min.mjs", out));
await cp(new URL("standard_fonts/", pkgDir), new URL("standard_fonts/", out), { recursive: true });
console.log(`pdf.js ${version} worker + standard fonts copied to public/pdfjs/${version}/`);
