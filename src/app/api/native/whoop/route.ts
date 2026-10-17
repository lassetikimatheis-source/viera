import { NextResponse } from "next/server";
import { appOrigin, missingConfig } from "@/lib/integrations/config";
import { exchangeAuthorization, refreshConnection } from "@/lib/integrations/oauth";
import { nativeWHOOPFlow, nativeWHOOPScopes, prepareNativeWHOOP } from "@/lib/integrations/native-whoop";

export const maxDuration = 30;
const recent = new Map<string, number[]>();
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "Pragma": "no-cache" } });

export async function GET(request: Request) {
  void request.url;
  return json({ configured: missingConfig("whoop").length === 0 });
}
export async function POST(request: Request) {
  if (missingConfig("whoop").length) return json({ error: "WHOOP ist noch nicht eingerichtet." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== appOrigin()) return json({ error: "Anfrage nicht erlaubt." }, 403);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now(), cutoff = now - 60000;
  for (const [key, values] of recent) if (!values.some(value => value > cutoff)) recent.delete(key);
  const attempts = (recent.get(ip) || []).filter(value => value > cutoff);
  if (attempts.length >= 15) return json({ error: "Bitte später erneut versuchen." }, 429);
  recent.set(ip, [...attempts, now]);
  try {
    const text = await request.text();
    if (text.length > 20000) return json({ error: "Anfrage zu groß." }, 413);
    const body = JSON.parse(text);
    if (body.action === "prepare") {
      return json(await prepareNativeWHOOP());
    }
    if (body.action === "exchange") {
      if (typeof body.transaction !== "string" || typeof body.code !== "string" || body.code.length > 4096 || typeof body.state !== "string")
        return json({ error: "Ungültige Anmeldung." }, 400);
      const flow = nativeWHOOPFlow(body.transaction, body.state);
      if (!flow) return json({ error: "Anmeldung nicht bestätigt oder abgelaufen." }, 400);
      return json(await exchangeAuthorization("whoop", flow, new URLSearchParams({ code: body.code, state: body.state })));
    }
    if (body.action === "refresh") {
      if (typeof body.refresh !== "string" || !body.refresh || body.refresh.length > 8192) return json({ error: "Ungültige Anmeldung." }, 400);
      return json(await refreshConnection("whoop", { access: "", refresh: body.refresh, expiresAt: 0, scope: nativeWHOOPScopes.join(" "), issuedAt: now }));
    }
    return json({ error: "Unbekannte Aktion." }, 400);
  } catch { return json({ error: "Die WHOOP-Anmeldung konnte nicht bestätigt werden. Bitte erneut verbinden." }, 401); }
}
