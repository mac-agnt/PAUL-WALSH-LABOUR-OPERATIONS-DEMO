/* Clients · two-sided service view: accounts, contacts, rates, requests and a
   scoped client-portal preview. Every figure comes from src/demo/selectors.ts. */
import { useState } from "react";
import { navigate, openDrawer, setDemo, useDemo } from "../../demo/store";
import {
  accountRows, clientById, clientScopedData, eur, invoicesOf, readiness, receivables, requestStatus, siteById, siteRows, sitesOf, weeklyTotals, workerById,
} from "../../demo/selectors";
import { decideRequest } from "../../demo/actions";
import { CLIENTS, REQUESTS, type ClientId, type ClientRequest, type Invoice, type RequestStatus } from "../../demo/walshData";
import { Avatar, Badge, BarList, Btn, Card, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const CRUMB = (label: string) => [{ label: "Clients", page: "Clients", tab: "accounts" }, { label }];

const reqLabel = (s: RequestStatus) =>
  s === "waiting_paul" ? "Waiting for Paul's approval" : s === "approved" ? "Approved (demo)" : s === "declined" ? "Declined (demo)" : s === "fulfilled" ? "Fulfilled" : "Open";
const reqTone = (s: RequestStatus): Tone => (s === "waiting_paul" ? "warn" : s === "approved" || s === "fulfilled" ? "ok" : s === "declined" ? "bad" : "info");

function invBadge(i: Invoice) {
  if (i.status === "overdue") return <Badge tone="bad">31 days overdue</Badge>;
  if (i.status === "open") return <Badge tone="info">Open · due {i.due}</Badge>;
  return <Badge tone="ok">Paid {i.paidOn}</Badge>;
}

/* REQ-206 is our sign-off request to Morrow; it follows TS-1098 rather than a decision. */
function reqStatusLive(r: ClientRequest, st: ReturnType<typeof useDemo>): RequestStatus {
  if (r.id === "REQ-206") return st.ts1098 === "approved" ? "fulfilled" : "open";
  return requestStatus(r.id, st);
}

/* ── Accounts ─────────────────────────────────────────────────────────────── */
function Accounts() {
  const st = useDemo();
  const rows = accountRows(st);
  const t = weeklyTotals(st);
  const r = receivables();
  const [sel, setSel] = useState<ClientId>("westbridge");
  const d = clientScopedData(sel, st);
  const acc = rows.find((x) => x.client.id === sel)!;
  const inv = invoicesOf(sel).slice().sort((a, b) => (a.status === "overdue" ? -1 : b.status === "overdue" ? 1 : 0));
  return (
    <>
      <Head crumbs={CRUMB("Accounts")} title="Client accounts"
        sub="Four illustrative accounts across five sites. This week's billing (week 46) is kept separate from invoices already issued for earlier periods." />
      <div className="wl-g wl-g-4">
        <Kpi label="Wk 46 potential billing" value={eur(t.revenue)} sub={t.submitted + "h submitted across " + CLIENTS.length + " accounts"} onClick={() => navigate("Finance", "overview")} />
        <Kpi label="Invoice-ready (wk 46)" value={eur(t.ready)} tone={t.held ? "warn" : "ok"} sub={t.held ? eur(t.held) + " held · TS-1098" : "Nothing held"} onClick={() => navigate("Timesheets", "export")} />
        <Kpi label="Issued · open, not yet due" value={eur(r.notDue)} sub="Weeks 42–45 invoices" onClick={() => navigate("Finance", "debtors")} />
        <Kpi label="Overdue" value={eur(r.overdue)} tone="bad" sub="INV-2026-103 · Westbridge · wk 37" onClick={() => { setSel("westbridge"); openDrawer({ kind: "invoice", id: "INV-2026-103" }); }} />
      </div>
      <Card title="Accounts" sub="Current week and earlier periods side by side. Click a row for the account detail below." flush
        right={<Btn small onClick={() => navigate("Clients", "portal")}>Portal preview</Btn>}>
        <Table minWidth={900} onRow={(x) => setSel(x.client.id)} selected={(x) => x.client.id === sel}
          cols={[
            { k: "c", label: "Client", render: (x) => <span className="ink" style={{ fontWeight: 500 }}>{x.client.name}</span> },
            { k: "s", label: "Sites", render: (x) => x.sites.map((s) => s.name).join(", ") },
            { k: "cr", label: "Crew", num: true, render: (x) => x.crew },
            { k: "p", label: "Wk 46 potential", num: true, render: (x) => eur(x.potential) },
            { k: "r", label: "Wk 46 ready", num: true, render: (x) => <span className="ink">{eur(x.ready)}</span> },
            { k: "h", label: "Held", num: true, render: (x) => x.held ? <span style={{ color: "var(--warn)" }}>{eur(x.held)}</span> : <span className="dim">n/a</span> },
            { k: "n", label: "Open, not due (wk 42–45)", num: true, render: (x) => eur(x.notDue) },
            { k: "o", label: "Overdue (earlier)", num: true, render: (x) => x.overdue ? <span style={{ color: "var(--bad)" }}>{eur(x.overdue)}</span> : <span className="dim">€0</span> },
          ]}
          rows={rows}
          foot={["Total", "5 sites", String(rows.reduce((a, x) => a + x.crew, 0)), eur(rows.reduce((a, x) => a + x.potential, 0)), eur(rows.reduce((a, x) => a + x.ready, 0)),
            eur(rows.reduce((a, x) => a + x.held, 0)), eur(rows.reduce((a, x) => a + x.notDue, 0)), eur(rows.reduce((a, x) => a + x.overdue, 0))]} />
      </Card>
      <div className="wl-g wl-g-32">
        <Card title={d.client.name} sub={`Client since ${d.client.since} · ${d.client.terms} terms · illustrative account`}
          right={<><Btn small onClick={() => openDrawer({ kind: "client", id: sel })}>Open drawer</Btn><Btn small kind="primary" onClick={() => { setDemo({ portalClient: sel }); navigate("Clients", "portal"); }}>Preview their portal</Btn></>}>
          <div className="wl-g wl-g-4">
            <Stat k="Wk 46 potential" v={eur(acc.potential)} sub={d.rows.reduce((a, x) => a + x.hours, 0) + "h submitted"} />
            <Stat k="Wk 46 ready" v={eur(acc.ready)} sub={acc.held ? eur(acc.held) + " held" : "all hours signed"} />
            <Stat k="Open, not due" v={eur(acc.notDue)} sub={inv.filter((i) => i.status === "open").length + " invoices"} />
            <Stat k="Overdue" v={eur(acc.overdue)} sub={acc.overdue ? "INV-2026-103 · 31 days" : "Nothing overdue"} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "16px 0 6px" }}>Sites this week</div>
          <Table minWidth={560} onRow={(x) => openDrawer({ kind: "site", id: x.site.id })} cols={[
            { k: "s", label: "Site", render: (x) => <span className="ink">{x.site.name}</span> },
            { k: "w", label: "Crew", num: true, render: (x) => x.workers },
            { k: "h", label: "Hours", num: true, render: (x) => x.hours + "h" },
            { k: "rt", label: "Bill rate", num: true, render: (x) => "€" + x.site.billRate + "/h" },
            { k: "b", label: "Billing", num: true, render: (x) => eur(x.revenue) },
            { k: "r", label: "Ready", num: true, render: (x) => eur(x.ready) },
          ]} rows={d.rows} />
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "16px 0 6px" }}>Invoices by period</div>
          <Table minWidth={560} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} cols={[
            { k: "id", label: "Invoice", render: (i) => <span className="ink">{i.id}</span> },
            { k: "p", label: "Period", render: (i) => i.period },
            { k: "a", label: "Amount", num: true, render: (i) => eur(i.amount) },
            { k: "s", label: "Status", render: (i) => invBadge(i) },
          ]} rows={inv} />
          {sel === "westbridge" && <div style={{ marginTop: 12 }}><Note tone="warn">INV-2026-103 (week 37, €7,760) is a previous-period invoice. It is separate from this week's €7,760 Westbridge draft; the matching amount is coincidental.</Note></div>}
        </Card>
        <div className="wl-stack">
          <Card title="Week 46 potential by account" sub="Client billing before VAT">
            <BarList fmt={(n) => eur(n)} items={rows.map((x) => ({ label: x.client.name, value: x.potential, sub: x.sites.length + " site" + (x.sites.length > 1 ? "s" : ""), onClick: () => setSel(x.client.id) }))} axis={[0, 4000, 8000]} />
          </Card>
          <Card title="Requests from this client">
            {d.requests.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No requests.</div>}
            {d.requests.map((q) => {
              const s = reqStatusLive(q, st);
              return (
                <div key={q.id} className="wl-row click" onClick={() => navigate("Clients", "requests")} style={{ padding: "10px 6px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}><span style={{ color: "var(--faint)" }}>{q.id}</span> · {q.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{q.kind} · {siteById(q.siteId).name}</div>
                  </div>
                  <Badge tone={reqTone(s)}>{reqLabel(s)}</Badge>
                </div>
              );
            })}
          </Card>
          <Card title="Contacts" right={<Btn small kind="ghost" onClick={() => navigate("Clients", "contacts")}>All contacts</Btn>}>
            {d.client.contacts.map((c) => (
              <div key={c.email} className="wl-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{c.role}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>Last reply {c.lastResponse}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Contacts ─────────────────────────────────────────────────────────────── */
function Contacts() {
  const st = useDemo();
  const [q, setQ] = useState("");
  const [client, setClient] = useState<"all" | ClientId>("all");
  const all = CLIENTS.flatMap((c) => c.contacts.map((x) => ({ ...x, client: c, sites: sitesOf(c.id) })));
  const ql = q.trim().toLowerCase();
  const rows = all.filter((x) => (client === "all" || x.client.id === client)
    && (!ql || [x.name, x.role, x.email, x.note, x.client.name].join(" ").toLowerCase().includes(ql)));
  const hasSite = (role: string, name: string) => role.toLowerCase().includes(name.split(" ")[0].toLowerCase());
  return (
    <>
      <Head crumbs={CRUMB("Contacts")} title="Client contacts"
        sub="Placeholder contacts on reserved @client.example addresses. These are role placeholders, not real people at real companies." />
      <Note tone="warn">Demo contacts only. Names are role placeholders and every address uses the non-routable client.example domain. Nothing in this demo emails them.</Note>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Seg label="Client" value={client} onChange={setClient}
          options={[{ id: "all" as const, label: "All", count: all.length }, ...CLIENTS.map((c) => ({ id: c.id, label: c.short, count: c.contacts.length }))]} />
        <input className="wl-in" placeholder="Search name, role, note…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px", maxWidth: 340 }} aria-label="Search contacts" />
      </div>
      <Card flush title={rows.length + " of " + all.length + " contacts"} sub="Click a row to open the client account.">
        <Table minWidth={980} onRow={(x) => openDrawer({ kind: "client", id: x.client.id })} cols={[
          { k: "n", label: "Contact", render: (x) => <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Avatar initials={x.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()} tint="#b9c6d4" size={24} /><span className="ink">{x.name}</span></span> },
          { k: "r", label: "Role", render: (x) => x.role },
          { k: "c", label: "Client", render: (x) => x.client.name },
          { k: "s", label: "Site relationship", render: (x) => {
            const linked = x.sites.filter((s) => hasSite(x.role, s.name));
            return linked.length ? linked.map((s) => s.name).join(", ") : x.role.startsWith("Accounts") ? "Account level (all sites)" : x.sites.map((s) => s.name).join(", ");
          } },
          { k: "e", label: "Email (demo)", render: (x) => <span className="dim">{x.email}</span> },
          { k: "l", label: "Last response", render: (x) => x.lastResponse },
          { k: "no", label: "Notes", render: (x) => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.note}</span> },
        ]} rows={rows} empty="No contacts match." />
      </Card>
      <div className="wl-g wl-g-3">
        <Card title="Waiting on a reply" sub="Contacts we are waiting on, oldest first">
          {[...all].filter((x) => /AP|accounts|Project lead/i.test(x.role + x.name)).map((x) => (
            <div key={x.email} className="wl-row"><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5 }}>{x.client.short} · {x.role}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{x.note}</div></div><span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{x.lastResponse}</span></div>
          ))}
        </Card>
        <Card title="Who signs hours" sub="Sign-off owner per site (placeholder roles)">
          {siteRows(st).map((r) => (
            <div key={r.site.id} className="wl-row click" onClick={() => openDrawer({ kind: "site", id: r.site.id })} style={{ padding: "9px 6px" }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{r.site.name}</div>
              <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{r.client.short} · {r.pendingH ? r.pendingH + "h unsigned" : "signed"}</span>
            </div>
          ))}
        </Card>
        <Card title="Contact rules">
          <div className="wl-stack" style={{ gap: 8 }}>
            <Note>Client messages are drafted in Pulse and approved by Paul before anything goes out.</Note>
            <Note>Client contacts never see worker phone numbers, documents or contractor rates.</Note>
            <Note tone="warn">Email provider is not confirmed yet, so nothing is sent from this demo.</Note>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ── Rates & contracts ────────────────────────────────────────────────────── */
function Rates() {
  const st = useDemo();
  const rows = siteRows(st);
  const unconfirmed = rows.filter((r) => !r.site.rateConfirmed);
  return (
    <>
      <Head crumbs={CRUMB("Rates & contracts")} title="Rates & contracts"
        sub="Agreed client charge rate and contractor cost rate per site. Margin is gross contribution per hour, before overhead, VAT and tax." />
      <div className="wl-g wl-g-4">
        <Kpi label="Contracts (sites)" value={rows.length} sub={CLIENTS.length + " clients"} />
        <Kpi label="Rates not confirmed in writing" value={unconfirmed.length} tone="warn" sub={unconfirmed.map((r) => r.site.name).join(" · ")} onClick={() => navigate("Work", "tasks")} />
        <Kpi label="Blended margin · wk 46" value={weeklyTotals(st).margin.toFixed(2) + "%"} sub={eur(weeklyTotals(st).contribution) + " on " + eur(weeklyTotals(st).revenue)} onClick={() => navigate("Dashboard", "margin")} />
        <Kpi label="Thinnest contract" value={[...rows].sort((a, b) => a.margin - b.margin)[0].site.name} sub={[...rows].sort((a, b) => a.margin - b.margin)[0].margin.toFixed(1) + "% · €" + ([...rows].sort((a, b) => a.margin - b.margin)[0].site.billRate - [...rows].sort((a, b) => a.margin - b.margin)[0].site.costRate) + "/h"} tone="warn" />
      </div>
      <Card flush title="Rate card by site" sub="Internal view. Contractor rates and margins are never shown in the client portal.">
        <Table minWidth={1040} onRow={(r) => openDrawer({ kind: "site", id: r.site.id })} cols={[
          { k: "s", label: "Site", render: (r) => <span className="ink">{r.site.name}</span> },
          { k: "c", label: "Client", render: (r) => r.client.name },
          { k: "b", label: "Client rate", num: true, render: (r) => "€" + r.site.billRate + "/h" },
          { k: "k", label: "Contractor rate", num: true, render: (r) => "€" + r.site.costRate + "/h" },
          { k: "m", label: "Margin / h", num: true, render: (r) => <span className="ink">€{r.site.billRate - r.site.costRate}</span> },
          { k: "p", label: "Margin %", num: true, render: (r) => r.margin.toFixed(1) + "%" },
          { k: "e", label: "Rate effective", render: (r) => r.site.rateEffective },
          { k: "ce", label: "Contract end", render: (r) => <span className="dim">{r.site.contractEnd}</span> },
          { k: "cf", label: "Confirmation", render: (r) => r.site.rateConfirmed ? <Badge tone="ok">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge> },
          { k: "w", label: "Wk 46 contribution", num: true, render: (r) => eur(r.contribution) },
        ]} rows={rows}
          foot={["All sites", "", "", "", "", weeklyTotals(st).margin.toFixed(1) + "%", "", "", "", eur(weeklyTotals(st).contribution)]} />
      </Card>
      <div className="wl-g wl-g-2">
        <Card title="Margin per hour by site" sub="€ per billed hour (client rate minus contractor rate)">
          <BarList fmt={(n) => "€" + n + "/h"} items={[...rows].sort((a, b) => (b.site.billRate - b.site.costRate) - (a.site.billRate - a.site.costRate))
            .map((r) => ({ label: r.site.name, value: r.site.billRate - r.site.costRate, sub: r.margin.toFixed(1) + "% · " + r.client.short, tone: r.margin < 25 ? "var(--warn)" : "var(--series-b)" }))} axis={[0, 5, 10, 15]} max={15} />
        </Card>
        <Card title="Contract assumptions to confirm" sub="Flagged because they are assumed in the demo, not confirmed">
          <div className="wl-stack" style={{ gap: 8 }}>
            {unconfirmed.map((r) => <Note key={r.site.id} tone="warn">{r.site.name}: €{r.site.billRate}/h charge rate (from {r.site.rateEffective}) not yet confirmed in writing by {r.client.name}. Task T-309 is open with Paul.</Note>)}
            {rows.filter((r) => /assumed/i.test(r.site.contractEnd)).map((r) => <Note key={r.site.id + "e"}>{r.site.name}: contract end "{r.site.contractEnd}" is an assumption for the demo.</Note>)}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn small onClick={() => navigate("Work", "tasks")}>Open task T-309</Btn>
              <Btn small onClick={() => navigate("Finance", "forecast")}>Model a rate change</Btn>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ── Client requests ──────────────────────────────────────────────────────── */
function Requests() {
  const st = useDemo();
  const [sel, setSel] = useState("REQ-204");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const live = REQUESTS.map((r) => ({ r, s: reqStatusLive(r, st) }));
  const isOpen = (s: RequestStatus) => s === "waiting_paul" || s === "open";
  const rows = live.filter((x) => filter === "all" || (filter === "open" ? isOpen(x.s) : !isOpen(x.s)));
  const cur = live.find((x) => x.r.id === sel) || live[0];
  const nq = clientScopedData("castleview", st).crew.filter((w) => w.siteId === "north-quay");
  const coverMark = st.cover["mark-dunne"];
  return (
    <>
      <Head crumbs={CRUMB("Client requests")} title="Client requests"
        sub="Roster approvals, extra labour and hours sign-off. Requests are mock portal entries, not confirmed messages from real clients." />
      <div className="wl-g wl-g-4">
        <Kpi label="Waiting for Paul" value={live.filter((x) => x.s === "waiting_paul").length} tone="warn" sub="REQ-204 · North Quay roster" onClick={() => setSel("REQ-204")} />
        <Kpi label="Open" value={live.filter((x) => x.s === "open").length} sub="Extra labour · sign-off" />
        <Kpi label="Decided in demo" value={live.filter((x) => x.s === "approved" || x.s === "declined").length} sub="This session" />
        <Kpi label="Fulfilled" value={live.filter((x) => x.s === "fulfilled").length} tone="ok" />
      </div>
      <div className="wl-g wl-g-12">
        <Card title="Queue" flush right={<Seg value={filter} onChange={setFilter} options={[{ id: "all" as const, label: "All" }, { id: "open" as const, label: "Open" }, { id: "closed" as const, label: "Closed" }]} />}>
          <Table minWidth={380} onRow={(x) => setSel(x.r.id)} selected={(x) => x.r.id === cur.r.id} cols={[
            { k: "id", label: "Request", render: (x) => <div><div className="ink">{x.r.id} · {x.r.kind}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{clientById(x.r.clientId).short} · {siteById(x.r.siteId).name}</div></div> },
            { k: "s", label: "Status", render: (x) => <Badge tone={reqTone(x.s)}>{reqLabel(x.s)}</Badge> },
          ]} rows={rows} />
        </Card>
        <Card title={cur.r.id + " · " + cur.r.title} sub={clientById(cur.r.clientId).name + " · " + siteById(cur.r.siteId).name + " · raised " + cur.r.raised}
          right={<Badge tone={reqTone(cur.s)}>{reqLabel(cur.s)}</Badge>}>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--body)" }}>{cur.r.detail}</div>
          <div className="wl-g wl-g-3" style={{ marginTop: 14 }}>
            <Stat k="Kind" v={cur.r.kind} />
            <Stat k="Owner" v={cur.r.owner} />
            <Stat k="Client" v={clientById(cur.r.clientId).name} />
          </div>
          {cur.r.id === "REQ-204" && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "16px 0 6px" }}>Roster preview · North Quay · week of 16 Nov (what Castleview would see)</div>
              <Table minWidth={460} cols={[
                { k: "n", label: "Worker", render: (w) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar initials={w.initials} tint={w.tint} size={22} /><span className="ink">{w.name}</span></span> },
                { k: "t", label: "Trade", render: (w) => w.trade },
                { k: "s", label: "Roster status", render: (w) => readiness(w, st).state === "held"
                  ? <Badge tone="warn">Not on site until cleared · cover: Mark Dunne</Badge>
                  : w.id === "mark-dunne" ? <Badge tone="info">Cover from Tue 17 Nov</Badge> : <Badge tone="ok">Rostered</Badge> },
              ]} rows={nq.some((w) => readiness(w, st).state === "held") || coverMark ? nq.concat([workerById("mark-dunne")]) : nq} />
              <div style={{ marginTop: 10 }}><Note>The client sees names and trades only. Compliance reasons, contractor rates and documents stay internal.</Note></div>
            </>
          )}
          {cur.r.id === "REQ-206" && <div style={{ marginTop: 14 }}><Note tone={st.ts1098 === "approved" ? "ok" : "warn"}>{st.ts1098 === "approved" ? "Signed in the demo. €320 released to the Morrow invoice." : "Linked to TS-1098 (8h, €320). Resolve it from Timesheets › Approval."}</Note></div>}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {(cur.s === "waiting_paul" || (cur.s === "open" && cur.r.id === "REQ-205")) && (
              <>
                <Btn kind="primary" onClick={() => decideRequest(cur.r.id, "approved")}>{cur.r.id === "REQ-204" ? "Approve & publish roster (demo)" : "Approve (demo)"}</Btn>
                <Btn onClick={() => decideRequest(cur.r.id, "declined")}>Decline</Btn>
              </>
            )}
            {cur.r.id === "REQ-206" && <Btn onClick={() => navigate("Timesheets", "approval")}>Open TS-1098</Btn>}
            {cur.r.id === "REQ-205" && <Btn onClick={() => navigate("Operations", "capacity")}>Check capacity</Btn>}
            {cur.r.id === "REQ-204" && <Btn onClick={() => navigate("Operations", "allocations")}>Open site allocations</Btn>}
            <Btn kind="ghost" onClick={() => { setDemo({ portalClient: cur.r.clientId }); navigate("Clients", "portal"); }}>View in client portal</Btn>
          </div>
          {(cur.s === "approved" || cur.s === "declined") && <div style={{ marginTop: 12 }}><Note>Decision recorded in the demo and written to Activity. Nothing was sent to {clientById(cur.r.clientId).name}.</Note></div>}
        </Card>
      </div>
    </>
  );
}

/* ── Portal preview ───────────────────────────────────────────────────────── */
function Portal() {
  const st = useDemo();
  const cid = st.portalClient;
  const d = clientScopedData(cid, st);
  const approvedH = d.rows.reduce((a, r) => a + r.approvedH, 0);
  const pendingH = d.rows.reduce((a, r) => a + r.pendingH, 0);
  const others = CLIENTS.filter((c) => c.id !== cid).length;
  return (
    <>
      <Head crumbs={CRUMB("Portal preview")} title="Client portal preview"
        sub="What a client viewer sees. Switch client to prove the scoping: each one sees only its own sites, crew, approved hours and invoices." />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--dim)" }}>View as</span>
        <Seg label="Client" value={cid} onChange={(id) => setDemo({ portalClient: id })} options={CLIENTS.map((c) => ({ id: c.id, label: c.name }))} />
      </div>
      <div className="wl-g wl-g-32">
        <section className="wl-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-faint)" }}>
            <span style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 9, background: "var(--track)" }} />)}</span>
            <span style={{ flex: 1, minWidth: 0, height: 26, borderRadius: 999, background: "var(--surface-2)", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 11.5, color: "var(--faint)", overflow: "hidden", whiteSpace: "nowrap" }}>
              portal.walsh-ops.example/{cid} · preview
            </span>
            <Badge tone="warn">Simulation</Badge>
          </div>
          <div style={{ padding: "18px 20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Walsh Labour Operations · client portal</div>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.4px", marginTop: 4 }}>{d.client.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>Week of 9–15 Nov 2026 · signed in as client viewer (demo)</div>
              </div>
              <Btn small onClick={() => navigate("Clients", "requests")}>New request</Btn>
            </div>
            <div className="wl-g wl-g-3" style={{ marginTop: 16 }}>
              <Stat k="Your sites" v={d.sites.length} sub={d.sites.map((s) => s.name).join(", ")} />
              <Stat k="Hours approved" v={approvedH + "h"} sub={pendingH ? pendingH + "h awaiting your sign-off" : "Nothing awaiting sign-off"} />
              <Stat k="Crew placed" v={d.crew.length} sub="Named roster below" />
            </div>
            {pendingH > 0 && <div style={{ marginTop: 12 }}><Note tone="warn">{pendingH}h on Fri 13 Nov need your sign-off (TS-1098). Your project lead can confirm them here.</Note></div>}
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "18px 0 6px" }}>Your sites</div>
            <Table minWidth={520} cols={[
              { k: "s", label: "Site", render: (r) => <span className="ink">{r.site.name}</span> },
              { k: "sh", label: "Shift", render: (r) => r.site.shift },
              { k: "c", label: "Crew", num: true, render: (r) => r.workers },
              { k: "a", label: "Approved hours", num: true, render: (r) => r.approvedH + "h" },
              { k: "rt", label: "Agreed rate", num: true, render: (r) => "€" + r.site.billRate + "/h" },
            ]} rows={d.rows} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "18px 0 6px" }}>Roster</div>
            <Table minWidth={520} cols={[
              { k: "n", label: "Name", render: (w) => <span className="ink">{w.name}</span> },
              { k: "t", label: "Trade", render: (w) => w.trade },
              { k: "s", label: "Site", render: (w) => w.siteId ? siteById(w.siteId).name : "" },
              { k: "st", label: "On site", render: (w) => readiness(w, st).state === "held"
                ? <Badge tone="warn">{st.cover["mark-dunne"] || requestStatus("REQ-204", st) === "approved" ? "Not on site · cover arranged" : "Not on site until cleared"}</Badge>
                : <Badge tone="ok">Rostered</Badge> },
            ]} rows={d.crew} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "18px 0 6px" }}>Your invoices</div>
            <Table minWidth={520} cols={[
              { k: "id", label: "Invoice", render: (i) => <span className="ink">{i.id}</span> },
              { k: "p", label: "Period", render: (i) => i.period },
              { k: "a", label: "Amount (ex VAT)", num: true, render: (i) => eur(i.amount) },
              { k: "s", label: "Status", render: (i) => invBadge(i) },
            ]} rows={d.invoices} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "18px 0 6px" }}>Your requests</div>
            {d.requests.map((q) => { const s = reqStatusLive(q, st); return (
              <div key={q.id} className="wl-row"><div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{q.id} · {q.title}</div><Badge tone={reqTone(s)}>{s === "waiting_paul" ? "With Walsh Labour Ops" : reqLabel(s)}</Badge></div>); })}
          </div>
        </section>
        <div className="wl-stack">
          <Card title={"What " + d.client.short + " cannot see"} sub="Access scoping enforced in this frontend simulation">
            <div className="wl-stack" style={{ gap: 8 }}>
              <Note tone="bad">Contractor pay rates and margins for any site</Note>
              <Note tone="bad">The other {others} clients, their sites, crews and invoices</Note>
              <Note tone="bad">Worker documents, certificate details, phone numbers and emails</Note>
              <Note tone="bad">Internal notes, compliance reasons and agent suggestions</Note>
              <Note tone="bad">Draft invoices for week 46 until Elaine or Paul approves them</Note>
            </div>
          </Card>
          <Card title="What it can see">
            <div className="wl-stack" style={{ gap: 8 }}>
              <Note tone="ok">Its own sites, agreed charge rates and shift times</Note>
              <Note tone="ok">Named roster with trades and on-site status</Note>
              <Note tone="ok">Approved hours and hours awaiting its sign-off</Note>
              <Note tone="ok">Its own issued invoices and status</Note>
              <Note tone="ok">Requests it raised, and their status</Note>
            </div>
          </Card>
          <Card title="Data in this view" sub="Counts pulled through the scoping filter">
            <div className="wl-g wl-g-2">
              <Stat k="Sites" v={d.sites.length + " of 5"} />
              <Stat k="Crew" v={d.crew.length + " of 15"} />
              <Stat k="Invoices" v={d.invoices.length} />
              <Stat k="Requests" v={d.requests.length} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function ClientsModule({ tab }: { tab: string }) {
  return (
    <Page>
      {tab === "contacts" ? <Contacts /> : tab === "rates" ? <Rates /> : tab === "requests" ? <Requests /> : tab === "portal" ? <Portal /> : <Accounts />}
    </Page>
  );
}
