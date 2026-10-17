import type { Sample, State } from "./vyra-data";

export const categories = ["Krafttraining", "Laufen", "Leichtathletik", "Teamsport", "Mobilität", "Recovery", "Eigenes Training"] as const;
export type TrainingCategory = typeof categories[number];
export type Exercise = { id: string; name: string; sets: number; reps: number; kg: number };
export type WorkoutDetails = {
  category: TrainingCategory;
  distanceKm?: number;
  exercises: Exercise[];
  notes: string;
  planId?: string;
};
export type TrainingPlan = WorkoutDetails & { id: string; date: string; title: string; minutes: number };
const numeric = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function validWorkout(v: WorkoutDetails): boolean {
  return !!v && categories.includes(v.category) &&
    typeof v.notes === "string" && v.notes.length <= 1000 &&
    (v.planId === undefined || (typeof v.planId === "string" && v.planId.length <= 100)) &&
    (v.distanceKm === undefined || numeric(v.distanceKm, 0.01, 500)) &&
    Array.isArray(v.exercises) && v.exercises.length <= 30 &&
    v.exercises.every(e => !!e && typeof e.id === "string" && e.id.length <= 100 &&
      typeof e.name === "string" && e.name.trim().length > 0 && e.name.length <= 80 &&
      numeric(e.sets, 1, 100) && Number.isInteger(e.sets) && numeric(e.reps, 1, 1000) &&
      Number.isInteger(e.reps) && numeric(e.kg, 0, 1000));
}
export function validPlan(v: TrainingPlan): boolean {
  return validWorkout(v) && typeof v.id === "string" && v.id.length <= 100 &&
    typeof v.title === "string" && v.title.trim().length > 0 && v.title.length <= 80 &&
    validDate(v.date) && numeric(v.minutes, 1, 1440);
}
export function validDate(value: string): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function trainingRecords(state: State): Sample[] {
  return state.samples.filter(s => s.metric === "workout" && s.value > 0);
}
export function weekStart(day: string) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function trainingSummary(records: Sample[], start: string, end: string) {
  const selected = records.filter(r => r.date >= start && r.date <= end);
  return {
    count: selected.length,
    days: new Set(selected.map(r => r.date)).size,
    minutes: selected.reduce((n, r) => n + r.value, 0),
    distance: selected.reduce((n, r) => n + (r.workout?.distanceKm || 0), 0),
    volume: selected.reduce((n, r) => n + (r.workout?.exercises || []).reduce((a, e) => a + e.sets * e.reps * e.kg, 0), 0),
  };
}
export function personalRecords(records: Sample[]) {
  const best = new Map<string, { name: string; kg: number; date: string }>();
  for (const record of records) for (const e of record.workout?.exercises || []) {
    const key = e.name.trim().toLocaleLowerCase("de-DE");
    if (e.kg > 0 && (!best.has(key) || best.get(key)!.kg < e.kg))
      best.set(key, { name: e.name, kg: e.kg, date: record.date });
  }
  return [...best.values()];
}
