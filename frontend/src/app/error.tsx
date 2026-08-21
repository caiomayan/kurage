"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PiArrowCounterClockwise, PiHouse, PiWarning } from "react-icons/pi";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error caught by boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1180px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="surface-card relative max-w-lg rounded-2xl p-8 shadow-2xl sm:p-12 border border-[var(--hairline-strong)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-red/10 text-accent-red border border-accent-red/20">
          <PiWarning className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Algo deu errado
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-body">
          Ocorreu uma falha inesperada ao carregar esta página.
        </p>

        {error.digest && (
          <p className="mt-2 font-sans font-semibold text-[11px] text-mute">
            Código do erro: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-medium"
          >
            <PiArrowCounterClockwise className="h-4 w-4" aria-hidden="true" />
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/"
            className="btn-secondary inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-medium"
          >
            <PiHouse className="h-4 w-4" aria-hidden="true" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
