"use client";
import { useState, type ReactElement } from "react";
import { ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from "lucide-react";
import { widgetIds, type WidgetId } from "@/lib/preferences";
import { useVyra } from "./store";
import { IconButton, Sheet, Toggle } from "./ui";

const labels: Record<WidgetId, string> = { overview: "Tagesringe", training: "Training", stress: "Stress & Messdaten", trend: "Wochenverlauf", day: "Aktivität", nutrition: "Ernährung", report: "Wochenbericht" };
export function DashboardLayout({ children }: { children: ReactElement<{ id: WidgetId }>[] }) {
  const { data, setData } = useVyra();
  const [open, setOpen] = useState(false);
  const prefs = data.dashboard || { order: [...widgetIds], hidden: [] };
  const move = (id: WidgetId, direction: number) => {
    const order = [...prefs.order], from = order.indexOf(id), to = from + direction;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    setData(s => ({ ...s, dashboard: { ...prefs, order } }));
  };
  return <>
    <div className="dashboard-customize"><IconButton icon={SlidersHorizontal} label="Dashboard anpassen" onClick={() => setOpen(true)} /></div>
    {prefs.order.filter(id => !prefs.hidden.includes(id)).map(id => children.find(child => child.props.id === id))}
    {prefs.hidden.length === widgetIds.length && <p className="note">Alle Bereiche sind ausgeblendet.</p>}
    {open && <Sheet title="Dein Dashboard" onClose={() => setOpen(false)}>
      {prefs.order.map((id, index) => <div className="widget-setting" key={id}>
        <Toggle label={labels[id]} checked={!prefs.hidden.includes(id)} onChange={visible => setData(s => ({ ...s, dashboard: { ...prefs, hidden: visible ? prefs.hidden.filter(x => x !== id) : [...prefs.hidden, id] } }))} />
        <IconButton icon={ArrowUp} label={`${labels[id]} nach oben`} disabled={index === 0} onClick={() => move(id, -1)} />
        <IconButton icon={ArrowDown} label={`${labels[id]} nach unten`} disabled={index === prefs.order.length - 1} onClick={() => move(id, 1)} />
      </div>)}
      <button className="button secondary" onClick={() => setData(s => ({ ...s, dashboard: { order: [...widgetIds], hidden: [] } }))}><RotateCcw size={17} /> Standard wiederherstellen</button>
    </Sheet>}
  </>;
}
