"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, FlaskConical, Link2, RefreshCw, Unlink } from "lucide-react";
import { useVyra } from "./store";
import { SectionTitle, Sheet } from "./ui";
import { nativeHealthAvailable } from "@/lib/native-health";
import { likelyDuplicate, mergeProviderImport, type ImportBatch } from "@/lib/integrations/data";
import { previewBatch } from "@/lib/integrations/fixtures";
import type { Provider } from "@/lib/integrations/config";
import { sandboxMode } from "@/lib/sandbox";
type Status = { provider: Provider; configured: boolean; connected: boolean; missing: string[] };
async function loadStatuses(): Promise<Status[]> {
  const res = await fetch("/api/integrations/status", { cache: "no-store" });
  if (!res.ok) throw new Error("Verbindungsstatus konnte nicht geladen werden.");
  return (await res.json()).providers;
}

export function IntegrationConnections() {
  const { data, setData, toast } = useVyra();
  const [statuses, setStatuses] = useState<Status[]>([]), [loading, setLoading] = useState(true),
    [busy, setBusy] = useState<Provider | null>(null), [error, setError] = useState(""),
    [batch, setBatch] = useState<ImportBatch | null>(null), [skipDuplicates, setSkipDuplicates] = useState(true);
  const sandbox = sandboxMode();
  const refresh = useCallback(async () => {
    try {
      setStatuses(await loadStatuses());
    } catch { setError("Verbindungsstatus konnte nicht geladen werden."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    loadStatuses().then(rows => { if (active) setStatuses(rows); })
      .catch(() => { if (active) setError("Verbindungsstatus konnte nicht geladen werden."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const receive = (event: Event) => {
      const result = (event as CustomEvent).detail;
      if (!result || !["whoop", "strava"].includes(result.provider)) return;
      if (result.error) { setError("Anmeldung abgebrochen oder nicht bestätigt."); setBusy(null); return; }
      void (async () => {
        try {
          const res = await fetch(`/api/integrations/${result.provider}/callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: result.code, state: result.state }) });
          if (!res.ok) throw new Error("Anmeldung konnte nicht bestätigt werden. Bitte erneut verbinden.");
          await refresh(); toast("Verbunden. Du kannst jetzt deine Daten abrufen.");
        } catch (e) { setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen."); }
        finally { setBusy(null); }
      })();
    };
    window.addEventListener("vyra:oauth-result", receive);
    return () => window.removeEventListener("vyra:oauth-result", receive);
  }, [refresh, toast]);
  async function act(provider: Provider, action: "start" | "sync" | "disconnect") {
    setError(""); setBusy(provider);
    if (action === "start" && nativeHealthAvailable() && !window.vyraNativeOAuth) {
      setError("Bitte die aktuelle iPhone-App aus Xcode starten, um die Anmeldung zu nutzen."); setBusy(null); return;
    }
    try {
      const res = await fetch(`/api/integrations/${provider}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ native: nativeHealthAvailable() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verbindung fehlgeschlagen.");
      if (action === "start") {
        if (nativeHealthAvailable()) {
          window.webkit!.messageHandlers!.vyraHealth!.postMessage({ action: "oauth", provider, url: json.url });
          return;
        }
        location.assign(json.url); return;
      }
      if (action === "sync") { setBatch(json.batch); setSkipDuplicates(true); }
      else { await refresh(); toast("Verbindung getrennt. Importierte Einträge bleiben erhalten."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen."); }
    setBusy(null);
  }
  const duplicates = batch?.samples.filter(r => likelyDuplicate(data.samples, r)) || [];
  return <>
    <SectionTitle>Geräte & Apps</SectionTitle>
    {loading && <p className="note" role="status">Verbindungen werden geprüft …</p>}
    {statuses.map(status => <section className="integration-row" key={status.provider}>
      <div className="integration-heading"><h3>{status.provider === "whoop" ? "WHOOP" : "Strava"}</h3><span className="source">{status.connected ? "Verbunden" : status.configured ? "Nicht verbunden" : "Einrichtung fehlt"}</span></div>
      <p className="note">{status.provider === "whoop" ? "Schlafdauer, Ruhepuls, nächtliche HRV und Trainings. Kein Live-Stresswert." : "Freigegebene Trainings, Bewegungszeit und Distanz. Keine Schlaf- oder HRV-Daten."}</p>
      {sandbox ? <button className="button secondary" onClick={() => { setBatch(previewBatch(status.provider)); setSkipDuplicates(true); }}><FlaskConical size={17} /> {status.provider === "whoop" ? "WHOOP" : "Strava"}-Testdaten laden</button>
        : status.connected ? <div className="integration-actions">
          <button className="button secondary" disabled={busy !== null} onClick={() => void act(status.provider, "sync")}><RefreshCw size={16} /> {busy === status.provider ? "Bitte warten …" : "Daten abrufen"}</button>
          <button className="text-button" disabled={busy !== null} onClick={() => void act(status.provider, "disconnect")}><Unlink size={16} /> Trennen</button>
        </div> : <button className="button secondary" disabled={!status.configured || busy !== null} onClick={() => void act(status.provider, "start")}><Link2 size={16} /> {busy === status.provider ? "Anmeldung läuft …" : "Verbinden"}</button>}
      {!status.configured && <p className="source">Entwicklerzugang für VYRA noch nicht hinterlegt. Testdaten stehen im Testmodus bereit.</p>}
    </section>)}
    <section className="integration-row"><div className="integration-heading"><h3>Garmin</h3><span className="source">Entwicklerfreigabe erforderlich</span></div><p className="note">Eine direkte Anmeldung ist noch nicht verfügbar. Wenn Garmin Werte an Apple Health übergibt, kannst du die dort verfügbaren Daten über Apple Health importieren.</p></section>
    <section className="integration-row"><h3>Verbindungen ausprobieren</h3><p className="note">{sandbox ? "Testmodus aktiv. Diese Daten liegen getrennt von deinem persönlichen Tagebuch." : "Teste Datenabruf, Import und Anzeige mit gekennzeichneten Beispieldaten in einem getrennten Tagebuch."}</p>
      <button className="button secondary" onClick={() => {
        const url = new URL(location.href); if (sandbox) url.searchParams.delete("sandbox"); else url.searchParams.set("sandbox", "1");
        url.hash = "profile/connections"; location.assign(url.href);
      }}><FlaskConical size={17} /> {sandbox ? "Zum persönlichen Tagebuch" : "Testmodus öffnen"}</button>
    </section>
    {error && <p role="alert" className="error">{error}</p>}
    {batch && <Sheet title={sandbox ? "Testimport prüfen" : "Import prüfen"} onClose={() => setBatch(null)}>
      <p className="source">{batch.from} bis {batch.to} · {batch.samples.length} Tageswerte/Trainings · {batch.physiology.length} HRV-Messungen</p>
      <p className="note">Beim Übernehmen ersetzt diese Quelle vorhandene Tageswerte derselben Art im gleichen Zeitraum. Eigene Trainings bleiben erhalten.</p>
      {duplicates.length > 0 && <label className="check-label"><input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} /> {duplicates.length} möglicherweise doppelte Trainings überspringen (gleicher Start und ähnliche Dauer).</label>}
      <div className="import-preview">{batch.samples.map(r => <div className="stat-line" key={r.id}><span>{r.date} · {r.title || (r.metric === "sleep" ? "Schlaf" : "Ruhepuls")}</span><b>{Math.round(r.value * 10) / 10} {r.metric === "sleep" ? "h" : r.metric === "heart" ? "bpm" : "Min."}</b></div>)}</div>
      <button className="button" onClick={() => {
        if (!sandbox && batch.samples.some(r => r.source.startsWith("Test ·"))) { setError("Testdaten können nur im Testmodus gespeichert werden."); return; }
        setData(state => mergeProviderImport(state, { ...batch, samples: skipDuplicates ? batch.samples.filter(r => !likelyDuplicate(state.samples, r)) : batch.samples }));
        setBatch(null); toast(sandbox ? "Testdaten im Testtagebuch gespeichert" : "Daten importiert");
      }}><Check size={17} /> {sandbox ? "Ins Testtagebuch übernehmen" : "Daten übernehmen"}</button>
      <p className="source">Nur freigegebene Datenkategorien werden übernommen. Dies ist ein Abruf auf Anfrage, keine Live-Synchronisierung.</p>
    </Sheet>}
  </>;
}
