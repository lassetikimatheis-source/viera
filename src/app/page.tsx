"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { Activity, ArrowLeft, Bot, CalendarDays, ChevronRight, Dumbbell, Flame, HeartPulse, Home, Moon, Plus, Salad, Settings, Sparkles, Trash2, User, Watch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tab = "home" | "activity" | "nutrition" | "health" | "ai";
type Detail = "score" | "heart" | "calories" | "steps" | "sleep" | "training" | "profile";
type Meal = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
type Workout = { id: string; type: string; duration: number; intensity: number; date: string };
type Food = { id: string; meal: Meal; name: string; calories: number; protein: number; carbs: number; fat: number };
type Supplement = { id: string; name: string; dose: string; taken: boolean };
type CycleEntry = { id: string; start: string; end: string; energy: number; note: string };
type Profile = { name: string; goal: string; cycle: boolean; theme: "light" | "dark"; onboarded: boolean; wearable: string };
type State = { profile: Profile; workouts: Workout[]; foods: Food[]; supplements: Supplement[]; cycle: CycleEntry[] };

const key = "vyra-local-prototype-v4";
const today = new Date();
const todayIso = format(today, "yyyy-MM-dd");
const week = [
  { day: "Wed", steps: 6900, sleep: 7.2, rhr: 62, recovery: 71, kcal: 1920 },
  { day: "Thu", steps: 8200, sleep: 6.8, rhr: 61, recovery: 68, kcal: 2110 },
  { day: "Fri", steps: 5100, sleep: 8.1, rhr: 60, recovery: 79, kcal: 1840 },
  { day: "Sat", steps: 10400, sleep: 7.5, rhr: 59, recovery: 82, kcal: 2320 },
  { day: "Sun", steps: 9700, sleep: 7.9, rhr: 58, recovery: 84, kcal: 2240 },
  { day: "Mon", steps: 7200, sleep: 6.9, rhr: 59, recovery: 74, kcal: 1980 },
  { day: "Tue", steps: 8840, sleep: 8.0, rhr: 58, recovery: 86, kcal: 2160 },
];
const foods = [
  { name: "Greek yogurt bowl", calories: 340, protein: 26, carbs: 38, fat: 9 },
  { name: "Chicken quinoa salad", calories: 520, protein: 42, carbs: 46, fat: 18 },
  { name: "Protein smoothie", calories: 280, protein: 32, carbs: 25, fat: 6 },
  { name: "Tofu rice bowl", calories: 610, protein: 31, carbs: 82, fat: 17 },
];
const seed: State = {
  profile: { name: "", goal: "Improve recovery", cycle: false, theme: "light", onboarded: false, wearable: "Demo Mode" },
  workouts: [
    { id: "w1", type: "Running", duration: 34, intensity: 7, date: todayIso },
    { id: "w2", type: "Strength", duration: 48, intensity: 8, date: todayIso },
  ],
  foods: [
    { id: "f1", meal: "Breakfast", ...foods[0] },
    { id: "f2", meal: "Lunch", ...foods[1] },
  ],
  supplements: [{ id: "s1", name: "Vitamin D3", dose: "2000 IU", taken: true }],
  cycle: [],
};
const tabs = [
  ["home", "Home", Home],
  ["activity", "Activity", Activity],
  ["nutrition", "Nutrition", Salad],
  ["health", "Health", HeartPulse],
  ["ai", "VYRA AI", Bot],
] as const;
const id = () => Math.random().toString(36).slice(2);
const latest = week.at(-1)!;

export default function App() {
  const [state, setState] = useState<State>(seed);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("Ask VYRA for a local recovery, nutrition, or report summary.");
  const nutrition = useMemo(() => state.foods.reduce((a, f) => ({ kcal: a.kcal + f.calories, protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [state.foods]);
  const readiness = Math.round((latest.recovery + latest.sleep * 11 + 86) / 3);
  useEffect(() => { const raw = localStorage.getItem(key); if (raw) setState(JSON.parse(raw)); setLoaded(true); }, []);
  useEffect(() => { if (!loaded) return; localStorage.setItem(key, JSON.stringify(state)); document.documentElement.classList.remove("dark"); }, [state, loaded]);
  useEffect(() => { document.querySelector("main.min-h-dvh > div:first-child")?.scrollTo({ top: 0 }); }, [tab, detail]);
  const setProfile = (patch: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const download = () => { const doc = new jsPDF(); doc.setFontSize(24); doc.text("VYRA Health Report", 18, 24); doc.setFontSize(11); doc.text(`Generated locally on ${format(today, "PPP")}`, 18, 34); doc.text(`Readiness: ${readiness}/100 (simulated, not clinically validated)`, 18, 50); doc.text(`Sleep ${latest.sleep}h · Resting HR ${latest.rhr} bpm · Steps ${latest.steps}`, 18, 62); doc.text(`Nutrition: ${nutrition.kcal} kcal · Protein ${nutrition.protein}g · Carbs ${nutrition.carbs}g · Fat ${nutrition.fat}g`, 18, 74); doc.text(state.profile.cycle ? `Cycle entries: ${state.cycle.length} opt-in local entries` : "Cycle tracking not included", 18, 86); doc.text(doc.splitTextToSize("This prototype stores data in this browser only. It does not diagnose, treat, predict fertility, provide pregnancy prevention guidance, or claim medical certification.", 172), 18, 108); doc.save("vyra-report.pdf"); };
  if (!loaded) return <main className="min-h-dvh bg-[#FAFAFA] p-4 text-neutral-950 dark:bg-neutral-950 dark:text-white"><Card className="mx-auto mt-20 max-w-[430px] animate-pulse"><div className="h-40 rounded-3xl bg-neutral-100 dark:bg-white/10" /></Card></main>;
  if (!state.profile.onboarded) return <Onboarding profile={state.profile} setProfile={setProfile} done={() => setProfile({ onboarded: true, name: state.profile.name || "Alex" })} />;
  const openTab = (value: Tab) => { setDetail(null); setTab(value); };
  return <main className="min-h-dvh bg-[#FAFAFA] text-neutral-950 dark:bg-neutral-950 dark:text-white"><div className="mx-auto max-w-[430px] px-4 pb-28 pt-4">{!detail && <Header state={state} setProfile={setProfile} />}<motion.div key={detail || tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">{detail ? <DetailView detail={detail} state={state} readiness={readiness} nutrition={nutrition} setState={setState} back={() => setDetail(null)} setTab={openTab} download={download} /> : <>{tab === "home" && <HomeTab state={state} readiness={readiness} nutrition={nutrition} setTab={openTab} setDetail={setDetail} />}{tab === "activity" && <ActivityTab state={state} setState={setState} />}{tab === "nutrition" && <NutritionTab state={state} setState={setState} nutrition={nutrition} />}{tab === "health" && <HealthTab state={state} setState={setState} />}{tab === "ai" && <AITab draft={draft} setDraft={setDraft} reply={reply} setReply={setReply} state={state} nutrition={nutrition} download={download} />}</>}</motion.div></div><nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/90 px-3 pt-2 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/90"><div className="mx-auto grid max-w-[430px] grid-cols-5 gap-1">{tabs.map(([value, label, Icon]) => <button key={value} onClick={() => openTab(value)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold text-neutral-500", !detail && tab === value && "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950")}><Icon className="size-5" />{value === "health" && state.profile.cycle ? "Cycle" : label}</button>)}</div></nav></main>;
}

function Onboarding({ profile, setProfile, done }: { profile: Profile; setProfile: (p: Partial<Profile>) => void; done: () => void }) {
  const [step, setStep] = useState(0);
  return <main className="min-h-dvh bg-[#FAFAFA] p-4 text-neutral-950 dark:bg-neutral-950 dark:text-white"><section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[430px] flex-col"><div className="mb-6 flex justify-between"><b className="text-2xl">VYRA</b><span className="text-sm text-neutral-500">{step + 1}/5</span></div><Card className="flex flex-1 flex-col justify-between"><div className="space-y-5">{step === 0 && <><Sparkles className="size-12 text-violet-600" /><h1 className="text-4xl font-semibold leading-tight">Welcome to VYRA.</h1><p className="text-neutral-500">Personal health intelligence for everyday people. Demo data is clearly labeled and stored locally.</p></>}{step === 1 && <><h1 className="text-3xl font-semibold">What should we call you?</h1><input className="h-12 w-full rounded-2xl border px-4 dark:border-white/10 dark:bg-white/5" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="First name" /></>}{step === 2 && <Choice title="Main goal" value={profile.goal} set={(goal) => setProfile({ goal })} items={["Get healthier", "Build muscle", "Lose fat", "Improve endurance", "Improve recovery"]} />}{step === 3 && <><h1 className="text-3xl font-semibold">Tracking modules</h1><Toggle label="Optional cycle tracking" active={profile.cycle} click={() => setProfile({ cycle: !profile.cycle })} /><Toggle label="Dark theme" active={profile.theme === "dark"} click={() => setProfile({ theme: profile.theme === "dark" ? "light" : "dark" })} /></>}{step === 4 && <><Watch className="size-12 text-emerald-600" /><h1 className="text-3xl font-semibold">Connect wearable</h1><p className="text-neutral-500">Apple Health, Garmin and WHOOP are Coming Soon. Demo Mode is active for this prototype.</p></>}</div><div className="mt-8 flex gap-3">{step > 0 && <Button className="flex-1" variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" onClick={() => step === 4 ? done() : setStep(step + 1)}>{step === 4 ? "Enter VYRA" : "Continue"}</Button></div></Card></section></main>;
}
function Choice({ title, items, value, set }: { title: string; items: string[]; value: string; set: (v: string) => void }) { return <><h1 className="text-3xl font-semibold">{title}</h1><div className="grid gap-3">{items.map((item) => <button key={item} className={cn("rounded-3xl border p-4 text-left font-semibold dark:border-white/10", value === item && "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950")} onClick={() => set(item)}>{item}</button>)}</div></>; }
function Toggle({ label, active, click }: { label: string; active: boolean; click: () => void }) { return <button onClick={click} className="flex w-full items-center justify-between rounded-3xl border p-4 text-left dark:border-white/10"><span className="font-semibold">{label}</span><span className={cn("h-8 w-14 rounded-full p-1", active ? "bg-emerald-500" : "bg-neutral-200 dark:bg-white/10")}><span className={cn("block size-6 rounded-full bg-white shadow transition", active && "translate-x-6")} /></span></button>; }
function Header({ state, setProfile }: { state: State; setProfile: (p: Partial<Profile>) => void }) { return <header className="mb-6 flex items-start justify-between gap-4"><div><div className="text-2xl font-black">VYRA</div><p className="mt-3 max-w-48 text-[15px] leading-6 text-neutral-500">High Performance for Everybody.</p></div><div className="flex gap-2"><span className="rounded-full bg-emerald-50 px-4 py-3 text-sm font-semibold leading-tight text-emerald-600">Demo<br />Mode</span></div></header>; }
function HomeTab({ state, readiness, nutrition, setTab, setDetail }: { state: State; readiness: number; nutrition: { kcal: number; protein: number; carbs: number; fat: number }; setTab: (t: Tab) => void; setDetail: (d: Detail) => void }) {
  const name = state.profile.name || "Max";
  return <>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[13px] font-medium text-neutral-500">{format(today, "EEE, MMM d, yyyy")}</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight text-neutral-950">Guten Morgen,<br />{name}</h1>
      </div>
      <button onClick={() => setDetail("profile")} className="inline-flex size-12 items-center justify-center rounded-full bg-white/70 shadow-sm"><User className="size-5" /></button>
    </div>
    <button onClick={() => setDetail("score")} className="w-full text-left">
      <Card className="overflow-hidden border-0 bg-white/70">
        <div className="flex items-center gap-5">
          <div className="grid size-28 place-items-center rounded-full bg-[conic-gradient(#86efac_0_78%,rgba(255,255,255,.45)_78%_100%)] p-3">
            <div className="grid size-full place-items-center rounded-full bg-white/80">
              <span className="text-3xl font-semibold">{readiness}</span>
              <span className="-mt-2 text-[10px] font-medium text-neutral-500">von 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-500">Aktivitätsscore</p>
            <h2 className="mt-2 text-xl font-semibold">Auf einem guten Weg!</h2>
            <p className="mt-2 text-sm leading-5 text-neutral-500">Schlaf, Ernährung und Bewegung sind heute stabil.</p>
          </div>
          <ChevronRight className="size-5 text-neutral-400" />
        </div>
      </Card>
    </button>
    <div className="grid grid-cols-2 gap-3">
      <DashboardTile icon={<HeartPulse />} title="Herzfrequenz" value={`${latest.rhr} bpm`} sub="Ruhepuls" onClick={() => setDetail("heart")} />
      <DashboardTile icon={<Flame />} title="Kalorien" value={nutrition.kcal.toString()} sub="heute" onClick={() => setDetail("calories")} />
      <DashboardTile icon={<Activity />} title="Schritte" value={latest.steps.toLocaleString()} sub="von 10.000" onClick={() => setDetail("steps")} />
      <DashboardTile icon={<Moon />} title="Schlaf" value={`${Math.floor(latest.sleep)} h ${Math.round((latest.sleep % 1) * 60)} min`} sub="82% Qualität" onClick={() => setDetail("sleep")} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <DashboardTile icon={<Dumbbell />} title="Training" value={`${state.workouts.length}`} sub="Einheiten" onClick={() => setDetail("training")} />
      <DashboardTile icon={<User />} title="Profil" value={name} sub={state.profile.goal} onClick={() => setDetail("profile")} />
    </div>
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Daily Insight</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">Du hast {latest.sleep} Stunden geschlafen. Heute passt ein moderates Workout. Protein: {nutrition.protein}g.</p>
        </div>
        <button onClick={() => setTab("ai")} className="rounded-full bg-white/70 p-3 shadow-sm"><Bot className="size-5" /></button>
      </div>
    </Card>
  </>;
}
function DashboardTile({ icon, title, value, sub, onClick }: { icon: React.ReactNode; title: string; value: string; sub: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full text-left"><Card className="min-h-[132px] border-0 bg-white/60 p-4"><div className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-white/70 text-emerald-600 shadow-sm">{icon}</div><div className="text-2xl font-semibold leading-none">{value}</div><div className="mt-1 text-xs font-medium text-neutral-500">{title}</div><div className="mt-1 text-xs text-neutral-500">{sub}</div></Card></button>;
}
function DetailView({ detail, state, readiness, nutrition, setState, back, setTab, download }: { detail: Detail; state: State; readiness: number; nutrition: { kcal: number; protein: number; carbs: number; fat: number }; setState: React.Dispatch<React.SetStateAction<State>>; back: () => void; setTab: (t: Tab) => void; download: () => void }) {
  const title = ({ score: "Aktivitätsscore", heart: "Herzfrequenz", calories: "Kalorien", steps: "Schritte", sleep: "Schlaf", training: "Training", profile: "Profil" } as const)[detail];
  return <>
    <div className="flex items-center justify-between">
      <button onClick={back} className="inline-flex size-10 items-center justify-center rounded-full bg-white/70 shadow-sm"><ArrowLeft className="size-5" /></button>
      <h1 className="text-lg font-semibold">{title}</h1>
      <button onClick={() => detail === "profile" ? download() : setTab("ai")} className="inline-flex size-10 items-center justify-center rounded-full bg-white/70 shadow-sm">{detail === "profile" ? <Settings className="size-5" /> : <Bot className="size-5" />}</button>
    </div>
    {detail === "score" && <><Card><div className="grid place-items-center py-3"><div className="grid size-44 place-items-center rounded-full bg-[conic-gradient(#86efac_0_78%,rgba(255,255,255,.42)_78%_100%)] p-4"><div className="grid size-full place-items-center rounded-full bg-white/75"><span className="text-5xl font-semibold">{readiness}</span><span className="-mt-4 text-xs text-neutral-500">von 100</span></div></div></div><h2 className="text-xl font-semibold">Auf einem guten Weg!</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Dein Score basiert auf Schlaf, Ruhepuls, Bewegung, Training und Ernährung. Demo-Daten, nicht medizinisch validiert.</p></Card><ScoreRows /></>}
    {detail === "heart" && <><HeroMetric icon={<HeartPulse />} value={`${latest.rhr} bpm`} label="Ruhepuls" accent="text-rose-500" /><Chart title="24h Herzfrequenz" dataKey="rhr" color="#f43f5e" /><div className="grid grid-cols-3 gap-3"><Mini label="Maximal" value="148" unit="bpm" /><Mini label="Minimal" value="48" unit="bpm" /><Mini label="HFV" value="72" unit="ms" /></div><Card><h2 className="font-semibold">Herzfrequenz-Zonen</h2>{["Zone 5", "Zone 4", "Zone 3"].map((z, i) => <div key={z} className="mt-3"><div className="mb-1 flex justify-between text-xs text-neutral-500"><span>{z}</span><span>{[2, 8, 22][i]}%</span></div><div className="h-2 rounded-full bg-white/60"><div className="h-full rounded-full bg-rose-400" style={{ width: `${[2, 8, 22][i]}%` }} /></div></div>)}</Card></>}
    {detail === "calories" && <><HeroMetric icon={<Flame />} value={nutrition.kcal.toString()} label="von 2.500 kcal" accent="text-orange-500" /><div className="grid grid-cols-3 gap-3"><Mini label="Protein" value={nutrition.protein.toString()} unit="g" /><Mini label="Kohlenhydrate" value={nutrition.carbs.toString()} unit="g" /><Mini label="Fett" value={nutrition.fat.toString()} unit="g" /></div><NutritionTab state={state} setState={setState} nutrition={nutrition} /></>}
    {detail === "steps" && <><HeroMetric icon={<Activity />} value={latest.steps.toLocaleString()} label="von 10.000 Schritten" accent="text-emerald-500" /><Card><div className="h-3 rounded-full bg-white/60"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, latest.steps / 100)}%` }} /></div><p className="mt-3 text-sm text-neutral-500">86% vom Tagesziel erreicht.</p></Card><Card><h2 className="mb-3 font-semibold">Tagesverlauf</h2><div className="h-44"><ResponsiveContainer><BarChart data={week}><XAxis dataKey="day" axisLine={false} tickLine={false} /><Tooltip cursor={false} /><Bar dataKey="steps" fill="#6ee7b7" radius={10} /></BarChart></ResponsiveContainer></div></Card><div className="grid grid-cols-3 gap-3"><Mini label="Distanz" value="6,2" unit="km" /><Mini label="Aktivkalorien" value="412" unit="kcal" /><Mini label="Aktivzeit" value="1 h" unit="28 min" /></div></>}
    {detail === "sleep" && <><HeroMetric icon={<Moon />} value="7 h 24 min" label="Schlafdauer" accent="text-violet-500" /><Chart title="Schlaftrend" dataKey="sleep" color="#8b5cf6" /><div className="grid grid-cols-2 gap-3"><Mini label="Wach" value="32" unit="min" /><Mini label="REM" value="1 h" unit="48 min" /><Mini label="Leichtschlaf" value="4 h" unit="02 min" /><Mini label="Tiefschlaf" value="1 h" unit="02 min" /></div><Card><h2 className="font-semibold">Schlafqualität</h2><div className="mt-3 h-3 rounded-full bg-white/60"><div className="h-full w-[82%] rounded-full bg-emerald-400" /></div><p className="mt-2 text-sm text-neutral-500">82% Qualität. Regelmäßigkeit: sehr gut.</p></Card></>}
    {detail === "training" && <><Top title="Training" action="Add" click={() => setState((s) => ({ ...s, workouts: [{ id: id(), type: "Walking", duration: 30, intensity: 5, date: todayIso }, ...s.workouts] }))} /><Card><div className="grid grid-cols-3 gap-3 text-center"><Mini label="Einheiten" value={state.workouts.length.toString()} unit="" /><Mini label="Trainingszeit" value="5:20" unit="h" /><Mini label="Kalorien" value="2.480" unit="" /></div></Card><ActivityTab state={state} setState={setState} /></>}
    {detail === "profile" && <><Card><div className="flex items-center gap-4"><div className="grid size-16 place-items-center rounded-full bg-white/70"><User className="size-7" /></div><div><h2 className="text-xl font-semibold">{state.profile.name || "Max Mustermann"}</h2><p className="text-sm text-neutral-500">23 Jahre · 178 cm · Demo-Profil</p></div></div></Card>{["Meine Ziele", "Geräte", "Datenfreigabe", "Einstellungen", "Hilfe & Support"].map((item) => <button key={item} onClick={() => item === "Geräte" ? setTab("health") : undefined} className="flex w-full items-center justify-between rounded-[1.35rem] border border-white/60 bg-white/55 p-4 text-left shadow-sm backdrop-blur"><span className="font-semibold">{item}</span><ChevronRight className="size-5 text-neutral-400" /></button>)}</>}
  </>;
}
function HeroMetric({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent: string }) { return <Card className="text-center"><div className={cn("mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-full bg-white/70", accent)}>{icon}</div><div className="text-4xl font-semibold">{value}</div><p className="mt-1 text-sm text-neutral-500">{label}</p></Card>; }
function Mini({ label, value, unit }: { label: string; value: string; unit: string }) { return <Card className="p-3"><div className="text-xl font-semibold">{value}</div><div className="text-xs font-medium text-neutral-500">{unit}</div><div className="mt-2 text-[11px] text-neutral-500">{label}</div></Card>; }
function ScoreRows() { return <Card><h2 className="font-semibold">Score-Bestandteile</h2>{[["Schlaf", 82], ["Ernährung", 76], ["Trainingswoche", 80], ["Alltagsaktivität", 74]].map(([label, value]) => <div key={label as string} className="mt-3"><div className="mb-1 flex justify-between text-xs text-neutral-500"><span>{label}</span><span>{value}/100</span></div><div className="h-2 rounded-full bg-white/60"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${value}%` }} /></div></div>)}</Card>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <Card className="border-0 bg-white p-4 text-neutral-950 shadow-[0_18px_45px_rgba(23,23,23,0.07)]"><div className="mb-5 inline-flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">{icon}</div><div className="text-[28px] font-semibold tracking-tight">{value}</div><div className="mt-1 text-sm font-medium text-neutral-500">{label}</div></Card>; }
function Quick({ icon, text, click }: { icon: React.ReactNode; text: string; click: () => void }) { return <button onClick={click} className="rounded-[1.5rem] border bg-white p-4 text-left font-semibold shadow-sm dark:border-white/10 dark:bg-neutral-900"><span className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl bg-neutral-100 text-violet-600 dark:bg-white/10">{icon}</span><span className="block">{text}</span></button>; }
function Chart({ title, dataKey, color }: { title: string; dataKey: keyof typeof week[number]; color: string }) { return <Card><h2 className="mb-3 font-semibold">{title}</h2><div className="h-36"><ResponsiveContainer><LineChart data={week}><XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} /><Tooltip cursor={false} /><Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></Card>; }
function ActivityTab({ state, setState }: { state: State; setState: React.Dispatch<React.SetStateAction<State>> }) { return <><Top title="Activity" action="Add" click={() => setState((s) => ({ ...s, workouts: [{ id: id(), type: "Walking", duration: 30, intensity: 5, date: todayIso }, ...s.workouts] }))} /><Card><p className="text-sm text-neutral-500">Steps today</p><div className="text-5xl font-semibold">{latest.steps.toLocaleString()}</div><div className="mt-4 h-3 rounded-full bg-neutral-100 dark:bg-white/10"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${latest.steps / 100}%` }} /></div></Card><Card><h2 className="mb-3 font-semibold">Weekly activity</h2><div className="h-44"><ResponsiveContainer><BarChart data={week}><XAxis dataKey="day" axisLine={false} tickLine={false} /><Tooltip cursor={false} /><Bar dataKey="steps" fill="#22c55e" radius={10} /></BarChart></ResponsiveContainer></div></Card><Chart title="Sleep trend" dataKey="sleep" color="#8b5cf6" /><Card><h2 className="mb-3 font-semibold">Workouts</h2>{state.workouts.map((w) => <div key={w.id} className="mb-2 flex justify-between rounded-3xl bg-neutral-50 p-3 dark:bg-white/5"><span><b>{w.type}</b><br /><small className="text-neutral-500">{w.date}</small></span><span className="text-right"><b>{w.duration} min</b><br /><small className="text-neutral-500">RPE {w.intensity}/10</small></span></div>)}</Card></>; }
function NutritionTab({ state, setState, nutrition }: { state: State; setState: React.Dispatch<React.SetStateAction<State>>; nutrition: { kcal: number; protein: number; carbs: number; fat: number } }) { return <><Top title="Nutrition" action="Log food" click={() => { const f = foods[Math.floor(Math.random() * foods.length)]; setState((s) => ({ ...s, foods: [...s.foods, { id: id(), meal: "Dinner", ...f }] })); }} /><Card><p className="text-sm text-neutral-500">Calories logged</p><div className="text-5xl font-semibold">{nutrition.kcal}</div><div className="mt-4 h-3 rounded-full bg-neutral-100 dark:bg-white/10"><div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, nutrition.kcal / 23)}%` }} /></div></Card><div className="grid grid-cols-3 gap-3"><Macro label="Protein" value={nutrition.protein} /><Macro label="Carbs" value={nutrition.carbs} /><Macro label="Fat" value={nutrition.fat} /></div><Card><h2 className="mb-3 font-semibold">Meals</h2>{state.foods.map((f) => <div key={f.id} className="mb-2 flex justify-between rounded-3xl bg-neutral-50 p-3 dark:bg-white/5"><span><b>{f.name}</b><br /><small className="text-neutral-500">{f.meal} · {f.calories} kcal</small></span><button onClick={() => setState((s) => ({ ...s, foods: s.foods.filter((x) => x.id !== f.id) }))}><Trash2 className="size-4" /></button></div>)}</Card><Card><h2 className="mb-3 font-semibold">Supplements</h2>{state.supplements.map((s) => <button key={s.id} onClick={() => setState((st) => ({ ...st, supplements: st.supplements.map((x) => x.id === s.id ? { ...x, taken: !x.taken } : x) }))} className="mb-2 flex w-full items-center gap-3 rounded-3xl bg-neutral-50 p-3 text-left dark:bg-white/5"><span className={cn("size-6 rounded-full border", s.taken && "bg-emerald-500")} /><span><b>{s.name}</b><br /><small className="text-neutral-500">{s.dose}</small></span></button>)}</Card></>; }
function Macro({ label, value }: { label: string; value: number }) { return <Card className="p-3"><div className="text-xl font-semibold">{value}g</div><div className="text-xs text-neutral-500">{label}</div></Card>; }
function HealthTab({ state, setState }: { state: State; setState: React.Dispatch<React.SetStateAction<State>> }) { return <><Top title={state.profile.cycle ? "Cycle" : "Health"} action={state.profile.cycle ? "Log" : "Enable"} click={() => state.profile.cycle ? setState((s) => ({ ...s, cycle: [{ id: id(), start: todayIso, end: todayIso, energy: 6, note: "Self-reported energy" }, ...s.cycle] })) : setState((s) => ({ ...s, profile: { ...s.profile, cycle: true } }))} /><Chart title="Resting heart rate" dataKey="rhr" color="#f43f5e" /><Card className="border-[#F7B2C4]/70 bg-[#fff7fa] dark:bg-[#F7B2C4]/10"><h2 className="font-semibold">Cycle tracking</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Optional and off by default. Estimates vary and are not fertility, pregnancy prevention, diagnosis, or treatment guidance.</p>{state.cycle.map((c) => <div key={c.id} className="mt-3 rounded-3xl bg-white p-3 dark:bg-white/5">{c.start} to {c.end} · Energy {c.energy}/10</div>)}</Card></>; }
function AITab({ draft, setDraft, reply, setReply, state, nutrition, download }: { draft: string; setDraft: (v: string) => void; reply: string; setReply: (v: string) => void; state: State; nutrition: { kcal: number; protein: number; carbs: number; fat: number }; download: () => void }) { const send = (q: string) => { setReply(q.toLowerCase().includes("nutrition") ? `Today you logged ${nutrition.kcal} kcal and ${nutrition.protein}g protein. This is based on local entries plus demo context.` : q.toLowerCase().includes("heart") ? `Resting heart rate moved from ${week[0].rhr} to ${latest.rhr} bpm in the simulated trend.` : `Recovery is positive: ${latest.recovery}/100 demo recovery, ${latest.sleep}h sleep, and ${state.workouts.length} workouts logged.`); setDraft(""); }; return <><Top title="VYRA AI" action="PDF" click={download} /><Card className="border-violet-200 bg-violet-50/80 dark:border-violet-500/20 dark:bg-violet-500/10"><p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">Demo AI is deterministic and local. No LLM is connected.</p></Card><Card><div className="rounded-3xl bg-neutral-50 p-4 text-sm leading-6 dark:bg-white/5">{reply}</div><div className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-2xl border px-4 dark:border-white/10 dark:bg-white/5" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask VYRA..." /><Button variant="violet" disabled={!draft} onClick={() => send(draft)}>Send</Button></div></Card>{["How was my recovery this week?", "Summarize my nutrition from the last 7 days.", "What changed in my resting heart rate?", "Create my monthly health report."].map((q) => <button key={q} onClick={() => send(q)} className="w-full rounded-3xl border bg-white p-4 text-left text-sm font-semibold dark:border-white/10 dark:bg-neutral-900">{q}</button>)}</>; }
function Top({ title, action, click }: { title: string; action: string; click: () => void }) { return <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">{title}</h1><Button variant="secondary" size="sm" onClick={click}><Plus className="size-4" />{action}</Button></div>; }
