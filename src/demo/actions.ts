/* Demo actions. Each one changes local state only and leaves a trace in Activity.
   None of them sends, uploads, pays or files anything. */
import { getDemo, logActivity, setDemo, toast, demoTime, DEFAULT_REMINDER, FORECAST_DEFAULTS, type ForecastInputs } from "./store";
import { workerById, siteById } from "./selectors";
import { CERT_LABEL, type CertType, type SiteId, type TaskStatus, type WorkerId } from "./walshData";

const addTask = (title: string, owner: string, dept: string, related: string, link: { page: string; tab: string }, priority: "High" | "Medium" | "Low" = "Medium") =>
  setDemo((s) => ({ extraTasks: [{ id: "T-4" + String(s.extraTasks.length + 1).padStart(2, "0"), title, owner, due: "Tue 17 Nov", priority, dept, status: "Open" as TaskStatus, related, link }].concat(s.extraTasks) }));

/* Story A: TS-1098 */
export function requestClientSignoff() {
  if (getDemo().ts1098 !== "pending") return;
  setDemo({ ts1098: "signoff_requested" });
  logActivity({ kind: "people", actor: "Elaine Walsh", title: "Re-sent sign-off request to Morrow for TS-1098", detail: "8h · €320 · Fri 13 Nov. Demo only: no email sent.", link: { page: "Timesheets", tab: "approval" } });
  addTask("Follow up Morrow sign-off for TS-1098", "Elaine Walsh", "Timesheets", "TS-1098", { page: "Timesheets", tab: "approval" }, "High");
  toast("Updated demo · sign-off request logged, task created");
}
export function approveTs1098() {
  setDemo({ ts1098: "approved" });
  logActivity({ kind: "client", actor: "Morrow project lead (simulated)", title: "Signed TS-1098 · 8h released to invoicing", detail: "Invoice-ready €23,270 → €23,590. Morrow draft €4,280 → €4,600.", link: { page: "Finance", tab: "invoices" } });
  toast("Updated demo · TS-1098 approved, invoice-ready now €23,590");
}
export function resetTs1098() {
  setDemo({ ts1098: "pending" });
  logActivity({ kind: "system", actor: "Demo control", title: "TS-1098 returned to pending", detail: "Invoice-ready back to €23,270." });
  toast("Updated demo · TS-1098 back to pending");
}

/* Stories B & C: documents */
const key = (w: WorkerId, t: CertType) => w + ":" + t;
export function requestDocument(w: WorkerId, t: CertType) {
  const wk = workerById(w);
  setDemo((s) => ({ docs: { ...s.docs, [key(w, t)]: { status: "requested", at: demoTime(s) } } }));
  logActivity({ kind: "people", actor: "Elaine Walsh", title: "Requested updated " + CERT_LABEL[t] + " from " + wk.name, detail: "Worker portal notification (demo). No SMS or email sent.", link: { page: "Compliance", tab: "expiring" } });
  toast("Updated demo · request sent to " + wk.name.split(" ")[0] + "'s worker portal");
}
export function simulateUpload(w: WorkerId, t: CertType, by = "worker portal") {
  const wk = workerById(w);
  const newExpiry = t === "safe-pass" ? "2030-11-20" : t === "manual-handling" ? "2029-11-16" : "2027-12-02";
  setDemo((s) => ({ docs: { ...s.docs, [key(w, t)]: { status: "under_review", at: demoTime(s), newExpiry, by } } }));
  logActivity({ kind: "people", actor: wk.name, title: "Uploaded " + CERT_LABEL[t] + " (simulated)", detail: "Waiting for review. Stored in browser memory only.", attention: true, link: { page: "Compliance", tab: "documents" } });
  toast("Updated demo · upload waiting for review");
}
export function verifyDocument(w: WorkerId, t: CertType) {
  const wk = workerById(w);
  setDemo((s) => {
    const d = s.docs[key(w, t)];
    return { docs: { ...s.docs, [key(w, t)]: { status: "verified", at: demoTime(s), newExpiry: d?.newExpiry || "2029-11-16", by: d?.by } } };
  });
  const site = wk.siteId ? siteById(wk.siteId).name : "";
  logActivity({ kind: "people", actor: "Elaine Walsh", title: "Approved " + wk.name + "'s " + CERT_LABEL[t], detail: site ? "Risk totals recomputed. Site clearance re-checked for " + site + "." : "Risk totals recomputed.", link: { page: "Compliance", tab: "overview" } });
  toast("Updated demo · " + wk.name + " document approved");
}
export function toggleHold(w: WorkerId) {
  const on = !getDemo().manualHolds[w];
  const wk = workerById(w);
  setDemo((s) => ({ manualHolds: { ...s.manualHolds, [w]: on } }));
  logActivity({ kind: "people", actor: "Paul Walsh", title: (on ? "Held" : "Released") + " site access for " + wk.name, detail: "Manual hold (demo). Roster and readiness recomputed.", attention: on, link: { page: "Compliance", tab: "site" } });
  toast("Updated demo · site access " + (on ? "held" : "released"));
}

/* Story D: debtor reminder */
export function setReminderText(text: string) { setDemo((s) => ({ reminder: { ...s.reminder, text } })); }
export function submitReminder() {
  setDemo((s) => ({ reminder: { ...s.reminder, status: "pending_approval" } }));
  logActivity({ kind: "people", actor: "Elaine Walsh", title: "Submitted INV-2026-103 reminder for approval", detail: "Routed to Paul in Work › Approvals. Not sent.", attention: true, link: { page: "Work", tab: "approvals" } });
  toast("Updated demo · reminder routed to Work › Approvals");
}
export function approveReminder() {
  setDemo((s) => ({ reminder: { ...s.reminder, status: "approved_demo" } }));
  logActivity({ kind: "people", actor: "Paul Walsh", title: "Approved INV-2026-103 reminder (demo)", detail: "Marked approved. A real send would need a connected email account. Nothing left the demo.", link: { page: "Finance", tab: "debtors" } });
  toast("Updated demo · approved. No email was sent");
}
export function resetReminder() { setDemo({ reminder: { text: DEFAULT_REMINDER, status: "draft" } }); }

/* Story E: forecast */
export function setForecast(p: Partial<ForecastInputs>) { setDemo((s) => ({ forecast: { ...s.forecast, ...p } })); }
export function resetForecast() { setDemo({ forecast: { ...FORECAST_DEFAULTS } }); }
export function saveForecastNote() {
  const f = getDemo().forecast;
  logActivity({ kind: "people", actor: "Paul Walsh", title: "Edited the growth forecast", detail: "+" + f.addWorkers + " workers × " + f.hoursPerWorker + "h × " + f.weeks + " wks at €" + f.billRate + " / €" + f.costRate + ".", link: { page: "Finance", tab: "forecast" } });
  toast("Updated demo · forecast saved to Activity");
}

/* Story F: requests */
export function decideRequest(id: string, decision: "approved" | "declined") {
  setDemo((s) => ({ requests: { ...s.requests, [id]: decision } }));
  logActivity({ kind: "people", actor: "Paul Walsh", title: (decision === "approved" ? "Approved " : "Declined ") + id + (id === "REQ-204" ? " · North Quay roster" : ""),
    detail: decision === "approved" ? "Roster preview published to the client portal (simulation)." : "Client told the roster is being revised (simulation).", link: { page: "Clients", tab: "requests" } });
  toast("Updated demo · " + id + " " + decision);
}

/* Cover / reallocation */
export function planCover(worker: WorkerId, siteId: SiteId, covering?: WorkerId) {
  const wk = workerById(worker);
  setDemo((s) => ({ cover: { ...s.cover, [worker]: { siteId, covering, from: "Tue 17 Nov" } } }));
  logActivity({ kind: "people", actor: "Paul Walsh", title: "Planned " + wk.name + " for " + siteById(siteId).name + " from Tue 17 Nov", detail: covering ? "Cover for " + workerById(covering).name + ". Roster preview only." : "Roster preview only.", link: { page: "Operations", tab: "allocations" } });
  toast("Updated demo · " + wk.name + " planned for " + siteById(siteId).name);
}
export function clearCover(worker: WorkerId) {
  setDemo((s) => { const c = { ...s.cover }; delete c[worker]; return { cover: c }; });
  toast("Updated demo · cover plan removed");
}

/* Agents & tasks */
export function decideRun(id: string, d: "approved" | "dismissed", title: string) {
  setDemo((s) => ({ runs: { ...s.runs, [id]: d } }));
  logActivity({ kind: "agent", actor: "Paul Walsh", title: (d === "approved" ? "Approved agent suggestion: " : "Dismissed agent suggestion: ") + title, detail: "Simulated decision. " + id + ".", link: { page: "Agents", tab: "review" } });
  toast("Updated demo · suggestion " + d);
}
export function setTaskStatus(id: string, status: TaskStatus) {
  setDemo((s) => ({ tasks: { ...s.tasks, [id]: status } }));
}
