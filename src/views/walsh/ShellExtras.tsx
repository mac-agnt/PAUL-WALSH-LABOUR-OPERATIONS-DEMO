/* Shell-level pieces: demo indicator + reset in the rail, the toast, and the
   shared entity drawer every module opens with openDrawer({kind, id}). */
import { useEffect, type ReactNode } from "react";
import { closeDrawer, navigate, openDrawer, resetDemo, setDemo, useDemo } from "../../demo/store";
import {
  certsOf, clientById, clientScopedData, eur, fmtISO, invoicesOf, readiness, siteById, siteRows, tsStatus, workerById, workerHours, workersAt,
} from "../../demo/selectors";
import { AGENTS, AGENT_RUNS, CERT_LABEL, DAYS, INVOICES, TIMESHEETS, type CertType, type SiteId, type ClientId } from "../../demo/walshData";
import { requestClientSignoff, approveTs1098, requestDocument, simulateUpload, verifyDocument } from "../../demo/actions";
import { Avatar, Badge, Btn, DemoChip, Note, Stat, Table, type Tone } from "./ui";

export function DemoRailCard({ open }: { open: boolean }) {
  if (!open) {
    return (
      <button className="wl-btn ghost sm" title="Demo environment · illustrative data. Click to reset the demo story." onClick={resetDemo}
        style={{ width: 44, padding: 0, height: 30, margin: "4px 0", color: "var(--warn)", borderStyle: "dashed" }}>
        ↺
      </button>
    );
  }
  return (
    <div style={{ margin: "6px 4px 2px", padding: "10px 12px", border: "1px dashed var(--border-strong)", borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--warn)", flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--body)", lineHeight: 1.3 }}>Demo environment</div>
        <div style={{ fontSize: 10.5, color: "var(--faint)", lineHeight: 1.3 }}>Illustrative data only</div>
      </div>
      <button className="wl-btn sm ghost" onClick={resetDemo} title="Restore the canonical demo story">Reset</button>
    </div>
  );
}

export function DemoToast() {
  const st = useDemo();
  if (!st.toast) return null;
  return (
    <div className="wl-toast" role="status" key={st.toast.n}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--warn)" }} />
      {st.toast.text}
    </div>
  );
}

const readyTone = (s: string): Tone => (s === "clear" ? "ok" : s === "held" ? "bad" : "info");
const certTone = (s: string): Tone => (s === "valid" ? "ok" : s === "expiring" ? "warn" : s === "expired" ? "bad" : "info");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function WorkerBody({ id }: { id: string }) {
  const st = useDemo();
  const w = workerById(id);
  const r = readiness(w, st);
  const site = w.siteId ? siteById(w.siteId) : null;
  const certs = certsOf(w.id, st);
  const sheets = TIMESHEETS.filter((t) => t.workerId === w.id);
  const h = workerHours(w);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar initials={w.initials} tint={w.tint} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>{w.trade} · subcontractor since {w.since}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Badge tone={readyTone(r.state)}>{r.state === "clear" ? "Site cleared" : r.state === "held" ? "Compliance hold" : "Available"}</Badge>
            {r.warnings.length > 0 && <Badge tone="warn">{r.warnings.length} expiring</Badge>}
          </div>
        </div>
      </div>
      {r.reasons.length > 0 && <div style={{ marginTop: 14 }}><Note tone="bad">{r.reasons.join(" · ")}. Assigned but not approved for site entry until resolved.</Note></div>}
      {w.note && <div style={{ marginTop: 10 }}><Note>{w.note}</Note></div>}
      <div className="wl-g wl-g-3" style={{ marginTop: 14 }}>
        <Stat k="Site" v={site ? site.name : "Unallocated"} sub={site ? clientById(site.clientId).name : w.availableFrom ? "Free from " + w.availableFrom : ""} />
        <Stat k="Hours · wk 46" v={h + "h"} sub={site ? eur(h * site.billRate) + " billable" : "No hours"} />
        <Stat k="Contractor rate" v={"€" + w.costRate + "/h"} sub="Internal · never shown to clients" />
      </div>
      <Section title="Skills">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{w.skills.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}</div>
      </Section>
      <Section title="Certificates & documents">
        <Table minWidth={460} cols={[
          { k: "d", label: "Document", render: (c) => <span className="ink">{c.cert.type ? labelOf(c.cert.type) : ""}</span> },
          { k: "e", label: "Expires", render: (c) => fmtISO(c.expires) },
          { k: "s", label: "Status", render: (c) => <Badge tone={c.review ? "info" : certTone(c.status)}>{c.review ? "Upload in review" : c.status === "expiring" ? c.days + " days left" : c.status}</Badge> },
          { k: "a", label: "", render: (c) => c.review
            ? <Btn small kind="primary" onClick={() => verifyDocument(w.id, c.cert.type)}>Approve</Btn>
            : (c.status === "expired" || c.status === "expiring")
              ? (c.requested ? <Btn small onClick={() => simulateUpload(w.id, c.cert.type)}>Simulate upload</Btn> : <Btn small onClick={() => requestDocument(w.id, c.cert.type)}>Request update</Btn>)
              : null },
        ]} rows={certs} />
      </Section>
      <Section title="Timesheets · wk 46">
        <Table minWidth={460} cols={[
          { k: "id", label: "Sheet", render: (t) => <span className="ink">{t.id}</span> },
          { k: "d", label: "Days", render: (t) => DAYS.filter((_, i) => t.days[i] > 0).map((d) => d.split(" ")[0]).join(", ") || "none" },
          { k: "h", label: "Hours", num: true, render: (t) => t.hours + "h" },
          { k: "s", label: "Status", render: (t) => { const s = tsStatus(t.id, st); return <Badge tone={s === "approved" ? "ok" : s === "pending_client" ? "warn" : "bad"}>{s === "approved" ? "Approved" : s === "pending_client" ? "Client sign-off" : "Rejected duplicate"}</Badge>; } },
        ]} rows={sheets} empty="No hours this week (unallocated)." />
      </Section>
      <Section title="Contact">
        <div className="wl-g wl-g-2"><Stat k="Email (demo)" v={w.email} /><Stat k="Phone" v={w.phone} /></div>
      </Section>
      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <Btn onClick={() => navigate("Crew", "profiles")}>Open full profile</Btn>
        <Btn onClick={() => navigate("Compliance", "documents")}>Compliance documents</Btn>
      </div>
    </>
  );
}

const labelOf = (t: CertType) => CERT_LABEL[t];

function SiteBody({ id }: { id: SiteId }) {
  const st = useDemo();
  const s = siteById(id);
  const row = siteRows(st).find((r) => r.site.id === id)!;
  const crew = workersAt(id);
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--dim)" }}>{clientById(s.clientId).name} · {s.location}</div>
      <div className="wl-g wl-g-3" style={{ marginTop: 14 }}>
        <Stat k="Crew" v={crew.length} sub={s.shift} />
        <Stat k="Hours · wk 46" v={row.hours + "h"} sub={row.pendingH ? row.pendingH + "h pending" : "all approved"} />
        <Stat k="Client / contractor rate" v={"€" + s.billRate + " / €" + s.costRate} sub={s.rateConfirmed ? "Confirmed" : "Not confirmed in writing"} />
        <Stat k="Billing" v={eur(row.revenue)} sub={eur(row.ready) + " invoice-ready"} />
        <Stat k="Gross contribution" v={eur(row.contribution)} sub={row.margin.toFixed(1) + "% · before overhead"} />
        <Stat k="Contract" v={s.contractEnd} sub={"Rate from " + s.rateEffective} />
      </div>
      <Section title="Client instructions"><Note>{s.instructions}</Note></Section>
      <Section title="Crew on site">
        <Table minWidth={420} onRow={(w) => openDrawer({ kind: "worker", id: w.id })} cols={[
          { k: "n", label: "Worker", render: (w) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar initials={w.initials} tint={w.tint} size={22} /><span className="ink">{w.name}</span></span> },
          { k: "t", label: "Trade", render: (w) => w.trade },
          { k: "h", label: "Hours", num: true, render: (w) => workerHours(w) + "h" },
          { k: "r", label: "Clearance", render: (w) => { const r = readiness(w, st); return <Badge tone={readyTone(r.state)}>{r.state === "clear" ? "Cleared" : "Held"}</Badge>; } },
        ]} rows={crew} />
      </Section>
      {s.issues.length > 0 && <Section title="Recent issues"><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{s.issues.map((i) => <Note key={i} tone="warn">{i}</Note>)}</div></Section>}
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}><Btn onClick={() => navigate("Operations", "sites")}>Open in Operations</Btn></div>
    </>
  );
}

function ClientBody({ id }: { id: ClientId }) {
  const st = useDemo();
  const d = clientScopedData(id, st);
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--dim)" }}>Client since {d.client.since} · {d.client.terms} terms · illustrative account</div>
      <div className="wl-g wl-g-3" style={{ marginTop: 14 }}>
        <Stat k="Sites" v={d.sites.length} sub={d.sites.map((s) => s.name).join(", ")} />
        <Stat k="Crew placed" v={d.crew.length} />
        <Stat k="Wk 46 billing" v={eur(d.rows.reduce((a, r) => a + r.revenue, 0))} sub={eur(d.rows.reduce((a, r) => a + r.ready, 0)) + " ready"} />
      </div>
      <Section title="Invoices by period">
        <Table minWidth={460} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} cols={[
          { k: "id", label: "Invoice", render: (i) => <span className="ink">{i.id}</span> },
          { k: "p", label: "Period", render: (i) => i.period },
          { k: "a", label: "Amount", num: true, render: (i) => eur(i.amount) },
          { k: "s", label: "Status", render: (i) => <Badge tone={i.status === "overdue" ? "bad" : i.status === "open" ? "info" : "ok"}>{i.status === "overdue" ? "31 days overdue" : i.status === "open" ? "Due " + i.due : "Paid " + i.paidOn}</Badge> },
        ]} rows={invoicesOf(id)} />
      </Section>
      <Section title="Contacts (placeholders)">
        {d.client.contacts.map((c) => <div key={c.email} className="wl-row"><div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.role} · {c.email}</div></div><span style={{ fontSize: 11.5, color: "var(--faint)" }}>Last reply {c.lastResponse}</span></div>)}
      </Section>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}><Btn onClick={() => navigate("Clients", "accounts")}>Open account</Btn><Btn onClick={() => { setPortal(id); navigate("Clients", "portal"); }}>Preview their portal</Btn></div>
    </>
  );
}
const setPortal = (id: ClientId) => setDemo({ portalClient: id, drawer: null });

function InvoiceBody({ id }: { id: string }) {
  const i = INVOICES.find((x) => x.id === id);
  if (!i) return <Note>Unknown invoice.</Note>;
  return (
    <>
      <div className="wl-g wl-g-3">
        <Stat k="Client" v={clientById(i.clientId).name} />
        <Stat k="Amount (ex VAT)" v={eur(i.amount)} />
        <Stat k="Status" v={i.status === "overdue" ? "31 days overdue" : i.status === "open" ? "Open, not due" : "Paid"} sub={i.status === "paid" ? "Paid " + i.paidOn : "Due " + i.due} />
        <Stat k="Period" v={i.period} />
        <Stat k="Issued" v={i.issued} />
        <Stat k="Due" v={i.due} />
      </div>
      {i.note && <div style={{ marginTop: 14 }}><Note tone="warn">{i.note}</Note></div>}
      {i.status === "overdue" && <div style={{ display: "flex", gap: 8, marginTop: 18 }}><Btn kind="primary" onClick={() => navigate("Finance", "debtors", null)}>Open reminder draft</Btn></div>}
    </>
  );
}

function TimesheetBody({ id }: { id: string }) {
  const st = useDemo();
  const t = TIMESHEETS.find((x) => x.id === id);
  if (!t) return <Note>Unknown timesheet.</Note>;
  const w = workerById(t.workerId), s = siteById(t.siteId), status = tsStatus(t.id, st);
  return (
    <>
      <div className="wl-g wl-g-3">
        <Stat k="Worker" v={w.name} sub={w.trade} />
        <Stat k="Site" v={s.name} sub={clientById(s.clientId).name} />
        <Stat k="Hours" v={t.hours + "h"} sub={t.countsToTotals ? eur(t.hours * s.billRate) + " at €" + s.billRate + "/h" : "Excluded from totals"} />
        <Stat k="Submitted" v={t.submitted} sub={t.via} />
        <Stat k="Signed by" v={status === "approved" && t.id === "TS-1098" ? "Morrow project lead (simulated)" : t.signedBy} />
        <Stat k="Status" v={status === "approved" ? "Approved" : status === "pending_client" ? (st.ts1098 === "signoff_requested" ? "Sign-off requested" : "Awaiting client") : "Rejected duplicate"} />
      </div>
      <Section title="Daily hours">
        <div className="wl-g wl-g-6">{DAYS.map((d, i) => <Stat key={d} k={d} v={t.days[i] ? t.days[i] + "h" : "0h"} />)}</div>
      </Section>
      {t.note && <div style={{ marginTop: 14 }}><Note tone={status === "pending_client" ? "warn" : "info"}>{t.note}</Note></div>}
      {t.id === "TS-1098" && status !== "approved" && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <Btn onClick={requestClientSignoff} disabled={st.ts1098 !== "pending"}>{st.ts1098 === "pending" ? "Request client sign-off" : "Sign-off requested"}</Btn>
          <Btn kind="primary" onClick={approveTs1098}>Approve in demo</Btn>
        </div>
      )}
    </>
  );
}

function AgentBody({ id }: { id: string }) {
  const a = AGENTS.find((x) => x.id === id);
  if (!a) return <Note>Unknown agent.</Note>;
  const runs = AGENT_RUNS.filter((r) => r.agent === id);
  return (
    <>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--body)" }}>{a.purpose}</div>
      <div className="wl-g wl-g-3" style={{ marginTop: 14 }}><Stat k="Trigger" v={a.trigger} /><Stat k="Last run" v={a.status} /><Stat k="Runs today" v={runs.length} /></div>
      <div style={{ marginTop: 12 }}><Note>{a.policy}</Note></div>
      <Section title="Runs today">
        {runs.map((r) => <div key={r.id} className="wl-row" style={{ alignItems: "flex-start" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{r.title}</div><div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{r.detail}</div></div><span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{r.at.slice(-5)}</span></div>)}
      </Section>
    </>
  );
}

export function EntityDrawer() {
  const st = useDemo();
  const d = st.drawer;
  useEffect(() => {
    if (!d) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [d]);
  if (!d) return null;
  let kind = "", title = "", body: ReactNode = null;
  if (d.kind === "worker") { kind = "SUBCONTRACTOR"; title = workerById(d.id).name; body = <WorkerBody id={d.id} />; }
  else if (d.kind === "site") { kind = "SITE"; title = siteById(d.id as SiteId).name; body = <SiteBody id={d.id as SiteId} />; }
  else if (d.kind === "client") { kind = "CLIENT ACCOUNT"; title = clientById(d.id as ClientId).name; body = <ClientBody id={d.id as ClientId} />; }
  else if (d.kind === "invoice") { kind = "INVOICE"; title = d.id; body = <InvoiceBody id={d.id} />; }
  else if (d.kind === "timesheet") { kind = "TIMESHEET"; title = d.id; body = <TimesheetBody id={d.id} />; }
  else if (d.kind === "agent") { kind = "AGENT"; title = AGENTS.find((a) => a.id === d.id)?.name || d.id; body = <AgentBody id={d.id} />; }
  return (
    <div className="wl-scrim" onClick={closeDrawer}>
      <aside className="wl-drawer" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 12, padding: "20px 22px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".13em", color: "var(--faint)" }}>{kind}</span>
              <DemoChip label="Demo data · illustrative" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", marginTop: 8 }}>{title}</div>
          </div>
          <button className="wl-btn sm ghost" onClick={closeDrawer} aria-label="Close">✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 22px 30px" }}>{body}</div>
      </aside>
    </div>
  );
}
