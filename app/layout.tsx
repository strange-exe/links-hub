import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_URL, groups, profile } from "@/lib/profile";
import "./globals.css";

// Display/body: Plus Jakarta Sans. Labels: JetBrains Mono, the same mono abhinesh.codes uses.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const description = `${profile.role}. ${profile.tagline} ${profile.status}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${profile.name} · Links`,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: `${profile.name} · Links`,
    title: `${profile.name} · Links`,
    description,
  },
  twitter: { card: "summary_large_image", title: `${profile.name} · Links`, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06050d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f6fc" },
  ],
};

// Runs before first paint so a saved colour mode or paused motion never flashes the wrong state.
// Constant string with no user data; keys and values match lib/prefs.ts.
const prefsScript = `try{var d=document.documentElement,t=localStorage.getItem("theme");if(t==="light"||t==="dark")d.dataset.theme=t;if(localStorage.getItem("motion")==="paused")d.dataset.motion="paused"}catch(e){}`;

// Person schema so search engines can link these profiles together.
const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: SITE_URL,
  email: `mailto:${profile.email}`,
  jobTitle: "Student, B.Tech CSE (AI & ML)",
  affiliation: { "@type": "CollegeOrUniversity", name: "Graphic Era" },
  address: { "@type": "PostalAddress", addressLocality: "Dehradun", addressCountry: "IN" },
  sameAs: groups.flatMap((g) => g.links.map((l) => l.href)),
};

// Characters that must not appear raw inside an inline <script>: <, >, & and the two JS line separators.
const UNSAFE_IN_SCRIPT = new Set([0x3c, 0x3e, 0x26, 0x2028, 0x2029]);

/** JSON safe to embed in a <script> tag: unsafe characters become \uXXXX escapes, which JSON parsers read back. */
function safeJson(value: unknown) {
  let out = "";
  for (const ch of JSON.stringify(value)) {
    const code = ch.charCodeAt(0);
    out += UNSAFE_IN_SCRIPT.has(code) ? "\\u" + code.toString(16).padStart(4, "0") : ch;
  }
  return out;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The prefs script may set data-theme / data-motion before React hydrates.
    <html lang="en" className={`${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(personLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
