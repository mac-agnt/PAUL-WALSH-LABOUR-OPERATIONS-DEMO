/* Small shared kit for the Walsh modules. Built on the Pulse theme tokens so it
   re-themes with the rest of the app. Layout classes live in styles/walsh.css. */
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { DEMO } from "../../demo/walshData";
import { navigate } from "../../demo/store";

export type Tone = "ok" | "warn" | "bad" | "neutral" | "accent" | "info";

const TONE: Record<Tone, { bg: string; ink: string; dot: string }> = {
  ok: { bg: "var(--ok-soft)", ink: "var(--ok)", dot: "var(--ok)" },
  warn: { bg: "var(--warn-soft)", ink: "var(--warn)", dot: "var(--warn)" },
  bad: { bg: "var(--bad-soft)", ink: "var(--bad)", dot: "var(--bad)" },
  neutral: { bg: "var(--track)", ink: "var(--body)", dot: "var(--faint)" },
  accent: { bg: "var(--accent-soft)", ink: "var(--accent)", dot: "var(--accent)" },
  info: { bg: "var(--surface-2)", ink: "var(--dim)", dot: "var(--dim)" },
};
export const toneInk = (t: Tone) => TONE[t].ink;

export function Page({ children }: { children: ReactNode }) {
  return <div className="wl-page"><div className="wl-stack">{children}</div></div>;
}

export function Head({ title, sub, right, crumbs }: { title: string; sub?: ReactNode; right?: ReactNode; crumbs?: { label: string; page?: string; tab?: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", padding: "4px 2px 2px" }}>
      <div style={{ flex: "1 1 360px", minWidth: 0 }}>
        {crumbs && crumbs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--faint)", marginBottom: 6, flexWrap: "wrap" }}>
            {crumbs.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && <span aria-hidden>›</span>}
                {c.page ? <button className="wl-link" style={{ color: "var(--dim)", fontSize: 12 }} onClick={() => navigate(c.page!, c.tab)}>{c.label}</button> : <span>{c.label}</span>}
              </Fragment>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-.5px", lineHeight: 1.15 }}>{title}</h1>
        {sub && <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--dim)", lineHeight: 1.5, maxWidth: "78ch" }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="wl-demo-pill" title="All figures are demo fixtures, not records from the business">{DEMO.weekShort}</span>
        <DemoChip />
        {right}
      </div>
    </div>
  );
}

export function DemoChip({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="wl-demo-pill" title="Demo environment · illustrative data. Not real business records.">
      <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--warn)" }} />{label}
    </span>
  );
}

export function Card({ title, sub, right, children, flush, style, className }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; flush?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <section className={"wl-card" + (flush ? " flush" : "") + (className ? " " + className : "")} style={style}>
      {(title || right) && (
        <div className="wl-card-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px" }}>{title}</div>}
            {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
          </div>
          {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{right}</div>}
        </div>
      )}
      <div className="wl-card-b">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone, onClick, title }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; title?: string }) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--dim)" }}>
        {tone && <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: TONE[tone].dot }} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {onClick && <span aria-hidden style={{ marginLeft: "auto", color: "var(--faint)" }}>›</span>}
      </div>
      <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.7px", marginTop: 7, lineHeight: 1.05, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.4 }}>{sub}</div>}
    </>
  );
  return onClick
    ? <button className="wl-kpi" onClick={onClick} title={title}>{inner}</button>
    : <div className="wl-kpi" title={title}>{inner}</div>;
}

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  const t = TONE[tone];
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999, background: t.bg, color: t.ink, fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, background: t.dot }} />{children}
    </span>
  );
}

export function Btn({ kind, small, onClick, children, disabled, title }: { kind?: "primary" | "ghost" | "danger"; small?: boolean; onClick?: () => void; children: ReactNode; disabled?: boolean; title?: string }) {
  return <button className={"wl-btn" + (kind ? " " + kind : "") + (small ? " sm" : "")} onClick={onClick} disabled={disabled} title={title}>{children}</button>;
}

export function Go({ page, tab, children, drawer }: { page: string; tab?: string; children: ReactNode; drawer?: Parameters<typeof navigate>[2] }) {
  return <button className="wl-link" onClick={() => navigate(page, tab, drawer)}>{children}</button>;
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="wl-seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={o.id === value} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}{o.count !== undefined && <span style={{ marginLeft: 6, opacity: .65, fontSize: 11 }}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export type Col<T> = { k: string; label: ReactNode; num?: boolean; w?: number | string; render: (r: T, i: number) => ReactNode; hideSm?: boolean };
export function Table<T>({ cols, rows, onRow, selected, foot, empty, minWidth = 640, maxHeight }: { cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; selected?: (r: T) => boolean; foot?: ReactNode[]; empty?: ReactNode; minWidth?: number; maxHeight?: number }) {
  return (
    <div className="wl-tw" style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
      <table className="wl-t" style={{ minWidth }}>
        <thead><tr>{cols.map((c) => <th key={c.k} className={(c.num ? "num " : "") + (c.hideSm ? "wl-hide-sm" : "")} style={c.w ? { width: c.w } : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={(onRow ? "click " : "") + (selected && selected(r) ? "sel" : "")} onClick={onRow ? () => onRow(r) : undefined}
              tabIndex={onRow ? 0 : undefined} onKeyDown={onRow ? (e) => { if (e.key === "Enter") onRow(r); } : undefined}>
              {cols.map((c) => <td key={c.k} className={(c.num ? "num " : "") + (c.hideSm ? "wl-hide-sm" : "")}>{c.render(r, i)}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: "28px 14px", textAlign: "center", color: "var(--dim)" }}>{empty || "Nothing matches these filters."}</td></tr>}
        </tbody>
        {foot && <tfoot><tr>{foot.map((f, i) => <td key={i} className={(cols[i]?.num ? "num " : "") + (cols[i]?.hideSm ? "wl-hide-sm" : "")}>{f}</td>)}</tr></tfoot>}
      </table>
    </div>
  );
}

export function Avatar({ initials, tint, size = 28 }: { initials: string; tint: string; size?: number }) {
  return <span style={{ width: size, height: size, flex: "none", borderRadius: 999, background: tint, color: "#12161b", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 600 }}>{initials}</span>;
}

/** Horizontal bar list with a shared € / h scale and an axis line. */
export function BarList({ items, max, fmt, axis }: { items: { label: ReactNode; value: number; tone?: string; sub?: ReactNode; onClick?: () => void; title?: string }[]; max?: number; fmt: (n: number) => string; axis?: number[] }) {
  const m = max || Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className={it.onClick ? "wl-row click" : "wl-row"} onClick={it.onClick} title={it.title} style={{ display: "grid", gridTemplateColumns: "minmax(110px,1.1fr) minmax(0,2fr) 76px", gap: 12, padding: "9px 6px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</div>
            {it.sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</div>}
          </div>
          <div className="wl-bar" style={{ alignSelf: "center" }}><span style={{ width: Math.max(1.5, (it.value / m) * 100) + "%", background: it.tone || "var(--series-b)" }} /></div>
          <div style={{ textAlign: "right", fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: "var(--ink)", alignSelf: "center" }}>{fmt(it.value)}</div>
        </div>
      ))}
      {axis && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(110px,1.1fr) minmax(0,2fr) 76px", gap: 12, padding: "4px 6px 0" }}>
          <span />
          <div style={{ position: "relative", height: 16, borderTop: "1px solid var(--border-strong)" }}>
            {axis.map((a) => (
              <span key={a} style={{ position: "absolute", left: (a / m) * 100 + "%", top: 3, transform: a === 0 ? "none" : "translateX(-50%)", fontSize: 10, color: "var(--faint)", whiteSpace: "nowrap" }}>{fmt(a)}</span>
            ))}
          </div>
          <span />
        </div>
      )}
    </div>
  );
}

/** Revenue split into contractor cost + gross contribution, one bar per row. */
export function SplitBars({ rows, max, fmt }: { rows: { label: ReactNode; sub?: ReactNode; cost: number; contribution: number; onClick?: () => void }[]; max: number; fmt: (n: number) => string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--dim)", padding: "0 6px 6px", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--series-a)" }} />Contractor cost</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--series-b)" }} />Gross contribution</span>
        <span style={{ marginLeft: "auto", color: "var(--faint)" }}>Bar length = client billing (€)</span>
      </div>
      {rows.map((r, i) => {
        const total = r.cost + r.contribution;
        return (
          <div key={i} className={r.onClick ? "wl-row click" : "wl-row"} onClick={r.onClick} title={`${typeof r.label === "string" ? r.label : ""} · billing ${fmt(total)} · cost ${fmt(r.cost)} · contribution ${fmt(r.contribution)}`}
            style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(0,2.2fr) 84px", gap: 12, padding: "9px 6px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
              {r.sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{r.sub}</div>}
            </div>
            <div style={{ display: "flex", gap: 2, alignItems: "center", height: 14, alignSelf: "center" }}>
              <span style={{ width: (r.cost / max) * 100 + "%", height: "100%", background: "var(--series-a)", borderRadius: "4px 0 0 4px" }} />
              <span style={{ width: (r.contribution / max) * 100 + "%", height: "100%", background: "var(--series-b)", borderRadius: "0 4px 4px 0" }} />
            </div>
            <div style={{ textAlign: "right", alignSelf: "center" }}>
              <div style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{fmt(r.contribution)}</div>
              <div style={{ fontSize: 10.5, color: "var(--faint)" }}>of {fmt(total)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Stat({ k, v, sub }: { k: ReactNode; v: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ padding: "11px 13px", background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: 12, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--faint)" }}>{k}</div>
      <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 4, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, color: "var(--dim)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--faint)" }}>{hint}</span>}
    </label>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 13px", borderRadius: 12, background: TONE[tone].bg, color: tone === "info" ? "var(--dim)" : "var(--body)", fontSize: 12.5, lineHeight: 1.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 2, marginTop: 6, flex: "none", background: TONE[tone].dot }} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--dim)" }}>{children}</span>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", margin: "4px 2px -4px" }}>{children}</div>;
}
