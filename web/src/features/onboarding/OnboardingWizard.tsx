import React, { useState, useEffect } from "react";
import styles from "./OnboardingWizard.module.css";
import { Button } from "../../components/ui/Button/Button";
import { useToast } from "../../components/ui/Toast/Toast";
import { Copy, ArrowRight } from "../../components/ui/Icon";

export interface OnboardingWizardProps {
  projectSlug: string;
  onFinish: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ projectSlug, onFinish }) => {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState("twk_live_demo123_abc456");
  const [activeTab, setActiveTab] = useState<"docker" | "vercel" | "http">("docker");
  const [hasReceivedEvent, setHasReceivedEvent] = useState(false);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch(`/v1/projects/${projectSlug}/keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default Ingest Key", scopes: ["ingest"] }),
        });
        if (res.ok) {
          const data = await res.json();
          setApiKey(data.token);
        }
      } catch {
      }
    };
    fetchKey();
  }, [projectSlug]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/v1/logs?limit=1");
        if (res.ok) {
          const data = await res.json();
          if (data.count > 0) {
            setHasReceivedEvent(true);
            showToast("First event received live from source!", "success");
            clearInterval(interval);
          }
        }
      } catch {
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showToast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied command to clipboard", "success");
  };

  const hostUrl = window.location.origin;

  const codeSnippets = {
    docker: `docker run -d --name tailwatch-agent \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v /var/log:/var/log:ro \\
  -e TAILWATCH_URL=${hostUrl} \\
  -e TAILWATCH_API_KEY=${apiKey} \\
  ghcr.io/tailwatch/agent:latest`,

    vercel: `await fetch("${hostUrl}/v1/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey}"
  },
  body: JSON.stringify({
    batch_id: crypto.randomUUID(),
    events: [{
      ts: new Date().toISOString(),
      level: "error",
      service: "my-nextjs-app",
      message: "Database connection failed",
      fields: { "route": "/api/checkout" }
    }]
  })
});`,

    http: `curl -X POST "${hostUrl}/v1/ingest" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "batch_id": "test-batch-001",
    "events": [{
      "ts": "2026-10-18T12:00:00Z",
      "level": "info",
      "service": "api-service",
      "message": "User signed in successfully",
      "fields": { "user_id": "u_9482" }
    }]
  }'`,
  };

  return (
    <div className={styles.wizardWrapper}>
      <div className={styles.header}>
        <span className={styles.title}>Connect Your First Log Source</span>
        <span className={styles.subtitle}>
          Choose your environment below and run the command to start streaming logs into project: <strong>{projectSlug}</strong>
        </span>
      </div>

      <div className={styles.detectorCard}>
        <div className={styles.waitingStatus}>
          <span className={hasReceivedEvent ? styles.successDot : styles.pulseDot} />
          <span>
            {hasReceivedEvent
              ? "First log event detected! Data pipeline verified."
              : "Waiting for first log event to arrive..."}
          </span>
        </div>
        {hasReceivedEvent && (
          <Button variant="primary" size="sm" onClick={onFinish}>
            <span>Open Logs Dashboard</span>
            <ArrowRight size={14} />
          </Button>
        )}
      </div>

      <div className={styles.tabList}>
        <button
          className={`${styles.tabItem} ${activeTab === "docker" ? styles.active : ""}`}
          onClick={() => setActiveTab("docker")}
        >
          Docker Container
        </button>
        <button
          className={`${styles.tabItem} ${activeTab === "vercel" ? styles.active : ""}`}
          onClick={() => setActiveTab("vercel")}
        >
          Vercel / Serverless
        </button>
        <button
          className={`${styles.tabItem} ${activeTab === "http" ? styles.active : ""}`}
          onClick={() => setActiveTab("http")}
        >
          cURL / HTTP API
        </button>
      </div>

      <div className={styles.codeSnippet}>
        <Button
          size="sm"
          variant="secondary"
          className={styles.copyButton}
          onClick={() => copyToClipboard(codeSnippets[activeTab])}
        >
          <Copy size={13} />
          <span>Copy</span>
        </Button>
        <code>{codeSnippets[activeTab]}</code>
      </div>
    </div>
  );
};
