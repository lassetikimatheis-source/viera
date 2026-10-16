import {
  metricValue,
  totals,
  type State,
  type SleepStage,
  type Training,
} from "./vyra-data";

export function balance(state: State, day: string) {
  const sleep = metricValue(state.samples, "sleep", day);
  const steps = metricValue(state.samples, "steps", day);
  const entries = state.entries.filter((e) => e.date === day);
  const clamp = (value: number) =>
    Math.round(Math.max(0, Math.min(100, value)));
  const parts = [
    {
      name: "Schlafziel",
      weight: 40,
      value:
        sleep === null ? null : clamp((sleep / (state.sleepGoal || 8)) * 100),
      route: "sleep",
    },
    {
      name: "Bewegungsziel",
      weight: 30,
      value: steps === null ? null : clamp((steps / state.goals.steps) * 100),
      route: "steps",
    },
    {
      name: "Eiweißziel",
      weight: 30,
      value: entries.length
        ? clamp((totals(entries).protein / state.goals.protein) * 100)
        : null,
      route: "nutrition",
    },
  ];
  return {
    parts,
    score: parts.some((p) => p.value === null)
      ? null
      : Math.round(
          parts.reduce((sum, p) => sum + (p.value! * p.weight) / 100, 0),
        ),
  };
}
export function elapsed(session: Training, now: number) {
  return Math.max(
    0,
    (session.pausedAt ?? now) - session.startedAt - session.pausedMs,
  );
}
export function sleepStages(
  state: State,
  day: string,
): { stages: SleepStage[]; demo: boolean } {
  const samples = state.samples.filter(
    (s) => s.metric === "sleep" && s.date === day,
  );
  const real = samples.flatMap((s) => s.stages || []);
  if (real.length) return { stages: normalizeStages(real), demo: false };
  const sample = samples.find((s) => s.source === "Beispieldaten");
  if (!sample) return { stages: [], demo: false };
  // Example stages are deliberately limited to explicitly labelled demo samples.
  const pattern: SleepStage["phase"][] = [
    "light",
    "deep",
    "light",
    "rem",
    "awake",
    "light",
    "deep",
    "light",
    "rem",
    "light",
    "rem",
  ];
  const durations = [30, 62, 45, 35, 12, 70, 46, 55, 47, 32, 40];
  const asleep = durations.reduce(
    (sum, n, i) => sum + (pattern[i] === "awake" ? 0 : n),
    0,
  );
  let cursor =
    new Date(`${day}T07:00:00`).getTime() - (sample.value * 60 + 12) * 60000;
  const stages = pattern.map((phase, i) => {
    const start = cursor;
    cursor +=
      (phase === "awake" ? 12 : (durations[i] * sample.value * 60) / asleep) *
      60000;
    return { phase, start, end: cursor };
  });
  return { stages, demo: true };
}
function normalizeStages(stages: SleepStage[]): SleepStage[] {
  const points = [...new Set(stages.flatMap((p) => [p.start, p.end]))].sort(
    (a, b) => a - b,
  );
  const result: SleepStage[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i],
      end = points[i + 1];
    const covering = stages.filter((p) => p.start <= start && p.end >= end);
    if (!covering.length) continue;
    const specific = [
      ...new Set(covering.map((p) => p.phase).filter((p) => p !== "asleep")),
    ];
    // Conflicting specific phases remain unclassified rather than double-counted.
    const phase = specific.length === 1 ? specific[0] : "asleep";
    const last = result.at(-1);
    if (last && last.phase === phase && last.end === start) last.end = end;
    else result.push({ phase, start, end });
  }
  return result;
}
