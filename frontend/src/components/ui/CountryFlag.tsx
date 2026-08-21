"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const COUNTRY_NAMES: Record<string, string> = {
  br: "Brasil",
  ua: "Ucrânia",
  ar: "Argentina",
  us: "Estados Unidos",
  ca: "Canadá",
  fr: "França",
  se: "Suécia",
  dk: "Dinamarca",
  de: "Alemanha",
  pt: "Portugal",
  es: "Espanha",
  pl: "Polônia",
  fi: "Finlândia",
  no: "Noruega",
  cl: "Chile",
  uy: "Uruguai",
  kz: "Cazaquistão",
  mn: "Mongólia",
  au: "Austrália",
  gb: "Reino Unido",
  uk: "Reino Unido",
  it: "Itália",
  nl: "Holanda",
  be: "Bélgica",
  ru: "Rússia",
  tr: "Turquia",
  jp: "Japão",
  kr: "Coreia do Sul",
  cn: "China",
  rs: "Sérvia",
  cz: "Tchéquia",
  bg: "Bulgária",
  ro: "Romênia",
  hu: "Hungria",
  ee: "Estônia",
  lv: "Letônia",
  lt: "Lituânia",
  il: "Israel",
  za: "África do Sul",
};

interface CountryFlagProps {
  country?: string | null;
  className?: string;
  expandOnHover?: boolean;
}

export function CountryFlag({
  country,
  className,
  expandOnHover = true,
}: CountryFlagProps) {
  if (!country) return null;

  const code = country.toLowerCase().trim();
  const countryName = COUNTRY_NAMES[code] || country.toUpperCase();

  if (expandOnHover) {
    return (
      <div
        className={cn(
          "group/country inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-default p-0.5 hover:bg-white/10 shrink-0",
          className
        )}
        title={countryName}
      >
        <span
          className={cn(
            `fi fi-${code} w-4 h-3 rounded-[2px] shadow-sm shrink-0 transition-transform duration-300 group-hover/country:scale-110`
          )}
        />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/country:text-ink opacity-0 transition-all duration-300 group-hover/country:max-w-[110px] group-hover/country:opacity-100 group-hover/country:pl-1.5 group-hover/country:pr-1">
          {countryName}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn(`fi fi-${code} w-4 h-3 rounded-[2px] shadow-sm shrink-0 inline-block`, className)}
      title={countryName}
    />
  );
}
