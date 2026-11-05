import React, { useState, useEffect, useCallback } from "react";
import styles from "./LogsExplorer.module.css";
import { Input } from "../../../components/ui/Input/Input";
import { Button } from "../../../components/ui/Button/Button";
import { LevelPill } from "../../../components/ui/LevelPill/LevelPill";
import { Histogram, HistogramBucket } from "../../../components/ui/Histogram/Histogram";
import { Drawer } from "../../../components/ui/Drawer/Drawer";
import { ServiceFilter, ServiceItem } from "../../../components/ui/ServiceFilter/ServiceFilter";
import { LevelFilterGroup, LogLevelName } from "../../../components/ui/LevelFilterGroup/LevelFilterGroup";
import { TimeRangePicker } from "../../../components/ui/TimeRangePicker/TimeRangePicker";
import { X, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<LogLevelName[]>([]);
  const [selectedHours, setSelectedHours] = useState<number>(24);

  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [buckets, setBuckets] = useState<HistogramBucket[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const buildQuery = useCallback(
    (freeText: string, services: string[], levels: LogLevelName[]) => {
      const parts: string[] = [];
      if (freeText.trim()) parts.push(freeText.trim());
      services.forEach((s) => parts.push(`service:${s}`));
      levels.forEach((l) => parts.push(`level:${l}`));
      return parts.join(" ");
    },
    []
  );

  const fetchFacets = async (hours: number) => {
    try {
      const res = await fetch(`/v1/logs/facets?hours=${Math.ceil(hours)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableServices(data.services || []);
      }
    } catch {
      setAvailableServices([]);
    }
  };

  const fetchLogs = async (overrideQ?: string) => {
    setLoading(true);
    const q = overrideQ !== undefined ? overrideQ : buildQuery(searchQuery, selectedServices, selectedLevels);
    try {
      const url = new URL("/v1/logs", window.location.origin);
      if (q.trim()) {
        url.searchParams.set("q", q.trim());
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

  const fetchHistogram = async (hours: number) => {
    try {
      const stepMinutes = hours <= 1 ? 1 : hours <= 6 ? 5 : 15;
      const res = await fetch(`/v1/logs/histogram?hours=${Math.ceil(hours)}&step_minutes=${stepMinutes}`);
      if (res.ok) {
        const data = await res.json();
        setBuckets(data.buckets || []);
      }
    } catch {
      setBuckets([]);
    }
  };

  useEffect(() => {
    fetchFacets(selectedHours);
    fetchHistogram(selectedHours);
  }, [selectedHours]);

  useEffect(() => {
    const q = buildQuery(searchQuery, selectedServices, selectedLevels);
    fetchLogs(q);
  }, [selectedServices, selectedLevels, selectedHours]);

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedServices([]);
    setSelectedLevels([]);
    setSelectedHours(24);
  };

  const handleFilterByService = (service: string) => {
    if (!selectedServices.includes(service)) {
      setSelectedServices([...selectedServices, service]);
    }
    setSelectedLog(null);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
    } catch {
      return iso;
    }
  };

  const activePillsCount = selectedServices.length + selectedLevels.length + (searchQuery.trim() ? 1 : 0);

  return (
    <div className={styles.explorer}>
      <div className={styles.topBar}>
        <Input
          sizeVariant="lg"
          className={styles.searchInput}
          prefixIcon={<Search size={16} />}
          placeholder="Search log messages, traces, or fields (e.g. timeout, usr_42)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
        />
        <Button
          size="lg"
          variant="primary"
          className={styles.searchButton}
          loading={loading}
          onClick={() => fetchLogs()}
        >
          Search Logs
        </Button>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.filtersLeft}>
          <ServiceFilter
            services={availableServices}
            selectedServices={selectedServices}
            onChange={setSelectedServices}
          />
          <LevelFilterGroup
            selectedLevels={selectedLevels}
            onChange={setSelectedLevels}
          />
        </div>
        <div className={styles.filtersRight}>
          <TimeRangePicker
            selectedHours={selectedHours}
            onChange={setSelectedHours}
          />
          {activePillsCount > 0 && (
            <button type="button" className={styles.clearBtn} onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {activePillsCount > 0 && (
        <div className={styles.activePillsRow}>
          {searchQuery.trim() && (
            <span className={styles.filterPill}>
              <span>query: "{searchQuery.trim()}"</span>
              <button
                type="button"
                className={styles.removePill}
                onClick={() => setSearchQuery("")}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedServices.map((svc) => (
            <span key={svc} className={styles.filterPill}>
              <span>service:{svc}</span>
              <button
                type="button"
                className={styles.removePill}
                onClick={() => setSelectedServices((prev) => prev.filter((s) => s !== svc))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedLevels.map((lvl) => (
            <span key={lvl} className={styles.filterPill}>
              <span>level:{lvl}</span>
              <button
                type="button"
                className={styles.removePill}
                onClick={() => setSelectedLevels((prev) => prev.filter((l) => l !== lvl))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

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
        <span>Window: Last {selectedHours < 1 ? "15 mins" : selectedHours === 1 ? "1 hour" : `${selectedHours} hours`}</span>
      </div>

      <div className={styles.tableWrapper}>
        {logs.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No log events match query.</span>
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
