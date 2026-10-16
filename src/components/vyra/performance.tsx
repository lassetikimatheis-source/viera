"use client";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Heart,
  Moon,
  Play,
  Pause,
  Square,
  Plus,
  Link2,
} from "lucide-react";
import { balance, elapsed, sleepStages } from "@/lib/dashboard-metrics";
import { stressEvidence } from "@/lib/stress-data";
import {
  dateKey,
  metricValue,
  number,
  uid,
  type SleepStage,
} from "@/lib/vyra-data";
import { useVyra } from "./store";
import { DateNav, Field, IconButton, Meter, SectionTitle, Sheet } from "./ui";

const phaseNames = {
  awake: "Wach",
  rem: "REM",
  light: "Leicht",
  deep: "Tief",
  asleep: "Nicht bestimmt",
};
const colors = {
  awake: "#e4a3ae",
  rem: "#bca3ef",
  light: "#7e9edc",
  deep: "#6b66c6",
  asleep: "#879192",
};
const hm = (hours: number) =>
  `${Math.floor(Math.round(hours * 60) / 60)}h ${String(Math.round(hours * 60) % 60).padStart(2, "0")}`;
const time = (stamp: number) =>
  new Date(stamp).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
function Ring({
  value,
  text,
  unit,
  tone = "var(--dash-sleep)",
}: {
  value: number | null;
  text: string;
  unit: string;
  tone?: string;
}) {
  return (
    <div
      className="performance-ring"
      style={
        {
          "--ring-value": `${Math.min(100, Math.max(0, value || 0))}%`,
          "--ring-color": tone,
        } as CSSProperties
      }
    >
      <div>
        <strong>{text}</strong>
        <small>{unit}</small>
      </div>
    </div>
  );
}
export function DashboardRings() {
  const { data, day, go } = useVyra();
  const sleep = metricValue(data.samples, "sleep", day),
    load = metricValue(data.samples, "workout", day),
    score = balance(data, day).score;
  return (
    <section
      className="performance-rings"
      aria-label="Deine wichtigsten Tageswerte"
    >
      <button
        onClick={() => go("health", "sleep")}
        aria-label="Schlaf im Detail"
      >
        <Moon size={17} />
        <Ring
          value={sleep === null ? null : (sleep / (data.sleepGoal || 8)) * 100}
          text={
            sleep === null
              ? "–"
              : `${Math.round((sleep / (data.sleepGoal || 8)) * 100)}%`
          }
          unit="Schlafziel"
        />
        <b>Schlaf</b>
        <small>{sleep === null ? "Keine Daten" : hm(sleep)}</small>
      </button>
      <button
        className="balance-ring"
        onClick={() => go("health", "balance")}
        aria-label="Gesundheitsbalance im Detail"
      >
        <Heart size={17} />
        <Ring
          value={score}
          text={score === null ? "–" : String(score)}
          unit="von 100"
          tone="var(--dash-activity)"
        />
        <b>Gesundheit</b>
        <small>Balance · Beta</small>
      </button>
      <button
        onClick={() => go("health", "strain")}
        aria-label="Belastung im Detail"
      >
        <Activity size={17} />
        <Ring
          value={
            load === null ? null : (load / (data.trainingGoal || 60)) * 100
          }
          text={load === null ? "–" : number(load)}
          unit="Minuten"
          tone="var(--dash-load)"
        />
        <b>Belastung</b>
        <small>Trainingsdauer</small>
      </button>
    </section>
  );
}
export function StressBar() {
  const { data, day, setData, go } = useVyra();
  const [open, setOpen] = useState(false),
    [details, setDetails] = useState(false),
    [now, setNow] = useState(() => Date.now()),
    [draft, setDraft] = useState(5);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const evidence = stressEvidence(data, day, now);
  const value = data.stress?.[day];
  return (
    <section className="stress-section">
      <button className="stress-heading" onClick={() => setDetails(true)}>
        <span><b>Körperlicher Stress</b><small>Keine aktuelle Einschätzung</small></span>
        <ChevronRight size={16} />
      </button>
      <div className="stress-unavailable" aria-label="Kein berechneter Stresswert" />
      <p className="source">{evidence.latest
        ? `Letzter Import-Messpunkt: ${time(evidence.latest.at)} · ${evidence.latest.source}`
        : "Keine Sensordaten für diesen Tag"}</p>
      {details && <Sheet title="Körperlicher Stress" onClose={() => setDetails(false)}>
        <p className="notice">Noch kein berechneter Stresswert. Puls und HRV sind Hinweise auf körperliche Belastung, keine Messung deines psychischen Stresses. Eine geprüfte VYRA-Berechnung ist noch nicht verfügbar.</p>
        <dl className="stress-facts">
          <div><dt>Datenzugriff</dt><dd>{data.permissions.heart ? "Health-Dateiimport" : "Herzdaten deaktiviert"}</dd></div>
          <div><dt>Letzte Messung am gewählten Tag</dt><dd>{evidence.latest ? new Date(evidence.latest.at).toLocaleString("de-DE") : "Keine Messung"}</dd></div>
          <div><dt>Datenbasis</dt><dd>{evidence.today.length} Messpunkte · keine Live-Verbindung</dd></div>
        </dl>
        <SectionTitle>HRV im Tagesverlauf</SectionTitle>
        {evidence.series.length === 0 && <p className="note">Es fehlen zeitgestempelte HRV-Messungen. Schlafdauer und täglicher Ruhepuls allein reichen nicht aus.</p>}
        {evidence.series.map((series) => <section className="stress-series" key={`${series.source}:${series.kind}`}>
          <h3>{series.kind === "hrv-sdnn" ? "HRV · SDNN" : "HRV · RMSSD"}</h3>
          <p className="source">{series.source} · {series.days} Tage mit Messungen bis zu diesem Datum</p>
          {series.points.length ? <div className="stress-readings">
            {series.points.slice(-240).map((r) => <div key={r.id}>
              <time>{time(r.at)}</time>
              <meter min={0} max={1000} value={r.value} aria-label={`HRV ${time(r.at)}`} />
              <b>{number(r.value, 1)} ms</b>
              <small>{evidence.inWorkout(r) ? "Während Training" : "Aktivitätskontext unbekannt"}</small>
            </div>)}
          </div> : <p className="note">Keine Messung an diesem Tag.</p>}
        </section>)}
        <SectionTitle>Pulsmessungen</SectionTitle>
        <div className="stress-readings">
          {evidence.today.filter((r) => r.kind === "pulse").slice(-20).map((r) => <div key={r.id}>
            <time>{time(r.at)}</time><b>{number(r.value)} bpm</b>
            <small>{r.source} · {evidence.inWorkout(r) ? "Während Training" : "Aktivitätskontext unbekannt"}</small>
          </div>)}
        </div>
        <p className="note">Bis zu 240 letzte HRV- und 20 Pulsmessungen. HRV-Verfahren und Gerätequellen bleiben getrennt. Trainingsmessungen werden nicht als psychischer Stress bewertet. Fehlende Bewegungsdaten bedeuten nicht automatisch Ruhe.</p>
        <button className="button secondary" onClick={() => { setDetails(false); go("health", "connections"); }}><Link2 size={16} /> Health-Daten importieren</button>
        <p className="note">Garmin-Herstellerwerte sind noch nicht angebunden. Apple Health benötigt für automatische Synchronisierung eine native iPhone-Anbindung.</p>
      </Sheet>}
      <button
        className="stress-heading"
        onClick={() => {
          setDraft(value ?? 5);
          setOpen(true);
        }}
      >
        <span>
          <b>Wie fühlst du dich?</b>
          <small>Persönlicher Selbstcheck</small>
        </span>
        <strong>{value === undefined ? "Eintragen" : `${value}/10`}</strong>
        <ChevronRight size={16} />
      </button>
      <div
        className="stress-track"
        role={value === undefined ? "group" : "meter"}
        aria-label={
          value === undefined
            ? "Stress: noch kein Selbstcheck"
            : "Stress-Selbstcheck"
        }
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
      >
        <span />
        <span />
        <span />
        {value !== undefined && (
          <i style={{ left: `${(value * 100) / 10}%` }} />
        )}
      </div>
      <div className="stress-labels">
        <span>Entspannt</span>
        <span>Moderat</span>
        <span>Hoch</span>
      </div>
      {open && (
        <Sheet
          title="Wie gestresst fühlst du dich?"
          onClose={() => setOpen(false)}
        >
          <p className="note">
            Deine Einschätzung für diesen Tag. Kein automatisch gemessener
            Stresswert.
          </p>
          <label className="stress-input">
            {draft}/10
            <input
              aria-label="Stresslevel"
              type="range"
              min="0"
              max="10"
              step="1"
              value={draft}
              onChange={(e) => setDraft(Number(e.target.value))}
            />
          </label>
          <button
            className="button"
            onClick={() => {
              setData((s) => ({ ...s, stress: { ...s.stress, [day]: draft } }));
              setOpen(false);
            }}
          >
            Selbstcheck speichern
          </button>
          {value !== undefined && (
            <button
              className="button secondary"
              onClick={() => {
                setData((s) => {
                  const stress = { ...s.stress };
                  delete stress[day];
                  return { ...s, stress };
                });
                setOpen(false);
              }}
            >
              Selbstcheck entfernen
            </button>
          )}
        </Sheet>
      )}
    </section>
  );
}
export function TrainingEntry() {
  const { data, go } = useVyra();
  return (
    <button className="training-entry" onClick={() => go("health", "training")}>
      <span className="training-entry-icon">
        <Play size={17} />
      </span>
      <span>
        <b>{data.training ? "Training läuft" : "Training starten"}</b>
        <small>
          {data.training
            ? data.training.title
            : "Manuell · Geräte noch nicht verbunden"}
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
function DetailHeader({ title }: { title: string }) {
  const { go } = useVyra();
  return (
    <div className="detail-title">
      <IconButton
        icon={ArrowLeft}
        label="Zurück zum Dashboard"
        onClick={() => go("home")}
      />
      <h1>{title}</h1>
    </div>
  );
}
export function PerformanceDetail({
  kind,
}: {
  kind: "sleep" | "balance" | "strain";
}) {
  const { data, day, setData, go } = useVyra();
  const [picked, setPicked] = useState<SleepStage | null>(null),
    [expanded, setExpanded] = useState<string | null>(null);
  const sleep = metricValue(data.samples, "sleep", day),
    workout = metricValue(data.samples, "workout", day),
    result = balance(data, day);
  const { stages, demo } = sleepStages(data, day);
  const start = stages.length ? Math.min(...stages.map((p) => p.start)) : 0,
    end = stages.length ? Math.max(...stages.map((p) => p.end)) : 0;
  const score =
    kind === "sleep"
      ? sleep === null
        ? null
        : (sleep / (data.sleepGoal || 8)) * 100
      : kind === "balance"
        ? result.score
        : workout === null
          ? null
          : (workout / (data.trainingGoal || 60)) * 100;
  const records = data.samples.filter(
    (s) => s.metric === "workout" && s.date === day && s.value > 0,
  );
  return (
    <>
      <DetailHeader
        title={
          kind === "sleep"
            ? "Schlaf & Erholung"
            : kind === "balance"
              ? "Gesundheitsbalance"
              : "Deine Belastung"
        }
      />
      <DateNav />
      <div className="performance-hero">
        <Ring
          value={score}
          text={
            kind === "strain"
              ? workout === null
                ? "–"
                : number(workout)
              : score === null
                ? "–"
                : `${Math.round(score)}${kind === "sleep" ? "%" : ""}`
          }
          unit={
            kind === "sleep"
              ? "deines Schlafziels"
              : kind === "balance"
                ? "von 100 · Beta"
                : "Trainingsminuten"
          }
          tone={
            kind === "balance"
              ? "var(--dash-activity)"
              : kind === "strain"
                ? "var(--dash-load)"
                : undefined
          }
        />
        <p>
          {kind === "sleep"
            ? sleep === null
              ? "Noch keine Schlafdaten"
              : `${hm(sleep)} geschlafen`
            : kind === "balance"
              ? "Deine tägliche Zielbalance"
              : "Dauer, nicht gemessene Intensität"}
        </p>
      </div>
      {kind === "sleep" ? (
        <>
          <Field label="Persönliches Schlafziel (Stunden)">
            <input
              type="number"
              min="4"
              max="12"
              step="0.5"
              value={data.sleepGoal || 8}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 4 && v <= 12) setData((s) => ({ ...s, sleepGoal: v }));
              }}
            />
          </Field>
          <SectionTitle>Deine Schlafphasen</SectionTitle>
          {stages.length ? (
            <>
              <p className="source">
                {demo
                  ? "Illustrative Demo-Phasen, keine Messung"
                  : "Phasen aus deinem Health-Import"}{" "}
                · Keine Intensitätsmessung
              </p>
              <div
                className="sleep-timeline"
                aria-label="Schlafphasen im Zeitverlauf"
              >
                {(["awake", "rem", "light", "deep", "asleep"] as const)
                  .filter((phase) => stages.some((p) => p.phase === phase))
                  .map((phase) => (
                    <div className="sleep-lane" key={phase}>
                      <span>{phaseNames[phase]}</span>
                      <div>
                        {stages
                          .filter((p) => p.phase === phase)
                          .map((p, i) => (
                            <button
                              key={i}
                              aria-label={`${phaseNames[phase]}, ${time(p.start)} bis ${time(p.end)}`}
                              title={`${phaseNames[phase]} ${time(p.start)}–${time(p.end)}`}
                              onClick={() => setPicked(p)}
                              style={{
                                left: `${((p.start - start) / (end - start)) * 100}%`,
                                width: `${((p.end - p.start) / (end - start)) * 100}%`,
                                background: colors[phase],
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="sleep-times">
                <span>{time(start)}</span>
                <span>{time(end)}</span>
              </div>
              {picked &&
                stages.some(
                  (p) => p.start === picked.start && p.end === picked.end,
                ) && (
                  <p className="notice">
                    {phaseNames[picked.phase]} · {time(picked.start)}–
                    {time(picked.end)} ·{" "}
                    {number((picked.end - picked.start) / 60000)} Min.
                  </p>
                )}
              <div className="phase-totals">
                {Object.entries(phaseNames).map(([key, label]) => {
                  const total = stages
                    .filter((p) => p.phase === key)
                    .reduce((sum, p) => sum + (p.end - p.start) / 60000, 0);
                  return total > 0 ? (
                    <div key={key}>
                      <span>
                        <i
                          style={{
                            background: colors[key as keyof typeof colors],
                          }}
                        />
                        {label}
                      </span>
                      <b>{number(total)} Min.</b>
                    </div>
                  ) : null;
                })}
              </div>
            </>
          ) : (
            <div className="notice">
              Es liegt nur die Schlafdauer vor. Phasen erscheinen erst, wenn
              dein Geräteexport REM-, Leicht- oder Tiefschlaf enthält. Aus der
              Dauer allein werden keine Phasen geschätzt.
            </div>
          )}
          <button
            className="button secondary"
            onClick={() => go("health", "connections")}
          >
            <Link2 size={16} /> Schlafdaten importieren
          </button>
          <button
            className="button secondary"
            onClick={() => go("health", "sleep-log")}
          >
            <Plus size={16} /> Dauer & Verlauf bearbeiten
          </button>
        </>
      ) : kind === "balance" ? (
        <>
          <p className="notice">
            Experimenteller Zielerfüllungswert, keine medizinische Bewertung
            deines Gesundheitszustands. Er basiert derzeit auf Schlafdauer,
            Schritten und protokolliertem Eiweiß, nicht auf allen Vitaldaten.
            Ein hoher Wert bedeutet nicht, dass du gesund bist.
          </p>
          <SectionTitle>So setzt sich die Balance zusammen</SectionTitle>
          {result.parts.map((p) => (
            <button
              className="balance-part"
              key={p.name}
              onClick={() =>
                p.route === "nutrition"
                  ? go("nutrition")
                  : go("health", p.route)
              }
            >
              <span>
                <b>{p.name}</b>
                <small>{p.weight}% Gewichtung</small>
              </span>
              <strong>{p.value === null ? "Fehlt" : `${p.value}/100`}</strong>
              <ChevronRight size={16} />
              <Meter value={p.value || 0} max={100} />
            </button>
          ))}
          <p className="note">
            Schlaf: Dauer / persönliches Schlafziel. Bewegung: Schritte /
            Schrittziel. Ernährung: Eiweiß / Eiweißziel. Jeder Anteil ist auf
            100 begrenzt. Fehlt ein Bereich, bleibt der Gesamtwert offen. Im
            Laufe des Tages und bei unvollständigen Einträgen ist der Wert
            vorläufig.
          </p>
        </>
      ) : (
        <>
          <Field label="Persönliches Trainingsziel (Minuten pro Tag)">
            <input
              type="number"
              min="10"
              max="300"
              step="5"
              value={data.trainingGoal || 60}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 10 && v <= 300)
                  setData((s) => ({ ...s, trainingGoal: v }));
              }}
            />
          </Field>
          <p className="note">
            Der Ring zeigt erfasste Trainingsdauer relativ zu deinem eigenen
            Ziel. Er ist kein WHOOP-Strain-Score und bewertet weder
            Trainingsintensität noch Erholungsbedarf.
          </p>
          <TrainingEntry />
          <SectionTitle>Deine Trainingseinheiten</SectionTitle>
          {records.length ? (
            records.map((record) => (
              <div key={record.id}>
                <button
                  className="workout-history"
                  aria-expanded={expanded === record.id}
                  onClick={() =>
                    setExpanded(expanded === record.id ? null : record.id)
                  }
                >
                  <Activity size={20} />
                  <span>
                    <b>{record.title || "Training"}</b>
                    <small>{record.source}</small>
                  </span>
                  <strong>{number(record.value, 1)} Min.</strong>
                  <ChevronRight size={16} />
                </button>
                {expanded === record.id && (
                  <div className="notice">
                    {record.startedAt
                      ? `${time(record.startedAt)}${record.endedAt ? `–${time(record.endedAt)}` : ""} · `
                      : ""}
                    {record.effort
                      ? `Anstrengung: ${record.effort}/10 (Selbstangabe). `
                      : ""}
                    Pulsverlauf und Herzfrequenzzonen liegen für diese Einheit
                    nicht vor.
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="note">
              An diesem Tag ist noch keine Trainingseinheit erfasst.
            </p>
          )}
          <button
            className="button secondary"
            onClick={() => go("health", "connections")}
          >
            Trainings importieren
          </button>
        </>
      )}
    </>
  );
}
export function TrainingMode() {
  const { data, setData, setDay, go, toast } = useVyra();
  const [title, setTitle] = useState("Freies Training"),
    [now, setNow] = useState(() => Date.now()),
    [finish, setFinish] = useState(false),
    [effort, setEffort] = useState(5);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = data.training,
    seconds = session ? Math.floor(elapsed(session, now) / 1000) : 0;
  const pause = () => {
    const stamp = Date.now();
    setData((s) =>
      s.training
        ? {
            ...s,
            training: s.training.pausedAt
              ? {
                  ...s.training,
                  pausedMs: s.training.pausedMs + stamp - s.training.pausedAt,
                  pausedAt: undefined,
                }
              : { ...s.training, pausedAt: stamp },
          }
        : s,
    );
    setNow(stamp);
  };
  return (
    <>
      <DetailHeader title="Trainingsmodus" />
      {!session ? (
        <>
          <p className="note">
            Starte deine Einheit manuell. Der Timer läuft auch beim Schließen
            weiter. Automatische Erkennung durch Apple Watch oder WHOOP ist noch
            nicht verbunden.
          </p>
          <Field label="Trainingsart">
            <select value={title} onChange={(e) => setTitle(e.target.value)}>
              {[
                "Freies Training",
                "Laufen",
                "Krafttraining",
                "Radfahren",
                "Yoga",
                "Gehen",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <button
            className="button"
            onClick={() => {
              const startedAt = Date.now();
              setDay(dateKey(new Date(startedAt)));
              setNow(startedAt);
              setData((s) => ({
                ...s,
                training: { id: uid(), title, startedAt, pausedMs: 0 },
              }));
            }}
          >
            <Play size={17} /> Training starten
          </button>
        </>
      ) : (
        <>
          <div className="training-live-title">
            <span className={session.pausedAt ? "" : "live-dot"} />
            {session.pausedAt ? "PAUSIERT" : "TRAINING AKTIV"}
          </div>
          <h2>{session.title}</h2>
          <div className="training-clock" role="timer">
            {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
            {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </div>
          <p className="source">Aktive Zeit · manuell gestartet</p>
          <div className="live-metrics">
            <div>
              <Heart size={20} />
              <span>Herzfrequenz</span>
              <strong>
                – <small>bpm</small>
              </strong>
              <small>Kein Live-Sensor</small>
            </div>
            <div>
              <Activity size={20} />
              <span>Aktivenergie</span>
              <strong>
                – <small>kcal</small>
              </strong>
              <small>Kein Live-Sensor</small>
            </div>
          </div>
          <p className="notice">
            Keine Live-Verbindung zur Uhr. Herzfrequenz, Herzrhythmus und Zonen
            werden nicht simuliert. Bereits importierte Ruhepulswerte sind keine
            aktuellen Trainingswerte.
          </p>
          <div className="training-controls">
            <button className="button secondary" onClick={pause}>
              {session.pausedAt ? <Play size={18} /> : <Pause size={18} />}{" "}
              {session.pausedAt ? "Fortsetzen" : "Pause"}
            </button>
            <button
              className="button"
              onClick={() => {
                if (!session.pausedAt) pause();
                setFinish(true);
              }}
            >
              <Square size={16} /> Beenden
            </button>
          </div>
          {finish && (
            <Sheet
              title="Training abschließen"
              onClose={() => setFinish(false)}
            >
              <p className="note">
                Die Einheit ist pausiert. Wie anstrengend war sie für dich?
              </p>
              <label className="stress-input">
                {effort}/10
                <input
                  aria-label="Empfundene Anstrengung"
                  type="range"
                  min="1"
                  max="10"
                  value={effort}
                  onChange={(e) => setEffort(Number(e.target.value))}
                />
              </label>
              <button
                className="button"
                onClick={() => {
                  const endedAt = Date.now();
                  setDay(dateKey(new Date(session.startedAt)));
                  setData((s) => {
                    if (!s.training) return s;
                    const training = s.training;
                    return {
                      ...s,
                      training: null,
                      samples: [
                        ...s.samples,
                        {
                          id: training.id,
                          metric: "workout",
                          date: dateKey(new Date(training.startedAt)),
                          value: elapsed(training, endedAt) / 60000,
                          source: "Manuell",
                          title: training.title,
                          startedAt: training.startedAt,
                          endedAt: training.pausedAt || endedAt,
                          effort,
                        },
                      ],
                    };
                  });
                  setFinish(false);
                  toast("Training gespeichert");
                  go("health", "strain");
                }}
              >
                Training speichern
              </button>
              <button
                className="button danger"
                onClick={() => {
                  setData((s) => ({ ...s, training: null }));
                  setFinish(false);
                  go("home");
                }}
              >
                Einheit verwerfen
              </button>
            </Sheet>
          )}
        </>
      )}
    </>
  );
}
