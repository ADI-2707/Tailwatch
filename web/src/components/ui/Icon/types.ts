import React from "react";

export type IconSize = "xs" | "sm" | "md" | "lg" | number;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

