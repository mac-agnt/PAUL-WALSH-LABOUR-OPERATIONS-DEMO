/* Derived figures. Every number on screen comes from here, computed from the
   fixture plus the local demo state, so screens can never disagree. */
import {
  AGENT_RUNS, BASE_ACTIVITY, CERT_LABEL, CERTS, CLIENTS, INVOICES, REQUESTS, SITES, SITE_RULES, TASKS, TIMESHEETS, WORKERS,
  type ActEvent, type Cert, type CertType, type ClientId, type Invoice, type SiteId, type Task, type Worker, type WorkerId,
} from "./walshData";
import type { DemoState, ForecastInputs, RunStatus } from "./store";

/* ── format ── */
export const eur = (n: number, dp = 0) => (n < 0 ? "−€" : "€") + Math.abs(n).toLocaleString("en-IE", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const pct = (n: number, dp = 1) => n.toFixed(dp) + "%";
export const hrs = (n: number) => n.toLocaleString("en-IE") + "h";

export const ANCHOR = new Date(2026, 10, 16);
const DAY = 86400000;
export const parseISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const fmtISO = (s: string) => { const d = parseISO(s); return d.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()] + " " + d.getFullYear(); };
export const daysFromAnchor = (iso: string) => Math.round((parseISO(iso).getTime() - ANCHOR.getTime()) / DAY);

/* ── lookups ── */
export const workerById = (id: WorkerId) => WORKERS.find((w) => w.id === id)!;
export const siteById = (id: SiteId) => SITES.find((s) => s.id === id)!;
export const clientById = (id: ClientId) => CLIENTS.find((c) => c.id === id)!;
export const sitesOf = (cid: ClientId) => SITES.filter((s) => s.clientId === cid);
export const workersAt = (sid: SiteId) => WORKERS.filter((w) => w.siteId === sid);
export const allocated = () => WORKERS.filter((w) => w.siteId);
export const available = () => WORKERS.filter((w) => !w.siteId);
export const workerHours = (w: Worker) => w.hours.reduce((a, b) => a + b, 0);

/* ── compliance ── */
export type CertState = { cert: Cert; status: "valid" | "expiring" | "expired" | "under_review"; expires: string; days: number; requested?: string; review?: boolean };

export function certState(c: Cert, st: DemoState): CertState {
  const doc = st.docs[c.workerId + ":" + c.type];
  const expires = doc?.status === "verified" && doc.newExpiry ? doc.newExpiry : c.expires;
  const days = daysFromAnchor(expires);
  let status: CertState["status"] = days < 0 ? "expired" : days <= 30 ? "expiring" : "valid";
  const review = doc?.status === "under_review";
  return { cert: c, status, expires, days, requested: doc?.status === "requested" ? doc.at : undefined, review };
}

export const certsOf = (wid: WorkerId, st: DemoState) => CERTS.filter((c) => c.workerId === wid).map((c) => certState(c, st));

export function requiredFor(siteId: SiteId): CertType[] {
  return SITE_RULES.filter((r) => r.siteId === siteId).map((r) => r.cert);
}

export type Readiness = { state: "clear" | "held" | "available"; reasons: string[]; warnings: string[] };
export function readiness(w: Worker, st: DemoState): Readiness {
  const certs = certsOf(w.id, st);
  const warnings = certs.filter((c) => c.status === "expiring").map((c) => labelCert(c) + " expires " + fmtISO(c.expires));
  if (!w.siteId) return { state: "available", reasons: [], warnings };
  const reasons: string[] = [];
  for (const t of requiredFor(w.siteId)) {
    const c = certs.find((x) => x.cert.type === t);
    if (!c) reasons.push(certName(t) + " missing");
    else if (c.status === "expired") reasons.push(certName(t) + " expired " + fmtISO(c.expires));
  }
  if (st.manualHolds[w.id]) reasons.push("Site access held manually (demo)");
  return { state: reasons.length ? "held" : "clear", reasons, warnings };
}

export const certName = (t: CertType) => CERT_LABEL[t];
export const labelCert = (c: CertState) => CERT_LABEL[c.cert.type];

export function certAlerts(st: DemoState) {
  const all = CERTS.map((c) => certState(c, st));
  /* "Expired" counts site-required documents only, which is what blocks entry. */
  const expired = all.filter((c) => {
    const w = workerById(c.cert.workerId);
    return c.status === "expired" && w.siteId && requiredFor(w.siteId).includes(c.cert.type);
  });
  const expiring = all.filter((c) => c.status === "expiring");
  const held = allocated().filter((w) => readiness(w, st).state === "held");
  const clear = allocated().filter((w) => readiness(w, st).state === "clear");
  const reviews = all.filter((c) => c.review);
  return { all, expired, expiring, held, clear, reviews };
}

/* ── timesheets & money (reporting week 9–15 Nov) ── */
export const tsStatus = (id: string, st: DemoState) => {
  const t = TIMESHEETS.find((x) => x.id === id)!;
  if (t.id === "TS-1098") return st.ts1098 === "approved" ? "approved" : "pending_client";
  return t.status;
};
export const countedSheets = () => TIMESHEETS.filter((t) => t.countsToTotals);

export function siteRows(st: DemoState) {
  return SITES.map((s) => {
    const sheets = countedSheets().filter((t) => t.siteId === s.id);
    const hours = sheets.reduce((a, t) => a + t.hours, 0);
    const approvedH = sheets.filter((t) => tsStatus(t.id, st) === "approved").reduce((a, t) => a + t.hours, 0);
    const revenue = hours * s.billRate, cost = hours * s.costRate;
    return { site: s, client: clientById(s.clientId), workers: workersAt(s.id).length, hours, approvedH, pendingH: hours - approvedH,
      revenue, cost, contribution: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0,
      ready: approvedH * s.billRate, held: (hours - approvedH) * s.billRate };
  });
}

export function weeklyTotals(st: DemoState) {
  const rows = siteRows(st);
  const sum = (k: "hours" | "approvedH" | "pendingH" | "revenue" | "cost" | "contribution" | "ready" | "held") => rows.reduce((a, r) => a + r[k], 0);
  const revenue = sum("revenue"), cost = sum("cost");
  return { rows, submitted: sum("hours"), approved: sum("approvedH"), pending: sum("pendingH"), revenue, cost,
    contribution: sum("contribution"), margin: (sum("contribution") / revenue) * 100, ready: sum("ready"), held: sum("held"),
    sheets: countedSheets().length };
}

export function invoiceBatches(st: DemoState) {
  const rows = siteRows(st);
  return CLIENTS.map((c, i) => {
    const r = rows.filter((x) => x.site.clientId === c.id);
    return { id: "DRF-W46-0" + (i + 1), client: c, sites: r, potential: r.reduce((a, x) => a + x.revenue, 0),
      ready: r.reduce((a, x) => a + x.ready, 0), held: r.reduce((a, x) => a + x.held, 0), hours: r.reduce((a, x) => a + x.approvedH, 0) };
  });
}

export function workerRows(st: DemoState) {
  return WORKERS.map((w) => {
    const s = w.siteId ? siteById(w.siteId) : null;
    const h = workerHours(w);
    const sheets = TIMESHEETS.filter((t) => t.workerId === w.id && t.countsToTotals);
    const pending = sheets.filter((t) => tsStatus(t.id, st) !== "approved").reduce((a, t) => a + t.hours, 0);
    return { w, site: s, client: s ? clientById(s.clientId) : null, hours: h, approved: h - pending, pending,
      cost: h * w.costRate, revenue: s ? h * s.billRate : 0, ready: readiness(w, st),
      lastSheet: sheets.length ? sheets[sheets.length - 1] : null };
  });
}

/* ── receivables ── */
export const invoicesOf = (cid: ClientId) => INVOICES.filter((i) => i.clientId === cid);
export const overdue = () => INVOICES.filter((i) => i.status === "overdue");
export const openNotDue = () => INVOICES.filter((i) => i.status === "open");
export const daysOverdue = (i: Invoice) => i.status === "overdue" ? 31 : 0;
export function receivables() {
  const o = overdue().reduce((a, i) => a + i.amount, 0);
  const n = openNotDue().reduce((a, i) => a + i.amount, 0);
  return { overdue: o, notDue: n, open: o + n };
}

/* ── forecast ── */
export function forecastScenario(f: ForecastInputs) {
  const base = { revenue: 23590, cost: 17100, hours: 590 };
  const priceK = 1 + f.priceChange / 100;
  const wkRevenue = base.revenue * priceK;
  const wkCost = base.cost + f.crewCostChange * base.hours;
  const baseline = { revenue: wkRevenue * f.weeks, cost: wkCost * f.weeks, hours: base.hours * f.weeks };
  const addHours = f.addWorkers * f.hoursPerWorker * f.weeks * (f.utilisation / 100);
  const add = { hours: addHours, revenue: addHours * f.billRate * priceK, cost: addHours * f.costRate };
  const scenario = { revenue: baseline.revenue + add.revenue, cost: baseline.cost + add.cost, hours: baseline.hours + add.hours };
  const c = (x: { revenue: number; cost: number }) => x.revenue - x.cost;
  return {
    baseline: { ...baseline, contribution: c(baseline), margin: (c(baseline) / baseline.revenue) * 100 },
    add: { ...add, contribution: c(add), margin: add.revenue ? (c(add) / add.revenue) * 100 : 0 },
    scenario: { ...scenario, contribution: c(scenario), margin: (c(scenario) / scenario.revenue) * 100 },
    weekly: { revenue: wkRevenue, cost: wkCost, contribution: wkRevenue - wkCost },
  };
}

/* ── clients ── */
export function clientScopedData(cid: ClientId, st: DemoState) {
  const sites = sitesOf(cid);
  const sids = sites.map((s) => s.id);
  const rows = siteRows(st).filter((r) => sids.includes(r.site.id));
  const crew = WORKERS.filter((w) => w.siteId && sids.includes(w.siteId));
  const sheets = TIMESHEETS.filter((t) => t.countsToTotals && sids.includes(t.siteId));
  const invoices = invoicesOf(cid);
  const requests = REQUESTS.filter((r) => r.clientId === cid);
  return { client: clientById(cid), sites, rows, crew, sheets, invoices, requests };
}
export function accountRows(st: DemoState) {
  const b = invoiceBatches(st);
  return CLIENTS.map((c) => {
    const inv = invoicesOf(c.id);
    const batch = b.find((x) => x.client.id === c.id)!;
    return { client: c, sites: sitesOf(c.id), crew: WORKERS.filter((w) => w.siteId && sitesOf(c.id).some((s) => s.id === w.siteId)).length,
      potential: batch.potential, ready: batch.ready, held: batch.held,
      notDue: inv.filter((i) => i.status === "open").reduce((a, i) => a + i.amount, 0),
      overdue: inv.filter((i) => i.status === "overdue").reduce((a, i) => a + i.amount, 0) };
  });
}

/* ── requests, tasks, agents, activity ── */
export const requestStatus = (id: string, st: DemoState) => st.requests[id] || REQUESTS.find((r) => r.id === id)!.status;
export function allTasks(st: DemoState): Task[] {
  return st.extraTasks.concat(TASKS).map((t) => ({ ...t, status: st.tasks[t.id] || t.status }));
}
export const runStatus = (id: string, st: DemoState): RunStatus | "completed" => {
  const r = AGENT_RUNS.find((x) => x.id === id)!;
  return st.runs[id] || (r.kind === "completed" ? "completed" : "proposed");
};
export function activity(st: DemoState): ActEvent[] {
  return BASE_ACTIVITY.concat(st.activity).slice().sort((a, b) => b.sort - a.sort);
}

/* ── approvals queue (Work) ── */
export type Approval = { id: string; kind: string; title: string; detail: string; owner: string; status: "Awaiting Paul" | "Awaiting Elaine" | "Awaiting client" | "Approved (demo)" | "Declined (demo)"; link: { page: string; tab: string } };
export function approvals(st: DemoState): Approval[] {
  const ca = certAlerts(st);
  const sean = ca.reviews.find((c) => c.cert.workerId === "sean-murphy");
  const out: Approval[] = [
    { id: "AP-TS1098", kind: "Timesheet release", title: "Release TS-1098 · 8h · €320 (David Byrne, Ballymun)", detail: "Needs Morrow sign-off before it can join the invoice.", owner: "Elaine Walsh",
      status: st.ts1098 === "approved" ? "Approved (demo)" : st.ts1098 === "signoff_requested" ? "Awaiting client" : "Awaiting Elaine", link: { page: "Timesheets", tab: "approval" } },
    { id: "AP-REM103", kind: "Debtor message", title: "Westbridge reminder · INV-2026-103 · €7,760", detail: "Drafted by Collections Assistant. Never sent from the demo.", owner: "Paul Walsh",
      status: st.reminder.status === "approved_demo" ? "Approved (demo)" : "Awaiting Paul", link: { page: "Finance", tab: "debtors" } },
    { id: "AP-REQ204", kind: "Roster publication", title: "Publish North Quay roster to Castleview (REQ-204)", detail: "Mark Dunne shown as cover for Sean Murphy.", owner: "Paul Walsh",
      status: requestStatus("REQ-204", st) === "approved" ? "Approved (demo)" : requestStatus("REQ-204", st) === "declined" ? "Declined (demo)" : "Awaiting Paul", link: { page: "Clients", tab: "requests" } },
    { id: "AP-DOC-SEAN", kind: "Document sign-off", title: "Sean Murphy · manual-handling record", detail: sean ? "Upload received. Review and approve to clear site access." : "No upload yet. Request one or arrange cover.", owner: "Elaine Walsh",
      status: st.docs["sean-murphy:manual-handling"]?.status === "verified" ? "Approved (demo)" : "Awaiting Elaine", link: { page: "Compliance", tab: "documents" } },
    { id: "AP-INV-W46", kind: "Invoice finalisation", title: "Finalise 4 week-46 invoice drafts", detail: "Drafts only until a person approves. Nothing is issued from the demo.", owner: "Elaine Walsh",
      status: "Awaiting Elaine", link: { page: "Timesheets", tab: "export" } },
  ];
  return out;
}

export { WORKERS, SITES, CLIENTS, TIMESHEETS, INVOICES, REQUESTS, AGENT_RUNS };
