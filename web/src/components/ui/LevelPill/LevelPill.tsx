import React from "react";
import styles from "./LevelPill.module.css";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | number;

const LEVEL_MAP: Record<string, { label: string; glyph: string; classKey: keyof typeof styles }> = {
  "10": { label: "TRC", glyph: "◌", classKey: "levelTrace" },
  "20": { label: "DBG", glyph: "○", classKey: "levelDebug" },
  "30": { label: "INF", glyph: "●", classKey: "levelInfo" },
  "40": { label: "WRN", glyph: "▲", classKey: "levelWarn" },
  "50": { label: "ERR", glyph: "■", classKey: "levelError" },
  "60": { label: "FTL", glyph: "◆", classKey: "levelFatal" },
  trace: { label: "TRC", glyph: "◌", classKey: "levelTrace" },
  debug: { label: "DBG", glyph: "○", classKey: "levelDebug" },
  info: { label: "INF", glyph: "●", classKey: "levelInfo" },
  warn: { label: "WRN", glyph: "▲", classKey: "levelWarn" },
  error: { label: "ERR", glyph: "■", classKey: "levelError" },
  fatal: { label: "FTL", glyph: "◆", classKey: "levelFatal" },
};

export interface LevelPillProps {
  level: LogLevel;
  className?: string;
}

export const LevelPill: React.FC<LevelPillProps> = ({ level, className = "" }) => {
  const key = String(level).toLowerCase();
  const def = LEVEL_MAP[key] || LEVEL_MAP["info"];

  return (
    <span className={`${styles.pill} ${styles[def.classKey]} ${className}`}>
      <span className={styles.glyph} aria-hidden="true">{def.glyph}</span>
      <span>{def.label}</span>
    </span>
  );
};
