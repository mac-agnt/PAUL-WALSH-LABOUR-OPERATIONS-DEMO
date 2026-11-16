/* Compliance · site clearance, documents, expiries, site rules and audit trail.
   Every count comes from certAlerts()/readiness() so demo uploads, approvals and
   holds recompute the risk totals. Nothing is verified with any issuer. */
import { useState, type ReactNode } from "react";
import { navigate, openDrawer, useDemo } from "../../demo/store";
import {
  activity, allocated, certAlerts, certName, certsOf, fmtISO, readiness, requiredFor, siteById, workerById,
  type CertState,
} from "../../demo/selectors";
import { requestDocument, simulateUpload, toggleHold, verifyDocument } from "../../demo/actions";
import { CERT_ISSUER, CERT_LABEL, SITES, SITE_RULES, WORKERS, type CertType, type SiteId, type Worker, type WorkerId } from "../../demo/walshData";
import { MODULE_TABS } from "../../demo/nav";
import { Avatar, Badge, BarList, Btn, Card, Field, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const tabLabel = (id: string) => MODULE_TABS.Compliance.find((t) => t.id === id)?.label || "";
const crumbs = (tab: string) => [{ label: "Delivery" }, { label: "Compliance", page: "Compliance", tab: "overview" }, { label: tabLabel(tab) }];

const certTone = (c?: CertState): Tone => (!c ? "neutral" : c.review ? "info" : c.status === "valid" ? "ok" : c.status === "expiring" ? "warn" : "bad");
const certText = (c: CertState) => (c.review ? "Upload in review" : c.status === "valid" ? "Valid" : c.status === "expiring" ? c.days + " days left" : "Expired " + fmtISO(c.expires));
const readyTone = (s: string): Tone => (s === "clear" ? "ok" : s === "held" ? "bad" : "info");
const readyText = (s: string) => (s === "clear" ? "Cleared" : s === "held" ? "Compliance hold" : "Available");

const inductionOf = (w: Worker, certs: CertState[]): CertType | null => {
  if (w.siteId) return requiredFor(w.siteId).find((t) => t.startsWith("ind-")) || null;
  const c = certs.find((x) => x.cert.type.startsWith("ind-"));
  return c ? c.cert.type : null;
};
const specialistOf = (certs: CertState[]) => certs.find((c) => c.cert.type === "cscs-teleporter" || c.cert.type === "cscs-360" || c.cert.type === "wah");

function WorkerCell({ w }: { w: Worker }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Avatar initials={w.initials} tint={w.tint} size={24} />
      <span style={{ minWidth: 0 }}>
        <span className="ink" style={{ display: "block", whiteSpace: "nowrap" }}>{w.name}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{w.siteId ? siteById(w.siteId).name : "Unallocated"}</span>
      </span>
    </span>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────────── */

function HeatCell({ c, required }: { c?: CertState; required: boolean }) {
  if (!c) {
    return <div className="wl-cell" title={required ? "Required at this site and missing" : "Not held · not required"}
      style={{ background: required ? "var(--bad-soft)" : "var(--surface-faint)", color: required ? "var(--bad)" : "var(--faint)", border: "1px solid var(--border)" }}>{required ? "Missing" : "n/a"}</div>;
  }
  const t = certTone(c);
  const bg = t === "ok" ? "var(--ok-soft)" : t === "warn" ? "var(--warn-soft)" : t === "bad" ? "var(--bad-soft)" : "var(--surface-2)";
  const ink = t === "ok" ? "var(--ok)" : t === "warn" ? "var(--warn)" : t === "bad" ? "var(--bad)" : "var(--dim)";
  const label = c.review ? "Review" : c.status === "valid" ? fmtISO(c.expires).split(" ").slice(1).join(" ") : c.status === "expiring" ? c.days + "d left" : "Expired";
  return (
    <div className="wl-cell" title={CERT_LABEL[c.cert.type] + " · " + certText(c) + (required ? " · required at site" : "")}
      style={{ background: bg, color: ink, border: required ? "1px solid " + ink : "1px solid transparent", fontWeight: required ? 600 : 500 }}>
      {label}
    </div>
  );
}

function Overview() {
  const st = useDemo();
  const ca = certAlerts(st);
  const alloc = allocated();
  const [view, setView] = useState<"all" | "attention">("all");
  const rows = WORKERS.map((w) => {
    const certs = certsOf(w.id, st);
    const req = w.siteId ? requiredFor(w.siteId) : [];
    const ind = inductionOf(w, certs);
    return {
      w, r: readiness(w, st), req,
      sp: certs.find((c) => c.cert.type === "safe-pass"),
      mh: certs.find((c) => c.cert.type === "manual-handling"),
      ind, indC: ind ? certs.find((c) => c.cert.type === ind) : undefined,
      spec: specialistOf(certs),
      flagged: certs.some((c) => c.status !== "valid" || c.review),
    };
  });
  const shown = view === "all" ? rows : rows.filter((r) => r.flagged || r.r.state === "held");
  const bySite = SITES.map((s) => {
    const crew = alloc.filter((w) => w.siteId === s.id);
    const clear = crew.filter((w) => readiness(w, st).state === "clear").length;
    return { s, crew: crew.length, clear };
  });
  const horizon = ca.all.filter((c) => c.days <= 90 || c.review).sort((a, b) => a.days - b.days);
  return (
    <>
      <div className="wl-g wl-g-6">
        <Kpi label="People tracked" value={WORKERS.length} sub="17 subcontractors on the books" />
        <Kpi label="Cleared for site" value={ca.clear.length + " / " + alloc.length} sub="Allocated crew with every site rule met" tone="ok" onClick={() => navigate("Compliance", "site")} />
        <Kpi label="Expired site-required docs" value={ca.expired.length} sub={ca.expired.map((c) => workerById(c.cert.workerId).name.split(" ")[0] + " · " + CERT_LABEL[c.cert.type]).join(", ") || "None"} tone={ca.expired.length ? "bad" : "ok"} onClick={() => navigate("Compliance", "expiring")} />
        <Kpi label="Expiring ≤ 30 days" value={ca.expiring.length} sub={ca.expiring.map((c) => workerById(c.cert.workerId).name.split(" ")[0] + " · " + fmtISO(c.expires).replace(" 2026", "")).join(", ") || "None"} tone={ca.expiring.length ? "warn" : "ok"} onClick={() => navigate("Compliance", "expiring")} />
        <Kpi label="Compliance holds" value={ca.held.length} sub={ca.held.map((w) => w.name).join(", ") || "Nobody held"} tone={ca.held.length ? "bad" : "ok"} onClick={() => navigate("Compliance", "expiring")} />
        <Kpi label="Uploads to review" value={ca.reviews.length} sub={ca.reviews.length ? "Waiting for Elaine" : "Nothing waiting"} tone={ca.reviews.length ? "warn" : "info"} onClick={() => navigate("Compliance", "documents")} />
      </div>

      <div className="wl-g wl-g-21">
        <Card title="Status heatmap · everyone × key documents" sub="Bold outline = required at the worker's current site. Click a row for the full record."
          right={<Seg value={view} onChange={setView} options={[{ id: "all", label: "All 17", count: rows.length }, { id: "attention", label: "Needs attention", count: rows.filter((r) => r.flagged || r.r.state === "held").length }]} />}>
          <div className="wl-tw">
            <table className="wl-t" style={{ minWidth: 760 }}>
              <thead><tr><th>Worker</th><th>Safe Pass</th><th>Manual handling</th><th>Site induction</th><th>Specialist ticket</th><th>Site clearance</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.w.id} className="click" onClick={() => openDrawer({ kind: "worker", id: r.w.id })}>
                    <td><WorkerCell w={r.w} /></td>
                    <td style={{ width: 110 }}><HeatCell c={r.sp} required={r.req.includes("safe-pass")} /></td>
                    <td style={{ width: 120 }}><HeatCell c={r.mh} required={r.req.includes("manual-handling")} /></td>
                    <td style={{ width: 120 }}>{r.ind ? <HeatCell c={r.indC} required={r.req.includes(r.ind)} /> : <HeatCell required={false} />}</td>
                    <td style={{ width: 120 }}><HeatCell c={r.spec} required={false} /></td>
                    <td><Badge tone={readyTone(r.r.state)}>{readyText(r.r.state)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "var(--dim)", marginTop: 12 }}>
            <span><Badge tone="ok">Valid</Badge> month shown is expiry</span>
            <span><Badge tone="warn">≤ 30 days</Badge></span>
            <span><Badge tone="bad">Expired / missing</Badge></span>
            <span><Badge tone="info">Upload in review</Badge></span>
          </div>
        </Card>

        <div className="wl-stack">
          <Card title="Clearance by site" sub="Allocated crew meeting every site rule">
            {bySite.map((b) => (
              <div key={b.s.id} className="wl-row click" style={{ padding: "9px 6px" }} onClick={() => openDrawer({ kind: "site", id: b.s.id })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{b.s.name}</div>
                  <div className="wl-bar" style={{ marginTop: 6 }}><span style={{ width: (b.crew ? (b.clear / b.crew) * 100 : 0) + "%", background: b.clear === b.crew ? "var(--ok)" : "var(--warn)" }} /></div>
                </div>
                <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", width: 44, textAlign: "right" }}>{b.clear}/{b.crew}</span>
              </div>
            ))}
          </Card>
          <Card title="Next 90 days" sub="Expired, expiring and in-review documents, soonest first">
            {horizon.length === 0 && <Note tone="ok">Nothing expires in the next 90 days.</Note>}
            <BarList fmt={(n) => (n <= 0 ? "Expired" : n + "d")} max={90}
              items={horizon.map((c) => ({
                label: workerById(c.cert.workerId).name, sub: CERT_LABEL[c.cert.type] + " · " + fmtISO(c.expires),
                value: Math.max(0, c.days), tone: c.status === "expired" ? "var(--bad)" : c.review ? "var(--dim)" : "var(--warn)",
                onClick: () => navigate("Compliance", "expiring"),
              }))} />
          </Card>
          <Note>Safe Pass renewal is generally every four years (HSA guidance). Pulse tracks the dates you hold on file; it does not check records with SOLAS or any issuer.</Note>
        </div>
      </div>
    </>
  );
}

/* ── Documents ────────────────────────────────────────────────────────────── */

function Documents() {
  const st = useDemo();
  const ca = certAlerts(st);
  const [status, setStatus] = useState<"all" | "expired" | "expiring" | "review" | "valid">("all");
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const types = Array.from(new Set(ca.all.map((c) => c.cert.type)));
  const rows = ca.all.filter((c) => {
    const w = workerById(c.cert.workerId);
    if (q && !(w.name + " " + CERT_LABEL[c.cert.type]).toLowerCase().includes(q.toLowerCase())) return false;
    if (type !== "all" && c.cert.type !== type) return false;
    if (status === "review") return !!c.review;
    if (status !== "all" && c.status !== status) return false;
    return true;
  }).sort((a, b) => (a.review === b.review ? a.days - b.days : a.review ? -1 : 1));
  const count = (s: string) => ca.all.filter((c) => (s === "review" ? c.review : c.status === s)).length;
  const issued = (c: CertState) => st.docs[c.cert.workerId + ":" + c.cert.type]?.status === "verified" ? "16 Nov 2026 (demo upload)" : fmtISO(c.cert.issued);
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Documents on file" value={ca.all.length} sub={"Across " + WORKERS.length + " people · " + types.length + " credential types"} />
        <Kpi label="Valid" value={count("valid")} tone="ok" onClick={() => setStatus("valid")} />
        <Kpi label="Expired or expiring" value={count("expired") + count("expiring")} sub={count("expired") + " expired · " + count("expiring") + " within 30 days"} tone="warn" onClick={() => setStatus("expiring")} />
        <Kpi label="Uploads in review" value={ca.reviews.length} sub="Simulated uploads waiting for sign-off" tone={ca.reviews.length ? "warn" : "info"} onClick={() => setStatus("review")} />
      </div>

      {ca.reviews.length > 0 && (
        <Card title="Waiting for review" sub="Simulated uploads held in browser memory. Approving clears the worker's site check.">
          {ca.reviews.map((c) => {
            const w = workerById(c.cert.workerId);
            const d = st.docs[c.cert.workerId + ":" + c.cert.type];
            return (
              <div key={c.cert.id} className="wl-row" style={{ flexWrap: "wrap" }}>
                <WorkerCell w={w} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13 }}>{CERT_LABEL[c.cert.type]}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Uploaded via {d?.by || "worker portal"} · {d?.at} · new expiry {d?.newExpiry ? fmtISO(d.newExpiry) : "n/a"}</div>
                </div>
                <Btn small kind="primary" onClick={() => verifyDocument(w.id, c.cert.type)}>Approve document</Btn>
              </div>
            );
          })}
        </Card>
      )}

      <Card title="Document register" sub="Mock metadata only. No certificate numbers are stored in the demo and nothing is verified with an issuer."
        right={
          <>
            <input className="wl-in" placeholder="Search worker or credential" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
            <select className="wl-in" value={type} onChange={(e) => setType(e.target.value)} aria-label="Credential type">
              <option value="all">All credentials</option>
              {types.map((t) => <option key={t} value={t}>{CERT_LABEL[t]}</option>)}
            </select>
          </>
        }>
        <div style={{ marginBottom: 12 }}>
          <Seg value={status} onChange={setStatus} label="Status filter" options={[
            { id: "all", label: "All", count: ca.all.length }, { id: "expired", label: "Expired", count: count("expired") },
            { id: "expiring", label: "≤ 30 days", count: count("expiring") }, { id: "review", label: "In review", count: ca.reviews.length },
            { id: "valid", label: "Valid", count: count("valid") }]} />
        </div>
        <Table minWidth={980} maxHeight={560} onRow={(c) => openDrawer({ kind: "worker", id: c.cert.workerId })} rows={rows}
          cols={[
            { k: "w", label: "Worker", render: (c) => <WorkerCell w={workerById(c.cert.workerId)} /> },
            { k: "c", label: "Credential", render: (c) => <span className="ink">{CERT_LABEL[c.cert.type]}</span> },
            { k: "i", label: "Issuer", hideSm: true, render: (c) => <span className="dim">{CERT_ISSUER[c.cert.type]}</span> },
            { k: "is", label: "Issued", render: (c) => issued(c) },
            { k: "e", label: "Expires", render: (c) => fmtISO(c.expires) },
            { k: "v", label: "Verified by", hideSm: true, render: (c) => <span className="dim">{c.review ? "Pending review" : c.cert.verifiedBy}</span> },
            { k: "f", label: "Attachment", hideSm: true, render: (c) => <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }} title="Mock file name. No file is stored.">{c.cert.file}</span> },
            { k: "s", label: "Status", render: (c) => <Badge tone={certTone(c)}>{certText(c)}</Badge> },
          ]}
          foot={["Showing " + rows.length + " of " + ca.all.length, "", "", "", "", "", "", ""]} />
      </Card>
    </>
  );
}

/* ── Expiring ─────────────────────────────────────────────────────────────── */

const STORIES: { worker: WorkerId; type: CertType; headline: string; impact: string }[] = [
  { worker: "sean-murphy", type: "manual-handling", headline: "Manual-handling record expired 14 Nov",
    impact: "North Quay's site policy (demo) needs a current record before entry. Sean is assigned but not approved for site entry until this is resolved." },
  { worker: "patrick-doyle", type: "safe-pass", headline: "Safe Pass expires 20 Nov",
    impact: "Valid today, so Patrick stays cleared for Harbour Road. Without a renewal on file by 20 Nov the Harbour Road check fails." },
  { worker: "conor-oreilly", type: "ind-westbridge", headline: "Westbridge site induction expires 2 Dec",
    impact: "Valid today. Covers both Westbridge sites. Westbridge runs the induction; book a slot before 2 Dec." },
];

function StoryCard({ s }: { s: (typeof STORIES)[number] }) {
  const st = useDemo();
  const w = workerById(s.worker);
  const c = certsOf(w.id, st).find((x) => x.cert.type === s.type)!;
  const doc = st.docs[w.id + ":" + s.type];
  const r = readiness(w, st);
  const held = !!st.manualHolds[w.id];
  const resolved = doc?.status === "verified";
  const steps: { label: string; done: boolean; note: string }[] = [
    { label: "Flagged", done: true, note: s.worker === "sean-murphy" ? "Compliance Monitor · Mon 16 Nov 06:30" : "Compliance Monitor · daily scan" },
    { label: "Update requested", done: !!doc, note: doc ? (doc.status === "requested" ? doc.at : "Requested") : "Not yet" },
    { label: "Upload received", done: doc?.status === "under_review" || resolved, note: doc?.status === "under_review" || resolved ? "via " + (doc?.by || "worker portal") + " (simulated)" : "Waiting" },
    { label: "Approved", done: resolved, note: resolved ? "Valid to " + fmtISO(c.expires) : "Elaine signs off" },
  ];
  return (
    <Card title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar initials={w.initials} tint={w.tint} size={28} />{w.name}</span>}
      sub={(w.siteId ? siteById(w.siteId).name : "Unallocated") + " · " + w.trade}
      right={<Badge tone={resolved ? "ok" : certTone(c)}>{resolved ? "Resolved in demo" : certText(c)}</Badge>}>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s.headline}</div>
      <div style={{ marginTop: 10 }}><Note tone={resolved ? "ok" : c.status === "expired" ? "bad" : "warn"}>{resolved ? CERT_LABEL[s.type] + " approved in the demo. Site check re-run: " + readyText(r.state).toLowerCase() + "." : s.impact}</Note></div>
      <div className="wl-g wl-g-3" style={{ marginTop: 12 }}>
        <Stat k="Expires" v={fmtISO(c.expires)} sub={c.days < 0 ? Math.abs(c.days) + " days ago" : c.days + " days from 16 Nov"} />
        <Stat k="Required at site" v={w.siteId && requiredFor(w.siteId).includes(s.type) ? "Yes" : "No"} sub={w.siteId ? siteById(w.siteId).name : ""} />
        <Stat k="Site clearance" v={readyText(r.state)} sub={held ? "Manual hold on" : r.reasons[0] || "No blocking issue"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 14 }}>
        {steps.map((x, i) => (
          <div key={i} style={{ padding: "8px 9px", borderRadius: 10, border: "1px solid var(--border)", background: x.done ? "var(--ok-soft)" : "var(--surface-faint)" }}>
            <div style={{ fontSize: 11.5, color: x.done ? "var(--ok)" : "var(--dim)", fontWeight: 600 }}>{i + 1}. {x.label}</div>
            <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 3, lineHeight: 1.35 }}>{x.note}</div>
          </div>
        ))}
      </div>
      {s.worker === "patrick-doyle" && !resolved && (
        <div style={{ marginTop: 12 }}>
          <Field label="Reminder draft (Compliance Monitor · not sent)">
            <textarea className="wl-in" readOnly rows={3} value={"Hi Patrick, your Safe Pass on file expires on 20 Nov. Please upload the renewed card in the worker app so Harbour Road stays open to you. Thanks, Elaine"} />
          </Field>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Btn small onClick={() => requestDocument(w.id, s.type)} disabled={!!doc}>{doc ? "Update requested" : "Request update"}</Btn>
        {!resolved && (doc?.status === "under_review"
          ? <Btn small kind="primary" onClick={() => verifyDocument(w.id, s.type)}>Review upload · approve</Btn>
          : <Btn small onClick={() => simulateUpload(w.id, s.type, "Elaine (on behalf of worker)")} title="Simulates the worker sending a new copy. Stored in browser memory only.">Review upload · simulate receipt</Btn>)}
        <Btn small kind={held ? undefined : "danger"} onClick={() => toggleHold(w.id)}>{held ? "Release site hold" : "Hold site access"}</Btn>
        <Btn small kind="ghost" onClick={() => openDrawer({ kind: "worker", id: w.id })}>Open record</Btn>
      </div>
    </Card>
  );
}

function Expiring() {
  const st = useDemo();
  const ca = certAlerts(st);
  const watch = ca.all.filter((c) => c.days <= 90 || c.review || c.requested).sort((a, b) => a.days - b.days);
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Expired · site-required" value={ca.expired.length} tone={ca.expired.length ? "bad" : "ok"} sub="Blocks site entry" />
        <Kpi label="Expiring ≤ 30 days" value={ca.expiring.length} tone={ca.expiring.length ? "warn" : "ok"} sub="Still valid today" />
        <Kpi label="Held from site" value={ca.held.length} tone={ca.held.length ? "bad" : "ok"} sub={ca.held.map((w) => w.name).join(", ") || "Nobody"} />
        <Kpi label="Requests open" value={Object.values(st.docs).filter((d) => d.status === "requested").length} sub="Waiting on the worker" onClick={() => navigate("Compliance", "audit")} />
      </div>
      <div className="wl-g wl-g-3">
        {STORIES.map((s) => <StoryCard key={s.worker + s.type} s={s} />)}
      </div>
      <Card title="Watch list · next 90 days" sub="Everything expired, expiring, requested or in review. Actions run in the demo only.">
        <Table minWidth={760} rows={watch} onRow={(c) => openDrawer({ kind: "worker", id: c.cert.workerId })}
          cols={[
            { k: "w", label: "Worker", render: (c) => <WorkerCell w={workerById(c.cert.workerId)} /> },
            { k: "c", label: "Document", render: (c) => CERT_LABEL[c.cert.type] },
            { k: "e", label: "Expiry", render: (c) => fmtISO(c.expires) },
            { k: "d", label: "Days", num: true, render: (c) => (c.days < 0 ? c.days : "+" + c.days) },
            { k: "r", label: "Required", render: (c) => { const w = workerById(c.cert.workerId); return w.siteId && requiredFor(w.siteId).includes(c.cert.type) ? "At " + siteById(w.siteId).name : "No"; } },
            { k: "s", label: "Status", render: (c) => <Badge tone={certTone(c)}>{c.requested ? "Requested · " + certText(c) : certText(c)}</Badge> },
          ]} empty="Nothing due in the next 90 days." />
      </Card>
    </>
  );
}

/* ── Site requirements ────────────────────────────────────────────────────── */

function SiteRequirements() {
  const st = useDemo();
  const [site, setSite] = useState<SiteId>("north-quay");
  const types: CertType[] = ["safe-pass", "manual-handling", "ind-north-quay", "ind-westbridge", "ind-ballymun", "ind-tallaght"];
  const s = siteById(site);
  const crew = allocated().filter((w) => w.siteId === site);
  const req = requiredFor(site);
  const compliantFor = (sid: SiteId, t: CertType) => {
    const c = allocated().filter((w) => w.siteId === sid);
    const ok = c.filter((w) => { const x = certsOf(w.id, st).find((y) => y.cert.type === t); return x && x.status !== "expired"; }).length;
    return { ok, n: c.length };
  };
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Site rules" value={SITE_RULES.length} sub={"Across " + SITES.length + " sites"} />
        <Kpi label="Rules fully met" value={SITE_RULES.filter((r) => { const x = compliantFor(r.siteId, r.cert); return x.ok === x.n; }).length + " / " + SITE_RULES.length} tone="ok" />
        <Kpi label="Rules with a gap" value={SITE_RULES.filter((r) => { const x = compliantFor(r.siteId, r.cert); return x.ok < x.n; }).length} tone="bad" sub="One or more crew fail the rule" />
        <Kpi label="Client-specific policies" value={SITE_RULES.filter((r) => r.cert === "manual-handling").length} sub="North Quay manual handling (demo policy)" tone="warn" />
      </div>
      <Card title="Requirement matrix" sub="Rows are sites, columns are documents. Cell shows crew meeting the rule. Grey = not required at that site.">
        <div className="wl-tw">
          <table className="wl-t" style={{ minWidth: 860 }}>
            <thead><tr><th>Site</th>{types.map((t) => <th key={t}>{CERT_LABEL[t]}</th>)}</tr></thead>
            <tbody>
              {SITES.map((x) => (
                <tr key={x.id} className={"click" + (x.id === site ? " sel" : "")} onClick={() => setSite(x.id)}>
                  <td><span className="ink">{x.name}</span><div style={{ fontSize: 11, color: "var(--faint)" }}>{allocated().filter((w) => w.siteId === x.id).length} crew</div></td>
                  {types.map((t) => {
                    const on = requiredFor(x.id).includes(t);
                    if (!on) return <td key={t}><div className="wl-cell" style={{ background: "var(--surface-faint)", color: "var(--faint)", border: "1px solid var(--border)" }}>n/a</div></td>;
                    const c = compliantFor(x.id, t);
                    const good = c.ok === c.n;
                    return <td key={t}><div className="wl-cell" title={SITE_RULES.find((r) => r.siteId === x.id && r.cert === t)?.rule}
                      style={{ background: good ? "var(--ok-soft)" : "var(--bad-soft)", color: good ? "var(--ok)" : "var(--bad)" }}>Required · {c.ok}/{c.n}</div></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="wl-g wl-g-21">
        <Card title={s.name + " · crew against site rules"} sub={s.instructions}
          right={<Btn small onClick={() => openDrawer({ kind: "site", id: site })}>Site record</Btn>}>
          <Table minWidth={620} rows={crew} onRow={(w) => openDrawer({ kind: "worker", id: w.id })}
            cols={[
              { k: "w", label: "Worker", render: (w) => <WorkerCell w={w} /> },
              ...req.map((t) => ({ k: t, label: certName(t), render: (w: Worker) => { const c = certsOf(w.id, st).find((y) => y.cert.type === t); return c ? <Badge tone={certTone(c)}>{certText(c)}</Badge> : <Badge tone="bad">Missing</Badge>; } })),
              { k: "r", label: "Clearance", render: (w) => { const r = readiness(w, st); return <Badge tone={readyTone(r.state)}>{readyText(r.state)}</Badge>; } },
            ]} />
        </Card>
        <div className="wl-stack">
          <Card title="Rules at this site">
            {SITE_RULES.filter((r) => r.siteId === site).map((r) => (
              <div key={r.cert} className="wl-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{CERT_LABEL[r.cert]}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.rule}</div>
                </div>
                {r.cert === "manual-handling" && <Badge tone="warn">Client policy</Badge>}
              </div>
            ))}
          </Card>
          <Note tone="warn">Why Sean Murphy is held: North Quay's site policy (a mock client rule in this demo) requires a current manual-handling record before entry. Sean's record expired on 14 Nov, so Sean stays assigned but is not cleared. This is the client's site rule, not a claim about what the law requires of every worker.</Note>
          <Note>Safe Pass applies to construction site entry generally. Inductions are run by each client and recorded here as the dates they give us.</Note>
        </div>
      </div>
    </>
  );
}

/* ── Audit ────────────────────────────────────────────────────────────────── */

const COMPLIANCE_WORDS = /manual|safe pass|induction|site access|compliance|document|upload|cleared|hold|certificate|expir/i;

function Audit() {
  const st = useDemo();
  const [kind, setKind] = useState<"all" | "agent" | "people" | "system">("all");
  const events = activity(st).filter((e) => COMPLIANCE_WORDS.test(e.title + " " + e.detail) || e.link?.page === "Compliance");
  const shown = events.filter((e) => kind === "all" || e.kind === kind || (kind === "people" && e.kind === "client"));
  const humans = events.filter((e) => e.kind === "people").length;
  const agents = events.filter((e) => e.kind === "agent").length;
  const demo = events.filter((e) => e.at.includes("demo")).length;
  const kindLabel = (k: string): ReactNode => k === "agent" ? <Badge tone="accent">Agent suggestion</Badge> : k === "people" ? <Badge tone="ok">Human decision</Badge> : k === "client" ? <Badge tone="info">Client</Badge> : <Badge tone="neutral">System</Badge>;
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Compliance events" value={events.length} sub="Anchored to the demo week" />
        <Kpi label="Agent flags" value={agents} sub="Proposals only. A person decides" tone="accent" />
        <Kpi label="Human decisions" value={humans} sub="Requests, approvals and holds" tone="ok" />
        <Kpi label="Demo actions this session" value={demo} sub={demo ? "Reset restores the canonical story" : "Try Expiring › Request update"} tone="info" onClick={() => navigate("Compliance", "expiring")} />
      </div>
      <div className="wl-g wl-g-21">
        <Card title="Audit trail" sub="Who did what, when, and whether a person or an agent did it. Newest first."
          right={<Seg value={kind} onChange={setKind} options={[{ id: "all", label: "All" }, { id: "agent", label: "Agents" }, { id: "people", label: "People" }, { id: "system", label: "System" }]} />}>
          <Table minWidth={720} rows={shown} onRow={(e) => e.link && navigate(e.link.page, e.link.tab)}
            cols={[
              { k: "at", label: "When", render: (e) => <span style={{ whiteSpace: "nowrap" }}>{e.at}</span> },
              { k: "who", label: "Actor", render: (e) => <span className="ink">{e.actor}</span> },
              { k: "t", label: "Event", render: (e) => <div><div className="ink">{e.title}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{e.detail}</div></div> },
              { k: "k", label: "Type", render: (e) => kindLabel(e.kind) },
            ]} empty="No compliance events for this filter." />
        </Card>
        <div className="wl-stack">
          <Card title="Approval policy">
            <div className="wl-row"><div style={{ flex: 1, fontSize: 12.5 }}>Agents may flag, draft reminders and propose holds</div><Badge tone="accent">Suggest</Badge></div>
            <div className="wl-row"><div style={{ flex: 1, fontSize: 12.5 }}>Accepting a document</div><Badge tone="ok">Elaine or Paul</Badge></div>
            <div className="wl-row"><div style={{ flex: 1, fontSize: 12.5 }}>Holding or releasing site access</div><Badge tone="ok">Paul</Badge></div>
            <div className="wl-row"><div style={{ flex: 1, fontSize: 12.5 }}>Messaging a worker</div><Badge tone="warn">Not connected in demo</Badge></div>
          </Card>
          <Note>This is a readable log of simulated reminders and approvals. It is not a statutory compliance record and makes no legal compliance claim.</Note>
        </div>
      </div>
    </>
  );
}

export default function ComplianceModule({ tab }: { tab: string }) {
  const sub: Record<string, string> = {
    overview: "Who can go on which site today, and which documents are about to stop them.",
    documents: "Every credential on file with issuer, dates, who checked it and the mock attachment.",
    expiring: "The three dates that matter this month, with the actions to close each one.",
    site: "What each client requires before entry, and who on each crew meets it.",
    audit: "Reminders, uploads, approvals and holds, in order.",
  };
  const id = sub[tab] ? tab : "overview";
  return (
    <Page>
      <Head title={tabLabel(id) === "Overview" ? "Compliance" : "Compliance · " + tabLabel(id)} sub={sub[id]} crumbs={crumbs(id)} />
      {id === "overview" && <Overview />}
      {id === "documents" && <Documents />}
      {id === "expiring" && <Expiring />}
      {id === "site" && <SiteRequirements />}
      {id === "audit" && <Audit />}
    </Page>
  );
}
