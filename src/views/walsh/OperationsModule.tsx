/* Operations · sites, allocations, client asks and capacity. This is Paul's
   internal view, so both client and contractor rates appear here. */
import { useState } from "react";
import { navigate, openDrawer, useDemo } from "../../demo/store";
import {
  allocated, available, certAlerts, certsOf, clientById, eur, forecastScenario, readiness, requestStatus, requiredFor, siteById, siteRows,
  workerById, workerHours, workersAt,
} from "../../demo/selectors";
import { clearCover, decideRequest, planCover } from "../../demo/actions";
import { CERT_LABEL, REQUESTS, SITES, WORKERS, type RequestStatus, type SiteId, type Worker, type WorkerId } from "../../demo/walshData";
import { MODULE_TABS } from "../../demo/nav";
import { Avatar, Badge, BarList, Btn, Card, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const tabLabel = (id: string) => MODULE_TABS.Operations.find((t) => t.id === id)?.label || "";
const crumbs = (tab: string) => [{ label: "Delivery" }, { label: "Operations", page: "Operations", tab: "overview" }, { label: tabLabel(tab) }];
const readyTone = (s: string): Tone => (s === "clear" ? "ok" : s === "held" ? "bad" : "info");
const first = (n: string) => n.split(" ")[0];
const reqTone = (s: RequestStatus): Tone => (s === "waiting_paul" ? "warn" : s === "open" ? "info" : s === "declined" ? "bad" : "ok");
const reqText = (s: RequestStatus) => ({ waiting_paul: "Waiting for Paul", open: "Open", approved: "Approved (demo)", declined: "Declined (demo)", fulfilled: "Fulfilled" } as Record<RequestStatus, string>)[s];

function Person({ w, sub }: { w: Worker; sub?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Avatar initials={w.initials} tint={w.tint} size={24} />
      <span style={{ minWidth: 0 }}>
        <span className="ink" style={{ display: "block", whiteSpace: "nowrap" }}>{w.name}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{sub ?? w.trade}</span>
      </span>
    </span>
  );
}

/* Available workers who meet every site rule at a site (for cover suggestions). */
function coverCandidates(site: SiteId, st: ReturnType<typeof useDemo>) {
  return available().filter((w) => !st.cover[w.id] && requiredFor(site).every((t) => {
    const c = certsOf(w.id, st).find((x) => x.cert.type === t);
    return c && c.status !== "expired";
  }));
}

/* ── Overview ─────────────────────────────────────────────────────────────── */

function Overview() {
  const st = useDemo();
  const rows = siteRows(st);
  const ca = certAlerts(st);
  const alloc = allocated();
  const asks = REQUESTS.filter((r) => ["waiting_paul", "open"].includes(requestStatus(r.id, st)));
  const submitted = rows.reduce((a, r) => a + r.hours, 0);
  const approvedH = rows.reduce((a, r) => a + r.approvedH, 0);
  return (
    <>
      <div className="wl-g wl-g-6">
        <Kpi label="Active sites" value={SITES.length} sub={new Set(SITES.map((s) => s.clientId)).size + " client accounts"} onClick={() => navigate("Operations", "sites")} />
        <Kpi label="Allocated" value={alloc.length} sub={"of " + WORKERS.length + " on the books"} onClick={() => navigate("Operations", "allocations")} />
        <Kpi label="Cleared for site" value={ca.clear.length} tone="ok" sub={ca.held.length + " on hold"} onClick={() => navigate("Compliance", "overview")} />
        <Kpi label="Blocked clearance" value={ca.held.length} tone={ca.held.length ? "bad" : "ok"} sub={ca.held.map((w) => w.name).join(", ") || "None"} onClick={() => navigate("Compliance", "expiring")} />
        <Kpi label="Hours · wk 46" value={submitted + "h"} sub={approvedH + "h approved"} onClick={() => navigate("Timesheets", "overview")} />
        <Kpi label="Open client asks" value={asks.length} tone={asks.length ? "warn" : "ok"} sub={asks.map((r) => r.id).join(", ")} onClick={() => navigate("Operations", "requests")} />
      </div>

      {ca.held.map((w) => {
        const cands = coverCandidates(w.siteId!, st);
        const planned = Object.entries(st.cover).find(([, c]) => c.covering === w.id);
        return (
          <Card key={w.id} title={"Blocked clearance · " + w.name + " at " + siteById(w.siteId!).name} sub={readiness(w, st).reasons.join(" · ")}
            right={<Badge tone="bad">Assigned, not cleared</Badge>}>
            <div className="wl-g wl-g-21">
              <Note tone="bad">{w.name} can't enter {siteById(w.siteId!).name} until the record is current. Ops Watchdog suggested cover at 07:30. {planned ? first(workerById(planned[0]).name) + " is planned as cover from " + planned[1].from + "." : cands.length ? first(cands[0].name) + " meets every site rule and is free." : "Nobody free meets every site rule."}</Note>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {!planned && cands[0] && <Btn kind="primary" small onClick={() => planCover(cands[0].id, w.siteId!, w.id)}>Plan {first(cands[0].name)} as cover</Btn>}
                <Btn small onClick={() => navigate("Compliance", "expiring")}>Resolve the document</Btn>
                <Btn small kind="ghost" onClick={() => openDrawer({ kind: "worker", id: w.id })}>Open record</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="wl-g wl-g-21">
        <Card title="Sites this week" sub="Crew, clearance and how much of the week is signed off. Click a site for its record.">
          <div className="wl-g wl-g-2 stretch">
            {rows.map((r) => {
              const crew = workersAt(r.site.id);
              const held = crew.filter((w) => readiness(w, st).state === "held").length;
              const reqs = REQUESTS.filter((q) => q.siteId === r.site.id && ["waiting_paul", "open"].includes(requestStatus(q.id, st)));
              const tone: Tone = held ? "bad" : r.pendingH ? "warn" : "ok";
              return (
                <button key={r.site.id} className="wl-kpi" onClick={() => openDrawer({ kind: "site", id: r.site.id })} style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.site.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.client.name} · {r.site.shift}</div>
                    </div>
                    <Badge tone={tone}>{held ? held + " held" : r.pendingH ? r.pendingH + "h pending" : "On track"}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "var(--body)" }}>
                    <span>{crew.length} crew</span><span>{r.hours}h</span><span>{eur(r.contribution)} contribution</span>
                  </div>
                  <div className="wl-bar" style={{ marginTop: 10 }} title={r.approvedH + " of " + r.hours + "h approved"}>
                    <span style={{ width: (r.approvedH / r.hours) * 100 + "%", background: r.pendingH ? "var(--warn)" : "var(--ok)" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>{r.approvedH}/{r.hours}h approved{reqs.length ? " · " + reqs.map((q) => q.id).join(", ") + " open" : ""}</div>
                </button>
              );
            })}
            <div className="wl-kpi" style={{ padding: 14, background: "var(--surface-faint)" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Bench</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>Available for cover or new work</div>
              {available().map((w) => <div key={w.id} className="wl-row" style={{ padding: "8px 0" }}><Person w={w} sub={"Free from " + w.availableFrom} />{st.cover[w.id] && <Badge tone="accent">Planned</Badge>}</div>)}
            </div>
          </div>
        </Card>

        <div className="wl-stack">
          <Card title="Hours signed off by site" sub="Week 46 · approved hours of submitted">
            <BarList fmt={(n) => n + "h"} max={200} axis={[0, 50, 100, 150, 200]}
              items={rows.map((r) => ({ label: r.site.name, sub: r.pendingH ? r.pendingH + "h awaiting client" : "all approved", value: r.approvedH, tone: r.pendingH ? "var(--warn)" : "var(--series-b)", onClick: () => navigate("Timesheets", "submissions"), title: r.approvedH + " of " + r.hours + "h approved" }))} />
          </Card>
          <Card title="Client asks" sub="Waiting on Paul or still open">
            {asks.length === 0 && <Note tone="ok">No open client asks.</Note>}
            {asks.map((r) => (
              <div key={r.id} className="wl-row click" style={{ padding: "10px 6px" }} onClick={() => navigate("Operations", "requests")}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{r.id} · {r.title}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{clientById(r.clientId).name} · {r.raised}</div>
                </div>
                <Badge tone={reqTone(requestStatus(r.id, st))}>{reqText(requestStatus(r.id, st))}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Site allocations ─────────────────────────────────────────────────────── */

const DAYS16 = [{ id: "mon", label: "Mon 16", i: 0 }, { id: "tue", label: "Tue 17", i: 1 }, { id: "wed", label: "Wed 18", i: 2 }, { id: "thu", label: "Thu 19", i: 3 }, { id: "fri", label: "Fri 20", i: 4 }] as const;
type DayId = (typeof DAYS16)[number]["id"];

function Allocations() {
  const st = useDemo();
  const [day, setDay] = useState<DayId>("tue");
  const [site, setSite] = useState<"all" | SiteId>("all");
  const [clear, setClear] = useState<"all" | "clear" | "held">("all");
  const [mover, setMover] = useState<WorkerId>("mark-dunne");
  const [target, setTarget] = useState<SiteId>("north-quay");
  const di = DAYS16.find((d) => d.id === day)!.i;
  type Row = { w: Worker; site: SiteId; cover?: { covering?: WorkerId; from: string } };
  const base: Row[] = allocated().map((w) => ({ w, site: w.siteId! }));
  const covers: Row[] = di >= 1 ? Object.entries(st.cover).map(([id, c]) => ({ w: workerById(id), site: c.siteId, cover: { covering: c.covering, from: c.from } })) : [];
  const all = base.filter((r) => !(st.cover[r.w.id] && di >= 1)).concat(covers);
  const rows = all.filter((r) => (site === "all" || r.site === site) && (clear === "all" || (clear === "held" ? readiness(r.w, st).state === "held" : readiness(r.w, st).state !== "held")))
    .sort((a, b) => SITES.findIndex((s) => s.id === a.site) - SITES.findIndex((s) => s.id === b.site));
  const heldN = all.filter((r) => readiness(r.w, st).state === "held").length;
  const mw = workerById(mover);
  const moverMissing = requiredFor(target).filter((t) => { const c = certsOf(mw.id, st).find((x) => x.cert.type === t); return !c || c.status === "expired"; });
  const heldAtTarget = workersAt(target).find((w) => readiness(w, st).state === "held");
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label={"On the board · " + DAYS16[di].label} value={all.length} sub={covers.length ? covers.length + " planned cover included" : "Allocated crew"} />
        <Kpi label="Cleared" value={all.length - heldN} tone="ok" onClick={() => setClear("clear")} />
        <Kpi label="Held" value={heldN} tone={heldN ? "bad" : "ok"} sub="Assigned, not approved for entry" onClick={() => setClear("held")} />
        <Kpi label="Bench" value={available().filter((w) => !st.cover[w.id]).length} tone="info" sub={available().filter((w) => !st.cover[w.id]).map((w) => first(w.name)).join(" · ") || "Everyone placed"} onClick={() => navigate("Operations", "capacity")} />
      </div>
      <div className="wl-g wl-g-21">
        <Card title="Allocation board · week of 16 Nov" sub="Date, site, shift, worker, role, clearance and rates. Internal view."
          right={<Seg value={day} onChange={setDay} label="Day" options={DAYS16.map((d) => ({ id: d.id, label: d.label }))} />}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <select className="wl-in" value={site} onChange={(e) => setSite(e.target.value as "all" | SiteId)} aria-label="Site filter">
              <option value="all">All sites</option>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Seg value={clear} onChange={setClear} label="Clearance" options={[{ id: "all", label: "All" }, { id: "clear", label: "Cleared" }, { id: "held", label: "Held" }]} />
          </div>
          <Table minWidth={900} rows={rows} onRow={(r) => openDrawer({ kind: "worker", id: r.w.id })} empty="Nobody matches these filters."
            cols={[
              { k: "d", label: "Date", render: () => DAYS16[di].label + " Nov" },
              { k: "s", label: "Site", render: (r) => <span className="ink">{siteById(r.site).name}</span> },
              { k: "sh", label: "Shift", hideSm: true, render: (r) => siteById(r.site).shift },
              { k: "w", label: "Worker", render: (r) => <Person w={r.w} sub={r.cover ? "Cover" + (r.cover.covering ? " for " + workerById(r.cover.covering).name : "") : r.w.trade} /> },
              { k: "c", label: "Clearance", render: (r) => { const rd = readiness(r.w, st); return rd.state === "held" ? <Badge tone="bad" title={rd.reasons.join(" · ")}>Held · not cleared</Badge> : r.cover ? <Badge tone="accent">Planned cover</Badge> : <Badge tone={readyTone(rd.state)}>{rd.warnings.length ? "Cleared · expiring" : "Cleared"}</Badge>; } },
              { k: "cr", label: "Contractor", num: true, render: (r) => "€" + r.w.costRate + "/h" },
              { k: "br", label: "Client", num: true, render: (r) => "€" + siteById(r.site).billRate + "/h" },
              { k: "a", label: "", render: (r) => r.cover ? <Btn small kind="ghost" onClick={() => clearCover(r.w.id)}>Undo</Btn> : null },
            ]} />
        </Card>

        <div className="wl-stack">
          <Card title="Reassign or plan cover" sub="Roster preview from Tue 17 Nov. Nobody is notified from the demo.">
            <div className="wl-stack" style={{ gap: 10 }}>
              <select className="wl-in" value={mover} onChange={(e) => setMover(e.target.value)} aria-label="Worker">
                {WORKERS.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.siteId ? siteById(w.siteId).name : "bench"}</option>)}
              </select>
              <select className="wl-in" value={target} onChange={(e) => setTarget(e.target.value as SiteId)} aria-label="Target site">
                {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {moverMissing.length ? <Note tone="bad">{mw.name} fails {siteById(target).name} rules: {moverMissing.map((t) => CERT_LABEL[t]).join(", ")}.</Note> : <Note tone="ok">{mw.name} meets every {siteById(target).name} site rule.</Note>}
              {mw.siteId && mw.siteId !== target && <Note tone="warn">Moving {first(mw.name)} leaves {siteById(mw.siteId).name} a person short.</Note>}
              <Btn kind="primary" disabled={moverMissing.length > 0 || mw.siteId === target} onClick={() => planCover(mover, target, heldAtTarget && heldAtTarget.id !== mover ? heldAtTarget.id : undefined)}>
                {mw.siteId === target ? "Already on this site" : "Plan " + first(mw.name) + " for " + siteById(target).name + " (demo)"}
              </Btn>
            </div>
          </Card>
          <Card title="Ops Watchdog" sub="Mon 16 Nov 07:30 · suggestion">
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>Sean Murphy's expired manual-handling record blocks tomorrow's North Quay roster. Mark Dunne is available, inducted for North Quay and does the same work.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {st.cover["mark-dunne"] ? <Badge tone="accent">Mark planned from {st.cover["mark-dunne"].from}</Badge> : <Btn small kind="primary" onClick={() => planCover("mark-dunne", "north-quay", "sean-murphy")}>Accept · plan Mark</Btn>}
              <Btn small kind="ghost" onClick={() => navigate("Agents", "review")}>Review queue</Btn>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Sites ────────────────────────────────────────────────────────────────── */

function Sites() {
  const st = useDemo();
  const rows = siteRows(st);
  const [id, setId] = useState<SiteId>("north-quay");
  const r = rows.find((x) => x.site.id === id)!;
  const s = r.site;
  const crew = workersAt(id);
  const contact = r.client.contacts.find((c) => c.role.includes(s.name.split(" ")[0])) || r.client.contacts[0];
  const reqs = REQUESTS.filter((q) => q.siteId === id);
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Sites" value={SITES.length} />
        <Kpi label="Rates confirmed in writing" value={SITES.filter((x) => x.rateConfirmed).length + " / " + SITES.length} tone={SITES.every((x) => x.rateConfirmed) ? "ok" : "warn"} onClick={() => navigate("Clients", "rates")} />
        <Kpi label="Highest contribution" value={[...rows].sort((a, b) => b.contribution - a.contribution)[0].site.name} sub={eur([...rows].sort((a, b) => b.contribution - a.contribution)[0].contribution) + " wk 46"} />
        <Kpi label="Thinnest margin" value={[...rows].sort((a, b) => a.margin - b.margin)[0].site.name} sub={[...rows].sort((a, b) => a.margin - b.margin)[0].margin.toFixed(1) + "% gross"} tone="warn" />
      </div>
      <div className="wl-g wl-g-12">
        <Card title="All sites" sub="Pick one for the detail panel">
          {rows.map((x) => (
            <div key={x.site.id} className="wl-row click" style={{ padding: "11px 8px", background: x.site.id === id ? "var(--accent-faint)" : undefined }} onClick={() => setId(x.site.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: x.site.id === id ? 600 : 500 }}>{x.site.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{x.client.name} · {x.workers} crew · {x.hours}h</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{eur(x.contribution)}</div>
                <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{x.margin.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </Card>

        <div className="wl-stack">
          <Card title={s.name} sub={r.client.name + " · " + s.location}
            right={<><Btn small onClick={() => openDrawer({ kind: "client", id: s.clientId })}>Client</Btn><Btn small onClick={() => openDrawer({ kind: "site", id })}>Site record</Btn></>}>
            <div className="wl-g wl-g-4">
              <Stat k="Crew" v={crew.length} sub={s.shift} />
              <Stat k="Hours · wk 46" v={r.hours + "h"} sub={r.pendingH ? r.pendingH + "h pending client" : "all approved"} />
              <Stat k="Client / contractor" v={"€" + s.billRate + " / €" + s.costRate} sub={s.rateConfirmed ? "Confirmed" : "Not confirmed in writing"} />
              <Stat k="Gross contribution" v={eur(r.contribution)} sub={r.margin.toFixed(1) + "% · before overhead"} />
              <Stat k="Billing · wk 46" v={eur(r.revenue)} sub={eur(r.ready) + " invoice-ready"} />
              <Stat k="Contractor cost" v={eur(r.cost)} />
              <Stat k="Contract" v={s.contractEnd} sub={"Rate from " + s.rateEffective} />
              <Stat k="Site contact" v={contact.name} sub={contact.email} />
            </div>
            <div style={{ marginTop: 12 }}><Note>{s.instructions}</Note></div>
          </Card>
          <div className="wl-g wl-g-2">
            <Card title="Crew" sub="Click for the worker record">
              {crew.map((w) => {
                const rd = readiness(w, st);
                return (
                  <div key={w.id} className="wl-row click" style={{ padding: "8px 6px" }} onClick={() => openDrawer({ kind: "worker", id: w.id })}>
                    <Person w={w} />
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>{workerHours(w)}h</span>
                    <Badge tone={readyTone(rd.state)}>{rd.state === "held" ? "Held" : rd.warnings.length ? "Expiring" : "Cleared"}</Badge>
                  </div>
                );
              })}
            </Card>
            <div className="wl-stack">
              <Card title="Required documents">
                {requiredFor(id).map((t) => {
                  const ok = crew.filter((w) => { const c = certsOf(w.id, st).find((x) => x.cert.type === t); return c && c.status !== "expired"; }).length;
                  return <div key={t} className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>{CERT_LABEL[t]}{t === "manual-handling" ? " · client policy (demo)" : ""}</span><Badge tone={ok === crew.length ? "ok" : "bad"}>{ok}/{crew.length}</Badge></div>;
                })}
              </Card>
              <Card title="Issues & requests">
                {s.issues.length === 0 && reqs.length === 0 && <Note tone="ok">Nothing open on this site.</Note>}
                {s.issues.map((i) => <div key={i} style={{ marginBottom: 6 }}><Note tone="warn">{i}</Note></div>)}
                {reqs.map((q) => <div key={q.id} className="wl-row click" onClick={() => navigate("Operations", "requests")}><span style={{ flex: 1, fontSize: 12.5 }}>{q.id} · {q.title}</span><Badge tone={reqTone(requestStatus(q.id, st))}>{reqText(requestStatus(q.id, st))}</Badge></div>)}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Client requests ──────────────────────────────────────────────────────── */

function Requests() {
  const st = useDemo();
  const [sel, setSel] = useState("REQ-204");
  const [filter, setFilter] = useState<"all" | "action" | "done">("all");
  const statusOf = (id: string) => requestStatus(id, st);
  const rows = REQUESTS.filter((r) => filter === "all" || (filter === "action" ? ["waiting_paul", "open"].includes(statusOf(r.id)) : !["waiting_paul", "open"].includes(statusOf(r.id))));
  const r = REQUESTS.find((x) => x.id === sel)!;
  const s = statusOf(r.id);
  const nq = workersAt("north-quay");
  const markCover = st.cover["mark-dunne"];
  const roster = nq.map((w) => ({ w, rd: readiness(w, st) }));
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Waiting for Paul" value={REQUESTS.filter((x) => statusOf(x.id) === "waiting_paul").length} tone="warn" onClick={() => setFilter("action")} />
        <Kpi label="Open" value={REQUESTS.filter((x) => statusOf(x.id) === "open").length} tone="info" onClick={() => setFilter("action")} />
        <Kpi label="Decided or fulfilled" value={REQUESTS.filter((x) => !["waiting_paul", "open"].includes(statusOf(x.id))).length} tone="ok" onClick={() => setFilter("done")} />
        <Kpi label="Source" value="Mock portal" sub="Illustrative requests, not real client messages" />
      </div>
      <div className="wl-g wl-g-12">
        <Card title="Request queue" right={<Seg value={filter} onChange={setFilter} options={[{ id: "all", label: "All" }, { id: "action", label: "Needs action" }, { id: "done", label: "Done" }]} />}>
          {rows.map((x) => (
            <div key={x.id} className="wl-row click" style={{ padding: "11px 8px", background: x.id === sel ? "var(--accent-faint)" : undefined }} onClick={() => setSel(x.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{x.id} · {x.kind}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{x.title}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{clientById(x.clientId).name} · {siteById(x.siteId).name}</div>
              </div>
              <Badge tone={reqTone(statusOf(x.id))}>{reqText(statusOf(x.id))}</Badge>
            </div>
          ))}
          {rows.length === 0 && <Note>No requests in this filter.</Note>}
        </Card>

        <div className="wl-stack">
          <Card title={r.id + " · " + r.title} sub={clientById(r.clientId).name + " · " + siteById(r.siteId).name + " · raised " + r.raised}
            right={<Badge tone={reqTone(s)}>{reqText(s)}</Badge>}>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--body)" }}>{r.detail}</div>
            <div className="wl-g wl-g-3" style={{ marginTop: 12 }}>
              <Stat k="Owner" v={r.owner} />
              <Stat k="Type" v={r.kind} />
              <Stat k="Approval" v={r.id === "REQ-204" ? "Paul publishes roster" : r.id === "REQ-206" ? "Client signs hours" : "Paul decides"} />
            </div>

            {r.id === "REQ-204" && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "16px 0 8px" }}>Roster preview the client would see · North Quay · week of 16 Nov</div>
                <Table minWidth={520} rows={roster} cols={[
                  { k: "w", label: "Named worker", render: (x) => <Person w={x.w} /> },
                  { k: "s", label: "Mon 16", render: (x) => x.rd.state === "held" ? <Badge tone="bad">Not on site</Badge> : <Badge tone="ok">On site</Badge> },
                  { k: "t", label: "Tue 17 onward", render: (x) => x.rd.state === "held" ? (markCover?.covering === x.w.id ? <Badge tone="accent">Covered by Mark Dunne</Badge> : <Badge tone="bad">Gap</Badge>) : <Badge tone="ok">On site</Badge> },
                ]} />
                {!markCover && roster.some((x) => x.rd.state === "held") && (
                  <div style={{ marginTop: 10 }}><Note tone="warn">The draft relies on Mark Dunne covering Sean. Mark isn't planned yet. <button className="wl-link" onClick={() => planCover("mark-dunne", "north-quay", "sean-murphy")}>Plan Mark as cover</button></Note></div>
                )}
                <div style={{ marginTop: 10 }}><Note>Only names, days and site appear in the client view. No contractor rates or other clients' data.</Note></div>
              </>
            )}
            {r.id === "REQ-205" && <div style={{ marginTop: 12 }}><Note tone="warn">Jakub Zieliński is free and inducted for Westbridge sites but is a steel fixer; Harbour Road wants groundworks. Check scope before offering. <button className="wl-link" onClick={() => navigate("Operations", "capacity")}>See capacity</button></Note></div>}
            {r.id === "REQ-206" && <div style={{ marginTop: 12 }}><Note tone="warn">Linked to TS-1098 and the €320 hold. <button className="wl-link" onClick={() => navigate("Timesheets", "approval")}>Open the approval</button></Note></div>}

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {(s === "waiting_paul" || s === "open") && r.id !== "REQ-206" && (
                <>
                  <Btn kind="primary" onClick={() => decideRequest(r.id, "approved")}>{r.id === "REQ-204" ? "Approve & publish roster (demo)" : "Approve (demo)"}</Btn>
                  <Btn kind="danger" onClick={() => decideRequest(r.id, "declined")}>Decline (demo)</Btn>
                </>
              )}
              {(s === "approved" || s === "declined") && <Note tone={s === "approved" ? "ok" : "bad"}>{s === "approved" ? "Approved in the demo. Shown as published in the client portal simulation. Nothing was sent." : "Declined in the demo. Nothing was sent."}</Note>}
              <Btn kind="ghost" onClick={() => navigate("Clients", "portal")}>Client portal preview</Btn>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Capacity ─────────────────────────────────────────────────────────────── */

function Capacity() {
  const st = useDemo();
  const rows = siteRows(st);
  const bench = available();
  const f = forecastScenario(st.forecast);
  const unfilled = REQUESTS.filter((r) => r.kind === "Extra labour" && ["waiting_paul", "open"].includes(requestStatus(r.id, st)));
  const utilisation = (allocated().length / WORKERS.length) * 100;
  const fit = (w: Worker) => SITES.map((s) => {
    const miss = requiredFor(s.id).filter((t) => { const c = certsOf(w.id, st).find((x) => x.cert.type === t); return !c || c.status === "expired"; });
    return { s, ok: miss.length === 0, miss };
  });
  return (
    <>
      <div className="wl-g wl-g-6">
        <Kpi label="On the books" value={WORKERS.length} />
        <Kpi label="Booked" value={allocated().length} sub={utilisation.toFixed(0) + "% of the crew placed"} />
        <Kpi label="On the bench" value={bench.filter((w) => !st.cover[w.id]).length} tone="info" sub={bench.map((w) => first(w.name) + (st.cover[w.id] ? " (planned)" : "")).join(" · ")} />
        <Kpi label="Unfilled asks" value={unfilled.length} tone={unfilled.length ? "warn" : "ok"} sub={unfilled.map((r) => r.id).join(", ") || "None"} onClick={() => navigate("Operations", "requests")} />
        <Kpi label={"Scenario · +" + st.forecast.addWorkers + " workers"} value={"+" + f.add.hours.toLocaleString("en-IE") + "h"} sub={st.forecast.weeks + " weeks at " + st.forecast.hoursPerWorker + "h/week"} tone="accent" onClick={() => navigate("Finance", "forecast")} />
        <Kpi label="Scenario contribution" value={"+" + eur(f.add.contribution)} sub={"€" + st.forecast.billRate + " bill / €" + st.forecast.costRate + " cost"} tone="accent" onClick={() => navigate("Finance", "forecast")} />
      </div>

      <div className="wl-g wl-g-2">
        {bench.map((w) => {
          const cov = st.cover[w.id];
          return (
            <Card key={w.id} title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar initials={w.initials} tint={w.tint} size={28} />{w.name}</span>}
              sub={w.trade + " · free from " + w.availableFrom} right={cov ? <Badge tone="accent">Planned · {siteById(cov.siteId).name}</Badge> : <Badge tone="info">Available</Badge>}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{w.skills.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}</div>
              {w.note && <div style={{ marginTop: 10 }}><Note>{w.note}</Note></div>}
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "12px 0 6px" }}>Site rules met</div>
              {fit(w).map((x) => (
                <div key={x.s.id} className="wl-row" style={{ padding: "7px 0" }}>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{x.s.name}</span>
                  {x.ok ? <Badge tone="ok">Can start</Badge> : <Badge tone="bad" title={x.miss.map((t) => CERT_LABEL[t]).join(", ")}>Needs {x.miss.map((t) => CERT_LABEL[t].replace(" site induction", " induction")).join(", ")}</Badge>}
                  {x.ok && !cov && <Btn small kind="ghost" onClick={() => planCover(w.id, x.s.id, workersAt(x.s.id).find((y) => readiness(y, st).state === "held")?.id)}>Plan</Btn>}
                </div>
              ))}
              {cov && <div style={{ marginTop: 8 }}><Btn small kind="ghost" onClick={() => clearCover(w.id)}>Remove plan</Btn></div>}
            </Card>
          );
        })}
      </div>

      <div className="wl-g wl-g-3">
        <Card title="Booked crew by site" sub="Allocated workers, week of 16 Nov">
          <BarList fmt={(n) => String(n)} max={Math.max(...rows.map((r) => r.workers))} axis={[0, 1, 2, 3, 4, 5]}
            items={rows.map((r) => ({ label: r.site.name, sub: r.client.name, value: r.workers, onClick: () => openDrawer({ kind: "site", id: r.site.id }) }))} />
        </Card>
        <Card title="Unfilled requests">
          {unfilled.length === 0 && <Note tone="ok">No extra-labour requests open.</Note>}
          {unfilled.map((r) => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13 }}>{r.id} · {r.title}</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{r.detail}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn small onClick={() => navigate("Operations", "requests")}>Open request</Btn></div>
            </div>
          ))}
          <Note>Filling REQ-205 with a new hire is the same maths as the +2 scenario: see Finance › Forecast.</Note>
        </Card>
        <Card title="Planned expansion" sub={"Finance scenario · " + st.forecast.weeks + " weeks"}>
          <div className="wl-g wl-g-2">
            <Stat k="Extra hours" v={f.add.hours.toLocaleString("en-IE") + "h"} />
            <Stat k="Extra revenue" v={eur(f.add.revenue)} />
            <Stat k="Extra contractor cost" v={eur(f.add.cost)} />
            <Stat k="Extra contribution" v={eur(f.add.contribution)} sub="Gross, before overhead" />
          </div>
          <div style={{ marginTop: 10 }}><Btn small kind="primary" onClick={() => navigate("Finance", "forecast")}>Edit in Finance › Forecast</Btn></div>
        </Card>
      </div>

      <Card title="Rate implications by site" sub="What €1/h on the contractor rate costs each week, at last week's hours. Gross contribution, not net income.">
        <Table minWidth={760} rows={rows} onRow={(r) => openDrawer({ kind: "site", id: r.site.id })}
          cols={[
            { k: "s", label: "Site", render: (r) => <span className="ink">{r.site.name}</span> },
            { k: "b", label: "Client rate", num: true, render: (r) => "€" + r.site.billRate },
            { k: "c", label: "Contractor rate", num: true, render: (r) => "€" + r.site.costRate },
            { k: "sp", label: "Spread / h", num: true, render: (r) => "€" + (r.site.billRate - r.site.costRate) },
            { k: "m", label: "Margin", num: true, render: (r) => r.margin.toFixed(1) + "%" },
            { k: "h", label: "Hours wk 46", num: true, render: (r) => r.hours + "h" },
            { k: "i", label: "+€1/h cost", num: true, render: (r) => "−" + eur(r.hours) + "/wk" },
          ]}
          foot={["All sites", "", "", "", "", rows.reduce((a, r) => a + r.hours, 0) + "h", "−" + eur(rows.reduce((a, r) => a + r.hours, 0)) + "/wk"]} />
      </Card>
    </>
  );
}

export default function OperationsModule({ tab }: { tab: string }) {
  const sub: Record<string, string> = {
    overview: "Five sites, who is on them, what is signed off, and the one thing blocking a roster.",
    allocations: "The board for this week: who is where, on what shift, cleared or not.",
    sites: "Everything about one site in one place.",
    requests: "What clients have asked for, and what is waiting on Paul.",
    capacity: "Who is free, what is unfilled, and what growing the crew would mean.",
  };
  const id = sub[tab] ? tab : "overview";
  return (
    <Page>
      <Head title={id === "overview" ? "Operations" : "Operations · " + tabLabel(id)} sub={sub[id]} crumbs={crumbs(id)} />
      {id === "overview" && <Overview />}
      {id === "allocations" && <Allocations />}
      {id === "sites" && <Sites />}
      {id === "requests" && <Requests />}
      {id === "capacity" && <Capacity />}
    </Page>
  );
}
