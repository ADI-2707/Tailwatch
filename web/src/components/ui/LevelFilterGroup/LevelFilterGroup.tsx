import React from "react";
import styles from "./LevelFilterGroup.module.css";

export type LogLevelName = "fatal" | "error" | "warn" | "info" | "debug";

export interface LevelFilterGroupProps {
  selectedLevels: LogLevelName[];
  onChange: (levels: LogLevelName[]) => void;
}

const LEVELS: Array<{ key: LogLevelName; label: string; className: string }> = [
  { key: "fatal", label: "FTL", className: styles.pillFatal },
  { key: "error", label: "ERR", className: styles.pillError },
  { key: "warn", label: "WRN", className: styles.pillWarn },
  { key: "info", label: "INF", className: styles.pillInfo },
  { key: "debug", label: "DBG", className: styles.pillDebug },
];

export const LevelFilterGroup: React.FC<LevelFilterGroupProps> = ({
  selectedLevels,
  onChange,
}) => {
  const toggleLevel = (key: LogLevelName) => {
    if (selectedLevels.includes(key)) {
      onChange(selectedLevels.filter((l) => l !== key));
    } else {
      onChange([...selectedLevels, key]);
    }
  };

  return (
    <div className={styles.group}>
      {LEVELS.map((lvl) => {
        const isActive = selectedLevels.includes(lvl.key);
        return (
          <button
            key={lvl.key}
            type="button"
            className={`${styles.pill} ${lvl.className} ${isActive ? styles.active : ""}`}
            onClick={() => toggleLevel(lvl.key)}
            title={`Toggle ${lvl.key.toUpperCase()} level`}
          >
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
};
