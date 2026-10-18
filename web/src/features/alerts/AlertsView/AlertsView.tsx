import React, { useState } from "react";
import styles from "./AlertsView.module.css";
import { Button } from "../../../components/ui/Button/Button";
import { Input } from "../../../components/ui/Input/Input";
import { StatusChip, AlertState } from "../../../components/ui/StatusChip/StatusChip";
import { useToast } from "../../../components/ui/Toast/Toast";
import { Plus, Bell, X } from "lucide-react";

export interface AlertRule {
  id: string;
  name: string;
  query: string;
  threshold: number;
  window_m: number;
  state: AlertState;
  enabled: boolean;
}

export const AlertsView: React.FC = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleQuery, setNewRuleQuery] = useState("");
  const [newRuleThreshold, setNewRuleThreshold] = useState("50");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/v1/alert-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch {
      // keep local
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async () => {
    if (!newRuleName.trim() || !newRuleQuery.trim()) {
      showToast("Please provide both rule name and query", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/v1/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: "production",
          name: newRuleName.trim(),
          query: newRuleQuery.trim(),
          threshold: parseFloat(newRuleThreshold) || 10,
          window_s: 300,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save rule");
      }

      showToast(`Alert rule '${newRuleName.trim()}' saved to database`, "success");
      setIsModalOpen(false);
      setNewRuleName("");
      setNewRuleQuery("");
      fetchRules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating rule";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = !r.enabled;
          showToast(`Rule '${r.name}' ${updated ? "enabled" : "disabled"}`, "info");
          return { ...r, enabled: updated };
        }
        return r;
      })
    );
  };

  return (
    <div className={styles.alertsWrapper}>
      <div className={styles.headerBar}>
        <div>
          <span className={styles.statsText}>
            {rules.length} configured alert rules · 1 pending · Evaluated every 15s
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} />
          <span>New Alert Rule</span>
        </Button>
      </div>

      <div className={styles.rulesList}>
        {rules.map((rule) => (
          <div key={rule.id} className={styles.ruleRow}>
            <div className={styles.ruleMain}>
              <StatusChip state={rule.state} />
              <div className={styles.ruleInfo}>
                <span className={styles.ruleName}>{rule.name}</span>
                <span className={styles.ruleCondition}>
                  {rule.query} &gt; {rule.threshold} / {rule.window_m}m
                </span>
              </div>
            </div>

            <div className={styles.ruleActions}>
              <Button
                size="sm"
                variant={rule.enabled ? "secondary" : "ghost"}
                onClick={() => toggleRule(rule.id)}
              >
                {rule.enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Bell size={16} />
                <span className={styles.modalTitle}>Create Alert Rule</span>
              </div>
              <button
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <Input
              placeholder="Rule Name (e.g. Postgres Connection Timeouts)"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
            />

            <Input
              placeholder="TQL Query (e.g. service:payment level:>=error)"
              value={newRuleQuery}
              onChange={(e) => setNewRuleQuery(e.target.value)}
            />

            <Input
              placeholder="Threshold count (default 50)"
              type="number"
              value={newRuleThreshold}
              onChange={(e) => setNewRuleThreshold(e.target.value)}
            />

            <div className={styles.modalFooter}>
              <Button size="sm" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCreateRule}>
                Save Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
