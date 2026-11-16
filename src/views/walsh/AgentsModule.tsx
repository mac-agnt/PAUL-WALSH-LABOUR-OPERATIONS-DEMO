/* Agents: Overview · Runs · Review queue. "Agent directory" is the original
   Pulse agent messenger (src/views/pages/Agents.tsx), kept intact. */
import { useState } from "react";
import { navigate, openDrawer, useDemo } from "../../demo/store";
import { runStatus } from "../../demo/selectors";
import { decideRun } from "../../demo/actions";
import { AGENT_RUNS, AGENTS } from "../../demo/walshData";
import AgentFace from "../../components/AgentFace";
import { Badge, Btn, Card, Head, Kpi, Note, Page, Seg, Table, type Tone } from "./ui";

const FACE: Record<string, { shape: string; tint: string }> = {
  briefing: { shape: "crown-pebble", tint: "#191c1f" }, ops: { shape: "shield", tint: "#2b1b1e" },
  collector: { shape: "low-dome", tint: "#241b2e" }, invoice: { shape: "control-cube", tint: "#16241f" },
  compliance: { shape: "executive-capsule", tint: "#2a2118" }, margin: { shape: "offset-pebble", tint: "#191c1f" },
  collections: { shape: "executive-capsule", tint: "#2a2118" },
};

const statusTone = (s: string): Tone => (s === "completed" ? "ok" : s === "approved" ? "ok" : s === "dismissed" ? "neutral" : "warn");
const statusLabel = (s: string, needs: boolean) =>
  s === "completed" ? "Completed" : s === "approved" ? "Approved (demo)" : s === "dismissed" ? "Dismissed (demo)" : needs ? "Suggested · needs a person" : "Suggested · for information";

const openChat = (id: string) => navigate("Agents", "directory", undefined, { agentId: id });

function Overview() {
  const st = useDemo();
  const pending = AGENT_RUNS.filter((r) => r.needsApproval && runStatus(r.id, st) === "proposed");
  const completed = AGENT_RUNS.filter((r) => r.kind === "completed").length;
  return (
    <Page>
      <Head title="Agents" crumbs={[{ label: "Command" }, { label: "Agents" }]}
        sub="Seven agents watch hours, documents, invoices and cash. They suggest and draft; a person approves anything that touches money, messages or site access."
        right={<Btn kind="primary" onClick={() => navigate("Agents", "review")}>Review queue · {pending.length}</Btn>} />
      <div className="wl-g wl-g-4">
        <Kpi label="Agents running" value={AGENTS.length} sub="All ran this morning (demo schedule)" tone="ok" />
        <Kpi label="Runs today" value={AGENT_RUNS.length} sub={completed + " completed · " + (AGENT_RUNS.length - completed) + " suggestions"} onClick={() => navigate("Agents", "runs")} />
        <Kpi label="Waiting for a person" value={pending.length} sub="Holds, reminders, cover plans" tone={pending.length ? "warn" : "ok"} onClick={() => navigate("Agents", "review")} />
        <Kpi label="Actions taken without approval" value="0" sub="Financial actions always need a yes" tone="ok" />
      </div>
      <Note>Agents in this demo are simulations running on fixture data. No agent has sent an email, contacted a worker or client, filed anything with Revenue or touched a bank account.</Note>
      <div className="wl-g wl-g-3 stretch">
        {AGENTS.map((a) => {
          const runs = AGENT_RUNS.filter((r) => r.agent === a.id);
          const waiting = runs.filter((r) => r.needsApproval && runStatus(r.id, st) === "proposed").length;
          const f = FACE[a.id];
          return (
            <Card key={a.id} title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><AgentFace shape={f.shape} state={waiting ? "waiting" : "idle"} tint={f.tint} size="30" />{a.name}</span>}
              right={waiting ? <Badge tone="warn">{waiting} waiting</Badge> : <Badge tone="ok">Up to date</Badge>}>
              <div style={{ fontSize: 12.8, color: "var(--body)", lineHeight: 1.55, minHeight: 40 }}>{a.purpose}</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 11.8, marginTop: 12 }}>
                <span style={{ color: "var(--faint)" }}>Trigger</span><span style={{ color: "var(--body)" }}>{a.trigger}</span>
                <span style={{ color: "var(--faint)" }}>Policy</span><span style={{ color: "var(--body)" }}>{a.policy}</span>
                <span style={{ color: "var(--faint)" }}>Last</span><span style={{ color: "var(--body)" }}>{runs.length ? runs[runs.length - 1].title : a.status}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Btn small onClick={() => openChat(a.id)}>Open thread</Btn>
                <Btn small kind="ghost" onClick={() => openDrawer({ kind: "agent", id: a.id })}>Details</Btn>
              </div>
            </Card>
          );
        })}
        <Card title="How approval works" sub="Applies to every agent">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
            <div><b style={{ color: "var(--ink)" }}>Suggest.</b> Agents flag, draft and model. Nothing changes.</div>
            <div><b style={{ color: "var(--ink)" }}>Review.</b> Paul or Elaine approves in the review queue or Work › Approvals.</div>
            <div><b style={{ color: "var(--ink)" }}>Act.</b> In production an approved action would run through a connected system. In this demo it only updates the screen and the activity log.</div>
          </div>
          <div style={{ marginTop: 12 }}><Btn small onClick={() => navigate("Settings", "ai")}>AI controls</Btn></div>
        </Card>
      </div>
    </Page>
  );
}

function Runs() {
  const st = useDemo();
  const [agent, setAgent] = useState("all");
  const rows = AGENT_RUNS.filter((r) => agent === "all" || r.agent === agent);
  return (
    <Page>
      <Head title="Agent runs" crumbs={[{ label: "Agents", page: "Agents", tab: "overview" }, { label: "Runs" }]}
        sub="Every run this morning, in order. Suggested actions and completed actions are kept apart." />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Seg label="Agent" value={agent} onChange={setAgent} options={[{ id: "all", label: "All", count: AGENT_RUNS.length }].concat(AGENTS.map((a) => ({ id: a.id, label: a.name, count: AGENT_RUNS.filter((r) => r.agent === a.id).length })))} />
      </div>
      <Card flush title="Mon 16 Nov · run log" sub="Times are the demo anchor, not your clock">
        <Table minWidth={820} onRow={(r) => navigate(r.link.page, r.link.tab)} cols={[
          { k: "t", label: "Time", w: 70, render: (r) => <span className="dim">{r.at.slice(-5)}</span> },
          { k: "a", label: "Agent", render: (r) => <span className="ink">{AGENTS.find((a) => a.id === r.agent)!.name}</span> },
          { k: "w", label: "What happened", render: (r) => <div><div className="ink">{r.title}</div><div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.detail}</div></div> },
          { k: "k", label: "Type", render: (r) => <Badge tone={r.kind === "completed" ? "ok" : "accent"}>{r.kind === "completed" ? "Completed" : "Suggested"}</Badge> },
          { k: "s", label: "Status", render: (r) => { const s = runStatus(r.id, st); return <Badge tone={statusTone(s)}>{statusLabel(s, r.needsApproval)}</Badge>; } },
        ]} rows={rows} />
      </Card>
    </Page>
  );
}

function Review() {
  const st = useDemo();
  const queue = AGENT_RUNS.filter((r) => r.kind === "suggested");
  const open = queue.filter((r) => runStatus(r.id, st) === "proposed");
  const decided = queue.filter((r) => runStatus(r.id, st) !== "proposed");
  return (
    <Page>
      <Head title="Review queue" crumbs={[{ label: "Agents", page: "Agents", tab: "overview" }, { label: "Review queue" }]}
        sub="Agent suggestions waiting for a person. Approving records the decision in Activity; the underlying task still happens in its own module." />
      <div className="wl-g wl-g-3">
        <Kpi label="Waiting" value={open.length} tone={open.length ? "warn" : "ok"} />
        <Kpi label="Decided today (demo)" value={decided.length} />
        <Kpi label="Sent or paid by agents" value="0" sub="Never, in this demo" tone="ok" />
      </div>
      <div className="wl-g wl-g-21">
        <Card title="Waiting for a decision" sub="Oldest first">
          {open.length === 0 && <div style={{ padding: "18px 0", color: "var(--dim)", fontSize: 13 }}>Nothing waiting. Reset the demo from the side rail to replay the story.</div>}
          {open.map((r) => (
            <div key={r.id} className="wl-row" style={{ alignItems: "flex-start", padding: "14px 0" }}>
              <AgentFace shape={FACE[r.agent].shape} state="waiting" tint={FACE[r.agent].tint} size="28" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{AGENTS.find((a) => a.id === r.agent)!.name} · {r.at}</div>
                <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 3 }}>{r.title}</div>
                <div style={{ fontSize: 12.3, color: "var(--dim)", marginTop: 4, lineHeight: 1.5 }}>{r.detail}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn small kind="primary" onClick={() => decideRun(r.id, "approved", r.title)}>{r.needsApproval ? "Approve suggestion" : "Mark reviewed"}</Btn>
                  <Btn small kind="ghost" onClick={() => decideRun(r.id, "dismissed", r.title)}>Dismiss</Btn>
                  <Btn small kind="ghost" onClick={() => navigate(r.link.page, r.link.tab)}>Open record</Btn>
                </div>
              </div>
            </div>
          ))}
        </Card>
        <Card title="Decided (demo)" sub="Kept separate from open suggestions">
          {decided.length === 0 && <div style={{ padding: "12px 0", color: "var(--dim)", fontSize: 12.5 }}>No decisions yet.</div>}
          {decided.map((r) => { const s = runStatus(r.id, st); return (
            <div key={r.id} className="wl-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.8 }}>{r.title}</div><div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{AGENTS.find((a) => a.id === r.agent)!.name}</div></div>
              <Badge tone={statusTone(s)}>{s === "approved" ? "Approved" : "Dismissed"}</Badge>
            </div>); })}
          <div style={{ marginTop: 12 }}><Note>Approving a suggestion here does not resolve the underlying item. Sean's document, the Westbridge reminder and Patrick's renewal are each completed in their own module.</Note></div>
        </Card>
      </div>
    </Page>
  );
}

export default function AgentsModule({ tab }: { tab: string }) {
  if (tab === "runs") return <Runs />;
  if (tab === "review") return <Review />;
  return <Overview />;
}
