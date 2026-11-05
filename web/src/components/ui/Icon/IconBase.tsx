import React from "react";
import { IconProps, IconSize } from "./types";

const SIZE_MAP: Record<"xs" | "sm" | "md" | "lg", number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};

export const parseIconSize = (size: IconSize = "md"): number => {
  if (typeof size === "number") return size;
  return SIZE_MAP[size] || 16;
};

export interface IconBaseProps extends IconProps {
  children: React.ReactNode;
}

export const IconBase: React.FC<IconBaseProps> = ({
  size = "md",
  color = "currentColor",
  strokeWidth = 2,
  className,
  children,
  ...rest
}) => {
  const pixelSize = parseIconSize(size);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
};
