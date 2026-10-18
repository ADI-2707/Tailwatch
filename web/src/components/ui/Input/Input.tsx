import React from "react";
import styles from "./Input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  prefixIcon,
  suffixIcon,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.inputContainer} ${error ? styles.hasError : ""} ${className}`}>
        {prefixIcon && <span className={styles.icon}>{prefixIcon}</span>}
        <input id={id} className={styles.input} {...props} />
        {suffixIcon && <span className={styles.icon}>{suffixIcon}</span>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};
