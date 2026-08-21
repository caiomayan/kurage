import React from "react";
import { SiSteam, SiFaceit } from "react-icons/si";

interface PlatformIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Official Steam Logo from Simple Icons (react-icons/si)
 */
export const SteamIcon: React.FC<PlatformIconProps> = ({
  size = 18,
  className = "",
  style,
  ...props
}) => {
  return <SiSteam size={size} className={className} style={style} {...props} />;
};

/**
 * Official Faceit Logo from Simple Icons (react-icons/si)
 */
export const FaceitIcon: React.FC<PlatformIconProps> = ({
  size = 18,
  className = "",
  style,
  ...props
}) => {
  return <SiFaceit size={size} className={className} style={style} {...props} />;
};

export { SiSteam, SiFaceit };
