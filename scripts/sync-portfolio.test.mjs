// npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { toFeatured } from "./sync-portfolio.mjs";

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
