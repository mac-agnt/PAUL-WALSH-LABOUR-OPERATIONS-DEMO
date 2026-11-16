/* Activity · the anchored event log (base fixture + every demo action), live
   exceptions, agent outcomes and system events. Timestamps sit in the demo week. */
import { useState } from "react";
import { navigate, openDrawer, useDemo } from "../../demo/store";
import { activity, certAlerts, eur, fmtISO, requestStatus, runStatus, weeklyTotals } from "../../demo/selectors";
import { decideRun } from "../../demo/actions";
import { AGENTS, AGENT_RUNS, SYSTEMS, type ActEvent, type ActKind } from "../../demo/walshData";
import { Badge, Btn, Card, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const CRUMB = (label: string) => [{ label: "Activity", page: "Activity", tab: "all" }, { label }];
const KIND_LABEL: Record<ActKind, string> = { people: "People", agent: "Agent", system: "System", client: "Client" };
const KIND_TONE: Record<ActKind, Tone> = { people: "info", agent: "accent", system: "neutral", client: "warn" };
const dayOf = (e: ActEvent) => e.at.split(" ").slice(0, 3).join(" ");
const timeOf = (e: ActEvent) => e.at.split(" ")[3] || "";

function EventRow({ e }: { e: ActEvent }) {
  const demo = e.at.includes("demo");
  return (
    <div className={e.link ? "wl-row click" : "wl-row"} onClick={() => e.link && navigate(e.link.page, e.link.tab)}
      style={{ alignItems: "flex-start", padding: "11px 8px", gap: 14 }}>
      <span style={{ width: 44, flex: "none", fontSize: 12, color: "var(--faint)", fontVariantNumeric: "tabular-nums", paddingTop: 2 }}>{timeOf(e)}</span>
      <span style={{ flex: "none", paddingTop: 1 }}><Badge tone={KIND_TONE[e.kind]}>{KIND_LABEL[e.kind]}</Badge></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
          <span style={{ color: "var(--dim)" }}>{e.actor} · </span>{e.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{e.detail}</div>
      </div>
      <div style={{ flex: "none", display: "flex", gap: 6, alignItems: "center" }}>
        {e.attention && <Badge tone="warn">Attention</Badge>}
        {demo && <Badge tone="neutral">Demo action</Badge>}
        {e.link && <span aria-hidden style={{ color: "var(--faint)" }}>›</span>}
      </div>
    </div>
  );
}

function Grouped({ events }: { events: ActEvent[] }) {
  const days: string[] = [];
  events.forEach((e) => { if (!days.includes(dayOf(e))) days.push(dayOf(e)); });
  if (!events.length) return <div style={{ padding: "26px 0", textAlign: "center", fontSize: 13, color: "var(--dim)" }}>No events match.</div>;
  return (
    <>
      {days.map((d) => (
        <div key={d} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--faint)", padding: "10px 8px 2px" }}>{d === "Mon 16 Nov" ? d + " · today (demo anchor)" : d}</div>
          {events.filter((e) => dayOf(e) === d).map((e) => <EventRow key={e.id} e={e} />)}
        </div>
      ))}
    </>
  );
}

/* ── All activity ─────────────────────────────────────────────────────────── */
function All() {
  const st = useDemo();
  const all = activity(st);
  const [kind, setKind] = useState<"all" | ActKind>("all");
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const rows = all.filter((e) => (kind === "all" || e.kind === kind) && (!ql || (e.actor + " " + e.title + " " + e.detail).toLowerCase().includes(ql)));
  const count = (k: ActKind) => all.filter((e) => e.kind === k).length;
  return (
    <>
      <Head crumbs={CRUMB("All activity")} title="Activity" sub="Everything that happened in the demo week, newest first. Demo actions you take are added here with a demo timestamp." />
      <div className="wl-g wl-g-4">
        <Kpi label="Events" value={all.length} sub="Thu 12 – Mon 16 Nov" />
        <Kpi label="Needs attention" value={all.filter((e) => e.attention).length} tone="warn" onClick={() => navigate("Activity", "attention")} />
        <Kpi label="Agent events" value={count("agent")} onClick={() => navigate("Activity", "agents")} />
        <Kpi label="Demo actions this session" value={st.activity.length} sub={st.activity.length ? "Undo with Reset in the side rail" : "Nothing changed yet"} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Seg label="Kind" value={kind} onChange={setKind} options={[
          { id: "all" as const, label: "All", count: all.length }, { id: "people" as const, label: "People", count: count("people") },
          { id: "agent" as const, label: "Agents", count: count("agent") }, { id: "client" as const, label: "Clients", count: count("client") },
          { id: "system" as const, label: "System", count: count("system") }]} />
        <input className="wl-in" placeholder="Search actor, record or detail…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px", maxWidth: 360 }} aria-label="Search activity" />
      </div>
      <div className="wl-g wl-g-21">
        <Card title={rows.length + " events"} sub="Click an event to open the record it relates to.">
          <Grouped events={rows} />
        </Card>
        <div className="wl-stack">
          <Card title="Who did what">
            {Array.from(new Set(all.map((e) => e.actor))).slice(0, 9).map((a) => (
              <div key={a} className="wl-row click" onClick={() => setQ(a)} style={{ padding: "8px 6px" }}>
                <span style={{ flex: 1, fontSize: 12.5 }}>{a}</span>
                <span style={{ fontSize: 12, color: "var(--dim)" }}>{all.filter((e) => e.actor === a).length}</span>
              </div>
            ))}
          </Card>
          <Card title="About this log">
            <div className="wl-stack" style={{ gap: 8 }}>
              <Note>Timestamps are anchored to the demo week (9–16 Nov 2026), not the real clock.</Note>
              <Note>Simulated actions are marked "Demo action". Nothing was sent, synced, filed or paid.</Note>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Needs attention ──────────────────────────────────────────────────────── */
function Attention() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const ca = certAlerts(st);
  type Item = { id: string; title: string; detail: string; owner: string; due: string; sev: Tone; link: { page: string; tab: string } };
  const live: Item[] = [];
  if (st.ts1098 !== "approved") live.push({ id: "TS-1098", title: "TS-1098 · 8h awaiting Morrow sign-off", detail: eur(t.held) + " held from the Morrow invoice. Invoice-ready " + eur(t.ready) + " of " + eur(t.revenue) + ".", owner: "Elaine Walsh", due: "Tue 17 Nov", sev: "warn", link: { page: "Timesheets", tab: "approval" } });
  ca.held.forEach((w) => live.push({ id: "HOLD-" + w.id, title: w.name + " · not cleared for North Quay", detail: "Manual-handling record expired 14 Nov. North Quay site policy (demo).", owner: "Paul Walsh", due: "Mon 16 Nov", sev: "bad", link: { page: "Compliance", tab: "expiring" } }));
  live.push({ id: "INV-2026-103", title: "INV-2026-103 · Westbridge Civil · 31 days overdue", detail: "€7,760 · due 16 Oct. Reminder " + (st.reminder.status === "draft" ? "drafted, not submitted" : st.reminder.status === "pending_approval" ? "waiting for Paul" : "approved in demo (not sent)") + ".", owner: "Paul Walsh", due: "Mon 16 Nov", sev: "bad", link: { page: "Finance", tab: "debtors" } });
  ca.expiring.forEach((c) => live.push({ id: c.cert.id, title: (c.cert.workerId === "patrick-doyle" ? "Patrick Doyle · Safe Pass" : c.cert.workerId === "conor-oreilly" ? "Conor O'Reilly · Westbridge induction" : c.cert.workerId + " · " + c.cert.type) + " expires " + fmtISO(c.expires),
    detail: c.days + " days left. Still valid today." + (c.requested ? " Update requested " + c.requested + "." : ""), owner: "Elaine Walsh", due: fmtISO(c.expires), sev: "warn", link: { page: "Compliance", tab: "expiring" } }));
  if (requestStatus("REQ-204", st) === "waiting_paul") live.push({ id: "REQ-204", title: "REQ-204 · North Quay roster waiting for Paul", detail: "Castleview asked for next week's named roster (mock portal request).", owner: "Paul Walsh", due: "Tue 17 Nov", sev: "warn", link: { page: "Clients", tab: "requests" } });
  const flagged = activity(st).filter((e) => e.attention);
  return (
    <>
      <Head crumbs={CRUMB("Needs attention")} title="Needs attention" sub="Live exceptions worked out from the current demo state, plus every event that was flagged when it happened." />
      <div className="wl-g wl-g-4">
        <Kpi label="Open exceptions" value={live.length} tone={live.length ? "warn" : "ok"} />
        <Kpi label="Blocking site entry" value={ca.held.length} tone={ca.held.length ? "bad" : "ok"} onClick={() => navigate("Compliance", "overview")} />
        <Kpi label="Money held or overdue" value={eur(t.held + 7760)} sub={(t.held ? eur(t.held) + " held · " : "") + "€7,760 overdue"} onClick={() => navigate("Finance", "overview")} />
        <Kpi label="Flagged events" value={flagged.length} />
      </div>
      <Card flush title="Live exceptions" sub="These clear themselves when you resolve them anywhere in the demo.">
        <Table minWidth={860} onRow={(i) => navigate(i.link.page, i.link.tab)} cols={[
          { k: "s", label: "Severity", w: 100, render: (i) => <Badge tone={i.sev}>{i.sev === "bad" ? "Blocking" : "Pending"}</Badge> },
          { k: "t", label: "Exception", render: (i) => <div><div className="ink">{i.title}</div><div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{i.detail}</div></div> },
          { k: "o", label: "Owner", render: (i) => i.owner },
          { k: "d", label: "Due", render: (i) => i.due },
          { k: "go", label: "", render: () => <span style={{ color: "var(--accent)", fontSize: 12 }}>Resolve ›</span> },
        ]} rows={live} empty="No live exceptions. Everything in the demo story is resolved." />
      </Card>
      <Card title="Flagged when they happened" sub="Historical events marked for attention">
        <Grouped events={flagged} />
      </Card>
    </>
  );
}

/* ── Agent actions ────────────────────────────────────────────────────────── */
function AgentActions() {
  const st = useDemo();
  const [f, setF] = useState<"all" | "proposed" | "reviewed" | "completed">("all");
  const rows = AGENT_RUNS.map((r) => ({ r, s: runStatus(r.id, st) as string, agent: AGENTS.find((a) => a.id === r.agent)! }));
  const bucket = (s: string) => (s === "completed" ? "completed" : s === "proposed" ? "proposed" : "reviewed");
  const shown = rows.filter((x) => f === "all" || bucket(x.s) === f);
  const tone = (s: string): Tone => (s === "completed" ? "ok" : s === "approved" ? "ok" : s === "dismissed" ? "neutral" : "warn");
  const label = (s: string) => (s === "completed" ? "Completed" : s === "approved" ? "Reviewed · approved (demo)" : s === "dismissed" ? "Reviewed · dismissed" : "Proposed");
  return (
    <>
      <Head crumbs={CRUMB("Agent actions")} title="Agent actions" sub="What the seven agents did today. Suggestions stay proposed until a person reviews them; completed items are read-only work like briefings and drafts." />
      <div className="wl-g wl-g-4">
        <Kpi label="Runs today" value={rows.length} sub={AGENTS.length + " agents"} />
        <Kpi label="Proposed" value={rows.filter((x) => x.s === "proposed").length} tone="warn" onClick={() => setF("proposed")} />
        <Kpi label="Reviewed" value={rows.filter((x) => x.s === "approved" || x.s === "dismissed").length} onClick={() => setF("reviewed")} />
        <Kpi label="Completed" value={rows.filter((x) => x.s === "completed").length} tone="ok" onClick={() => setF("completed")} />
      </div>
      <Seg label="State" value={f} onChange={setF} options={[{ id: "all" as const, label: "All" }, { id: "proposed" as const, label: "Proposed" }, { id: "reviewed" as const, label: "Reviewed" }, { id: "completed" as const, label: "Completed" }]} />
      <Card flush title={shown.length + " agent actions"} sub="Financial actions, messages and holds always need explicit human approval.">
        <Table minWidth={980} cols={[
          { k: "t", label: "Time", w: 70, render: (x) => <span className="dim">{x.r.at.slice(-5)}</span> },
          { k: "a", label: "Agent", render: (x) => <button className="wl-link" onClick={() => openDrawer({ kind: "agent", id: x.agent.id })}>{x.agent.name}</button> },
          { k: "w", label: "Action", render: (x) => <div><div className="ink">{x.r.title}</div><div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{x.r.detail}</div></div> },
          { k: "k", label: "Type", render: (x) => <Badge tone={x.r.kind === "completed" ? "neutral" : "accent"}>{x.r.kind === "completed" ? "Completed work" : "Suggestion"}</Badge> },
          { k: "s", label: "State", render: (x) => <Badge tone={tone(x.s)}>{label(x.s)}</Badge> },
          { k: "d", label: "", render: (x) => (
            <span style={{ display: "inline-flex", gap: 6 }}>
              {x.s === "proposed" && x.r.needsApproval && <>
                <Btn small kind="primary" onClick={() => decideRun(x.r.id, "approved", x.r.title)}>Approve</Btn>
                <Btn small onClick={() => decideRun(x.r.id, "dismissed", x.r.title)}>Dismiss</Btn>
              </>}
              <Btn small kind="ghost" onClick={() => navigate(x.r.link.page, x.r.link.tab)}>Open</Btn>
            </span>
          ) },
        ]} rows={shown} empty="No agent actions in this state." />
      </Card>
      <Note>Approving a suggestion records the decision only. The underlying work (a hold, a reminder) still happens in its own module so nothing is applied silently.</Note>
    </>
  );
}

/* ── System events ────────────────────────────────────────────────────────── */
function System() {
  const st = useDemo();
  const events = activity(st).filter((e) => e.kind === "system");
  const timeline = [
    { at: "Fri 13 Nov 15:20", title: "Excel import preview (demo)", detail: "Westbridge timesheet template · 5 sheets, 208h incl. 1 duplicate row. Preview only; no live sync.", tone: "ok" as Tone, link: { page: "Records", tab: "imports" } },
    { at: "Mon 16 Nov 08:00", title: "Timesheet validation run (mock)", detail: "16 sheets counted, 1 duplicate row (TS-1097) excluded. €0 impact.", tone: "ok" as Tone, link: { page: "Timesheets", tab: "exceptions" } },
    { at: "Mon 16 Nov 08:15", title: "Invoice drafts generated (mock)", detail: "4 drafts built in the browser. Not issued, not posted to any accounting system.", tone: "ok" as Tone, link: { page: "Finance", tab: "invoices" } },
    { at: "Mon 16 Nov 09:31", title: "Base44 mapping reviewed (planned)", detail: "Legacy dashboards marked as migration candidate. Manual export planned; no connection.", tone: "warn" as Tone, link: { page: "Records", tab: "imports" } },
  ];
  return (
    <>
      <Head crumbs={CRUMB("System events")} title="System events" sub="Imports, mock automation runs and integration status. Only what actually happened in the demo is listed." />
      <div className="wl-g wl-g-4">
        <Kpi label="Live integrations" value={0} sub="Nothing is connected in the demo" />
        <Kpi label="Imports (preview)" value={1} sub="Excel · Fri 13 Nov" onClick={() => navigate("Records", "imports")} />
        <Kpi label="Planned migrations" value={1} sub="Base44 dashboards" tone="warn" />
        <Kpi label="Systems tracked" value={SYSTEMS.length} onClick={() => navigate("Settings", "systems")} />
      </div>
      <div className="wl-g wl-g-21">
        <Card title="System timeline" sub="Anchored to the demo week">
          {timeline.map((t) => (
            <div key={t.at + t.title} className="wl-row click" onClick={() => navigate(t.link.page, t.link.tab)} style={{ alignItems: "flex-start", padding: "11px 8px", gap: 14 }}>
              <span style={{ width: 118, flex: "none", fontSize: 12, color: "var(--faint)" }}>{t.at}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{t.detail}</div>
              </div>
              <Badge tone={t.tone}>{t.tone === "ok" ? "Simulated" : "Planned"}</Badge>
            </div>
          ))}
          {events.filter((e) => e.at.includes("demo")).map((e) => <EventRow key={e.id} e={e} />)}
        </Card>
        <Card title="What did not happen" sub="So nobody mistakes a demo for a live system">
          <div className="wl-stack" style={{ gap: 8 }}>
            <Note tone="bad">No Bank of Ireland or any other bank feed was synced.</Note>
            <Note tone="bad">No Revenue, ROS or eRCT submission was made or prepared for filing.</Note>
            <Note tone="bad">No email, SMS or WhatsApp message was sent to a worker or client.</Note>
            <Note tone="bad">No payment, payout or invoice was issued.</Note>
            <Note tone="bad">No file was uploaded to a document store; uploads stay in browser memory.</Note>
          </div>
        </Card>
      </div>
      <Card flush title="Integration status" sub="Honest statuses. No API health checks are shown because nothing is connected.">
        <Table minWidth={760} cols={[
          { k: "n", label: "System", render: (s) => <span className="ink">{s.name}</span> },
          { k: "s", label: "Status", render: (s) => <Badge tone={s.tone === "ok" ? "ok" : s.tone === "warn" ? "warn" : s.tone === "bad" ? "bad" : "neutral"}>{s.status}</Badge> },
          { k: "no", label: "Note", render: (s) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{s.note}</span> },
        ]} rows={SYSTEMS} />
      </Card>
      <div className="wl-g wl-g-3">
        <Stat k="Demo store" v="Browser memory" sub="Reset in the side rail restores the story" />
        <Stat k="Reporting anchor" v="Mon 16 Nov 2026" sub="Week 46 · 9–15 Nov" />
        <Stat k="Data provenance" v="Illustrative fixtures" sub="Only Paul, Elaine and the 17-worker headcount come from the calls" />
      </div>
    </>
  );
}

export default function ActivityModule({ tab }: { tab: string }) {
  return (
    <Page>
      {tab === "attention" ? <Attention /> : tab === "agents" ? <AgentActions /> : tab === "system" ? <System /> : <All />}
    </Page>
  );
}
