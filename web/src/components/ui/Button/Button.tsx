import React from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...props
}) => {
  const variantClass = styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles];
  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles];

  return (
    <button
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.loadingSpinner} />}
      {children}
    </button>
  );
};
