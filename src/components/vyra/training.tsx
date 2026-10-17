"use client";
import { useState } from "react";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Heart, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { dateKey, displayDate, number, shiftDate, uid, type Sample } from "@/lib/vyra-data";
import { categories, personalRecords, trainingRecords, trainingSummary, validPlan, weekStart, type Exercise, type TrainingPlan } from "@/lib/training";
import { useVyra } from "./store";
import { Empty, Field, IconButton, Row, SectionTitle, Segments, Sheet, Title } from "./ui";

type Editor = { mode: "plan" | "log"; plan?: TrainingPlan; sample?: Sample; completing?: boolean };
export function TrainingScreen() {
  const { data, setData, go, day } = useVyra();
  const [view, setView] = useState("Woche");
  const [start, setStart] = useState(() => weekStart(day));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selected, setSelected] = useState<Sample | null>(null);
  const end = shiftDate(start, 6);
  const records = trainingRecords(data);
  const real = records.filter(r => r.source !== "Beispieldaten" && r.date <= dateKey());
  const summary = trainingSummary(real, start, end);
  const plans = (data.trainingPlans || []).filter(p => p.date >= start && p.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const history = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const from = shiftDate(weekStart(dateKey()), (i - 3) * 7);
    return { from, ...trainingSummary(real, from, shiftDate(from, 6)) };
  });
  return <>
    <Title title="Dein Training" eyebrow="PLANEN. TRAINIEREN. WEITERKOMMEN." action={<IconButton icon={Plus} label="Training protokollieren" onClick={() => setEditor({ mode: "log" })} />} />
    <button className="training-entry" onClick={() => go("health", "training")}>
      <Play size={20} /><span><b>{data.training ? "Training fortsetzen" : "Training starten"}</b><small>{data.training?.title || "Timer und Trainingsprotokoll"}</small></span><ChevronRight size={18} />
    </button>
    <Segments values={["Woche", "Fortschritt", "Verlauf"]} value={view} onChange={setView} />
    {view === "Woche" && <>
      <div className="week-navigation">
        <IconButton icon={ChevronLeft} label="Vorherige Woche" onClick={() => setStart(shiftDate(start, -7))} />
        <strong>{displayDate(start, true)} – {displayDate(end, true)}</strong>
        <IconButton icon={ChevronRight} label="Nächste Woche" onClick={() => setStart(shiftDate(start, 7))} />
      </div>
      <div className="training-summary">
        <div><strong>{summary.count}</strong><span>Einheiten erfasst</span></div>
        <div><strong>{number(summary.minutes)}</strong><span>Minuten</span></div>
        <div><strong>{summary.days}/7</strong><span>Trainingstage</span></div>
      </div>
      <SectionTitle>Dein Wochenplan</SectionTitle>
      <button className="button secondary" onClick={() => setEditor({ mode: "plan" })}><CalendarDays size={17} /> Einheit planen</button>
      {!plans.length && <Empty icon={CalendarDays} title="Platz für deinen nächsten Schritt" text="Für diese Woche ist noch keine Einheit geplant." />}
      {plans.map(plan => {
        const completed = records.find(r => r.workout?.planId === plan.id);
        return <article className="planned-session" key={plan.id}>
          <div className="planned-heading"><span className="eyebrow">{displayDate(plan.date, true)}</span><span className={completed ? "completed-label" : "source"}>{completed ? "Abgeschlossen" : "Geplant"}</span></div>
          <h3>{plan.title}</h3><p className="note">{plan.category} · {plan.minutes} Min.{plan.distanceKm ? ` · ${number(plan.distanceKm, 1)} km` : ""}</p>
          <div className="planned-actions">
            <button className="text-button" onClick={() => completed ? setSelected(completed) : setEditor({ mode: "log", plan, completing: true })}>{completed ? "Protokoll ansehen" : "Als absolviert erfassen"}<ChevronRight size={16} /></button>
            <IconButton icon={Pencil} label={`Plan bearbeiten: ${plan.title}`} onClick={() => setEditor({ mode: "plan", plan })} />
            <IconButton icon={Trash2} label={`Plan löschen: ${plan.title}`} onClick={() => {
              if (window.confirm("Geplante Einheit löschen? Ein abgeschlossenes Protokoll bleibt erhalten."))
                setData(s => ({ ...s, trainingPlans: (s.trainingPlans || []).filter(p => p.id !== plan.id) }));
            }} />
          </div>
        </article>;
      })}
      <SectionTitle>Erholung & Daten</SectionTitle>
      <Row icon={Heart} title="Schlaf & Erholung" text="Schlafdauer und vorhandene Schlafphasen" onClick={() => go("health", "sleep")} tone="lavender" />
      <Row icon={Activity} title="Alle Health-Daten" text="Puls, Schritte, Gewicht und Verbindungen" onClick={() => go("health", "metrics")} />
    </>}
    {view === "Fortschritt" && <>
      <SectionTitle>Deine letzten vier Wochen</SectionTitle>
      <div className="training-bars" role="img" aria-label={weeks.map(w => `${displayDate(w.from, true)}: ${w.minutes} Minuten`).join(", ")}>
        {weeks.map(w => <div key={w.from}><b>{number(w.minutes)}</b><div><span style={{ height: `${w.minutes / Math.max(1, ...weeks.map(x => x.minutes)) * 100}%` }} /></div><small>{displayDate(w.from, true)}</small></div>)}
      </div>
      <p className="source">Erfasste Minuten pro Woche · aktuelle Woche unvollständig · ohne Demo</p>
      <div className="training-summary"><div><strong>{weeks.at(-1)!.days}/7</strong><span>Trainingstage diese Woche</span></div><div><strong>{number(weeks.at(-1)!.distance, 1)}</strong><span>km protokolliert</span></div></div>
      <SectionTitle>Persönliche Bestwerte</SectionTitle>
      {personalRecords(real).map(record => <div className="stat-line" key={record.name}><span>{record.name}<small className="source"> · {displayDate(record.date, true)}</small></span><b>{number(record.kg, 1)} kg</b></div>)}
      {!personalRecords(real).length && <p className="note">Noch keine Übungen mit Gewichten erfasst. Bestwerte beziehen sich auf das höchste protokollierte Arbeitsgewicht je Übungsname, nicht auf ein berechnetes Maximalgewicht.</p>}
      <p className="note">Fortschritt zeigt deine Einträge, keine Fitness- oder Gesundheitsbewertung. Fehlende Einträge sind keine bestätigten Ruhetage.</p>
    </>}
    {view === "Verlauf" && <>
      <SectionTitle action="Eintragen" onClick={() => setEditor({ mode: "log" })}>Trainingsverlauf</SectionTitle>
      {history.slice(0, 100).map(record => <Row key={record.id} icon={Dumbbell} title={record.title || "Training"} text={`${displayDate(record.date, true)} · ${record.source}`} value={`${number(record.value)} Min.`} onClick={() => setSelected(record)} />)}
      {!history.length && <Empty icon={Dumbbell} title="Noch kein Training erfasst" text="Deine protokollierten und importierten Einheiten erscheinen hier." />}
    </>}
    {selected && <Sheet title={selected.title || "Training"} onClose={() => setSelected(null)}>
      <p className="source">{displayDate(selected.date)} · {selected.source}</p>
      <div className="training-summary"><div><strong>{number(selected.value)}</strong><span>Minuten</span></div><div><strong>{selected.workout?.distanceKm ? number(selected.workout.distanceKm, 2) : "–"}</strong><span>Kilometer</span></div></div>
      {selected.workout?.exercises.map(e => <div className="stat-line" key={e.id}><span>{e.name}</span><b>{e.sets} × {e.reps} · {e.kg} kg</b></div>)}
      <p className="note">{selected.workout?.notes}</p>
      {!selected.workout && <p className="note">Für diese Einheit wurden noch keine Übungen oder Distanzen protokolliert.</p>}
      <button className="button secondary" onClick={() => { setEditor({ mode: "log", sample: selected }); setSelected(null); }}><Pencil size={17} /> Protokoll bearbeiten</button>
      <button className="button danger" onClick={() => {
        if (window.confirm("Dieses Trainingsprotokoll löschen?")) {
          setData(s => ({ ...s, samples: s.samples.filter(r => r.id !== selected.id) })); setSelected(null);
        }
      }}><Trash2 size={17} /> Protokoll löschen</button>
    </Sheet>}
    {editor && <WorkoutEditor editor={editor} onClose={() => setEditor(null)} />}
  </>;
}

function WorkoutEditor({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { setData, toast } = useVyra();
  const initial = editor.plan || editor.sample?.workout;
  const [exercises, setExercises] = useState<Exercise[]>(initial?.exercises || []);
  const [category, setCategory] = useState(initial?.category || "Krafttraining");
  const [error, setError] = useState("");
  const planned = editor.mode === "plan";
  return <Sheet title={planned ? "Training planen" : "Training protokollieren"} onClose={onClose}>
    <form className="form-stack" onSubmit={event => {
      event.preventDefault();
      const f = new FormData(event.currentTarget);
      const entry: TrainingPlan = {
        id: editor.plan?.id || editor.sample?.id || uid(), date: String(f.get("date")),
        title: String(f.get("title")).trim(), category, minutes: Number(f.get("minutes")),
        notes: String(f.get("notes")).trim(), exercises,
        ...(f.get("distance") ? { distanceKm: Number(f.get("distance")) } : {}),
      };
      if (!validPlan(entry) || (!planned && entry.date > dateKey())) { setError("Bitte prüfe Datum, Dauer und Übungswerte."); return; }
      setData(s => {
        if (planned) return { ...s, trainingPlans: [...(s.trainingPlans || []).filter(p => p.id !== entry.id), entry] };
        const planId = editor.completing ? editor.plan?.id : editor.sample?.workout?.planId;
        // A plan can be completed only once, even after reopening the editor.
        const linked = planId ? s.samples.find(r => r.workout?.planId === planId) : undefined;
        const id = linked?.id || editor.sample?.id || uid();
        const sample: Sample = {
          ...editor.sample, id, date: entry.date, metric: "workout", title: entry.title,
          value: entry.minutes, source: "Manuell",
          workout: { category, distanceKm: entry.distanceKm, exercises, notes: entry.notes, ...(planId ? { planId } : {}) },
        };
        // Edited duration/date no longer implies an accurate imported start/end interval.
        if (editor.sample && (editor.sample.date !== entry.date || editor.sample.value !== entry.minutes)) {
          delete sample.startedAt; delete sample.endedAt;
        }
        return { ...s, samples: [...s.samples.filter(r => r.id !== id), sample] };
      });
      toast(planned ? "Training geplant" : "Training gespeichert"); onClose();
    }}>
      <Field label="Trainingstitel"><input name="title" required maxLength={80} defaultValue={editor.plan?.title || editor.sample?.title || ""} placeholder="z. B. Oberkörper" /></Field>
      <Field label="Kategorie"><select value={category} onChange={e => setCategory(e.target.value as typeof category)}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
      <div className="form-pair">
        <Field label="Trainingsdatum"><input name="date" required type="date" max={planned ? undefined : dateKey()} defaultValue={editor.sample?.date || (editor.completing ? dateKey() : editor.plan?.date) || dateKey()} /></Field>
        <Field label="Dauer (Minuten)"><input name="minutes" type="number" min={1} max={1440} required step="0.1" defaultValue={editor.plan?.minutes || (editor.sample ? Math.round(editor.sample.value * 10) / 10 : 45)} /></Field>
      </div>
      <Field label="Distanz (km, optional)"><input name="distance" type="number" min="0.01" max="500" step="0.01" defaultValue={initial?.distanceKm} /></Field>
      <SectionTitle>Übungen</SectionTitle>
      {exercises.map((exercise, index) => <fieldset className="exercise-fields" key={exercise.id}>
        <legend>Übung {index + 1}</legend>
        <div className="exercise-title"><Field label="Übungsname"><input required maxLength={80} value={exercise.name} onChange={e => setExercises(list => list.map(x => x.id === exercise.id ? { ...x, name: e.target.value } : x))} /></Field><IconButton icon={Trash2} label={`Übung ${index + 1} entfernen`} onClick={() => setExercises(list => list.filter(x => x.id !== exercise.id))} /></div>
        <div className="exercise-numbers">{(["sets", "reps", "kg"] as const).map((key, i) => <Field key={key} label={["Sätze", "Wdh.", "kg"][i]}><input type="number" required min={key === "kg" ? 0 : 1} max={key === "sets" ? 100 : 1000} step={key === "kg" ? 0.1 : 1} value={exercise[key]} onChange={e => setExercises(list => list.map(x => x.id === exercise.id ? { ...x, [key]: Number(e.target.value) } : x))} /></Field>)}</div>
      </fieldset>)}
      <button type="button" className="button secondary" disabled={exercises.length >= 30} onClick={() => setExercises(list => [...list, { id: uid(), name: "", sets: 3, reps: 10, kg: 0 }])}><Plus size={17} /> Übung hinzufügen</button>
      <Field label="Notizen"><textarea name="notes" maxLength={1000} defaultValue={initial?.notes} /></Field>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button" type="submit">{planned ? "Plan speichern" : "Protokoll speichern"}</button>
    </form>
  </Sheet>;
}
