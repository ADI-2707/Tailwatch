import React from "react";
import styles from "./Header.module.css";
import { ShellTab } from "../Shell/Shell";
import { Building2 } from "lucide-react";

export interface HeaderProps {
  projectSlug: string;
  currentTab: ShellTab;
  orgName?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

const TAB_TITLES: Record<ShellTab, string> = {
  logs: "Logs Explorer",
  tail: "Live Tail",
  alerts: "Alerts & Rules",
  sources: "Ingestion Sources",
  system: "System Health",
  onboarding: "Connect Agent",
};

export const Header: React.FC<HeaderProps> = ({
  projectSlug,
  currentTab,
  orgName = "Tailwatch",
  user,
}) => {
  const firstName = (user?.name || "User").trim().split(/\s+/)[0];
  const initial = firstName.charAt(0).toUpperCase();

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

        <div className={styles.divider} />

        <div className={styles.orgBadge}>
          <Building2 size={13} className={styles.orgIcon} />
          <span className={styles.orgName}>{orgName}</span>
        </div>

        <div className={styles.userProfile} title={user?.name || user?.email || firstName}>
          <div className={styles.avatar}>
            {initial}
          </div>
          <span className={styles.userName}>{firstName}</span>
        </div>
      </div>

      <div className={styles.dataBeamTrack} aria-hidden="true">
        <div className={styles.dataBeamPulse} />
      </div>
    </header>
  );
};
