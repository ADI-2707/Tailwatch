import React, { useState } from "react";
import { Shell } from "./components/layout/Shell/Shell";
import { LogsExplorer } from "./features/logs/LogsExplorer/LogsExplorer";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<"logs" | "tail" | "alerts" | "sources" | "system">("logs");

  return (
    <Shell currentTab={currentTab} onTabChange={setCurrentTab} projectSlug="production">
      {currentTab === "logs" && <LogsExplorer />}
      {currentTab !== "logs" && (
        <div style={{ padding: "var(--space-8)", color: "var(--text-muted)", textAlign: "center" }}>
          <span>Feature {currentTab} view coming up</span>
        </div>
      )}
    </Shell>
  );
};

export default App;
