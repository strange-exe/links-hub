import type { Metadata } from "next";
import Aurora from "@/components/Aurora";
import ResumeViewer from "@/components/ResumeViewer";
import { profile } from "@/lib/profile";

export const metadata: Metadata = {
  title: `Resume · ${profile.name}`,
  description: `Resume of ${profile.name}: ${profile.role}. ${profile.status}.`,
  alternates: { canonical: "/resume/" },
};

export default function ResumePage() {
  return (
    <>
      <Aurora />
      <main className="viewer-page">
        <ResumeViewer src={profile.resume} fileName="Abhinesh-Gangwar-Resume.pdf" title="RESUME.PDF" />
        <noscript>
          <p className="viewer-noscript">
            The viewer needs JavaScript. <a href={profile.resume}>Open the resume PDF</a>.
          </p>
        </noscript>
      </main>
    </>
  );
}
