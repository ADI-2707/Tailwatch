import React, { useState, useEffect } from "react";
import styles from "./LogsExplorer.module.css";
import { Input } from "../../../components/ui/Input/Input";
import { Button } from "../../../components/ui/Button/Button";
import { LevelPill } from "../../../components/ui/LevelPill/LevelPill";

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
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = new URL("/v1/logs", window.location.origin);
      if (query.trim()) {
        url.searchParams.set("q", query.trim());
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

  useEffect(() => {
    fetchLogs();
  }, []);

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
          className={styles.searchInput}
          placeholder="Filter logs... (e.g. timeout, service:payment, error)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
        />
        <Button variant="primary" loading={loading} onClick={fetchLogs}>
          Search
        </Button>
      </div>

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
                <tr key={log.id} className={styles.row}>
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
    </div>
  );
};
