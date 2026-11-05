import React from "react";
import styles from "./Header.module.css";
import { ShellTab } from "../Shell/Shell";

export interface HeaderProps {
  projectSlug: string;
  currentTab: ShellTab;
}

const TAB_TITLES: Record<ShellTab, string> = {
  logs: "Logs Explorer",
  tail: "Live Tail",
  alerts: "Alerts & Rules",
  sources: "Ingestion Sources",
  system: "System Health",
  onboarding: "Connect Agent",
};

export const Header: React.FC<HeaderProps> = ({ projectSlug, currentTab }) => {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.breadcrumbSegment}>Tailwatch</span>
        <span className={styles.breadcrumbDivider}>/</span>
        <span className={styles.projectBadge}>{projectSlug}</span>
        <span className={styles.breadcrumbDivider}>/</span>
        <span className={styles.breadcrumbSegment}>{TAB_TITLES[currentTab]}</span>
      </div>

      <div className={styles.right}>
        <div className={styles.statusIndicator}>
          <span className={styles.statusDot} />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
};

