export type NativeHealthPayload = { records: Record<string, string>[]; workouts: Record<string, string>[] };
declare global {
  interface Window {
    webkit?: { messageHandlers?: { vyraHealth?: { postMessage: (message: { action: string; theme?: string; provider?: string; url?: string }) => void } } };
    vyraNativeHealthReady?: boolean;
    vyraNativeOAuth?: boolean;
  }
}
export function nativeHealthAvailable() {
  return typeof window !== "undefined" && !!window.webkit?.messageHandlers?.vyraHealth;
}
export function requestNativeHealth() {
  window.webkit?.messageHandlers?.vyraHealth?.postMessage({ action: "import" });
}
export function nativeHealthXML(payload: NativeHealthPayload): string {
  if (!payload || !Array.isArray(payload.records) || !Array.isArray(payload.workouts) ||
      payload.records.length + payload.workouts.length > 80000) throw new Error("Ungültige Health-Daten.");
  const doc = document.implementation.createDocument(null, "HealthData");
  const allowed = new Set(["type", "sourceName", "value", "unit", "startDate", "endDate", "duration", "durationUnit", "workoutActivityType"]);
  for (const [tag, records] of [["Record", payload.records], ["Workout", payload.workouts]] as const) {
    for (const record of records) {
      if (!record || typeof record !== "object") throw new Error("Ungültiger Messwert.");
      const node = doc.createElement(tag);
      for (const [key, value] of Object.entries(record)) {
        if (!allowed.has(key) || typeof value !== "string" || value.length > 1000) throw new Error("Ungültiger Messwert.");
        node.setAttribute(key, value);
      }
      doc.documentElement.appendChild(node);
    }
  }
  return new XMLSerializer().serializeToString(doc);
}
