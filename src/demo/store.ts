/* Local-only demo state. Every "action" in the demo mutates this store and
   writes a trace to the activity log. Nothing leaves the browser: no email,
   no upload, no payment, no API call. resetDemo() restores the canonical story. */
import { useSyncExternalStore } from "react";
import type { ActEvent, ClientId, RequestStatus, SiteId, Task, TaskStatus, WorkerId } from "./walshData";

export type ForecastInputs = {
  addWorkers: number; hoursPerWorker: number; weeks: number; billRate: number; costRate: number;
  utilisation: number; /* % of planned hours actually placed and billed */
  priceChange: number; /* % change on every client rate */
  crewCostChange: number; /* €/h change on the existing crew's contractor rate */
};

export const FORECAST_DEFAULTS: ForecastInputs = {
  addWorkers: 2, hoursPerWorker: 40, weeks: 4, billRate: 43, costRate: 29, utilisation: 100, priceChange: 0, crewCostChange: 0,
};

export type DocState = { status: "requested" | "under_review" | "verified"; at: string; newExpiry?: string; by?: string };
export type ReminderState = { text: string; status: "draft" | "pending_approval" | "approved_demo" };
export type RunStatus = "proposed" | "approved" | "dismissed";
export type Drawer = { kind: "worker" | "site" | "client" | "invoice" | "timesheet" | "agent"; id: string } | null;

export type DemoState = {
  ts1098: "pending" | "signoff_requested" | "approved";
  docs: Record<string, DocState>; /* key: workerId:certType */
  manualHolds: Record<WorkerId, boolean>;
  reminder: ReminderState;
  requests: Record<string, RequestStatus>;
  forecast: ForecastInputs;
  runs: Record<string, RunStatus>;
  tasks: Record<string, TaskStatus>;
  extraTasks: Task[];
  activity: ActEvent[];
  cover: Record<WorkerId, { siteId: SiteId; covering?: WorkerId; from: string }>;
  drawer: Drawer;
  portalClient: ClientId;
  portalWorker: WorkerId;
  toast: { text: string; n: number } | null;
  clock: number; /* minutes after 10:00 on the demo anchor day */
};

export const DEFAULT_REMINDER =
  "Hi,\n\nA quick reminder that invoice INV-2026-103 (week 37, 7–13 Sep) for €7,760 was due on 16 October and is now 31 days overdue.\n\nCould you confirm when payment is scheduled, or let us know if anything on the invoice needs correcting?\n\nThanks,\nPaul Walsh";

const initial = (): DemoState => ({
  ts1098: "pending",
  docs: {},
  manualHolds: {},
  reminder: { text: DEFAULT_REMINDER, status: "draft" },
  requests: {},
  forecast: { ...FORECAST_DEFAULTS },
  runs: {},
  tasks: {},
  extraTasks: [],
  activity: [],
  cover: {},
  drawer: null,
  portalClient: "castleview",
  portalWorker: "david-byrne",
  toast: null,
  clock: 2,
});

let state: DemoState = initial();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function getDemo(): DemoState { return state; }
export function setDemo(patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}
export function subscribeDemo(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
export function useDemo(): DemoState { return useSyncExternalStore(subscribeDemo, getDemo, getDemo); }

/* ── helpers used by actions ── */
export function demoTime(s: DemoState = state): string {
  const m = 600 + s.clock;
  return "Mon 16 Nov " + String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string) {
  setDemo((s) => ({ toast: { text, n: (s.toast?.n || 0) + 1 } }));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setDemo({ toast: null }), 3200);
}

/** Append an activity trace for a demo action. Returns the event. */
export function logActivity(e: Omit<ActEvent, "id" | "at" | "sort">) {
  setDemo((s) => {
    const at = demoTime(s);
    const ev: ActEvent = { ...e, id: "D" + (s.activity.length + 1) + "-" + s.clock, at: at + " · demo", sort: 11610 + s.clock / 100 };
    return { activity: s.activity.concat([ev]), clock: s.clock + 3 };
  });
}

export function resetDemo() {
  const keepPortal = { portalClient: state.portalClient, portalWorker: state.portalWorker };
  state = { ...initial(), ...keepPortal };
  emit();
  toast("Demo reset · canonical story restored");
}

/* ── navigation bridge (PulseLogic registers the handler) ── */
type NavFn = (page: string, tab?: string, extra?: Record<string, unknown>) => void;
let navFn: NavFn = () => {};
export function registerNav(fn: NavFn) { navFn = fn; }
export function navigate(page: string, tab?: string, drawer?: Drawer, extra?: Record<string, unknown>) {
  navFn(page, tab, extra);
  if (drawer !== undefined) setDemo({ drawer });
}
export function openDrawer(d: Drawer) { setDemo({ drawer: d }); }
export function closeDrawer() { setDemo({ drawer: null }); }
