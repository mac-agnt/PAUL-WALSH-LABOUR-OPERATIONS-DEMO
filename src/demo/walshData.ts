/* ─────────────────────────────────────────────────────────────────────────────
   Walsh Labour Operations · canonical demo fixture (single source of truth)

   Every screen reads from these records and the selectors in ./selectors.ts.
   Nothing here is a real business record. Only Paul Walsh, Elaine Walsh, the
   17-subcontractor headcount and the workflows described come from the calls.
   Client, site, worker names and every € figure are illustrative fixtures.
   ──────────────────────────────────────────────────────────────────────────── */

export type Provenance = "confirmed_by_client" | "research_unverified" | "demo_assumption";

export const DEMO = {
  anchorISO: "2026-11-16",
  anchorLabel: "Mon 16 Nov 2026",
  weekLabel: "9–15 Nov 2026",
  weekShort: "Wk 46 · 9–15 Nov",
  weekId: "W46",
  banner: "Demo environment · illustrative data",
} as const;

export const ORG = {
  name: "Walsh Labour Operations",
  nameNote: "Working demo name only, not an asserted registered legal entity",
  app: "Walsh Operations | Pulse",
  country: "Ireland",
  base: "Exact base not yet confirmed",
  owner: "Paul Walsh",
  ownerRole: "Owner / operator",
  admin: "Elaine Walsh",
  adminRole: "Invoicing & administration",
  adminRoleNote: "Functional role; formal title and employment relationship unconfirmed",
  workerDomain: "walsh-ops.example",
  clientDomain: "client.example",
  palette: {
    steel: "#243447", copper: "#B8864C", coolWhite: "#F5F7FA",
    positive: "#2B998A", warning: "#C58B38", danger: "#C85C5C",
  },
} as const;

/* ── Clients & sites ─────────────────────────────────────────────────────── */

export type ClientId = "castleview" | "westbridge" | "morrow" | "cedarline";
export type SiteId = "north-quay" | "harbour-road" | "ballymun" | "tallaght" | "navan";

export type Client = {
  id: ClientId; name: string; short: string; terms: string; since: string;
  contacts: { name: string; role: string; email: string; lastResponse: string; note: string }[];
};

export const CLIENTS: Client[] = [
  { id: "castleview", name: "Castleview Residential", short: "Castleview", terms: "30 days", since: "Mar 2025",
    contacts: [
      { name: "Site manager (placeholder)", role: "Site manager · North Quay", email: "northquay.site@client.example", lastResponse: "Fri 13 Nov", note: "Signs weekly hours on Friday afternoons. Asked for an updated roster (REQ-204)." },
      { name: "Accounts payable (placeholder)", role: "Accounts", email: "castleview.ap@client.example", lastResponse: "28 Oct", note: "Pays inside terms. Wants PO reference on every invoice." },
    ] },
  { id: "westbridge", name: "Westbridge Civil", short: "Westbridge", terms: "30 days", since: "Jun 2024",
    contacts: [
      { name: "Contracts manager (placeholder)", role: "Contracts · Harbour Road & Navan", email: "westbridge.contracts@client.example", lastResponse: "Thu 12 Nov", note: "Two live sites. Approves hours on the Westbridge timesheet template." },
      { name: "Accounts payable (placeholder)", role: "Accounts", email: "westbridge.ap@client.example", lastResponse: "2 Oct", note: "No reply on INV-2026-103 since 2 Oct." },
    ] },
  { id: "morrow", name: "Morrow Industrial", short: "Morrow", terms: "30 days", since: "Jan 2026",
    contacts: [
      { name: "Project lead (placeholder)", role: "Project lead · Ballymun", email: "ballymun.lead@client.example", lastResponse: "Wed 11 Nov", note: "Client sign-off still missing for 8h on Fri 13 Nov (TS-1098)." },
    ] },
  { id: "cedarline", name: "Cedarline Builders", short: "Cedarline", terms: "21 days", since: "Aug 2025",
    contacts: [
      { name: "Fit-out supervisor (placeholder)", role: "Supervisor · Tallaght", email: "tallaght.fitout@client.example", lastResponse: "Fri 13 Nov", note: "Small, steady account. Pays early." },
    ] },
];

export type Site = {
  id: SiteId; name: string; clientId: ClientId; location: string; billRate: number; costRate: number;
  shift: string; rateEffective: string; contractEnd: string; rateConfirmed: boolean;
  requires: string[]; instructions: string; issues: string[];
};

export const SITES: Site[] = [
  { id: "north-quay", name: "North Quay Development", clientId: "castleview", location: "Illustrative location · not a client fact",
    billRate: 42, costRate: 29, shift: "07:30–16:30", rateEffective: "1 Mar 2026", contractEnd: "Rolling · 4 weeks' notice", rateConfirmed: true,
    requires: ["safe-pass", "manual-handling", "ind-north-quay"],
    instructions: "Sign in at the hoarding gate. Current manual-handling record required before site entry (client site policy, demo).",
    issues: ["Sean Murphy on compliance hold since 14 Nov", "Client asked for updated weekly roster (REQ-204)"] },
  { id: "harbour-road", name: "Harbour Road Upgrade", clientId: "westbridge", location: "Illustrative location · not a client fact",
    billRate: 39, costRate: 29, shift: "08:00–17:00", rateEffective: "1 Jul 2026", contractEnd: "31 Jan 2027 (assumed)", rateConfirmed: false,
    requires: ["safe-pass", "ind-westbridge"],
    instructions: "Westbridge induction must be current. Hours approved on the Westbridge template, not ours.",
    issues: ["Patrick Doyle Safe Pass expires 20 Nov", "Conor O'Reilly induction expires 2 Dec", "Lowest bill rate of the larger sites"] },
  { id: "ballymun", name: "Ballymun Logistics Hub", clientId: "morrow", location: "Illustrative location · not a client fact",
    billRate: 40, costRate: 31, shift: "07:00–15:30", rateEffective: "12 Jan 2026", contractEnd: "Phase 2 end · Mar 2027 (assumed)", rateConfirmed: true,
    requires: ["safe-pass", "ind-ballymun"],
    instructions: "Teleporter work needs CSCS card on file. Client project lead signs hours.",
    issues: ["TS-1098: 8h (€320) awaiting client sign-off", "Highest contractor cost rate (€31/h)"] },
  { id: "tallaght", name: "Tallaght Fit-Out", clientId: "cedarline", location: "Illustrative location · not a client fact",
    billRate: 38, costRate: 27, shift: "08:00–16:30", rateEffective: "4 Aug 2025", contractEnd: "Fit-out completion · Dec 2026 (assumed)", rateConfirmed: true,
    requires: ["safe-pass", "ind-tallaght"],
    instructions: "Internal fit-out. Dust masks provided by client.",
    issues: [] },
  { id: "navan", name: "Navan Retail Park", clientId: "westbridge", location: "Illustrative location · not a client fact",
    billRate: 38, costRate: 27, shift: "08:00–17:00", rateEffective: "1 Sep 2026", contractEnd: "Rolling (assumed)", rateConfirmed: false,
    requires: ["safe-pass", "ind-westbridge"],
    instructions: "Single operative. Westbridge induction covers both Westbridge sites.",
    issues: ["Rate not yet confirmed in writing"] },
];

/* ── Workers (17 subcontractors on the books, not payroll employees) ─────── */

export type WorkerId = string;
export type Worker = {
  id: WorkerId; name: string; initials: string; trade: string; skills: string[];
  siteId: SiteId | null; hours: number[]; /* Mon–Sat, 9–14 Nov */
  costRate: number; email: string; phone: string; since: string; tint: string;
  availableFrom?: string; note?: string;
};

const W = (id: string, name: string, trade: string, skills: string[], siteId: SiteId | null, hours: number[],
  costRate: number, since: string, tint: string, extra?: Partial<Worker>): Worker => ({
  id, name, initials: name.split(" ").map((p) => p[0]).join("").replace(/[^A-ZÓÍ]/gi, "").slice(0, 2).toUpperCase(),
  trade, skills, siteId, hours, costRate,
  email: id.replace(/-/g, ".") + "@walsh-ops.example", phone: "Mobile on file (hidden in demo)",
  since, tint, ...extra,
});

export const WORKERS: Worker[] = [
  // North Quay Development · Castleview · 5 · 195h
  W("sean-murphy", "Sean Murphy", "General operative", ["Groundworks", "Manual handling", "Banksman"], "north-quay", [8, 8, 8, 8, 7, 0], 29, "Apr 2024", "#9fc7e6",
    { note: "Manual-handling record expired 14 Nov. Assigned but not cleared for North Quay entry." }),
  W("liam-kelly", "Liam Kelly", "Formwork carpenter", ["Formwork", "Shuttering", "Reading drawings"], "north-quay", [8, 8, 8, 8, 8, 0], 29, "Jan 2023", "#e6c78a"),
  W("aaron-oshea", "Aaron O'Shea", "Steel fixer", ["Rebar", "Steel fixing", "Working at height"], "north-quay", [8, 8, 8, 8, 8, 0], 29, "Sep 2024", "#c8b4f0"),
  W("niall-brennan", "Niall Brennan", "General operative", ["Groundworks", "Pipe laying", "Traffic marshal"], "north-quay", [8, 8, 8, 7, 7, 0], 29, "Feb 2025", "#a8e0c0"),
  W("tomasz-kowalski", "Tomasz Kowalski", "Concrete finisher", ["Concrete", "Power float", "Formwork"], "north-quay", [8, 8, 8, 7, 7, 0], 29, "Nov 2024", "#f0b49e"),
  // Harbour Road Upgrade · Westbridge · 4 · 160h
  W("patrick-doyle", "Patrick Doyle", "Pipe layer", ["Drainage", "Pipe laying", "Excavator banksman"], "harbour-road", [8, 8, 8, 8, 8, 0], 29, "Jul 2023", "#9fd6f0",
    { note: "Safe Pass expires 20 Nov. Still valid today." }),
  W("conor-oreilly", "Conor O'Reilly", "Groundworker", ["Kerbing", "Groundworks", "Slinger/signaller"], "harbour-road", [8, 8, 8, 8, 8, 0], 29, "Mar 2024", "#e2c48c",
    { note: "Westbridge site induction expires 2 Dec. Still valid today." }),
  W("adrian-nowak", "Adrian Nowak", "Plant operator (360)", ["360 excavator", "Dumper", "Groundworks"], "harbour-road", [9, 9, 8, 8, 8, 0], 29, "May 2025", "#b8c8f0"),
  W("ryan-mcgrath", "Ryan McGrath", "General operative", ["Groundworks", "Traffic marshal", "Manual handling"], "harbour-road", [8, 8, 8, 7, 7, 0], 29, "Oct 2025", "#d8b0d0"),
  // Ballymun Logistics Hub · Morrow · 3 · 115h
  W("david-byrne", "David Byrne", "Teleporter operator", ["Teleporter", "Slinger/signaller", "Racking install"], "ballymun", [8, 8, 8, 8, 8, 0], 31, "Feb 2024", "#a0d8c8",
    { note: "Fri 13 Nov 8h submitted as TS-1098, awaiting client sign-off (€320 held)." }),
  W("michael-walsh", "Michael Walsh", "Racking installer", ["Racking install", "Working at height", "MEWP"], "ballymun", [8, 8, 8, 8, 8, 0], 31, "Aug 2024", "#e8d49a"),
  W("oisin-kavanagh", "Oisín Kavanagh", "General operative", ["Manual handling", "Housekeeping", "Racking install"], "ballymun", [8, 8, 8, 8, 3, 0], 31, "Jun 2025", "#c0e0a0",
    { note: "Short Friday: left site 11:00 (foreman note). 35h, all approved." }),
  // Tallaght Fit-Out · Cedarline · 2 · 80h
  W("james-ryan", "James Ryan", "Fit-out carpenter", ["Second fix", "Partitions", "Ceilings"], "tallaght", [8, 8, 8, 8, 8, 0], 27, "Nov 2023", "#f0c4a0"),
  W("daniel-oconnor", "Daniel O'Connor", "Dryliner", ["Drylining", "Taping", "Ceilings"], "tallaght", [8, 8, 8, 8, 8, 0], 27, "Jan 2025", "#b0d0f0"),
  // Navan Retail Park · Westbridge · 1 · 40h
  W("eoin-burke", "Eoin Burke", "Groundworker", ["Kerbing", "Paving", "Groundworks"], "navan", [8, 8, 8, 8, 8, 0], 27, "Sep 2025", "#d0c0a0"),
  // Available / unallocated
  W("mark-dunne", "Mark Dunne", "General operative", ["Groundworks", "Manual handling", "Banksman"], null, [0, 0, 0, 0, 0, 0], 29, "Jul 2025", "#c8d8a8",
    { availableFrom: "Tue 17 Nov", note: "Holds a current North Quay induction. Natural cover for Sean." }),
  W("jakub-zielinski", "Jakub Zieliński", "Steel fixer", ["Rebar", "Steel fixing", "Formwork"], null, [0, 0, 0, 0, 0, 0], 29, "Oct 2025", "#d8c0e8",
    { availableFrom: "Mon 16 Nov", note: "Westbridge induction current. Available for Harbour Road or new work." }),
];

export const DAYS = ["Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13", "Sat 14"];
export const DAY_DATES = ["9 Nov", "10 Nov", "11 Nov", "12 Nov", "13 Nov", "14 Nov"];

/* ── Timesheets (week 9–15 Nov 2026) ─────────────────────────────────────── */

export type TsStatus = "approved" | "pending_client" | "rejected_duplicate";
export type Timesheet = {
  id: string; workerId: WorkerId; siteId: SiteId; days: number[]; hours: number; status: TsStatus;
  submitted: string; via: string; signedBy: string; note?: string; countsToTotals: boolean;
};

const TS_IDS: Record<string, string> = {
  "sean-murphy": "TS-1081", "liam-kelly": "TS-1082", "aaron-oshea": "TS-1083", "niall-brennan": "TS-1084", "tomasz-kowalski": "TS-1085",
  "patrick-doyle": "TS-1086", "conor-oreilly": "TS-1087", "adrian-nowak": "TS-1088", "ryan-mcgrath": "TS-1089",
  "david-byrne": "TS-1090", "michael-walsh": "TS-1091", "oisin-kavanagh": "TS-1092",
  "james-ryan": "TS-1093", "daniel-oconnor": "TS-1094", "eoin-burke": "TS-1095",
};
const SIGNER: Record<SiteId, string> = {
  "north-quay": "Castleview site manager", "harbour-road": "Westbridge contracts", "ballymun": "Morrow project lead",
  "tallaght": "Cedarline supervisor", "navan": "Westbridge contracts",
};

export const TIMESHEETS: Timesheet[] = (() => {
  const out: Timesheet[] = [];
  for (const w of WORKERS) {
    if (!w.siteId) continue;
    if (w.id === "david-byrne") {
      out.push({ id: TS_IDS[w.id], workerId: w.id, siteId: w.siteId, days: [8, 8, 8, 8, 0, 0], hours: 32, status: "approved",
        submitted: "Thu 12 Nov 17:40", via: "Worker app", signedBy: SIGNER[w.siteId], countsToTotals: true });
      out.push({ id: "TS-1098", workerId: w.id, siteId: w.siteId, days: [0, 0, 0, 0, 8, 0], hours: 8, status: "pending_client",
        submitted: "Fri 13 Nov 16:05", via: "Worker app", signedBy: "Not signed", countsToTotals: true,
        note: "Client sign-off missing for Friday 13 Nov. Morrow project lead was off site." });
      continue;
    }
    const hrs = w.hours.reduce((a, b) => a + b, 0);
    out.push({ id: TS_IDS[w.id], workerId: w.id, siteId: w.siteId, days: w.hours.slice(), hours: hrs, status: "approved",
      submitted: w.siteId === "harbour-road" || w.siteId === "navan" ? "Fri 13 Nov 15:20" : "Fri 13 Nov 16:30",
      via: w.siteId === "harbour-road" || w.siteId === "navan" ? "Client template (Excel)" : "Worker app",
      signedBy: SIGNER[w.siteId], countsToTotals: true,
      note: w.id === "adrian-nowak" ? "42h: 2h over the 40h weekly cap. Client foreman signed the extra hours; billed at standard rate."
        : w.id === "oisin-kavanagh" ? "35h vs 40h rostered. Short Friday confirmed by foreman note." : undefined });
  }
  // A suspected duplicate row from the Excel import. Rejected, excluded from every total.
  out.push({ id: "TS-1097", workerId: "ryan-mcgrath", siteId: "harbour-road", days: [0, 0, 8, 0, 0, 0], hours: 8, status: "rejected_duplicate",
    submitted: "Fri 13 Nov 15:21", via: "Client template (Excel)", signedBy: "n/a", countsToTotals: false,
    note: "Same worker, date and hours as Wed 11 Nov on TS-1089. Rejected as a duplicate import row. 0h, €0 impact." });
  return out;
})();

export type TsException = {
  id: string; kind: "missing_signature" | "missing_hours" | "overtime" | "duplicate"; label: string; tsId: string;
  workerId: WorkerId; siteId: SiteId; rationale: string; impact: string; affectsTotals: boolean; severity: "warn" | "info" | "bad";
};

export const TS_EXCEPTIONS: TsException[] = [
  { id: "EX-1", kind: "missing_signature", label: "Missing client signature", tsId: "TS-1098", workerId: "david-byrne", siteId: "ballymun",
    rationale: "Friday 13 Nov (8h) was submitted by David but the Morrow project lead was off site and did not sign.",
    impact: "8h × €40 = €320 held from the Morrow invoice until signed.", affectsTotals: true, severity: "warn" },
  { id: "EX-2", kind: "missing_hours", label: "Hours below roster", tsId: "TS-1092", workerId: "oisin-kavanagh", siteId: "ballymun",
    rationale: "35h submitted against 40h rostered. Friday shows 3h. Foreman note confirms Oisín left site at 11:00.",
    impact: "None. 35h approved and billed as worked.", affectsTotals: false, severity: "info" },
  { id: "EX-3", kind: "overtime", label: "Over weekly cap", tsId: "TS-1088", workerId: "adrian-nowak", siteId: "harbour-road",
    rationale: "42h against a 40h weekly cap on Harbour Road. Westbridge foreman signed the extra 2h on the sheet.",
    impact: "None. Billed at the standard €39/h (no overtime premium agreed).", affectsTotals: false, severity: "info" },
  { id: "EX-4", kind: "duplicate", label: "Suspected duplicate", tsId: "TS-1097", workerId: "ryan-mcgrath", siteId: "harbour-road",
    rationale: "Excel import produced a second row for Ryan on Wed 11 Nov, 8h, identical to TS-1089.",
    impact: "Rejected and excluded. 0h, €0 effect on totals.", affectsTotals: false, severity: "bad" },
];

/* ── Certificates & compliance ───────────────────────────────────────────── */

export type CertType = "safe-pass" | "manual-handling" | "ind-north-quay" | "ind-westbridge" | "ind-ballymun" | "ind-tallaght" | "cscs-teleporter" | "cscs-360" | "wah";
export const CERT_LABEL: Record<CertType, string> = {
  "safe-pass": "Safe Pass",
  "manual-handling": "Manual handling",
  "ind-north-quay": "North Quay site induction",
  "ind-westbridge": "Westbridge site induction",
  "ind-ballymun": "Ballymun site induction",
  "ind-tallaght": "Tallaght site induction",
  "cscs-teleporter": "CSCS · telescopic handler",
  "cscs-360": "CSCS · 360 excavator",
  "wah": "Working at height",
};
export const CERT_ISSUER: Record<CertType, string> = {
  "safe-pass": "SOLAS programme (not verified in demo)",
  "manual-handling": "Training provider on file",
  "ind-north-quay": "Castleview Residential",
  "ind-westbridge": "Westbridge Civil",
  "ind-ballymun": "Morrow Industrial",
  "ind-tallaght": "Cedarline Builders",
  "cscs-teleporter": "SOLAS programme (not verified in demo)",
  "cscs-360": "SOLAS programme (not verified in demo)",
  "wah": "Training provider on file",
};

export type Cert = { id: string; workerId: WorkerId; type: CertType; issued: string; expires: string; verifiedBy: string; file: string };

const SITE_IND: Record<SiteId, CertType> = {
  "north-quay": "ind-north-quay", "harbour-road": "ind-westbridge", "ballymun": "ind-ballymun", "tallaght": "ind-tallaght", "navan": "ind-westbridge",
};

/* Expiry overrides. Everything not listed is comfortably valid (beyond 30 days). */
const EXP: Record<string, string> = {
  "sean-murphy:manual-handling": "2026-11-14",
  "patrick-doyle:safe-pass": "2026-11-20",
  "conor-oreilly:ind-westbridge": "2026-12-02",
};

export const CERTS: Cert[] = (() => {
  const out: Cert[] = [];
  let n = 1;
  const add = (w: Worker, type: CertType, idx: number) => {
    const key = w.id + ":" + type;
    const yr = 2027 + ((idx + w.name.length) % 3);
    const mo = String(1 + ((w.name.length * 3 + idx * 5) % 12)).padStart(2, "0");
    const expires = EXP[key] || `${yr}-${mo}-${String(5 + ((idx * 7 + w.name.length) % 20)).padStart(2, "0")}`;
    const issued = type === "safe-pass"
      ? String(Number(expires.slice(0, 4)) - 4) + expires.slice(4)
      : type.startsWith("ind-") ? String(Number(expires.slice(0, 4)) - 1) + expires.slice(4)
      : String(Number(expires.slice(0, 4)) - 3) + expires.slice(4);
    out.push({ id: "CERT-" + String(n++).padStart(3, "0"), workerId: w.id, type, issued, expires,
      verifiedBy: type.startsWith("ind-") ? "Client induction record (demo)" : "Elaine Walsh · copy sighted (demo)",
      file: w.name.replace(/[^A-Za-z]/g, "") + "_" + CERT_LABEL[type].replace(/[^A-Za-z]/g, "") + ".pdf" });
  };
  WORKERS.forEach((w, i) => {
    add(w, "safe-pass", i);
    add(w, "manual-handling", i + 1);
    if (w.siteId) add(w, SITE_IND[w.siteId], i + 2);
    if (w.id === "mark-dunne") add(w, "ind-north-quay", i + 2);
    if (w.id === "jakub-zielinski") add(w, "ind-westbridge", i + 2);
    if (w.skills.includes("Teleporter")) add(w, "cscs-teleporter", i + 3);
    if (w.skills.includes("360 excavator")) add(w, "cscs-360", i + 3);
    if (w.skills.includes("Working at height") || w.skills.includes("MEWP")) add(w, "wah", i + 4);
  });
  return out;
})();

/* Site entry rules. North Quay's manual-handling rule is a mock client-site policy. */
export const SITE_RULES: { siteId: SiteId; cert: CertType; rule: string }[] = [
  ...SITES.flatMap((s) => s.requires.map((c) => ({ siteId: s.id, cert: c as CertType,
    rule: c === "manual-handling" ? "Client site policy (demo): current manual-handling record before entry"
      : c === "safe-pass" ? "Safe Pass required for all construction site entry"
      : "Client induction must be current" }))),
];

/* ── Invoices ─────────────────────────────────────────────────────────────── */

export type InvoiceStatus = "overdue" | "open" | "paid";
export type Invoice = { id: string; clientId: ClientId; period: string; amount: number; issued: string; due: string; status: InvoiceStatus; paidOn?: string; note?: string };

/* Weekly billing (illustrative). Numbering runs 4 per week from INV-2026-101 in week 37.
   INV-2026-103 is the only overdue item; weeks 38–40 are paid and not listed. */
const fmtDate = (d: Date) => d.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()] + " 2026";
export const INVOICES: Invoice[] = (() => {
  const out: Invoice[] = [
    { id: "INV-2026-103", clientId: "westbridge", period: "Wk 37 · 7–13 Sep", amount: 7760, issued: "16 Sep 2026", due: "16 Oct 2026", status: "overdue",
      note: "Previous-period invoice. Separate from this week's €7,760 Westbridge draft; the matching amount is coincidental." },
  ];
  const order: { id: ClientId; base: number; terms: number }[] = [
    { id: "castleview", base: 8190, terms: 30 }, { id: "morrow", base: 4600, terms: 30 },
    { id: "westbridge", base: 7760, terms: 30 }, { id: "cedarline", base: 3040, terms: 21 },
  ];
  const weeks = [
    { wk: 41, label: "5–11 Oct", issued: new Date(2026, 9, 13), f: 0.99 },
    { wk: 42, label: "12–18 Oct", issued: new Date(2026, 9, 20), f: 0.97 },
    { wk: 43, label: "19–25 Oct", issued: new Date(2026, 9, 27), f: 1.02 },
    { wk: 44, label: "26 Oct–1 Nov", issued: new Date(2026, 10, 3), f: 0.985 },
    { wk: 45, label: "2–8 Nov", issued: new Date(2026, 10, 10), f: 1.01 },
  ];
  const anchor = new Date(2026, 10, 16);
  for (const w of weeks) {
    order.forEach((c, i) => {
      const due = new Date(w.issued.getTime() + c.terms * 86400000);
      const amount = c.id === "cedarline" ? c.base : Math.round(c.base * w.f);
      const early = c.id === "cedarline" && w.wk === 43;
      const paid = due < anchor || early;
      const paidOn = new Date(due.getTime() - (early ? 4 : 2) * 86400000);
      out.push({ id: "INV-2026-" + (101 + (w.wk - 37) * 4 + i), clientId: c.id, period: "Wk " + w.wk + " · " + w.label,
        amount, issued: fmtDate(w.issued), due: fmtDate(due), status: paid ? "paid" : "open", paidOn: paid ? fmtDate(paidOn) : undefined });
    });
  }
  return out;
})();

/* ── Requests ─────────────────────────────────────────────────────────────── */

export type RequestStatus = "waiting_paul" | "approved" | "declined" | "open" | "fulfilled";
export type ClientRequest = { id: string; clientId: ClientId; siteId: SiteId; kind: string; title: string; detail: string; raised: string; status: RequestStatus; owner: string };

export const REQUESTS: ClientRequest[] = [
  { id: "REQ-204", clientId: "castleview", siteId: "north-quay", kind: "Roster", title: "Updated weekly roster for North Quay",
    detail: "Castleview asked for next week's named roster. Draft shows Mark Dunne covering Sean Murphy until Sean's manual-handling record is current.",
    raised: "Fri 13 Nov 14:10 (mock portal request)", status: "waiting_paul", owner: "Paul Walsh" },
  { id: "REQ-205", clientId: "westbridge", siteId: "harbour-road", kind: "Extra labour", title: "1 more groundworker, Harbour Road, from 23 Nov",
    detail: "Illustrative request. Jakub Zieliński is available and inducted for Westbridge sites, but Jakub is a steel fixer: confirm the scope fits.",
    raised: "Thu 12 Nov 09:30 (mock)", status: "open", owner: "Paul Walsh" },
  { id: "REQ-206", clientId: "morrow", siteId: "ballymun", kind: "Hours sign-off", title: "Sign-off for Fri 13 Nov (TS-1098)",
    detail: "Our request to Morrow for the missing 8h signature. Linked to TS-1098 and the €320 hold.",
    raised: "Mon 16 Nov 08:20 (mock)", status: "open", owner: "Elaine Walsh" },
  { id: "REQ-201", clientId: "cedarline", siteId: "tallaght", kind: "Roster", title: "Confirm 2 dryliners to 18 Dec",
    detail: "Illustrative. Confirmed by Paul on 4 Nov.", raised: "2 Nov 2026 (mock)", status: "fulfilled", owner: "Paul Walsh" },
];

/* ── Agents ───────────────────────────────────────────────────────────────── */

export type AgentRun = { id: string; agent: string; at: string; title: string; detail: string; kind: "suggested" | "completed"; needsApproval: boolean; link: { page: string; tab: string } };

export const AGENTS = [
  { id: "briefing", name: "Briefing", purpose: "07:00 management summary for Paul: what moved, what needs a decision, in euros.", trigger: "Weekdays 07:00", policy: "Read-only. Never sends anything.", status: "Ran 07:00" },
  { id: "ops", name: "Ops Watchdog", purpose: "Site clearance, unallocated worker gaps and overdue timesheet approvals.", trigger: "Every 30 min, 06:00–19:00", policy: "Flags and drafts tasks. Holds are proposed, never applied without a person.", status: "Ran 07:30" },
  { id: "collector", name: "Timesheet Collector", purpose: "Reminds missing submissions, validates hours and catches duplicate rows.", trigger: "Fri 15:00 · Mon 08:00", policy: "Never certifies attendance. Client sign-off stays with the client.", status: "Ran 08:00" },
  { id: "invoice", name: "Invoice Builder", purpose: "Drafts weekly client invoices from signed-off hours only.", trigger: "Mon 08:15", policy: "Drafts only. Invoices finalise after Elaine or Paul approves.", status: "Ran 08:15" },
  { id: "compliance", name: "Compliance Monitor", purpose: "Checks Safe Pass, manual handling and site-induction dates against each site's rules.", trigger: "Daily 06:30", policy: "Proposes reminders and holds. A person signs off every document.", status: "Ran 06:30" },
  { id: "margin", name: "Margin Analyst", purpose: "Rate mismatches, low-margin sites and hiring or rate scenarios.", trigger: "Mon 09:00 · on rate change", policy: "Analysis only.", status: "Ran 09:00" },
  { id: "collections", name: "Collections Assistant", purpose: "Prepares overdue-invoice reminders for human review.", trigger: "Daily 09:30", policy: "Drafts only. A person approves every message. Nothing is sent from the demo.", status: "Ran 09:30" },
] as const;

export const AGENT_RUNS: AgentRun[] = [
  { id: "RUN-501", agent: "compliance", at: "Mon 16 Nov 06:30", title: "Flagged Sean Murphy's expired manual-handling record",
    detail: "Expired 14 Nov. North Quay's site policy (demo) requires it, so Sean is proposed for a site-clearance hold.", kind: "suggested", needsApproval: true, link: { page: "Compliance", tab: "expiring" } },
  { id: "RUN-502", agent: "compliance", at: "Mon 16 Nov 06:31", title: "Drafted Safe Pass renewal reminder for Patrick Doyle",
    detail: "Expires 20 Nov (4 days). Reminder drafted for review; Patrick stays cleared until then.", kind: "suggested", needsApproval: true, link: { page: "Compliance", tab: "expiring" } },
  { id: "RUN-503", agent: "briefing", at: "Mon 16 Nov 07:00", title: "Posted the morning briefing",
    detail: "582 of 590 hours signed off, €320 held at Ballymun, Sean not cleared, €7,760 Westbridge 31 days overdue.", kind: "completed", needsApproval: false, link: { page: "Home", tab: "" } },
  { id: "RUN-504", agent: "ops", at: "Mon 16 Nov 07:30", title: "Flagged Sean's expired document against tomorrow's North Quay roster",
    detail: "Suggested Mark Dunne as cover: available, inducted for North Quay, same trade.", kind: "suggested", needsApproval: true, link: { page: "Operations", tab: "allocations" } },
  { id: "RUN-505", agent: "collector", at: "Mon 16 Nov 08:00", title: "Validated 590h across 16 sheets; rejected 1 duplicate row",
    detail: "TS-1097 matched TS-1089 for Wed 11 Nov. Excluded. No other duplicates.", kind: "completed", needsApproval: false, link: { page: "Timesheets", tab: "exceptions" } },
  { id: "RUN-506", agent: "invoice", at: "Mon 16 Nov 08:15", title: "Held TS-1098: €320 from the Morrow draft",
    detail: "Built 4 drafts totalling €23,270 from signed-off hours. Morrow draft is €4,280 until the 8h are signed.", kind: "completed", needsApproval: false, link: { page: "Finance", tab: "invoices" } },
  { id: "RUN-507", agent: "margin", at: "Mon 16 Nov 09:00", title: "Modelled 2 more contractors at €43 / €29",
    detail: "+320h, +€13,760 revenue, +€4,480 gross contribution over 4 weeks. Ballymun is the thinnest site at 22.5%.", kind: "suggested", needsApproval: false, link: { page: "Finance", tab: "forecast" } },
  { id: "RUN-508", agent: "collections", at: "Mon 16 Nov 09:30", title: "Drafted INV-2026-103 reminder (€7,760, 31 days overdue)",
    detail: "Polite second reminder to Westbridge accounts. Waiting for Paul's approval. Nothing sent.", kind: "suggested", needsApproval: true, link: { page: "Finance", tab: "debtors" } },
];

/* ── Base activity log (anchored to the demo week, oldest first) ─────────── */

export type ActKind = "people" | "agent" | "system" | "client";
export type ActEvent = { id: string; at: string; sort: number; kind: ActKind; actor: string; title: string; detail: string; attention?: boolean; link?: { page: string; tab: string } };

export const BASE_ACTIVITY: ActEvent[] = [
  { id: "A01", at: "Thu 12 Nov 17:40", sort: 11217.4, kind: "people", actor: "David Byrne", title: "Submitted 32h for Mon–Thu (TS-1090)", detail: "Ballymun Logistics Hub · signed by Morrow project lead." },
  { id: "A02", at: "Fri 13 Nov 14:10", sort: 11314.1, kind: "client", actor: "Castleview Residential", title: "Requested an updated North Quay roster (REQ-204)", detail: "Mock portal request. Waiting for Paul's approval.", attention: true, link: { page: "Clients", tab: "requests" } },
  { id: "A03", at: "Fri 13 Nov 15:20", sort: 11315.2, kind: "system", actor: "Excel import (demo)", title: "Imported Westbridge timesheet template", detail: "5 sheets, 208h incl. 1 duplicate row. Preview only, no live sync.", link: { page: "Records", tab: "imports" } },
  { id: "A04", at: "Fri 13 Nov 16:05", sort: 11316.05, kind: "people", actor: "David Byrne", title: "Submitted 8h for Fri 13 Nov (TS-1098)", detail: "Client sign-off missing. €320 at Ballymun.", attention: true, link: { page: "Timesheets", tab: "approval" } },
  { id: "A05", at: "Fri 13 Nov 16:30", sort: 11316.3, kind: "people", actor: "11 workers", title: "Submitted the rest of the week's hours", detail: "North Quay, Ballymun and Tallaght via the worker app." },
  { id: "A06", at: "Sat 14 Nov 10:12", sort: 11410.2, kind: "people", actor: "Elaine Walsh", title: "Reviewed the week's timesheet batch", detail: "582h ready for invoicing. TS-1098 left pending client sign-off." },
  { id: "A07", at: "Mon 16 Nov 06:30", sort: 11606.3, kind: "agent", actor: "Compliance Monitor", title: "Flagged Sean Murphy's expired manual-handling record", detail: "Expired 14 Nov. North Quay site policy (demo).", attention: true, link: { page: "Compliance", tab: "expiring" } },
  { id: "A08", at: "Mon 16 Nov 07:00", sort: 11607.0, kind: "agent", actor: "Briefing", title: "Posted the morning briefing", detail: "Four items need Paul. Delivered in-app (demo).", link: { page: "Agents", tab: "runs" } },
  { id: "A09", at: "Mon 16 Nov 07:30", sort: 11607.3, kind: "agent", actor: "Ops Watchdog", title: "Suggested Mark Dunne as North Quay cover", detail: "Suggestion only. Roster unchanged until Paul decides.", attention: true, link: { page: "Operations", tab: "allocations" } },
  { id: "A10", at: "Mon 16 Nov 08:00", sort: 11608.0, kind: "agent", actor: "Timesheet Collector", title: "Rejected duplicate row TS-1097", detail: "Matched TS-1089, Wed 11 Nov. €0 impact.", link: { page: "Timesheets", tab: "exceptions" } },
  { id: "A11", at: "Mon 16 Nov 08:15", sort: 11608.15, kind: "agent", actor: "Invoice Builder", title: "Created 4 draft invoices · €23,270", detail: "Held €320 (TS-1098) from the Morrow draft.", link: { page: "Finance", tab: "invoices" } },
  { id: "A12", at: "Mon 16 Nov 08:20", sort: 11608.2, kind: "people", actor: "Elaine Walsh", title: "Requested client sign-off for TS-1098 (REQ-206)", detail: "Asked Morrow's project lead to confirm Fri 13 Nov.", link: { page: "Timesheets", tab: "approval" } },
  { id: "A13", at: "Mon 16 Nov 09:00", sort: 11609.0, kind: "agent", actor: "Margin Analyst", title: "Modelled +2 contractors for 4 weeks", detail: "+€13,760 revenue, +€4,480 contribution.", link: { page: "Finance", tab: "forecast" } },
  { id: "A14", at: "Mon 16 Nov 09:30", sort: 11609.3, kind: "agent", actor: "Collections Assistant", title: "Drafted INV-2026-103 reminder", detail: "€7,760, 31 days overdue. Awaiting approval. Not sent.", attention: true, link: { page: "Finance", tab: "debtors" } },
  { id: "A15", at: "Mon 16 Nov 09:31", sort: 11609.31, kind: "system", actor: "Base44 mapping", title: "Legacy dashboard mapping reviewed (planned)", detail: "Manual export planned. No live connection.", link: { page: "Records", tab: "imports" } },
];

/* ── Tasks ────────────────────────────────────────────────────────────────── */

export type TaskStatus = "Open" | "In progress" | "Waiting" | "Done";
export type Task = { id: string; title: string; owner: string; due: string; priority: "High" | "Medium" | "Low"; dept: string; status: TaskStatus; related: string; link: { page: string; tab: string } };

export const TASKS: Task[] = [
  { id: "T-301", title: "Review TS-1098 once Morrow signs (8h, €320)", owner: "Elaine Walsh", due: "Tue 17 Nov", priority: "High", dept: "Timesheets", status: "Waiting", related: "TS-1098", link: { page: "Timesheets", tab: "approval" } },
  { id: "T-302", title: "Approve Westbridge reminder for INV-2026-103 (€7,760)", owner: "Paul Walsh", due: "Mon 16 Nov", priority: "High", dept: "Finance", status: "Open", related: "INV-2026-103", link: { page: "Finance", tab: "debtors" } },
  { id: "T-303", title: "Arrange North Quay cover or verify Sean's manual-handling doc", owner: "Paul Walsh", due: "Mon 16 Nov", priority: "High", dept: "Compliance", status: "Open", related: "Sean Murphy", link: { page: "Compliance", tab: "expiring" } },
  { id: "T-304", title: "Chase Patrick Doyle for Safe Pass renewal (expires 20 Nov)", owner: "Elaine Walsh", due: "Wed 18 Nov", priority: "Medium", dept: "Compliance", status: "Open", related: "Patrick Doyle", link: { page: "Compliance", tab: "expiring" } },
  { id: "T-305", title: "Decide on the +2 contractor scenario", owner: "Paul Walsh", due: "Fri 20 Nov", priority: "Medium", dept: "Finance", status: "Open", related: "Forecast", link: { page: "Finance", tab: "forecast" } },
  { id: "T-306", title: "Approve North Quay roster for Castleview (REQ-204)", owner: "Paul Walsh", due: "Tue 17 Nov", priority: "Medium", dept: "Operations", status: "Open", related: "REQ-204", link: { page: "Clients", tab: "requests" } },
  { id: "T-307", title: "Send week 46 spreadsheet to accountant", owner: "Elaine Walsh", due: "Wed 18 Nov", priority: "Medium", dept: "Finance", status: "Open", related: "Accountant export", link: { page: "Finance", tab: "overview" } },
  { id: "T-308", title: "Remind Conor O'Reilly: Westbridge induction due 2 Dec", owner: "Elaine Walsh", due: "Mon 23 Nov", priority: "Low", dept: "Compliance", status: "Open", related: "Conor O'Reilly", link: { page: "Compliance", tab: "expiring" } },
  { id: "T-309", title: "Get Harbour Road and Navan rates confirmed in writing", owner: "Paul Walsh", due: "Fri 27 Nov", priority: "Medium", dept: "Clients", status: "In progress", related: "Westbridge Civil", link: { page: "Clients", tab: "rates" } },
  { id: "T-310", title: "Collect week 47 timesheets (Fri 15:00 cut-off)", owner: "Timesheet Collector", due: "Fri 20 Nov", priority: "Low", dept: "Timesheets", status: "Open", related: "Week 47", link: { page: "Timesheets", tab: "overview" } },
  { id: "T-311", title: "VAT figures for October to accountant", owner: "Elaine Walsh", due: "Done 9 Nov", priority: "Medium", dept: "Finance", status: "Done", related: "Accountant export", link: { page: "Finance", tab: "overview" } },
];

/* ── Systems & integrations (accurate status, no fake health checks) ─────── */

export const SYSTEMS: { name: string; status: string; tone: "ok" | "warn" | "neutral" | "bad"; prov: Provenance; note: string }[] = [
  { name: "Excel spreadsheets", status: "Existing source · manual import", tone: "ok", prov: "confirmed_by_client", note: "Timesheets and invoicing run in Excel today. Pulse previews an import; no live sync." },
  { name: "Base44 dashboards", status: "Legacy · migration candidate", tone: "warn", prov: "confirmed_by_client", note: "Paul built dashboards and tools in Base44. Plan: manual export, then retire." },
  { name: "Email", status: "In use · provider TBD", tone: "neutral", prov: "confirmed_by_client", note: "Email is used; the provider has not been confirmed. Nothing in this demo sends email." },
  { name: "Accountant handoff", status: "Spreadsheet process", tone: "ok", prov: "confirmed_by_client", note: "Spreadsheets go to the accountant. Their accounting package is unconfirmed." },
  { name: "Google Sheets", status: "Mentioned · unconfirmed", tone: "neutral", prov: "research_unverified", note: "Came up ambiguously on the call. No integration assumed." },
  { name: "WhatsApp", status: "Proposed only", tone: "neutral", prov: "demo_assumption", note: "Discussed as a possibility. Not connected." },
  { name: "Banking feed", status: "Not confirmed", tone: "neutral", prov: "demo_assumption", note: "No bank or bank feed has been confirmed. Nothing is synced." },
  { name: "Revenue · ROS / eRCT", status: "Not connected · applicability to verify", tone: "bad", prov: "research_unverified", note: "RCT/eRCT may apply to some construction contracts. Shown as a manual/CSV workflow only. Not tax advice." },
];
