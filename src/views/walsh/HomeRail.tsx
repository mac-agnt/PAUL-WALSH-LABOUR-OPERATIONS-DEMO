/* Home right-hand rail: the morning picture around the chat. The centre column
   stays clean (CLAUDE.md rule 3); everything here lives in the widget rail. */
import type { ReactNode } from "react";
import { navigate, openDrawer, useDemo } from "../../demo/store";
import { certAlerts, eur, receivables, runStatus, siteRows, weeklyTotals, workerRows } from "../../demo/selectors";
import { AGENT_RUNS, AGENTS } from "../../demo/walshData";
import { Badge, type Tone } from "./ui";

function RailCard({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)", padding: "16px 18px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        {right}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Tile({ label, value, tone, onClick }: { label: string; value: string; tone?: Tone; onClick: () => void }) {
  return (
    <button className="wl-kpi" onClick={onClick} style={{ padding: "10px 11px", borderRadius: 12 }} title={"Open " + label}>
      <div style={{ fontSize: 10.5, color: "var(--dim)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden" }}>
        {tone && <span style={{ width: 6, height: 6, borderRadius: 2, flex: "none", background: tone === "bad" ? "var(--bad)" : tone === "warn" ? "var(--warn)" : "var(--ok)" }} />}
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.4px", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </button>
  );
}

export default function HomeRail() {
  const st = useDemo();
  const t = weeklyTotals(st);
  const ca = certAlerts(st);
  const rows = siteRows(st);
  const rec = receivables();
  const allocatedN = workerRows(st).filter((r) => r.site).length;
  const maxC = Math.max(...rows.map((r) => r.contribution));
  const held = ca.held;
  const patrickExpiring = ca.expiring.some((c) => c.cert.workerId === "patrick-doyle");

  const decisions: { title: string; meta: string; tone: Tone; go: () => void; done?: boolean }[] = [
    { title: "Validate TS-1098 · " + eur(320), meta: "David Byrne · Ballymun · client sign-off", tone: "warn", go: () => navigate("Timesheets", "approval"), done: st.ts1098 === "approved" },
    { title: held.length ? "Resolve " + held.map((w) => w.name.split(" ")[0]).join(", ") + "'s document" : "Site clearance resolved", meta: "North Quay · manual handling expired 14 Nov", tone: "bad", go: () => navigate("Compliance", "expiring"), done: held.length === 0 },
    { title: "Westbridge reminder · " + eur(rec.overdue), meta: "INV-2026-103 · 31 days overdue", tone: "bad", go: () => navigate("Finance", "debtors"), done: st.reminder.status === "approved_demo" },
    { title: "Remind Patrick · Safe Pass", meta: "Expires Fri 20 Nov · Harbour Road", tone: "warn", go: () => navigate("Compliance", "expiring"), done: !patrickExpiring || !!st.docs["patrick-doyle:safe-pass"] },
    { title: "Review +2 headcount forecast", meta: "+€4,480 contribution over 4 weeks", tone: "info", go: () => navigate("Finance", "forecast") },
  ];
  const openN = decisions.filter((d) => !d.done).length;

  const handled = AGENT_RUNS.filter((r) => ["RUN-504", "RUN-506", "RUN-508"].includes(r.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="wl-g" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Tile label="Subcontractors" value="17" onClick={() => navigate("Crew", "directory")} />
        <Tile label="Assigned · 5 sites" value={String(allocatedN)} onClick={() => navigate("Operations", "allocations")} />
        <Tile label="Hours submitted" value={t.submitted + "h"} tone={t.pending ? "warn" : "ok"} onClick={() => navigate("Timesheets", "overview")} />
        <Tile label="Potential billings" value={eur(t.revenue)} onClick={() => navigate("Finance", "overview")} />
        <Tile label="Gross contribution" value={eur(t.contribution)} onClick={() => navigate("Dashboard", "margin")} />
        <Tile label="Overdue" value={eur(rec.overdue)} tone="bad" onClick={() => navigate("Finance", "debtors")} />
        <Tile label="Compliance hold" value={String(held.length)} tone={held.length ? "bad" : "ok"} onClick={() => navigate("Compliance", "overview")} />
        <Tile label="Invoice-ready" value={eur(t.ready)} tone={t.held ? "warn" : "ok"} onClick={() => navigate("Timesheets", "export")} />
      </div>

      <RailCard title="Morning briefing" right={<span style={{ fontSize: 10.5, color: "var(--faint)" }}>Briefing · 07:00</span>}>
        <div style={{ fontSize: 12.8, lineHeight: 1.6, color: "var(--body)" }}>
          Paul, <b style={{ color: "var(--ink)" }}>{t.approved} of {t.submitted}</b> submitted hours are signed off.{" "}
          {t.pending ? <>The remaining {t.pending} hours are holding <b style={{ color: "var(--ink)" }}>{eur(t.held)}</b> at Ballymun. </> : <>Nothing is holding invoicing. </>}
          {held.length ? <>{held.map((w) => w.name).join(", ")} is not cleared for North Quay, and </> : <>Every allocated worker is site-cleared, and </>}
          <b style={{ color: "var(--ink)" }}>{eur(rec.overdue)}</b> from Westbridge Civil is 31 days overdue. Two extra contractors at €43/h could add <b style={{ color: "var(--ink)" }}>€4,480</b> contribution over four weeks.
        </div>
        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 8 }}>Week 46 · 9–15 Nov 2026 · demo figures, not live</div>
      </RailCard>

      <RailCard title="Today's decisions" right={<Badge tone={openN ? "warn" : "ok"}>{openN} open</Badge>}>
        {decisions.map((d, i) => (
          <div key={i} className="wl-row click" onClick={d.go} style={{ padding: "8px 6px", alignItems: "flex-start", opacity: d.done ? 0.55 : 1 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", width: 14, marginTop: 2 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.8, color: "var(--ink)", textDecoration: d.done ? "line-through" : "none" }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{d.done ? "Done in demo" : d.meta}</div>
            </div>
            <span style={{ width: 7, height: 7, borderRadius: 2, marginTop: 5, background: d.done ? "var(--ok)" : d.tone === "bad" ? "var(--bad)" : d.tone === "warn" ? "var(--warn)" : "var(--faint)" }} />
          </div>
        ))}
      </RailCard>

      <RailCard title="Where money is made" right={<span style={{ fontSize: 10.5, color: "var(--faint)" }}>Contribution · wk 46</span>}>
        {rows.slice().sort((a, b) => b.contribution - a.contribution).map((r) => (
          <div key={r.site.id} className="wl-row click" onClick={() => openDrawer({ kind: "site", id: r.site.id })} style={{ padding: "6px 4px", display: "grid", gridTemplateColumns: "92px 1fr 52px", gap: 8 }}
            title={`${r.site.name}: ${eur(r.revenue)} billing, ${eur(r.cost)} cost, ${eur(r.contribution)} contribution (${r.margin.toFixed(1)}%)`}>
            <span style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.site.name.split(" ").slice(0, 2).join(" ")}</span>
            <div className="wl-bar" style={{ alignSelf: "center", height: 8 }}><span style={{ width: (r.contribution / maxC) * 100 + "%", background: "var(--series-b)" }} /></div>
            <span style={{ fontSize: 11.5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(r.contribution)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)", marginTop: 6, padding: "0 4px" }}>
          <span>{eur(t.contribution)} of {eur(t.revenue)}</span><span>{t.margin.toFixed(2)}% before overhead, VAT, tax</span>
        </div>
      </RailCard>

      <RailCard title="What agents handled" right={<span className="wl-demo-pill" style={{ height: 20, fontSize: 10 }}>Demo simulation</span>}>
        {handled.map((r) => {
          const a = AGENTS.find((x) => x.id === r.agent)!;
          const s = runStatus(r.id, st);
          return (
            <div key={r.id} className="wl-row click" onClick={() => navigate("Agents", "runs")} style={{ padding: "8px 4px", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)", marginTop: 2, width: 38 }}>{r.at.slice(-5)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{a.name} · {r.kind === "completed" ? "completed" : s === "proposed" ? "suggested · needs a person" : s + " (demo)"}</div>
              </div>
            </div>
          );
        })}
      </RailCard>

      <RailCard title="Upcoming">
        {[
          { when: "Tue 17 Nov", what: st.cover["mark-dunne"] ? "Mark Dunne starts North Quay cover" : "North Quay roster: Sean on hold, cover undecided", go: () => navigate("Operations", "allocations") },
          { when: "Fri 20 Nov", what: "Patrick Doyle's Safe Pass expires", go: () => navigate("Compliance", "expiring") },
          { when: "Fri 20 Nov 15:00", what: "Week 47 timesheet cut-off", go: () => navigate("Timesheets", "overview") },
          { when: "Wed 2 Dec", what: "Conor O'Reilly's Westbridge induction expires", go: () => navigate("Compliance", "expiring") },
        ].map((u, i) => (
          <div key={i} className="wl-row click" onClick={u.go} style={{ padding: "8px 4px" }}>
            <span style={{ fontSize: 11, color: "var(--faint)", width: 96, flex: "none" }}>{u.when}</span>
            <span style={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>{u.what}</span>
          </div>
        ))}
      </RailCard>
    </div>
  );
}
