"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { PiShield } from "react-icons/pi";
import { cn } from "@/lib/utils";

export const KNOWN_TEAM_LOGOS: Record<
  string,
  { logoUrl?: string; name: string }
> = {
  FURIA: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/124530/800px_furia_esports_2019.png",
    name: "FURIA Esports",
  },
  NAVI: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/3216/natus_vincere_2021_allmode.png",
    name: "Natus Vincere",
  },
  VIT: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/3455/team_vitality_2020.png",
    name: "Team Vitality",
  },
  FAZE: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/3250/faze_clan_2021.png",
    name: "FaZe Clan",
  },
  MIBR: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/3250/800px_mibr_2018.png",
    name: "Made in Brazil",
  },
  PAIN: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/125863/pain_gaminglogo_square.png",
    name: "paiN Gaming",
  },
  IMPERIAL: {
    logoUrl: "https://cdn.pandascore.co/images/team/image/126709/800px_imperial_esports_2022.png",
    name: "Imperial Esports",
  },
  "RED CANIDS": {
    logoUrl: "https://cdn.pandascore.co/images/team/image/126046/red_canids_2020_allmode.png",
    name: "RED Canids",
  },
  "9Z": {
    logoUrl: "https://cdn.pandascore.co/images/team/image/126714/9z_team_2020_allmode.png",
    name: "9z Team",
  },
  "00NATION": {
    name: "00NATION",
  },
};

interface TeamLogoProps {
  teamTag?: string | null;
  teamName?: string | null;
  logoUrl?: string | null;
  size?: number;
  expandOnHover?: boolean;
  className?: string;
  isLink?: boolean;
}

export function TeamLogo({
  teamTag,
  teamName,
  logoUrl,
  size = 16,
  expandOnHover = false,
  className,
  isLink = true,
}: TeamLogoProps) {
  const normalizedTag = teamTag ? teamTag.trim().toUpperCase() : "";
  const known = normalizedTag ? KNOWN_TEAM_LOGOS[normalizedTag] : null;

  const resolvedName = teamName || known?.name || teamTag || "";
  const resolvedUrl = logoUrl || known?.logoUrl || null;

  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const hasValidImage = Boolean(resolvedUrl && failedSource !== resolvedUrl);

  const content = (
    <>
      {hasValidImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={resolvedUrl!}
          alt={teamTag || "Team"}
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          style={{ width: size, height: size }}
          className="object-contain shrink-0 transition-transform duration-200 group-hover/team:scale-110"
          onError={() => setFailedSource(resolvedUrl)}
          onLoad={(e) => {
            if ((e.currentTarget as HTMLImageElement).naturalWidth === 0) {
              setFailedSource(resolvedUrl);
            }
          }}
        />
      ) : (
        /* Reliable Shield Icon Fallback */
        <PiShield
          style={{ width: size, height: size }}
          className="text-mute group-hover/team:text-ink shrink-0 transition-transform duration-200 group-hover/team:scale-110"
          aria-label="Escudo do time"
        />
      )}

      {expandOnHover && resolvedName && (
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/team:text-ink opacity-0 transition-all duration-300 group-hover/team:max-w-[110px] group-hover/team:opacity-100 group-hover/team:pl-1.5 group-hover/team:pr-1">
          {resolvedName}
        </span>
      )}
    </>
  );

  if (isLink && teamTag) {
    return (
      <Link
        href={`/team/${teamTag.toLowerCase()}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "group/team inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-200 cursor-pointer p-0.5 hover:bg-white/10 shrink-0",
          className
        )}
        title={resolvedName}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "group/team inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-200 cursor-default p-0.5 hover:bg-white/10 shrink-0",
        className
      )}
      title={resolvedName}
    >
      {content}
    </div>
  );
}
