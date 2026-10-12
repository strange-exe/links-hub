import {
  ArrowUpRightIcon,
  CodeIcon,
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  GlobeSimpleIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
} from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";
import Aurora from "@/components/Aurora";
import FooterTools from "@/components/FooterTools";
import Monogram from "@/components/Monogram";
import ScrambleText from "@/components/ScrambleText";
import Spotlight from "@/components/Spotlight";
import { featured, groups, profile, type IconName } from "@/lib/profile";

const ICONS: Record<IconName, typeof GithubLogoIcon> = {
  github: GithubLogoIcon,
  linkedin: LinkedinLogoIcon,
  globe: GlobeSimpleIcon,
  instagram: InstagramLogoIcon,
  discord: DiscordLogoIcon,
  code: CodeIcon,
};

/** Stagger index for the entrance sequence. */
const rise = (i: number) => ({ className: "rise", style: { "--i": i } as CSSProperties });

export default function Page() {
  return (
    <>
      <a className="skip" href="#links">
        Skip to links
      </a>
      <Aurora />
      <Spotlight />

      <main className="page">
        <header className="identity">
          <div {...rise(0)}>
            <Monogram />
          </div>
          <h1 className="name rise" style={{ "--i": 1 } as CSSProperties}>
            {profile.name}
          </h1>
          <p className="role rise" style={{ "--i": 2 } as CSSProperties}>
            {profile.role}, {profile.location.split(",")[0]}. {profile.tagline}
          </p>
          <p className="status rise" style={{ "--i": 3 } as CSSProperties}>
            <span className="dot" aria-hidden="true" />
            <ScrambleText text={profile.status} durationMs={900} />
          </p>
          <div className="ctas rise" style={{ "--i": 4 } as CSSProperties}>
            {/* Opens the in-site viewer (app/resume). A plain <a>, not next/link: the static export's
                nested RSC prefetch file names 404 on plain hosts (__next.resume.__PAGE__.txt). */}
            <a className="cta" href="/resume/">
              View resume
              <span className="nub" aria-hidden="true">
                <ArrowUpRightIcon size={18} weight="bold" />
              </span>
            </a>
            <a className="pill" href={`mailto:${profile.email}`}>
              <EnvelopeSimpleIcon size={18} weight="light" aria-hidden="true" />
              Email
            </a>
          </div>
        </header>

        <div className="content">
          <section className="shell rise" style={{ "--i": 5 } as CSSProperties} aria-labelledby="feat-h">
            <div className="feat spot">
              {/* Comment-style label, as on abhinesh.codes */}
              <p className="kicker">{"// featured project"}</p>
              <h2 id="feat-h">{featured.title}</h2>
              <p>{featured.summary}</p>
              <ul className="stack" aria-label="Tech stack">
                {featured.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="feat-links">
                <a href={featured.live}>
                  Live demo <ArrowUpRightIcon size={14} weight="bold" aria-hidden="true" />
                </a>
                <a href={featured.source}>
                  Source <ArrowUpRightIcon size={14} weight="bold" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          <nav id="links" aria-label="Profiles">
            {groups.map((group, gi) => (
              <section className="group rise" style={{ "--i": 6 + gi } as CSSProperties} key={group.title} aria-labelledby={`g-${group.title}`}>
                <h2 className="group-h" id={`g-${group.title}`}>
                  {group.title}
                </h2>
                <ul className="links">
                  {group.links.map((link) => {
                    const LinkIcon = ICONS[link.icon];
                    return (
                      <li key={link.key}>
                        <a className="link spot" href={link.href} rel="me">
                          <span className="tile" aria-hidden="true">
                            <LinkIcon size={22} weight="light" />
                          </span>
                          {link.label}
                          <span className="handle">{link.handle}</span>
                          <ArrowUpRightIcon className="go" size={16} weight="light" aria-hidden="true" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>

        </div>

        <footer className="foot rise" style={{ "--i": 8 } as CSSProperties}>
          <FooterTools />
          <p className="fine">
            © {new Date().getFullYear()} {profile.name}. More work at <a href={profile.portfolio}>abhinesh.codes</a>
          </p>
        </footer>
      </main>
    </>
  );
}
