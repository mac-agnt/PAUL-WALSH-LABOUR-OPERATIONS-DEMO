/* Dashboard · Executive, Revenue & Margin, Forecast and Exceptions.
   The KPI band above is rendered by the shell; everything here reads selectors. */
import { useState, type ReactNode } from "react";
import { useDemo, navigate, openDrawer, type DemoState } from "../../demo/store";
import {
  eur, weeklyTotals, siteRows, accountRows, workerRows, receivables, forecastScenario, certAlerts, readiness, requestStatus, activity,
  workersAt, CLIENTS,
} from "../../demo/selectors";
import { FORECAST_DEFAULTS, type ForecastInputs } from "../../demo/store";
import { type ClientId } from "../../demo/walshData";
import { Page, Head, Card, Kpi, Table, Badge, Btn, Seg, Note, Stat, BarList, SplitBars, Go, type Tone } from "./ui";
import { ForecastBars } from "./FinanceModule";

/* ── exceptions: every live story, status derived from demo state ── */
type Sev = "High" | "Medium" | "Low" | "Info";
type Exc = { id: string; story: string; title: string; detail: string; owner: string; sev: Sev; due: string; status: string; resolved: boolean; value: number; link: { page: string; tab: string }; action: string };
const sevTone: Record<Sev, Tone> = { High: "bad", Medium: "warn", Low: "info", Info: "accent" };

function buildExceptions(st: DemoState): Exc[] {
  const ca = certAlerts(st);
  const seanHeld = ca.held.some((w) => w.id === "sean-murphy");
  const seanDoc = st.docs["sean-murphy:manual-handling"];
  const patDoc = st.docs["patrick-doyle:safe-pass"];
  const patExp = ca.expiring.some((c) => c.cert.workerId === "patrick-doyle" && c.cert.type === "safe-pass");
  const conExp = ca.expiring.some((c) => c.cert.workerId === "conor-oreilly");
  const conDoc = st.docs["conor-oreilly:ind-westbridge"];
  const req = requestStatus("REQ-204", st);
  const rem = st.reminder.status;
  return [
    { id: "A", story: "Story A", title: "TS-1098 · 8h awaiting Morrow sign-off", detail: "David Byrne, Ballymun, Fri 13 Nov. Holds €320 inside the week's €23,590.", owner: "Elaine Walsh", sev: "Medium", due: "Tue 17 Nov",
      status: st.ts1098 === "approved" ? "Resolved in demo" : st.ts1098 === "signoff_requested" ? "Sign-off requested" : "Open", resolved: st.ts1098 === "approved", value: 320,
      link: { page: "Timesheets", tab: "approval" }, action: "Open approval" },
    { id: "B", story: "Story B", title: "Sean Murphy not cleared for North Quay", detail: "Manual-handling record expired 14 Nov. North Quay site policy (demo) requires it.", owner: "Paul Walsh", sev: "High", due: "Mon 16 Nov",
      status: !seanHeld ? "Cleared in demo" : seanDoc?.status === "under_review" ? "Upload in review" : seanDoc?.status === "requested" ? "Document requested" : "Open", resolved: !seanHeld, value: 0,
      link: { page: "Compliance", tab: "expiring" }, action: "Resolve hold" },
    { id: "C", story: "Story C", title: "Patrick Doyle · Safe Pass expires 20 Nov", detail: "Valid today. Harbour Road. Renewal reminder drafted by Compliance Monitor.", owner: "Elaine Walsh", sev: "Medium", due: "Wed 18 Nov",
      status: !patExp ? "Renewed in demo" : patDoc?.status === "under_review" ? "Upload in review" : patDoc?.status === "requested" ? "Renewal requested" : "Open", resolved: !patExp, value: 0,
      link: { page: "Compliance", tab: "expiring" }, action: "Request renewal" },
    { id: "D", story: "Story D", title: "INV-2026-103 · €7,760 · 31 days overdue", detail: "Westbridge Civil, week 37. Separate from this week's €7,760 draft.", owner: "Paul Walsh", sev: "High", due: "Mon 16 Nov",
      status: rem === "draft" ? "Reminder drafted" : rem === "pending_approval" ? "Awaiting Paul's approval" : "Reminder approved (demo) · still unpaid", resolved: false, value: 7760,
      link: { page: "Finance", tab: "debtors" }, action: "Open reminder" },
    { id: "E", story: "Story E", title: "Growth · +2 contractors at €43 / €29", detail: "+320h, +€13,760 revenue, +€4,480 gross contribution over 4 weeks.", owner: "Paul Walsh", sev: "Info", due: "Fri 20 Nov",
      status: "Decision pending", resolved: false, value: 4480, link: { page: "Finance", tab: "forecast" }, action: "Open forecast" },
    { id: "F", story: "Story F", title: "REQ-204 · North Quay roster for Castleview", detail: "Mock portal request. Draft shows Mark Dunne covering Sean.", owner: "Paul Walsh", sev: "Medium", due: "Tue 17 Nov",
      status: req === "approved" ? "Approved in demo" : req === "declined" ? "Declined in demo" : "Waiting for Paul", resolved: req === "approved" || req === "declined", value: 0,
      link: { page: "Clients", tab: "requests" }, action: "Decide" },
    { id: "G", story: "Watch", title: "Conor O'Reilly · Westbridge induction due 2 Dec", detail: "Valid today, inside 30 days. Covers Harbour Road.", owner: "Elaine Walsh", sev: "Low", due: "Mon 23 Nov",
      status: !conExp ? "Renewed in demo" : conDoc?.status === "requested" ? "Reminder sent (demo)" : "Open", resolved: !conExp, value: 0,
      link: { page: "Compliance", tab: "expiring" }, action: "Open" },
  ];
}

/* ── small local visuals ── */
function Waterfall({ rate, cost }: { rate: number; cost: number }) {
  const contribution = rate - cost;
  const top = Math.ceil((Math.max(rate, 1) + 4) / 10) * 10;
  const H = 180;
  const ticks = Array.from({ length: top / 10 + 1 }, (_, i) => i * 10);
  const bars = [
    { label: "Client rate", from: 0, to: rate, color: "var(--dim)", v: "€" + rate.toFixed(2) },
    { label: "Contractor cost", from: contribution, to: rate, color: "var(--series-a)", v: "−€" + cost.toFixed(2) },
    { label: "Contribution", from: 0, to: contribution, color: "var(--series-b)", v: "€" + contribution.toFixed(2) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: 8 }}>
      <div style={{ position: "relative", height: H }}>
        {ticks.map((t) => <span key={t} style={{ position: "absolute", right: 0, bottom: (t / top) * H - 6, fontSize: 10, color: "var(--faint)" }}>€{t}</span>)}
      </div>
      <div style={{ position: "relative", height: H }}>
        {ticks.map((t) => <span key={t} style={{ position: "absolute", left: 0, right: 0, bottom: (t / top) * H, height: 1, background: t ? "var(--border)" : "var(--border-strong)" }} />)}
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {bars.map((b) => (
            <div key={b.label} style={{ position: "relative" }} title={b.label + " " + b.v + " per hour"}>
              <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: "min(54px,46%)", bottom: (b.from / top) * H, height: Math.max(2, ((b.to - b.from) / top) * H), background: b.color, borderRadius: 4 }} />
              <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", bottom: (b.to / top) * H + 4, fontSize: 11.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{b.v}</span>
            </div>
          ))}
        </div>
      </div>
      <span />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        {bars.map((b) => <div key={b.label} style={{ textAlign: "center", fontSize: 11.5, color: "var(--dim)", paddingTop: 6 }}>{b.label}</div>)}
      </div>
    </div>
  );
}

/* ── Executive ── */
function Executive() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const r = receivables();
  const accts = accountRows(st);
  const ex = buildExceptions(st).filter((e) => !e.resolved);
  const events = activity(st).slice(0, 7);
  const util = t.rows.map((x) => ({ ...x, cap: x.workers * 40, pct: x.workers ? (x.hours / (x.workers * 40)) * 100 : 0 }));
  const ca = certAlerts(st);
  const matrix = t.rows.map((x) => {
    const crew = workersAt(x.site.id);
    const held = crew.filter((w) => readiness(w, st).state === "held").length;
    const expiring = ca.expiring.filter((c) => crew.some((w) => w.id === c.cert.workerId)).length;
    return { row: x, crew: crew.length, cleared: crew.length - held, held, expiring };
  });
  return (
    <Page>
      <Head title="Executive" crumbs={[{ label: "Dashboard" }, { label: "Executive" }]}
        sub="Week 46 (9–15 Nov 2026) at a glance: where the money is made, what is owed, who is cleared and what needs a decision." />
      <div className="wl-g wl-g-21 stretch">
        <Card title="Revenue vs gross contribution by site" sub={"Week 46 · " + eur(t.revenue) + " billing · " + eur(t.cost) + " contractor cost · " + eur(t.contribution) + " contribution (" + t.margin.toFixed(2) + "%)"}
          right={<Go page="Dashboard" tab="margin">Margin detail</Go>}>
          <SplitBars max={Math.max(...t.rows.map((x) => x.revenue))} fmt={(n) => eur(n)} rows={t.rows.map((x) => ({
            label: x.site.name, sub: x.client.name + " · " + x.hours + "h · " + x.margin.toFixed(1) + "%", cost: x.cost, contribution: x.contribution,
            onClick: () => openDrawer({ kind: "site", id: x.site.id }),
          }))} />
        </Card>
        <Card title="Receivables" sub="Issued invoices at Mon 16 Nov" right={<Go page="Finance" tab="debtors">Debtors</Go>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Kpi label="Overdue" value={eur(r.overdue)} tone="bad" sub="INV-2026-103 · Westbridge · 31 days" onClick={() => openDrawer({ kind: "invoice", id: "INV-2026-103" })} />
            <div className="wl-g wl-g-2">
              <Stat k="Open, not due" v={eur(r.notDue)} sub="Weeks 42–45" />
              <Stat k="Week 46 drafts" v={eur(t.ready)} sub="Not issued" />
            </div>
            <Note tone={st.reminder.status === "approved_demo" ? "ok" : "warn"}>Reminder: {st.reminder.status === "draft" ? "drafted, not yet submitted" : st.reminder.status === "pending_approval" ? "waiting for Paul's approval" : "approved in demo, nothing sent"}.</Note>
          </div>
        </Card>
      </div>
      <div className="wl-g wl-g-3 stretch">
        <Card title="Site utilisation" sub="Submitted hours vs 40h per allocated worker">
          <BarList fmt={(n) => n.toFixed(0) + "%"} max={100} axis={[0, 50, 100]} items={util.map((x) => ({
            label: x.site.name, sub: x.hours + "h of " + x.cap + "h", value: Math.min(100, x.pct), tone: "var(--series-a)",
            title: x.site.name + " · " + x.pct.toFixed(1) + "%", onClick: () => openDrawer({ kind: "site", id: x.site.id }),
          }))} />
        </Card>
        <Card title="Site readiness" sub="Allocated crew by clearance today" flush>
          <Table minWidth={320} onRow={(m) => navigate("Compliance", "site")} cols={[
            { k: "s", label: "Site", render: (m) => <span className="ink">{m.row.site.name.split(" ").slice(0, 2).join(" ")}</span> },
            { k: "c", label: "Crew", num: true, render: (m) => m.crew },
            { k: "ok", label: "Cleared", num: true, render: (m) => <Badge tone="ok">{m.cleared}</Badge> },
            { k: "h", label: "Held", num: true, render: (m) => m.held ? <Badge tone="bad">{m.held}</Badge> : <span className="dim">0</span> },
            { k: "e", label: "≤30d", num: true, render: (m) => m.expiring ? <Badge tone="warn">{m.expiring}</Badge> : <span className="dim">0</span> },
          ]} rows={matrix} foot={["All sites", String(matrix.reduce((a, m) => a + m.crew, 0)), String(matrix.reduce((a, m) => a + m.cleared, 0)), String(matrix.reduce((a, m) => a + m.held, 0)), String(matrix.reduce((a, m) => a + m.expiring, 0))]} />
        </Card>
        <Card title="Account billing · wk 46" sub="Potential per client, EUR">
          <BarList fmt={(n) => eur(n)} max={9000} axis={[0, 3000, 6000, 9000]} items={accts.map((a) => ({
            label: a.client.name, sub: a.sites.length + " site" + (a.sites.length > 1 ? "s" : "") + " · " + a.crew + " crew" + (a.held ? " · " + eur(a.held) + " held" : ""),
            value: a.potential, onClick: () => openDrawer({ kind: "client", id: a.client.id }),
          }))} />
        </Card>
      </div>
      <div className="wl-g wl-g-21 stretch">
        <Card title="Exceptions queue" sub={ex.length + " open · ranked by severity"} right={<Go page="Dashboard" tab="exceptions">All exceptions</Go>}>
          {ex.slice().sort((a, b) => ["High", "Medium", "Info", "Low"].indexOf(a.sev) - ["High", "Medium", "Info", "Low"].indexOf(b.sev)).map((e) => (
            <div key={e.id} className="wl-row click" onClick={() => navigate(e.link.page, e.link.tab)} style={{ padding: "10px 6px", alignItems: "flex-start" }}>
              <Badge tone={sevTone[e.sev]}>{e.sev}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>{e.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{e.owner} · due {e.due} · {e.status}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}>{e.action} ›</span>
            </div>
          ))}
        </Card>
        <Card title="Recent events" sub="Anchored to the demo week" right={<Go page="Activity" tab="all">Activity</Go>}>
          {events.map((e) => (
            <div key={e.id} className={e.link ? "wl-row click" : "wl-row"} onClick={e.link ? () => navigate(e.link!.page, e.link!.tab) : undefined} style={{ padding: "9px 6px", alignItems: "flex-start" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, marginTop: 6, flex: "none", background: e.attention ? "var(--warn)" : e.kind === "agent" ? "var(--accent)" : "var(--faint)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--body)" }}><span style={{ color: "var(--ink)" }}>{e.actor}</span> · {e.title}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{e.at}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Page>
  );
}

/* ── Revenue & Margin ── */
type View = "site" | "client" | "worker";
type MRow = { key: string; label: string; sub: string; hours: number; revenue: number; cost: number; open: () => void };

function Margin() {
  const st = useDemo();
  const [view, setView] = useState<View>("site");
  const [client, setClient] = useState<"all" | ClientId>("all");
  const sites = siteRows(st).filter((x) => client === "all" || x.site.clientId === client);
  let rows: MRow[];
  if (view === "site") rows = sites.map((x) => ({ key: x.site.id, label: x.site.name, sub: x.client.name + " · €" + x.site.billRate + " / €" + x.site.costRate, hours: x.hours, revenue: x.revenue, cost: x.cost, open: () => openDrawer({ kind: "site", id: x.site.id }) }));
  else if (view === "client") rows = CLIENTS.filter((c) => client === "all" || c.id === client).map((c) => {
    const s = sites.filter((x) => x.site.clientId === c.id);
    return { key: c.id, label: c.name, sub: s.length + " site" + (s.length > 1 ? "s" : ""), hours: s.reduce((a, x) => a + x.hours, 0), revenue: s.reduce((a, x) => a + x.revenue, 0), cost: s.reduce((a, x) => a + x.cost, 0), open: () => openDrawer({ kind: "client", id: c.id }) };
  });
  else rows = workerRows(st).filter((w) => w.hours > 0 && w.site && (client === "all" || w.site.clientId === client)).map((w) => ({ key: w.w.id, label: w.w.name, sub: w.site!.name + " · €" + w.site!.billRate + " / €" + w.w.costRate, hours: w.hours, revenue: w.revenue, cost: w.cost, open: () => openDrawer({ kind: "worker", id: w.w.id }) }));
  rows = rows.slice().sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost));
  const H = rows.reduce((a, x) => a + x.hours, 0), R = rows.reduce((a, x) => a + x.revenue, 0), C = rows.reduce((a, x) => a + x.cost, 0);
  const maxRev = Math.max(...rows.map((x) => x.revenue), 1);
  return (
    <Page>
      <Head title="Revenue & Margin" crumbs={[{ label: "Dashboard", page: "Dashboard", tab: "executive" }, { label: "Revenue & Margin" }]}
        sub="Gross contribution is client billing minus contractor cost, before overhead, VAT and tax. Not net profit."
        right={<select className="wl-in" defaultValue="w46" aria-label="Week"><option value="w46">Wk 46 · 9–15 Nov</option></select>} />
      <div className="wl-g wl-g-6">
        <Kpi label="Billing" value={eur(R)} sub={H + "h"} />
        <Kpi label="Contractor cost" value={eur(C)} sub={H ? "€" + (C / H).toFixed(2) + "/h" : "n/a"} onClick={() => navigate("Finance", "costs")} />
        <Kpi label="Gross contribution" value={eur(R - C)} sub="Before overhead" />
        <Kpi label="Margin" value={R ? ((R - C) / R * 100).toFixed(2) + "%" : "n/a"} sub={client === "all" ? "All clients" : CLIENTS.find((c) => c.id === client)!.name} />
        <Kpi label="Contribution per hour" value={H ? "€" + ((R - C) / H).toFixed(2) : "n/a"} sub={H ? "Billing €" + (R / H).toFixed(2) + "/h" : ""} />
        <Kpi label="Thinnest" value={rows.length ? rows.slice().sort((a, b) => (a.revenue - a.cost) / a.revenue - (b.revenue - b.cost) / b.revenue)[0].label.split(" ")[0] : "n/a"} tone="warn"
          sub={rows.length ? (Math.min(...rows.map((x) => (x.revenue - x.cost) / x.revenue)) * 100).toFixed(1) + "% margin" : ""} />
      </div>
      <Card title="Filters">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Seg label="Group by" value={view} onChange={setView} options={[{ id: "site", label: "By site" }, { id: "client", label: "By client" }, { id: "worker", label: "By worker" }]} />
          <Seg label="Client" value={client} onChange={setClient} options={[{ id: "all", label: "All clients" }, ...CLIENTS.map((c) => ({ id: c.id, label: c.short }))]} />
        </div>
      </Card>
      <div className="wl-g wl-g-21 stretch">
        <Card title={"Contribution " + (view === "site" ? "by site" : view === "client" ? "by client" : "by worker")} sub="Bar = client billing (€), split into contractor cost and gross contribution">
          <div style={view === "worker" ? { maxHeight: 520, overflowY: "auto" } : undefined}>
            <SplitBars max={maxRev} fmt={(n) => eur(n)} rows={rows.map((x) => ({ label: x.label, sub: x.sub, cost: x.cost, contribution: x.revenue - x.cost, onClick: x.open }))} />
          </div>
        </Card>
        <Card title="Rate waterfall" sub={"Per billed hour, blended across " + (client === "all" ? "all sites" : "this client") + " · EUR"}>
          <Waterfall rate={H ? R / H : 0} cost={H ? C / H : 0} />
          <Table minWidth={300} cols={[
            { k: "s", label: "Site", render: (x: (typeof sites)[number]) => <span className="ink">{x.site.name.split(" ").slice(0, 2).join(" ")}</span> },
            { k: "r", label: "Rate", num: true, render: (x) => "€" + x.site.billRate },
            { k: "c", label: "Cost", num: true, render: (x) => "€" + x.site.costRate },
            { k: "m", label: "Per hour", num: true, render: (x) => <span className="ink">€{x.site.billRate - x.site.costRate}</span> },
          ]} rows={sites} />
        </Card>
      </div>
      <Card title="Contribution table" sub="Week 46 · sorted by gross contribution" flush>
        <Table minWidth={720} maxHeight={view === "worker" ? 480 : undefined} onRow={(x) => x.open()} cols={[
          { k: "l", label: view === "site" ? "Site" : view === "client" ? "Client" : "Worker", render: (x) => <span className="ink">{x.label}</span> },
          { k: "s", label: "Detail", hideSm: true, render: (x) => <span className="dim">{x.sub}</span> },
          { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
          { k: "r", label: "Billing", num: true, render: (x) => eur(x.revenue) },
          { k: "c", label: "Cost", num: true, render: (x) => eur(x.cost) },
          { k: "g", label: "Contribution", num: true, render: (x) => <span className="ink">{eur(x.revenue - x.cost)}</span> },
          { k: "m", label: "Margin", num: true, render: (x) => ((x.revenue - x.cost) / x.revenue * 100).toFixed(1) + "%" },
        ]} rows={rows} foot={["Total", "", H + "h", eur(R), eur(C), eur(R - C), R ? ((R - C) / R * 100).toFixed(2) + "%" : ""]} />
      </Card>
    </Page>
  );
}

/* ── Forecast ── */
function ForecastTab() {
  const st = useDemo();
  const fi = st.forecast;
  const f = forecastScenario(fi);
  const pk = 1 + fi.priceChange / 100;
  const heads = [1, 2, 3, 4];
  const rates = [41, 42, 43, 44, 45];
  const inc = (n: number, rate: number) => n * fi.hoursPerWorker * fi.weeks * (fi.utilisation / 100) * (rate * pk - fi.costRate);
  const crewSteps = [-1, 0, 1, 2, 3];
  const changed = (Object.keys(FORECAST_DEFAULTS) as (keyof ForecastInputs)[]).filter((k) => FORECAST_DEFAULTS[k] !== fi[k]);
  const assumptions: { k: keyof ForecastInputs; label: string; v: string }[] = [
    { k: "addWorkers", label: "Added contractors", v: String(fi.addWorkers) },
    { k: "hoursPerWorker", label: "Hours per worker per week", v: fi.hoursPerWorker + "h" },
    { k: "weeks", label: "Horizon", v: fi.weeks + " weeks" },
    { k: "billRate", label: "Client rate (added)", v: "€" + fi.billRate + "/h" },
    { k: "costRate", label: "Contractor cost (added)", v: "€" + fi.costRate + "/h" },
    { k: "utilisation", label: "Utilisation", v: fi.utilisation + "%" },
    { k: "priceChange", label: "Price change, all clients", v: fi.priceChange + "%" },
    { k: "crewCostChange", label: "Existing crew rate change", v: "€" + fi.crewCostChange + "/h" },
  ];
  return (
    <Page>
      <Head title="Forecast" crumbs={[{ label: "Dashboard", page: "Dashboard", tab: "executive" }, { label: "Forecast" }]}
        sub={fi.weeks + "-week view: the current weekly mix repeated, against the same with the scenario added. Hypothetical, nothing booked."}
        right={<Btn kind="primary" onClick={() => navigate("Finance", "forecast")}>Edit in Finance › Forecast</Btn>} />
      <div className="wl-g wl-g-4">
        <Kpi label={"Current mix · " + fi.weeks + " wks"} value={eur(f.baseline.contribution)} sub={eur(f.baseline.revenue) + " revenue"} />
        <Kpi label="With scenario" value={eur(f.scenario.contribution)} sub={eur(f.scenario.revenue) + " revenue"} />
        <Kpi label="Difference" value={(f.add.contribution >= 0 ? "+" : "") + eur(f.add.contribution)} tone={f.add.contribution >= 0 ? "ok" : "bad"} sub={"+" + Math.round(f.add.hours) + "h · +" + eur(f.add.revenue) + " revenue"} />
        <Kpi label="Blended margin" value={f.scenario.margin.toFixed(2) + "%"} sub={"from " + f.baseline.margin.toFixed(2) + "%"} />
      </div>
      <div className="wl-g wl-g-21 stretch">
        <Card title="Baseline vs scenario" sub={fi.weeks + " weeks · gross contribution before overhead, VAT and tax"}>
          <ForecastBars labels={["Current mix", "With scenario"]} groups={[
            { label: "Revenue", a: f.baseline.revenue, b: f.scenario.revenue },
            { label: "Contractor cost", a: f.baseline.cost, b: f.scenario.cost },
            { label: "Gross contribution", a: f.baseline.contribution, b: f.scenario.contribution },
          ]} />
        </Card>
        <Card title="Assumptions" sub={changed.length ? changed.length + " changed from the default (highlighted)" : "Default scenario"}>
          {assumptions.map((a) => (
            <div key={a.k} className="wl-row" style={{ padding: "8px 6px", borderRadius: 8, background: changed.includes(a.k) ? "var(--accent-faint)" : undefined }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--body)" }}>{a.label}</span>
              <span style={{ fontSize: 12.5, color: changed.includes(a.k) ? "var(--accent)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{a.v}</span>
            </div>
          ))}
          <div style={{ marginTop: 10 }}><Note>Assumes the work exists to place them and client rates hold. Margin Analyst ran this at 09:00 (demo).</Note></div>
        </Card>
      </div>
      <div className="wl-g wl-g-32 stretch">
        <Card title="Sensitivity · added contribution" sub={"Headcount × client rate, " + fi.weeks + " weeks at " + fi.hoursPerWorker + "h, €" + fi.costRate + "/h cost, " + fi.utilisation + "% utilisation. Highlight = current inputs."} flush>
          <Table minWidth={520} cols={[
            { k: "n", label: "Added", render: (n: number) => <span className="ink">+{n} contractor{n > 1 ? "s" : ""}</span> },
            ...rates.map((rt) => ({ k: "r" + rt, label: "€" + rt + "/h", num: true, render: (n: number) => {
              const on = n === fi.addWorkers && rt === fi.billRate;
              const v = inc(n, rt);
              return <span style={on ? { padding: "3px 8px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--ink)", fontWeight: 600 } : { color: v < 0 ? "var(--bad)" : "var(--body)" }}>{eur(v)}</span>;
            } })),
          ]} rows={heads} />
        </Card>
        <Card title="Existing crew rate sensitivity" sub="Weekly contribution on the current 590h, client rates unchanged" flush>
          <Table minWidth={320} cols={[
            { k: "c", label: "Crew rate change", render: (c: number) => <span className="ink">{c > 0 ? "+" : c < 0 ? "−" : ""}€{Math.abs(c)}/h</span> },
            { k: "x", label: "Extra cost / wk", num: true, render: (c: number) => eur(c * 590) },
            { k: "w", label: "Contribution / wk", num: true, render: (c: number) => {
              const v = 23590 * pk - (17100 + c * 590);
              return <span style={c === fi.crewCostChange ? { padding: "3px 8px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--ink)", fontWeight: 600 } : undefined}>{eur(v)}</span>;
            } },
          ]} rows={crewSteps} />
          <div style={{ padding: "10px 18px 16px" }}><Note>+€2/h across 590h adds €1,180 a week: €6,490 becomes €5,310 if client rates and hours hold.</Note></div>
        </Card>
      </div>
    </Page>
  );
}

/* ── Exceptions ── */
type SevFilter = "open" | "high" | "medium" | "low" | "resolved";
function Exceptions() {
  const st = useDemo();
  const all = buildExceptions(st);
  const [flt, setFlt] = useState<SevFilter>("open");
  const rows = all.filter((e) => flt === "resolved" ? e.resolved : !e.resolved && (flt === "open" || (flt === "high" && e.sev === "High") || (flt === "medium" && e.sev === "Medium") || (flt === "low" && (e.sev === "Low" || e.sev === "Info"))));
  const open = all.filter((e) => !e.resolved);
  const atStake = open.filter((e) => e.id === "A" || e.id === "D").reduce((a, e) => a + e.value, 0);
  const owners = ["Paul Walsh", "Elaine Walsh"].map((o) => ({ o, n: open.filter((e) => e.owner === o).length }));
  return (
    <Page>
      <Head title="Exceptions" crumbs={[{ label: "Dashboard", page: "Dashboard", tab: "executive" }, { label: "Exceptions" }]}
        sub="Everything that needs a person, with an owner, a due date and the screen that resolves it. Status follows the demo actions." />
      <div className="wl-g wl-g-4">
        <Kpi label="Open" value={open.length} tone={open.length ? "warn" : "ok"} sub={all.length + " tracked this week"} />
        <Kpi label="High severity" value={open.filter((e) => e.sev === "High").length} tone="bad" sub="Sean's hold · INV-2026-103" />
        <Kpi label="Money at stake" value={eur(atStake)} sub="Held hours + overdue invoice" />
        <Kpi label="Resolved in demo" value={all.filter((e) => e.resolved).length} tone="ok" sub="Reset restores the story" />
      </div>
      <div className="wl-g wl-g-32 stretch">
        <Card title="Exception register" right={<Seg label="Severity" value={flt} onChange={setFlt} options={[
          { id: "open", label: "Open", count: open.length }, { id: "high", label: "High" }, { id: "medium", label: "Medium" }, { id: "low", label: "Low & info" }, { id: "resolved", label: "Resolved", count: all.filter((e) => e.resolved).length }]} />} flush>
          <Table minWidth={820} onRow={(e) => navigate(e.link.page, e.link.tab)} cols={[
            { k: "s", label: "Story", render: (e) => <span className="dim">{e.story}</span> },
            { k: "t", label: "Exception", render: (e) => <div><div className="ink">{e.title}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{e.detail}</div></div> },
            { k: "o", label: "Owner", render: (e) => e.owner },
            { k: "v", label: "Severity", render: (e) => <Badge tone={sevTone[e.sev]}>{e.sev}</Badge> },
            { k: "d", label: "Due", render: (e) => e.due },
            { k: "st", label: "Status", render: (e) => <Badge tone={e.resolved ? "ok" : "info"}>{e.status}</Badge> },
            { k: "a", label: "", render: (e) => <Btn small onClick={() => navigate(e.link.page, e.link.tab)}>{e.action}</Btn> },
          ]} rows={rows} empty="Nothing in this view." />
        </Card>
        <Card title="By owner" sub="Open items">
          {owners.map((x) => (
            <div key={x.o} className="wl-row" style={{ padding: "10px 4px" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{x.o}</span><Badge tone={x.n ? "warn" : "ok"}>{x.n} open</Badge>
            </div>
          ))}
          <div className="wl-g wl-g-2" style={{ marginTop: 12 }}>
            <Stat k="Next due" v="Mon 16 Nov" sub="Sean's hold · Westbridge reminder" />
            <Stat k="Agent-raised" v="5 of 7" sub="Compliance, Ops, Collections, Invoice, Margin" />
          </div>
          <div style={{ marginTop: 12 }}><Note>Financial and compliance actions always wait for a person. Agents propose; Paul or Elaine decides.</Note></div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}><Btn small onClick={() => navigate("Work", "approvals")}>Work › Approvals</Btn><Btn small kind="ghost" onClick={() => navigate("Agents", "review")}>Agent review queue</Btn></div>
        </Card>
      </div>
    </Page>
  );
}

export default function DashboardModule({ tab }: { tab: string }) {
  let body: ReactNode;
  switch (tab) {
    case "margin": body = <Margin />; break;
    case "forecast": body = <ForecastTab />; break;
    case "exceptions": body = <Exceptions />; break;
    default: body = <Executive />;
  }
  return body;
}
