import React from "react";
import { PiShieldCheck, PiWaves } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { SubscriptionTier } from "@/types/user";

interface VerifiedProBadgeProps {
  isVerifiedPro?: boolean;
  subscriptionTier?: SubscriptionTier;
  size?: "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

export function VerifiedProBadge({
  isVerifiedPro,
  subscriptionTier,
  size = "md",
  className,
}: VerifiedProBadgeProps) {
  // If user is a verified PRO player (gold shield)
  if (isVerifiedPro) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 text-gold font-semibold tracking-wider uppercase font-sans font-semibold shadow-[0_0_8px_rgba(212,168,83,0.25)]",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className
        )}
        title="Profissional verificado pela Kurage"
        aria-label="Jogador Profissional Verificado"
      >
        <PiShieldCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>PRO</span>
      </span>
    );
  }

  if (subscriptionTier === "MARE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-[var(--mare-accent)]/45 bg-[var(--mare-accent)]/12 font-sans font-semibold uppercase tracking-wider text-[var(--mare-accent)] shadow-[0_0_12px_rgba(var(--mare-accent-rgb),0.18)]",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className
        )}
        title="Assinante Kurage Maré"
        aria-label="Assinante Kurage Maré"
      >
        <PiWaves className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>MARÉ</span>
      </span>
    );
  }

  return null;
}
