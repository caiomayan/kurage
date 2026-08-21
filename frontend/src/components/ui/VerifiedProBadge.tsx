import React from "react";
import { PiCheck, PiShieldCheck } from "react-icons/pi";
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

  // If user is a MAX subscriber
  if (subscriptionTier === "MAX") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/20 text-accent font-semibold tracking-wider uppercase font-sans font-semibold shadow-[0_0_8px_rgba(169,200,192,0.25)]",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className
        )}
        title="Assinante Kurage MAX"
        aria-label="Assinante MAX"
      >
        <span>MAX</span>
      </span>
    );
  }

  // If user is a paid PRO subscriber (Sea Glass subtle pill)
  if (subscriptionTier === "PRO") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border border-accent-muted/30 bg-accent/10 text-accent font-medium tracking-wider uppercase font-sans font-semibold",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className
        )}
        title="Assinante Kurage PRO"
        aria-label="Assinante PRO"
      >
        <PiCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>PRO</span>
      </span>
    );
  }

  // If user is a PLUS subscriber
  if (subscriptionTier === "PLUS") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-surface-raised text-text-secondary font-medium tracking-wider uppercase font-sans font-semibold",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          className
        )}
        title="Assinante Kurage PLUS"
        aria-label="Assinante PLUS"
      >
        <span>PLUS</span>
      </span>
    );
  }

  return null;
}
