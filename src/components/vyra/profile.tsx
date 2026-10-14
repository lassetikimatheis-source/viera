"use client";
import { useState } from "react";
import {
  CreditCard,
  Download,
  Link2,
  Settings2,
  Share2,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import {
  dateKey,
  displayDate,
  initialState,
  metricValue,
  number,
  readState,
  uid,
} from "@/lib/vyra-data";
import { useVyra } from "./store";
import {
  BackTitle,
  Empty,
  Field,
  IconButton,
  Row,
  SectionTitle,
  Sheet,
  Title,
  Toggle,
} from "./ui";
function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ProfileScreen() {
  const { data, setData, route, go, toast } = useVyra();
  const [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  if (route.detail === "edit") return <EditProfile />;
  if (route.detail === "goals") return <Goals />;
  if (route.detail === "friends") return <Friends />;
  if (route.detail === "payment")
    return (
      <>
        <BackTitle title="Zahlung & Mitgliedschaft" />
        <div className="profile-hero">
          <span className="icon-tile mint">
            <CreditCard size={22} />
          </span>
          <div>
            <h2>VYRA Vorschau</h2>
            <small>Kein kostenpflichtiges Abo aktiv</small>
          </div>
        </div>
        <p className="note">
          Zahlungsanbieter und Abonnements sind noch nicht angeschlossen. In
          dieser Version werden keine Zahlungen ausgelöst und keine
          Zahlungsdaten erfasst.
        </p>
        <div className="stat-line">
          <span>Zahlungsmittel</span>
          <b>Keines hinterlegt</b>
        </div>
        <div className="stat-line">
          <span>Rechnungen</span>
          <b>Keine vorhanden</b>
        </div>
      </>
    );
  if (route.detail === "privacy")
    return (
      <>
        <BackTitle title="Daten & Datenschutz" />
        <p className="note">
          Profil, Tagebuch, importierte Health-Daten und Zykluseinträge liegen
          im lokalen Browserspeicher dieses Geräts. Es gibt derzeit kein
          Online-Konto und keinen geräteübergreifenden Sync.
        </p>
        <div className="notice">
          Beim Löschen der Browserdaten gehen lokale Einträge verloren. Du
          kannst hier eine Sicherung exportieren.
        </div>
        <SectionTitle>Was wird übertragen?</SectionTitle>
        <p className="note">
          Produktsuche: Suchbegriff oder Produktnummer an Open Food Facts. KI:
          nur nach Freigabe das ausgewählte Foto bzw. Nachrichten und optional
          die Tagesübersicht an den konfigurierten KI-Dienst. Health-Importe
          bleiben lokal. Ein Challenge-Link enthält nur den von dir gewählten
          Namen, das Datum und Schritte.
        </p>
        <button
          className="button secondary"
          onClick={() =>
            download(`vyra-${dateKey()}.json`, JSON.stringify(data, null, 2))
          }
        >
          <Download size={17} />
          Meine Daten exportieren
        </button>
        <label className="upload-label">
          <Upload size={22} />
          <span>VYRA-Sicherung wiederherstellen</span>
          <input
            className="file-input"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 5000000) throw new Error("Sicherung zu groß.");
                const parsed = readState(await file.text());
                if (
                  !window.confirm(
                    "Aktuelle lokale Daten durch diese Sicherung ersetzen?",
                  )
                )
                  return;
                setData(parsed);
                toast("Sicherung wiederhergestellt");
              } catch {
                setError("Die Datei ist keine gültige VYRA-Sicherung.");
              }
            }}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button danger" onClick={() => setConfirm("delete")}>
          <Trash2 size={16} />
          Alle lokalen Daten löschen
        </button>
        {confirm && (
          <Sheet
            title="Daten endgültig löschen?"
            onClose={() => setConfirm("")}
          >
            <p className="note">
              Dein Profil, Tagebuch, Health-Importe und Zyklusdaten auf diesem
              Gerät werden entfernt. Exportiere vorher eine Sicherung, wenn du
              sie behalten möchtest.
            </p>
            <button
              className="button danger"
              onClick={() => {
                const clean = initialState(false);
                clean.profile.name = "Du";
                setData(clean);
                setConfirm("");
                toast("Lokale Daten gelöscht");
                go("profile");
              }}
            >
              Jetzt löschen
            </button>
          </Sheet>
        )}
      </>
    );
  return (
    <>
      <Title title="Dein Profil" eyebrow="DEIN VYRA" />
      <div className="profile-hero">
        <div className="profile-avatar">
          {data.profile.avatar ? (
            <img src={data.profile.avatar} alt="Profilbild" />
          ) : (
            data.profile.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <h2>{data.profile.name}</h2>
          <small>{data.profile.goal}</small>
        </div>
        <IconButton
          icon={Settings2}
          label="Profil bearbeiten"
          onClick={() => go("profile", "edit")}
        />
      </div>
      <div className="metric-pair">
        <button className="metric-block" onClick={() => go("health", "weight")}>
          <span className="label">Gewicht</span>
          <strong>
            {number(data.profile.weight, 1)}
            <small> kg</small>
          </strong>
          <small>Verlauf ansehen</small>
        </button>
        <button className="metric-block" onClick={() => go("profile", "goals")}>
          <span className="label">Kalorienziel</span>
          <strong>{number(data.goals.kcal)}</strong>
          <small>kcal pro Tag</small>
        </button>
      </div>
      <div className="rows">
        <Row
          icon={UserRound}
          title="Persönliche Angaben"
          text="Name, Profilbild, E-Mail & Körperwerte"
          onClick={() => go("profile", "edit")}
        />
        <Row
          icon={Target}
          title="Ziele & Einstellungen"
          text="Kalorien, Makros, Wasser und Bewegung"
          tone="lavender"
          onClick={() => go("profile", "goals")}
        />
        <Row
          icon={Link2}
          title="Health-Verbindungen"
          text="Apple Health, Import und Datenquellen"
          tone="rose"
          onClick={() => go("profile", "connections")}
        />
        <Row
          icon={Users}
          title="Freunde & Challenges"
          text="Schritte teilen und vergleichen"
          tone="blue"
          onClick={() => go("profile", "friends")}
        />
        <Row
          icon={ShieldCheck}
          title="Daten & Datenschutz"
          text="Export, Sicherung und Löschung"
          onClick={() => go("profile", "privacy")}
        />
        <Row
          icon={CreditCard}
          title="Zahlung & Mitgliedschaft"
          text="Aktuell kein kostenpflichtiges Abo"
          tone="amber"
          onClick={() => go("profile", "payment")}
        />
      </div>
      {data.demo && (
        <div className="notice">
          <b>Du siehst Beispieldaten.</b>
          <p>Starte mit einem leeren Tagebuch für deine eigenen Werte.</p>
          <button className="text-button" onClick={() => setConfirm("demo")}>
            Beispieldaten entfernen
          </button>
        </div>
      )}
      <p className="source">
        VYRA · Persönliche Web-Vorschau · Daten lokal gespeichert
      </p>
      {confirm === "demo" && (
        <Sheet title="Eigene Daten verwenden" onClose={() => setConfirm("")}>
          <p className="note">
            Beispiel-Mahlzeiten, Beispiel-Messwerte und der Wasserzähler werden
            entfernt. Eigene Mahlzeiten, Messwerte und dein Profil bleiben
            erhalten.
          </p>
          <button
            className="button"
            onClick={() => {
              setData((s) => ({
                ...s,
                demo: false,
                entries: s.entries.filter(
                  (e) => !e.entryId.startsWith("demo-"),
                ),
                samples: s.samples.filter((v) => v.source !== "Beispieldaten"),
                water: {},
              }));
              setConfirm("");
              toast("Bereit für deine eigenen Daten");
            }}
          >
            Ohne Beispieldaten starten
          </button>
        </Sheet>
      )}
    </>
  );
}
function EditProfile() {
  const { data, setData, go, toast } = useVyra();
  const [avatar, setAvatar] = useState(data.profile.avatar),
    [error, setError] = useState("");
  return (
    <>
      <BackTitle title="Persönliche Angaben" />
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            weight = Number(f.get("weight"));
          setData((s) => ({
            ...s,
            profile: {
              ...s.profile,
              name: String(f.get("name")).trim(),
              email: String(f.get("email")).trim(),
              weight,
              height: Number(f.get("height")),
              avatar,
            },
            samples:
              weight !== s.profile.weight
                ? [
                    ...s.samples,
                    {
                      id: uid(),
                      metric: "weight",
                      value: weight,
                      date: dateKey(),
                      source: "Manuell",
                    },
                  ]
                : s.samples,
          }));
          toast("Profil gespeichert");
          go("profile");
        }}
      >
        <div className="profile-hero">
          <div className="profile-avatar">
            {avatar ? <img src={avatar} alt="Profilbild" /> : <UserRound />}
          </div>
          <Field label="Profilbild">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 500000
                ) {
                  setError("Bitte ein JPG, PNG oder WebP unter 500 KB wählen.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setAvatar(String(reader.result));
                  setError("");
                };
                reader.readAsDataURL(file);
              }}
            />
          </Field>
        </div>
        {avatar && (
          <button
            type="button"
            className="text-button"
            onClick={() => setAvatar("")}
          >
            Profilbild entfernen
          </button>
        )}
        <Field label="Name">
          <input
            name="name"
            defaultValue={data.profile.name}
            required
            maxLength={40}
          />
        </Field>
        <Field label="E-Mail-Adresse">
          <input
            name="email"
            type="email"
            defaultValue={data.profile.email}
            maxLength={120}
            placeholder="name@beispiel.de"
          />
        </Field>
        <p className="source">
          Nur lokal im Profil gespeichert. Keine Anmeldung oder
          E-Mail-Verifizierung.
        </p>
        <div className="form-grid">
          <Field label="Gewicht (kg)">
            <input
              name="weight"
              type="number"
              min="20"
              max="400"
              step="0.1"
              required
              defaultValue={data.profile.weight}
            />
          </Field>
          <Field label="Größe (cm)">
            <input
              name="height"
              type="number"
              min="100"
              max="250"
              required
              defaultValue={data.profile.height}
            />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="button">
          Profil speichern
        </button>
      </form>
    </>
  );
}
function Goals() {
  const { data, setData, go, toast } = useVyra();
  return (
    <>
      <BackTitle title="Ziele & Einstellungen" />
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setData((s) => ({
            ...s,
            profile: { ...s.profile, goal: String(f.get("goal")) },
            goals: {
              kcal: Number(f.get("kcal")),
              protein: Number(f.get("protein")),
              carbs: Number(f.get("carbs")),
              fat: Number(f.get("fat")),
              water: Number(f.get("water")),
              steps: Number(f.get("steps")),
            },
          }));
          toast("Ziele gespeichert");
          go("profile");
        }}
      >
        <Field label="Dein Fokus">
          <select name="goal" defaultValue={data.profile.goal}>
            {[
              "Fit im Alltag",
              "Gewicht halten",
              "Muskelaufbau",
              "Bewusster essen",
              "Mehr Bewegung",
            ].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <p className="note">
          Deine selbst gewählten Tagesziele. VYRA leitet daraus keine
          medizinischen Vorgaben ab.
        </p>
        <div className="form-grid">
          {(
            [
              ["kcal", "Kalorien (kcal)", 500, 10000],
              ["protein", "Eiweiß (g)", 1, 500],
              ["carbs", "Kohlenhydrate (g)", 1, 1000],
              ["fat", "Fett (g)", 1, 500],
              ["water", "Wasser (ml)", 100, 10000],
              ["steps", "Schritte", 100, 100000],
            ] as const
          ).map(([key, label, min, max]) => (
            <Field key={key} label={label}>
              <input
                name={key}
                type="number"
                min={min}
                max={max}
                required
                defaultValue={data.goals[key]}
              />
            </Field>
          ))}
        </div>
        <button className="button" type="submit">
          Ziele speichern
        </button>
      </form>
      <Toggle
        label="Zyklus in Gesundheit anzeigen"
        checked={data.cycle.enabled}
        onChange={(enabled) =>
          setData((s) => ({ ...s, cycle: { ...s.cycle, enabled } }))
        }
      />
    </>
  );
}
function Friends() {
  const { data, setData, toast } = useVyra();
  const [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [share, setShare] = useState("");
  const today = dateKey(),
    steps = metricValue(data.samples, "steps", today) || 0;
  function makeLink() {
    const payload = btoa(
      encodeURIComponent(
        JSON.stringify({ name: data.profile.name, steps, date: today }),
      ),
    );
    setShare(`${location.origin}/#profile/friends?challenge=${payload}`);
  }
  function importLink(raw: string) {
    setError("");
    try {
      const payload = raw.split("challenge=")[1]?.split("&")[0];
      if (!payload) throw new Error();
      const item = JSON.parse(decodeURIComponent(atob(payload)));
      if (
        typeof item.name !== "string" ||
        item.name.length > 40 ||
        !Number.isFinite(item.steps) ||
        item.steps < 0 ||
        item.steps > 200000 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
      )
        throw new Error();
      const friend = {
        id: uid(),
        name: item.name,
        steps: item.steps,
        date: item.date,
      };
      setData((s) => ({
        ...s,
        friends: [
          ...s.friends.filter(
            (f) => !(f.name === friend.name && f.date === friend.date),
          ),
          friend,
        ],
      }));
      setLink("");
      toast("Geteiltes Ergebnis hinzugefügt");
    } catch {
      setError("Dieser Link enthält kein gültiges Challenge-Ergebnis.");
    }
  }
  const pending =
    typeof window !== "undefined" && location.hash.includes("?challenge=")
      ? location.href
      : "";
  const ranking = [
    { id: "self", name: `${data.profile.name} (du)`, steps, date: today },
    ...data.friends.filter((f) => f.date === today),
  ].sort((a, b) => b.steps - a.steps);
  return (
    <>
      <BackTitle title="Freunde & Challenges" />
      <Title title="Gemeinsam in Bewegung" eyebrow="SCHRITTE · HEUTE" />
      <p className="note">
        Teile deinen heutigen Schrittstand per Link. Freunde können ihn
        importieren und vergleichen. Das sind geteilte Momentaufnahmen;
        Online-Konten und Live-Sync sind noch nicht angeschlossen.
      </p>
      <div>
        {ranking.map((f, i) => (
          <div className="supplement-row" key={f.id}>
            <span className="badge">{i + 1}</span>
            <div className="row-copy">
              <strong>{f.name}</strong>
              <small>{displayDate(f.date, true)}</small>
            </div>
            <b>{number(f.steps)}</b>
          </div>
        ))}
      </div>
      {data.demo && (
        <p className="notice">
          Dein Schrittstand stammt aus Beispieldaten. Für eine echte Challenge
          zuerst eigene Daten verwenden.
        </p>
      )}
      <button className="button" disabled={data.demo} onClick={makeLink}>
        <Share2 size={17} />
        Meinen Schrittstand teilen
      </button>
      {share && (
        <>
          <p className="note">
            Im Link enthalten: {data.profile.name}, {number(steps)} Schritte,{" "}
            {displayDate(today)}.
          </p>
          <input
            className="search-input"
            aria-label="Challenge-Link"
            readOnly
            value={share}
          />
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(share);
                toast("Link kopiert");
              } catch {
                toast("Link im Feld auswählen und kopieren.");
              }
            }}
          >
            Link kopieren
          </button>
        </>
      )}
      <SectionTitle>Ergebnis eines Freundes</SectionTitle>
      <Field label="Challenge-Link">
        <input
          type="url"
          value={link || pending}
          onChange={(e) => setLink(e.target.value)}
          placeholder="VYRA-Link einfügen"
        />
      </Field>
      <button
        className="button secondary"
        onClick={() => importLink(link || pending)}
      >
        Ergebnis importieren
      </button>
      {error && <p className="error">{error}</p>}
      <SectionTitle>Geteilte Ergebnisse</SectionTitle>
      {!data.friends.length ? (
        <Empty
          icon={Users}
          title="Noch keine Ergebnisse"
          text="Importiere den Challenge-Link eines Freundes."
        />
      ) : (
        data.friends.map((f) => (
          <div className="supplement-row" key={f.id}>
            <div className="row-copy">
              <strong>{f.name}</strong>
              <small>
                {displayDate(f.date, true)} · {number(f.steps)} Schritte
              </small>
            </div>
            <IconButton
              icon={Trash2}
              label="Ergebnis entfernen"
              onClick={() =>
                setData((s) => ({
                  ...s,
                  friends: s.friends.filter((x) => x.id !== f.id),
                }))
              }
            />
          </div>
        ))
      )}
    </>
  );
}
