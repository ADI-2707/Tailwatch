import React, { useState, useEffect } from "react";
import styles from "./LogsExplorer.module.css";
import { Input } from "../../../components/ui/Input/Input";
import { Button } from "../../../components/ui/Button/Button";
import { LevelPill } from "../../../components/ui/LevelPill/LevelPill";
import { Histogram, HistogramBucket } from "../../../components/ui/Histogram/Histogram";
import { Drawer } from "../../../components/ui/Drawer/Drawer";

export interface LogEntry {
  id: string;
  ts: string;
  level: number;
  service: string;
  host: string;
  source: string;
  message: string;
  fields: Record<string, unknown>;
  trace_id?: string;
}

export const LogsExplorer: React.FC = () => {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [buckets, setBuckets] = useState<HistogramBucket[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (overrideQuery?: string) => {
    setLoading(true);
    const activeQuery = overrideQuery !== undefined ? overrideQuery : query;
    try {
      const url = new URL("/v1/logs", window.location.origin);
      if (activeQuery.trim()) {
        url.searchParams.set("q", activeQuery.trim());
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setLogs(data.events || []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistogram = async () => {
    try {
      const res = await fetch("/v1/logs/histogram?hours=24&step_minutes=15");
      if (res.ok) {
        const data = await res.json();
        setBuckets(data.buckets || []);
      }
    } catch {
      setBuckets([]);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchHistogram();
  }, []);

  const handleFilterByService = (service: string) => {
    const nextQ = `service:${service}`;
    setQuery(nextQ);
    setSelectedLog(null);
    fetchLogs(nextQ);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
    } catch {
      return iso;
    }
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.topBar}>
        <Input
          sizeVariant="lg"
          className={styles.searchInput}
          placeholder="Filter logs... (e.g. timeout, service:payment, error)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
        />
        <Button
          size="lg"
          variant="primary"
          className={styles.searchButton}
          loading={loading}
          onClick={() => fetchLogs()}
        >
          Search
        </Button>
      </div>

      {buckets.length > 0 && (
        <Histogram
          buckets={buckets}
          onRangeSelect={(startIdx, endIdx) => {
            const startBucket = buckets[startIdx];
            const endBucket = buckets[endIdx];
            if (startBucket && endBucket) {
              fetchLogs();
            }
          }}
        />
      )}

      <div className={styles.statsBar}>
        <span>{logs.length} events loaded</span>
        <span>Window: Last 24 hours</span>
      </div>

      <div className={styles.tableWrapper}>
        {logs.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No matching log events found</span>
            <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
              Run the agent or send logs to /v1/ingest
            </span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Level</th>
                <th>Service</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={styles.row}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedLog(log)}
                >
                  <td className={`${styles.cell} ${styles.cellTime}`}>{formatTimestamp(log.ts)}</td>
                  <td className={`${styles.cell} ${styles.cellLevel}`}>
                    <LevelPill level={log.level} />
                  </td>
                  <td className={`${styles.cell} ${styles.cellService}`}>{log.service}</td>
                  <td className={`${styles.cell} ${styles.cellMessage}`}>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onFilterByService={handleFilterByService}
      />
    </div>
  );
};
