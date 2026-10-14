import { ArrowUpRightIcon, EnvelopeSimpleIcon, FileTextIcon } from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";
import Field from "@/components/Field";
import FooterTools from "@/components/FooterTools";
import Monogram from "@/components/Monogram";
import PointerFx from "@/components/PointerFx";
import { featured, groups, profile, skills } from "@/lib/profile";

/** Stagger index for an entrance (see "motion: entrances" in globals.css). */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

/** The name as letters for the kinetic entrance; screen readers get the plain name once. */
function KineticName({ name }: { name: string }) {
  const [first, ...rest] = name.split(" ");
  let c = 0;
  const letters = (word: string) =>
    [...word].map((ch) => (
      <span className="ch" key={c} style={{ "--c": c++ } as CSSProperties}>
        {ch}
      </span>
    ));
  return (
    <h1 className="name">
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">
        <span className="line">{letters(first)}</span>
        <span className="line">{letters(`${rest.join(" ")}.`)}</span>
      </span>
    </h1>
  );
}

export default function Page() {
  return (
    <>
      <a className="skip" href="#links">
        Skip to links
      </a>
      <Field />
      <PointerFx />

      <main className="page">
        <header className="identity sheet" style={at(0)}>
          <Monogram />
          <KineticName name={profile.name} />
          <p className="role">
            {profile.role}, {profile.location.split(",")[0]}. {profile.tagline}
          </p>
          <p className="status">
            <span className="dot" aria-hidden="true" />
            {profile.status}
          </p>
          <div className="ctas">
            {/* Opens the in-site viewer (app/resume). A plain <a>, not next/link: the static export's
                nested RSC prefetch file names 404 on plain hosts (__next.resume.__PAGE__.txt). */}
            <a className="cta magnet" href="/resume/">
              <FileTextIcon size={18} weight="regular" aria-hidden="true" />
              View resume
            </a>
            <a className="pill" href={`mailto:${profile.email}`}>
              <EnvelopeSimpleIcon size={18} weight="regular" aria-hidden="true" />
              Email
            </a>
          </div>
        </header>

        <div className="content">
          <section className="shell tilt sheet" style={at(1)} aria-labelledby="feat-h">
            <div className="feat">
              <svg className="trace" aria-hidden="true" focusable="false">
                <rect x="0.75" y="0.75" rx="14" pathLength="1" />
              </svg>
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
              <section className="group" key={group.title} aria-labelledby={`g-${group.title}`}>
                <h2 className="group-h" id={`g-${group.title}`}>
                  {group.title}
                </h2>
                <ul className="links">
                  {group.links.map((link, li) => (
                    <li key={link.key} className="rise" style={at(gi * 3 + li)}>
                      <a className="link" href={link.href} rel="me">
                        <span className="lname">{link.label}</span>
                        <span className="handle">{link.handle}</span>
                        <ArrowUpRightIcon className="go" size={16} weight="regular" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <footer className="foot">
          <FooterTools />
          <p className="fine">
            © {new Date().getFullYear()} {profile.name}. More work at <a href={profile.portfolio}>abhinesh.codes</a>
          </p>
        </footer>
      </main>

      {/* Skills strip: read once as a list; the moving duplicate is hidden from assistive tech. */}
      <div className="ticker">
        <div className="run">
          <ul aria-label="Skills">
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {/* Three more copies: the strip moves by half its width (two copies), so it stays seamless with no gap
              even on wide screens where one copy is narrower than the viewport. */}
          {[1, 2, 3].map((copy) => (
            <ul aria-hidden="true" key={copy}>
              {skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </>
  );
}
