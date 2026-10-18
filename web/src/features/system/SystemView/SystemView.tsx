import React from "react";
import styles from "./SystemView.module.css";
import { Database, HardDrive, Cpu, Activity, Clock } from "lucide-react";
import { StatusChip } from "../../../components/ui/StatusChip/StatusChip";

export const SystemView: React.FC = () => {
  return (
    <div className={styles.systemWrapper}>
      <div className={styles.headerBar}>
        <span className={styles.statsText}>
          Tailwatch Platform Health · Deployment Profile: S (2 vCPU / 4 GB)
        </span>
        <StatusChip state="ok" label="SYSTEM NORMAL" />
      </div>

      <div className={styles.pipelineStrip}>
        <div className={styles.stage}>
          <StatusChip state="ok" label="AGENTS" />
          <span className={styles.stageName}>3 Connected</span>
        </div>
        <div style={{ color: "var(--border-strong)" }}>➔</div>
        <div className={styles.stage}>
          <StatusChip state="ok" label="API INGEST" />
          <span className={styles.stageName}>p99: 42ms</span>
        </div>
        <div style={{ color: "var(--border-strong)" }}>➔</div>
        <div className={styles.stage}>
          <StatusChip state="ok" label="VALKEY QUEUE" />
          <span className={styles.stageName}>Memory: 18%</span>
        </div>
        <div style={{ color: "var(--border-strong)" }}>➔</div>
        <div className={styles.stage}>
          <StatusChip state="ok" label="WRITER" />
          <span className={styles.stageName}>Lag: 0.2s</span>
        </div>
        <div style={{ color: "var(--border-strong)" }}>➔</div>
        <div className={styles.stage}>
          <StatusChip state="ok" label="POSTGRESQL" />
          <span className={styles.stageName}>Storage: 14%</span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Queue Memory</span>
            <Activity size={14} color="var(--accent)" />
          </div>
          <div className={styles.cardValue}>184 MB / 1 GB</div>
          <div className={styles.cardFooter}>
            <span>Valkey Stream buffer · Level 0 Normal</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Writer Lag</span>
            <Clock size={14} color="var(--success)" />
          </div>
          <div className={styles.cardValue}>180 ms</div>
          <div className={styles.cardFooter}>
            <span>Target: &lt; 5s · 2 workers active</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Database Partitions</span>
            <Database size={14} color="var(--info)" />
          </div>
          <div className={styles.cardValue}>14 Daily</div>
          <div className={styles.cardFooter}>
            <span>Retention: 14 days · Next 3 pre-created</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Disk Free Ratio</span>
            <HardDrive size={14} color="var(--warning)" />
          </div>
          <div className={styles.cardValue}>86% Free</div>
          <div className={styles.cardFooter}>
            <span>Disk guard threshold: 15% warning / 8% protective</span>
          </div>
        </div>
      </div>
    </div>
  );
};
