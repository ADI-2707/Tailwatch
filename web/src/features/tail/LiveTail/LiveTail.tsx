import React, { useState, useEffect, useRef } from "react";
import styles from "./LiveTail.module.css";
import { Button } from "../../../components/ui/Button/Button";
import { LevelPill } from "../../../components/ui/LevelPill/LevelPill";
import { Play, Pause, Trash2 } from "lucide-react";
import { LogEntry } from "../../logs/LogsExplorer/LogsExplorer";

export const LiveTail: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      eventSourceRef.current?.close();
      return;
    }

    const es = new EventSource("/v1/logs/tail");
    eventSourceRef.current = es;

    es.addEventListener("log", (e) => {
      try {
        const item: LogEntry = JSON.parse(e.data);
        setEvents((prev) => [...prev.slice(-499), item]);
      } catch {
        // invalid item
      }
    });

    return () => {
      es.close();
    };
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events, isStreaming]);

  const toggleStream = () => {
    setIsStreaming((prev) => !prev);
  };

  const clearBuffer = () => {
    setEvents([]);
  };

  return (
    <div className={styles.liveTailWrapper}>
      <div className={styles.controlsBar}>
        <div className={styles.leftControls}>
          <div className={styles.statusIndicator}>
            <span className={isStreaming ? styles.liveDot : styles.pausedDot} />
            <span>{isStreaming ? "Live Connected" : "Stream Paused"}</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Buffer: {events.length} / 500 events
          </span>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button size="sm" variant={isStreaming ? "secondary" : "primary"} onClick={toggleStream}>
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            <span>{isStreaming ? "Pause" : "Resume"}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={clearBuffer}>
            <Trash2 size={14} />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      <div ref={terminalRef} className={styles.terminalView}>
        {events.length === 0 ? (
          <div style={{ color: "var(--text-subtle)", textAlign: "center", padding: "var(--space-12)" }}>
            <span>Waiting for live log stream...</span>
          </div>
        ) : (
          events.map((ev, i) => (
            <div key={i} className={styles.streamLine}>
              <span className={styles.streamTs}>
                {new Date(ev.ts).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <LevelPill level={ev.level} />
              <span className={styles.streamService}>{ev.service}</span>
              <span className={styles.streamMessage}>{ev.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
