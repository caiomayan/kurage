import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-canvas px-6 pb-24 pt-28 text-ink">
      <article className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--kurage-accent)]">
          {eyebrow}
        </p>
        <h1 className="mt-5 font-display text-5xl leading-none tracking-tight sm:text-7xl">
          {title}
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-body">{summary}</p>

        <aside className="mt-10 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-5 text-sm leading-6 text-amber-100/80">
          <strong className="text-amber-200">Minuta de pré-lançamento.</strong>{" "}
          Este texto ainda exige identificação do controlador, canal de contato e
          revisão jurídica antes da abertura pública de cadastros ou pagamentos.
        </aside>

        <div className="mt-14 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {sections.map((section) => (
            <section key={section.title} className="py-9">
              <h2 className="font-display text-3xl tracking-tight">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-body">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <nav aria-label="Documentos legais" className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link className="text-[var(--kurage-accent)] hover:underline" href="/legal/terms">Termos</Link>
          <Link className="text-[var(--kurage-accent)] hover:underline" href="/legal/privacy">Privacidade</Link>
          <Link className="text-[var(--kurage-accent)] hover:underline" href="/legal/acceptable-use">Uso aceitável</Link>
        </nav>
      </article>
    </div>
  );
}
