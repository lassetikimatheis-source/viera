"use client";
import {
  Activity,
  Heart,
  House,
  UserRound,
  Utensils,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Dashboard } from "@/components/vyra/dashboard";
import { ThemeControl } from "@/components/vyra/theme";
import { PerformanceDetail, TrainingMode } from "@/components/vyra/performance";
import { Provider, useVyra } from "@/components/vyra/store";
import { IconButton } from "@/components/vyra/ui";
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
            <ThemeControl />
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
        {data.training && route.detail !== "training" && (
          <button
            className="active-training-banner"
            onClick={() => go("health", "training")}
          >
            <Activity size={15} /> Training läuft · {data.training.title}{" "}
            <span>Öffnen</span>
          </button>
        )}
        <div ref={scroll} className="app-scroll">
          <div className="screen" key={`${route.tab}/${route.detail || ""}`}>
            {route.tab === "health" && route.detail === "training" ? (
              <TrainingMode />
            ) : route.tab === "health" &&
              ["sleep", "balance", "strain"].includes(route.detail || "") ? (
              <PerformanceDetail
                kind={route.detail as "sleep" | "balance" | "strain"}
              />
            ) : route.detail === "connections" ? (
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
