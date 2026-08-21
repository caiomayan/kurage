"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function Brand({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center justify-center rounded-lg p-1 text-ink transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring",
        className
      )}
      aria-label="Kurage — Início"
    >
      <div className="relative flex items-start">
        <Logo size={size} className="text-ink transition-transform duration-200 group-hover:scale-105" />
        <span className="ml-0.5 font-sans font-semibold text-[9px] font-bold tracking-wider text-mute select-none">
          BETA
        </span>
      </div>
    </Link>
  );
}
