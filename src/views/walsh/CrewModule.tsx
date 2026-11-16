/* Crew · the 17 subcontractors on the books (not payroll employees).
   Directory, deep profiles, availability with simulated cover, onboarding and
   a scoped worker-portal preview. All figures come from selectors. */
import { useState, type ReactNode } from "react";
import { navigate, openDrawer, setDemo, useDemo } from "../../demo/store";
import {
  activity, allocated, available, certAlerts, certsOf, clientById, eur, fmtISO, readiness, requiredFor, siteById, tsStatus, workerById,
  workerHours, workerRows, type CertState,
} from "../../demo/selectors";
import { clearCover, planCover, requestDocument, simulateUpload, verifyDocument } from "../../demo/actions";
import { CERT_LABEL, DAYS, SITES, TIMESHEETS, WORKERS, type CertType, type SiteId, type Worker, type WorkerId } from "../../demo/walshData";
import { MODULE_TABS } from "../../demo/nav";
import { Avatar, Badge, Btn, Card, Field, Head, Kpi, Note, Page, Seg, Stat, Table, type Tone } from "./ui";

const tabLabel = (id: string) => MODULE_TABS.Crew.find((t) => t.id === id)?.label || "";
const crumbs = (tab: string) => [{ label: "Delivery" }, { label: "Crew", page: "Crew", tab: "directory" }, { label: tabLabel(tab) }];
const readyTone = (s: string): Tone => (s === "clear" ? "ok" : s === "held" ? "bad" : "info");
const readyText = (s: string) => (s === "clear" ? "Cleared" : s === "held" ? "Compliance hold" : "Available");
const certTone = (c: CertState): Tone => (c.review ? "info" : c.status === "valid" ? "ok" : c.status === "expiring" ? "warn" : "bad");
const certText = (c: CertState) => (c.review ? "Upload in review" : c.status === "valid" ? "Valid" : c.status === "expiring" ? c.days + " days left" : "Expired");
const first = (n: string) => n.split(" ")[0];
const shortSite = (id: SiteId) => ({ "north-quay": "North Quay", "harbour-road": "Harbour Rd", ballymun: "Ballymun", tallaght: "Tallaght", navan: "Navan" } as Record<SiteId, string>)[id];

function Person({ w, sub }: { w: Worker; sub?: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0 }}>
      <Avatar initials={w.initials} tint={w.tint} size={26} />
      <span style={{ minWidth: 0 }}>
        <span className="ink" style={{ display: "block", whiteSpace: "nowrap" }}>{w.name}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{sub ?? w.trade}</span>
      </span>
    </span>
  );
}

/* Compliance + skills check for placing a worker on a site (simulation only). */
function placementCheck(w: Worker, site: SiteId, st: ReturnType<typeof useDemo>) {
  const certs = certsOf(w.id, st);
  const missing: string[] = [];
  const expiring: string[] = [];
  for (const t of requiredFor(site)) {
    const c = certs.find((x) => x.cert.type === t);
    if (!c || c.status === "expired") missing.push(CERT_LABEL[t] + (c ? " expired" : " missing"));
    else if (c.status === "expiring") expiring.push(CERT_LABEL[t] + " expires " + fmtISO(c.expires));
  }
  const crewSkills = new Set(WORKERS.filter((x) => x.siteId === site && x.id !== w.id).flatMap((x) => x.skills));
  const overlap = w.skills.filter((s) => crewSkills.has(s));
  return { missing, expiring, overlap, alreadyPlaced: !!w.siteId && w.siteId !== site, manualHold: !!st.manualHolds[w.id] };
}

/* ── Directory ────────────────────────────────────────────────────────────── */

function Directory() {
  const st = useDemo();
  const rows = workerRows(st);
  const [group, setGroup] = useState<"all" | "clear" | "held" | "available">("all");
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState("all");
  const [skill, setSkill] = useState("all");
  const [site, setSite] = useState("all");
  const trades = Array.from(new Set(WORKERS.map((w) => w.trade))).sort();
  const skills = Array.from(new Set(WORKERS.flatMap((w) => w.skills))).sort();
  const filtered = rows.filter((r) => {
    if (group !== "all" && r.ready.state !== group) return false;
    if (trade !== "all" && r.w.trade !== trade) return false;
    if (skill !== "all" && !r.w.skills.includes(skill)) return false;
    if (site !== "all" && (site === "none" ? r.w.siteId !== null : r.w.siteId !== site)) return false;
    if (q && !(r.w.name + " " + r.w.trade + " " + r.w.skills.join(" ") + " " + (r.site?.name || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const groups: { id: "clear" | "held" | "available"; title: string; sub: string }[] = [
    { id: "clear", title: "Allocated · site cleared", sub: "Working this week with every site rule met" },
    { id: "held", title: "Allocated · compliance hold", sub: "Assigned but not approved for site entry" },
    { id: "available", title: "Available", sub: "Not allocated. Ready for cover or new work" },
  ];
  const n = (s: string) => rows.filter((r) => r.ready.state === s).length;
  const ca = certAlerts(st);
  return (
    <>
      <div className="wl-g wl-g-6">
        <Kpi label="On the books" value={rows.length} sub="Subcontractors, not payroll employees" />
        <Kpi label="Allocated" value={allocated().length} sub={"Across " + SITES.length + " sites"} onClick={() => navigate("Operations", "allocations")} />
        <Kpi label="Site cleared" value={n("clear")} tone="ok" onClick={() => setGroup("clear")} />
        <Kpi label="Compliance hold" value={n("held")} tone={n("held") ? "bad" : "ok"} sub={rows.filter((r) => r.ready.state === "held").map((r) => r.w.name).join(", ") || "Nobody"} onClick={() => setGroup("held")} />
        <Kpi label="Available" value={n("available")} tone="info" sub={available().map((w) => first(w.name)).join(" · ")} onClick={() => setGroup("available")} />
        <Kpi label="Docs expiring ≤ 30d" value={ca.expiring.length} tone={ca.expiring.length ? "warn" : "ok"} onClick={() => navigate("Compliance", "expiring")} />
      </div>
      <Card title="Crew directory" sub="Click anyone for the full record. Contractor rates are internal and never shown to clients."
        right={
          <>
            <input className="wl-in" placeholder="Search name, trade, skill, site" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 230 }} />
            <select className="wl-in" value={trade} onChange={(e) => setTrade(e.target.value)} aria-label="Trade">
              <option value="all">All trades</option>{trades.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="wl-in" value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Skill">
              <option value="all">All skills</option>{skills.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="wl-in" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Site">
              <option value="all">All sites</option>{SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value="none">Unallocated</option>
            </select>
          </>
        }>
        <div style={{ marginBottom: 10 }}>
          <Seg value={group} onChange={setGroup} label="Readiness" options={[
            { id: "all", label: "Everyone", count: rows.length }, { id: "clear", label: "Cleared", count: n("clear") },
            { id: "held", label: "Held", count: n("held") }, { id: "available", label: "Available", count: n("available") }]} />
        </div>
        {groups.filter((g) => group === "all" || group === g.id).map((g) => {
          const gr = filtered.filter((r) => r.ready.state === g.id);
          return (
            <div key={g.id} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "4px 2px 8px" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                <span style={{ fontSize: 12, color: "var(--faint)" }}>{gr.length} · {g.sub}</span>
              </div>
              <Table minWidth={980} rows={gr} onRow={(r) => openDrawer({ kind: "worker", id: r.w.id })} empty="Nobody matches these filters in this group."
                cols={[
                  { k: "w", label: "Worker", w: 220, render: (r) => <Person w={r.w} /> },
                  { k: "s", label: "Site", render: (r) => r.site ? <span><span className="ink">{r.site.name}</span><div style={{ fontSize: 11, color: "var(--faint)" }}>{r.client?.name}</div></span> : <span className="dim">Free from {r.w.availableFrom}</span> },
                  { k: "k", label: "Skills", hideSm: true, render: (r) => <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{r.w.skills.slice(0, 2).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}{r.w.skills.length > 2 && <span style={{ fontSize: 11, color: "var(--faint)" }}>+{r.w.skills.length - 2}</span>}</span> },
                  { k: "c", label: "Cost rate", num: true, render: (r) => "€" + r.w.costRate + "/h" },
                  { k: "h", label: "Hours wk 46", num: true, render: (r) => (r.hours ? r.hours + "h" : "n/a") },
                  { k: "r", label: "Readiness", render: (r) => <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}><Badge tone={readyTone(r.ready.state)}>{readyText(r.ready.state)}</Badge>{r.ready.warnings.length > 0 && <Badge tone="warn" title={r.ready.warnings.join(" · ")}>Expiring</Badge>}</span> },
                  { k: "t", label: "Last timesheet", render: (r) => r.lastSheet ? <span><span className="ink">{r.lastSheet.id}</span> <span style={{ fontSize: 11, color: tsStatus(r.lastSheet.id, st) === "approved" ? "var(--ok)" : "var(--warn)" }}>{tsStatus(r.lastSheet.id, st) === "approved" ? "approved" : "client sign-off"}</span></span> : <span className="dim">None this week</span> },
                ]} />
            </div>
          );
        })}
      </Card>
    </>
  );
}

/* ── Profiles ─────────────────────────────────────────────────────────────── */

const HISTORY: Record<string, { site: string; from: string; to: string; note: string }[]> = {
  "sean-murphy": [
    { site: "North Quay Development", from: "Mar 2026", to: "now", note: "Groundworks and banksman. 39h last week." },
    { site: "Harbour Road Upgrade", from: "Sep 2025", to: "Feb 2026", note: "Moved when North Quay phase 1 opened (illustrative)." },
    { site: "Tallaght Fit-Out", from: "Apr 2024", to: "Aug 2025", note: "First placement with Paul (illustrative)." },
  ],
  "patrick-doyle": [
    { site: "Harbour Road Upgrade", from: "Jul 2026", to: "now", note: "Drainage runs on the upgrade. 40h last week." },
    { site: "Navan Retail Park", from: "Jan 2026", to: "Jun 2026", note: "Pipe laying for the car park (illustrative)." },
    { site: "North Quay Development", from: "Jul 2023", to: "Dec 2025", note: "Long-running groundworks placement (illustrative)." },
  ],
};

function Profiles() {
  const st = useDemo();
  const [id, setId] = useState<WorkerId>("sean-murphy");
  const w = workerById(id);
  const r = readiness(w, st);
  const certs = certsOf(w.id, st);
  const site = w.siteId ? siteById(w.siteId) : null;
  const sheets = TIMESHEETS.filter((t) => t.workerId === w.id);
  const h = workerHours(w);
  const events = activity(st).filter((e) => (e.actor + " " + e.title + " " + e.detail).includes(w.name) || (e.actor + e.title + e.detail).includes(first(w.name) + "'s") || (id === "david-byrne" && /TS-1098|TS-1090/.test(e.title)));
  const history = HISTORY[id] || (site ? [{ site: site.name, from: site.rateEffective, to: "now", note: "Current placement." }] : []);
  return (
    <>
      <Card title="Pick a worker" sub="Sean Murphy and Patrick Doyle carry this week's compliance stories.">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {WORKERS.map((x) => {
            const rr = readiness(x, st);
            const on = x.id === id;
            return (
              <button key={x.id} className="wl-btn sm" onClick={() => setId(x.id)}
                style={{ background: on ? "var(--accent-soft)" : undefined, borderColor: on ? "var(--accent-line)" : undefined, paddingLeft: 6 }}>
                <Avatar initials={x.initials} tint={x.tint} size={20} />{x.name}
                {rr.state === "held" && <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--bad)" }} />}
                {rr.state !== "held" && rr.warnings.length > 0 && <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--warn)" }} />}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="wl-g wl-g-21">
        <div className="wl-stack">
          <Card>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <Avatar initials={w.initials} tint={w.tint} size={52} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px" }}>{w.name}</div>
                <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 3 }}>{w.trade} · subcontractor since {w.since} · {w.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <Badge tone={readyTone(r.state)}>{readyText(r.state)}</Badge>
                  {r.warnings.map((x) => <Badge key={x} tone="warn">{x}</Badge>)}
                  {w.skills.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                </div>
              </div>
              <Btn onClick={() => openDrawer({ kind: "worker", id: w.id })}>Quick view</Btn>
            </div>
            {id === "sean-murphy" && (
              <div style={{ marginTop: 14 }}>
                <Note tone={r.state === "held" ? "bad" : "ok"}>
                  {r.state === "held"
                    ? "Sean's manual-handling record expired on 14 Nov. North Quay's site policy (demo) requires a current one, so Sean is assigned but not cleared for entry. Ops Watchdog suggested Mark Dunne as cover from Tue 17 Nov. Options: get the renewed record uploaded and approved, or plan cover."
                    : "Sean's manual-handling record is now approved in the demo. North Quay clearance re-ran and Sean is cleared."}
                </Note>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn small onClick={() => navigate("Compliance", "expiring")}>Resolve in Compliance</Btn>
                  {!st.cover["mark-dunne"] ? <Btn small onClick={() => planCover("mark-dunne", "north-quay", "sean-murphy")}>Plan Mark Dunne as cover</Btn> : <Badge tone="info">Mark Dunne planned as cover</Badge>}
                </div>
              </div>
            )}
            {id === "patrick-doyle" && (
              <div style={{ marginTop: 14 }}>
                <Note tone={certs.find((c) => c.cert.type === "safe-pass")?.status === "valid" ? "ok" : "warn"}>
                  {certs.find((c) => c.cert.type === "safe-pass")?.status === "valid"
                    ? "Patrick's renewed Safe Pass is approved in the demo. Harbour Road clearance stays green."
                    : "Patrick's Safe Pass expires on 20 Nov, four days from now. Valid today, so Patrick stays cleared for Harbour Road. A renewal reminder is drafted for Elaine to send. Safe Pass renewal is generally every four years."}
                </Note>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn small onClick={() => { setDemo({ portalWorker: "patrick-doyle" }); navigate("Crew", "portal"); }}>Open Patrick's worker portal</Btn>
                  <Btn small onClick={() => navigate("Compliance", "expiring")}>Compliance › Expiring</Btn>
                </div>
              </div>
            )}
            <div className="wl-g wl-g-4" style={{ marginTop: 14 }}>
              <Stat k="Site" v={site ? site.name : "Unallocated"} sub={site ? clientById(site.clientId).name + " · " + site.shift : "Free from " + (w.availableFrom || "now")} />
              <Stat k="Hours · wk 46" v={h ? h + "h" : "0h"} sub={sheets.filter((t) => t.countsToTotals).length + " sheet(s)"} />
              <Stat k="Contractor rate" v={"€" + w.costRate + "/h"} sub="Internal · private" />
              <Stat k="Contractor cost · wk 46" v={eur(h * w.costRate)} sub="Not payroll or take-home" />
            </div>
          </Card>

          <Card title="Hours by day · 9–14 Nov">
            <div className="wl-g wl-g-6">
              {DAYS.map((d, i) => <Stat key={d} k={d} v={w.hours[i] ? w.hours[i] + "h" : "n/a"} sub={id === "david-byrne" && i === 4 ? "TS-1098 · " + (tsStatus("TS-1098", st) === "approved" ? "approved" : "client sign-off") : undefined} />)}
            </div>
          </Card>

          <Card title="Submissions" sub="Timesheets for week 46">
            <Table minWidth={560} rows={sheets} onRow={(t) => openDrawer({ kind: "timesheet", id: t.id })} empty="No hours submitted this week (unallocated)."
              cols={[
                { k: "id", label: "Sheet", render: (t) => <span className="ink">{t.id}</span> },
                { k: "s", label: "Submitted", render: (t) => t.submitted },
                { k: "v", label: "Via", hideSm: true, render: (t) => t.via },
                { k: "h", label: "Hours", num: true, render: (t) => t.hours + "h" },
                { k: "st", label: "Status", render: (t) => { const s = tsStatus(t.id, st); return <Badge tone={s === "approved" ? "ok" : s === "pending_client" ? "warn" : "bad"}>{s === "approved" ? "Approved" : s === "pending_client" ? "Client sign-off" : "Rejected duplicate"}</Badge>; } },
              ]} />
          </Card>

          <Card title="Assignment history" sub={HISTORY[id] ? "Earlier placements are illustrative" : "Earlier placements live in Excel today; import is planned"}>
            {history.length === 0 && <Note>No placement this week. {w.note}</Note>}
            {history.map((x, i) => (
              <div key={i} className="wl-row" style={{ alignItems: "flex-start" }}>
                <span style={{ width: 8, height: 8, marginTop: 5, borderRadius: 2, background: x.to === "now" ? "var(--accent)" : "var(--faint)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{x.site}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{x.note}</div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{x.from} · {x.to}</span>
              </div>
            ))}
          </Card>
        </div>

        <div className="wl-stack">
          <Card title="Certificates" sub={site ? "Required at " + site.name + ": " + requiredFor(site.id).map((t) => CERT_LABEL[t]).join(", ") : "Not allocated"}>
            {certs.map((c) => {
              const req = !!site && requiredFor(site.id).includes(c.cert.type);
              return (
                <div key={c.cert.id} className="wl-row" style={{ flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13 }}>{CERT_LABEL[c.cert.type]}{req && <span style={{ fontSize: 10.5, color: "var(--faint)" }}> · required</span>}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Expires {fmtISO(c.expires)}</div>
                  </div>
                  <Badge tone={certTone(c)}>{certText(c)}</Badge>
                  {c.review && <Btn small kind="primary" onClick={() => verifyDocument(w.id, c.cert.type)}>Approve</Btn>}
                  {!c.review && c.status !== "valid" && (c.requested
                    ? <Btn small onClick={() => simulateUpload(w.id, c.cert.type)}>Simulate upload</Btn>
                    : <Btn small onClick={() => requestDocument(w.id, c.cert.type)}>Request update</Btn>)}
                </div>
              );
            })}
          </Card>
          <Card title="Documents on file" sub="Mock file names. Nothing is stored.">
            {certs.map((c) => (
              <div key={c.cert.id} className="wl-row">
                <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--body)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cert.file}</span>
                <span style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{c.cert.verifiedBy.split(" · ")[0]}</span>
              </div>
            ))}
            <div className="wl-row"><span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--body)", flex: 1 }}>{w.name.replace(/[^A-Za-z]/g, "")}_SubcontractorAgreement.pdf</span><span style={{ fontSize: 11, color: "var(--faint)" }}>Signed copy (demo)</span></div>
          </Card>
          <Card title="Activity" sub="Anchored to the demo week">
            {events.length === 0 && <Note>No events for {w.name} this week.</Note>}
            {events.slice(0, 8).map((e) => (
              <div key={e.id} className="wl-row" style={{ alignItems: "flex-start" }}>
                <span style={{ width: 6, height: 6, marginTop: 6, borderRadius: 2, background: e.kind === "agent" ? "var(--accent)" : e.attention ? "var(--warn)" : "var(--faint)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{e.actor} · {e.at}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Availability ─────────────────────────────────────────────────────────── */

const WEEK = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20", "Sat 21"];

function Availability() {
  const st = useDemo();
  const [who, setWho] = useState<WorkerId>("mark-dunne");
  const [to, setTo] = useState<SiteId>("north-quay");
  const [covering, setCovering] = useState<string>("sean-murphy");
  const wk = workerById(who);
  const chk = placementCheck(wk, to, st);
  const heldAtSite = WORKERS.filter((x) => x.siteId === to && readiness(x, st).state === "held");
  const cov = heldAtSite.some((x) => x.id === covering) ? covering : "";
  const covers = Object.entries(st.cover);
  const coveredIds = new Set(covers.map(([, c]) => c.covering).filter(Boolean) as string[]);
  const held = allocated().filter((x) => readiness(x, st).state === "held");
  const freeNow = available().filter((x) => !st.cover[x.id]);
  const deployedTue = allocated().filter((x) => readiness(x, st).state === "clear").length + covers.length;

  const cell = (x: Worker, d: number): { text: string; tone: Tone } => {
    if (d === 5) return { text: "No shift", tone: "neutral" };
    const cov = st.cover[x.id];
    if (cov && d >= 1) return { text: "Cover · " + shortSite(cov.siteId), tone: "accent" };
    if (!x.siteId) return { text: "Free", tone: "info" };
    if (readiness(x, st).state === "held") return { text: coveredIds.has(x.id) && d >= 1 ? "Held · covered" : "Held", tone: "bad" };
    return { text: shortSite(x.siteId), tone: "ok" };
  };
  const order = WORKERS.slice().sort((a, b) => (a.siteId ? SITES.findIndex((s) => s.id === a.siteId) : 99) - (b.siteId ? SITES.findIndex((s) => s.id === b.siteId) : 99));
  const bg: Record<Tone, string> = { ok: "var(--ok-soft)", warn: "var(--warn-soft)", bad: "var(--bad-soft)", neutral: "var(--surface-faint)", accent: "var(--accent-soft)", info: "var(--surface-2)" };
  const ink: Record<Tone, string> = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", neutral: "var(--faint)", accent: "var(--accent)", info: "var(--dim)" };
  return (
    <>
      <div className="wl-g wl-g-6">
        <Kpi label="Deployed" value={allocated().length} sub={"Allocated across " + SITES.length + " sites"} />
        <Kpi label="Cleared to work Mon" value={allocated().length - held.length} tone="ok" />
        <Kpi label="Held" value={held.length} tone={held.length ? "bad" : "ok"} sub={held.map((x) => x.name).join(", ") || "Nobody"} />
        <Kpi label="Available" value={freeNow.length} tone="info" sub={freeNow.map((x) => first(x.name)).join(" · ") || "Everyone placed"} />
        <Kpi label="Planned cover" value={covers.length} tone="accent" sub={covers.map(([id, c]) => first(workerById(id).name) + " → " + shortSite(c.siteId)).join(", ") || "None yet"} />
        <Kpi label="On site from Tue" value={deployedTue} sub="Cleared crew plus planned cover" />
      </div>

      <div className="wl-g wl-g-21">
        <Card title="Week of 16 Nov · availability grid" sub="Roster preview for the current week. Cover plans start Tue 17 Nov. Simulation only; nobody is told anything.">
          <div className="wl-tw">
            <table className="wl-t" style={{ minWidth: 820 }}>
              <thead><tr><th>Worker</th>{WEEK.map((d) => <th key={d}>{d}</th>)}</tr></thead>
              <tbody>
                {order.map((x) => (
                  <tr key={x.id} className="click" onClick={() => openDrawer({ kind: "worker", id: x.id })}>
                    <td><Person w={x} /></td>
                    {WEEK.map((_, d) => {
                      const c = cell(x, d);
                      return <td key={d} style={{ width: 104 }}><div className="wl-cell" style={{ background: bg[c.tone], color: ink[c.tone] }}>{c.text}</div></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="wl-stack">
          <Card title="Simulate a reallocation" sub="Checks skills and site rules before anything is planned.">
            <div className="wl-stack" style={{ gap: 12 }}>
              <Field label="Worker">
                <select className="wl-in" value={who} onChange={(e) => setWho(e.target.value)}>
                  {WORKERS.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.siteId ? shortSite(x.siteId) : "available"}</option>)}
                </select>
              </Field>
              <Field label="To site">
                <select className="wl-in" value={to} onChange={(e) => { setTo(e.target.value as SiteId); setCovering(""); }}>
                  {SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Covering for (optional)">
                <select className="wl-in" value={cov} onChange={(e) => setCovering(e.target.value)}>
                  <option value="">Nobody · extra hand</option>
                  {heldAtSite.map((x) => <option key={x.id} value={x.id}>{x.name} (held)</option>)}
                </select>
              </Field>
              <div className="wl-stack" style={{ gap: 6 }}>
                {chk.missing.length === 0 ? <Note tone="ok">Site rules met for {siteById(to).name}.</Note> : <Note tone="bad">Can't enter {siteById(to).name} yet: {chk.missing.join(", ")}.</Note>}
                {chk.expiring.length > 0 && <Note tone="warn">{chk.expiring.join(", ")}.</Note>}
                {chk.overlap.length > 0 ? <Note tone="ok">Skills match the crew on site: {chk.overlap.join(", ")}.</Note> : <Note tone="warn">No skill overlap with the current {shortSite(to)} crew. Confirm the scope fits {wk.trade.toLowerCase()} work.</Note>}
                {chk.alreadyPlaced && <Note tone="warn">{wk.name} is placed at {siteById(wk.siteId!).name}; moving leaves that site a person short.</Note>}
                {chk.manualHold && <Note tone="bad">{wk.name} has a manual site hold.</Note>}
              </div>
              <Btn kind="primary" disabled={chk.missing.length > 0 || who === cov} onClick={() => planCover(who, to, cov || undefined)}>
                {chk.missing.length > 0 ? "Blocked by site rules" : "Plan " + first(wk.name) + " for " + shortSite(to) + " (demo)"}
              </Btn>
            </div>
          </Card>
          <Card title="Planned cover" sub="Roster previews only">
            {covers.length === 0 && <Note>No cover planned. Ops Watchdog suggests Mark Dunne for North Quay while Sean is held.</Note>}
            {covers.map(([id, c]) => (
              <div key={id} className="wl-row">
                <Person w={workerById(id)} sub={shortSite(c.siteId) + " from " + c.from + (c.covering ? " · covering " + workerById(c.covering).name : "")} />
                <span style={{ flex: 1 }} />
                <Btn small kind="ghost" onClick={() => clearCover(id)}>Remove</Btn>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Onboarding ───────────────────────────────────────────────────────────── */

const CHECKLIST: { id: string; group: string; label: string; note: string }[] = [
  { id: "id", group: "Identity & contact", label: "Name, mobile and emergency contact", note: "Kept in Pulse. Demo uses placeholders only." },
  { id: "agree", group: "Identity & contact", label: "Subcontractor agreement signed", note: "Scope, rate, notice and who supplies tools/PPE." },
  { id: "sp", group: "Credentials", label: "Safe Pass sighted and dated", note: "Copy on file; renewal generally every four years." },
  { id: "mh", group: "Credentials", label: "Manual-handling record", note: "Required by some client sites (North Quay demo policy)." },
  { id: "tickets", group: "Credentials", label: "Trade tickets (CSCS etc.) where the role needs them", note: "Teleporter, 360, working at height." },
  { id: "tax", group: "Tax & admin", label: "Tax reference and RCT/eRCT position", note: "Applicability to verify with the accountant. Not a tax determination." },
  { id: "pay", group: "Tax & admin", label: "Payment details collected", note: "Elaine collects these directly. Never typed into the demo." },
  { id: "ins", group: "Insurance", label: "Own public liability cover, if applicable", note: "Depends on the arrangement; confirm with the broker." },
  { id: "rules", group: "Site rules", label: "Site rules and induction booked", note: "Each client runs its own induction." },
  { id: "rate", group: "Site rules", label: "Contractor rate agreed in writing", note: "Internal rate; never shown to clients." },
  { id: "class", group: "Classification", label: "Employment-status review recorded", note: "See the note on the left. Not settled by this checklist." },
];

function Onboarding() {
  const st = useDemo();
  const [done, setDone] = useState<Record<string, boolean>>({ id: true, agree: true, sp: true });
  const [starter, setStarter] = useState<"a" | "b">("a");
  const completed = CHECKLIST.filter((c) => done[starter + c.id] ?? (starter === "a" && done[c.id])).length;
  const isDone = (id: string) => done[starter + id] ?? (starter === "a" ? !!done[id] : false);
  const records = WORKERS.map((w) => {
    const certs = certsOf(w.id, st);
    const has = (t: CertType) => { const c = certs.find((x) => x.cert.type === t); return c ? c.status !== "expired" : false; };
    const ind = certs.some((c) => c.cert.type.startsWith("ind-") && c.status !== "expired");
    const items = [true, has("safe-pass"), has("manual-handling"), ind, true];
    return { w, contact: true, sp: has("safe-pass"), mh: has("manual-handling"), ind, rate: true, score: items.filter(Boolean).length };
  });
  const complete = records.filter((r) => r.score === 5).length;
  const yes = (b: boolean) => <Badge tone={b ? "ok" : "bad"}>{b ? "On file" : "Gap"}</Badge>;
  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Records complete" value={complete + " / " + records.length} tone={complete === records.length ? "ok" : "warn"} sub="Contact, Safe Pass, manual handling, induction, rate" />
        <Kpi label="Gaps to close" value={records.length - complete} tone={records.length - complete ? "bad" : "ok"} sub={records.filter((r) => r.score < 5).map((r) => r.w.name).join(", ") || "None"} onClick={() => navigate("Compliance", "expiring")} />
        <Kpi label="Starters in scenario" value={2} sub="From the +2 contractor forecast" onClick={() => navigate("Finance", "forecast")} />
        <Kpi label={"Checklist · starter " + starter.toUpperCase()} value={completed + " / " + CHECKLIST.length} tone="accent" />
      </div>

      <div className="wl-g wl-g-12">
        <div className="wl-stack">
          <Card title="Subcontractor or employee?" sub="How the business runs today versus the alternative. Shown so the question is asked, not answered.">
            <div className="wl-g wl-g-2">
              <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--accent-line)", background: "var(--accent-faint)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Subcontractor (current model)</div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--body)", lineHeight: 1.6 }}>
                  <li>Paid an agreed hourly rate per hours worked</li>
                  <li>Invoices or is paid against approved timesheets</li>
                  <li>Own tax affairs; RCT may apply to the contract</li>
                  <li>Can be placed with different clients</li>
                </ul>
              </div>
              <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-faint)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Employee</div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--body)", lineHeight: 1.6 }}>
                  <li>On payroll with PAYE/PRSI deducted</li>
                  <li>Holiday pay, sick leave and notice rights</li>
                  <li>Directed and controlled day to day</li>
                  <li>Different cost base for the forecast</li>
                </ul>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Note tone="warn">Status depends on the real working relationship, not the label. Nothing in this demo settles it legally. Confirm each arrangement with the accountant or an adviser against the published guidance on employment status.</Note></div>
          </Card>
          <Card title={"Onboarding checklist · Starter " + starter.toUpperCase() + " (placeholder)"} sub="Mock checklist. Ticks stay in this browser only."
            right={<Seg value={starter} onChange={setStarter} options={[{ id: "a", label: "Starter A" }, { id: "b", label: "Starter B" }]} />}>
            {Array.from(new Set(CHECKLIST.map((c) => c.group))).map((g) => (
              <div key={g} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--faint)", padding: "4px 0" }}>{g}</div>
                {CHECKLIST.filter((c) => c.group === g).map((c) => (
                  <label key={c.id} className="wl-row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={isDone(c.id)} onChange={(e) => setDone({ ...done, [starter + c.id]: e.target.checked })} style={{ marginTop: 3, accentColor: "var(--accent)" }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13, color: isDone(c.id) ? "var(--dim)" : "var(--ink)", textDecoration: isDone(c.id) ? "line-through" : "none" }}>{c.label}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{c.note}</span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <Card title="Record completeness · current 17" sub="Derived from documents on file. A gap usually means an expired or missing document.">
          <Table minWidth={680} rows={records} onRow={(r) => openDrawer({ kind: "worker", id: r.w.id })}
            cols={[
              { k: "w", label: "Worker", render: (r) => <Person w={r.w} /> },
              { k: "c", label: "Contact", render: (r) => yes(r.contact) },
              { k: "s", label: "Safe Pass", render: (r) => yes(r.sp) },
              { k: "m", label: "Manual handling", render: (r) => yes(r.mh) },
              { k: "i", label: "Induction", render: (r) => yes(r.ind) },
              { k: "r", label: "Rate agreed", render: (r) => yes(r.rate) },
              { k: "n", label: "Score", num: true, render: (r) => r.score + "/5" },
            ]} />
        </Card>
      </div>
    </>
  );
}

/* ── Worker portal preview ────────────────────────────────────────────────── */

type PTab = "site" | "hours" | "upload" | "availability" | "messages";

function Portal() {
  const st = useDemo();
  const w = workerById(st.portalWorker);
  const [ptab, setPtab] = useState<PTab>("site");
  const [avail, setAvail] = useState<Record<string, boolean>>({});
  const site = w.siteId ? siteById(w.siteId) : null;
  const sheets = TIMESHEETS.filter((t) => t.workerId === w.id && t.countsToTotals);
  const certs = certsOf(w.id, st);
  const due = certs.filter((c) => c.status !== "valid" || c.review);
  const h = workerHours(w);
  const sp = certs.find((c) => c.cert.type === "safe-pass");
  const docState = (t: CertType) => st.docs[w.id + ":" + t];
  const messages: { from: string; at: string; text: string }[] = [];
  if (w.id === "david-byrne") {
    messages.push({ from: "Elaine", at: "Mon 16 Nov 08:22", text: tsStatus("TS-1098", st) === "approved" ? "Morrow signed Friday 13 Nov. All 40h are approved, thanks David." : "Morrow hasn't signed your Friday 13 Nov hours yet. Nothing for you to do; we're chasing it." });
    messages.push({ from: "Paul", at: "Fri 13 Nov 17:02", text: "Ballymun runs 07:00 to 15:30 again next week. Teleporter booked Mon to Wed." });
  } else if (w.id === "patrick-doyle") {
    const d = docState("safe-pass");
    if (d) messages.push({ from: "Elaine", at: d.at, text: d.status === "verified" ? "Your renewed Safe Pass is approved. Harbour Road stays open to you." : d.status === "under_review" ? "Got your Safe Pass upload. I'll check it today." : "Please upload your renewed Safe Pass here before 20 Nov." });
    messages.push({ from: "Compliance reminder", at: "Mon 16 Nov 06:31", text: "Your Safe Pass on file expires on 20 Nov. Upload the renewed card under Upload." });
    messages.push({ from: "Paul", at: "Thu 12 Nov 16:40", text: "Harbour Road drainage runs on next week. Same start time." });
  } else {
    messages.push({ from: "Paul", at: "Fri 13 Nov 17:00", text: site ? site.name + " continues next week, same shift." : "Nothing booked yet. We'll be in touch about cover." });
  }
  const tabs: { id: PTab; label: string }[] = [{ id: "site", label: "My site" }, { id: "hours", label: "My hours" }, { id: "upload", label: "Upload" }, { id: "availability", label: "Availability" }, { id: "messages", label: "Messages" }];

  return (
    <>
      <div className="wl-g wl-g-4">
        <Kpi label="Previewing as" value={w.name} sub={w.trade} />
        <Kpi label="Their hours · wk 46" value={h + "h"} sub={sheets.filter((t) => tsStatus(t.id, st) !== "approved").reduce((a, t) => a + t.hours, 0) + "h awaiting client sign-off"} />
        <Kpi label="Their documents" value={certs.length} sub={due.length ? due.length + " need attention" : "All current"} tone={due.length ? "warn" : "ok"} />
        <Kpi label="Scope" value="Own records only" sub="No other workers, client rates or financials" tone="accent" />
      </div>
      <div className="wl-g wl-g-12">
        <div className="wl-stack">
          <Card title="Preview as" sub="Switch worker. Interactions stay in this browser.">
            <Seg value={st.portalWorker} onChange={(id) => { setDemo({ portalWorker: id }); setPtab("site"); }}
              options={[{ id: "david-byrne", label: "David Byrne" }, { id: "patrick-doyle", label: "Patrick Doyle" }]} />
          </Card>
          <Card title="What this worker can see">
            <div className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>Own site, shift and client instructions</span><Badge tone="ok">Visible</Badge></div>
            <div className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>Own hours, sheet status and own rate</span><Badge tone="ok">Visible</Badge></div>
            <div className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>Own documents and upload</span><Badge tone="ok">Visible</Badge></div>
            <div className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>Other workers' names, hours or rates</span><Badge tone="bad">Hidden</Badge></div>
            <div className="wl-row"><span style={{ flex: 1, fontSize: 12.5 }}>Client bill rates, invoices, margins</span><Badge tone="bad">Hidden</Badge></div>
          </Card>
          <Note>Uploads here are simulated. They land in Compliance › Documents for Elaine to review, and approving them re-runs the site check.</Note>
        </div>

        <div className="wl-phone" aria-label={"Worker portal preview for " + w.name}>
          <div className="wl-phone-in" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar initials={w.initials} tint={w.tint} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>Walsh Operations · worker app (demo)</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Hi {first(w.name)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setPtab(t.id)} className="wl-btn sm"
                    style={{ flex: "none", height: 26, padding: "0 9px", fontSize: 11, background: ptab === t.id ? "var(--accent-soft)" : "transparent", borderColor: ptab === t.id ? "var(--accent-line)" : "var(--border)" }}>
                    {t.label}{t.id === "upload" && due.length > 0 && <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--warn)" }} />}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
              {ptab === "site" && (site ? (
                <>
                  <div style={{ padding: 12, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--faint)" }}>This week</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{site.name}</div>
                    <div style={{ color: "var(--dim)", marginTop: 3 }}>{clientById(site.clientId).name} · {site.shift}</div>
                  </div>
                  <div style={{ color: "var(--body)", lineHeight: 1.5 }}>{site.instructions}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--dim)" }}><span>Site entry</span>{readiness(w, st).state === "clear" ? <Badge tone="ok">Cleared</Badge> : <Badge tone="bad">Not cleared</Badge>}</div>
                  {sp && sp.status !== "valid" && !sp.review && <Note tone="warn">Your Safe Pass expires {fmtISO(sp.expires)}. Upload the renewal to keep site access.</Note>}
                </>
              ) : <Note>No site booked this week.</Note>)}

              {ptab === "hours" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {DAYS.map((d, i) => (
                      <div key={d} style={{ padding: "8px 6px", borderRadius: 10, background: "var(--surface-2)", textAlign: "center" }}>
                        <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{d}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{w.hours[i] ? w.hours[i] + "h" : "n/a"}</div>
                      </div>
                    ))}
                  </div>
                  {sheets.map((t) => {
                    const s = tsStatus(t.id, st);
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
                        <span style={{ flex: 1 }}>{t.id} · {t.hours}h</span>
                        <Badge tone={s === "approved" ? "ok" : "warn"}>{s === "approved" ? "Approved" : "Waiting on client"}</Badge>
                      </div>
                    );
                  })}
                  <div style={{ padding: 10, borderRadius: 12, background: "var(--surface-2)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--dim)" }}>{h}h × your rate €{w.costRate}/h</span>
                    <span style={{ fontWeight: 600 }}>{eur(h * w.costRate)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>Gross at your agreed rate. Not a payslip or remittance.</div>
                </>
              )}

              {ptab === "upload" && (
                <>
                  {due.length === 0 && <Note tone="ok">All your documents are current. Nothing to upload.</Note>}
                  {due.map((c) => {
                    const d = docState(c.cert.type);
                    return (
                      <div key={c.cert.id} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                        <div style={{ fontWeight: 600 }}>{CERT_LABEL[c.cert.type]}</div>
                        <div style={{ color: "var(--dim)", marginTop: 3 }}>{c.review ? "Uploaded · waiting for Elaine's review" : c.status === "expired" ? "Expired " + fmtISO(c.expires) : "Expires " + fmtISO(c.expires)}</div>
                        {!c.review && d?.status !== "verified" && (
                          <button className="wl-btn primary sm" style={{ marginTop: 10, width: "100%" }} onClick={() => simulateUpload(w.id, c.cert.type, "worker portal")}>
                            Take photo / choose file (simulated)
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>Your documents</div>
                  {certs.map((c) => (
                    <div key={c.cert.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                      <span>{CERT_LABEL[c.cert.type]}</span><Badge tone={certTone(c)}>{certText(c)}</Badge>
                    </div>
                  ))}
                </>
              )}

              {ptab === "availability" && (
                <>
                  <div style={{ color: "var(--dim)" }}>Week of 23 Nov · tap the days you can't work.</div>
                  {["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27", "Sat 28"].map((d) => {
                    const off = !!avail[w.id + d];
                    return (
                      <button key={d} onClick={() => setAvail({ ...avail, [w.id + d]: !off })} className="wl-btn"
                        style={{ justifyContent: "space-between", width: "100%", background: off ? "var(--bad-soft)" : "var(--surface-2)" }}>
                        <span>{d}</span><span style={{ color: off ? "var(--bad)" : "var(--ok)" }}>{off ? "Can't work" : "Available"}</span>
                      </button>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>Saved in this browser only (demo).</div>
                </>
              )}

              {ptab === "messages" && messages.map((m, i) => (
                <div key={i} style={{ padding: 11, borderRadius: 14, background: m.from === "Compliance reminder" ? "var(--warn-soft)" : "var(--surface-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)" }}><span>{m.from}</span><span>{m.at}</span></div>
                  <div style={{ marginTop: 5, lineHeight: 1.5 }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", fontSize: 10.5, color: "var(--faint)", textAlign: "center" }}>Demo preview · {w.email}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CrewModule({ tab }: { tab: string }) {
  const sub: Record<string, string> = {
    directory: "The 17 subcontractors on the books, grouped by whether they can work on site today.",
    profiles: "One worker at a time: documents, placement, hours, rate and what happened this week.",
    availability: "Who is where this week, who is free, and what a move would break.",
    onboarding: "Getting a new subcontractor ready to place, and keeping the existing records whole.",
    portal: "What a worker sees on their phone. Scoped to that worker only.",
  };
  const id = sub[tab] ? tab : "directory";
  return (
    <Page>
      <Head title={id === "directory" ? "Crew" : "Crew · " + tabLabel(id)} sub={sub[id]} crumbs={crumbs(id)} />
      {id === "directory" && <Directory />}
      {id === "profiles" && <Profiles />}
      {id === "availability" && <Availability />}
      {id === "onboarding" && <Onboarding />}
      {id === "portal" && <Portal />}
    </Page>
  );
}
