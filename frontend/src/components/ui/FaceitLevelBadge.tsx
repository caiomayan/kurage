import React from "react";
import { FaceitLevelIcon } from "./faceit-levels/FaceitLevelIcon";

interface FaceitLevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
  expandOnHover?: boolean;
}

export const FaceitLevelBadge: React.FC<FaceitLevelBadgeProps> = ({
  level,
  className = "",
  expandOnHover = true,
}) => {
  return (
    <FaceitLevelIcon
      level={level}
      className={className}
      expandOnHover={expandOnHover}
    />
  );
};
