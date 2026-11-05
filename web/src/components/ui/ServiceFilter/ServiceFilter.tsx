import React, { useState, useRef, useEffect } from "react";
import styles from "./ServiceFilter.module.css";
import { ChevronDown, Check, Server } from "lucide-react";

export interface ServiceItem {
  name: string;
  count: number;
}

export interface ServiceFilterProps {
  services: ServiceItem[];
  selectedServices: string[];
  onChange: (selected: string[]) => void;
}

export const ServiceFilter: React.FC<ServiceFilterProps> = ({
  services,
  selectedServices,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleService = (name: string) => {
    if (selectedServices.includes(name)) {
      onChange(selectedServices.filter((s) => s !== name));
    } else {
      onChange([...selectedServices, name]);
    }
  };

  const selectAll = () => {
    onChange(services.map((s) => s.name));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.trigger} ${selectedServices.length > 0 ? styles.active : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Server size={14} />
        <span>Service</span>
        {selectedServices.length > 0 && (
          <span className={styles.badge}>{selectedServices.length}</span>
        )}
        <ChevronDown size={13} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>No services found</div>
            ) : (
              filtered.map((s) => {
                const isSelected = selectedServices.includes(s.name);
                return (
                  <div
                    key={s.name}
                    className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                    onClick={() => toggleService(s.name)}
                  >
                    <div className={styles.itemLeft}>
                      {isSelected ? <Check size={13} /> : <span style={{ width: 13 }} />}
                      <span>{s.name}</span>
                    </div>
                    <span className={styles.count}>{s.count}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.actionBtn} onClick={selectAll}>
              Select All
            </button>
            <button type="button" className={styles.actionBtn} onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

