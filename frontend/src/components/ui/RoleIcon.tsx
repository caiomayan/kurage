import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RoleIconProps {
  role?: string | null;
  size?: number;
  className?: string;
  expandOnHover?: boolean;
}

const ROLE_ICON_MAP: Record<string, string> = {
  CORINGA: "/assets/icons/icon-coringa.svg",
  FLEX: "/assets/icons/icon-coringa.svg",
  AWPER: "/assets/icons/icon-awper.svg",
  AWP: "/assets/icons/icon-awper.svg",
  SNIPER: "/assets/icons/icon-awper.svg",
  IGL: "/assets/icons/icon-igl.svg",
  CAPITAO: "/assets/icons/icon-igl.svg",
  ENTRY: "/assets/icons/icon-opener.svg",
  ENTRY_FRAGGER: "/assets/icons/icon-opener.svg",
  OPENER: "/assets/icons/icon-opener.svg",
  SUPPORT: "/assets/icons/icon-anchor.svg",
  SUPORTE: "/assets/icons/icon-anchor.svg",
  ANCHOR: "/assets/icons/icon-anchor.svg",
  LURKER: "/assets/icons/icon-lurker.svg",
  LURK: "/assets/icons/icon-lurker.svg",
  RIFLER: "/assets/icons/icon-rifler.svg",
  COACH: "/assets/icons/icon-coach.svg",
  ANALYST: "/assets/icons/icon-analyst.svg",
  MANAGER: "/assets/icons/icon-manager.svg",
  OWNER: "/assets/icons/icon-owner.svg",
  AI: "/assets/icons/icon-ai.svg",
};

export const RoleIcon: React.FC<RoleIconProps> = ({
  role,
  size = 18,
  className = "",
  expandOnHover = false,
}) => {
  if (!role) return null;
  const normalizedKey = role.toUpperCase().trim();
  const iconPath = ROLE_ICON_MAP[normalizedKey] || "/assets/icons/icon-coringa.svg";

  if (expandOnHover) {
    return (
      <div 
        className={cn(
          "group/role inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-default p-0.5 hover:bg-white/10 shrink-0",
          className
        )}
      >
        <span
          className="inline-flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/role:scale-110"
          style={{ width: size, height: size }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconPath}
            alt={role}
            width={size}
            height={size}
            className="object-contain max-h-full max-w-full drop-shadow-sm"
          />
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/role:text-ink opacity-0 transition-all duration-300 group-hover/role:max-w-[100px] group-hover/role:opacity-100 group-hover/role:pl-1.5 group-hover/role:pr-1">
          {role}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconPath}
        alt={role}
        width={size}
        height={size}
        className="object-contain max-h-full max-w-full drop-shadow-sm"
      />
    </span>
  );
};
