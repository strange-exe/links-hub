// npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fetchProjects, toFeatured } from "./sync-portfolio.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
// A fake fetch serving `bodies` in turn (the last one repeats), recording the URLs asked for.
const server = (bodies) => {
  const urls = [];
  const impl = async (url) => {
    urls.push(String(url));
    const body = bodies[Math.min(urls.length - 1, bodies.length - 1)];
    return new Response(body, { status: 200 });
  };
  return { impl, urls };
};
const noSleep = async () => {};

test("without an expected hash, fetches once", async () => {
  const s = server(['[{"a":1}]']);
  assert.deepEqual(await fetchProjects({ fetchImpl: s.impl, sleep: noSleep }), [{ a: 1 }]);
  assert.equal(s.urls.length, 1);
});

test("waits until the live file matches the expected hash, with a cache-busting URL", async () => {
  const fresh = '[{"id":"new"}]';
  const s = server(['[{"id":"old"}]', '[{"id":"old"}]', fresh]);
  assert.deepEqual(await fetchProjects({ expect: sha(fresh), fetchImpl: s.impl, sleep: noSleep }), [{ id: "new" }]);
  assert.equal(s.urls.length, 3);
  assert.ok(s.urls.every((u) => u.includes(`v=${sha(fresh)}`)), s.urls.join());
});

test("gives up after the last try instead of copying a stale file", async () => {
  const s = server(['[{"id":"old"}]']);
  await assert.rejects(fetchProjects({ expect: sha("x"), tries: 4, fetchImpl: s.impl, sleep: noSleep }), /still not deployed after 4 tries/);
  assert.equal(s.urls.length, 4);
});

test("rejects an expected hash that isn't 64 hex characters", async () => {
  const s = server(["[]"]);
  await assert.rejects(fetchProjects({ expect: "abc;rm -rf", fetchImpl: s.impl, sleep: noSleep }), /not a sha256/);
  assert.equal(s.urls.length, 0);
});

const revlens = {
  id: "revlens-ai",
  title: "Revlens AI",
  description: "Long description.",
  tagline: "**AI-powered review intelligence** for homestay owners.",
  stack: ["Python", "FastAPI", "JavaScript", "PostgreSQL"],
  demo_url: "https://revlens.abhinesh.codes/",
  github_url: "https://github.com/strange-exe/revlens-ai",
  pinned: true,
  featured_order: 0,
};

test("maps the first pinned project to the card", () => {
  const other = { ...revlens, id: "epoch", title: "Epoch", pinned: false, featured_order: 1 };
  assert.deepEqual(toFeatured([other, revlens]), {
    title: "Revlens AI",
    summary: "AI-powered review intelligence for homestay owners.",
    stack: ["Python", "FastAPI", "JavaScript"],
    live: "https://revlens.abhinesh.codes/",
    source: "https://github.com/strange-exe/revlens-ai",
  });
});

test("falls back to the first featured project, and to the description", () => {
  const p = { ...revlens, pinned: false, tagline: null };
  assert.equal(toFeatured([p]).summary, "Long description.");
});

test("shortens long summaries to whole sentences, or whole words", () => {
  const long = "ExecFlow is a code editor in the browser for students. It runs Python and C on your own device and works offline as an installable web app, and it turns code into flowcharts you can step through.";
  assert.equal(toFeatured([{ ...revlens, tagline: null, description: long }]).summary, "ExecFlow is a code editor in the browser for students.");
  const words = toFeatured([{ ...revlens, tagline: null, description: "word ".repeat(60) }]).summary;
  assert.ok(words.length <= 160 && words.endsWith("word" + String.fromCodePoint(0x2026)), words);
});

test("drops non-https links instead of rendering them", () => {
  const p = toFeatured([{ ...revlens, demo_url: "javascript:alert(1)" }]);
  assert.equal(p.live, null);
  assert.throws(() => toFeatured([{ ...revlens, github_url: "http://github.com/x" }]), /https GitHub URL/);
});

test("refuses a feed with nothing usable", () => {
  assert.throws(() => toFeatured({}), /not a list/);
  assert.throws(() => toFeatured([{ ...revlens, pinned: false, featured_order: null }]), /no pinned/);
  assert.throws(() => toFeatured([{ ...revlens, title: "" }]), /lacks/);
});
