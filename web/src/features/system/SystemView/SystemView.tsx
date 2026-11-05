import React from "react";
import styles from "./SystemView.module.css";
import { Database, HardDrive, Activity, Clock } from "lucide-react";
import { StatusChip } from "../../../components/ui/StatusChip/StatusChip";

interface SystemStatus {
  status: string;
  queue_used_mb: number;
  queue_max_mb: number;
  queue_percent: number;
  partitions_count: number;
  disk_free_percent: number;
  writer_lag_ms: number;
}

export const SystemView: React.FC = () => {
  const [data, setData] = React.useState<SystemStatus>({
    status: "ok",
    queue_used_mb: 4.2,
    queue_max_mb: 1024,
    queue_percent: 0.4,
    partitions_count: 3,
    disk_free_percent: 88,
    writer_lag_ms: 45,
  });

  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/v1/system/status");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.systemWrapper}>
      <div className={styles.box}>
        <div className={styles.headerBar}>
          <span className={styles.statsText}>
            Tailwatch Platform Health · Deployment Profile: S (2 vCPU / 4 GB)
          </span>
          <StatusChip state="ok" label="SYSTEM NORMAL" />
        </div>

        <div className={styles.pipelineStrip}>
          <div className={styles.stage}>
            <StatusChip state="ok" label="AGENTS" />
            <span className={styles.stageName}>Telemetry Active</span>
          </div>
          <div style={{ color: "var(--border-strong)" }}>➔</div>
          <div className={styles.stage}>
            <StatusChip state="ok" label="API INGEST" />
            <span className={styles.stageName}>HTTP / SSE</span>
          </div>
          <div style={{ color: "var(--border-strong)" }}>➔</div>
          <div className={styles.stage}>
            <StatusChip state="ok" label="VALKEY QUEUE" />
            <span className={styles.stageName}>{data.queue_used_mb} MB ({data.queue_percent}%)</span>
          </div>
          <div style={{ color: "var(--border-strong)" }}>➔</div>
          <div className={styles.stage}>
            <StatusChip state="ok" label="WRITER" />
            <span className={styles.stageName}>Lag: {data.writer_lag_ms}ms</span>
          </div>
          <div style={{ color: "var(--border-strong)" }}>➔</div>
          <div className={styles.stage}>
            <StatusChip state="ok" label="POSTGRESQL" />
            <span className={styles.stageName}>{data.partitions_count} Partitions</span>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>Queue Memory</span>
              <Activity size={14} color="var(--accent)" />
            </div>
            <div className={styles.cardValue}>{data.queue_used_mb} MB / {data.queue_max_mb} MB</div>
            <div className={styles.cardFooter}>
              <span>Valkey Stream buffer · Level 0 Normal</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>Writer Lag</span>
              <Clock size={14} color="var(--success)" />
            </div>
            <div className={styles.cardValue}>{data.writer_lag_ms} ms</div>
            <div className={styles.cardFooter}>
              <span>Target: &lt; 5s · Microbatch binary COPY</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>Database Partitions</span>
              <Database size={14} color="var(--info)" />
            </div>
            <div className={styles.cardValue}>{data.partitions_count} Active</div>
            <div className={styles.cardFooter}>
              <span>Retention: 14 days · Daily partitioned</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span>Disk Free Ratio</span>
              <HardDrive size={14} color="var(--warning)" />
            </div>
            <div className={styles.cardValue}>{data.disk_free_percent}% Free</div>
            <div className={styles.cardFooter}>
              <span>Disk guard threshold: 15% warning / 8% protective</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
