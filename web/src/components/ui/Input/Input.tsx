import React from "react";
import styles from "./Input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  error?: string;
  sizeVariant?: "sm" | "md" | "lg";
}

export const Input: React.FC<InputProps> = ({
  prefixIcon,
  suffixIcon,
  error,
  sizeVariant = "md",
  className = "",
  id,
  ...props
}) => {
  const sizeClass = sizeVariant === "lg" ? styles.sizeLg : sizeVariant === "sm" ? styles.sizeSm : "";

  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={`${styles.inputContainer} ${sizeClass} ${error ? styles.hasError : ""}`}>
        {prefixIcon && <span className={styles.icon}>{prefixIcon}</span>}
        <input id={id} className={styles.input} {...props} />
        {suffixIcon && <span className={styles.icon}>{suffixIcon}</span>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
