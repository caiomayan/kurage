import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* 
        Abstract Jellyfish Logo 
        Minimalist, geometric, built with 1.5px hairlines.
        The bell is a perfect geometric dome. 
        The tentacles are elegant sine-like curves.
      */}
      
      {/* Bell / Dome */}
      <path
        d="M8 24C8 15.1634 15.1634 8 24 8C32.8366 8 40 15.1634 40 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Inner Bell Ring */}
      <path
        d="M14 24C14 18.4772 18.4772 14 24 14C29.5228 14 34 18.4772 34 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      
      {/* Base line of the bell */}
      <line
        x1="8"
        y1="24"
        x2="40"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Center Main Tentacle */}
      <path
        d="M24 24C24 32 20 36 24 44"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Left Tentacle */}
      <path
        d="M16 24C16 32 10 34 14 42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Right Tentacle */}
      <path
        d="M32 24C32 32 38 34 34 42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
    </svg>
  );
}
