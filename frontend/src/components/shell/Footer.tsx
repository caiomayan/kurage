"use client";

import React from "react";
import Link from "next/link";
import { PiArrowRight } from "react-icons/pi";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  const pathname = usePathname();
  const isTransparent = pathname === "/mar";

  return (
    <footer className={cn("relative overflow-hidden border-t border-[var(--divider-soft)] pt-24 pb-12", isTransparent ? "bg-transparent" : "bg-canvas")} role="contentinfo">
      {/* Top Ambient Glow */}
      <div 
        className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
        style={{ background: "radial-gradient(ellipse at center, rgba(169, 200, 192, 0.08) 0%, transparent 70%)" }}
      />
      
      {/* Top Border Highlight */}
      <div className="absolute left-1/2 top-0 h-px w-full max-w-3xl -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <div className="flex flex-col gap-16 lg:flex-row lg:justify-between lg:gap-24">
          
          {/* Brand & Mission */}
          <div className="flex flex-col lg:max-w-md">
            <Link
              href="/"
              className="inline-flex items-center text-ink transition-transform hover:scale-105 active:scale-95 origin-left"
              aria-label="Kurage — Início"
            >
              <Logo size={40} />
            </Link>

            <h3 className="mt-8 font-display text-[28px] leading-tight text-ink sm:text-[36px]">
              O padrão de excelência<br />
              <span className="text-mute">para o ecossistema competitivo.</span>
            </h3>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-12 lg:gap-16">
            {/* Column 1 */}
            <div className="flex flex-col">
              <span className="font-sans font-semibold text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-6">
                Plataforma
              </span>
              <ul className="flex flex-col gap-4">
                <FooterLink href="/">Início</FooterLink>
                <FooterLink href="/mar">Mar</FooterLink>
                <FooterLink href="/ranking">Ranking</FooterLink>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col">
              <span className="font-sans font-semibold text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-6">
                Legal
              </span>
              <ul className="flex flex-col gap-4">
                <FooterLink href="#" disabled>Termos de Serviço</FooterLink>
                <FooterLink href="#" disabled>Privacidade</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-32 flex flex-col items-center justify-between gap-6 border-t border-[var(--divider-soft)] pt-8 sm:flex-row">
          <p className="font-sans font-semibold text-[11px] uppercase tracking-widest text-mute">
            © {new Date().getFullYear()} Kurage. Todos os direitos reservados.
          </p>
          <p className="max-w-sm text-center text-[12px] text-mute sm:text-right">
            Counter-Strike e CS2 são marcas registradas da Valve Corp.
          </p>
        </div>
      </div>
      
      {/* Massive Background Typography */}
      <div className="pointer-events-none absolute bottom-[-10%] left-1/2 w-full -translate-x-1/2 select-none overflow-hidden text-center opacity-[0.02] mix-blend-screen">
        <h2 className="font-display text-[15vw] leading-none tracking-tighter text-white whitespace-nowrap">
          KURAGE
        </h2>
      </div>
    </footer>
  );
}

function FooterLink({ href, children, disabled }: { href: string; children: React.ReactNode; disabled?: boolean }) {
  if (disabled) {
    return (
      <li>
        <span className="text-[14px] text-charcoal cursor-default transition-colors">
          {children}
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="group inline-flex items-center gap-2 text-[14px] text-body transition-colors hover:text-ink">
        <span>{children}</span>
        <PiArrowRight className="h-3.5 w-3.5 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-mute" />
      </Link>
    </li>
  );
}
