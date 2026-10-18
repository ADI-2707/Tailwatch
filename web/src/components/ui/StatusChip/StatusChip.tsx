import React from "react";
import styles from "./StatusChip.module.css";

export type AlertState = "ok" | "pending" | "firing" | "resolved";

export interface StatusChipProps {
  state: AlertState;
  label?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ state, label, className = "" }) => {
  const classKey = `state${state.charAt(0).toUpperCase() + state.slice(1)}` as keyof typeof styles;
  const displayLabel = label || state.toUpperCase();

  return (
    <span className={`${styles.chip} ${styles[classKey]} ${className}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};
