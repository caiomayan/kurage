"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { PiHouse, PiMagnifyingGlass } from "react-icons/pi";
import { searchEvents } from "@/lib/search-store";
import { footerStore } from "@/lib/footer-store";

export default function NotFound() {

  useEffect(() => {
    document.title = "Kurage · Página não encontrada";
    footerStore.set(true);
    return () => footerStore.set(false);
  }, []);

  return (
    <div className="relative flex min-h-[calc(100vh-58px)] w-full flex-col items-center justify-center px-6 pt-[58px] text-center overflow-hidden">
      {/* Subtle atmospheric glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,112,243,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-lg">
        <p className="font-sans font-semibold text-[12px] font-medium uppercase tracking-widest text-charcoal">
          Erro 404
        </p>

        <h1 className="mt-4 font-display text-5xl tracking-tight text-ink sm:text-6xl">
          Página não encontrada
        </h1>

        <p className="mt-4 text-[16px] leading-relaxed text-body">
          O recurso que você tentou acessar não existe ou foi movido para outro endereço.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 text-[14px] font-medium text-ink backdrop-blur-md transition hover:bg-white/[0.12] hover:border-white/20"
          >
            <PiHouse className="h-4 w-4" aria-hidden="true" />
            <span>Página Inicial</span>
          </Link>

          <button
            onClick={() => searchEvents.emitFocus()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-transparent px-5 text-[14px] font-medium text-charcoal transition hover:text-ink hover:bg-white/5"
          >
            <PiMagnifyingGlass className="h-4 w-4" aria-hidden="true" />
            <span>Buscar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
