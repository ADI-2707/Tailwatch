import React from "react";
import styles from "./Header.module.css";
import { ShellTab } from "../Shell/Shell";
import { Building2, ChevronDown } from "../../ui/Icon";
import { Tooltip } from "../../ui";

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
        <Tooltip content={`Organization: ${orgName}`} position="bottom">
          <div className={styles.orgBadge}>
            <Building2 size={13} className={styles.orgIcon} />
            <span className={styles.orgName}>{orgName}</span>
            <ChevronDown size={11} className={styles.selectorChevron} />
          </div>
        </Tooltip>
        <span className={styles.breadcrumbDivider}>/</span>
        <Tooltip content={`Active Project: ${projectSlug}`} position="bottom">
          <div className={styles.projectBadge}>
            <span>{projectSlug}</span>
            <ChevronDown size={11} className={styles.selectorChevron} />
          </div>
        </Tooltip>
        <span className={styles.breadcrumbDivider}>/</span>
        <span className={styles.breadcrumbSegment}>{TAB_TITLES[currentTab]}</span>
      </div>

      <div className={styles.right}>
        <Tooltip content="Telemetry ingestion pipelines active and healthy" position="bottom">
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot} />
            <span>Operational</span>
          </div>
        </Tooltip>

        <div className={styles.divider} />

        <Tooltip
          content={`Signed in as ${user?.name || firstName} (${user?.email || "aditya21singh2707@gmail.com"})`}
          position="bottom"
        >
          <div className={styles.userProfile}>
            <div className={styles.avatar}>{initial}</div>
            <span className={styles.userName}>{firstName}</span>
          </div>
        </Tooltip>
      </div>
    </header>
  );
};
