import React, { useState, useEffect } from "react";
import { Shell, ShellTab } from "./components/layout/Shell/Shell";
import { LogsExplorer } from "./features/logs/LogsExplorer/LogsExplorer";
import { LiveTail } from "./features/tail/LiveTail/LiveTail";
import { AlertsView } from "./features/alerts/AlertsView/AlertsView";
import { SourcesView } from "./features/sources/SourcesView/SourcesView";
import { SystemView } from "./features/system/SystemView/SystemView";
import { AuthView } from "./features/auth/AuthView";
import { OnboardingWizard } from "./features/onboarding/OnboardingWizard";

interface AuthStatus {
  initialized: boolean;
  authenticated: boolean;
  user?: {
    email: string;
    name: string;
    role: string;
  };
}

export const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [currentTab, setCurrentTab] = useState<ShellTab>("logs");
  const [projectSlug, setProjectSlug] = useState<string>("production");

  const checkAuth = async () => {
    try {
      const res = await fetch("/v1/auth/status");
      if (res.ok) {
        const data = await res.json();
        setAuthStatus(data);
      }
    } catch {
      setAuthStatus({ initialized: true, authenticated: true });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/v1/auth/logout", { method: "POST" });
    } catch {
    }
    setAuthStatus((prev) => prev ? { ...prev, authenticated: false } : null);
  };

  if (!authStatus) {
    return null;
  }

  if (!authStatus.initialized) {
    return (
      <AuthView
        mode="setup"
        onSuccess={() => {
          checkAuth();
          setCurrentTab("onboarding");
        }}
      />
    );
  }

  if (!authStatus.authenticated) {
    return (
      <AuthView
        mode="login"
        onSuccess={() => {
          checkAuth();
        }}
      />
    );
  }

  return (
    <Shell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      projectSlug={projectSlug}
      onLogout={handleLogout}
    >
      {currentTab === "logs" && <LogsExplorer />}
      {currentTab === "tail" && <LiveTail />}
      {currentTab === "alerts" && <AlertsView />}
      {currentTab === "sources" && <SourcesView />}
      {currentTab === "system" && <SystemView />}
      {currentTab === "onboarding" && (
        <OnboardingWizard
          projectSlug={projectSlug}
          onFinish={() => setCurrentTab("logs")}
        />
      )}
    </Shell>
  );
};

export default App;
