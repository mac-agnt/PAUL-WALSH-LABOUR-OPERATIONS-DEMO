/* Timesheets · the hours-to-invoice pipeline for the reporting week (9–15 Nov 2026).
   Every figure comes from selectors; TS-1098 moves through the demo store. */
import { useState, type ReactNode } from "react";
import { useDemo, navigate, openDrawer, toast, logActivity } from "../../demo/store";
import {
  eur, weeklyTotals, siteRows, invoiceBatches, tsStatus, workerById, siteById, clientById, workersAt, WORKERS, SITES, CLIENTS, TIMESHEETS,
} from "../../demo/selectors";
import { DAYS, TS_EXCEPTIONS, type SiteId, type ClientId, type Timesheet } from "../../demo/walshData";
import { requestClientSignoff, approveTs1098, resetTs1098 } from "../../demo/actions";
import { Page, Head, Card, Kpi, Table, Badge, Btn, Seg, Note, Stat, Avatar, Go, type Tone, type Col } from "./ui";

type Week = "w46" | "w47";
type StatusFilter = "all" | "approved" | "pending" | "rejected";

const statusTone = (s: string): Tone => (s === "approved" ? "ok" : s === "pending_client" ? "warn" : "bad");
const statusLabel = (s: string, requested: boolean) =>
  s === "approved" ? "Approved" : s === "pending_client" ? (requested ? "Sign-off requested" : "Client sign-off missing") : "Rejected duplicate";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function WeekPicker({ week, setWeek }: { week: Week; setWeek: (w: Week) => void }) {
  return (
    <select className="wl-in" value={week} onChange={(e) => setWeek(e.target.value as Week)} aria-label="Reporting week">
      <option value="w46">Wk 46 · 9–15 Nov (reporting week)</option>
      <option value="w47">Wk 47 · 16–22 Nov (in progress)</option>
    </select>
  );
}

function Wk47Note() {
  return (
    <Card title="Week 47 · 16–22 Nov 2026" sub="In progress. Submissions open now; the cut-off is Fri 20 Nov 15:00.">
      <div className="wl-g wl-g-3">
        <Stat k="Sheets submitted" v="0 of 15" sub="Week has just started" />
        <Stat k="Collector reminder" v="Fri 20 Nov 15:00" sub="Timesheet Collector · demo schedule" />
        <Stat k="Invoice drafts" v="Mon 23 Nov 08:15" sub="Invoice Builder, signed-off hours only" />
      </div>
      <div style={{ marginTop: 12 }}><Note>The demo holds detail for the reporting week only. Switch back to week 46 to see the 590h.</Note></div>
    </Card>
  );
}

/* Approved vs pending hours per site, shared hour scale with an axis. */
function HoursBars({ rows }: { rows: ReturnType<typeof siteRows> }) {
  const max = 200;
  const ticks = [0, 50, 100, 150, 200];
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--dim)", padding: "0 6px 6px", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--series-a)" }} />Approved hours</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--warn)" }} />Awaiting client sign-off</span>
        <span style={{ marginLeft: "auto", color: "var(--faint)" }}>Hours · wk 46</span>
      </div>
      {rows.map((r) => (
        <div key={r.site.id} className="wl-row click" onClick={() => openDrawer({ kind: "site", id: r.site.id })}
          title={`${r.site.name} · ${r.hours}h submitted · ${r.approvedH}h approved · ${r.pendingH}h pending`}
          style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(0,2.2fr) 70px", gap: 12, padding: "9px 6px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.site.name}</div>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{r.workers} workers · {r.client.short}</div>
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center", height: 14, alignSelf: "center" }}>
            <span style={{ width: (r.approvedH / max) * 100 + "%", height: "100%", background: "var(--series-a)", borderRadius: r.pendingH ? "4px 0 0 4px" : 4 }} />
            {r.pendingH > 0 && <span style={{ width: (r.pendingH / max) * 100 + "%", minWidth: 4, height: "100%", background: "var(--warn)", borderRadius: "0 4px 4px 0" }} />}
          </div>
          <div style={{ textAlign: "right", alignSelf: "center", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{r.hours}h</div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(0,2.2fr) 70px", gap: 12, padding: "4px 6px 0" }}>
        <span />
        <div style={{ position: "relative", height: 16, borderTop: "1px solid var(--border-strong)" }}>
          {ticks.map((t) => <span key={t} style={{ position: "absolute", left: (t / max) * 100 + "%", top: 3, transform: t ? "translateX(-50%)" : "none", fontSize: 10, color: "var(--faint)" }}>{t}h</span>)}
        </div>
        <span />
      </div>
    </div>
  );
}

/* ── Overview ── */
function Overview() {
  const st = useDemo();
  const [week, setWeek] = useState<Week>("w46");
  const t = weeklyTotals(st);
  const rows = t.rows;
  const counted = TIMESHEETS.filter((x) => x.countsToTotals);
  const viaApp = counted.filter((x) => x.via === "Worker app").reduce((a, x) => a + x.hours, 0);
  const viaExcel = counted.filter((x) => x.via !== "Worker app").reduce((a, x) => a + x.hours, 0);
  const dayTotals = DAYS.map((_, i) => counted.reduce((a, x) => a + x.days[i], 0));
  return (
    <Page>
      <Head title="Timesheets" crumbs={[{ label: "Timesheets" }, { label: "Overview" }]}
        sub="Submitted hours for the reporting week, how much is signed off, and what is holding invoice value back."
        right={<WeekPicker week={week} setWeek={setWeek} />} />
      {week === "w47" ? <Wk47Note /> : (
        <>
          <div className="wl-g wl-g-6">
            <Kpi label="Hours submitted" value={t.submitted + "h"} sub={t.sheets + " sheets · 15 workers"} onClick={() => navigate("Timesheets", "submissions")} />
            <Kpi label="Approved" value={t.approved + "h"} tone="ok" sub="Client signed" onClick={() => navigate("Timesheets", "submissions")} />
            <Kpi label="Pending sign-off" value={t.pending + "h"} tone={t.pending ? "warn" : "ok"} sub={t.pending ? "TS-1098 · Ballymun" : "Nothing pending"} onClick={() => navigate("Timesheets", "approval")} />
            <Kpi label="Invoice-ready" value={eur(t.ready)} sub="4 client drafts" onClick={() => navigate("Timesheets", "export")} />
            <Kpi label="Held" value={eur(t.held)} tone={t.held ? "warn" : "ok"} sub={t.held ? "Inside the " + eur(t.revenue) + ", not extra" : "All released"} onClick={() => navigate("Timesheets", "approval")} />
            <Kpi label="Exceptions" value={TS_EXCEPTIONS.length} sub="1 affects totals" onClick={() => navigate("Timesheets", "exceptions")} />
          </div>
          <div className="wl-g wl-g-21 stretch">
            <Card title="Hours by site" sub="Week 46 · 9–15 Nov. 195 + 160 + 115 + 80 + 40 = 590h. Click a site for its crew.">
              <HoursBars rows={rows} />
            </Card>
            <Card title="Where the week stands" sub="From submission to invoice draft">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { k: "Submitted by workers & clients", v: t.submitted + "h", tone: "ok" as Tone },
                  { k: "Signed off by the client", v: t.approved + "h", tone: "ok" as Tone },
                  { k: "Awaiting client signature", v: t.pending + "h · " + eur(t.held), tone: (t.pending ? "warn" : "ok") as Tone },
                  { k: "In invoice drafts (not issued)", v: eur(t.ready), tone: "info" as Tone },
                ].map((s) => (
                  <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={s.tone}>{s.v}</Badge><span style={{ fontSize: 12.5, color: "var(--body)" }}>{s.k}</span>
                  </div>
                ))}
              </div>
              <div className="wl-g wl-g-2" style={{ marginTop: 14 }}>
                <Stat k="Via worker app" v={viaApp + "h"} sub="North Quay, Ballymun, Tallaght" />
                <Stat k="Via client Excel template" v={viaExcel + "h"} sub="Westbridge sites" />
              </div>
              <div style={{ marginTop: 12 }}>
                <Note tone={t.pending ? "warn" : "ok"}>
                  {t.pending
                    ? <>TS-1098 (David Byrne, 8h, Fri 13 Nov) is the only sheet without a client signature. It holds {eur(t.held)} of Morrow's {eur(rows.find((r) => r.site.id === "ballymun")!.revenue)}. <Go page="Timesheets" tab="approval">Open approval</Go></>
                    : <>All {t.submitted}h are signed. {eur(t.ready)} is invoice-ready in this demo.</>}
                </Note>
              </div>
            </Card>
          </div>
          <Card title="Daily hours by site" sub="Mon 9 to Sat 14 Nov. Rows reconcile to the site totals; columns to the week." flush>
            <Table minWidth={760} onRow={(r) => openDrawer({ kind: "site", id: r.site.id })} cols={[
              { k: "s", label: "Site", render: (r) => <span className="ink">{r.site.name}</span> },
              { k: "c", label: "Client", render: (r) => r.client.name, hideSm: true },
              ...DAYS.map((d, i) => ({ k: "d" + i, label: d, num: true, render: (r: (typeof rows)[number]) => {
                const v = TIMESHEETS.filter((x) => x.countsToTotals && x.siteId === r.site.id).reduce((a, x) => a + x.days[i], 0);
                return v ? v + "h" : <span className="dim">·</span>;
              } })),
              { k: "t", label: "Week", num: true, render: (r) => <span className="ink">{r.hours}h</span> },
              { k: "p", label: "Pending", num: true, render: (r) => r.pendingH ? <Badge tone="warn">{r.pendingH}h</Badge> : <span className="dim">0h</span> },
            ]} rows={rows} foot={["Total", "", ...dayTotals.map((d) => d + "h"), t.submitted + "h", t.pending + "h"]} />
          </Card>
        </>
      )}
    </Page>
  );
}

/* ── Submissions ── */
type SubRow = { kind: "sheet"; t: Timesheet } | { kind: "sub"; site: SiteId; hours: number; days: number[] } | { kind: "idle"; name: string; id: string };

function Submissions() {
  const st = useDemo();
  const [week, setWeek] = useState<Week>("w46");
  const [site, setSite] = useState<"all" | SiteId>("all");
  const [client, setClient] = useState<"all" | ClientId>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const t = weeklyTotals(st);

  const match = (x: Timesheet) => {
    const s = tsStatus(x.id, st);
    if (site !== "all" && x.siteId !== site) return false;
    if (client !== "all" && siteById(x.siteId).clientId !== client) return false;
    if (status === "approved" && s !== "approved") return false;
    if (status === "pending" && s !== "pending_client") return false;
    if (status === "rejected" && s !== "rejected_duplicate") return false;
    if (q && !workerById(x.workerId).name.toLowerCase().includes(q.toLowerCase()) && !x.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  };
  const rows: SubRow[] = [];
  let shown = 0;
  for (const s of SITES) {
    const sheets = TIMESHEETS.filter((x) => x.siteId === s.id && match(x));
    if (!sheets.length) continue;
    sheets.forEach((x) => rows.push({ kind: "sheet", t: x }));
    const counted = sheets.filter((x) => x.countsToTotals);
    const h = counted.reduce((a, x) => a + x.hours, 0);
    shown += h;
    rows.push({ kind: "sub", site: s.id, hours: h, days: DAYS.map((_, i) => counted.reduce((a, x) => a + x.days[i], 0)) });
  }
  const unfiltered = site === "all" && client === "all" && status === "all" && !q;
  if (unfiltered) WORKERS.filter((w) => !w.siteId).forEach((w) => rows.push({ kind: "idle", name: w.name, id: w.id }));

  const cols: Col<SubRow>[] = [
    { k: "id", label: "Sheet", render: (r) => r.kind === "sheet" ? <span className="ink">{r.t.id}</span> : r.kind === "sub" ? <span style={{ fontWeight: 600, color: "var(--ink)" }}>Subtotal</span> : <span className="dim">n/a</span> },
    { k: "w", label: "Worker", render: (r) => r.kind === "sheet"
      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar initials={workerById(r.t.workerId).initials} tint={workerById(r.t.workerId).tint} size={22} /><span className="ink" style={{ textDecoration: r.t.countsToTotals ? "none" : "line-through" }}>{workerById(r.t.workerId).name}</span></span>
      : r.kind === "sub" ? <span style={{ fontWeight: 600, color: "var(--ink)" }}>{siteById(r.site).name}</span>
      : <span className="dim">{r.name} · unallocated, no hours</span> },
    { k: "s", label: "Site", hideSm: true, render: (r) => r.kind === "sheet" ? siteById(r.t.siteId).name : r.kind === "sub" ? <span className="dim">{clientById(siteById(r.site).clientId).name}</span> : "" },
    ...DAYS.map((d, i) => ({ k: "d" + i, label: d.split(" ")[0], num: true, render: (r: SubRow) => {
      const v = r.kind === "sheet" ? r.t.days[i] : r.kind === "sub" ? r.days[i] : 0;
      return v ? <span style={r.kind === "sub" ? { fontWeight: 600, color: "var(--ink)" } : undefined}>{v}</span> : <span className="dim">·</span>;
    } })),
    { k: "h", label: "Hours", num: true, render: (r) => r.kind === "sheet" ? <span className="ink" style={{ textDecoration: r.t.countsToTotals ? "none" : "line-through" }}>{r.t.hours}h</span> : r.kind === "sub" ? <span style={{ fontWeight: 600, color: "var(--ink)" }}>{r.hours}h</span> : "0h" },
    { k: "v", label: "Via", hideSm: true, render: (r) => r.kind === "sheet" ? r.t.via : "" },
    { k: "st", label: "Status", render: (r) => r.kind === "sheet"
      ? <Badge tone={statusTone(tsStatus(r.t.id, st))}>{statusLabel(tsStatus(r.t.id, st), st.ts1098 === "signoff_requested")}</Badge>
      : r.kind === "sub" ? <span className="dim">{siteById(r.site).name.split(" ")[0]} · {r.hours}h</span> : <Badge tone="info">Available</Badge> },
  ];

  return (
    <Page>
      <Head title="Submissions" crumbs={[{ label: "Timesheets", page: "Timesheets", tab: "overview" }, { label: "Submissions" }]}
        sub="Every sheet for the week, grouped by site with subtotals. 17 workers are in the directory; only the 15 allocated have hours."
        right={<WeekPicker week={week} setWeek={setWeek} />} />
      {week === "w47" ? <Wk47Note /> : (
        <>
          <div className="wl-g wl-g-4">
            <Kpi label="Counted hours" value={t.submitted + "h"} sub={t.sheets + " sheets"} />
            <Kpi label="Approved" value={t.approved + "h"} tone="ok" sub={eur(t.ready) + " billable"} />
            <Kpi label="Pending" value={t.pending + "h"} tone={t.pending ? "warn" : "ok"} sub={t.pending ? "TS-1098" : "None"} onClick={() => navigate("Timesheets", "approval")} />
            <Kpi label="Excluded" value="8h" tone="bad" sub="TS-1097 duplicate row, not counted" onClick={() => navigate("Timesheets", "exceptions")} />
          </div>
          <Card title="Filters" right={<Btn small kind="ghost" onClick={() => { setSite("all"); setClient("all"); setStatus("all"); setQ(""); }}>Clear</Btn>}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Seg label="Site" value={site} onChange={setSite} options={[{ id: "all", label: "All sites" }, ...SITES.map((s) => ({ id: s.id, label: s.name.split(" ")[0] + " " + (s.name.split(" ")[1] || ""), count: workersAt(s.id).length }))]} />
              <select className="wl-in" value={client} onChange={(e) => setClient(e.target.value as "all" | ClientId)} aria-label="Client">
                <option value="all">All clients</option>
                {CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Seg label="Status" value={status} onChange={setStatus} options={[{ id: "all", label: "Any status" }, { id: "approved", label: "Approved" }, { id: "pending", label: "Pending" }, { id: "rejected", label: "Rejected" }]} />
              <input className="wl-in" placeholder="Worker or sheet ID" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 190 }} />
            </div>
          </Card>
          <Card title="Sheets by site" sub={unfiltered ? "Unfiltered: subtotals add to " + t.submitted + "h. TS-1097 is shown struck through and excluded." : "Filtered view: " + shown + "h of " + t.submitted + "h shown."} flush>
            <Table minWidth={920} rows={rows} cols={cols}
              onRow={(r) => { if (r.kind === "sheet") openDrawer({ kind: "timesheet", id: r.t.id }); else if (r.kind === "idle") openDrawer({ kind: "worker", id: r.id }); else openDrawer({ kind: "site", id: r.site }); }}
              foot={["Total", unfiltered ? "15 allocated · 2 unallocated" : "Filtered", "", ...DAYS.map((_, i) => String(rows.filter((r) => r.kind === "sub").reduce((a, r) => a + (r.kind === "sub" ? r.days[i] : 0), 0))), shown + "h", "", ""]} />
          </Card>
          <div className="wl-g wl-g-6">
            {t.rows.map((r) => <Stat key={r.site.id} k={r.site.name} v={r.hours + "h"} sub={r.workers + " workers · " + (r.pendingH ? r.pendingH + "h pending" : "all approved")} />)}
            <Stat k="Reconciled" v={t.rows.map((r) => r.hours).join(" + ") + " = " + t.submitted + "h"} sub="Matches the week total" />
          </div>
        </>
      )}
    </Page>
  );
}

/* ── Approval ── */
function Approval() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const b = invoiceBatches(st);
  const morrow = b.find((x) => x.client.id === "morrow")!;
  const ts = TIMESHEETS.find((x) => x.id === "TS-1098")!;
  const s = tsStatus("TS-1098", st);
  const approved = s === "approved";
  const steps: { when: string; text: string; done: boolean; tone: Tone }[] = [
    { when: "Fri 13 Nov 16:05", text: "David Byrne submitted 8h for Fri 13 Nov via the worker app", done: true, tone: "ok" },
    { when: "Sat 14 Nov 10:12", text: "Elaine Walsh reviewed the batch and left TS-1098 pending", done: true, tone: "ok" },
    { when: "Mon 16 Nov 08:15", text: "Invoice Builder held €320 from the Morrow draft", done: true, tone: "ok" },
    { when: "Mon 16 Nov 08:20", text: "Sign-off requested from Morrow's project lead (REQ-206)", done: true, tone: "ok" },
    ...(st.ts1098 !== "pending" ? [{ when: "Demo action", text: "Sign-off request re-sent and follow-up task created (no email sent)", done: true, tone: "ok" as Tone }] : []),
    { when: approved ? "Demo action" : "Waiting", text: approved ? "Morrow sign-off simulated · 8h released to invoicing" : "Client signature on Fri 13 Nov", done: approved, tone: approved ? "ok" : "warn" },
  ];
  const approvedSheets = TIMESHEETS.filter((x) => x.countsToTotals && x.id !== "TS-1098");
  return (
    <Page>
      <Head title="Approval" crumbs={[{ label: "Timesheets", page: "Timesheets", tab: "overview" }, { label: "Approval" }]}
        sub="Approval by exception. 15 sheets are signed; one needs the client before it can be invoiced."
        right={approved ? <Btn small onClick={resetTs1098}>Reset demo</Btn> : undefined} />
      <div className="wl-g wl-g-4">
        <Kpi label="In the queue" value={approved ? 0 : 1} tone={approved ? "ok" : "warn"} sub={approved ? "Queue clear" : "TS-1098"} />
        <Kpi label="Value held" value={eur(t.held)} tone={t.held ? "warn" : "ok"} sub="8h × €40 · Ballymun" />
        <Kpi label="Invoice-ready" value={eur(t.ready)} sub={approved ? "Includes TS-1098" : eur(t.revenue) + " once signed"} onClick={() => navigate("Timesheets", "export")} />
        <Kpi label="Approved hours" value={t.approved + "h of " + t.submitted + "h"} tone="ok" />
      </div>
      <div className="wl-g wl-g-32 stretch">
        <Card title="TS-1098 · David Byrne · Ballymun Logistics Hub" sub="Morrow Industrial · teleporter operator · Fri 13 Nov 2026"
          right={<Badge tone={statusTone(s)}>{statusLabel(s, st.ts1098 === "signoff_requested")}</Badge>}>
          <div className="wl-g wl-g-4">
            <Stat k="Hours" v={ts.hours + "h"} sub="Fri 13 Nov" />
            <Stat k="Client rate" v={"€" + siteById("ballymun").billRate + "/h"} sub="Ballymun agreed rate" />
            <Stat k="Value" v={eur(ts.hours * siteById("ballymun").billRate)} sub="Inside the week's €23,590" />
            <Stat k="Contractor cost" v={eur(ts.hours * workerById("david-byrne").costRate)} sub="€31/h · internal" />
          </div>
          <div style={{ marginTop: 12 }}><Note tone={approved ? "ok" : "warn"}>{ts.note} David's Mon–Thu 32h (TS-1090) are already approved.</Note></div>
          <div style={{ marginTop: 16 }}>
            {steps.map((x, i) => (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, marginTop: 5, flex: "none", background: x.done ? "var(--ok)" : "var(--warn)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: x.done ? "var(--body)" : "var(--ink)" }}>{x.text}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{x.when}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {!approved && <Btn onClick={requestClientSignoff} disabled={st.ts1098 !== "pending"}>{st.ts1098 === "pending" ? "Request client sign-off" : "Sign-off requested"}</Btn>}
            {!approved && <Btn kind="primary" onClick={approveTs1098} title="Simulates Morrow signing. Local demo state only.">Approve in demo</Btn>}
            {approved && <Btn onClick={resetTs1098}>Reset demo</Btn>}
            <Btn kind="ghost" onClick={() => openDrawer({ kind: "timesheet", id: "TS-1098" })}>Open sheet</Btn>
            <Btn kind="ghost" onClick={() => openDrawer({ kind: "worker", id: "david-byrne" })}>David's profile</Btn>
          </div>
        </Card>
        <Card title="Effect on invoicing" sub="Recalculated live from the demo state">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Stat k="Invoice-ready, all clients" v={approved ? eur(t.ready) : eur(t.ready) + " → " + eur(t.revenue)} sub={approved ? "Released in demo" : "When Morrow signs"} />
            <Stat k="Morrow Industrial draft" v={approved ? eur(morrow.ready) : eur(morrow.ready) + " → " + eur(morrow.potential)} sub="Ballymun Logistics Hub · 115h" />
            <Stat k="Held" v={approved ? "€0" : eur(t.held) + " → €0"} sub="Not additional to the week's billing" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Note>Timesheet Collector checks and reminds; it never certifies attendance. The client signs, and Elaine or Paul releases the hours.</Note>
          </div>
        </Card>
      </div>
      <Card title="Signed this week" sub={approvedSheets.length + " sheets, " + approvedSheets.reduce((a, x) => a + x.hours, 0) + "h, signed by the client contact on each site"} flush>
        <Table minWidth={680} maxHeight={420} onRow={(x) => openDrawer({ kind: "timesheet", id: x.id })} cols={[
          { k: "id", label: "Sheet", render: (x) => <span className="ink">{x.id}</span> },
          { k: "w", label: "Worker", render: (x) => workerById(x.workerId).name },
          { k: "s", label: "Site", render: (x) => siteById(x.siteId).name },
          { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
          { k: "v", label: "Value", num: true, render: (x) => eur(x.hours * siteById(x.siteId).billRate) },
          { k: "b", label: "Signed by", hideSm: true, render: (x) => x.signedBy },
          { k: "st", label: "Status", render: () => <Badge tone="ok">Approved</Badge> },
        ]} rows={approvedSheets} />
      </Card>
    </Page>
  );
}

/* ── Exceptions ── */
function Exceptions() {
  const st = useDemo();
  const kindTone: Record<string, Tone> = { missing_signature: "warn", missing_hours: "info", overtime: "info", duplicate: "bad" };
  const resolved = (id: string) => id === "EX-1" ? st.ts1098 === "approved" : true;
  const statusOf = (id: string) => id === "EX-1" ? (st.ts1098 === "approved" ? "Resolved in demo" : st.ts1098 === "signoff_requested" ? "Sign-off requested" : "Open") : id === "EX-4" ? "Rejected · excluded" : "Explained · approved";
  return (
    <Page>
      <Head title="Exceptions" crumbs={[{ label: "Timesheets", page: "Timesheets", tab: "overview" }, { label: "Exceptions" }]}
        sub="Four things looked unusual this week. Only the missing signature changes the money." />
      <div className="wl-g wl-g-4">
        <Kpi label="Exceptions this week" value={TS_EXCEPTIONS.length} sub="Found by Timesheet Collector and Elaine" />
        <Kpi label="Affecting totals" value={st.ts1098 === "approved" ? 0 : 1} tone={st.ts1098 === "approved" ? "ok" : "warn"} sub={st.ts1098 === "approved" ? "Released in demo" : "€320 held · TS-1098"} />
        <Kpi label="No billing impact" value={3} tone="ok" sub="Explained or excluded" />
        <Kpi label="Excluded hours" value="8h" tone="bad" sub="Duplicate row TS-1097 · €0" />
      </div>
      <div className="wl-g wl-g-2 stretch">
        {TS_EXCEPTIONS.map((x) => {
          const w = workerById(x.workerId);
          return (
            <Card key={x.id} title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{x.label}<span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 400 }}>{x.id}</span></span>}
              sub={w.name + " · " + siteById(x.siteId).name}
              right={<Badge tone={resolved(x.id) && x.id === "EX-1" ? "ok" : kindTone[x.kind]}>{statusOf(x.id)}</Badge>}>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--body)" }}>{x.rationale}</div>
              <div style={{ marginTop: 10 }}><Note tone={x.affectsTotals && !resolved(x.id) ? "warn" : "info"}><b style={{ fontWeight: 600 }}>Impact:</b> {x.affectsTotals && resolved(x.id) ? "Resolved in demo. €320 released to the Morrow draft." : x.impact}</Note></div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Btn small onClick={() => openDrawer({ kind: "timesheet", id: x.tsId })}>Open {x.tsId}</Btn>
                <Btn small kind="ghost" onClick={() => openDrawer({ kind: "worker", id: x.workerId })}>{w.name.split(" ")[0]}'s profile</Btn>
                {x.id === "EX-1" && !resolved(x.id) && <Btn small kind="primary" onClick={() => navigate("Timesheets", "approval")}>Resolve in Approval</Btn>}
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Exception log" flush>
        <Table minWidth={720} onRow={(x) => openDrawer({ kind: "timesheet", id: x.tsId })} cols={[
          { k: "id", label: "Ref", render: (x) => <span className="ink">{x.id}</span> },
          { k: "k", label: "Type", render: (x) => x.label },
          { k: "ts", label: "Sheet", render: (x) => x.tsId },
          { k: "w", label: "Worker", render: (x) => workerById(x.workerId).name },
          { k: "a", label: "Affects totals", render: (x) => x.affectsTotals ? <Badge tone={resolved(x.id) ? "ok" : "warn"}>{resolved(x.id) ? "Released" : "Yes · €320"}</Badge> : <Badge tone="info">No</Badge> },
          { k: "s", label: "Status", render: (x) => statusOf(x.id) },
        ]} rows={TS_EXCEPTIONS} />
      </Card>
    </Page>
  );
}

/* ── Invoice export ── */
function Export() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const batches = invoiceBatches(st);
  const sumReady = batches.reduce((a, x) => a + x.ready, 0);
  const sheetsFor = (cid: ClientId) => TIMESHEETS.filter((x) => x.countsToTotals && siteById(x.siteId).clientId === cid);
  const csv = () => {
    const rows: (string | number)[][] = [["Draft batch", "Client", "Site", "Sheet", "Worker", "Hours", "Client rate EUR", "Amount EUR ex VAT", "Status"]];
    for (const b of batches) {
      for (const x of sheetsFor(b.client.id)) {
        const s = tsStatus(x.id, st), site = siteById(x.siteId);
        rows.push([b.id, b.client.name, site.name, x.id, workerById(x.workerId).name, x.hours, site.billRate, s === "approved" ? x.hours * site.billRate : 0, s === "approved" ? "Included" : "Held · client sign-off"]);
      }
      rows.push([b.id, b.client.name, "", "", "Batch total (invoice-ready)", b.hours, "", b.ready, "DRAFT"]);
    }
    rows.push(["", "", "", "", "All drafts", t.approved, "", sumReady, "DRAFT · demo data, illustrative"]);
    downloadCsv("walsh-week46-invoice-drafts-DEMO.csv", rows);
    logActivity({ kind: "system", actor: "Invoice export (demo)", title: "Downloaded week 46 draft CSV", detail: "4 draft batches · " + eur(sumReady) + ". Mock file, nothing issued.", link: { page: "Timesheets", tab: "export" } });
    toast("Mock CSV downloaded · drafts only, nothing issued");
  };
  return (
    <Page>
      <Head title="Invoice export" crumbs={[{ label: "Timesheets", page: "Timesheets", tab: "overview" }, { label: "Invoice export" }]}
        sub="Signed-off hours grouped by client into four draft batches. Drafts are not issued until Elaine or Paul approves."
        right={<><Btn kind="primary" onClick={csv}>Download CSV (mock)</Btn><Btn onClick={() => navigate("Work", "approvals")}>Finalise in Approvals</Btn></>} />
      <div className="wl-g wl-g-4">
        <Kpi label="Draft batches" value={batches.length} sub="One per client · week 46" />
        <Kpi label="Invoice-ready" value={eur(sumReady)} sub={batches.map((x) => eur(x.ready)).join(" + ")} />
        <Kpi label="Held" value={eur(t.held)} tone={t.held ? "warn" : "ok"} sub={t.held ? "TS-1098 left out of Morrow" : "Nothing held"} onClick={() => navigate("Timesheets", "approval")} />
        <Kpi label="Source hours" value={t.approved + "h"} sub={"of " + t.submitted + "h submitted"} />
      </div>
      <div className="wl-g wl-g-2 stretch">
        {batches.map((b) => {
          const sheets = sheetsFor(b.client.id);
          return (
            <Card key={b.id} title={b.client.name} sub={b.id + " · " + b.sites.map((r) => r.site.name).join(" + ")}
              right={<><Badge tone="info">Draft</Badge>{b.held > 0 && <Badge tone="warn">{eur(b.held)} held</Badge>}</>} flush>
              <Table minWidth={460} onRow={(x) => openDrawer({ kind: "timesheet", id: x.id })} cols={[
                { k: "id", label: "Sheet", render: (x) => <span className="ink">{x.id}</span> },
                { k: "w", label: "Worker", render: (x) => workerById(x.workerId).name },
                { k: "s", label: "Site", hideSm: true, render: (x) => siteById(x.siteId).name.split(" ").slice(0, 2).join(" ") },
                { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
                { k: "a", label: "Amount", num: true, render: (x) => tsStatus(x.id, st) === "approved" ? eur(x.hours * siteById(x.siteId).billRate) : <Badge tone="warn">Held {eur(x.hours * siteById(x.siteId).billRate)}</Badge> },
              ]} rows={sheets} foot={["Draft total", "", "", b.hours + "h", eur(b.ready)]} />
            </Card>
          );
        })}
      </div>
      <Card title="Batch reconciliation" sub="Four drafts against the week's billing">
        <Table minWidth={620} onRow={(b) => openDrawer({ kind: "client", id: b.client.id })} cols={[
          { k: "id", label: "Batch", render: (b) => <span className="ink">{b.id}</span> },
          { k: "c", label: "Client", render: (b) => b.client.name },
          { k: "p", label: "Potential", num: true, render: (b) => eur(b.potential) },
          { k: "h", label: "Held", num: true, render: (b) => b.held ? eur(b.held) : "€0" },
          { k: "r", label: "Invoice-ready", num: true, render: (b) => <span className="ink">{eur(b.ready)}</span> },
          { k: "s", label: "Status", render: () => <Badge tone="info">Draft · not issued</Badge> },
        ]} rows={batches} foot={["Total", "", eur(t.revenue), eur(t.held), eur(sumReady), ""]} />
        <div style={{ marginTop: 10 }}><Note>Amounts exclude VAT. Whether RCT applies to any of these contracts is not modelled here and needs checking with the accountant.</Note></div>
      </Card>
    </Page>
  );
}

export default function TimesheetsModule({ tab }: { tab: string }) {
  let body: ReactNode;
  switch (tab) {
    case "submissions": body = <Submissions />; break;
    case "approval": body = <Approval />; break;
    case "exceptions": body = <Exceptions />; break;
    case "export": body = <Export />; break;
    default: body = <Overview />;
  }
  return body;
}

