/* Settings · organisation facts with provenance, roles and permissions,
   honest integration statuses, governance, AI controls and appearance. */
import { useState, type ReactNode } from "react";
import { navigate, toast, useDemo } from "../../demo/store";
import { activity, allTasks, approvals } from "../../demo/selectors";
import { AGENTS, CLIENTS, ORG, SYSTEMS, WORKERS, type Provenance } from "../../demo/walshData";
import { Avatar, Badge, Btn, Card, Head, Kpi, Note, Page, Stat, Table, type Tone } from "./ui";

const CRUMB = (label: string) => [{ label: "Settings", page: "Settings", tab: "org" }, { label }];

const PROV: Record<Provenance, { label: string; tone: Tone }> = {
  confirmed_by_client: { label: "Confirmed by client", tone: "ok" },
  research_unverified: { label: "Research · unverified", tone: "warn" },
  demo_assumption: { label: "Demo assumption", tone: "info" },
};
const ProvBadge = ({ p }: { p: Provenance }) => <Badge tone={PROV[p].tone}>{PROV[p].label}</Badge>;

/* ── Organisation ─────────────────────────────────────────────────────────── */
function Org() {
  const facts: { k: string; v: string; p: Provenance; note: string }[] = [
    { k: "Working name", v: ORG.name, p: "demo_assumption", note: ORG.nameNote },
    { k: "Application", v: ORG.app, p: "demo_assumption", note: "Display label for the demo workspace." },
    { k: "Registered legal entity", v: "Not confirmed", p: "research_unverified", note: "Several Irish companies have similar names. None is confirmed as this business, so none is used." },
    { k: "Business model", v: "Labour supply: subcontractors placed on client sites", p: "confirmed_by_client", note: "Pay each worker a contractor rate, bill the client a higher hourly rate." },
    { k: "Subcontractors on the books", v: String(WORKERS.length), p: "confirmed_by_client", note: "Subcontractors, not payroll employees. Names in the demo are illustrative." },
    { k: "Owner / operator", v: ORG.owner, p: "confirmed_by_client", note: "Only confirmed named decision-maker." },
    { k: "Invoicing & administration", v: ORG.admin, p: "confirmed_by_client", note: ORG.adminRoleNote + "." },
    { k: "Country", v: ORG.country, p: "demo_assumption", note: "Irish context assumed from the calls. Exact base not confirmed." },
    { k: "Base / address", v: ORG.base, p: "demo_assumption", note: "Left blank on purpose. No town or county is asserted." },
    { k: "Email domain", v: "Unknown", p: "demo_assumption", note: "Demo uses non-routable " + ORG.workerDomain + " and " + ORG.clientDomain + "." },
    { k: "Logo", v: "W monogram placeholder", p: "demo_assumption", note: "Not an official logo." },
    { k: "Brand colours", v: "Steel, copper, cool white", p: "demo_assumption", note: "Design placeholders, not verified client colours." },
    { k: "Existing tools", v: "Excel, Base44 dashboards", p: "confirmed_by_client", note: "Email in use (provider unconfirmed). Accountant receives spreadsheets." },
    { k: "Currency & reporting", v: "EUR · weekly, week 46 anchor", p: "demo_assumption", note: "Demo reporting anchor Mon 16 Nov 2026." },
  ];
  const n = (p: Provenance) => facts.filter((f) => f.p === p).length;
  return (
    <>
      <Head crumbs={CRUMB("Organisation")} title="Organisation" sub="What the workspace knows about the business, with where each fact came from. Anything not confirmed on the calls is labelled." />
      <div className="wl-g wl-g-4">
        <Kpi label="Facts on file" value={facts.length} />
        <Kpi label="Confirmed by client" value={n("confirmed_by_client")} tone="ok" />
        <Kpi label="Research · unverified" value={n("research_unverified")} tone="warn" />
        <Kpi label="Demo assumptions" value={n("demo_assumption")} tone="info" />
      </div>
      <div className="wl-g wl-g-21">
        <Card flush title="Organisation profile" sub="Edit after the client confirms details. Nothing here is a legal record.">
          <Table minWidth={720} cols={[
            { k: "k", label: "Field", w: 190, render: (f) => <span className="dim">{f.k}</span> },
            { k: "v", label: "Value", render: (f) => <span className="ink">{f.v}</span> },
            { k: "p", label: "Provenance", render: (f) => <ProvBadge p={f.p} /> },
            { k: "n", label: "Note", render: (f) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{f.note}</span> },
          ]} rows={facts} />
        </Card>
        <div className="wl-stack">
          <Card title="Workspace">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18 }}>W</span>
              <div><div style={{ fontSize: 15, fontWeight: 600 }}>{ORG.name}</div><div style={{ fontSize: 12, color: "var(--dim)" }}>{ORG.app}</div></div>
            </div>
            <div className="wl-g wl-g-2" style={{ marginTop: 14 }}>
              <Stat k="Clients" v={CLIENTS.length} sub="Illustrative" />
              <Stat k="Sites" v={5} sub="Illustrative" />
              <Stat k="People in Pulse" v={2} sub="Paul, Elaine" />
              <Stat k="Environment" v="Demo" sub="Browser-only" />
            </div>
          </Card>
          <Card title="To confirm with Paul and Elaine">
            <div className="wl-stack" style={{ gap: 8 }}>
              <Note tone="warn">Registered company name and CRO number</Note>
              <Note tone="warn">Base location, website and email domain</Note>
              <Note tone="warn">Logo and brand colours</Note>
              <Note tone="warn">Elaine's formal role and access level</Note>
              <Note tone="warn">Accounting package used by the accountant</Note>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Users & roles ────────────────────────────────────────────────────────── */
type Cell = "yes" | "own" | "no" | "approve";
const CAPS: { cap: string; r: Cell[] }[] = [
  { cap: "See all workers and sites", r: ["yes", "yes", "no", "no", "yes"] },
  { cap: "See contractor pay rates", r: ["yes", "yes", "own", "no", "no"] },
  { cap: "See client charge rates", r: ["yes", "yes", "no", "own", "yes"] },
  { cap: "See margins and contribution", r: ["yes", "yes", "no", "no", "no"] },
  { cap: "Submit hours", r: ["no", "yes", "own", "no", "no"] },
  { cap: "Sign off hours", r: ["no", "no", "no", "own", "no"] },
  { cap: "Release timesheets to invoicing", r: ["approve", "approve", "no", "no", "no"] },
  { cap: "Finalise invoices", r: ["approve", "approve", "no", "no", "no"] },
  { cap: "Approve debtor and client messages", r: ["approve", "no", "no", "no", "no"] },
  { cap: "Sign off compliance documents", r: ["approve", "approve", "no", "no", "no"] },
  { cap: "Upload documents", r: ["yes", "yes", "own", "no", "no"] },
  { cap: "Publish rosters to client portal", r: ["approve", "no", "no", "no", "no"] },
  { cap: "View own invoices", r: ["yes", "yes", "no", "own", "no"] },
  { cap: "Change settings and AI controls", r: ["yes", "no", "no", "no", "yes"] },
];
const CELL: Record<Cell, { t: string; tone: Tone }> = {
  yes: { t: "Yes", tone: "ok" }, own: { t: "Own only", tone: "info" }, no: { t: "No", tone: "neutral" }, approve: { t: "Approves", tone: "accent" },
};
const ROLES = ["Owner", "Admin · invoicing", "Worker", "Client viewer", "Consultant (demo)"];

function Users() {
  const people = [
    { name: "Paul Walsh", init: "PW", tint: "#d6b48a", role: "Owner", scope: "Everything", note: "Only confirmed named decision-maker.", status: "Active (demo)" },
    { name: "Elaine Walsh", init: "EW", tint: "#9fc7e6", role: "Admin · invoicing", scope: "Timesheets, invoicing, compliance, admin", note: "Functional role. Formal title unconfirmed.", status: "Active (demo)" },
    { name: WORKERS.length + " subcontractors", init: "17", tint: "#b9c6d4", role: "Worker self-service", scope: "Own hours, own documents, own site", note: "Portal preview only. No invites sent.", status: "Not invited" },
    { name: CLIENTS.length + " client accounts", init: "4", tint: "#c8d8a8", role: "Client viewer", scope: "Own sites, roster, approved hours, own invoices", note: "Placeholder contacts on client.example.", status: "Not invited" },
    { name: "Setup consultant", init: "AC", tint: "#d8c0e8", role: "Consultant (demo)", scope: "Configuration, no financial approvals", note: "Demonstration role for the build team.", status: "Demo only" },
  ];
  return (
    <>
      <Head crumbs={CRUMB("Users & roles")} title="Users & roles" sub="Who uses Pulse and what each role can reach. Only Paul and Elaine are real people here; worker and client roles are previews." />
      <Card flush title="People and roles">
        <Table minWidth={860} cols={[
          { k: "n", label: "Name", render: (p) => <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Avatar initials={p.init} tint={p.tint} size={26} /><span className="ink">{p.name}</span></span> },
          { k: "r", label: "Role", render: (p) => <Badge tone="neutral">{p.role}</Badge> },
          { k: "s", label: "Scope", render: (p) => p.scope },
          { k: "no", label: "Note", render: (p) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{p.note}</span> },
          { k: "st", label: "Status", render: (p) => <Badge tone={p.status.startsWith("Active") ? "ok" : "info"}>{p.status}</Badge> },
        ]} rows={people} />
      </Card>
      <Card flush title="Permissions matrix" sub="What each role can do. “Approves” means the action waits for that role's explicit approval.">
        <Table minWidth={900} cols={[
          { k: "c", label: "Capability", render: (c) => <span className="ink">{c.cap}</span> },
          ...ROLES.map((r, i) => ({ k: r, label: r, render: (c: (typeof CAPS)[number]) => <Badge tone={CELL[c.r[i]].tone}>{CELL[c.r[i]].t}</Badge> })),
        ]} rows={CAPS} />
      </Card>
      <div className="wl-g wl-g-2">
        <Note>Worker and client accounts are not created in the demo. Previews: <button className="wl-link" onClick={() => navigate("Crew", "portal")}>worker portal</button> · <button className="wl-link" onClick={() => navigate("Clients", "portal")}>client portal</button>.</Note>
        <Note tone="warn">Contractor status is not treated as legally settled. Classification is reviewed by a person during onboarding.</Note>
      </div>
    </>
  );
}

/* ── Permissions ──────────────────────────────────────────────────────────── */
function Permissions() {
  const fields: { f: string; owner: string; admin: string; worker: string; client: string }[] = [
    { f: "Contractor pay rate", owner: "All", admin: "All", worker: "Own only", client: "Never" },
    { f: "Client charge rate", owner: "All", admin: "All", worker: "Never", client: "Own sites" },
    { f: "Margin / contribution", owner: "All", admin: "All", worker: "Never", client: "Never" },
    { f: "Hours and timesheets", owner: "All", admin: "All", worker: "Own only", client: "Own sites" },
    { f: "Worker documents & certificates", owner: "All", admin: "All", worker: "Own only", client: "Never (status only)" },
    { f: "Worker phone / email", owner: "All", admin: "All", worker: "Own only", client: "Never" },
    { f: "Invoices", owner: "All", admin: "All", worker: "Never", client: "Own only" },
    { f: "Other clients and their sites", owner: "All", admin: "All", worker: "Own site only", client: "Never" },
    { f: "Agent suggestions & internal notes", owner: "All", admin: "All", worker: "Never", client: "Never" },
  ];
  const tone = (s: string): Tone => (s === "All" ? "ok" : s.startsWith("Never") ? "bad" : "info");
  return (
    <>
      <Head crumbs={CRUMB("Permissions")} title="Permissions" sub="Data scoping rules. The portal previews in this demo apply these rules in the browser so you can see them working." />
      <div className="wl-g wl-g-3">
        <Card title="Clients see only their own records">
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>A client viewer sees its own sites, named roster, approved hours, its own invoices and requests. Nothing about other clients, workers' pay or margins.</div>
          <div style={{ marginTop: 12 }}><Btn small onClick={() => navigate("Clients", "portal")}>Test in client portal</Btn></div>
        </Card>
        <Card title="Workers see only their own">
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>A worker sees their own site, hours, rate, documents and messages. No other worker's details, no client-wide financials.</div>
          <div style={{ marginTop: 12 }}><Btn small onClick={() => navigate("Crew", "portal")}>Test in worker portal</Btn></div>
        </Card>
        <Card title="Internal finance rates are private">
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>Contractor rates, margins and forecasts stay with Paul and Elaine. Exports to the accountant carry only what the accountant needs.</div>
          <div style={{ marginTop: 12 }}><Btn small onClick={() => navigate("Finance", "overview")}>Open Finance</Btn></div>
        </Card>
      </div>
      <Card flush title="Field-level visibility" sub="Who can see each kind of data">
        <Table minWidth={820} cols={[
          { k: "f", label: "Data", render: (r) => <span className="ink">{r.f}</span> },
          { k: "o", label: "Owner", render: (r) => <Badge tone={tone(r.owner)}>{r.owner}</Badge> },
          { k: "a", label: "Admin · invoicing", render: (r) => <Badge tone={tone(r.admin)}>{r.admin}</Badge> },
          { k: "w", label: "Worker", render: (r) => <Badge tone={tone(r.worker)}>{r.worker}</Badge> },
          { k: "c", label: "Client viewer", render: (r) => <Badge tone={tone(r.client)}>{r.client}</Badge> },
        ]} rows={fields} />
      </Card>
      <Note>In this demo the rules are enforced in the frontend only, to show the intended behaviour. A live build enforces them on the server.</Note>
    </>
  );
}

/* ── Systems & integrations ───────────────────────────────────────────────── */
function Systems() {
  const confirmed = SYSTEMS.filter((s) => s.prov === "confirmed_by_client").length;
  return (
    <>
      <Head crumbs={CRUMB("Systems & integrations")} title="Systems & integrations" sub="The tools the business uses today and what Pulse would connect to. Statuses are honest: nothing is live in the demo." />
      <div className="wl-g wl-g-4">
        <Kpi label="Live connections" value={0} sub="Demo is browser-only" />
        <Kpi label="Confirmed tools" value={confirmed} tone="ok" sub="From the calls" />
        <Kpi label="Proposed or unconfirmed" value={SYSTEMS.length - confirmed} tone="warn" />
        <Kpi label="Manual imports" value={1} sub="Excel preview" onClick={() => navigate("Records", "imports")} />
      </div>
      <div className="wl-g wl-g-2">
        {SYSTEMS.map((s) => (
          <Card key={s.name} title={s.name} right={<><Badge tone={s.tone === "ok" ? "ok" : s.tone === "warn" ? "warn" : s.tone === "bad" ? "bad" : "neutral"}>{s.status}</Badge><ProvBadge p={s.prov} /></>}>
            <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>{s.note}</div>
          </Card>
        ))}
      </div>
      <Note tone="warn">No API health checks are shown because nothing is connected. Revenue / ROS / eRCT appears as a manual or CSV workflow only, and whether RCT applies to these contracts is to be verified. This is not tax advice.</Note>
    </>
  );
}

/* ── Governance ───────────────────────────────────────────────────────────── */
function Governance() {
  const st = useDemo();
  const aps = approvals(st);
  const decided = activity(st).filter((e) => /^Approved|^Declined|^Released|^Held/.test(e.title));
  const rules = [
    { a: "Invoice finalisation", who: "Elaine or Paul", agent: "Draft only", ex: "Week 46 drafts · DRF-W46-01 to 04" },
    { a: "Timesheet release", who: "Client sign-off, then Elaine", agent: "Validate, flag duplicates", ex: "TS-1098 · 8h · €320" },
    { a: "Debtor and client messages", who: "Paul", agent: "Draft only", ex: "INV-2026-103 reminder" },
    { a: "Compliance sign-off", who: "Elaine", agent: "Propose hold or reminder", ex: "Sean Murphy · manual handling" },
    { a: "Client portal publication", who: "Paul", agent: "Prepare preview", ex: "REQ-204 · North Quay roster" },
    { a: "Payments and payouts", who: "Out of scope", agent: "None", ex: "Pulse does not move money" },
  ];
  return (
    <>
      <Head crumbs={CRUMB("Governance")} title="Governance" sub="Approval rules, the audit trail, data provenance and document controls." />
      <div className="wl-g wl-g-4">
        <Kpi label="Approval gates" value={rules.length - 1} sub="+ payments out of scope" />
        <Kpi label="Awaiting approval" value={aps.filter((a) => a.status.startsWith("Awaiting")).length} tone="warn" onClick={() => navigate("Work", "approvals")} />
        <Kpi label="Decisions recorded" value={decided.length} sub="This session (demo)" onClick={() => navigate("Activity", "all")} />
        <Kpi label="Open tasks" value={allTasks(st).filter((t) => t.status !== "Done").length} onClick={() => navigate("Work", "tasks")} />
      </div>
      <Card flush title="Approval rules">
        <Table minWidth={820} cols={[
          { k: "a", label: "Action", render: (r) => <span className="ink">{r.a}</span> },
          { k: "w", label: "Requires", render: (r) => <Badge tone={r.who === "Out of scope" ? "neutral" : "accent"}>{r.who}</Badge> },
          { k: "g", label: "Agents may", render: (r) => r.agent },
          { k: "e", label: "Example in demo", render: (r) => <span className="dim">{r.ex}</span> },
        ]} rows={rules} />
      </Card>
      <div className="wl-g wl-g-3">
        <Card title="Audit trail" sub="Latest recorded decisions">
          {decided.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No decisions in this session yet. Approve something in Work › Approvals and it appears here.</div>}
          {decided.slice(0, 6).map((e) => (
            <div key={e.id} className="wl-row" style={{ alignItems: "flex-start" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5 }}>{e.title}</div><div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{e.actor} · {e.at}</div></div></div>
          ))}
          <div style={{ marginTop: 10 }}><Btn small kind="ghost" onClick={() => navigate("Activity", "all")}>Full activity log</Btn></div>
        </Card>
        <Card title="Data provenance" sub="Every record carries one of three tags">
          <div className="wl-stack" style={{ gap: 10 }}>
            {(Object.keys(PROV) as Provenance[]).map((p) => (
              <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <ProvBadge p={p} />
                <span style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.45 }}>{p === "confirmed_by_client" ? "Said by Paul or Elaine on the calls." : p === "research_unverified" ? "Found in public research; not confirmed as this business." : "Placeholder chosen for the demo."}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Document controls">
          <div className="wl-stack" style={{ gap: 8 }}>
            <Note>Uploads in the demo stay in browser memory. Nothing reaches a document store.</Note>
            <Note>Certificate numbers are not stored or invented. Verification is a person sighting a copy.</Note>
            <Note>Expiry dates drive reminders 30 days ahead and site holds on expiry.</Note>
            <Note>Workers can replace their own documents; a person approves before clearance changes.</Note>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ── AI controls ──────────────────────────────────────────────────────────── */
type Mode = "suggest" | "draft" | "act";
function Toggle({ on, onClick, locked, label }: { on: boolean; onClick?: () => void; locked?: boolean; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={locked ? undefined : onClick} title={locked ? "Locked on in this workspace" : undefined}
      style={{ width: 40, height: 22, borderRadius: 999, border: "1px solid var(--border)", background: on ? "var(--accent)" : "var(--track)", position: "relative", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? .8 : 1, flex: "none", padding: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: 999, background: on ? "var(--on-accent)" : "var(--dim)", transition: "left .18s var(--ease)" }} />
    </button>
  );
}
function Row({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return <div className="wl-row" style={{ gap: 14 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>{label}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{sub}</div></div>{children}</div>;
}

function AiControls() {
  const [mode, setMode] = useState<Record<string, Mode>>({ briefing: "act", ops: "suggest", collector: "draft", invoice: "draft", compliance: "suggest", margin: "suggest", collections: "draft" });
  const [rules, setRules] = useState({ schedule: true, weekends: false, briefingWa: false });
  const allowAct = (id: string) => id === "briefing" || id === "margin";
  const MODES: { id: Mode; label: string }[] = [{ id: "suggest", label: "Suggest" }, { id: "draft", label: "Draft" }, { id: "act", label: "Act" }];
  return (
    <>
      <Head crumbs={CRUMB("AI controls")} title="AI controls" sub="What each agent may do on its own. Preview controls: changes here stay in this view and reset when you leave the tab." />
      <Note tone="warn">Locked rules: invoices, payments and any message to a worker or client always need a person's approval. Agents cannot switch these off.</Note>
      <Card flush title="Agent autonomy" sub="Suggest = flag only · Draft = prepare for review · Act = run without asking (read-only agents only)">
        <Table minWidth={880} cols={[
          { k: "a", label: "Agent", render: (a) => <span className="ink">{a.name}</span> },
          { k: "t", label: "Trigger", render: (a) => <span className="dim">{a.trigger}</span> },
          { k: "m", label: "Mode", render: (a) => (
            <div className="wl-seg">
              {MODES.map((m) => {
                const disabled = m.id === "act" && !allowAct(a.id);
                return <button key={m.id} className={mode[a.id] === m.id ? "on" : ""} disabled={disabled} title={disabled ? "Act is not available: this agent touches money, messages or compliance" : undefined}
                  style={disabled ? { opacity: .35, cursor: "not-allowed" } : undefined}
                  onClick={() => { if (!disabled) { setMode((p) => ({ ...p, [a.id]: m.id })); toast("Updated demo · " + a.name + " set to " + m.label); } }}>{m.label}</button>;
              })}
            </div>
          ) },
          { k: "p", label: "Policy", render: (a) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{a.policy}</span> },
        ]} rows={[...AGENTS]} />
      </Card>
      <div className="wl-g wl-g-2">
        <Card title="Human approval">
          <Row label="Invoices need approval" sub="Drafts never finalise on their own"><Toggle on locked label="Invoices need approval" /></Row>
          <Row label="Payments need approval" sub="Pulse does not move money in any case"><Toggle on locked label="Payments need approval" /></Row>
          <Row label="Messages need approval" sub="Email, SMS or WhatsApp to workers or clients"><Toggle on locked label="Messages need approval" /></Row>
          <Row label="Compliance holds need approval" sub="Agents propose holds; a person applies them"><Toggle on locked label="Compliance holds need approval" /></Row>
        </Card>
        <Card title="Scheduled demo rules">
          <Row label="Run scheduled agents" sub="Briefing 07:00, expiry scan 06:30, invoice drafts Mon 08:15"><Toggle on={rules.schedule} onClick={() => setRules((r) => ({ ...r, schedule: !r.schedule }))} label="Run scheduled agents" /></Row>
          <Row label="Run at weekends" sub="Off: Paul already works six days"><Toggle on={rules.weekends} onClick={() => setRules((r) => ({ ...r, weekends: !r.weekends }))} label="Run at weekends" /></Row>
          <Row label="Send briefing to WhatsApp" sub="Proposed only. WhatsApp is not connected"><Toggle on={rules.briefingWa} onClick={() => toast("WhatsApp is not connected in the demo")} label="Send briefing to WhatsApp" /></Row>
          <div style={{ marginTop: 10 }}><Btn small kind="ghost" onClick={() => navigate("Agents", "overview")}>Open Agents</Btn></div>
        </Card>
      </div>
    </>
  );
}

/* ── Appearance ───────────────────────────────────────────────────────────── */
function Appearance({ v }: { v: any }) {
  const sw = [
    { n: "Deep steel", h: ORG.palette.steel, use: "Surfaces, headers" },
    { n: "Muted copper", h: ORG.palette.copper, use: "Accent, primary buttons" },
    { n: "Cool white", h: ORG.palette.coolWhite, use: "Text on dark" },
    { n: "Teal", h: ORG.palette.positive, use: "Approved, healthy" },
    { n: "Amber", h: ORG.palette.warning, use: "Pending, expiring" },
    { n: "Red", h: ORG.palette.danger, use: "Expired, blocked" },
  ];
  const light = v?.theme === "light";
  return (
    <>
      <Head crumbs={CRUMB("Appearance")} title="Appearance" sub="Pulse glass theme with a placeholder palette. Branding is assumed for the demo until the client supplies the real thing." />
      <div className="wl-g wl-g-3">
        <Card title="Theme" sub={"Current: " + (light ? "Light" : "Walsh dark (default)")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="primary" onClick={() => v?.toggleTheme?.()}>{light ? "Switch to dark" : "Switch to light"}</Btn>
            <Btn onClick={() => v?.toggleBgMenu?.()}>Home background</Btn>
          </div>
          <div style={{ marginTop: 12 }}><Note>The theme toggle in the top bar does the same thing.</Note></div>
        </Card>
        <Card title="Brand mark" sub="Restrained custom monogram">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 22 }}>W</span>
            <span style={{ width: 56, height: 56, borderRadius: 999, border: "1px solid var(--border-strong)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 22 }}>W</span>
          </div>
          <div style={{ marginTop: 12 }}><Note tone="warn">W monogram placeholder. Not an official logo, and no logo was taken from any company website.</Note></div>
        </Card>
        <Card title="Typography & surfaces">
          <div className="wl-g wl-g-2">
            <Stat k="Typeface" v="Geist" sub="Pulse default" />
            <Stat k="Numbers" v="Tabular" sub="Aligned in tables" />
            <Stat k="Corners" v="20px cards" sub="Pill controls" />
            <Stat k="Accent use" v="Sparing" sub="Primary actions, active tab" />
          </div>
        </Card>
      </div>
      <Card title="Accent palette" sub="Demo placeholder, not verified client colours">
        <div className="wl-g wl-g-6">
          {sw.map((s) => (
            <div key={s.n} style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ height: 64, background: s.h }} />
              <div style={{ padding: "9px 11px" }}>
                <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--mono)", marginTop: 2 }}>{s.h}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{s.use}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><Note>Status colours always come with a text label, so meaning never depends on colour alone.</Note></div>
      </Card>
    </>
  );
}

export default function SettingsModule({ tab, v }: { tab: string; v: any }) {
  return (
    <Page>
      {tab === "users" ? <Users /> : tab === "permissions" ? <Permissions /> : tab === "systems" ? <Systems />
        : tab === "governance" ? <Governance /> : tab === "ai" ? <AiControls /> : tab === "appearance" ? <Appearance v={v} /> : <Org />}
    </Page>
  );
}
