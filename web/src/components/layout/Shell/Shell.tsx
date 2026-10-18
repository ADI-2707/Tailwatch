import React, { useState, useEffect } from "react";
import styles from "./Shell.module.css";
import { Sun, Moon, LogOut } from "lucide-react";

export type ShellTab = "logs" | "tail" | "alerts" | "sources" | "system" | "onboarding";

export interface ShellProps {
  children: React.ReactNode;
  currentTab?: ShellTab;
  onTabChange?: (tab: ShellTab) => void;
  projectSlug?: string;
  onLogout?: () => void;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  currentTab = "logs",
  onTabChange,
  projectSlug = "default",
  onLogout,
}) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const tabs: Array<{ id: ShellTab; label: string }> = [
    { id: "logs", label: "Logs" },
    { id: "tail", label: "Live Tail" },
    { id: "alerts", label: "Alerts" },
    { id: "sources", label: "Sources" },
    { id: "system", label: "System" },
    { id: "onboarding", label: "Connect Source" },
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
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {onLogout && (
            <button
              className={styles.themeToggle}
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
};
