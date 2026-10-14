"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  FileChartColumn,
  MessageCircle,
  Plus,
  Scale,
  Send,
  Trash2,
} from "lucide-react";
import {
  dateKey,
  displayDate,
  metricValue,
  number,
  shiftDate,
  totals,
} from "@/lib/vyra-data";
import { useVyra } from "./store";
import {
  BackTitle,
  Empty,
  Field,
  IconButton,
  Row,
  SectionTitle,
  Title,
  Toggle,
} from "./ui";

export function WellbeingScreen() {
  const { route, data, setData, go } = useVyra();
  if (route.detail === "cycle") return <Cycle />;
  if (route.detail === "report") return <Report />;
  if (route.detail === "chat") return <Assistant />;
  return (
    <>
      <Title title="Deine Gesundheit" eyebrow="DEIN PERSÖNLICHER BLICK" />
      <div className="rows">
        <Row
          icon={FileChartColumn}
          title="Wochenbericht"
          text="Deine Einträge im Zusammenhang"
          tone="mint"
          onClick={() => go("wellbeing", "report")}
        />
        <Row
          icon={MessageCircle}
          title="VYRA Assistent"
          text="Fragen zu deinen Daten und Routinen"
          tone="lavender"
          onClick={() => go("wellbeing", "chat")}
        />
        <Row
          icon={Scale}
          title="Körper & Gewicht"
          text={`${number(data.profile.weight, 1)} kg · Verlauf ansehen`}
          tone="blue"
          onClick={() => go("health", "weight")}
        />
        {data.cycle.enabled && (
          <Row
            icon={CalendarDays}
            title="Mein Zyklus"
            text="Periode, Symptome und persönliche Notizen"
            tone="rose"
            onClick={() => go("wellbeing", "cycle")}
          />
        )}
      </div>
      <SectionTitle>Deinen Bereich anpassen</SectionTitle>
      <Toggle
        label="Zyklus-Tracking"
        text="Optional und unabhängig von deinem Profil aktivierbar."
        checked={data.cycle.enabled}
        onChange={(enabled) =>
          setData((s) => ({ ...s, cycle: { ...s.cycle, enabled } }))
        }
      />
      <div className="notice">
        <b>Deine Daten bleiben bei dir.</b>
        <p>
          Einträge werden lokal gespeichert. Du entscheidest vor jeder
          KI-Auswertung, welche Daten du freigibst.
        </p>
      </div>
    </>
  );
}

function Cycle() {
  const { data, setData, day, toast } = useVyra();
  const [date, setDate] = useState(day),
    [editing, setEditing] = useState(false);
  const latest = [...data.cycle.entries]
    .filter((e) => e.flow !== "Keine Blutung")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const entry = data.cycle.entries.find((e) => e.date === date);
  return (
    <>
      <BackTitle title="Mein Zyklus" />
      {!data.cycle.enabled ? (
        <Empty
          icon={CalendarDays}
          title="Zyklus ausgeblendet"
          text="Du kannst diesen Bereich unter Gesundheit aktivieren."
        />
      ) : (
        <>
          <div className="metric-pair">
            <div className="metric-block">
              <span className="label">Letzter Blutungseintrag</span>
              <strong style={{ fontSize: 22 }}>
                {latest ? displayDate(latest.date, true) : "—"}
              </strong>
              <small>Basierend auf deinen Einträgen</small>
            </div>
            <div className="metric-block">
              <span className="label">Zykluslänge</span>
              <strong>
                {data.cycle.length}
                <small> Tage</small>
              </strong>
              <Field label="Anpassen">
                <input
                  aria-label="Zykluslänge"
                  type="number"
                  min="15"
                  max="90"
                  value={data.cycle.length}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 15 && n <= 90)
                      setData((s) => ({
                        ...s,
                        cycle: { ...s.cycle, length: n },
                      }));
                  }}
                />
              </Field>
            </div>
          </div>
          <p className="note">
            Dein persönliches Tagebuch. Es berechnet keine sicheren oder
            fruchtbaren Tage.
          </p>
          <button
            className="button secondary"
            onClick={() => setEditing((v) => !v)}
          >
            <Plus size={17} />
            Tag eintragen
          </button>
          {editing && (
            <form
              className="form-stack"
              key={date}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const item = {
                  date,
                  flow: String(f.get("flow")),
                  symptoms: String(f.get("symptoms")),
                  note: String(f.get("note")),
                };
                setData((s) => ({
                  ...s,
                  cycle: {
                    ...s.cycle,
                    entries: [
                      ...s.cycle.entries.filter((x) => x.date !== date),
                      item,
                    ],
                  },
                }));
                setEditing(false);
                toast("Zykluseintrag gespeichert");
              }}
            >
              <Field label="Datum">
                <input
                  type="date"
                  value={date}
                  max={dateKey()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Blutung">
                <select name="flow" defaultValue={entry?.flow}>
                  {["Keine Blutung", "Leicht", "Mittel", "Stark"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Symptome">
                <input
                  name="symptoms"
                  defaultValue={entry?.symptoms}
                  maxLength={200}
                  placeholder="z. B. Müdigkeit, Krämpfe"
                />
              </Field>
              <Field label="Notiz">
                <textarea
                  name="note"
                  defaultValue={entry?.note}
                  maxLength={500}
                />
              </Field>
              <button className="button" type="submit">
                Eintrag speichern
              </button>
            </form>
          )}
          <SectionTitle>Dein Verlauf</SectionTitle>
          {[...data.cycle.entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <div className="supplement-row" key={e.date}>
                <button
                  className="row-copy"
                  style={{ textAlign: "left" }}
                  onClick={() => {
                    setDate(e.date);
                    setEditing(true);
                  }}
                >
                  <strong>
                    {displayDate(e.date)} · {e.flow}
                  </strong>
                  <small>{e.symptoms || "Keine Symptome eingetragen"}</small>
                  {e.note && <small>{e.note}</small>}
                </button>
                <IconButton
                  icon={Trash2}
                  label="Zykluseintrag löschen"
                  onClick={() =>
                    setData((s) => ({
                      ...s,
                      cycle: {
                        ...s.cycle,
                        entries: s.cycle.entries.filter(
                          (x) => x.date !== e.date,
                        ),
                      },
                    }))
                  }
                />
              </div>
            ))}
          {!data.cycle.entries.length && (
            <Empty
              icon={CalendarDays}
              title="Dein Verlauf beginnt hier"
              text="Noch keine Zykluseinträge gespeichert."
            />
          )}
        </>
      )}
    </>
  );
}

function Report() {
  const { data, day, go } = useVyra();
  const dates = Array.from({ length: 7 }, (_, i) => shiftDate(day, i - 6));
  const records = dates.map((date) => ({
    date,
    steps: metricValue(data.samples, "steps", date),
    sleep: metricValue(data.samples, "sleep", date),
    kcal: data.entries.some((e) => e.date === date)
      ? totals(data.entries.filter((e) => e.date === date)).kcal
      : null,
  }));
  const mean = (key: "steps" | "sleep" | "kcal") => {
    const values = records.filter((r) => r[key] !== null);
    return values.length
      ? values.reduce((n, r) => n + (r[key] || 0), 0) / values.length
      : null;
  };
  const sleep = mean("sleep"),
    steps = mean("steps"),
    kcal = mean("kcal"),
    logged = records.filter((r) => r.kcal !== null).length;
  return (
    <>
      <BackTitle title="Dein Wochenbericht" />
      <p className="eyebrow">
        {displayDate(dates[0], true)} bis {displayDate(day, true)}
        {data.demo ? " · Beispieldaten" : ""}
      </p>
      <div className="report-stats">
        <div>
          <span className="label">Schlaf im Schnitt</span>
          <strong>{sleep === null ? "—" : `${number(sleep, 1)} h`}</strong>
          <small>Nur Tage mit Schlafdaten</small>
        </div>
        <div>
          <span className="label">Schritte im Schnitt</span>
          <strong>{steps === null ? "—" : number(steps)}</strong>
          <small>Nur Tage mit Aktivitätsdaten</small>
        </div>
        <div>
          <span className="label">Kalorien im Schnitt</span>
          <strong>{kcal === null ? "—" : number(kcal)}</strong>
          <small>Über {logged} erfasste Tage</small>
        </div>
        <div>
          <span className="label">Ernährung erfasst</span>
          <strong>{logged}/7</strong>
          <small>Tage mit mindestens einem Eintrag</small>
        </div>
      </div>
      <SectionTitle>Deine Woche</SectionTitle>
      <table className="chart-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Schlaf</th>
            <th>Schritte</th>
            <th>kcal</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.date}>
              <td>{displayDate(r.date, true)}</td>
              <td>{r.sleep === null ? "—" : `${number(r.sleep, 1)}h`}</td>
              <td>{r.steps === null ? "—" : number(r.steps)}</td>
              <td>{r.kcal === null ? "—" : number(r.kcal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SectionTitle>Was deine Einträge zeigen</SectionTitle>
      <div className="notice">
        <b>
          {logged < 7
            ? "Deine Übersicht ist noch unvollständig"
            : "Eine Woche im Blick"}
        </b>
        <p>
          {logged < 7
            ? `An ${7 - logged} Tagen fehlen Mahlzeiten. Ein niedriger Durchschnitt bedeutet deshalb nicht automatisch, dass du wenig gegessen hast.`
            : "Vergleiche deine Einträge mit deinen selbst gewählten Zielen. Fehlende Messwerte werden nicht als Null gewertet."}
        </p>
      </div>
      <Row
        icon={Activity}
        title="Ziele überprüfen"
        text="Kalorien, Makros und Bewegung anpassen"
        onClick={() => go("profile", "goals")}
      />
      <p className="source">
        Rechnerische Zusammenfassung deiner Daten, keine medizinische Bewertung.
      </p>
    </>
  );
}

function Assistant() {
  const { data, day } = useVyra();
  const [messages, setMessages] = useState<
      { role: "user" | "assistant"; content: string }[]
    >([]),
    [text, setText] = useState(""),
    [consent, setConsent] = useState(false),
    [includeData, setIncludeData] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((j) => setAvailable(j.available))
      .catch(() => setAvailable(false));
  }, []);
  async function send() {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setText("");
    setBusy(true);
    setError("");
    try {
      const context = includeData
        ? {
            date: day,
            exampleData: data.demo,
            nutrition: totals(data.entries.filter((e) => e.date === day)),
            goals: data.goals,
            steps: metricValue(data.samples, "steps", day),
            sleep: metricValue(data.samples, "sleep", day),
          }
        : undefined;
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: next.slice(-10),
          context,
          consent,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMessages([...next, { role: "assistant", content: j.text }]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Nachricht konnte nicht gesendet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BackTitle title="VYRA Assistent" />
      <p className="note">
        Fragen zu deinen Einträgen, Ernährung und Routinen. Antworten können
        Fehler enthalten und ersetzen keine medizinische Beratung.
      </p>
      {available === false && (
        <div className="notice">
          Der KI-Dienst ist noch nicht angeschlossen. Deine Nachrichten werden
          derzeit nicht gesendet.
        </div>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Meine Nachrichten zur Beantwortung an den KI-Dienst senden.
      </label>
      <Toggle
        label="Heutige Übersicht einbeziehen"
        text="Kalorien, Ziele, Schritte und Schlaf; keine Zyklusdaten oder Profilangaben."
        checked={includeData}
        onChange={setIncludeData}
      />
      {messages.map((m, i) => (
        <div key={i} className={`chat-message ${m.role}`}>
          {m.content}
        </div>
      ))}
      {!messages.length && (
        <Empty
          icon={MessageCircle}
          title="Was möchtest du wissen?"
          text="Zum Beispiel: Wie verteilt sich mein Eiweiß heute auf die Mahlzeiten?"
        />
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="search-input"
          aria-label="Nachricht"
          placeholder="Deine Frage …"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
        />
        <IconButton
          icon={Send}
          label="Nachricht senden"
          onClick={send}
          disabled={!consent || !available || busy || !text.trim()}
        />
      </form>
      {busy && (
        <p className="note" role="status">
          Antwort wird erstellt …
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
