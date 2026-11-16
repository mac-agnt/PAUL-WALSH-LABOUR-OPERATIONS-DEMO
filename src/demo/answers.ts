/* Canned Home-chat answers, computed from the live demo state so they always
   match the screens. No LLM is called; this is a scripted demo assistant. */
import { getDemo } from "./store";
import { certAlerts, eur, forecastScenario, invoiceBatches, siteRows, weeklyTotals, workerById, fmtISO } from "./selectors";

type Nav = { page: string; tab: string };
export type Answer = { tool: string; effect: "read" | "write"; text: string; cols?: string[]; rows?: string[][]; actions?: [string, number, Nav?][]; confirm?: boolean; confirmSummary?: string };

export const PROMPTS = [
  "What needs me today?",
  "Which 8 hours block invoicing?",
  "Who can't enter site tomorrow?",
  "What happens if I add 2 more lads?",
  "What is Westbridge overdue?",
];

function today(): Answer {
  const st = getDemo();
  const t = weeklyTotals(st);
  const ca = certAlerts(st);
  const rows: string[][] = [];
  if (st.ts1098 !== "approved") rows.push(["Validate TS-1098 (David Byrne)", eur(320), "Ballymun", "Elaine"]);
  if (ca.held.length) rows.push(["Resolve " + ca.held.map((w) => w.name).join(", ") + " hold", "Site entry", "North Quay", "Paul"]);
  if (st.reminder.status !== "approved_demo") rows.push(["Approve Westbridge reminder", eur(7760), "INV-2026-103", "Paul"]);
  if (ca.expiring.some((c) => c.cert.workerId === "patrick-doyle")) rows.push(["Remind Patrick: Safe Pass 20 Nov", "4 days", "Harbour Road", "Elaine"]);
  rows.push(["Review +2 headcount forecast", "+" + eur(4480), "4 weeks", "Paul"]);
  return {
    tool: "pulse_briefing", effect: "read",
    text: `Paul, ${t.approved} of ${t.submitted} submitted hours are signed off${t.pending ? `; the other ${t.pending}h are holding ${eur(t.held)} at Ballymun` : ""}. ` +
      (ca.held.length ? `${ca.held.map((w) => w.name).join(", ")} is not cleared for North Quay. ` : "Every allocated worker is site-cleared. ") +
      `€7,760 from Westbridge Civil is 31 days overdue. Two extra contractors at €43/h could add €4,480 contribution over four weeks. Ranked:`,
    cols: ["Decision", "Value", "Where", "Owner"], rows,
    actions: [["Open Timesheets › Approval", 1, { page: "Timesheets", tab: "approval" }], ["Open Work › Approvals", 0, { page: "Work", tab: "approvals" }]],
  };
}

function eightHours(): Answer {
  const st = getDemo();
  const t = weeklyTotals(st);
  if (st.ts1098 === "approved") return {
    tool: "timesheets_find", effect: "read",
    text: `Nothing is blocking invoicing now. TS-1098 was signed in the demo, so all ${t.submitted}h are approved and ${eur(t.ready)} is invoice-ready across the four clients.`,
    actions: [["Open Invoice export", 1, { page: "Timesheets", tab: "export" }]],
  };
  return {
    tool: "timesheets_find", effect: "read",
    text: `It's one sheet: TS-1098, David Byrne at Ballymun Logistics Hub, 8h on Friday 13 Nov. David submitted it but Morrow's project lead was off site and never signed. At €40/h that's €320 held. It's already inside the 590h and €23,590 for the week, not on top of it. Invoice-ready is ${eur(t.ready)}; it becomes ${eur(t.revenue)} once Morrow signs.`,
    cols: ["Sheet", "Hours", "Value", "Status"],
    rows: [["TS-1098 · David Byrne", "8h", "€320", "client sign-off"], ["TS-1090 · David Byrne", "32h", "€1,280", "approved"], ["Ballymun total", "115h", "€4,600", "€4,280 ready"]],
    actions: [["Open TS-1098", 1, { page: "Timesheets", tab: "approval" }], ["Request client sign-off", 0, { page: "Timesheets", tab: "approval" }]],
  };
}

function siteEntry(): Answer {
  const st = getDemo();
  const ca = certAlerts(st);
  if (!ca.held.length) return {
    tool: "compliance_check", effect: "read",
    text: "Everyone allocated is cleared for site tomorrow. Patrick Doyle's Safe Pass still runs out on 20 Nov, so keep that renewal moving.",
    actions: [["Open Compliance › Expiring", 1, { page: "Compliance", tab: "expiring" }]],
  };
  const rows = ca.held.map((w) => [w.name, "North Quay", "Manual handling", "expired 14 Nov"]);
  return {
    tool: "compliance_check", effect: "read",
    text: `${ca.held.map((w) => w.name).join(", ")}. Sean's manual-handling record expired on 14 Nov and North Quay's site policy (demo) needs a current one before entry, so Sean is assigned but not cleared. Mark Dunne is available, inducted for North Quay and does the same work. Patrick Doyle is fine tomorrow; Patrick's Safe Pass expires on 20 Nov.`,
    cols: ["Worker", "Site", "Document", "Status"],
    rows: rows.concat([["Patrick Doyle", "Harbour Road", "Safe Pass", "valid to 20 Nov"]]),
    actions: [["Open Sean's compliance record", 1, { page: "Compliance", tab: "expiring" }], ["Plan Mark Dunne as cover", 0, { page: "Operations", tab: "allocations" }]],
  };
}

function addTwo(): Answer {
  const st = getDemo();
  const f = forecastScenario({ ...st.forecast, addWorkers: 2, hoursPerWorker: 40, weeks: 4, billRate: 43, costRate: 29, utilisation: 100, priceChange: 0, crewCostChange: 0 });
  return {
    tool: "margin_scenario", effect: "read",
    text: `Two more at 40h a week for four weeks is 320 billable hours. At €43 to the client and €29 to the contractor that's ${eur(f.add.revenue)} revenue, ${eur(f.add.cost)} cost and ${eur(f.add.contribution)} gross contribution. Four weeks goes from ${eur(f.baseline.contribution)} to ${eur(f.scenario.contribution)} contribution (${f.scenario.margin.toFixed(2)}% margin). That's before overhead, VAT and tax, and it assumes the work is there to place them.`,
    cols: ["Four weeks", "Revenue", "Cost", "Contribution"],
    rows: [["Current mix", eur(f.baseline.revenue), eur(f.baseline.cost), eur(f.baseline.contribution)], ["+2 contractors", eur(f.add.revenue), eur(f.add.cost), eur(f.add.contribution)], ["With them", eur(f.scenario.revenue), eur(f.scenario.cost), eur(f.scenario.contribution)]],
    actions: [["Open the forecast", 1, { page: "Finance", tab: "forecast" }], ["See capacity", 0, { page: "Operations", tab: "capacity" }]],
  };
}

function westbridge(): Answer {
  const st = getDemo();
  return {
    tool: "receivables_find", effect: "read",
    text: `One invoice: INV-2026-103, week 37 (7–13 Sep), €7,760, due 16 Oct, so 31 days overdue today. No reply from their accounts since 2 Oct. It's separate from this week's €7,760 Westbridge draft; the matching figure is a coincidence. A reminder is ${st.reminder.status === "draft" ? "drafted and waiting for you" : st.reminder.status === "pending_approval" ? "in Work › Approvals waiting for you" : "approved in the demo (nothing was sent)"}. Westbridge's weeks 42–45 invoices are open but not yet due.`,
    cols: ["Invoice", "Amount", "Due", "Status"],
    rows: [["INV-2026-103", "€7,760", "16 Oct", "31 days overdue"], ["Draft W46 · Westbridge", "€7,760", "not issued", "draft"]],
    actions: [["Open the reminder", 1, { page: "Finance", tab: "debtors" }], ["Open Westbridge account", 0, { page: "Clients", tab: "accounts" }]],
  };
}

function margins(): Answer {
  const rows = siteRows(getDemo()).slice().sort((a, b) => b.contribution - a.contribution);
  return {
    tool: "margin_by_site", effect: "read",
    text: "Last week made €6,490 gross contribution on €23,590 billing (27.51%). North Quay earns the most; Ballymun is the thinnest because the contractor rate is €31 against a €40 charge.",
    cols: ["Site", "Hours", "Contribution", "Margin"],
    rows: rows.map((r) => [r.site.name, r.hours + "h", eur(r.contribution), r.margin.toFixed(1) + "%"]),
    actions: [["Open Revenue & Margin", 1, { page: "Dashboard", tab: "margin" }]],
  };
}

function invoices(): Answer {
  const b = invoiceBatches(getDemo());
  return {
    tool: "invoice_drafts", effect: "read",
    text: `Four drafts for week 46, built only from signed-off hours. Nothing is issued until Elaine or you approve.`,
    cols: ["Client", "Potential", "Ready", "Held"],
    rows: b.map((x) => [x.client.name, eur(x.potential), eur(x.ready), x.held ? eur(x.held) : "none"]),
    actions: [["Open Invoice export", 1, { page: "Timesheets", tab: "export" }]],
  };
}

function available(): Answer {
  const m = workerById("mark-dunne"), j = workerById("jakub-zielinski");
  return {
    tool: "crew_availability", effect: "read",
    text: `Two of the 17 are free: ${m.name} (${m.trade}, from ${m.availableFrom}) and ${j.name} (${j.trade}, from ${j.availableFrom}). Mark is inducted for North Quay; Jakub for the Westbridge sites.`,
    cols: ["Worker", "Trade", "Inducted for", "Free from"],
    rows: [[m.name, m.trade, "North Quay", m.availableFrom || ""], [j.name, j.trade, "Westbridge sites", j.availableFrom || ""]],
    actions: [["Open Availability", 1, { page: "Crew", tab: "availability" }]],
  };
}

function patrick(): Answer {
  return {
    tool: "compliance_check", effect: "read",
    text: `Patrick Doyle's Safe Pass expires on ${fmtISO("2026-11-20")}, four days from now. It's valid today, so Patrick stays cleared for Harbour Road. A renewal reminder is drafted; Safe Pass renewal is generally every four years. The demo doesn't verify anything with the issuer.`,
    actions: [["Open Compliance › Expiring", 1, { page: "Compliance", tab: "expiring" }]],
  };
}

function fallback(): Answer {
  return {
    tool: "pulse_search", effect: "read",
    text: "This is a scripted demo assistant, so it answers from the demo records only. Try one of these: what needs me today, which 8 hours block invoicing, who can't enter site tomorrow, what happens if I add 2 more lads, what is Westbridge overdue, margin by site, who's available.",
    actions: [["What needs me today?", 1]],
  };
}

export function walshAnswer(q: string): Answer {
  const s = q.toLowerCase();
  if (/need(s)? me|today|what should|briefing|morning/.test(s)) return today();
  if (/8 ?h|eight|hours|block|ts-1098|timesheet|sign.?off/.test(s)) return eightHours();
  if (/margin|contribution|profit|money|earn/.test(s)) return margins();
  if (/enter|clear|sean|hold|compliance|manual|can'?t/.test(s)) return siteEntry();
  if (/add|lads|more|hire|forecast|scenario|grow|extra/.test(s)) return addTwo();
  if (/westbridge|overdue|owe|debtor|chase|103|reminder/.test(s)) return westbridge();
  if (/margin|contribution|profit|money|site.*make|where.*made/.test(s)) return margins();
  if (/invoice|bill|ready|draft/.test(s)) return invoices();
  if (/available|free|spare|mark|jakub|cover/.test(s)) return available();
  if (/patrick|safe ?pass|expir/.test(s)) return patrick();
  return fallback();
}
