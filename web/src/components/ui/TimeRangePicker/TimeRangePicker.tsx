import React, { useState, useRef, useEffect } from "react";
import styles from "./TimeRangePicker.module.css";
import { Clock, ChevronDown, Check } from "../Icon";

export interface TimePreset {
  label: string;
  hours: number;
}

const PRESETS: TimePreset[] = [
  { label: "Last 15 minutes", hours: 0.25 },
  { label: "Last 1 hour", hours: 1 },
  { label: "Last 6 hours", hours: 6 },
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 168 },
];

export interface TimeRangePickerProps {
  selectedHours: number;
  onChange: (hours: number) => void;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  selectedHours,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activePreset = PRESETS.find((p) => p.hours === selectedHours) || PRESETS[3];

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Clock size={14} />
        <span>{activePreset.label}</span>
        <ChevronDown size={13} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {PRESETS.map((p) => {
            const isActive = p.hours === selectedHours;
            return (
              <div
                key={p.hours}
                className={`${styles.item} ${isActive ? styles.active : ""}`}
                onClick={() => {
                  onChange(p.hours);
                  setIsOpen(false);
                }}
              >
                <span>{p.label}</span>
                {isActive && <Check size={13} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

