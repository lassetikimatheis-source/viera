import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appOrigin, isProvider, missingConfig, type Provider } from "@/lib/integrations/config";
import { beginAuthorization, exchangeAuthorization, refreshConnection } from "@/lib/integrations/oauth";
import { cookieName, readConnection, seal, unseal, type OAuthFlow, type ConnectionTokens } from "@/lib/integrations/session";
import { loadProviderData, revokeProvider } from "@/lib/integrations/client";
export const maxDuration = 60;
type Context = { params: Promise<{ provider: string; action: string }> };
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
function saveTokens(res: NextResponse, provider: Provider, tokens: ConnectionTokens) {
  res.cookies.set(cookieName(provider, "tokens"), seal(tokens, cookieName(provider, "tokens")), {
    httpOnly: true, secure: appOrigin().startsWith("https:"), sameSite: "lax", path: "/api/integrations", maxAge: 30 * 86400,
  });
}
async function callback(req: NextRequest, provider: Provider, native: boolean) {
  const jar = await cookies(), name = cookieName(provider, "flow");
  const flow = unseal<OAuthFlow>(jar.get(name)?.value, name);
  const fail = () => native ? response({ error: "Anmeldung nicht bestätigt oder abgelaufen. Bitte erneut verbinden." }, 400)
    : NextResponse.redirect(new URL("/?connection=error#profile/connections", appOrigin()));
  if (!flow || flow.native !== native || typeof flow.state !== "string" || flow.expiresAt < Date.now()) return fail();
  const body = native ? await req.json() : null;
  const params = native ? new URLSearchParams({ code: String(body?.code || ""), state: String(body?.state || ""), ...(body?.error ? { error: String(body.error) } : {}) }) : req.nextUrl.searchParams;
  let res: NextResponse;
  try {
    const tokens = await exchangeAuthorization(provider, flow, params);
    res = native ? response({ connected: true }) : NextResponse.redirect(new URL("/?connection=success#profile/connections", appOrigin()));
    saveTokens(res, provider, tokens);
  } catch { res = fail(); }
  res.cookies.set(name, "", { path: "/api/integrations", maxAge: 0 });
  return res;
}
export async function GET(req: NextRequest, context: Context) {
  const { provider, action } = await context.params;
  if (!isProvider(provider) || action !== "callback") return response({ error: "Nicht gefunden." }, 404);
  if (missingConfig(provider).length) return response({ error: "Verbindung noch nicht eingerichtet." }, 503);
  return callback(req, provider, false);
}
export async function POST(req: NextRequest, context: Context) {
  const { provider, action } = await context.params;
  if (!isProvider(provider) || !["start", "callback", "sync", "disconnect"].includes(action)) return response({ error: "Nicht gefunden." }, 404);
  if (req.headers.get("origin") !== new URL(req.url).origin) return response({ error: "Anfrage nicht erlaubt." }, 403);
  if (missingConfig(provider).length) return response({ error: "Verbindung noch nicht eingerichtet.", missing: missingConfig(provider) }, 503);
  try {
    if (new URL(req.url).origin !== appOrigin()) return response({ error: "Die App-Adresse stimmt nicht mit der Konfiguration überein." }, 400);
    if (action === "start") {
      const body = await req.json();
      const { flow, url } = await beginAuthorization(provider, body.native === true);
      const res = response({ url });
      res.cookies.set(cookieName(provider, "flow"), seal(flow, cookieName(provider, "flow")), {
        httpOnly: true, secure: appOrigin().startsWith("https:"), sameSite: "lax", path: "/api/integrations", maxAge: 600,
      });
      return res;
    }
    if (action === "callback") return callback(req, provider, true);
    const jar = await cookies(), old = readConnection(jar.get(cookieName(provider, "tokens"))?.value, provider);
    if (!old) return response({ error: "Bitte zuerst mit dem Anbieter verbinden." }, 401);
    const tokens = await refreshConnection(provider, old);
    if (action === "disconnect") {
      await revokeProvider(provider, tokens.access);
      const res = response({ disconnected: true });
      res.cookies.set(cookieName(provider, "tokens"), "", { path: "/api/integrations", maxAge: 0 });
      return res;
    }
    const to = new Date().toISOString().slice(0, 10), from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    let res: NextResponse;
    try { res = response({ batch: await loadProviderData(provider, tokens.access, from, to) }); }
    catch (error) { res = response({ error: error instanceof Error ? error.message : "Abruf fehlgeschlagen." }, 502); }
    // Persist a rotated refresh token even if the subsequent data request failed.
    saveTokens(res, provider, tokens);
    return res;
  } catch {
    return response({ error: "Verbindung fehlgeschlagen. Bitte erneut anmelden oder später versuchen." }, 502);
  }
}
