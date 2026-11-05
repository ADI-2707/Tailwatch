import React, { useState, useEffect } from "react";
import styles from "./Shell.module.css";
import { Sidebar } from "../Sidebar/Sidebar";
import { Header } from "../Header/Header";

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
  onTabChange = () => {},
  projectSlug = "production",
  onLogout,
}) => {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("tw_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tw_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className={styles.mainContainer}>
        <Header projectSlug={projectSlug} currentTab={currentTab} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
