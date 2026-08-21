"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { PlayerPassportHovercard } from "@/components/ui/PlayerPassportHovercard";
import { PiShieldCheck, PiUser } from "react-icons/pi";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  username?: string;
  kurageId?: number;
  size?: AvatarSize;
  level?: number;
  isVerifiedPro?: boolean;
  className?: string;
  enableHovercard?: boolean;
}

const sizeMap: Record<AvatarSize, { container: string; iconClass: string; badgeSize: string }> = {
  xs: { container: "h-6 w-6 text-[10px]", iconClass: "w-3 h-3", badgeSize: "w-3 h-3 text-[7px]" },
  sm: { container: "h-8 w-8 text-[11px]", iconClass: "w-4 h-4", badgeSize: "w-3.5 h-3.5 text-[8px]" },
  md: { container: "h-10 w-10 text-[13px]", iconClass: "w-5 h-5", badgeSize: "w-4 h-4 text-[9px]" },
  lg: { container: "h-12 w-12 text-[15px]", iconClass: "w-6 h-6", badgeSize: "w-5 h-5 text-[11px]" },
  xl: { container: "h-20 w-20 text-[22px]", iconClass: "w-10 h-10", badgeSize: "w-7 h-7 text-[14px]" },
  "2xl": { container: "h-28 w-28 text-[30px]", iconClass: "w-16 h-16", badgeSize: "w-8 h-8 text-[16px]" },
};

export function Avatar({
  src,
  alt,
  username = "User",
  kurageId,
  size = "md",
  level,
  isVerifiedPro = false,
  className,
  enableHovercard = true,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const currentSize = sizeMap[size];
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setHasError(true);
    }
  }, [src]);

  const hasValidImage = Boolean(src && src.trim() !== "" && !hasError);

  const avatarElement = (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c0d10] font-sans font-semibold text-accent overflow-visible select-none",
        currentSize.container,
        className
      )}
    >
      <div className="h-full w-full overflow-hidden rounded-full flex items-center justify-center bg-[#0c0d10]">
        {hasValidImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src!}
            alt={alt || username}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            onLoad={(e) => {
              if ((e.currentTarget as HTMLImageElement).naturalWidth === 0) {
                setHasError(true);
              }
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-white/[0.03] text-mute/60">
            <PiUser className={cn(currentSize.iconClass, "opacity-70")} />
          </div>
        )}
      </div>

      {/* Verified Pro Badge Overlay */}
      {isVerifiedPro && (size === "lg" || size === "xl" || size === "2xl") && (
        <span
          className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface-card border border-[var(--hairline-strong)] text-accent-yellow shadow-md"
          title="Profissional Verificado"
        >
          <PiShieldCheck className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Level Badge Overlay (bottom-right) */}
      {level !== undefined && (size === "md" || size === "lg" || size === "xl" || size === "2xl") && (
        <span className="absolute -bottom-1 -right-1 z-10">
          <KurageLevelIcon level={level} className={currentSize.badgeSize} />
        </span>
      )}
    </div>
  );

  // Wrap with interactive 3D Player Passport Hovercard globally
  if (enableHovercard && (kurageId || (username && username !== "User")) && size !== "2xl") {
    return (
      <PlayerPassportHovercard
        kurageId={kurageId}
        username={username}
        avatarUrl={src}
        initialData={{
          kurageId: typeof kurageId === "number" ? kurageId : undefined,
          username,
          avatarUrl: src,
          isVerifiedPro,
          kurageLevel: level,
        }}
      >
        {avatarElement}
      </PlayerPassportHovercard>
    );
  }

  return avatarElement;
}
