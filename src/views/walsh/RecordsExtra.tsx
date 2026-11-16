/* Records: Entities · Relationships · Imports. Ontology, Files and Contacts are
   the original Pulse views, kept as they were (CLAUDE.md rule 2). */
import { useMemo, useState } from "react";
import { navigate, openDrawer, useDemo, type Drawer } from "../../demo/store";
import { certAlerts, clientById, eur, fmtISO, invoiceBatches, readiness, siteById, siteRows, tsStatus, workerById, allTasks } from "../../demo/selectors";
import { CERT_LABEL, CERTS, CLIENTS, INVOICES, SITES, TIMESHEETS, WORKERS } from "../../demo/walshData";
import { Badge, Btn, Card, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

type Ent = { kind: string; id: string; title: string; sub: string; status: string; tone: Tone; drawer?: Drawer; nav?: { page: string; tab: string } };

function Entities() {
  const st = useDemo();
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const all: Ent[] = useMemo(() => {
    const ca = certAlerts(st);
    return ([] as Ent[])
      .concat(CLIENTS.map((c) => ({ kind: "Client", id: c.id, title: c.name, sub: c.terms + " terms · since " + c.since, status: "Active", tone: "ok" as Tone, drawer: { kind: "client", id: c.id } as Drawer })))
      .concat(CLIENTS.flatMap((c) => c.contacts.map((k) => ({ kind: "Contact", id: k.email, title: k.name, sub: c.name + " · " + k.email, status: "Placeholder", tone: "info" as Tone, nav: { page: "Clients", tab: "contacts" } }))))
      .concat(SITES.map((s) => ({ kind: "Contract", id: "C-" + s.id, title: clientById(s.clientId).short + " · " + s.name, sub: "€" + s.billRate + " charge / €" + s.costRate + " cost · from " + s.rateEffective, status: s.rateConfirmed ? "Confirmed" : "Unconfirmed", tone: (s.rateConfirmed ? "ok" : "warn") as Tone, nav: { page: "Clients", tab: "rates" } })))
      .concat(SITES.map((s) => ({ kind: "Site", id: s.id, title: s.name, sub: clientById(s.clientId).name + " · " + s.shift, status: s.issues.length ? s.issues.length + " issue" + (s.issues.length > 1 ? "s" : "") : "Clear", tone: (s.issues.length ? "warn" : "ok") as Tone, drawer: { kind: "site", id: s.id } as Drawer })))
      .concat(WORKERS.map((w) => { const r = readiness(w, st); return { kind: "Worker", id: w.id, title: w.name, sub: w.trade + " · " + (w.siteId ? siteById(w.siteId).name : "available"), status: r.state === "clear" ? "Cleared" : r.state === "held" ? "Held" : "Available", tone: (r.state === "clear" ? "ok" : r.state === "held" ? "bad" : "info") as Tone, drawer: { kind: "worker", id: w.id } as Drawer }; }))
      .concat(ca.all.filter((c) => c.status !== "valid" || c.review).map((c) => ({ kind: "Certificate", id: c.cert.id, title: workerById(c.cert.workerId).name + " · " + CERT_LABEL[c.cert.type], sub: "Expires " + fmtISO(c.expires), status: c.review ? "In review" : c.status, tone: (c.status === "expired" ? "bad" : c.status === "expiring" ? "warn" : "ok") as Tone, nav: { page: "Compliance", tab: "documents" } })))
      .concat(TIMESHEETS.map((t) => { const s = tsStatus(t.id, st); return { kind: "Timesheet", id: t.id, title: t.id + " · " + workerById(t.workerId).name, sub: siteById(t.siteId).name + " · " + t.hours + "h", status: s === "approved" ? "Approved" : s === "pending_client" ? "Client sign-off" : "Rejected duplicate", tone: (s === "approved" ? "ok" : s === "pending_client" ? "warn" : "bad") as Tone, drawer: { kind: "timesheet", id: t.id } as Drawer }; }))
      .concat(INVOICES.map((i) => ({ kind: "Invoice", id: i.id, title: i.id + " · " + clientById(i.clientId).short, sub: i.period + " · " + eur(i.amount), status: i.status === "overdue" ? "31 days overdue" : i.status === "open" ? "Open" : "Paid", tone: (i.status === "overdue" ? "bad" : i.status === "open" ? "info" : "ok") as Tone, drawer: { kind: "invoice", id: i.id } as Drawer })))
      .concat(invoiceBatches(st).map((b) => ({ kind: "Invoice", id: b.id, title: b.id + " · " + b.client.short + " (draft)", sub: "Wk 46 · " + eur(b.ready) + " ready" + (b.held ? " · " + eur(b.held) + " held" : ""), status: "Draft", tone: "accent" as Tone, nav: { page: "Timesheets", tab: "export" } })))
      .concat(allTasks(st).map((t) => ({ kind: "Task", id: t.id, title: t.title, sub: t.owner + " · due " + t.due, status: t.status, tone: (t.status === "Done" ? "ok" : t.priority === "High" ? "warn" : "info") as Tone, nav: t.link })));
  }, [st]);
  const kinds = ["Client", "Contact", "Contract", "Site", "Worker", "Certificate", "Timesheet", "Invoice", "Task"];
  const ql = q.trim().toLowerCase();
  const rows = all.filter((e) => (kind === "all" || e.kind === kind) && (!ql || (e.title + " " + e.sub + " " + e.status).toLowerCase().includes(ql)));
  return (
    <Page>
      <Head title="Entities" crumbs={[{ label: "Records", page: "Records", tab: "ontology" }, { label: "Entities" }]}
        sub="Every record type in one searchable list. Click a row to open its detail drawer or the module that owns it. Certificates list only the ones needing attention." />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className="wl-in" style={{ width: 280 }} placeholder="Search name, ID, site, status…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entities" />
        <Seg label="Entity type" value={kind} onChange={setKind} options={[{ id: "all", label: "All", count: all.length }].concat(kinds.map((k) => ({ id: k, label: k + "s", count: all.filter((e) => e.kind === k).length })))} />
      </div>
      <Card flush title={rows.length + " records"} sub="Demo records · names other than Paul and Elaine are illustrative">
        <Table minWidth={760} maxHeight={620} onRow={(e) => e.drawer ? openDrawer(e.drawer) : e.nav && navigate(e.nav.page, e.nav.tab)} cols={[
          { k: "k", label: "Type", w: 110, render: (e) => <Badge tone="neutral">{e.kind}</Badge> },
          { k: "t", label: "Record", render: (e) => <span className="ink">{e.title}</span> },
          { k: "s", label: "Detail", render: (e) => <span className="dim">{e.sub}</span> },
          { k: "st", label: "Status", render: (e) => <Badge tone={e.tone}>{e.status}</Badge> },
        ]} rows={rows} />
      </Card>
    </Page>
  );
}

function ChainNode({ label, title, sub, tone, onClick }: { label: string; title: string; sub: string; tone: Tone; onClick: () => void }) {
  return (
    <button className="wl-kpi" onClick={onClick} style={{ padding: "12px 13px", minHeight: 96 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6, color: "var(--ink)", lineHeight: 1.3 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.4 }}>{sub}</div>
      <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : tone === "ok" ? "var(--ok)" : "var(--track)" }} />
    </button>
  );
}

function Relationships() {
  const st = useDemo();
  const [story, setStory] = useState<"A" | "B" | "D">("A");
  const ballymun = siteRows(st).find((r) => r.site.id === "ballymun")!;
  const morrowBatch = invoiceBatches(st).find((b) => b.client.id === "morrow")!;
  const ts = tsStatus("TS-1098", st);
  const sean = readiness(workerById("sean-murphy"), st);
  const chains = {
    A: [
      { label: "Client", title: "Morrow Industrial", sub: "30-day terms", tone: "info" as Tone, go: () => openDrawer({ kind: "client", id: "morrow" }) },
      { label: "Contract", title: "€40 charge / €31 cost", sub: "Rate from 12 Jan 2026", tone: "info" as Tone, go: () => navigate("Clients", "rates") },
      { label: "Site", title: "Ballymun Logistics Hub", sub: ballymun.hours + "h · " + eur(ballymun.revenue), tone: "info" as Tone, go: () => openDrawer({ kind: "site", id: "ballymun" }) },
      { label: "Assignment", title: "David Byrne → Ballymun", sub: "Teleporter operator · 07:00–15:30", tone: "info" as Tone, go: () => navigate("Operations", "allocations") },
      { label: "Worker", title: "David Byrne", sub: "40h this week · 32h approved", tone: "ok" as Tone, go: () => openDrawer({ kind: "worker", id: "david-byrne" }) },
      { label: "Timesheet", title: "TS-1098 · 8h", sub: ts === "approved" ? "Signed (demo)" : "No client signature", tone: (ts === "approved" ? "ok" : "warn") as Tone, go: () => openDrawer({ kind: "timesheet", id: "TS-1098" }) },
      { label: "Invoice", title: "Morrow draft · " + eur(morrowBatch.ready), sub: morrowBatch.held ? eur(morrowBatch.held) + " held" : "Nothing held", tone: (morrowBatch.held ? "warn" : "ok") as Tone, go: () => navigate("Finance", "invoices") },
    ],
    B: [
      { label: "Client", title: "Castleview Residential", sub: "Site policy owner", tone: "info" as Tone, go: () => openDrawer({ kind: "client", id: "castleview" }) },
      { label: "Site", title: "North Quay Development", sub: "Requires current manual handling (demo)", tone: "info" as Tone, go: () => openDrawer({ kind: "site", id: "north-quay" }) },
      { label: "Assignment", title: "Sean Murphy → North Quay", sub: sean.state === "held" ? "Assigned, not cleared" : "Cleared", tone: (sean.state === "held" ? "bad" : "ok") as Tone, go: () => navigate("Operations", "allocations") },
      { label: "Worker", title: "Sean Murphy", sub: "General operative", tone: "info" as Tone, go: () => openDrawer({ kind: "worker", id: "sean-murphy" }) },
      { label: "Certificate", title: "Manual handling", sub: sean.state === "held" ? "Expired 14 Nov 2026" : "Updated (demo)", tone: (sean.state === "held" ? "bad" : "ok") as Tone, go: () => navigate("Compliance", "expiring") },
      { label: "Agent → Task", title: "Compliance Monitor → T-303", sub: "Arrange cover or verify document", tone: "warn" as Tone, go: () => navigate("Work", "tasks") },
    ],
    D: [
      { label: "Client", title: "Westbridge Civil", sub: "Harbour Road + Navan", tone: "info" as Tone, go: () => openDrawer({ kind: "client", id: "westbridge" }) },
      { label: "Invoice", title: "INV-2026-103", sub: "Wk 37 · €7,760", tone: "info" as Tone, go: () => openDrawer({ kind: "invoice", id: "INV-2026-103" }) },
      { label: "Payment status", title: "31 days overdue", sub: "Due 16 Oct 2026", tone: "bad" as Tone, go: () => navigate("Finance", "debtors") },
      { label: "Agent", title: "Collections Assistant", sub: "Reminder drafted 09:30", tone: "info" as Tone, go: () => openDrawer({ kind: "agent", id: "collections" }) },
      { label: "Task", title: "T-302 · Paul to approve", sub: st.reminder.status === "approved_demo" ? "Approved (demo)" : "Open", tone: (st.reminder.status === "approved_demo" ? "ok" : "warn") as Tone, go: () => navigate("Work", "approvals") },
    ],
  };
  const chain = chains[story];
  const predicates: Record<string, string[]> = {
    A: ["holds", "governs", "staffed by", "places", "submits", "billed on"],
    B: ["owns policy for", "requires doc for", "assigns", "holds", "raised"],
    D: ["billed", "has status", "watched by", "created"],
  };
  return (
    <Page>
      <Head title="Relationships" crumbs={[{ label: "Records", page: "Records", tab: "ontology" }, { label: "Relationships" }]}
        sub="Follow one record through every entity it touches. The Ontology tab shows the whole graph; this shows the chain behind each story." />
      <Seg label="Story" value={story} onChange={setStory} options={[{ id: "A", label: "A · 8 hours held" }, { id: "B", label: "B · Compliance hold" }, { id: "D", label: "D · Overdue debtor" }]} />
      <Card title={story === "A" ? "Client → Contract → Site → Assignment → Worker → Timesheet → Invoice" : story === "B" ? "Client → Site → Assignment → Worker → Certificate · Agent → Task" : "Client → Invoice → Payment status · Agent → Task"}
        sub="Every box opens the real record. Colours show status: amber pending, red blocked, teal healthy.">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${chain.length * 2 - 1}, auto)`, alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 6 }} className="wl-chain">
          {chain.map((n, i) => [
            <div key={"n" + i} style={{ width: 150 }}><ChainNode label={n.label} title={n.title} sub={n.sub} tone={n.tone} onClick={n.go} /></div>,
            i < chain.length - 1 ? <div key={"e" + i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "var(--faint)", minWidth: 54 }}>
              <span style={{ fontSize: 9.5, fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{predicates[story][i]}</span><span aria-hidden>→</span></div> : null,
          ])}
        </div>
      </Card>
      <div className="wl-g wl-g-3">
        <Stat k="Records in this chain" v={chain.length} />
        <Stat k="Blocking item" v={story === "A" ? (ts === "approved" ? "None" : "TS-1098 signature") : story === "B" ? (sean.state === "held" ? "Manual handling record" : "None") : "Payment from Westbridge"} />
        <Stat k="Value at stake" v={story === "A" ? (ts === "approved" ? "€0" : "€320") : story === "B" ? "Site entry · 39h/wk" : "€7,760"} />
      </div>
      <Card title="Entity types and how they link" sub="Same model as the ontology graph">
        <Table minWidth={620} cols={[
          { k: "f", label: "From", render: (r: string[]) => <span className="ink">{r[0]}</span> },
          { k: "p", label: "Relationship", render: (r: string[]) => <span className="dim">{r[1]}</span> },
          { k: "t", label: "To", render: (r: string[]) => <span className="ink">{r[2]}</span> },
          { k: "n", label: "Count in demo", num: true, render: (r: string[]) => r[3] },
        ]} rows={[
          ["Client", "holds", "Contract", String(SITES.length)], ["Contract", "governs", "Site", String(SITES.length)], ["Site", "staffed by", "Assignment", "15"],
          ["Assignment", "places", "Worker", "15"], ["Worker", "submits", "Timesheet", String(TIMESHEETS.length)], ["Timesheet", "billed on", "Invoice", "4 drafts"],
          ["Worker", "holds", "Certificate", String(CERTS.length)], ["Invoice", "has", "Payment status", String(INVOICES.length)], ["Agent", "raises", "Task", "7 agents"],
        ]} />
      </Card>
    </Page>
  );
}

function Imports() {
  const [mapped, setMapped] = useState(false);
  const ts = TIMESHEETS;
  const imported = ts.filter((t) => t.via.startsWith("Client template")).reduce((a, t) => a + t.hours, 0);
  const app = ts.filter((t) => t.via === "Worker app").reduce((a, t) => a + t.hours, 0);
  const counted = ts.filter((t) => t.countsToTotals).reduce((a, t) => a + t.hours, 0);
  const mapping = [
    ["Worker", "Name", "Worker.name", "17 / 17 matched"], ["Date", "Day columns Mon–Sat", "Timesheet.days", "6 columns"], ["Hours", "Daily hours", "Timesheet.hours", "numeric"],
    ["Site", "Sheet tab name", "Site.id", "5 / 5 matched"], ["Signed by", "Signature cell", "Timesheet.signedBy", "1 blank (TS-1098)"], ["Rate", "Not in sheet", "Contract (Pulse)", "from rates table"],
  ];
  return (
    <Page>
      <Head title="Imports" crumbs={[{ label: "Records", page: "Records", tab: "ontology" }, { label: "Imports" }]}
        sub="How week 46 got into Pulse: an Excel timesheet preview and worker app submissions. No live sync; Base44 is a planned manual export." />
      <div className="wl-g wl-g-4">
        <Kpi label="Rows previewed" value={ts.length} sub="16 counted · 1 duplicate rejected" />
        <Kpi label="From Excel template" value={imported + "h"} sub="incl. 8h duplicate" />
        <Kpi label="From worker app" value={app + "h"} />
        <Kpi label="Counted after validation" value={counted + "h"} tone="ok" sub="matches Timesheets" onClick={() => navigate("Timesheets", "submissions")} />
      </div>
      <div className="wl-g wl-g-21">
        <Card flush title="Excel timesheet import · preview" sub="Westbridge template + worker app export · week 46 · demo"
          right={<Btn small onClick={() => navigate("Timesheets", "exceptions")}>See exceptions</Btn>}>
          <Table minWidth={640} maxHeight={430} onRow={(t) => openDrawer({ kind: "timesheet", id: t.id })} cols={[
            { k: "id", label: "Row", render: (t) => <span className="ink">{t.id}</span> },
            { k: "w", label: "Worker", render: (t) => workerById(t.workerId).name },
            { k: "s", label: "Site", render: (t) => siteById(t.siteId).name },
            { k: "v", label: "Source", render: (t) => <span className="dim">{t.via}</span> },
            { k: "h", label: "Hours", num: true, render: (t) => t.hours + "h" },
            { k: "r", label: "Validation", render: (t) => <Badge tone={!t.countsToTotals ? "bad" : t.status === "pending_client" ? "warn" : "ok"}>{!t.countsToTotals ? "Duplicate · excluded" : t.status === "pending_client" ? "No signature" : "Valid"}</Badge> },
          ]} rows={ts} foot={["", "", "", "Counted", counted + "h", ""]} />
        </Card>
        <div className="wl-stack">
          <Card title="Field mapping" sub="Spreadsheet column → Pulse field">
            {mapping.map((m) => (
              <div key={m[0]} className="wl-row" style={{ fontSize: 12.3 }}>
                <span style={{ width: 70, color: "var(--ink)" }}>{m[0]}</span><span style={{ flex: 1, color: "var(--dim)" }}>{m[1]} → {m[2]}</span><span style={{ color: "var(--faint)", fontSize: 11 }}>{m[3]}</span>
              </div>
            ))}
          </Card>
          <Card title="Base44 legacy dashboards" right={<Badge tone="warn">{mapped ? "Mapping reviewed (demo)" : "Planned"}</Badge>}>
            <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.55 }}>Paul's Base44 tools are a migration candidate. Plan: manual export, map fields to the entities above, then retire the old dashboards. Nothing is connected.</div>
            <div style={{ marginTop: 10 }}><Btn small onClick={() => setMapped(true)} disabled={mapped}>{mapped ? "Reviewed" : "Review mapping (demo)"}</Btn></div>
          </Card>
          <Note>Imports in this demo are previews of fixture data. Nothing was read from a real spreadsheet, Base44, email or bank.</Note>
        </div>
      </div>
    </Page>
  );
}

export default function RecordsExtra({ tab }: { tab: string }) {
  if (tab === "relationships") return <Relationships />;
  if (tab === "imports") return <Imports />;
  return <Entities />;
}
