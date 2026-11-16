/* Top-bar tabs per module. Records keeps its own REC_SECTIONS (Ontology first). */
export const MODULE_TABS: Record<string, { id: string; label: string }[]> = {
  Dashboard: [
    { id: "executive", label: "Executive" }, { id: "margin", label: "Revenue & Margin" },
    { id: "forecast", label: "Forecast" }, { id: "exceptions", label: "Exceptions" }],
  Agents: [
    { id: "overview", label: "Overview" }, { id: "directory", label: "Agent directory" },
    { id: "runs", label: "Runs" }, { id: "review", label: "Review queue" }],
  Operations: [
    { id: "overview", label: "Overview" }, { id: "allocations", label: "Site allocations" }, { id: "sites", label: "Sites" },
    { id: "requests", label: "Client requests" }, { id: "capacity", label: "Capacity" }],
  Crew: [
    { id: "directory", label: "Directory" }, { id: "profiles", label: "Profiles" }, { id: "availability", label: "Availability" },
    { id: "onboarding", label: "Onboarding" }, { id: "portal", label: "Worker portal" }],
  Timesheets: [
    { id: "overview", label: "Overview" }, { id: "submissions", label: "Submissions" }, { id: "approval", label: "Approval" },
    { id: "exceptions", label: "Exceptions" }, { id: "export", label: "Invoice export" }],
  Compliance: [
    { id: "overview", label: "Overview" }, { id: "documents", label: "Documents" }, { id: "expiring", label: "Expiring" },
    { id: "site", label: "Site requirements" }, { id: "audit", label: "Audit" }],
  Clients: [
    { id: "accounts", label: "Accounts" }, { id: "contacts", label: "Contacts" }, { id: "rates", label: "Rates & contracts" },
    { id: "requests", label: "Client requests" }, { id: "portal", label: "Portal preview" }],
  Finance: [
    { id: "overview", label: "Overview" }, { id: "invoices", label: "Invoices" }, { id: "debtors", label: "Debtors" },
    { id: "costs", label: "Contractor costs" }, { id: "forecast", label: "Forecast" }],
  Work: [
    { id: "tasks", label: "Tasks" }, { id: "approvals", label: "Approvals" }, { id: "workflows", label: "Workflows" }, { id: "schedule", label: "Schedule" }],
  Activity: [
    { id: "all", label: "All activity" }, { id: "attention", label: "Needs attention" }, { id: "agents", label: "Agent actions" }, { id: "system", label: "System events" }],
  Settings: [
    { id: "org", label: "Organisation" }, { id: "users", label: "Users & roles" }, { id: "permissions", label: "Permissions" },
    { id: "systems", label: "Systems & integrations" }, { id: "governance", label: "Governance" }, { id: "ai", label: "AI controls" }, { id: "appearance", label: "Appearance" }],
};

export const MODULE_HINT: Record<string, string> = {
  Dashboard: "WK 46 · 9–15 NOV · DEMO DATA",
  Agents: "7 AGENTS · HUMAN APPROVAL ON",
  Operations: "5 SITES · 15 ALLOCATED",
  Crew: "17 SUBCONTRACTORS",
  Timesheets: "WK 46 · 590H SUBMITTED",
  Compliance: "SITE CLEARANCE",
  Clients: "4 ACCOUNTS · 5 SITES",
  Finance: "BEFORE VAT & OVERHEAD",
  Work: "TASKS & APPROVALS",
  Activity: "ANCHORED · MON 16 NOV",
  Settings: "DEMO WORKSPACE",
};

export const isModulePage = (p: string) => p in MODULE_TABS;
