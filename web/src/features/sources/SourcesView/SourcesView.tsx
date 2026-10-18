import React from "react";
import styles from "./SourcesView.module.css";
import { Server, Activity } from "lucide-react";
import { StatusChip } from "../../../components/ui/StatusChip/StatusChip";

export interface AgentHost {
  id: string;
  name: string;
  ip: string;
  version: string;
  spoolPercent: number;
  ratePerSec: number;
  lastSeen: string;
  status: "ok" | "pending";
}

export const SourcesView: React.FC = () => {
  const hosts: AgentHost[] = [
    {
      id: "1",
      name: "web-prod-01",
      ip: "10.0.1.14",
      version: "1.0.0",
      spoolPercent: 12,
      ratePerSec: 142,
      lastSeen: "2s ago",
      status: "ok",
    },
    {
      id: "2",
      name: "worker-batch-02",
      ip: "10.0.2.89",
      version: "1.0.0",
      spoolPercent: 4,
      ratePerSec: 68,
      lastSeen: "1s ago",
      status: "ok",
    },
    {
      id: "3",
      name: "db-replica-01",
      ip: "10.0.4.10",
      version: "1.0.0",
      spoolPercent: 28,
      ratePerSec: 210,
      lastSeen: "Just now",
      status: "ok",
    },
  ];

  return (
    <div className={styles.sourcesWrapper}>
      <div className={styles.headerBar}>
        <span className={styles.statsText}>
          {hosts.length} connected active agent instances · Total Ingestion: 420 events/sec
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Host</th>
              <th>IP Address</th>
              <th>Version</th>
              <th>Ingest Rate</th>
              <th>Spool Buffer</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((h) => (
              <tr key={h.id} className={styles.row}>
                <td className={styles.cell}>
                  <StatusChip state={h.status} label="HEALTHY" />
                </td>
                <td className={styles.cell}>
                  <div className={styles.hostGroup}>
                    <Server size={14} color="var(--accent)" />
                    <span>{h.name}</span>
                  </div>
                </td>
                <td className={styles.cell} style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {h.ip}
                </td>
                <td className={styles.cell} style={{ fontFamily: "var(--font-mono)" }}>
                  v{h.version}
                </td>
                <td className={styles.cell}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                    <Activity size={12} color="var(--success)" />
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                      {h.ratePerSec} eps
                    </span>
                  </div>
                </td>
                <td className={styles.cell}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <div className={styles.spoolFillBar}>
                      <div
                        className={styles.spoolProgress}
                        style={{ width: `${h.spoolPercent}%` }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {h.spoolPercent}%
                    </span>
                  </div>
                </td>
                <td className={styles.cell} style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  {h.lastSeen}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
