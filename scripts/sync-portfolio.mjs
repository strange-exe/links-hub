// Copies the featured project from the portfolio into lib/featured.json.
// The portfolio (abhinesh.codes, repo strange-exe.github.io) decides what's pinned: its build writes projects.json,
// and the first pinned project there is the one this page features. The file is committed, so `npm run build`
// never needs the network; .github/workflows/sync-portfolio.yml runs this on a schedule and commits changes.
// Usage: node scripts/sync-portfolio.mjs [--check]   (--check: exit 1 if the file is out of date, write nothing)
//        EXPECT_SHA256=<hex> node scripts/sync-portfolio.mjs   (wait until the live projects.json has this hash)
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const SOURCE = "https://abhinesh.codes/projects.json";
const OUT = new URL("../lib/featured.json", import.meta.url);

const httpsUrl = (value) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const ELLIPSIS = String.fromCodePoint(0x2026);

/** Plain text, at most `max` characters: whole sentences when they fit, else whole words and an ellipsis. */
const text = (value, max) => {
  if (typeof value !== "string") return "";
  const s = value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const sentences = s.slice(0, max + 1).match(/^.*[.!?](?= )/);
  if (sentences) return sentences[0];
  return s.slice(0, s.lastIndexOf(" ", max - 1)).replace(/[\s,;:]+$/, "") + ELLIPSIS;
};

/** Maps projects.json to the card's shape. Throws when nothing usable is pinned, so a bad feed never ships. */
export function toFeatured(projects) {
  if (!Array.isArray(projects)) throw new Error("projects.json is not a list");
  const p = projects.find((x) => x?.pinned) ?? projects.find((x) => x?.featured_order === 0);
  if (!p) throw new Error("projects.json has no pinned or featured project");
  const featured = {
    title: text(p.title, 80),
    // The tagline is written for cards (and uses **bold** markdown, stripped here); fall back to the description.
    summary: text(p.tagline, 160) || text(p.description, 160),
    stack: (Array.isArray(p.stack) ? p.stack : []).filter((s) => typeof s === "string").slice(0, 3).map((s) => text(s, 40)),
    live: httpsUrl(p.demo_url),
    source: httpsUrl(p.github_url),
  };
  if (!featured.title || !featured.summary || !featured.source) {
    throw new Error(`pinned project "${p.id}" lacks a title, summary or https GitHub URL`);
  }
  return featured;
}

/**
 * Reads projects.json. With `expect` (the sha256 of the file the portfolio just committed, sent by its build),
 * retries until the live file has that hash: GitHub Pages deploys a minute or two after the push and its CDN
 * caches for 10 minutes, so an early read would copy the old project. The hash in the query string gives
 * each version its own cache entry.
 */
export async function fetchProjects({ expect, tries = 24, delayMs = 30_000, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  if (expect !== undefined && !/^[0-9a-f]{64}$/.test(expect)) throw new Error("expected hash is not a sha256 hex string");
  const url = expect ? `${SOURCE}?v=${expect}` : SOURCE;
  for (let attempt = 1; ; attempt++) {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!expect || createHash("sha256").update(bytes).digest("hex") === expect) return JSON.parse(bytes.toString("utf8"));
    if (attempt >= tries) throw new Error(`projects.json ${expect.slice(0, 12)} still not deployed after ${tries} tries`);
    console.log(`projects.json not deployed yet (try ${attempt}/${tries}); waiting`);
    await sleep(delayMs);
  }
}

async function main() {
  const check = process.argv.includes("--check");
  const projects = await fetchProjects({ expect: process.env.EXPECT_SHA256 || undefined });
  const next = JSON.stringify(toFeatured(projects), null, 2) + "\n";
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (next === current) {
    console.log("lib/featured.json is up to date");
    return;
  }
  if (check) {
    console.error("lib/featured.json is out of date; run node scripts/sync-portfolio.mjs");
    process.exitCode = 1;
    return;
  }
  await writeFile(OUT, next);
  console.log(`lib/featured.json updated:\n${next}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
