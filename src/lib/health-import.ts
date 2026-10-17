import {
  shiftDate,
  type Sample,
  type Metric,
  type SleepStage,
  type PhysiologyReading,
  validPhysiology,
} from "./vyra-data";

const types: Record<string, Metric> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierRestingHeartRate: "heart",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active",
  HKQuantityTypeIdentifierBodyMass: "weight",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep",
};

export function parseHealthXML(text: string): {
  samples: Sample[];
  sources: string[];
  physiology: PhysiologyReading[];
} {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror") || !xml.querySelector("HealthData"))
    throw new Error("Keine gültige Apple-Health-Exportdatei.");
  const grouped = new Map<
    string,
    {
      metric: Metric;
      date: string;
      source: string;
      values: number[];
      intervals: [number, number][];
      stages?: SleepStage[];
    }
  >();
  const physiology = new Map<string, PhysiologyReading>();
  const sensorTypes: Record<string, PhysiologyReading["kind"]> = {
    HKQuantityTypeIdentifierHeartRate: "pulse",
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv-sdnn",
    HKQuantityTypeIdentifierHeartRateVariabilityRMSSD: "hrv-rmssd",
  };
  xml.querySelectorAll("Record").forEach((record) => {
    const kind = sensorTypes[record.getAttribute("type") || ""];
    if (kind) {
      const source = record.getAttribute("sourceName") || "Apple Health";
      const at = Date.parse((record.getAttribute("startDate") || "").replace(" ", "T").replace(" ", ""));
      const unit = record.getAttribute("unit");
      if (kind === "pulse" ? unit !== "count/min" : !["ms", "s"].includes(unit || "")) return;
      const value = Number(record.getAttribute("value")) * (kind !== "pulse" && unit === "s" ? 1000 : 1);
      const id = `sensor:${source}:${kind}:${at}`;
      const reading = { id, source, kind, at, value };
      if (validPhysiology(reading)) physiology.set(id, reading);
      return;
    }
    const metric = types[record.getAttribute("type") || ""];
    if (!metric) return;
    const start = record.getAttribute("startDate") || "";
    const end = record.getAttribute("endDate") || start;
    let date = (metric === "sleep" ? end : start).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const source = record.getAttribute("sourceName") || "Apple Health";
    let value = Number(record.getAttribute("value"));
    const unit = record.getAttribute("unit");
    if (metric === "sleep") {
      const raw = record.getAttribute("value") || "";
      const phase = raw.endsWith("AsleepREM")
        ? "rem"
        : raw.endsWith("AsleepDeep")
          ? "deep"
          : raw.endsWith("AsleepCore")
            ? "light"
            : raw.endsWith("Awake")
              ? "awake"
              : raw.includes("Asleep")
                ? "asleep"
                : null;
      if (!phase) return;
      if (Number(end.slice(11, 13)) >= 18) date = shiftDate(date, 1);
      const from = Date.parse(start.replace(" ", "T").replace(" ", ""));
      const to = Date.parse(end.replace(" ", "T").replace(" ", ""));
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return;
      const key = `${date}:${metric}:${source}`;
      const bucket = grouped.get(key) || {
        metric,
        date,
        source,
        values: [],
        intervals: [],
      };
      if (phase !== "awake") bucket.intervals.push([from, to]);
      bucket.stages = [
        ...(bucket.stages || []),
        { phase, start: from, end: to },
      ];
      grouped.set(key, bucket);
      return;
    }
    if (!Number.isFinite(value) || value < 0) return;
    if (metric === "weight" && unit === "lb") value *= 0.45359237;
    if (metric === "active" && unit === "kJ") value /= 4.184;
    const key = `${date}:${metric}:${source}`;
    const bucket = grouped.get(key) || {
      metric,
      date,
      source,
      values: [],
      intervals: [],
    };
    bucket.values.push(value);
    grouped.set(key, bucket);
  });
  const samples: Sample[] = [...grouped]
    .filter(([, g]) => g.metric !== "sleep" || g.intervals.length)
    .map(([id, g]) => {
      let value: number;
      if (g.metric === "sleep") {
        // Merge overlapping asleep stages from the same source before summing.
        const intervals = g.intervals.sort((a, b) => a[0] - b[0]);
        let total = 0,
          start = intervals[0][0],
          end = intervals[0][1];
        for (const next of intervals.slice(1)) {
          if (next[0] <= end) end = Math.max(end, next[1]);
          else {
            total += end - start;
            [start, end] = next;
          }
        }
        value = (total + end - start) / 3600000;
      } else if (g.metric === "heart")
        value = g.values.reduce((a, b) => a + b, 0) / g.values.length;
      else if (g.metric === "weight") value = g.values.at(-1)!;
      else value = g.values.reduce((a, b) => a + b, 0);
      return {
        id: `health:${id}`,
        metric: g.metric,
        date: g.date,
        value,
        source: g.source,
        ...(g.stages ? { stages: g.stages } : {}),
      };
    });
  xml.querySelectorAll("Workout").forEach((workout) => {
    const start = workout.getAttribute("startDate") || "";
    let value = Number(workout.getAttribute("duration"));
    if (workout.getAttribute("durationUnit") === "s") value /= 60;
    if (!Number.isFinite(value) || value <= 0) return;
    samples.push({
      id: `health:workout:${start}:${workout.getAttribute("sourceName") || "Apple Health"}:${workout.getAttribute("workoutActivityType") || "Training"}`,
      metric: "workout",
      date: start.slice(0, 10),
      value,
      source: workout.getAttribute("sourceName") || "Apple Health",
      ...(Number.isFinite(Date.parse(start))
        ? { startedAt: Date.parse(start) }
        : {}),
      ...(Number.isFinite(Date.parse(workout.getAttribute("endDate") || ""))
        ? { endedAt: Date.parse(workout.getAttribute("endDate")!) }
        : {}),
      title: (
        workout.getAttribute("workoutActivityType") || "Training"
      ).replace("HKWorkoutActivityType", ""),
    });
  });
  if (!samples.length && !physiology.size)
    throw new Error("Keine unterstützten Messwerte in dieser Datei.");
  return { samples, physiology: [...physiology.values()], sources: [...new Set([...samples, ...physiology.values()].map((s) => s.source))] };
}
