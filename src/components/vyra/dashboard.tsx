"use client";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Heart,
  Moon,
  Plus,
  Link2,
  Utensils,
  Droplets,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  dateKey,
  displayDate,
  metricValue,
  number,
  shiftDate,
  totals,
  type Metric,
} from "@/lib/vyra-data";
import { useVyra } from "./store";
import { DateNav, Meter, SectionTitle } from "./ui";
import { DashboardRings, StressBar, TrainingEntry } from "./performance";
import { DashboardLayout } from "./dashboard-layout";

const views = [
  {
    key: "sleep",
    name: "Schlaf",
    unit: "Std.",
    color: "var(--dash-sleep)",
    icon: Moon,
  },
  {
    key: "heart",
    name: "Ruhepuls",
    unit: "bpm",
    color: "var(--dash-heart)",
    icon: Heart,
  },
  {
    key: "steps",
    name: "Aktivität",
    unit: "Schritte",
    color: "var(--dash-activity)",
    icon: Activity,
  },
] as const;
function duration(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}`;
}

export function Dashboard() {
  const { data, day, go, setData, toast } = useVyra();
  const [selected, setSelected] = useState<"sleep" | "heart" | "steps">(
    "sleep",
  );
  const config = views.find((v) => v.key === selected)!;
  const value = (metric: Metric, date = day) =>
    metricValue(data.samples, metric, date);
  const history = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(day, i - 6);
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
        weekday: "short",
      }),
      value: value(selected, date),
    };
  });
  const present = history.flatMap((p) => (p.value === null ? [] : [p.value]));
  const average = present.length
    ? present.reduce((a, b) => a + b, 0) / present.length
    : null;
  const today = value(selected);
  const previous = Array.from({ length: 7 }, (_, i) =>
    value(selected, shiftDate(day, -i - 1)),
  ).filter((v): v is number => v !== null);
  const baseline =
    previous.length >= 3
      ? previous.reduce((a, b) => a + b, 0) / previous.length
      : null;
  const difference =
    today !== null && baseline !== null ? today - baseline : null;
  const display = (v: number | null, metric = selected) =>
    v === null ? "–" : metric === "sleep" ? duration(v) : number(v);
  const sum = totals(data.entries.filter((e) => e.date === day));
  const steps = value("steps");
  const workouts = data.samples.filter(
    (s) => s.metric === "workout" && s.date === day,
  );
  const hasData = data.samples.some((s) => s.date === day);
  return (
    <div className="dashboard-v3">
      <div className="dash-heading">
        <div>
          <p className="dash-eyebrow">DEIN TAGESÜBERBLICK</p>
          <h1>
            {day === dateKey()
              ? `Hallo, ${data.profile.name.split(" ")[0]}.`
              : displayDate(day)}
          </h1>
        </div>
        <button
          className="dash-source"
          onClick={() => go("health", "connections")}
        >
          <span className={hasData ? "connected-dot" : ""} />
          {data.demo ? "Demo" : hasData ? "Datenquellen" : "Verbinden"}
          <Link2 size={13} />
        </button>
      </div>
      <DateNav />
      <DashboardLayout>
      <div id="overview" key="overview">
      <DashboardRings />
      <p className="ring-disclaimer">
        Balance: Zielerfüllung, keine medizinische Bewertung.
      </p>
      </div>
      <div id="training" key="training">
      <TrainingEntry />
      <button className="text-button" onClick={() => go("health")}>Trainingsplan & Fortschritt <ChevronRight size={16} /></button>
      </div>
      <div id="stress" key="stress">
      <StressBar />
      </div>
      <section id="trend" key="trend" className="dash-trend" aria-label="Dein Wochenverlauf">
        <div className="dash-section-head">
          <h2>Dein Rhythmus</h2>
          <span>7 Tage</span>
        </div>
        <div className="dash-tabs" role="group" aria-label="Verlauf auswählen">
          {views.map((v) => (
            <button
              key={v.key}
              aria-pressed={selected === v.key}
              onClick={() => setSelected(v.key)}
              style={{ "--metric-color": v.color } as React.CSSProperties}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="dash-chart-heading">
          <div>
            <strong>{display(average)}</strong>
            <span>
              {selected === "sleep"
                ? "Schlaf im Schnitt"
                : `${config.unit} im Schnitt`}
            </span>
          </div>
          <span className="dash-coverage">{present.length}/7 Tage erfasst</span>
        </div>
        <div
          className="dash-chart"
          role="img"
          aria-label={`${config.name}, letzte sieben Tage: ${history.map((p) => `${displayDate(p.date, true)} ${p.value === null ? "keine Daten" : number(p.value, 1) + " " + config.unit}`).join(", ")}`}
        >
          {present.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ top: 8, right: 4, left: -27, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--line)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickCount={4}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload.date
                      ? displayDate(payload[0].payload.date, true)
                      : ""
                  }
                  formatter={(v) => [
                    selected === "sleep"
                      ? duration(Number(v))
                      : number(Number(v)),
                    config.name,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  fill={config.color}
                  fillOpacity={0.09}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--panel)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-no-data">
              <Activity size={25} />
              <span>Noch kein Verlauf</span>
              <button onClick={() => go("health", "connections")}>
                Health-Daten hinzufügen <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="dash-comparison">
          <span style={{ color: config.color }}>
            <config.icon size={17} />
          </span>
          <p>
            {difference === null ? (
              "Ein Vergleich erscheint ab drei vorherigen Tagen mit Daten."
            ) : (
              <>
                <b>
                  {difference > 0 ? "+" : difference < 0 ? "−" : ""}
                  {number(
                    Math.abs(difference) * (selected === "sleep" ? 60 : 1),
                  )}{" "}
                  {selected === "sleep" ? "Min." : config.unit}
                </b>{" "}
                gegenüber deinem bisherigen Schnitt.
              </>
            )}
          </p>
          <button
            aria-label={`${config.name} im Detail öffnen`}
            onClick={() => go("health", selected)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
      <section id="day" key="day" className="dash-day">
        <SectionTitle action="Alle Werte" onClick={() => go("health", "metrics")}>
          Dein Tag
        </SectionTitle>
        <button className="dash-steps" onClick={() => go("health", "steps")}>
          <div>
            <Activity size={18} />
            <span>Bewegungsziel</span>
            <ChevronRight size={16} />
          </div>
          <p>
            <strong>{steps === null ? "–" : number(steps)}</strong>
            <span>/ {number(data.goals.steps)} Schritte</span>
          </p>
          <Meter value={steps || 0} max={data.goals.steps} />
          <small>
            {steps === null
              ? "Noch keine Schritte erfasst"
              : `${Math.round((steps / data.goals.steps) * 100)} % deines Tagesziels`}
          </small>
        </button>
        <button
          className="dash-activity-row"
          onClick={() => go("health", "workout")}
        >
          <span className="dash-activity-icon">
            <Activity size={21} />
          </span>
          <span>
            <b>
              {workouts.length
                ? workouts.length === 1
                  ? workouts[0].title || "Training"
                  : `${workouts.length} Trainingseinträge`
                : "Noch kein Training"}
            </b>
            <small>
              {workouts.length
                ? `${number(value("workout") || 0)} Min. erfasst`
                : "Training eintragen oder importieren"}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>
      </section>
      <section id="nutrition" key="nutrition" className="dash-nutrition">
        <div className="dash-section-head">
          <h2>Deine Versorgung</h2>
          <button
            aria-label="Mahlzeit hinzufügen"
            onClick={() => go("nutrition", "add")}
          >
            <Plus size={20} />
          </button>
        </div>
        <button className="dash-nutrition-line" onClick={() => go("nutrition")}>
          <Utensils size={17} />
          <span>Kalorien</span>
          <strong>
            {number(sum.kcal)} <small>/ {number(data.goals.kcal)} kcal</small>
          </strong>
          <ChevronRight size={14} />
        </button>
        <Meter value={sum.kcal} max={data.goals.kcal} tone="amber" />
        <div className="dash-fuel-bottom">
          <button onClick={() => go("nutrition")}>
            <span>Eiweiß</span>
            <b>
              {number(sum.protein)} <small>/ {data.goals.protein} g</small>
            </b>
          </button>
          <button
            aria-label="250 ml Wasser hinzufügen"
            onClick={() => {
              setData((s) => ({
                ...s,
                water: { ...s.water, [day]: (s.water[day] || 0) + 250 },
              }));
              toast("250 ml Wasser eingetragen");
            }}
          >
            <span>
              <Droplets size={13} /> Wasser <Plus size={12} />
            </span>
            <b>
              {number((data.water[day] || 0) / 1000, 2)}{" "}
              <small>/ {number(data.goals.water / 1000, 1)} l</small>
            </b>
          </button>
        </div>
      </section>
      <button id="report" key="report" className="dash-report" onClick={() => go("wellbeing", "report")}>
        <span>
          <b>Die Woche im Überblick</b>
          <small>Schlaf, Bewegung und Ernährung</small>
        </span>
        <ArrowUpRight size={20} />
      </button>
      </DashboardLayout>
      <p className="source">
        {data.demo
          ? "Beispieldaten · Keine gesundheitliche Bewertung"
          : "Deine erfassten Werte · Fehlende Daten bleiben offen"}
      </p>
    </div>
  );
}
