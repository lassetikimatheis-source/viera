import type { PhysiologyReading, Sample, State } from "../vyra-data";
import type { Provider } from "./config.ts";
export type ImportBatch = { samples: Sample[]; physiology: PhysiologyReading[]; provider: Provider; from: string; to: string; fetchedAt: number };
type RecordData = Record<string, unknown>;
const object = (value: unknown): RecordData => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {};
const numeric = (value: unknown, max = 1000000): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
function localDay(stamp: string, offset?: string) {
  const date = new Date(stamp);
  if (!Number.isFinite(date.getTime())) return null;
  if (offset && /^[+-]\d\d:\d\d$/.test(offset)) {
    const minutes = (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4))) * (offset[0] === "-" ? -1 : 1);
    return new Date(date.getTime() + minutes * 60000).toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
export function normalizeProvider(provider: Provider, input: { sleeps?: unknown[]; recoveries?: unknown[]; workouts?: unknown[] }, from: string, to: string): ImportBatch {
  const samples: Sample[] = [], physiology: PhysiologyReading[] = [];
  const source = provider === "whoop" ? "WHOOP" : "Strava";
  const sleepDates = new Map<string, { date: string; at: number }>();
  for (const value of input.sleeps || []) {
    const row = object(value), score = object(row.score), stages = object(score.stage_summary);
    const date = typeof row.end === "string" ? localDay(row.end, String(row.timezone_offset || "")) : null;
    if (!date || typeof row.id !== "string" || row.score_state !== "SCORED") continue;
    const times = [stages.total_light_sleep_time_milli, stages.total_slow_wave_sleep_time_milli, stages.total_rem_sleep_time_milli];
    if (!times.every(v => numeric(v, 86400000))) continue;
    const hours = (times as number[]).reduce((a, b) => a + b, 0) / 3600000;
    if (hours <= 0 || hours > 24) continue;
    samples.push({ id: `whoop:sleep:${row.id}`, date, source, metric: "sleep", value: hours });
    sleepDates.set(row.id, { date, at: Date.parse(String(row.end)) });
  }
  for (const value of input.recoveries || []) {
    const row = object(value), score = object(row.score), linked = sleepDates.get(String(row.sleep_id));
    // Recovery belongs to the linked sleep day, not the API's update timestamp.
    if (!linked || row.score_state !== "SCORED" || score.user_calibrating === true) continue;
    if (numeric(score.resting_heart_rate, 300) && score.resting_heart_rate > 0)
      samples.push({ id: `whoop:heart:${row.cycle_id}`, date: linked.date, source, metric: "heart", value: score.resting_heart_rate });
    if (numeric(score.hrv_rmssd_milli, 1000) && score.hrv_rmssd_milli > 0)
      physiology.push({ id: `whoop:hrv:${row.cycle_id}`, source, kind: "hrv-rmssd", at: linked.at, value: score.hrv_rmssd_milli });
  }
  for (const value of input.workouts || []) {
    const row = object(value);
    const start = provider === "whoop" ? row.start : row.start_date;
    const at = typeof start === "string" ? Date.parse(start) : NaN;
    const minutes = provider === "whoop"
      ? (Date.parse(String(row.end)) - at) / 60000
      : numeric(row.moving_time) ? row.moving_time / 60 : NaN;
    const date = provider === "whoop"
      ? localDay(String(start), String(row.timezone_offset || ""))
      : typeof row.start_date_local === "string" ? row.start_date_local.slice(0, 10) : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date || !Number.isFinite(at) || !numeric(minutes, 1440) || minutes <= 0 ||
        !["string", "number"].includes(typeof row.id)) continue;
    const title = String(provider === "whoop" ? row.sport_name || "Training" : row.name || row.sport_type || "Training").slice(0, 80);
    samples.push({ id: `${provider}:workout:${row.id}`, date, source, metric: "workout", value: minutes, title,
      startedAt: at, endedAt: provider === "whoop" ? Date.parse(String(row.end)) : at + (numeric(row.elapsed_time) ? row.elapsed_time : minutes * 60) * 1000,
      ...(provider === "strava" && numeric(row.distance, 500000) && row.distance > 0 ? {
        workout: { category: "Eigenes Training", distanceKm: row.distance / 1000, exercises: [], notes: "Aus Strava importiert. Dauer entspricht Bewegungszeit." },
      } : {}),
    });
  }
  return { provider, samples: samples.filter(s => s.date >= from && s.date <= to), physiology: physiology.filter(r => {
    const date = sleepDates.size ? [...sleepDates.values()].find(s => s.at === r.at)?.date : undefined;
    return date !== undefined && date >= from && date <= to;
  }), from, to, fetchedAt: Date.now() };
}
export function mergeProviderImport(state: State, batch: ImportBatch): State {
  const allowed = batch.samples.filter(s => state.permissions[s.metric === "sleep" ? "sleep" : s.metric === "heart" ? "heart" : "activity"]);
  const incomingKeys = new Set(allowed.filter(s => s.metric !== "workout").map(s => `${s.date}:${s.metric}`));
  const ids = new Set(allowed.map(s => s.id));
  // Keep one source for each daily metric. For workouts, retain existing records
  // unless their provider ID matches. Flag cross-provider duplicates for review.
  const samples = state.samples.filter(s => s.source !== "Beispieldaten" && !ids.has(s.id) && !incomingKeys.has(`${s.date}:${s.metric}`));
  const physiology = state.permissions.heart ? batch.physiology : [];
  return { ...state, demo: false,
    samples: [...samples, ...allowed],
    physiology: [...new Map([...(state.physiology || []), ...physiology].map(r => [r.id, r])).values()],
    entries: state.entries.filter(e => !e.entryId.startsWith("demo-")), water: state.demo ? {} : state.water,
  };
}
export function likelyDuplicate(existing: Sample[], candidate: Sample) {
  return candidate.metric === "workout" && candidate.startedAt !== undefined && existing.some(s =>
    s.metric === "workout" && s.id !== candidate.id && s.startedAt !== undefined && s.source !== candidate.source &&
    Math.abs(s.startedAt - candidate.startedAt!) <= 120000 && Math.abs(s.value - candidate.value) <= Math.max(2, candidate.value * 0.1));
}
