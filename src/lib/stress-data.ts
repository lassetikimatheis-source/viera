import type { State, PhysiologyReading } from "./vyra-data";

function dayKey(at: number) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Preserve measurement method and source. Daily averages are not live stress inputs.
export function stressEvidence(data: State, day: string, now: number) {
  const readings = (data.permissions.heart ? data.physiology || [] : [])
    .filter((r) => r.at <= now && dayKey(r.at) <= day)
    .sort((a, b) => a.at - b.at);
  const today = readings.filter((r) => dayKey(r.at) === day);
  const groups = new Map<string, PhysiologyReading[]>();
  for (const r of readings) {
    if (r.kind === "pulse") continue;
    const key = `${r.source}:${r.kind}`;
    const group = groups.get(key) || [];
    group.push(r);
    groups.set(key, group);
  }
  const workouts = data.samples.filter((s) => s.metric === "workout" && s.date === day);
  const inWorkout = (r: PhysiologyReading) => workouts.some((s) =>
    s.startedAt !== undefined && s.endedAt !== undefined &&
    r.at >= s.startedAt && r.at <= s.endedAt,
  );
  return {
    today,
    latest: today.at(-1),
    inWorkout,
    series: [...groups.values()].map((items) => ({
      source: items[0].source,
      kind: items[0].kind,
      days: new Set(items.map((r) => dayKey(r.at))).size,
      points: today.filter((r) => r.source === items[0].source && r.kind === items[0].kind),
    })),
  };
}
