import React, { useEffect } from "react";
import styles from "./Drawer.module.css";
import { X, Copy } from "lucide-react";
import { Button } from "../Button/Button";
import { LevelPill } from "../LevelPill/LevelPill";
import { LogEntry } from "../../../features/logs/LogsExplorer/LogsExplorer";
import { useToast } from "../Toast/Toast";

export interface DrawerProps {
  log: LogEntry | null;
  onClose: () => void;
  onFilterByService?: (service: string) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  log,
  onClose,
  onFilterByService,
}) => {
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Event JSON copied to clipboard", "success");
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <LevelPill level={log.level} />
            <span>Event Detail</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Message</span>
            <div className={styles.rawMessage}>{log.message}</div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Standard Attributes</span>
            <table className={styles.fieldsTable}>
              <tbody>
                <tr className={styles.fieldRow}>
                  <td className={styles.fieldKey}>ts</td>
                  <td className={styles.fieldVal}>{log.ts}</td>
                </tr>
                <tr className={styles.fieldRow}>
                  <td className={styles.fieldKey}>service</td>
                  <td className={styles.fieldVal}>
                    <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => onFilterByService?.(log.service)}>
                      {log.service}
                    </span>
                  </td>
                </tr>
                <tr className={styles.fieldRow}>
                  <td className={styles.fieldKey}>host</td>
                  <td className={styles.fieldVal}>{log.host}</td>
                </tr>
                <tr className={styles.fieldRow}>
                  <td className={styles.fieldKey}>source</td>
                  <td className={styles.fieldVal}>{log.source || "-"}</td>
                </tr>
                {log.trace_id && (
                  <tr className={styles.fieldRow}>
                    <td className={styles.fieldKey}>trace_id</td>
                    <td className={styles.fieldVal}>{log.trace_id}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {log.fields && Object.keys(log.fields).length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Custom Fields</span>
              <table className={styles.fieldsTable}>
                <tbody>
                  {Object.entries(log.fields).map(([k, v]) => (
                    <tr key={k} className={styles.fieldRow}>
                      <td className={styles.fieldKey}>{k}</td>
                      <td className={styles.fieldVal}>{JSON.stringify(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.footerActions}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
          >
            <Copy size={14} />
            <span>Copy Event JSON</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
