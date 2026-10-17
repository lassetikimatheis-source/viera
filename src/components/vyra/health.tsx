"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Activity,
  ArrowUpRight,
  Dumbbell,
  Flame,
  Heart,
  Link2,
  Moon,
  Plus,
  Scale,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Metric,
  dateKey,
  displayDate,
  metricInfo,
  metricValue,
  number,
  shiftDate,
  uid,
} from "@/lib/vyra-data";
import { parseHealthXML } from "@/lib/health-import";
import { nativeHealthAvailable, nativeHealthXML, requestNativeHealth } from "@/lib/native-health";
import { IntegrationConnections } from "./integrations";
import { sandboxMode } from "@/lib/sandbox";
import { useVyra } from "./store";
import {
  BackTitle,
  DateNav,
  Empty,
  Field,
  IconButton,
  Row,
  SectionTitle,
  Segments,
  Sheet,
  Title,
  Toggle,
} from "./ui";
const icons = {
  steps: Activity,
  sleep: Moon,
  heart: Heart,
  active: Flame,
  weight: Scale,
  workout: Dumbbell,
};
export function HealthScreen() {
  const { data, day, go } = useVyra();
  return (
    <>
      <Title
        title="Deine Health-Daten"
        eyebrow="BEWEGUNG & ERHOLUNG"
        action={
          <IconButton
            icon={Link2}
            label="Verbindungen"
            onClick={() => go("health", "connections")}
          />
        }
      />
      <DateNav />
      <button
        className="connection-line"
        onClick={() => go("health", "connections")}
      >
        <Heart size={17} />
        <span>
          {data.samples.some(
            (s) => s.source !== "Beispieldaten" && s.source !== "Manuell",
          )
            ? "Importierte Health-Daten"
            : "Apple Health verbinden"}
        </span>
        <ArrowUpRight size={16} />
      </button>
      <div className="metric-pair">
        {(Object.keys(metricInfo) as Metric[]).map((metric) => {
          const info = metricInfo[metric],
            Icon = icons[metric],
            value = metricValue(data.samples, metric, day);
          return (
            <button
              key={metric}
              className="metric-block"
              onClick={() => go("health", metric)}
            >
              <span className="label">
                <Icon size={17} />
                {info.label}
              </span>
              <strong>
                {value === null
                  ? "—"
                  : number(
                      value,
                      metric === "sleep" || metric === "weight" ? 1 : 0,
                    )}
              </strong>
              <small>
                {info.unit} ·{" "}
                {value === null
                  ? "Keine Daten"
                  : data.demo
                    ? "Beispieldaten"
                    : "Details ansehen"}
              </small>
            </button>
          );
        })}
      </div>
      <SectionTitle action="Verlauf" onClick={() => go("health", "workout")}>
        Trainings
      </SectionTitle>
      <div className="rows">
        {data.samples
          .filter(
            (s) => s.metric === "workout" && s.date === day && s.value > 0,
          )
          .map((s) => (
            <Row
              key={s.id}
              icon={Dumbbell}
              title={s.title || "Training"}
              text={s.source}
              value={`${number(s.value)} Min.`}
              onClick={() => go("health", "workout")}
            />
          ))}
        {!data.samples.some(
          (s) => s.metric === "workout" && s.date === day && s.value > 0,
        ) && (
          <Empty
            icon={Dumbbell}
            title="Keine Trainings an diesem Tag"
            text="Importiere deine Einheiten oder ergänze ein Training."
            action="Training eintragen"
            onClick={() => go("health", "workout")}
          />
        )}
      </div>
      <p className="source">
        {data.demo
          ? "Die angezeigten Werte sind Beispieldaten."
          : "Werte aus deinen Importen und manuellen Einträgen."}
      </p>
    </>
  );
}
export function HealthDetail() {
  const { data, setData, route, day, toast } = useVyra();
  const metric = (
    route.detail === "sleep-log"
      ? "sleep"
      : route.detail && route.detail in metricInfo
        ? route.detail
        : "steps"
  ) as Metric;
  const info = metricInfo[metric];
  const [period, setPeriod] = useState("Woche"),
    [adding, setAdding] = useState(false);
  const days = period === "Tag" ? 1 : period === "Woche" ? 7 : 30;
  const chart = Array.from({ length: days }, (_, i) => {
    const date = shiftDate(day, i - days + 1);
    return {
      date,
      label:
        days === 7
          ? new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
              weekday: "short",
            })
          : displayDate(date, true),
      value: metricValue(data.samples, metric, date),
    };
  });
  const value = metricValue(data.samples, metric, day),
    available = chart.filter((c) => c.value !== null);
  const average = available.length
    ? available.reduce((sum, c) => sum + (c.value || 0), 0) / available.length
    : null;
  const records = data.samples
    .filter(
      (s) =>
        s.metric === metric &&
        s.date >= shiftDate(day, 1 - days) &&
        s.date <= day,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <BackTitle title={info.label} />
      <DateNav />
      <div>
        <span className="label">{displayDate(day)}</span>
        <div className="value-display">
          {value === null
            ? "—"
            : number(value, metric === "sleep" || metric === "weight" ? 1 : 0)}
          <small>{info.unit}</small>
        </div>
      </div>
      <Segments
        values={["Tag", "Woche", "Monat"]}
        value={period}
        onChange={setPeriod}
      />
      <div className="chart" aria-label={`${info.label}: ${period}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chart}
            margin={{ top: 8, left: 0, right: 0, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#e0e7df"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#77817c" }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <Tooltip
              formatter={(v) => [
                `${number(Number(v), 1)} ${info.unit}`,
                info.label,
              ]}
              contentStyle={{ borderRadius: 6, fontSize: 12 }}
            />
            <Bar
              dataKey="value"
              fill={
                metric === "sleep"
                  ? "#afa1cd"
                  : metric === "heart"
                    ? "#cf929e"
                    : "#91bfa4"
              }
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="stat-line">
        <span>Durchschnitt · {available.length} Tage mit Daten</span>
        <b>{average === null ? "—" : `${number(average, 1)} ${info.unit}`}</b>
      </div>
      <SectionTitle>Einträge</SectionTitle>
      {records.length ? (
        <div>
          {records.map((record) => (
            <div className="supplement-row" key={record.id}>
              <div className="row-copy">
                <strong>
                  {record.title || displayDate(record.date, true)}
                </strong>
                <small>
                  {record.source} · {displayDate(record.date, true)}
                </small>
              </div>
              <b>
                {number(record.value, 1)} <small>{info.unit}</small>
              </b>
              {record.source === "Manuell" && (
                <IconButton
                  icon={Trash2}
                  label="Eintrag löschen"
                  onClick={() =>
                    setData((s) => ({
                      ...s,
                      samples: s.samples.filter((r) => r.id !== record.id),
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={icons[metric]}
          title="Noch keine Werte"
          text="Verbinde eine Datenquelle oder trage einen Wert ein."
        />
      )}
      <button className="button secondary" onClick={() => setAdding(true)}>
        <Plus size={17} />
        Wert eintragen
      </button>
      {adding && (
        <Sheet
          title={`${info.label} eintragen`}
          onClose={() => setAdding(false)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const value = Number(f.get("value"));
              if (!Number.isFinite(value) || value <= 0) return;
              setData((s) => ({
                ...s,
                samples: [
                  ...s.samples,
                  {
                    id: uid(),
                    metric,
                    date: String(f.get("date")),
                    value,
                    source: "Manuell",
                    title:
                      metric === "workout" ? String(f.get("title")) : undefined,
                  },
                ],
                profile:
                  metric === "weight"
                    ? { ...s.profile, weight: value }
                    : s.profile,
              }));
              setAdding(false);
              toast("Eintrag gespeichert");
            }}
          >
            <Field label="Datum">
              <input
                type="date"
                name="date"
                defaultValue={day}
                max={dateKey()}
                required
              />
            </Field>
            {metric === "workout" && (
              <Field label="Training">
                <input
                  name="title"
                  placeholder="z. B. Laufen"
                  required
                  maxLength={80}
                />
              </Field>
            )}
            <Field label={`Wert (${info.unit})`}>
              <input
                name="value"
                type="number"
                min="0.1"
                max={
                  metric === "sleep" ? 24 : metric === "heart" ? 300 : 100000
                }
                step="0.1"
                required
              />
            </Field>
            <button className="button" type="submit">
              Speichern
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
export function Connections() {
  const { data, setData, toast } = useVyra();
  const native = useSyncExternalStore(() => () => {}, nativeHealthAvailable, () => false);
  const [parsed, setParsed] = useState<ReturnType<typeof parseHealthXML> | null>(null);
  const [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const receive = (event: Event) => {
      try {
        const result = parseHealthXML(nativeHealthXML((event as CustomEvent).detail));
        setParsed(result);
        setSource(result.sources[0]);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Keine freigegebenen Health-Daten verfügbar.");
      }
    };
    window.addEventListener("vyra:native-health", receive);
    window.vyraNativeHealthReady = true;
    return () => {
      window.removeEventListener("vyra:native-health", receive);
      window.vyraNativeHealthReady = false;
    };
  }, []);
  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    setParsed(null);
    setBusy(true);
    try {
      if (file.size > 30 * 1024 * 1024)
        throw new Error("Bitte einen Export unter 30 MB verwenden.");
      let text: string;
      if (file.name.toLowerCase().endsWith(".zip")) {
        const { unzip, strFromU8 } = await import("fflate");
        const bytes = new Uint8Array(await file.arrayBuffer());
        text = await new Promise<string>((resolve, reject) =>
          unzip(
            bytes,
            {
              filter: (f) =>
                /(^|\/)export\.xml$/.test(f.name) &&
                f.originalSize < 30 * 1024 * 1024,
            },
            (err, files) => {
              if (err)
                return reject(
                  new Error("ZIP-Datei konnte nicht geöffnet werden."),
                );
              const entry = Object.entries(files).find(([name]) =>
                /(^|\/)export\.xml$/.test(name),
              );
              if (!entry)
                return reject(
                  new Error("export.xml fehlt oder ist größer als 30 MB."),
                );
              resolve(strFromU8(entry[1]));
            },
          ),
        );
      } else text = await file.text();
      const result = parseHealthXML(text);
      setParsed(result);
      setSource(result.sources[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  function saveImport() {
    if (!parsed) return;
    const groupFor: Record<Metric, string> = {
      steps: "activity",
      active: "activity",
      workout: "activity",
      sleep: "sleep",
      heart: "heart",
      weight: "body",
    };
    const samples = parsed.samples.filter(
      (s) => s.source === source && data.permissions[groupFor[s.metric]],
    );
    const physiology = parsed.physiology.filter(
      (r) => r.source === source && data.permissions.heart,
    );
    if (!samples.length && !physiology.length) {
      setError("Keine freigegebenen Daten dieser Quelle.");
      return;
    }
    // Replace each imported date/metric, avoiding double counting phone and watch totals.
    const keys = new Set(samples.map((s) => `${s.date}:${s.metric}`));
    setData((s) => ({
      ...s,
      demo: false,
      physiology: [...new Map([...(s.physiology || []), ...physiology].map((r) => [r.id, r])).values()],
      entries: s.entries.filter((e) => !e.entryId.startsWith("demo-")),
      water: s.demo ? {} : s.water,
      samples: [
        ...s.samples.filter(
          (r) =>
            r.source !== "Beispieldaten" &&
            (r.metric === "workout"
              ? !samples.some(next => next.id === r.id) && !(r.id.startsWith("health:workout:") && r.source === source && keys.has(`${r.date}:workout`))
              : !keys.has(`${r.date}:${r.metric}`)),
        ),
        ...samples,
      ],
    }));
    setParsed(null);
    toast(`${samples.length + physiology.length} Werte importiert`);
  }
  return (
    <>
      <BackTitle title="Health-Verbindungen" />
      <div className="connection-status">
        <span className="icon-tile rose">
          <Heart size={23} />
        </span>
        <div>
          <h2>Apple Health</h2>
          <small>{native ? "iPhone · Import nach Freigabe" : "Automatische Synchronisierung nicht verbunden"}</small>
        </div>
      </div>
      <p className="note">
        {native ? "Lies freigegebene Werte aus Apple Health. Wähle anschließend eine Quelle und bestätige den lokalen Import. Keine automatische Hintergrund-Synchronisierung."
          : "Apple Health kann nur über eine native iPhone-App direkt freigegeben werden. Hier kannst du deinen Health-Export lokal importieren."}
      </p>
      {native && <button className="button" onClick={requestNativeHealth}><Heart size={18} /> Apple Health freigeben</button>}
      {sandboxMode() && <button className="button secondary" onClick={() => {
        const date = dateKey();
        const result = parseHealthXML(nativeHealthXML({ records: [
          { type: "HKQuantityTypeIdentifierStepCount", sourceName: "Test · Apple Watch", unit: "count", value: "7200", startDate: `${date}T08:00:00Z`, endDate: `${date}T09:00:00Z` },
          { type: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", sourceName: "Test · Apple Watch", unit: "ms", value: "45", startDate: `${date}T07:00:00Z` },
          { type: "HKCategoryTypeIdentifierSleepAnalysis", sourceName: "Test · Apple Watch", value: "HKCategoryValueSleepAnalysisAsleepCore", startDate: `${date}T01:00:00Z`, endDate: `${date}T07:00:00Z` },
        ], workouts: [] })); setParsed(result); setSource(result.sources[0]); setError("");
      }}>Apple-Health-Testdaten laden</button>}
      <label className="upload-label">
        <Upload size={25} />
        <b>{busy ? "Datei wird geprüft …" : "Health-Export importieren"}</b>
        <small>export.xml oder ZIP · bis 30 MB</small>
        <input
          type="file"
          accept=".xml,.zip"
          disabled={busy}
          onChange={(e) => importFile(e.target.files?.[0])}
        />
      </label>
      <details className="note">
        <summary>Wo finde ich meinen Export?</summary>
        <p>
          Apple Health öffnen, auf dein Profilbild tippen und „Alle
          Gesundheitsdaten exportieren“ auswählen. Die Datei bleibt bei diesem
          Import auf deinem Gerät.
        </p>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {parsed && (
        <div className="form-stack">
          <Field label="Datenquelle">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {parsed.sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <p className="note">
            {[...parsed.samples, ...parsed.physiology].filter((s) => s.source === source).length} Werte
            dieser Quelle. Pro Tag und Messwert wird der bisherige Wert ersetzt,
            damit Watch und iPhone nicht doppelt zählen.
            Puls und HRV bleiben als einzelne Messungen mit Zeitpunkt erhalten.
          </p>
          <button className="button" onClick={saveImport}>
            Ausgewählte Daten importieren
          </button>
        </div>
      )}
      <SectionTitle>Beim Import berücksichtigen</SectionTitle>
      <div>
        {[
          ["sleep", "Schlaf"],
          ["activity", "Aktivität & Training"],
          ["heart", "Herzfrequenz & HRV"],
          ["body", "Körperwerte"],
        ].map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={data.permissions[key]}
            onChange={(value) =>
              setData((s) => ({
                ...s,
                permissions: { ...s.permissions, [key]: value },
              }))
            }
          />
        ))}
      </div>
      <IntegrationConnections />
      <SectionTitle>Gespeicherte Quellen</SectionTitle>
      <div>
        {[
          ...new Set(
            data.samples
              .filter((s) => s.source !== "Beispieldaten")
              .map((s) => s.source),
          ),
        ].map((source) => (
          <div className="stat-line" key={source}>
            <span>{source}</span>
            <b>
              {data.samples.filter((s) => s.source === source).length} Werte
            </b>
          </div>
        ))}
        {!data.samples.some((s) => s.source !== "Beispieldaten") && (
          <p className="note">Noch keine eigenen Quellen.</p>
        )}
      </div>
    </>
  );
}
