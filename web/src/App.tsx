import React, { useState } from "react";
import { Shell } from "./components/layout/Shell/Shell";
import { LogsExplorer } from "./features/logs/LogsExplorer/LogsExplorer";
import { LiveTail } from "./features/tail/LiveTail/LiveTail";
import { AlertsView } from "./features/alerts/AlertsView/AlertsView";
import { SourcesView } from "./features/sources/SourcesView/SourcesView";
import { SystemView } from "./features/system/SystemView/SystemView";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<"logs" | "tail" | "alerts" | "sources" | "system">("logs");

  return (
    <Shell currentTab={currentTab} onTabChange={setCurrentTab} projectSlug="production">
      {currentTab === "logs" && <LogsExplorer />}
      {currentTab === "tail" && <LiveTail />}
      {currentTab === "alerts" && <AlertsView />}
      {currentTab === "sources" && <SourcesView />}
      {currentTab === "system" && <SystemView />}
    </Shell>
  );
};

export default App;
