import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, RefreshCw, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { RichHtmlContent } from "@/components/revv/RichHtmlContent";
import { fetchLegalDocuments, type LegalDocumentItem } from "@/lib/api";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Global Compliance — REVV" },
      {
        name: "description",
        content:
          "REVV Privacy Policy, European Union GDPR compliance, US CCPA/CPRA disclosures, and rider terms of service.",
      },
    ],
  }),
  component: PrivacyCompliancePage,
});

const FALLBACK_LEGAL_DOCS: LegalDocumentItem[] = [
  {
    id: "fallback-privacy",
    slug: "privacy-policy",
    title: "REVV Global Privacy Policy",
    jurisdictions: "Global · EU GDPR · UK GDPR · US CCPA/CPRA",
    version: "2.0",
    is_published: true,
    sort_order: 10,
    updated_at: new Date().toISOString(),
    content_html:
      "<h2>1. Scope & Global Privacy Standards</h2><p>REVV processes personal account identifiers and ride telemetry strictly in accordance with the European Union General Data Protection Regulation (GDPR 2016/679), UK GDPR, California CCPA/CPRA, and international data protection frameworks.</p><h2>2. Data Minimization & Telemetry Controls</h2><p>GPS tracks, speed distribution, and lean-angle metrics are recorded only when you actively start navigation or trip logging. Voice intercom audio frames are ephemeral and never archived after a ride ends.</p><blockquote>REVV never sells your personal information or location history to third parties.</blockquote>",
  },
];

function PrivacyCompliancePage() {
  const [docs, setDocs] = useState<LegalDocumentItem[]>(FALLBACK_LEGAL_DOCS);
  const [selectedSlug, setSelectedSlug] = useState<string>("privacy-policy");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fetched = await fetchLegalDocuments();
      if (!cancelled && fetched.length > 0 && fetched[0]) {
        setDocs(fetched);
        setSelectedSlug(fetched[0].slug);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDoc = docs.find((d) => d.slug === selectedSlug) ?? docs[0];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border/60 bg-background pt-32 pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-[620px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, oklch(0.645 0.205 25) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <p className="eyebrow">Governance &amp; Rider Trust</p>
          <h1 className="display-heading mt-3 text-5xl sm:text-6xl">
            PRIVACY &amp; <span className="text-primary">COMPLIANCE</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Transparent data governance tailored for riders across the European Union (GDPR), United
            States (CCPA/CPRA), and global jurisdictions.
          </p>
        </div>
      </section>

      <main className="panel flex-1 py-14">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-panel-border pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {docs.map((doc) => {
                const active = doc.slug === activeDoc?.slug;
                return (
                  <button
                    key={doc.slug}
                    type="button"
                    onClick={() => setSelectedSlug(doc.slug)}
                    className={[
                      "rounded-lg px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-panel-card border border-panel-border text-panel-fg hover:border-primary",
                    ].join(" ")}
                  >
                    {doc.title}
                  </button>
                );
              })}
            </div>

            {loading && (
              <span className="inline-flex items-center gap-2 font-mono text-xs text-panel-muted">
                <RefreshCw className="size-3.5 animate-spin text-primary" />
                Syncing latest policy…
              </span>
            )}
          </div>

          {activeDoc && (
            <article className="panel-card mt-8 p-6 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-panel-border pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="size-3.5" />v{activeDoc.version}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-panel-border bg-panel px-3 py-1 font-mono text-xs text-panel-muted">
                    <Globe2 className="size-3.5 text-primary" />
                    {activeDoc.jurisdictions}
                  </span>
                </div>
                <span className="font-mono text-xs text-panel-muted">
                  Updated{" "}
                  {new Date(activeDoc.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <h2 className="display-heading-panel mt-6 text-3xl">{activeDoc.title}</h2>

              <div className="mt-6">
                <RichHtmlContent html={activeDoc.content_html} variant="light" />
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-panel-border pt-6 text-sm text-panel-muted">
                <span>Questions or GDPR/CCPA data requests? Use the in-app Support portal.</span>
                <Link
                  to="/news"
                  className="font-display text-sm font-bold uppercase tracking-wide text-primary hover:underline"
                >
                  Back to Newsroom
                </Link>
              </div>
            </article>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
