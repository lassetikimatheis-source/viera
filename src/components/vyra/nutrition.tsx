"use client";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Droplets,
  Minus,
  Pill,
  Plus,
  ScanLine,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  catalogue,
  Entry,
  Food,
  meals,
  number,
  Supplement,
  totals,
  uid,
} from "@/lib/vyra-data";
import { useVyra } from "./store";
import {
  DateNav,
  Empty,
  Field,
  IconButton,
  Meter,
  SectionTitle,
  Segments,
  Sheet,
  Title,
} from "./ui";

export function NutritionScreen() {
  const { data, setData, day, route, go, toast } = useVyra();
  const [meal, setMeal] = useState(meals[0]),
    [edit, setEdit] = useState<Entry | null>(null),
    [supplement, setSupplement] = useState<Supplement | "new" | null>(null);
  const entries = data.entries.filter((e) => e.date === day),
    sum = totals(entries),
    water = data.water[day] || 0;
  const add = (m: string) => {
    setMeal(m);
    go("nutrition", "add");
  };
  return (
    <>
      <Title
        title="Dein Ernährungstag"
        eyebrow="ESSEN & TRINKEN"
        action={
          <IconButton
            icon={Settings2}
            label="Ernährungsziele"
            onClick={() => go("profile", "goals")}
          />
        }
      />
      <DateNav />
      <div className="nutrition-total">
        <div className="nutrition-numbers">
          <div>
            <span className="label">
              {sum.kcal > data.goals.kcal ? "Über deinem Ziel" : "Noch offen"}
            </span>
            <div className="hero-number">
              {number(Math.abs(data.goals.kcal - sum.kcal))}
              <small>kcal</small>
            </div>
          </div>
          <div>
            <strong>{number(sum.kcal)}</strong>
            <small> gegessen</small>
            <br />
            <small>Ziel {number(data.goals.kcal)} kcal</small>
          </div>
        </div>
        <Meter value={sum.kcal} max={data.goals.kcal} />
        <div className="macro-grid">
          {(
            [
              ["protein", "Eiweiß", "lavender"],
              ["carbs", "Kohlenhydrate", "amber"],
              ["fat", "Fett", "rose"],
            ] as const
          ).map(([key, label, tone]) => (
            <div key={key}>
              <small>{label}</small>
              <strong>
                {number(sum[key])} <small>/ {data.goals[key]} g</small>
              </strong>
              <Meter value={sum[key]} max={data.goals[key]} tone={tone} />
              <small>
                {number(Math.max(0, data.goals[key] - sum[key]))} g offen
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="quick-actions">
        <button onClick={() => go("nutrition", "scan")}>
          <ScanLine />
          <span>Barcode</span>
        </button>
        <button onClick={() => go("nutrition", "photo")}>
          <Camera />
          <span>KI-Foto</span>
        </button>
        <button onClick={() => add(meals[3])}>
          <Search />
          <span>Suchen</span>
        </button>
      </div>
      {meals.map((m) => (
        <div className="meal-group" key={m}>
          <div className="meal-heading">
            <div>
              <strong>{m}</strong>
              <small>
                {number(totals(entries.filter((e) => e.meal === m)).kcal)} kcal
              </small>
            </div>
            <IconButton
              icon={Plus}
              label={`${m} hinzufügen`}
              onClick={() => add(m)}
            />
          </div>
          {entries
            .filter((e) => e.meal === m)
            .map((e) => (
              <button
                className="food-row"
                key={e.entryId}
                onClick={() => setEdit(e)}
              >
                {e.image && <img src={e.image} alt="" />}
                <span>
                  <b>{e.name}</b>
                  <small>
                    {number(e.grams)} g{e.brand ? ` · ${e.brand}` : ""}
                  </small>
                </span>
                <strong>{number((e.kcal * e.grams) / 100)}</strong>
                <ChevronRight size={14} />
              </button>
            ))}
          {!entries.some((e) => e.meal === m) && (
            <small>Noch nichts eingetragen</small>
          )}
        </div>
      ))}
      <SectionTitle>Wasser</SectionTitle>
      <div className="water-line">
        <Droplets size={20} />
        <strong>
          {number(water / 1000, 2)} / {number(data.goals.water / 1000, 1)} l
        </strong>
        <IconButton
          icon={Minus}
          label="250 ml entfernen"
          disabled={!water}
          onClick={() =>
            setData((s) => ({
              ...s,
              water: { ...s.water, [day]: Math.max(0, water - 250) },
            }))
          }
        />
        <IconButton
          icon={Plus}
          label="250 ml Wasser hinzufügen"
          onClick={() =>
            setData((s) => ({
              ...s,
              water: { ...s.water, [day]: water + 250 },
            }))
          }
        />
      </div>
      <Meter value={water} max={data.goals.water} tone="blue" />
      <SectionTitle action="Hinzufügen" onClick={() => setSupplement("new")}>
        Supplements
      </SectionTitle>
      <div>
        {data.supplements.map((s) => (
          <div className="supplement-row" key={s.id}>
            <button
              className={`check-button ${s.dates.includes(day) ? "checked" : ""}`}
              aria-label={`${s.name} ${s.dates.includes(day) ? "als nicht genommen markieren" : "als genommen markieren"}`}
              aria-pressed={s.dates.includes(day)}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  supplements: d.supplements.map((x) =>
                    x.id === s.id
                      ? {
                          ...x,
                          dates: x.dates.includes(day)
                            ? x.dates.filter((v) => v !== day)
                            : [...x.dates, day],
                        }
                      : x,
                  ),
                }))
              }
            >
              {s.dates.includes(day) && <Check size={16} />}
            </button>
            <button
              className="row-copy"
              style={{ textAlign: "left" }}
              onClick={() => setSupplement(s)}
            >
              <strong>{s.name}</strong>
              <small>
                {number(s.dose, 2)} {s.unit} ·{" "}
                {s.dates.includes(day) ? "Eingetragen" : "Noch offen"}
              </small>
            </button>
            <ChevronRight size={14} />
          </div>
        ))}
        {!data.supplements.length && (
          <Empty
            icon={Pill}
            title="Deine Supplement-Routine"
            text="Präparat, Menge und Einheit festhalten."
            action="Supplement anlegen"
            onClick={() => setSupplement("new")}
          />
        )}
      </div>
      <p className="source">
        {data.demo ? "Tagebuch mit Beispieldaten. " : ""}Eigene Einträge werden
        auf diesem Gerät gespeichert.
      </p>
      {["add", "scan", "photo"].includes(route.detail || "") && (
        <Sheet
          title={
            route.detail === "scan"
              ? "Produkt scannen"
              : route.detail === "photo"
                ? "Mahlzeit fotografieren"
                : "Essen hinzufügen"
          }
          onClose={() => go("nutrition")}
        >
          <FoodPicker
            mode={route.detail!}
            meal={meal}
            onClose={() => go("nutrition")}
          />
        </Sheet>
      )}
      {edit && (
        <Sheet title="Eintrag bearbeiten" onClose={() => setEdit(null)}>
          <Portion
            food={edit}
            entry={edit}
            meal={edit.meal}
            onDone={() => setEdit(null)}
          />
        </Sheet>
      )}
      {supplement && (
        <Sheet
          title={
            supplement === "new" ? "Supplement hinzufügen" : supplement.name
          }
          onClose={() => setSupplement(null)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                dose = Number(f.get("dose"));
              if (!Number.isFinite(dose) || dose <= 0) return;
              const item = {
                id: supplement === "new" ? uid() : supplement.id,
                name: String(f.get("name")).trim(),
                dose,
                unit: String(f.get("unit")),
                dates: supplement === "new" ? [] : supplement.dates,
              };
              setData((s) => ({
                ...s,
                supplements: [
                  ...s.supplements.filter((x) => x.id !== item.id),
                  item,
                ],
              }));
              setSupplement(null);
              toast("Supplement gespeichert");
            }}
          >
            <Field label="Präparat">
              <input
                name="name"
                required
                maxLength={70}
                defaultValue={supplement === "new" ? "" : supplement.name}
                placeholder="z. B. Vitamin D"
              />
            </Field>
            <div className="form-grid">
              <Field label="Menge">
                <input
                  name="dose"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={supplement === "new" ? "" : supplement.dose}
                />
              </Field>
              <Field label="Einheit">
                <select
                  name="unit"
                  defaultValue={supplement === "new" ? "mg" : supplement.unit}
                >
                  {["mg", "µg", "g", "I.E.", "Kapseln", "Tropfen"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="note">
              Menge laut deiner Einnahme bzw. Packung. Dieser Eintrag ist keine
              Dosierungsempfehlung.
            </p>
            <button type="submit" className="button">
              Speichern
            </button>
            {supplement !== "new" && (
              <button
                type="button"
                className="button danger"
                onClick={() => {
                  setData((s) => ({
                    ...s,
                    supplements: s.supplements.filter(
                      (x) => x.id !== supplement.id,
                    ),
                  }));
                  setSupplement(null);
                }}
              >
                <Trash2 size={16} />
                Supplement entfernen
              </button>
            )}
          </form>
        </Sheet>
      )}
    </>
  );
}

function FoodPicker({
  mode,
  meal,
  onClose,
}: {
  mode: string;
  meal: string;
  onClose: () => void;
}) {
  const { data } = useVyra();
  const [selected, setSelected] = useState<Food | null>(null),
    [grams, setGrams] = useState(100);
  const [query, setQuery] = useState(""),
    [remote, setRemote] = useState<Food[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [manual, setManual] = useState(false);
  const [method, setMethod] = useState(
    mode === "scan" ? "Barcode" : mode === "photo" ? "Foto" : "Suche",
  );
  const normalize = (s: string) =>
    s
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const results = [...data.foods, ...catalogue].filter((f) =>
    normalize(`${f.name} ${f.brand || ""}`).includes(normalize(query)),
  );
  async function lookup(code?: string) {
    setBusy(true);
    setError("");
    setRemote([]);
    try {
      const response = await fetch(
        `/api/foods?${code ? `barcode=${encodeURIComponent(code)}` : `q=${encodeURIComponent(query)}`}`,
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Suche fehlgeschlagen.");
      if (code && json.foods[0]) setSelected(json.foods[0]);
      else setRemote(json.foods);
      if (!json.foods.length)
        setError(
          "Kein Produkt gefunden. Du kannst die Nährwerte selbst eintragen.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  if (selected)
    return (
      <Portion
        food={selected}
        meal={meal}
        initialGrams={grams}
        onDone={onClose}
        onBack={() => setSelected(null)}
      />
    );
  if (manual) return <ManualFood onSelect={(f) => setSelected(f)} />;
  return (
    <>
      <Segments
        values={["Suche", "Barcode", "Foto"]}
        value={method}
        onChange={(v) => {
          setMethod(v);
          setError("");
        }}
      />
      {method === "Suche" && (
        <>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
          >
            <input
              className="search-input"
              aria-label="Lebensmittel suchen"
              placeholder="Lebensmittel oder Marke"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <IconButton
              icon={Search}
              label="Online suchen"
              disabled={busy || query.trim().length < 2}
              onClick={() => lookup()}
            />
          </form>
          <div className="search-results">
            {[...results, ...remote].map((f, i) => (
              <button
                className="food-row"
                key={`${f.id}-${i}`}
                onClick={() => setSelected(f)}
              >
                {f.image && <img src={f.image} alt="" />}
                <span>
                  <b>{f.name}</b>
                  <small>
                    {f.brand || f.source || "Lebensmittel"} · je 100 g
                  </small>
                </span>
                <strong>
                  {number(f.kcal)}
                  <small> kcal</small>
                </strong>
              </button>
            ))}
          </div>
          <p className="source">
            Online-Produktsuche: Open Food Facts (ODbL). Grundnahrungsmittel:
            Orientierungswerte.
          </p>
        </>
      )}
      {method === "Barcode" && <Scanner onCode={lookup} busy={busy} />}
      {method === "Foto" && (
        <PhotoMeal
          onFood={(food, weight) => {
            setSelected(food);
            setGrams(weight);
          }}
        />
      )}
      {busy && (
        <p className="note" role="status">
          Produkte werden geladen …
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button secondary" onClick={() => setManual(true)}>
        <Plus size={17} />
        Lebensmittel selbst anlegen
      </button>
    </>
  );
}

function Portion({
  food,
  meal,
  entry,
  initialGrams = 100,
  onDone,
  onBack,
}: {
  food: Food;
  meal: string;
  entry?: Entry;
  initialGrams?: number;
  onDone: () => void;
  onBack?: () => void;
}) {
  const { setData, day, toast } = useVyra();
  const [grams, setGrams] = useState(entry?.grams || initialGrams),
    [targetMeal, setTargetMeal] = useState(meal);
  const factor = grams / 100;
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!Number.isFinite(grams) || grams <= 0) return;
        const item: Entry = {
          ...food,
          entryId: entry?.entryId || uid(),
          grams,
          meal: targetMeal,
          date: entry?.date || day,
        };
        setData((s) => ({
          ...s,
          entries: [
            ...s.entries.filter((x) => x.entryId !== item.entryId),
            item,
          ],
        }));
        toast("Mahlzeit gespeichert");
        onDone();
      }}
    >
      <div>
        <h2>{food.name}</h2>
        <p className="source">
          {food.brand} {food.source}
        </p>
      </div>
      {food.image && (
        <img className="photo-preview" src={food.image} alt={food.name} />
      )}
      <div className="form-grid">
        <Field label="Portion in g">
          <input
            type="number"
            min="1"
            max="10000"
            step="1"
            value={grams || ""}
            required
            onChange={(e) => setGrams(Number(e.target.value))}
          />
        </Field>
        <Field label="Mahlzeit">
          <select
            value={targetMeal}
            onChange={(e) => setTargetMeal(e.target.value)}
          >
            {meals.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="value-display">
        {number(food.kcal * factor)}
        <small>kcal</small>
      </div>
      <div className="macro-grid">
        {[
          ["Eiweiß", food.protein],
          ["Kohlenhydrate", food.carbs],
          ["Fett", food.fat],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{number(Number(value) * factor, 1)} g</strong>
          </div>
        ))}
      </div>
      <button type="submit" className="button">
        {entry ? "Änderung speichern" : "Zum Tagebuch hinzufügen"}
      </button>
      {entry ? (
        <button
          className="button danger"
          type="button"
          onClick={() => {
            setData((s) => ({
              ...s,
              entries: s.entries.filter((e) => e.entryId !== entry.entryId),
            }));
            onDone();
          }}
        >
          <Trash2 size={16} />
          Eintrag löschen
        </button>
      ) : (
        onBack && (
          <button type="button" className="button secondary" onClick={onBack}>
            Andere Auswahl
          </button>
        )
      )}
    </form>
  );
}

function ManualFood({ onSelect }: { onSelect: (food: Food) => void }) {
  const { setData } = useVyra();
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const item: Food = {
          id: uid(),
          name: String(f.get("name")).trim(),
          kcal: Number(f.get("kcal")),
          protein: Number(f.get("protein")),
          carbs: Number(f.get("carbs")),
          fat: Number(f.get("fat")),
          source: "Eigene Nährwerte je 100 g",
        };
        setData((s) => ({ ...s, foods: [...s.foods, item] }));
        onSelect(item);
      }}
    >
      <Field label="Lebensmittel">
        <input name="name" required maxLength={100} />
      </Field>
      <p className="note">Nährwerte je 100 g von der Verpackung übernehmen.</p>
      <div className="form-grid">
        {[
          ["kcal", "Kalorien (kcal)", 900],
          ["protein", "Eiweiß (g)", 100],
          ["carbs", "Kohlenhydrate (g)", 100],
          ["fat", "Fett (g)", 100],
        ].map(([key, label, max]) => (
          <Field key={key} label={String(label)}>
            <input
              name={String(key)}
              required
              type="number"
              step="0.1"
              min="0"
              max={max}
            />
          </Field>
        ))}
      </div>
      <button className="button" type="submit">
        Portion wählen
      </button>
    </form>
  );
}

function Scanner({
  onCode,
  busy,
}: {
  onCode: (code: string) => void;
  busy: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<{ stop: () => void } | null>(null),
    alive = useRef(true);
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [active, setActive] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controls.current?.stop();
    };
  }, []);
  function accept(raw: string) {
    let clean = raw.trim();
    if (!/^\d{8,14}$/.test(clean)) {
      try {
        const url = new URL(clean);
        clean =
          url.pathname.match(/\/(?:01|product|produit)\/(\d{8,14})/)?.[1] || "";
      } catch {
        clean = "";
      }
    }
    if (!/^\d{8,14}$/.test(clean)) {
      setError(
        "Dieser QR-Code enthält keine Produktnummer. Bitte den EAN-Barcode verwenden.",
      );
      return;
    }
    setCode(clean);
    onCode(clean);
  }
  async function start() {
    setError("");
    setActive(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        video.current!,
        (result, _error, ctl) => {
          if (result && alive.current) {
            ctl.stop();
            setActive(false);
            accept(result.getText());
          }
        },
      );
      if (!alive.current) result.stop();
      else controls.current = result;
    } catch {
      if (alive.current) {
        setActive(false);
        setError(
          "Kamera nicht verfügbar oder nicht freigegeben. Produktnummer manuell eingeben.",
        );
      }
    }
  }
  return (
    <div className="form-stack">
      <video
        ref={video}
        className="camera-preview"
        playsInline
        muted
        style={{ display: active ? "block" : "none" }}
      />
      {!active && (
        <button className="button secondary" onClick={start} disabled={busy}>
          <Camera size={17} />
          Kamera starten
        </button>
      )}
      {active && (
        <button
          className="button secondary"
          onClick={() => {
            controls.current?.stop();
            setActive(false);
          }}
        >
          Kamera stoppen
        </button>
      )}
      <p className="note">
        EAN-Barcode oder Produkt-QR-Code scannen. Nur die Produktnummer wird an
        Open Food Facts gesendet.
      </p>
      <Field label="Produktnummer (EAN / GTIN)">
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="z. B. 3017620422003"
        />
      </Field>
      <button
        className="button"
        disabled={busy || !code}
        onClick={() => accept(code)}
      >
        Produkt suchen
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoMeal({
  onFood,
}: {
  onFood: (food: Food, grams: number) => void;
}) {
  const [image, setImage] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setError("Bitte JPG, PNG oder WebP unter 3 MB wählen.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "photo", image, consent }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (!j.food) throw new Error("Keine Mahlzeit erkannt.");
      onFood(
        {
          ...j.food,
          id: uid(),
          source: "KI-Schätzung je 100 g · bitte prüfen",
        },
        j.grams,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-stack">
      {image && (
        <img className="photo-preview" src={image} alt="Gewählte Mahlzeit" />
      )}
      <label className="upload-label">
        <Camera size={25} />
        <span>Foto aufnehmen oder auswählen</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => load(e.target.files?.[0])}
        />
      </label>
      <p className="note">
        Die KI schätzt Lebensmittel, Portionsgröße und Kalorien. Vor dem
        Speichern kannst du die Portion korrigieren.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Dieses Foto zur Analyse an den KI-Dienst senden.
      </label>
      <button
        className="button"
        disabled={!image || !consent || busy}
        onClick={analyze}
      >
        {busy ? "Mahlzeit wird analysiert …" : "Mahlzeit analysieren"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
