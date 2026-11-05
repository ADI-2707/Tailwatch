import React from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <ul className={`${styles.tabsList} ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <li key={tab.id}>
            <button
              type="button"
              className={`${styles.tabTrigger} ${isActive ? styles.active : ""}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={styles.badge}>{tab.badge}</span>
              )}
              {isActive && <span className={styles.tabIndicator} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
