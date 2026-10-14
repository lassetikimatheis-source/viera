"use client";
import {
  Activity,
  ArrowUpRight,
  Droplets,
  Heart,
  House,
  Plus,
  ScanLine,
  Settings2,
  ShieldCheck,
  UserRound,
  Utensils,
  Users,
  Moon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import {
  displayDate,
  metricValue,
  number,
  totals,
} from "@/lib/vyra-data";
import { Provider, useVyra } from "@/components/vyra/store";
import {
  IconButton,
  Meter,
  Row,
  SectionTitle,
  Title,
} from "@/components/vyra/ui";
import {
  HealthScreen,
  HealthDetail,
  Connections,
} from "@/components/vyra/health";
import { NutritionScreen } from "@/components/vyra/nutrition";
import { WellbeingScreen } from "@/components/vyra/wellbeing";
import { ProfileScreen } from "@/components/vyra/profile";
const tabs = [
  { id: "home", label: "Home", icon: House },
  { id: "health", label: "Health", icon: Activity },
  { id: "nutrition", label: "Ernährung", icon: Utensils },
  { id: "wellbeing", label: "Gesundheit", icon: Heart },
  { id: "profile", label: "Profil", icon: UserRound },
] as const;
export default function Page() {
  return (
    <Provider>
      <App />
    </Provider>
  );
}
function App() {
  const { route, go, data } = useVyra();
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo(0, 0);
  }, [route]);
  return (
    <div className="stage">
      <aside className="desktop-brand">
        <img src="/icon.svg" width="36" height="36" alt="" />
        <b>VYRA</b>
        <span>
          High Performance
          <br />
          for Everybody.
        </span>
      </aside>
      <main className="phone">
        <div className="device-top" aria-hidden="true">
          <span>9:41</span>
          <i />
          <span>••• ▰</span>
        </div>
        <header className="app-header">
          <button
            className="brand"
            aria-label="VYRA Home"
            onClick={() => go("home")}
          >
            <img src="/icon.svg" width="30" height="30" alt="" />
            VYRA
          </button>
          <div className="header-actions">
            {data.demo && <span className="demo-badge">Demo</span>}
            <IconButton
              icon={Users}
              label="Freunde"
              onClick={() => go("profile", "friends")}
            />
            <button
              className="avatar-button"
              onClick={() => go("profile")}
              aria-label="Mein Profil"
            >
              {data.profile.avatar ? (
                <img src={data.profile.avatar} alt="Profilbild" />
              ) : (
                data.profile.name.slice(0, 1).toUpperCase()
              )}
            </button>
          </div>
        </header>
        <div ref={scroll} className="app-scroll">
          <div className="screen" key={`${route.tab}/${route.detail || ""}`}>
            {route.detail === "connections" ? (
              <Connections />
            ) : route.tab === "home" ? (
              <Dashboard />
            ) : route.tab === "health" ? (
              route.detail ? (
                <HealthDetail />
              ) : (
                <HealthScreen />
              )
            ) : route.tab === "nutrition" ? (
              <NutritionScreen />
            ) : route.tab === "wellbeing" ? (
              <WellbeingScreen />
            ) : (
              <ProfileScreen />
            )}
          </div>
        </div>
        <nav className="bottom-nav" aria-label="Hauptnavigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={route.tab === id ? "page" : undefined}
            >
              <Icon size={23} strokeWidth={route.tab === id ? 2.4 : 1.65} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="home-indicator" aria-hidden="true" />
      </main>
    </div>
  );
}
function Dashboard() {
  const { data, day, go, setData } = useVyra();
  const sum = totals(data.entries.filter((e) => e.date === day));
  const steps = metricValue(data.samples, "steps", day),
    sleep = metricValue(data.samples, "sleep", day),
    water = data.water[day] || 0;
  const hour = new Date().getHours();
  return (
    <>
      <Title
        eyebrow={displayDate(day)}
        title={`${hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend"}, ${data.profile.name.split(" ")[0]}.`}
      />
      <div className="today-summary">
        <div className="summary-label">
          <span>Dein Tag im Überblick</span>
          <span className="status-dot">
            {data.demo ? "Beispieldaten" : "Deine Einträge"}
          </span>
        </div>
        <div className="energy-main">
          <div>
            <span className="label">Noch offen</span>
            <div className="hero-number">
              {number(Math.max(0, data.goals.kcal - sum.kcal))}
              <small>kcal</small>
            </div>
          </div>
          <button
            className="round-action"
            aria-label="Mahlzeit hinzufügen"
            title="Mahlzeit hinzufügen"
            onClick={() => go("nutrition", "add")}
          >
            <Plus size={26} />
          </button>
        </div>
        <Meter value={sum.kcal} max={data.goals.kcal} />
        <div className="summary-foot">
          <span>{number(sum.kcal)} gegessen</span>
          <span>{number(data.goals.kcal)} Tagesziel</span>
        </div>
        <button className="protein-line" onClick={() => go("nutrition")}>
          <span>
            <i className="color-dot lavender" />
            Eiweiß
          </span>
          <strong>
            {number(sum.protein)} <small>/ {data.goals.protein} g</small>
          </strong>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="metric-pair">
        <button onClick={() => go("health", "steps")} className="metric-block">
          <span className="label">
            <Activity size={17} className="mint-text" />
            Bewegung
          </span>
          <strong>{steps === null ? "—" : number(steps)}</strong>
          <small>von {number(data.goals.steps)} Schritten</small>
          <Meter value={steps || 0} max={data.goals.steps} />
        </button>
        <button onClick={() => go("health", "sleep")} className="metric-block">
          <span className="label">
            <Moon size={17} className="lavender-text" />
            Erholung
          </span>
          <strong>
            {sleep === null
              ? "—"
              : `${Math.floor(sleep)}h ${Math.round((sleep % 1) * 60)}m`}
          </strong>
          <small>
            {sleep === null
              ? "Noch keine Schlafdaten"
              : "Schlafdauer letzte Nacht"}
          </small>
          <Meter value={sleep || 0} max={8} tone="lavender" />
        </button>
      </div>
      <SectionTitle>Direkt erfassen</SectionTitle>
      <div className="quick-actions">
        <button onClick={() => go("nutrition", "scan")}>
          <ScanLine />
          <span>Scannen</span>
        </button>
        <button onClick={() => go("nutrition", "photo")}>
          <Utensils />
          <span>Foto-Log</span>
        </button>
        <button
          onClick={() =>
            setData((s) => ({
              ...s,
              water: { ...s.water, [day]: (s.water[day] || 0) + 250 },
            }))
          }
        >
          <Droplets />
          <span>+250 ml</span>
        </button>
      </div>
      <div className="water-line">
        <Droplets size={17} />
        <span>Wasser</span>
        <strong>
          {number(water / 1000, 2)} / {number(data.goals.water / 1000, 1)} l
        </strong>
      </div>
      <SectionTitle action="Alle Werte" onClick={() => go("health")}>
        Für deinen Überblick
      </SectionTitle>
      <div className="rows">
        <Row
          icon={Heart}
          tone="rose"
          title="Health verbinden"
          text={
            data.samples.some((s) => s.source !== "Beispieldaten")
              ? "Datenquellen und Import verwalten"
              : "Schlaf, Aktivität und Körperwerte"
          }
          onClick={() => go("health", "connections")}
        />
        <Row
          icon={ShieldCheck}
          tone="lavender"
          title="Dein Wochenbericht"
          text="Ernährung und Bewegung im Verlauf"
          onClick={() => go("wellbeing", "report")}
        />
        <Row
          icon={Settings2}
          title="Deine Ziele"
          text={data.profile.goal}
          onClick={() => go("profile", "goals")}
        />
      </div>
    </>
  );
}
