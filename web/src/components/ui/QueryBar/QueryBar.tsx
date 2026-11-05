import React, { useRef, useEffect } from "react";
import styles from "./QueryBar.module.css";
import { Search } from "../Icon";

export interface FilterTag {
  key: string;
  value: string;
}

export interface QueryBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  filters?: FilterTag[];
  onRemoveFilter?: (index: number) => void;
  placeholder?: string;
  className?: string;
}

export const QueryBar: React.FC<QueryBarProps> = ({
  value,
  onChange,
  onSubmit,
  filters = [],
  onRemoveFilter,
  placeholder = "Search logs with TQL (e.g. service:payment level:>=error 'timeout')",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`${styles.queryBarContainer} ${className}`}>
      <div className={styles.inputRow}>
        <div className={styles.searchIcon}>
          <Search size={16} />
        </div>
        <input
          ref={inputRef}
          className={styles.inputField}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
        />
        <div className={styles.shortcutHint}>
          <span>/</span>
        </div>
      </div>

      {filters.length > 0 && (
        <div className={styles.pillRow}>
          {filters.map((f, i) => (
            <span key={i} className={styles.filterPill}>
              <span className={styles.filterKey}>{f.key}:</span>
              <span>{f.value}</span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemoveFilter?.(i)}
                aria-label={`Remove filter ${f.key}:${f.value}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
