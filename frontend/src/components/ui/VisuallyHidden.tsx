import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * VisuallyHidden component for WCAG-compliant screen reader accessibility.
 */
export function VisuallyHidden({
  children,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
