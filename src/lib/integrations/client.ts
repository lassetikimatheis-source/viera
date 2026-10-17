import { normalizeProvider } from "./data.ts";
import type { Provider } from "./config.ts";
const bases = { whoop: "https://api.prod.whoop.com/developer/v2", strava: "https://www.strava.com/api/v3" };
export async function loadProviderData(provider: Provider, access: string, from: string, to: string, fetcher: typeof fetch = fetch) {
  async function pages(path: string) {
    const result: unknown[] = [];
    let next: string | undefined;
    for (let page = 1; page <= 20; page++) {
      const url = new URL(`${bases[provider]}${path}`);
      if (provider === "whoop") {
        url.search = new URLSearchParams({ start: new Date(Date.parse(`${from}T00:00:00Z`) - 86400000).toISOString(),
          end: new Date(Date.parse(`${to}T23:59:59Z`) + 86400000).toISOString(), limit: "25", ...(next ? { nextToken: next } : {}) }).toString();
      } else {
        url.search = new URLSearchParams({ after: String(Date.parse(`${from}T00:00:00Z`) / 1000 - 86400),
          before: String(Date.parse(`${to}T23:59:59Z`) / 1000 + 86400), page: String(page), per_page: "100" }).toString();
      }
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${access}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(response.status === 429 ? "Der Anbieter begrenzt gerade die Abrufe. Bitte später erneut versuchen."
        : response.status === 401 ? "Die Anmeldung ist nicht mehr gültig. Bitte erneut verbinden." : "Die Daten konnten nicht vollständig geladen werden.");
      const json = await response.json();
      const rows: unknown = provider === "whoop" ? json.records : json;
      if (!Array.isArray(rows)) throw new Error("Unerwartete Antwort des Anbieters.");
      result.push(...rows);
      next = provider === "whoop" && typeof json.next_token === "string" && json.next_token ? json.next_token : undefined;
      if (provider === "whoop" ? !next : rows.length < 100) return result;
    }
    throw new Error("Zu viele Daten für einen vollständigen Abruf. Es wurde nichts importiert.");
  }
  const input = provider === "whoop"
    ? { sleeps: await pages("/activity/sleep"), recoveries: await pages("/recovery"), workouts: await pages("/activity/workout") }
    : { workouts: await pages("/athlete/activities") };
  return normalizeProvider(provider, input, from, to);
}
export async function revokeProvider(provider: Provider, access: string) {
  const response = provider === "whoop"
    ? await fetch(`${bases.whoop}/user/access`, { method: "DELETE", headers: { Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(15000) })
    : await fetch("https://www.strava.com/oauth/revoke", { method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: access, token_type_hint: "access_token" }), });
  if (!response.ok && response.status !== 401) throw new Error("Die Freigabe konnte beim Anbieter noch nicht widerrufen werden. Bitte erneut versuchen.");
}
