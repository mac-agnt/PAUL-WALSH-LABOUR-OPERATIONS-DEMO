/* Work · tasks, approvals (decided kept apart from awaiting), mock workflows
   and the week schedule. State changes go through src/demo/actions.ts. */
import { useState, type ReactNode } from "react";
import { logActivity, navigate, toast, useDemo } from "../../demo/store";
import {
  allTasks, approvals, certAlerts, eur, readiness, requestStatus, runStatus, siteRows, weeklyTotals, workersAt, type Approval,
} from "../../demo/selectors";
import {
  approveReminder, approveTs1098, decideRequest, requestClientSignoff, setTaskStatus, verifyDocument,
} from "../../demo/actions";
import { AGENT_RUNS, SITES, type Task, type TaskStatus } from "../../demo/walshData";
import { Badge, Btn, Card, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const CRUMB = (label: string) => [{ label: "Work", page: "Work", tab: "tasks" }, { label }];
const INV_APPROVED_TITLE = "Approved week 46 invoice drafts (demo)";
const prioTone = (p: Task["priority"]): Tone => (p === "High" ? "bad" : p === "Medium" ? "warn" : "neutral");
const statusTone = (s: TaskStatus): Tone => (s === "Done" ? "ok" : s === "Waiting" ? "warn" : s === "In progress" ? "accent" : "info");
const STATUSES: TaskStatus[] = ["Open", "In progress", "Waiting", "Done"];

/* ── Tasks ────────────────────────────────────────────────────────────────── */
function Tasks() {
  const st = useDemo();
  const tasks = allTasks(st);
  const [owner, setOwner] = useState<"all" | "paul" | "elaine" | "agents">("all");
  const [status, setStatus] = useState<"active" | "all" | TaskStatus>("active");
  const [dept, setDept] = useState("all");
  const ownerOk = (t: Task) => owner === "all" || (owner === "paul" ? t.owner === "Paul Walsh" : owner === "elaine" ? t.owner === "Elaine Walsh" : !/Walsh$/.test(t.owner));
  const statusOk = (t: Task) => status === "all" || (status === "active" ? t.status !== "Done" : t.status === status);
  const rows = tasks.filter((t) => ownerOk(t) && statusOk(t) && (dept === "all" || t.dept === dept));
  const depts = Array.from(new Set(tasks.map((t) => t.dept)));
  const active = tasks.filter((t) => t.status !== "Done");
  return (
    <>
      <Head crumbs={CRUMB("Tasks")} title="Tasks" sub="Everything Paul, Elaine and the agents have on. Click a task to jump to the record it relates to." />
      <div className="wl-g wl-g-4">
        <Kpi label="Open tasks" value={active.length} sub={tasks.length + " in total incl. done"} onClick={() => setStatus("active")} />
        <Kpi label="High priority" value={active.filter((t) => t.priority === "High").length} tone="bad" sub="Due today or tomorrow" onClick={() => { setStatus("active"); setOwner("all"); }} />
        <Kpi label="On Paul" value={active.filter((t) => t.owner === "Paul Walsh").length} sub="Decisions and approvals" onClick={() => setOwner("paul")} />
        <Kpi label="On Elaine" value={active.filter((t) => t.owner === "Elaine Walsh").length} sub="Invoicing, admin, documents" onClick={() => setOwner("elaine")} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Seg label="Owner" value={owner} onChange={setOwner} options={[{ id: "all" as const, label: "Everyone" }, { id: "paul" as const, label: "Paul" }, { id: "elaine" as const, label: "Elaine" }, { id: "agents" as const, label: "Agents" }]} />
        <Seg label="Status" value={status} onChange={setStatus} options={[{ id: "active" as const, label: "Not done" }, ...STATUSES.map((s) => ({ id: s, label: s })), { id: "all" as const, label: "All" }]} />
        <select className="wl-in" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <Card flush title={rows.length + " tasks"} sub="Status changes stay in this browser (demo).">
        <Table minWidth={1000} onRow={(t) => navigate(t.link.page, t.link.tab)} cols={[
          { k: "id", label: "ID", w: 64, render: (t) => <span className="dim">{t.id}</span> },
          { k: "t", label: "Task", render: (t) => <span className="ink" style={{ textDecoration: t.status === "Done" ? "line-through" : "none", opacity: t.status === "Done" ? .6 : 1 }}>{t.title}</span> },
          { k: "o", label: "Owner", render: (t) => t.owner },
          { k: "d", label: "Due", render: (t) => t.due },
          { k: "p", label: "Priority", render: (t) => <Badge tone={prioTone(t.priority)}>{t.priority}</Badge> },
          { k: "dp", label: "Department", render: (t) => t.dept },
          { k: "r", label: "Related", render: (t) => <span className="dim">{t.related}</span> },
          { k: "s", label: "Status", render: (t) => (
            <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              <select className="wl-in" style={{ height: 28, fontSize: 12 }} value={t.status} aria-label={"Status for " + t.id}
                onChange={(e) => { setTaskStatus(t.id, e.target.value as TaskStatus); toast("Updated demo · " + t.id + " → " + e.target.value); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </span>
          ) },
        ]} rows={rows} empty="No tasks match these filters." />
      </Card>
      <div className="wl-g wl-g-3">
        <Card title="By department">
          {depts.map((d) => {
            const n = active.filter((t) => t.dept === d).length;
            return <div key={d} className="wl-row click" onClick={() => setDept(d)} style={{ padding: "9px 6px" }}><span style={{ flex: 1, fontSize: 12.5 }}>{d}</span><span style={{ fontSize: 12.5, color: "var(--dim)" }}>{n} open</span></div>;
          })}
        </Card>
        <Card title="Recurring admin" sub="Weekly rhythm (mock)">
          {[["Mon", "Invoice drafts reviewed, debtor list checked"], ["Wed", "Spreadsheet export to accountant"], ["Fri 15:00", "Timesheet cut-off"], ["Daily 06:30", "Certificate expiry scan"]].map(([k, v]) => (
            <div key={k} className="wl-row"><span style={{ width: 80, fontSize: 12, color: "var(--faint)" }}>{k}</span><span style={{ flex: 1, fontSize: 12.5 }}>{v}</span></div>
          ))}
        </Card>
        <Card title="Agent suggestions waiting" sub="Suggestions are not tasks until a person accepts them">
          <div style={{ fontSize: 26, fontWeight: 600 }}>{AGENT_RUNS.filter((r) => r.needsApproval && runStatus(r.id, st) === "proposed").length}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", margin: "4px 0 12px" }}>proposed by agents, awaiting review</div>
          <Btn small onClick={() => navigate("Agents", "review")}>Open review queue</Btn>
        </Card>
      </div>
    </>
  );
}

/* ── Approvals ────────────────────────────────────────────────────────────── */
function ApprovalActions({ a, invApproved }: { a: Approval; invApproved: boolean }) {
  const st = useDemo();
  const btns: ReactNode[] = [];
  let note: ReactNode = null;
  if (a.id === "AP-TS1098") {
    if (st.ts1098 === "pending") btns.push(<Btn key="r" small onClick={requestClientSignoff}>Request client sign-off</Btn>);
    btns.push(<Btn key="a" small kind="primary" onClick={approveTs1098}>Approve in demo</Btn>);
    note = st.ts1098 === "signoff_requested" ? "Sign-off requested from Morrow. Approving here simulates the client signing." : null;
  } else if (a.id === "AP-REM103") {
    if (st.reminder.status === "draft") note = "Draft not yet submitted from Finance › Debtors. You can edit it there, or approve the draft as it stands.";
    btns.push(<Btn key="a" small kind="primary" onClick={approveReminder}>{st.reminder.status === "draft" ? "Approve draft (demo)" : "Approve (demo)"}</Btn>);
    btns.push(<Btn key="e" small onClick={() => navigate("Finance", "debtors")}>Edit draft</Btn>);
  } else if (a.id === "AP-REQ204") {
    btns.push(<Btn key="a" small kind="primary" onClick={() => decideRequest("REQ-204", "approved")}>Approve & publish (demo)</Btn>);
    btns.push(<Btn key="d" small onClick={() => decideRequest("REQ-204", "declined")}>Decline</Btn>);
  } else if (a.id === "AP-DOC-SEAN") {
    const inReview = st.docs["sean-murphy:manual-handling"]?.status === "under_review";
    if (inReview) btns.push(<Btn key="a" small kind="primary" onClick={() => verifyDocument("sean-murphy", "manual-handling")}>Approve document</Btn>);
    else note = "No upload to approve yet. Request one from Sean, or arrange cover.";
    btns.push(<Btn key="c" small onClick={() => navigate("Compliance", "expiring")}>Open Compliance</Btn>);
  } else if (a.id === "AP-INV-W46" && !invApproved) {
    btns.push(<Btn key="a" small kind="primary" onClick={() => {
      const t = weeklyTotals(st);
      logActivity({ kind: "people", actor: "Elaine Walsh", title: INV_APPROVED_TITLE + " · not issued", detail: "4 drafts, " + eur(t.ready) + " ready" + (t.held ? ", " + eur(t.held) + " still held" : "") + ". Marked approved in the demo only; no invoice was issued or sent.", link: { page: "Timesheets", tab: "export" } });
      toast("Updated demo · drafts approved, not issued");
    }}>Approve drafts (demo)</Btn>);
    btns.push(<Btn key="o" small onClick={() => navigate("Timesheets", "export")}>Review drafts</Btn>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{btns}</div>
      {note && <div style={{ fontSize: 11.5, color: "var(--dim)", maxWidth: 300, textAlign: "right" }}>{note}</div>}
    </div>
  );
}

function Approvals() {
  const st = useDemo();
  const invApproved = st.activity.some((e) => e.title.startsWith(INV_APPROVED_TITLE));
  const list = approvals(st).map((a) => a.id === "AP-INV-W46" && invApproved ? { ...a, status: "Approved (demo)" as const, detail: "Approved in the demo. Not issued: invoicing stays with the accountant process." } : a);
  const awaiting = list.filter((a) => a.status.startsWith("Awaiting"));
  const decided = list.filter((a) => !a.status.startsWith("Awaiting"));
  const tone = (s: Approval["status"]): Tone => (s === "Approved (demo)" ? "ok" : s === "Declined (demo)" ? "bad" : s === "Awaiting client" ? "info" : "warn");
  return (
    <>
      <Head crumbs={CRUMB("Approvals")} title="Approvals" sub="Human gates for money, messages, compliance and anything a client will see. Decided items are kept apart from what still needs a person." />
      <div className="wl-g wl-g-4">
        <Kpi label="Awaiting a decision" value={awaiting.length} tone="warn" />
        <Kpi label="On Paul" value={awaiting.filter((a) => a.owner === "Paul Walsh").length} sub="Messages, rosters" />
        <Kpi label="On Elaine" value={awaiting.filter((a) => a.owner === "Elaine Walsh").length} sub="Hours, documents, invoices" />
        <Kpi label="Decided (demo)" value={decided.length} tone="ok" sub="This session" />
      </div>
      <Card title="Awaiting decision" sub="Nothing here has been sent, issued or published.">
        {awaiting.length === 0 && <div style={{ padding: "18px 0", fontSize: 13, color: "var(--dim)" }}>Nothing waiting. Use Reset in the side rail to restore the demo story.</div>}
        {awaiting.map((a) => (
          <div key={a.id} className="wl-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap", padding: "14px 0" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Badge tone="neutral">{a.kind}</Badge>
                <Badge tone={tone(a.status)}>{a.status}</Badge>
                <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{a.id} · owner {a.owner}</span>
              </div>
              <button className="wl-link" style={{ color: "var(--ink)", fontSize: 14, fontWeight: 500, marginTop: 8 }} onClick={() => navigate(a.link.page, a.link.tab)}>{a.title}</button>
              <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{a.detail}</div>
            </div>
            <ApprovalActions a={a} invApproved={invApproved} />
          </div>
        ))}
      </Card>
      <div className="wl-g wl-g-21">
        <Card title="Decided (demo)" sub="Recorded decisions. Each one is also written to Activity.">
          {decided.length === 0 && <div style={{ padding: "12px 0", fontSize: 12.5, color: "var(--dim)" }}>No decisions yet in this session.</div>}
          {decided.map((a) => (
            <div key={a.id} className="wl-row click" onClick={() => navigate(a.link.page, a.link.tab)} style={{ padding: "11px 6px" }}>
              <Badge tone={tone(a.status)}>{a.status}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{a.kind} · {a.owner}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card title="Approval policy">
          <div className="wl-stack" style={{ gap: 8 }}>
            <Note>Invoices finalise only after Elaine or Paul approves the draft.</Note>
            <Note>Debtor and client messages are approved by Paul. The demo never sends them.</Note>
            <Note>Compliance documents are signed off by a person, never an agent.</Note>
            <Note>Rosters are published to a client portal only after Paul approves.</Note>
            <Btn small kind="ghost" onClick={() => navigate("Settings", "governance")}>Governance settings</Btn>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ── Workflows ────────────────────────────────────────────────────────────── */
function Workflows() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const ca = certAlerts(st);
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const flows = [
    { id: "WF-1", name: "Weekly timesheet reminder", trigger: "Fri 15:00 reminder · Mon 08:00 validation", owner: "Timesheet Collector", last: "Mon 16 Nov 08:00",
      result: `Validated ${t.submitted}h across ${t.sheets} sheets · 1 duplicate row rejected`, gate: "Client sign-off stays with the client. The agent never certifies attendance.",
      steps: ["Remind missing", "Validate hours", "Flag duplicates", "Client signs", "Elaine reviews"], runs: ["ok", "ok", "ok", "warn", "ok", "ok", "ok"] },
    { id: "WF-2", name: "Daily expiry scan", trigger: "Daily 06:30", owner: "Compliance Monitor", last: "Mon 16 Nov 06:30",
      result: `${ca.expired.length} expired site-required · ${ca.expiring.length} expiring within 30 days · ${ca.held.length} held`, gate: "Holds and reminders are proposed. A person signs off every document.",
      steps: ["Read expiry dates", "Match site rules", "Propose hold", "Draft reminder", "Elaine signs off"], runs: ["ok", "ok", "ok", "ok", "ok", "warn", "warn"] },
    { id: "WF-3", name: "Weekly invoice draft", trigger: "Mon 08:15", owner: "Invoice Builder", last: "Mon 16 Nov 08:15",
      result: `4 drafts · ${eur(t.ready)} ready${t.held ? " · " + eur(t.held) + " held (TS-1098)" : ""}`, gate: "Drafts only. Elaine or Paul approves before anything is issued.",
      steps: ["Signed-off hours", "Group by client", "Hold unsigned", "Draft invoices", "Person approves"], runs: ["ok", "ok", "ok", "ok", "ok", "ok", "warn"] },
    { id: "WF-4", name: "Debtor follow-up", trigger: "Daily 09:30", owner: "Collections Assistant", last: "Mon 16 Nov 09:30",
      result: "INV-2026-103 reminder drafted (€7,760, 31 days)", gate: "Paul approves every message. Nothing is sent from the demo.",
      steps: ["Age receivables", "Pick overdue", "Draft reminder", "Paul approves", "Log outcome"], runs: ["ok", "ok", "ok", "ok", "ok", "ok", "ok"] },
    { id: "WF-5", name: "Onboarding checklist", trigger: "When a subcontractor is added", owner: "Elaine Walsh", last: "Not run this week (no new starters)",
      result: "Last used Oct 2025 (Jakub Zieliński, illustrative)", gate: "Contractor vs employee status is reviewed by a person, not decided by Pulse.",
      steps: ["Contact details", "Safe Pass + tickets", "Tax/admin forms", "Site rules", "Person reviews"], runs: ["idle", "idle", "idle", "idle", "idle", "idle", "idle"] },
  ];
  const dot = (r: string) => (r === "ok" ? "var(--ok)" : r === "warn" ? "var(--warn)" : "var(--track)");
  return (
    <>
      <Head crumbs={CRUMB("Workflows")} title="Workflows" sub="Recurring automations the agents run. Every one is a mock automation in this demo, and each stops at a human gate." />
      <Note tone="warn">Mock automations. Schedules and results are simulated from the demo data; nothing runs on a server and nothing leaves the browser.</Note>
      <div className="wl-g wl-g-2">
        {flows.map((f) => (
          <Card key={f.id} title={f.name} sub={f.trigger + " · owner " + f.owner}
            right={<><Badge tone="warn">Mock automation</Badge><Btn small kind="ghost" onClick={() => { setPaused((p) => ({ ...p, [f.id]: !p[f.id] })); toast("Updated demo · " + f.name + (paused[f.id] ? " resumed" : " paused")); }}>{paused[f.id] ? "Resume" : "Pause"}</Btn></>}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {f.steps.map((s, i) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11.5, background: i === f.steps.length - 1 ? "var(--warn-soft)" : "var(--surface-2)", color: i === f.steps.length - 1 ? "var(--warn)" : "var(--body)", border: "1px solid var(--border)" }}>{s}</span>
                  {i < f.steps.length - 1 && <span style={{ color: "var(--faint)" }}>›</span>}
                </span>
              ))}
            </div>
            <div className="wl-g wl-g-2" style={{ marginTop: 12 }}>
              <Stat k="Last run" v={f.last} sub={paused[f.id] ? "Paused (demo)" : "Active (demo)"} />
              <Stat k="Last result" v={f.result} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--faint)" }}>Last 7 runs</span>
              <span style={{ display: "flex", gap: 4 }}>{f.runs.map((r, i) => <span key={i} title={r} style={{ width: 14, height: 14, borderRadius: 4, background: dot(r) }} />)}</span>
            </div>
            <div style={{ marginTop: 12 }}><Note>Human gate: {f.gate}</Note></div>
          </Card>
        ))}
        <Card title="Add a workflow" sub="Describe it to an agent in Agents › Agent directory">
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>New automations are drafted in the agent studio and land here paused, with a human gate, until Paul turns them on.</div>
          <div style={{ marginTop: 12 }}><Btn small onClick={() => navigate("Agents", "directory")}>Open agent directory</Btn></div>
        </Card>
      </div>
    </>
  );
}

/* ── Schedule ─────────────────────────────────────────────────────────────── */
type Ev = { title: string; tone: Tone; kind: string; link?: { page: string; tab: string } };
function Schedule() {
  const st = useDemo();
  const days = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20", "Sat 21", "Sun 22"];
  const rows = siteRows(st);
  const tasks = allTasks(st).filter((t) => t.status !== "Done");
  const ev: Record<string, Ev[]> = Object.fromEntries(days.map((d) => [d, [] as Ev[]]));
  for (const t of tasks) {
    const m = days.find((d) => t.due.startsWith(d.split(" ")[0] + " " + d.split(" ")[1]));
    if (m) ev[m].push({ title: t.title, tone: t.priority === "High" ? "bad" : "info", kind: "Task · " + t.owner.split(" ")[0], link: t.link });
  }
  ev["Fri 20"].unshift({ title: "Patrick Doyle · Safe Pass expires", tone: "warn", kind: "Cert expiry", link: { page: "Compliance", tab: "expiring" } });
  ev["Fri 20"].push({ title: "Timesheet cut-off 15:00 (week 47)", tone: "accent", kind: "Deadline", link: { page: "Timesheets", tab: "overview" } });
  if (requestStatus("REQ-204", st) === "waiting_paul") ev["Mon 16"].push({ title: "REQ-204 roster to Castleview", tone: "warn", kind: "Approval", link: { page: "Clients", tab: "requests" } });
  if (st.ts1098 !== "approved") ev["Tue 17"].push({ title: "TS-1098 sign-off needed for invoicing", tone: "warn", kind: "Approval", link: { page: "Timesheets", tab: "approval" } });
  if (st.cover["mark-dunne"]) ev["Tue 17"].unshift({ title: "Mark Dunne starts as North Quay cover", tone: "ok", kind: "Placement", link: { page: "Operations", tab: "allocations" } });
  ev["Wed 18"].push({ title: "Week 46 export to accountant", tone: "info", kind: "Finance", link: { page: "Finance", tab: "overview" } });
  return (
    <>
      <Head crumbs={CRUMB("Schedule")} title="Schedule · week of 16 Nov" sub="Site placements, approval deadlines and certificate expiries for the coming week. Rostered Mon–Fri on all five sites." />
      <Card flush title="Site placements" sub="Workers on each site per day. Held workers are rostered but not cleared for entry.">
        <Table minWidth={860} onRow={(r) => navigate("Operations", "allocations")} cols={[
          { k: "s", label: "Site", render: (r) => <span><span className="ink">{r.site.name}</span><div style={{ fontSize: 11, color: "var(--faint)" }}>{r.site.shift}</div></span> },
          ...days.map((d, i) => ({ k: d, label: d, render: (r: (typeof rows)[number]) => {
            if (i > 4) return <span className="dim">n/a</span>;
            const crew = workersAt(r.site.id);
            const held = crew.filter((w) => readiness(w, st).state === "held").length;
            const cover = r.site.id === "north-quay" && st.cover["mark-dunne"] && i >= 1 ? 1 : 0;
            return <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <Badge tone="ok">{crew.length - held + cover}</Badge>{held > 0 && <Badge tone="bad">{held} held</Badge>}
            </span>;
          } })),
        ]} rows={rows} />
      </Card>
      <div className="wl-g wl-g-7">
        {days.map((d) => (
          <div key={d} className="wl-card" style={{ padding: "12px 12px 14px", minHeight: 180, background: d === "Mon 16" ? "var(--surface-2)" : undefined }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{d}</span>
              <span style={{ fontSize: 11, color: "var(--faint)" }}>Nov</span>
              {d === "Mon 16" && <span style={{ marginLeft: "auto" }}><Badge tone="accent">Today</Badge></span>}
            </div>
            <div className="wl-stack" style={{ gap: 6, marginTop: 10 }}>
              {ev[d].length === 0 && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{d.startsWith("S") ? "No site work" : "Placements only"}</span>}
              {ev[d].map((e, i) => (
                <button key={i} className="wl-kpi" style={{ padding: "8px 9px", borderRadius: 10 }} onClick={() => e.link && navigate(e.link.page, e.link.tab)}>
                  <div style={{ fontSize: 10.5, color: e.tone === "bad" ? "var(--bad)" : e.tone === "warn" ? "var(--warn)" : e.tone === "ok" ? "var(--ok)" : "var(--dim)" }}>{e.kind}</div>
                  <div style={{ fontSize: 12, color: "var(--ink)", marginTop: 3, lineHeight: 1.35 }}>{e.title}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="wl-g wl-g-3">
        <Card title="Coming up after this week">
          <div className="wl-row click" onClick={() => navigate("Compliance", "expiring")} style={{ padding: "9px 6px" }}><Badge tone="warn">2 Dec</Badge><span style={{ fontSize: 12.5 }}>Conor O'Reilly · Westbridge induction expires</span></div>
          <div className="wl-row click" onClick={() => navigate("Finance", "debtors")} style={{ padding: "9px 6px" }}><Badge tone="info">19 Nov</Badge><span style={{ fontSize: 12.5 }}>Week 42 invoices fall due</span></div>
          <div className="wl-row click" onClick={() => navigate("Clients", "rates")} style={{ padding: "9px 6px" }}><Badge tone="info">27 Nov</Badge><span style={{ fontSize: 12.5 }}>Harbour Road and Navan rates confirmed in writing</span></div>
        </Card>
        <Card title="This week in numbers">
          <div className="wl-g wl-g-2">
            <Stat k="Sites live" v={SITES.length} />
            <Stat k="Rostered" v={rows.reduce((a, r) => a + r.workers, 0)} sub={certAlerts(st).held.length + " held"} />
            <Stat k="Deadlines" v={Object.values(ev).flat().filter((e) => e.kind !== "Placement").length} />
            <Stat k="Cert expiries" v="1 this week" sub="+1 on 2 Dec" />
          </div>
        </Card>
        <Card title="Calendar notes">
          <Note>Times anchored to the demo week (Mon 16 Nov 2026). No calendar is connected.</Note>
        </Card>
      </div>
    </>
  );
}

export default function WorkModule({ tab }: { tab: string }) {
  return (
    <Page>
      {tab === "approvals" ? <Approvals /> : tab === "workflows" ? <Workflows /> : tab === "schedule" ? <Schedule /> : <Tasks />}
    </Page>
  );
}
