import React, { useState } from "react";
import styles from "./AuthView.module.css";
import { Button } from "../../components/ui/Button/Button";
import { Input } from "../../components/ui/Input/Input";
import { useToast } from "../../components/ui/Toast/Toast";

export interface AuthViewProps {
  mode: "setup" | "login";
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ mode, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projectName, setProjectName] = useState("Production");
  const [projectSlug, setProjectSlug] = useState("production");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Email and password are required", "warning");
      return;
    }

    setLoading(true);
    try {
      if (mode === "setup") {
        if (!name || !projectSlug) {
          showToast("Name and project slug are required", "warning");
          setLoading(false);
          return;
        }

        const res = await fetch("/v1/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            project_name: projectName,
            project_slug: projectSlug.toLowerCase().trim(),
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Setup failed");
        }

        showToast("Tailwatch admin account & project created!", "success");
        onSuccess();
      } else {
        const res = await fetch("/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Invalid email or password");
        }

        showToast("Logged in successfully", "success");
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            <span>Tailwatch</span>
          </div>
          <span className={styles.title}>
            {mode === "setup" ? "Initial Platform Setup" : "Sign In to Your Workspace"}
          </span>
          <span className={styles.subtitle}>
            {mode === "setup"
              ? "Create your owner credentials and primary project"
              : "Enter your account email and password"}
          </span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === "setup" && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Your Name</label>
                <Input
                  placeholder="e.g. Aditya Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>First Project Name</label>
                <Input
                  placeholder="e.g. Production"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Project URL Slug</label>
                <Input
                  placeholder="e.g. production"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email Address</label>
            <Input
              type="email"
              placeholder="admin@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="primary" loading={loading} style={{ width: "100%", marginTop: "var(--space-2)" }}>
            {mode === "setup" ? "Initialize Workspace" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};
