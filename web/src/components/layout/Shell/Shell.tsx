import React from "react";
import styles from "./Shell.module.css";

export interface ShellProps {
  children: React.ReactNode;
  currentTab?: "logs" | "tail" | "alerts" | "sources" | "system";
  onTabChange?: (tab: "logs" | "tail" | "alerts" | "sources" | "system") => void;
  projectSlug?: string;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  currentTab = "logs",
  onTabChange,
  projectSlug = "default",
}) => {
  const tabs: Array<{ id: "logs" | "tail" | "alerts" | "sources" | "system"; label: string }> = [
    { id: "logs", label: "Logs" },
    { id: "tail", label: "Live Tail" },
    { id: "alerts", label: "Alerts" },
    { id: "sources", label: "Sources" },
    { id: "system", label: "System" },
  ];

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <div className={styles.logoMark}>
            <span className={styles.logoDot} />
            <span>Tailwatch</span>
          </div>
          <div className={styles.projectBadge}>
            <span>/p/{projectSlug}</span>
          </div>
          <nav className={styles.nav}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${currentTab === tab.id ? styles.active : ""}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchHint}>
            <span>Search</span>
            <kbd>/</kbd>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
};
