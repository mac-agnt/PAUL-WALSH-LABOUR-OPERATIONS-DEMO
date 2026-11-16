/* Finance · labour-hire money view. Not a general ledger: billing, contractor
   cost, gross contribution, receivables and forecasts, all before overhead, VAT and tax. */
import { useState, type ReactNode } from "react";
import { useDemo, navigate, openDrawer, toast, logActivity } from "../../demo/store";
import {
  eur, weeklyTotals, invoiceBatches, workerRows, receivables, forecastScenario, accountRows, tsStatus, workerById, siteById, clientById,
  SITES, INVOICES, TIMESHEETS,
} from "../../demo/selectors";
import { type ClientId, type Invoice, type SiteId } from "../../demo/walshData";
import { FORECAST_DEFAULTS, type ForecastInputs } from "../../demo/store";
import {
  setForecast, resetForecast, saveForecastNote, setReminderText, submitReminder, approveReminder, resetReminder,
} from "../../demo/actions";
import { Page, Head, Card, Kpi, Table, Badge, Btn, Seg, Note, Stat, Field, Go, BarList, SplitBars, Avatar, type Tone } from "./ui";

/* ── local helpers ── */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ANCHOR = new Date(2026, 10, 16);
export const parseD = (s: string) => { const [d, m, y] = s.split(" "); return new Date(Number(y), MONTHS.indexOf(m), Number(d)); };
const daysTo = (s: string) => Math.round((parseD(s).getTime() - ANCHOR.getTime()) / 86400000);

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function niceScale(max: number) {
  const raw = Math.max(1, max) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || 10 * p;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v);
  return { top, ticks };
}

const kEur = (n: number) => n >= 1000 ? "€" + (n / 1000).toLocaleString("en-IE", { maximumFractionDigits: 1 }) + "k" : eur(n);

/** Grouped vertical bars: Current vs Scenario per measure, shared € axis with gridlines. */
export function ForecastBars({ groups, labels, height = 210 }: { groups: { label: string; a: number; b: number }[]; labels: [string, string]; height?: number }) {
  const { top, ticks } = niceScale(Math.max(...groups.flatMap((g) => [g.a, g.b])));
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--dim)", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--series-a)" }} />{labels[0]}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--series-b)" }} />{labels[1]}</span>
        <span style={{ marginLeft: "auto", color: "var(--faint)" }}>EUR · before overhead, VAT and tax</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: 8 }}>
        <div style={{ position: "relative", height }}>
          {ticks.map((t) => <span key={t} style={{ position: "absolute", right: 0, bottom: (t / top) * height - 6, fontSize: 10, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>{kEur(t)}</span>)}
        </div>
        <div style={{ position: "relative", height }}>
          {ticks.map((t) => <span key={t} style={{ position: "absolute", left: 0, right: 0, bottom: (t / top) * height, height: 1, background: t === 0 ? "var(--border-strong)" : "var(--border)" }} />)}
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${groups.length},minmax(0,1fr))` }}>
            {groups.map((g) => (
              <div key={g.label} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
                <span title={`${g.label} · ${labels[0]} ${eur(g.a)}`} style={{ width: "min(34px,28%)", height: Math.max(2, (g.a / top) * height), background: "var(--series-a)", borderRadius: "4px 4px 0 0", transition: "height .35s var(--ease)" }} />
                <span title={`${g.label} · ${labels[1]} ${eur(g.b)}`} style={{ width: "min(34px,28%)", height: Math.max(2, (g.b / top) * height), background: "var(--series-b)", borderRadius: "4px 4px 0 0", transition: "height .35s var(--ease)" }} />
              </div>
            ))}
          </div>
        </div>
        <span />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${groups.length},minmax(0,1fr))` }}>
          {groups.map((g) => <div key={g.label} style={{ textAlign: "center", fontSize: 11.5, color: "var(--dim)", paddingTop: 6 }}>{g.label}</div>)}
        </div>
      </div>
    </div>
  );
}

const invTone = (i: Invoice): Tone => i.status === "overdue" ? "bad" : i.status === "open" ? "info" : "ok";
const invLabel = (i: Invoice) => i.status === "overdue" ? Math.abs(daysTo(i.due)) + " days overdue" : i.status === "open" ? "Due in " + daysTo(i.due) + " days" : "Paid " + i.paidOn;

/* ── Overview ── */
function Overview() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const r = receivables();
  const f = forecastScenario(st.forecast);
  const accts = accountRows(st);
  const open = INVOICES.filter((i) => i.status !== "paid");
  const age = [
    { label: "Overdue · 31+ days", value: open.filter((i) => i.status === "overdue").reduce((a, i) => a + i.amount, 0), tone: "var(--bad)", sub: "INV-2026-103 · Westbridge" },
    { label: "Due in 0–7 days", value: open.filter((i) => i.status === "open" && daysTo(i.due) <= 7).reduce((a, i) => a + i.amount, 0), tone: "var(--series-a)", sub: open.filter((i) => i.status === "open" && daysTo(i.due) <= 7).length + " invoices" },
    { label: "Due in 8–30 days", value: open.filter((i) => i.status === "open" && daysTo(i.due) > 7).reduce((a, i) => a + i.amount, 0), tone: "var(--series-a)", sub: open.filter((i) => i.status === "open" && daysTo(i.due) > 7).length + " invoices" },
  ];
  const exportWeek = () => {
    const rows: (string | number)[][] = [["Site", "Client", "Hours", "Client rate EUR", "Contractor rate EUR", "Billing EUR", "Contractor cost EUR", "Gross contribution EUR", "Invoice-ready EUR", "Held EUR"]];
    t.rows.forEach((x) => rows.push([x.site.name, x.client.name, x.hours, x.site.billRate, x.site.costRate, x.revenue, x.cost, x.contribution, x.ready, x.held]));
    rows.push(["Total", "", t.submitted, "", "", t.revenue, t.cost, t.contribution, t.ready, t.held]);
    rows.push(["Demo data, illustrative. Before overhead, VAT and tax.", "", "", "", "", "", "", "", "", ""]);
    downloadCsv("walsh-week46-accountant-summary-DEMO.csv", rows);
    logActivity({ kind: "system", actor: "Accountant export (demo)", title: "Downloaded week 46 summary for the accountant", detail: "Spreadsheet handoff, mock CSV. Nothing sent.", link: { page: "Finance", tab: "overview" } });
    toast("Mock CSV downloaded · nothing sent to the accountant");
  };
  const exportAr = () => {
    const rows: (string | number)[][] = [["Invoice", "Client", "Period", "Issued", "Due", "Amount EUR", "Status"]];
    INVOICES.filter((i) => i.status !== "paid").forEach((i) => rows.push([i.id, clientById(i.clientId).name, i.period, i.issued, i.due, i.amount, invLabel(i)]));
    downloadCsv("walsh-open-receivables-DEMO.csv", rows);
    toast("Mock CSV downloaded · demo data");
  };
  const money: { k: string; v: string; d: string; tone: Tone; go: () => void }[] = [
    { k: "Earned · wk 46 work done", v: eur(t.revenue), d: t.submitted + "h worked. " + eur(t.ready) + " client-signed, " + eur(t.held) + " awaiting signature.", tone: "ok", go: () => navigate("Timesheets", "overview") },
    { k: "Draft · not issued", v: eur(t.ready), d: "4 draft invoices for week 46. Not revenue received.", tone: "info", go: () => navigate("Finance", "invoices") },
    { k: "Outstanding · issued, unpaid", v: eur(r.open), d: eur(r.overdue) + " overdue, " + eur(r.notDue) + " not yet due.", tone: r.overdue ? "warn" : "ok", go: () => navigate("Finance", "debtors") },
    { k: "Hypothetical · forecast", v: "+" + eur(f.add.revenue), d: "+" + eur(f.add.contribution) + " contribution over " + st.forecast.weeks + " weeks if " + st.forecast.addWorkers + " more are placed. Not booked.", tone: "accent", go: () => navigate("Finance", "forecast") },
  ];
  return (
    <Page>
      <Head title="Finance" crumbs={[{ label: "Finance" }, { label: "Overview" }]}
        sub="Billing, contractor cost and gross contribution for the reporting week, plus what clients owe. Figures are before overhead, VAT and tax." />
      <div className="wl-g wl-g-6">
        <Kpi label="Weekly potential billings" value={eur(t.revenue)} sub={t.submitted + "h × site rates"} onClick={() => navigate("Dashboard", "margin")} />
        <Kpi label="Invoice-ready" value={eur(t.ready)} tone="ok" sub="Signed hours, 4 drafts" onClick={() => navigate("Finance", "invoices")} />
        <Kpi label="Held" value={eur(t.held)} tone={t.held ? "warn" : "ok"} sub={t.held ? "TS-1098 · client sign-off" : "Nothing held"} onClick={() => navigate("Timesheets", "approval")} />
        <Kpi label="Overdue" value={eur(r.overdue)} tone="bad" sub="INV-2026-103 · 31 days" onClick={() => navigate("Finance", "debtors")} />
        <Kpi label="Contractor cost" value={eur(t.cost)} sub="Not payroll" onClick={() => navigate("Finance", "costs")} />
        <Kpi label="Gross contribution" value={eur(t.contribution)} sub={t.margin.toFixed(2) + "% · before overhead"} onClick={() => navigate("Dashboard", "margin")} />
      </div>
      <div className="wl-g wl-g-4 stretch">
        {money.map((m) => (
          <button key={m.k} className="wl-kpi" onClick={m.go} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Badge tone={m.tone}>{m.k}</Badge>
            <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.5px", color: "var(--ink)" }}>{m.v}</span>
            <span style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.45 }}>{m.d}</span>
          </button>
        ))}
      </div>
      <div className="wl-g wl-g-21 stretch">
        <Card title="Where the money is made · wk 46" sub="Client billing per site, split into contractor cost and gross contribution. Click a site.">
          <SplitBars max={Math.max(...t.rows.map((x) => x.revenue))} fmt={(n) => eur(n)} rows={t.rows.map((x) => ({
            label: x.site.name, sub: x.client.name + " · " + x.hours + "h · " + x.margin.toFixed(1) + "%", cost: x.cost, contribution: x.contribution,
            onClick: () => openDrawer({ kind: "site", id: x.site.id }),
          }))} />
        </Card>
        <Card title="Accountant export" sub="Spreadsheet handoff, as today">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="wl-row" style={{ borderTop: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>Week 46 summary</div><div style={{ fontSize: 11.5, color: "var(--dim)" }}>Sites, hours, billing, cost, contribution</div></div>
              <Btn small onClick={exportWeek}>CSV (mock)</Btn>
            </div>
            <div className="wl-row">
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>Open receivables</div><div style={{ fontSize: 11.5, color: "var(--dim)" }}>{INVOICES.filter((i) => i.status !== "paid").length} invoices · {eur(r.open)}</div></div>
              <Btn small onClick={exportAr}>CSV (mock)</Btn>
            </div>
            <div className="wl-row">
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>Send week 46 to accountant</div><div style={{ fontSize: 11.5, color: "var(--dim)" }}>Task T-307 · Elaine · Wed 18 Nov</div></div>
              <Go page="Work" tab="tasks">Open task</Go>
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Note>The accountant's package is unconfirmed. No ERP sync, bank feed or reconciliation in this demo; files download to this device only.</Note></div>
        </Card>
      </div>
      <div className="wl-g wl-g-12 stretch">
        <Card title="Receivables ageing" sub="Issued, unpaid invoices at Mon 16 Nov">
          <BarList fmt={(n) => eur(n)} items={age.map((a) => ({ ...a, onClick: () => navigate("Finance", "debtors") }))} />
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--dim)" }}>Total open {eur(r.open)}. Only INV-2026-103 is past due.</div>
        </Card>
        <Card title="By client" sub="Week 46 billing and money owed, kept apart by period" flush>
          <Table minWidth={640} onRow={(a) => openDrawer({ kind: "client", id: a.client.id })} cols={[
            { k: "c", label: "Client", render: (a) => <span className="ink">{a.client.name}</span> },
            { k: "p", label: "Wk 46 potential", num: true, render: (a) => eur(a.potential) },
            { k: "r", label: "Ready", num: true, render: (a) => eur(a.ready) },
            { k: "n", label: "Open, not due", num: true, render: (a) => eur(a.notDue) },
            { k: "o", label: "Overdue", num: true, render: (a) => a.overdue ? <Badge tone="bad">{eur(a.overdue)}</Badge> : <span className="dim">€0</span> },
          ]} rows={accts} foot={["Total", eur(accts.reduce((a, x) => a + x.potential, 0)), eur(accts.reduce((a, x) => a + x.ready, 0)), eur(accts.reduce((a, x) => a + x.notDue, 0)), eur(accts.reduce((a, x) => a + x.overdue, 0))]} />
        </Card>
      </div>
    </Page>
  );
}

/* ── Invoices ── */
function Invoices() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const r = receivables();
  const batches = invoiceBatches(st);
  const [sel, setSel] = useState<ClientId>("morrow");
  const b = batches.find((x) => x.client.id === sel)!;
  const sheets = TIMESHEETS.filter((x) => x.countsToTotals && siteById(x.siteId).clientId === sel);
  const issued = INVOICES.slice().sort((a, c) => parseD(c.issued).getTime() - parseD(a.issued).getTime() || a.id.localeCompare(c.id));
  const paid30 = INVOICES.filter((i) => i.status === "paid" && i.paidOn && daysTo(i.paidOn) >= -30).reduce((a, i) => a + i.amount, 0);
  return (
    <Page>
      <Head title="Invoices" crumbs={[{ label: "Finance", page: "Finance", tab: "overview" }, { label: "Invoices" }]}
        sub="This week's drafts sit apart from issued invoices. A draft is not revenue received; paid totals come only from paid invoices." />
      <div className="wl-g wl-g-4">
        <Kpi label="Week 46 drafts" value={eur(t.ready)} sub="4 drafts · not issued" onClick={() => navigate("Timesheets", "export")} />
        <Kpi label="Held from drafts" value={eur(t.held)} tone={t.held ? "warn" : "ok"} sub={t.held ? "TS-1098 · Morrow" : "Released in demo"} onClick={() => navigate("Timesheets", "approval")} />
        <Kpi label="Issued, not yet due" value={eur(r.notDue)} sub={INVOICES.filter((i) => i.status === "open").length + " invoices · weeks 42–45"} onClick={() => navigate("Finance", "debtors")} />
        <Kpi label="Overdue" value={eur(r.overdue)} tone="bad" sub="INV-2026-103" onClick={() => openDrawer({ kind: "invoice", id: "INV-2026-103" })} />
      </div>
      <div className="wl-g wl-g-2 stretch">
        <Card title="Week 46 drafts" sub="Built by Invoice Builder from signed-off hours only. Click a draft for its source hours." right={<Badge tone="info">Drafts</Badge>} flush>
          <Table minWidth={520} onRow={(x) => setSel(x.client.id)} selected={(x) => x.client.id === sel} cols={[
            { k: "id", label: "Draft", render: (x) => <span className="ink">{x.id}</span> },
            { k: "c", label: "Client", render: (x) => x.client.name },
            { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
            { k: "r", label: "Amount", num: true, render: (x) => <span className="ink">{eur(x.ready)}</span> },
            { k: "s", label: "Status", render: (x) => x.held ? <Badge tone="warn">{eur(x.held)} held</Badge> : <Badge tone="info">Draft</Badge> },
          ]} rows={batches} foot={["Total", "", t.approved + "h", eur(t.ready), ""]} />
        </Card>
        <Card title={"Source hours · " + b.client.name} sub={b.id + " · " + b.sites.map((x) => x.site.name).join(" + ")} flush>
          <Table minWidth={460} onRow={(x) => openDrawer({ kind: "timesheet", id: x.id })} cols={[
            { k: "id", label: "Sheet", render: (x) => <span className="ink">{x.id}</span> },
            { k: "w", label: "Worker", render: (x) => workerById(x.workerId).name },
            { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
            { k: "rt", label: "Rate", num: true, render: (x) => "€" + siteById(x.siteId).billRate },
            { k: "a", label: "Line", num: true, render: (x) => tsStatus(x.id, st) === "approved" ? eur(x.hours * siteById(x.siteId).billRate) : <Badge tone="warn">held</Badge> },
          ]} rows={sheets} foot={["Draft", "", b.hours + "h", "", eur(b.ready)]} />
        </Card>
      </div>
      <Card title="Issued invoices · previous periods" sub={"Weekly billing. Paid in the last 30 days: " + eur(paid30) + ". INV-2026-103 is a separate week 37 invoice, not this week's Westbridge draft."} flush>
        <Table minWidth={760} maxHeight={460} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} selected={(i) => i.status === "overdue"} cols={[
          { k: "id", label: "Invoice", render: (i) => <span className="ink">{i.id}</span> },
          { k: "c", label: "Client", render: (i) => clientById(i.clientId).name },
          { k: "p", label: "Period", render: (i) => i.period },
          { k: "is", label: "Issued", hideSm: true, render: (i) => i.issued },
          { k: "d", label: "Due", render: (i) => i.due },
          { k: "a", label: "Amount", num: true, render: (i) => eur(i.amount) },
          { k: "s", label: "Status", render: (i) => <Badge tone={invTone(i)}>{invLabel(i)}</Badge> },
        ]} rows={issued} />
      </Card>
    </Page>
  );
}

/* ── Debtors ── */
type DebtFilter = "open" | "overdue" | "notdue" | "paid" | "all";
function Debtors() {
  const st = useDemo();
  const r = receivables();
  const [flt, setFlt] = useState<DebtFilter>("open");
  const ledger = INVOICES.slice().sort((a, c) => parseD(a.issued).getTime() - parseD(c.issued).getTime() || a.id.localeCompare(c.id))
    .filter((i) => flt === "all" ? true : flt === "open" ? i.status !== "paid" : flt === "overdue" ? i.status === "overdue" : flt === "notdue" ? i.status === "open" : i.status === "paid");
  const wb = accountRows(st).find((a) => a.client.id === "westbridge")!;
  const rem = st.reminder;
  const remTone: Tone = rem.status === "draft" ? "info" : rem.status === "pending_approval" ? "warn" : "ok";
  const remLabel = rem.status === "draft" ? "Draft" : rem.status === "pending_approval" ? "Awaiting Paul's approval" : "Approved in demo · not sent";
  const paid30 = INVOICES.filter((i) => i.status === "paid" && i.paidOn && daysTo(i.paidOn) >= -30).reduce((a, i) => a + i.amount, 0);
  return (
    <Page>
      <Head title="Debtors" crumbs={[{ label: "Finance", page: "Finance", tab: "overview" }, { label: "Debtors" }]}
        sub="Who owes what, oldest first. One invoice is past due; the reminder waits for Paul's approval and is never sent from the demo." />
      <div className="wl-g wl-g-6">
        <Kpi label="Overdue" value={eur(r.overdue)} tone="bad" sub="1 invoice · Westbridge" onClick={() => openDrawer({ kind: "invoice", id: "INV-2026-103" })} />
        <Kpi label="Oldest" value="31 days" tone="bad" sub="Due 16 Oct 2026" />
        <Kpi label="Open, not due" value={eur(r.notDue)} sub={INVOICES.filter((i) => i.status === "open").length + " invoices"} />
        <Kpi label="Total open" value={eur(r.open)} sub="Issued, unpaid" />
        <Kpi label="Paid · last 30 days" value={eur(paid30)} tone="ok" sub="From paid invoices only" />
        <Kpi label="Reminder" value={rem.status === "draft" ? "Draft" : rem.status === "pending_approval" ? "Pending" : "Approved"} tone={remTone} sub="INV-2026-103" onClick={() => navigate("Work", "approvals")} />
      </div>
      <div className="wl-g wl-g-32 stretch">
        <Card title="Reminder · INV-2026-103" sub="Drafted by Collections Assistant at 09:30. Edit freely; approval is required before anything could be sent."
          right={<Badge tone={remTone}>{remLabel}</Badge>}>
          <div className="wl-g wl-g-2" style={{ marginBottom: 10 }}>
            <Stat k="To (placeholder)" v="westbridge.ap@client.example" sub="Westbridge accounts payable" />
            <Stat k="Subject" v="INV-2026-103 · €7,760 · 31 days overdue" />
          </div>
          <Field label="Message" hint={rem.status === "draft" ? "Editable draft" : "Locked while in approval. Reset to edit again."}>
            <textarea className="wl-in" rows={9} value={rem.text} disabled={rem.status !== "draft"} onChange={(e) => setReminderText(e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {rem.status === "draft" && <Btn kind="primary" onClick={submitReminder}>Submit for approval</Btn>}
            {rem.status === "pending_approval" && <Btn kind="primary" onClick={approveReminder} title="Marks the draft approved in local demo state. No email is sent.">Approve in demo (Paul)</Btn>}
            {rem.status === "pending_approval" && <Btn onClick={() => navigate("Work", "approvals")}>View in Work › Approvals</Btn>}
            {rem.status !== "draft" && <Btn kind="ghost" onClick={resetReminder}>Reset draft</Btn>}
          </div>
          <div style={{ marginTop: 12 }}><Note tone="warn">Nothing leaves this demo. A real send would need a connected email account (provider not yet confirmed) and Paul's approval.</Note></div>
        </Card>
        <Card title="Westbridge Civil" sub="Account position, kept apart by period" right={<Go page="Clients" tab="accounts">Open account</Go>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Stat k="Overdue · week 37" v={eur(wb.overdue)} sub="INV-2026-103 · issued 16 Sep · due 16 Oct" />
            <Stat k="Open, not due · weeks 42–45" v={eur(wb.notDue)} sub="Inside 30-day terms" />
            <Stat k="Week 46 draft · not issued" v={eur(wb.ready)} sub="Harbour Road €6,240 + Navan €1,520. Same amount as INV-2026-103 by coincidence." />
            <Stat k="Last reply from accounts" v="2 Oct 2026" sub="westbridge.ap@client.example (placeholder)" />
          </div>
        </Card>
      </div>
      <Card title="Receivables ledger" sub="Chronological by issue date. Click an invoice for detail."
        right={<Seg label="Ledger filter" value={flt} onChange={setFlt} options={[
          { id: "open", label: "Open", count: INVOICES.filter((i) => i.status !== "paid").length },
          { id: "overdue", label: "Overdue", count: 1 },
          { id: "notdue", label: "Not due", count: INVOICES.filter((i) => i.status === "open").length },
          { id: "paid", label: "Paid", count: INVOICES.filter((i) => i.status === "paid").length },
          { id: "all", label: "All" }]} />} flush>
        <Table minWidth={820} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} selected={(i) => i.status === "overdue"} cols={[
          { k: "id", label: "Invoice", render: (i) => <span className="ink">{i.id}</span> },
          { k: "c", label: "Client", render: (i) => clientById(i.clientId).name },
          { k: "p", label: "Period", render: (i) => i.period },
          { k: "is", label: "Issued", hideSm: true, render: (i) => i.issued },
          { k: "d", label: "Due", render: (i) => i.due },
          { k: "a", label: "Amount", num: true, render: (i) => eur(i.amount) },
          { k: "o", label: "Days", num: true, render: (i) => i.status === "overdue" ? <span style={{ color: "var(--bad)" }}>{Math.abs(daysTo(i.due))} over</span> : i.status === "open" ? daysTo(i.due) + " to due" : <span className="dim">paid</span> },
          { k: "s", label: "Status", render: (i) => <Badge tone={invTone(i)}>{invLabel(i)}</Badge> },
        ]} rows={ledger} foot={["Shown", ledger.length + " invoices", "", "", "", eur(ledger.reduce((a, i) => a + i.amount, 0)), "", ""]} />
      </Card>
    </Page>
  );
}

/* ── Contractor costs ── */
function Costs() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const [site, setSite] = useState<"all" | SiteId>("all");
  const rows = workerRows(st).filter((r) => site === "all" ? true : r.w.siteId === site);
  const h = rows.reduce((a, r) => a + r.hours, 0);
  const c = rows.reduce((a, r) => a + r.cost, 0);
  const rev = rows.reduce((a, r) => a + r.revenue, 0);
  return (
    <Page>
      <Head title="Contractor costs" crumbs={[{ label: "Finance", page: "Finance", tab: "overview" }, { label: "Contractor costs" }]}
        sub="What the business pays subcontractors for the hours it bills. Not payroll and not anyone's take-home pay." />
      <div className="wl-g wl-g-4">
        <Kpi label="Hours" value={h + "h"} sub={site === "all" ? "All 17 subcontractors" : siteById(site).name} />
        <Kpi label="Contractor cost" value={eur(c)} sub={site === "all" ? "Week 46 total" : "Filtered"} />
        <Kpi label="Average cost per hour" value={h ? "€" + (c / h).toFixed(2) : "n/a"} sub={h ? "Billing €" + (rev / h).toFixed(2) + "/h" : ""} />
        <Kpi label="Gross contribution" value={eur(rev - c)} sub={rev ? ((rev - c) / rev * 100).toFixed(1) + "% of billing" : "n/a"} />
      </div>
      <Card title="Filter" right={<Seg label="Site" value={site} onChange={setSite} options={[{ id: "all", label: "All" }, ...SITES.map((s) => ({ id: s.id, label: s.name.split(" ").slice(0, 2).join(" ") }))]} />}>
        <Note>Rates are internal. Clients never see contractor rates, and workers only see their own. Tax treatment (for example RCT, if it applies) is not modelled here.</Note>
      </Card>
      <div className="wl-g wl-g-21 stretch">
        <Card title="Per subcontractor" sub="Hours × agreed contractor rate for week 46" flush>
          <Table minWidth={620} onRow={(r) => openDrawer({ kind: "worker", id: r.w.id })} cols={[
            { k: "w", label: "Subcontractor", render: (r) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar initials={r.w.initials} tint={r.w.tint} size={22} /><span className="ink">{r.w.name}</span></span> },
            { k: "s", label: "Site", render: (r) => r.site ? r.site.name : <span className="dim">Unallocated</span> },
            { k: "h", label: "Hours", num: true, render: (r) => r.hours + "h" },
            { k: "rt", label: "Rate", num: true, render: (r) => "€" + r.w.costRate + "/h" },
            { k: "c", label: "Cost", num: true, render: (r) => <span className="ink">{eur(r.cost)}</span> },
          ]} rows={rows} foot={["Total", rows.length + " people", h + "h", "", eur(c)]} />
        </Card>
        <Card title="Cost by site" sub="Week 46 · EUR">
          <BarList fmt={(n) => eur(n)} max={6000} axis={[0, 2000, 4000, 6000]} items={t.rows.map((x) => ({
            label: x.site.name, sub: x.hours + "h × €" + x.site.costRate, value: x.cost, tone: "var(--series-a)",
            onClick: () => setSite(x.site.id),
          }))} />
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <Stat k="Week total" v={eur(t.cost)} sub={t.submitted + "h · blended €" + (t.cost / t.submitted).toFixed(2) + "/h"} />
            <Stat k="Highest rate" v="€31/h · Ballymun" sub="Thinnest margin at 22.5%" />
          </div>
        </Card>
      </div>
    </Page>
  );
}

/* ── Forecast ── */
const FIELDS: { k: keyof ForecastInputs; label: string; unit: string; step: number; min: number; max: number; hint: string }[] = [
  { k: "addWorkers", label: "Additional contractors", unit: "people", step: 1, min: 0, max: 20, hint: "Placed on top of the current 15" },
  { k: "hoursPerWorker", label: "Billable hours per worker", unit: "h / week", step: 1, min: 0, max: 60, hint: "Per added contractor" },
  { k: "weeks", label: "Weeks", unit: "weeks", step: 1, min: 1, max: 26, hint: "Horizon for the comparison" },
  { k: "billRate", label: "Client rate", unit: "€ / h", step: 0.5, min: 0, max: 100, hint: "Charged for added workers" },
  { k: "costRate", label: "Contractor cost", unit: "€ / h", step: 0.5, min: 0, max: 100, hint: "Paid to added workers" },
  { k: "utilisation", label: "Utilisation", unit: "%", step: 5, min: 0, max: 100, hint: "Share of planned hours placed and billed" },
  { k: "priceChange", label: "Price change on all client rates", unit: "%", step: 0.5, min: -20, max: 20, hint: "Inflation or a renegotiation" },
  { k: "crewCostChange", label: "Existing crew rate change", unit: "€ / h", step: 0.5, min: -10, max: 10, hint: "Across the current 590h a week" },
];

function Forecast() {
  const st = useDemo();
  const fi = st.forecast;
  const f = forecastScenario(fi);
  const isDefault = (Object.keys(FORECAST_DEFAULTS) as (keyof ForecastInputs)[]).every((k) => FORECAST_DEFAULTS[k] === fi[k]);
  const r0 = Math.round;
  const pk = 1 + fi.priceChange / 100;
  return (
    <Page>
      <Head title="Forecast" crumbs={[{ label: "Finance", page: "Finance", tab: "overview" }, { label: "Forecast" }]}
        sub="What happens to billing and gross contribution if headcount, hours or rates change. Hypothetical: nothing here is booked."
        right={<><Btn onClick={saveForecastNote}>Save to Activity</Btn><Btn kind="ghost" onClick={resetForecast} disabled={isDefault}>Reset</Btn></>} />
      <div className="wl-g wl-g-4">
        <Kpi label={"Added revenue · " + fi.weeks + " wks"} value={"+" + eur(f.add.revenue)} sub={r0(f.add.hours) + " added hours"} />
        <Kpi label="Added contractor cost" value={"+" + eur(f.add.cost)} sub={"€" + fi.costRate + "/h"} />
        <Kpi label="Added gross contribution" value={(f.add.contribution >= 0 ? "+" : "") + eur(f.add.contribution)} tone={f.add.contribution >= 0 ? "ok" : "bad"} sub={f.add.revenue ? f.add.margin.toFixed(1) + "% on added work" : "No added work"} />
        <Kpi label="Blended margin with scenario" value={f.scenario.margin.toFixed(2) + "%"} sub={"Current mix " + f.baseline.margin.toFixed(2) + "%"} />
      </div>
      <div className="wl-g wl-g-12 stretch">
        <Card title="Assumptions" sub="Edit any input; every figure recalculates">
          <div className="wl-g wl-g-2">
            {FIELDS.map((x) => (
              <Field key={x.k} label={x.label + " (" + x.unit + ")"} hint={x.hint}>
                <input className="wl-in" type="number" step={x.step} min={x.min} max={x.max} value={fi[x.k]}
                  style={fi[x.k] !== FORECAST_DEFAULTS[x.k] ? { borderColor: "var(--accent-line)", background: "var(--accent-faint)" } : undefined}
                  onChange={(e) => { const n = Number(e.target.value); setForecast({ [x.k]: Number.isFinite(n) ? Math.min(x.max, Math.max(x.min, n)) : 0 } as Partial<ForecastInputs>); }} />
              </Field>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <Btn small onClick={resetForecast}>+2 at €43 / €29 (default)</Btn>
            <Btn small onClick={() => setForecast({ crewCostChange: 2 })}>+€2/h on existing crew</Btn>
            <Btn small onClick={() => setForecast({ addWorkers: 4 })}>+4 contractors</Btn>
            <Btn small onClick={() => setForecast({ utilisation: 75 })}>75% utilisation</Btn>
          </div>
        </Card>
        <Card title={"Current vs with scenario · " + fi.weeks + " weeks"} sub="Current mix repeated each week, plus the added contractors">
          <ForecastBars labels={["Current mix", "With scenario"]} groups={[
            { label: "Revenue", a: f.baseline.revenue, b: f.scenario.revenue },
            { label: "Contractor cost", a: f.baseline.cost, b: f.scenario.cost },
            { label: "Gross contribution", a: f.baseline.contribution, b: f.scenario.contribution },
          ]} />
          <Table minWidth={460} cols={[
            { k: "m", label: fi.weeks + " weeks", render: (x: { m: string; a: number; d: number; b: number; h?: boolean }) => <span className="ink">{x.m}</span> },
            { k: "a", label: "Current", num: true, render: (x) => x.h ? r0(x.a) + "h" : eur(x.a) },
            { k: "d", label: "Change", num: true, render: (x) => (x.d >= 0 ? "+" : "") + (x.h ? r0(x.d) + "h" : eur(x.d)) },
            { k: "b", label: "With scenario", num: true, render: (x) => <span className="ink">{x.h ? r0(x.b) + "h" : eur(x.b)}</span> },
          ]} rows={[
            { m: "Revenue", a: f.baseline.revenue, d: f.add.revenue, b: f.scenario.revenue },
            { m: "Contractor cost", a: f.baseline.cost, d: f.add.cost, b: f.scenario.cost },
            { m: "Gross contribution", a: f.baseline.contribution, d: f.add.contribution, b: f.scenario.contribution },
            { m: "Billable hours", a: f.baseline.hours, d: f.add.hours, b: f.scenario.hours, h: true },
          ]} />
        </Card>
      </div>
      <div className="wl-g wl-g-2 stretch">
        <Card title="How it's worked out" sub="Formula with the current inputs">
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.9, color: "var(--body)", overflowX: "auto" }}>
            <div>Added hours = {fi.addWorkers} × {fi.hoursPerWorker}h × {fi.weeks} wks × {fi.utilisation}% = <b style={{ color: "var(--ink)" }}>{r0(f.add.hours)}h</b></div>
            <div>Added revenue = {r0(f.add.hours)}h × €{fi.billRate}{fi.priceChange ? " × " + pk.toFixed(3) : ""} = <b style={{ color: "var(--ink)" }}>{eur(f.add.revenue)}</b></div>
            <div>Added cost = {r0(f.add.hours)}h × €{fi.costRate} = <b style={{ color: "var(--ink)" }}>{eur(f.add.cost)}</b></div>
            <div>Added contribution = {eur(f.add.revenue)} − {eur(f.add.cost)} = <b style={{ color: "var(--ink)" }}>{eur(f.add.contribution)}</b></div>
            <div>Current weekly = €23,590{fi.priceChange ? " × " + pk.toFixed(3) : ""} − (€17,100{fi.crewCostChange ? " + " + fi.crewCostChange + " × 590h" : ""}) = {eur(f.weekly.contribution)}</div>
            <div>Current {fi.weeks} wks = {fi.weeks} × {eur(f.weekly.contribution)} = <b style={{ color: "var(--ink)" }}>{eur(f.baseline.contribution)}</b></div>
          </div>
          <div style={{ marginTop: 10 }}><Note>Gross contribution before overhead, VAT and tax. Assumes the work exists to place added contractors and that client rates hold.</Note></div>
        </Card>
        <Card title="Existing crew rate check" sub="Weekly, current 590h, before any added contractors">
          <div className="wl-g wl-g-3">
            <Stat k="Weekly billing" v={eur(f.weekly.revenue)} sub={fi.priceChange ? fi.priceChange + "% price change" : "Rates unchanged"} />
            <Stat k="Weekly contractor cost" v={eur(f.weekly.cost)} sub={fi.crewCostChange ? (fi.crewCostChange > 0 ? "+" : "") + eur(fi.crewCostChange * 590) + " a week" : "Rates unchanged"} />
            <Stat k="Weekly contribution" v={eur(f.weekly.contribution)} sub={"Wk 46 actual " + eur(6490)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <BarList fmt={(n) => eur(n)} max={Math.max(6490, f.weekly.contribution, 1)} items={[
              { label: "Wk 46 actual", value: 6490, tone: "var(--series-a)", sub: "€23,590 − €17,100" },
              { label: "With these rates", value: Math.max(0, f.weekly.contribution), tone: "var(--series-b)", sub: fi.crewCostChange ? "Crew +" + "€" + fi.crewCostChange + "/h" : "No crew rate change" },
            ]} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Btn small kind="primary" onClick={() => setForecast({ crewCostChange: 2 })}>Try +€2/h</Btn>
            <Btn small onClick={() => setForecast({ crewCostChange: 0 })} disabled={!fi.crewCostChange}>Clear</Btn>
            <Btn small kind="ghost" onClick={() => navigate("Dashboard", "forecast")}>Sensitivity on Dashboard</Btn>
          </div>
          {fi.crewCostChange === 2 && <div style={{ marginTop: 10 }}><Note tone="warn">+€2/h across 590h is {eur(1180)} more cost a week, taking weekly contribution from €6,490 to {eur(f.weekly.contribution)}, if client rates and hours stay the same.</Note></div>}
        </Card>
      </div>
    </Page>
  );
}

export default function FinanceModule({ tab }: { tab: string }) {
  let body: ReactNode;
  switch (tab) {
    case "invoices": body = <Invoices />; break;
    case "debtors": body = <Debtors />; break;
    case "costs": body = <Costs />; break;
    case "forecast": body = <Forecast />; break;
    default: body = <Overview />;
  }
  return body;
}
