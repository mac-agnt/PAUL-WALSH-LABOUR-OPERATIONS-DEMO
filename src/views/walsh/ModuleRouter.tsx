/* Routes the Walsh module pages. Each module file exports a default component
   taking { tab } (the active top-bar tab id from src/demo/nav.ts). */
import DashboardModule from "./DashboardModule";
import AgentsModule from "./AgentsModule";
import OperationsModule from "./OperationsModule";
import CrewModule from "./CrewModule";
import TimesheetsModule from "./TimesheetsModule";
import ComplianceModule from "./ComplianceModule";
import ClientsModule from "./ClientsModule";
import FinanceModule from "./FinanceModule";
import WorkModule from "./WorkModule";
import RecordsExtra from "./RecordsExtra";
import ActivityModule from "./ActivityModule";
import SettingsModule from "./SettingsModule";

export default function ModuleRouter({ v }: { v: any }) {
  const tab: string = v.modTab || "";
  if (v.page === "Records") return <RecordsExtra tab={v.rec?.extra || ""} />;
  switch (v.page) {
    case "Dashboard": return <DashboardModule tab={tab} />;
    case "Agents": return <AgentsModule tab={tab} />;
    case "Operations": return <OperationsModule tab={tab} />;
    case "Crew": return <CrewModule tab={tab} />;
    case "Timesheets": return <TimesheetsModule tab={tab} />;
    case "Compliance": return <ComplianceModule tab={tab} />;
    case "Clients": return <ClientsModule tab={tab} />;
    case "Finance": return <FinanceModule tab={tab} />;
    case "Work": return <WorkModule tab={tab} />;
    case "Activity": return <ActivityModule tab={tab} />;
    case "Settings": return <SettingsModule tab={tab} v={v} />;
    default: return null;
  }
}
