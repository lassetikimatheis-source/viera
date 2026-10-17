import { validPlan, validWorkout, type TrainingPlan, type WorkoutDetails } from "./training.ts";
import { notificationModes, validDashboard, type DashboardPreferences, type NotificationMode } from "./preferences.ts";
export type Tab = "home" | "health" | "nutrition" | "wellbeing" | "profile";
export type Metric =
  "steps" | "sleep" | "heart" | "active" | "weight" | "workout";
export type Food = {
  id: string;
  name: string;
  brand?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  source?: string;
};
export type Entry = Food & {
  entryId: string;
  date: string;
  meal: string;
  grams: number;
};
export type Sample = {
  workout?: WorkoutDetails;
  id: string;
  metric: Metric;
  date: string;
  value: number;
  source: string;
  title?: string;
  stages?: SleepStage[];
  startedAt?: number;
  endedAt?: number;
  effort?: number;
};
export type SleepStage = {
  phase: "awake" | "rem" | "light" | "deep" | "asleep";
  start: number;
  end: number;
};
export type Training = {
  id: string;
  title: string;
  startedAt: number;
  pausedAt?: number;
  pausedMs: number;
};
export type Supplement = {
  id: string;
  name: string;
  dose: number;
  unit: string;
  dates: string[];
};
export type CycleEntry = {
  date: string;
  flow: string;
  symptoms: string;
  note: string;
};
export type State = {
  trainingPlans?: TrainingPlan[];
  dashboard?: DashboardPreferences;
  notifications?: NotificationMode;
  physiology?: PhysiologyReading[];
  sleepGoal?: number;
  trainingGoal?: number;
  stress?: Record<string, number>;
  training?: Training | null;
  version: 2;
  demo: boolean;
  profile: {
    name: string;
    email: string;
    weight: number;
    height: number;
    avatar: string;
    goal: string;
  };
  goals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    steps: number;
  };
  entries: Entry[];
  foods: Food[];
  samples: Sample[];
  water: Record<string, number>;
  supplements: Supplement[];
  cycle: { enabled: boolean; length: number; entries: CycleEntry[] };
  permissions: Record<string, boolean>;
  friends: { id: string; name: string; steps: number; date: string }[];
};
export const meals = ["Frühstück", "Mittagessen", "Abendessen", "Snacks"];
export const metricInfo: Record<
  Metric,
  { label: string; unit: string; color: string }
> = {
  steps: { label: "Schritte", unit: "Schritte", color: "mint" },
  sleep: { label: "Schlaf", unit: "Std.", color: "lavender" },
  heart: { label: "Ruhepuls", unit: "bpm", color: "rose" },
  active: { label: "Aktivenergie", unit: "kcal", color: "amber" },
  weight: { label: "Gewicht", unit: "kg", color: "blue" },
  workout: { label: "Training", unit: "Min.", color: "mint" },
};
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(day: string, offset: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
}
export function displayDate(day: string, short = false): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString(
    "de-DE",
    short
      ? { day: "numeric", month: "short" }
      : { weekday: "short", day: "numeric", month: "long" },
  );
}
export const number = (n: number, digits = 0) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(n);
export const uid = () => crypto.randomUUID();
export function totals(entries: Entry[]) {
  return entries.reduce(
    (sum, e) => ({
      kcal: sum.kcal + (e.kcal * e.grams) / 100,
      protein: sum.protein + (e.protein * e.grams) / 100,
      carbs: sum.carbs + (e.carbs * e.grams) / 100,
      fat: sum.fat + (e.fat * e.grams) / 100,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
export function metricValue(
  samples: Sample[],
  metric: Metric,
  date: string,
): number | null {
  const values = samples.filter((s) => s.metric === metric && s.date === date);
  if (!values.length) return null;
  if (metric === "weight") return values.at(-1)!.value;
  if (metric === "heart")
    return values.reduce((n, s) => n + s.value, 0) / values.length;
  return values.reduce((n, s) => n + s.value, 0);
}
export const catalogue: Food[] = [
  {
    id: "oats",
    name: "Haferflocken",
    kcal: 370,
    protein: 13,
    carbs: 59,
    fat: 7,
  },
  { id: "skyr", name: "Skyr Natur", kcal: 63, protein: 11, carbs: 4, fat: 0.2 },
  { id: "banana", name: "Banane", kcal: 89, protein: 1.1, carbs: 20, fat: 0.3 },
  {
    id: "berries",
    name: "Heidelbeeren",
    kcal: 46,
    protein: 0.6,
    carbs: 7.4,
    fat: 0.6,
  },
  {
    id: "chicken",
    name: "Hähnchenbrust, gegart",
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  },
  {
    id: "rice",
    name: "Reis, gekocht",
    kcal: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
  },
  { id: "salmon", name: "Lachs", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  {
    id: "bread",
    name: "Vollkornbrot",
    kcal: 230,
    protein: 8,
    carbs: 41,
    fat: 3,
  },
  {
    id: "egg",
    name: "Ei, gekocht",
    kcal: 155,
    protein: 13,
    carbs: 1.1,
    fat: 11,
  },
  {
    id: "avocado",
    name: "Avocado",
    kcal: 160,
    protein: 2,
    carbs: 1.8,
    fat: 15,
  },
  { id: "almonds", name: "Mandeln", kcal: 579, protein: 21, carbs: 6, fat: 50 },
  {
    id: "broccoli",
    name: "Brokkoli",
    kcal: 34,
    protein: 2.8,
    carbs: 4,
    fat: 0.4,
  },
].map((f) => ({ ...f, source: "Orientierungswerte je 100 g" }));
export function initialState(demo = true): State {
  const day = dateKey();
  const samples: Sample[] = [];
  if (demo)
    for (let i = 6; i >= 0; i--) {
      const date = shiftDate(day, -i);
      const values: Record<Metric, number> = {
        steps: [7842, 9230, 6410, 10650, 8120, 5840, 8900][i],
        sleep: [7.7, 7.2, 8.1, 6.9, 7.5, 8, 7.3][i],
        heart: [58, 60, 59, 61, 57, 58, 60][i],
        active: [482, 560, 320, 640, 440, 260, 510][i],
        weight: 72.4 + i * 0.1,
        workout: [42, 50, 0, 35, 45, 0, 32][i],
      };
      for (const metric of Object.keys(values) as Metric[])
        samples.push({
          id: `demo-${date}-${metric}`,
          date,
          metric,
          value: values[metric],
          source: "Beispieldaten",
          title: metric === "workout" ? "Freies Training" : undefined,
        });
    }
  const demoFoods = [
    ["oats", 60, meals[0]],
    ["skyr", 200, meals[0]],
    ["berries", 80, meals[0]],
    ["chicken", 150, meals[1]],
    ["rice", 180, meals[1]],
    ["broccoli", 120, meals[1]],
    ["banana", 120, meals[3]],
  ] as const;
  return {
    version: 2,
    demo,
    profile: {
      name: "Lasse",
      email: "",
      weight: 72.4,
      height: 178,
      avatar: "",
      goal: "Fit im Alltag",
    },
    goals: {
      kcal: 2200,
      protein: 140,
      carbs: 250,
      fat: 70,
      water: 2500,
      steps: 10000,
    },
    entries: demo
      ? demoFoods.map(([id, grams, meal], i) => ({
          ...catalogue.find((f) => f.id === id)!,
          entryId: `demo-${i}`,
          date: day,
          meal,
          grams,
        }))
      : [],
    foods: [],
    samples,
    water: demo ? { [day]: 1250 } : {},
    supplements: [],
    cycle: { enabled: false, length: 28, entries: [] },
    permissions: {
      sleep: true,
      activity: true,
      heart: true,
      body: true,
      ai: false,
    },
    friends: [],
  };
}
export const STORAGE_KEY = "vyra-personal-v2";
export type PhysiologyReading = {
  id: string;
  source: string;
  kind: "pulse" | "hrv-sdnn" | "hrv-rmssd";
  at: number;
  value: number;
};
export function validPhysiology(v: PhysiologyReading): boolean {
  return !!v && typeof v.id === "string" && v.id.length <= 1000 &&
    typeof v.source === "string" && v.source.length > 0 && v.source.length <= 500 &&
    ["pulse", "hrv-sdnn", "hrv-rmssd"].includes(v.kind) &&
    Number.isFinite(v.at) && v.at > 0 && v.at <= 8640000000000000 &&
    Number.isFinite(v.value) && v.value > 0 &&
    v.value <= (v.kind === "pulse" ? 300 : 1000);
}
export function readState(raw: string): State {
  const parsed = JSON.parse(raw);
  if (
    parsed.version !== 2 ||
    !parsed.profile ||
    !parsed.goals ||
    !Array.isArray(parsed.entries) ||
    !Array.isArray(parsed.samples) ||
    !Array.isArray(parsed.supplements) ||
    !parsed.cycle ||
    !Array.isArray(parsed.cycle.entries) ||
    !Array.isArray(parsed.foods) ||
    !Array.isArray(parsed.friends) ||
    !parsed.water ||
    !parsed.permissions
  )
    throw new Error("Ungültige VYRA-Datei.");
  const n = (v: unknown, min = 0, max = 1000000) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const s = (v: unknown, max = 500) => typeof v === "string" && v.length <= max;
  const day = (v: unknown) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v));
  const timestamp = (v: unknown) => n(v, 0, 8640000000000000);
  if (
    (parsed.trainingPlans !== undefined && (!Array.isArray(parsed.trainingPlans) || !parsed.trainingPlans.every(validPlan))) ||
    (parsed.dashboard !== undefined && !validDashboard(parsed.dashboard)) ||
    (parsed.notifications !== undefined && !notificationModes.includes(parsed.notifications)) ||
    (parsed.physiology !== undefined &&
      (!Array.isArray(parsed.physiology) || !parsed.physiology.every(validPhysiology))) ||
    (parsed.sleepGoal !== undefined && !n(parsed.sleepGoal, 4, 12)) ||
    (parsed.trainingGoal !== undefined && !n(parsed.trainingGoal, 10, 300)) ||
    (parsed.stress !== undefined &&
      (!parsed.stress ||
        typeof parsed.stress !== "object" ||
        Array.isArray(parsed.stress) ||
        !Object.entries(parsed.stress).every(
          ([d, v]) => day(d) && n(v, 0, 10),
        ))) ||
    (parsed.training != null &&
      (!s(parsed.training.id) ||
        !s(parsed.training.title, 80) ||
        !timestamp(parsed.training.startedAt) ||
        !n(parsed.training.pausedMs, 0, 864000000) ||
        (parsed.training.pausedAt !== undefined &&
          (!timestamp(parsed.training.pausedAt) ||
            parsed.training.pausedAt < parsed.training.startedAt))))
  )
    throw new Error("Ungültige Dashboard-Daten.");
  const food = (f: Food) =>
    f &&
    s(f.id) &&
    s(f.name, 150) &&
    f.name.trim().length > 0 &&
    n(f.kcal, 0, 900) &&
    n(f.protein, 0, 100) &&
    n(f.carbs, 0, 100) &&
    n(f.fat, 0, 100) &&
    (!f.image ||
      (s(f.image, 1000) &&
        f.image.startsWith("https://images.openfoodfacts.org/"))) &&
    (!f.brand || s(f.brand)) &&
    (!f.source || s(f.source));
  if (
    typeof parsed.demo !== "boolean" ||
    !s(parsed.profile.name, 40) ||
    !parsed.profile.name.trim() ||
    !s(parsed.profile.email, 120) ||
    !s(parsed.profile.goal, 80) ||
    !n(parsed.profile.weight, 20, 400) ||
    !n(parsed.profile.height, 100, 250) ||
    !s(parsed.profile.avatar, 700000) ||
    (parsed.profile.avatar &&
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
        parsed.profile.avatar,
      )) ||
    !n(parsed.goals.kcal, 500, 10000) ||
    !n(parsed.goals.protein, 1, 500) ||
    !n(parsed.goals.carbs, 1, 1000) ||
    !n(parsed.goals.fat, 1, 500) ||
    !n(parsed.goals.water, 100, 10000) ||
    !n(parsed.goals.steps, 100, 100000) ||
    !parsed.foods.every(food) ||
    !parsed.entries.every(
      (e: Entry) =>
        food(e) &&
        s(e.entryId) &&
        day(e.date) &&
        meals.includes(e.meal) &&
        n(e.grams, 1, 10000),
    ) ||
    !parsed.samples.every(
      (v: Sample) =>
        v &&
        s(v.id) &&
        Object.hasOwn(metricInfo, v.metric) &&
        day(v.date) &&
        n(v.value) &&
        s(v.source) &&
        (!v.title || s(v.title)) &&
        (v.workout === undefined || (v.metric === "workout" && validWorkout(v.workout))) &&
        (v.startedAt === undefined || timestamp(v.startedAt)) &&
        (v.endedAt === undefined || timestamp(v.endedAt)) &&
        (v.effort === undefined || n(v.effort, 1, 10)) &&
        (v.stages === undefined ||
          (Array.isArray(v.stages) &&
            v.stages.every(
              (p) =>
                p &&
                ["awake", "rem", "light", "deep", "asleep"].includes(p.phase) &&
                timestamp(p.start) &&
                timestamp(p.end) &&
                p.end > p.start,
            ))),
    ) ||
    !Object.entries(parsed.water).every(([d, v]) => day(d) && n(v)) ||
    !parsed.supplements.every(
      (v: Supplement) =>
        v &&
        s(v.id) &&
        s(v.name, 70) &&
        n(v.dose, 0.01) &&
        ["mg", "µg", "g", "I.E.", "Kapseln", "Tropfen"].includes(v.unit) &&
        Array.isArray(v.dates) &&
        v.dates.every(day),
    ) ||
    typeof parsed.cycle.enabled !== "boolean" ||
    !n(parsed.cycle.length, 15, 90) ||
    !parsed.cycle.entries.every(
      (v: CycleEntry) =>
        v && day(v.date) && s(v.flow) && s(v.symptoms, 200) && s(v.note, 500),
    ) ||
    !["sleep", "activity", "heart", "body", "ai"].every(
      (key) => typeof parsed.permissions[key] === "boolean",
    ) ||
    !parsed.friends.every(
      (v: State["friends"][number]) =>
        v && s(v.id) && s(v.name, 40) && n(v.steps, 0, 200000) && day(v.date),
    )
  )
    throw new Error("Ungültige Werte in der VYRA-Sicherung.");
  return parsed as State;
}
