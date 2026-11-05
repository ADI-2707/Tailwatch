import React, { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";
import {
  FileText,
  Activity,
  AlertTriangle,
  Server,
  Cpu,
  PlusCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { ShellTab } from "../Shell/Shell";

export interface SidebarProps {
  currentTab: ShellTab;
  onTabChange: (tab: ShellTab) => void;
  onLogout?: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const NAV_ITEMS: Array<{ id: ShellTab; label: string; icon: React.ReactNode }> = [
  { id: "logs", label: "Logs Explorer", icon: <FileText size={16} /> },
  { id: "tail", label: "Live Tail", icon: <Activity size={16} /> },
  { id: "alerts", label: "Alerts", icon: <AlertTriangle size={16} /> },
  { id: "sources", label: "Sources", icon: <Server size={16} /> },
  { id: "system", label: "System Health", icon: <Cpu size={16} /> },
  { id: "onboarding", label: "Connect Agent", icon: <PlusCircle size={16} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("tw_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("tw_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.header}>
        <div className={styles.logoArea}>
          <span className={styles.logoDot} />
          {!collapsed && <span>Tailwatch</span>}
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {!collapsed && <div className={styles.navSection}>Observability</div>}
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.footerAction}
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span className={styles.navIcon}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {onLogout && (
          <button
            type="button"
            className={`${styles.footerAction} ${styles.signOutBtn}`}
            onClick={onLogout}
            title="Sign out"
          >
            <span className={styles.navIcon}>
              <LogOut size={16} />
            </span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

