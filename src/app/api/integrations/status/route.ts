import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { missingConfig, providers } from "@/lib/integrations/config";
import { cookieName, readConnection } from "@/lib/integrations/session";
export async function GET(request: Request) {
  void request.url;
  const jar = await cookies();
  return NextResponse.json({ providers: providers.map(provider => {
    const missing = missingConfig(provider), tokens = readConnection(jar.get(cookieName(provider, "tokens"))?.value, provider);
    return { provider, configured: missing.length === 0, connected: missing.length === 0 && !!tokens,
      missing, expiresAt: tokens?.expiresAt || null };
  }) }, { headers: { "Cache-Control": "no-store, private" } });
}
