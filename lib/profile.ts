// Single source of truth for the page content. Edit this file to change links.

export type IconName = "github" | "linkedin" | "globe" | "instagram" | "discord" | "code";

export type LinkItem = {
  key: string;
  label: string;
  handle: string;
  href: string;
  icon: IconName;
};

export type LinkGroup = { title: string; links: LinkItem[] };

export const SITE_URL = "https://links.abhinesh.codes";

export const profile = {
  name: "Abhinesh Gangwar",
  role: "B.Tech CSE (AI & ML) at Graphic Era",
  location: "Dehradun, India",
  status: "Open to SWE or ML internships",
  tagline: "Building AI tools and intelligent systems.",
  email: "work.abhinesh@gmail.com",
  resume: "https://abhinesh.codes/resume.pdf",
  portfolio: "https://abhinesh.codes",
};

/** The scrolling strip under the page. Every item comes from abhinesh.codes (About: focus and primary stack;
 *  Revlens AI's stack), so the strip never claims a skill the portfolio doesn't. */
export const skills = [
  "Python",
  "JavaScript",
  "Node.js",
  "FastAPI",
  "PostgreSQL",
  "Applied NLP",
  "API backends",
  "Full-stack web apps",
];

export const featured = {
  title: "Revlens AI",
  summary: "Review intelligence for homestay owners: sentiment, themes and analytics dashboards.",
  stack: ["Python", "FastAPI", "PostgreSQL"],
  live: "https://revlens.abhinesh.codes/",
  source: "https://github.com/strange-exe/revlens-ai",
};

export const groups: LinkGroup[] = [
  {
    title: "Work",
    links: [
      { key: "gh", label: "GitHub", handle: "strange-exe", href: "https://github.com/strange-exe", icon: "github" },
      { key: "in", label: "LinkedIn", handle: "abhinesh-exe", href: "https://www.linkedin.com/in/abhinesh-exe", icon: "linkedin" },
      { key: "pf", label: "Portfolio", handle: "abhinesh.codes", href: "https://abhinesh.codes", icon: "globe" },
    ],
  },
  {
    title: "Elsewhere",
    links: [
      { key: "ig", label: "Instagram", handle: "_abhinesh.exe", href: "https://www.instagram.com/_abhinesh.exe/", icon: "instagram" },
      { key: "dc", label: "Discord", handle: "strange.io", href: "https://discord.com/users/1023977968562876536/", icon: "discord" },
      // URL as linked from the resume PDF. Phosphor has no LeetCode mark, so it uses the code-brackets icon.
      { key: "lc", label: "LeetCode", handle: "Abhinesh-exe", href: "https://leetcode.com/u/Abhinesh-exe/", icon: "code" },
    ],
  },
];
