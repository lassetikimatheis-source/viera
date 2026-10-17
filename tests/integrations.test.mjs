import test from "node:test";
import assert from "node:assert/strict";
import { beginAuthorization, exchangeAuthorization, refreshConnection } from "../src/lib/integrations/oauth.ts";
import { seal, unseal, cookieName, readConnection } from "../src/lib/integrations/session.ts";
import { loadProviderData } from "../src/lib/integrations/client.ts";
import { normalizeProvider, mergeProviderImport, likelyDuplicate } from "../src/lib/integrations/data.ts";
import { initialState, readState } from "../src/lib/vyra-data.ts";
import { nativeWHOOPFlow, nativeWHOOPScopes, prepareNativeWHOOP } from "../src/lib/integrations/native-whoop.ts";
process.env.VYRA_APP_URL = "http://localhost:3021";
process.env.VYRA_CONNECTION_SECRET = "local-test-key-only-never-use-in-production";
process.env.WHOOP_CLIENT_ID = "test-client";
process.env.WHOOP_CLIENT_SECRET = "test-secret";
process.env.STRAVA_CLIENT_ID = "12345";
process.env.STRAVA_CLIENT_SECRET = "test-secret";

test("Native WHOOP transaction binds scope, state, redirect, expiration and encryption context", async () => {
  const prepared = await prepareNativeWHOOP();
  const url = new URL(prepared.authorizationURL);
  assert.equal(prepared.redirectURI, "vyra://localhost/oauth/whoop");
  assert.deepEqual(url.searchParams.get("scope").split(" "), [...nativeWHOOPScopes]);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const flow = nativeWHOOPFlow(prepared.transaction, prepared.state);
  assert(flow?.verifier);
  assert.equal(nativeWHOOPFlow(prepared.transaction, "wrong"), null);
  assert.equal(nativeWHOOPFlow(prepared.transaction, prepared.state, Date.now() + 11 * 60000), null);
  assert.equal(nativeWHOOPFlow(prepared.transaction + "tampered", prepared.state), null);
  assert.equal(nativeWHOOPFlow(seal(flow, "other-context"), prepared.state), null);
  assert.equal(nativeWHOOPFlow(seal({ ...flow, redirect: "vyra://other/oauth/whoop" }, "vyra-native-whoop-v1"), prepared.state), null);
  assert.equal(nativeWHOOPFlow(seal({ ...flow, native: false }, "vyra-native-whoop-v1"), prepared.state), null);
  assert(!prepared.authorizationURL.includes("test-secret"));
  assert(!JSON.stringify(prepared).includes(flow.verifier));
});

test("OAuth binds state, redirect and PKCE; token responses never enter a user-facing URL", async () => {
  const { flow, url } = await beginAuthorization("whoop", false);
  assert.equal(new URL(url).hostname, "api.prod.whoop.com");
  assert.equal(new URL(url).searchParams.get("state"), flow.state);
  assert(new URL(url).searchParams.get("code_challenge"));
  assert(!url.includes("test-secret"));
  let called = false;
  const mock = async (url, options) => {
    called = true;
    assert.equal(new URL(url).pathname, "/oauth/oauth2/token");
    const body = new URLSearchParams(options.body);
    assert.equal(body.get("code_verifier"), flow.verifier);
    assert.equal(body.get("redirect_uri"), flow.redirect);
    return new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh", token_type: "Bearer", expires_in: 3600 }), { headers: { "Content-Type": "application/json" } });
  };
  await assert.rejects(() => exchangeAuthorization("whoop", flow, new URLSearchParams({ code: "code", state: "wrong" }), mock));
  assert.equal(called, false);
  const tokens = await exchangeAuthorization("whoop", flow, new URLSearchParams({ code: "code", state: flow.state }), mock);
  assert.equal(tokens.access, "access");
  assert.equal((await beginAuthorization("strava", true)).flow.redirect, "vyra://localhost/oauth/strava");
  await assert.rejects(() => exchangeAuthorization("whoop", { ...flow, expiresAt: 1 }, new URLSearchParams(), mock));
});
test("Encrypted sessions reject tampering, wrong provider and expired sessions", () => {
  const name = cookieName("whoop", "tokens"), tokens = { access: "a", expiresAt: Date.now() + 1000, scope: "read:sleep", issuedAt: Date.now() };
  const sealed = seal(tokens, name);
  assert(!sealed.includes('"access"'));
  assert.equal(readConnection(sealed, "whoop").access, "a");
  assert.equal(readConnection(sealed, "strava"), null);
  const changed = Buffer.from(sealed, "base64url"); changed[20] ^= 1;
  assert.equal(unseal(changed.toString("base64url"), name), null);
  assert.equal(readConnection(seal({ ...tokens, issuedAt: 1 }, name), "whoop"), null);
});
test("Expired OAuth credentials refresh with rotation", async () => {
  const old = { access: "old", refresh: "refresh-old", expiresAt: 1, issuedAt: Date.now(), scope: "offline read:sleep" };
  const result = await refreshConnection("whoop", old, async (url, options) => {
    assert.equal(new URLSearchParams(options.body).get("refresh_token"), "refresh-old");
    return new Response(JSON.stringify({ access_token: "new", refresh_token: "rotated", expires_in: 3600, token_type: "Bearer" }), { headers: { "Content-Type": "application/json" } });
  });
  assert.equal(result.refresh, "rotated"); assert.equal(result.issuedAt, old.issuedAt);
});
test("WHOOP pagination is completed and an upstream failure does not yield partial data", async () => {
  const requests = [];
  await loadProviderData("whoop", "token", "2026-10-15", "2026-10-17", async (url, options) => {
    requests.push(new URL(url).searchParams.get("nextToken"));
    assert.equal(options.headers.Authorization, "Bearer token");
    return new Response(JSON.stringify({ records: [], next_token: requests.length === 1 ? "next" : null }));
  });
  assert.equal(requests[1], "next");
  await assert.rejects(() => loadProviderData("whoop", "token", "2026-10-15", "2026-10-17", async () => new Response("{}", { status: 429 })));
});
test("Provider normalization uses sleep date, units, separate HRV and idempotent import", () => {
  const batch = normalizeProvider("whoop", {
    sleeps: [{ id: "sleep", score_state: "SCORED", end: "2026-10-16T23:30:00Z", timezone_offset: "+02:00", score: { stage_summary: { total_light_sleep_time_milli: 14400000, total_slow_wave_sleep_time_milli: 3600000, total_rem_sleep_time_milli: 7200000 } } }],
    recoveries: [{ cycle_id: 1, sleep_id: "sleep", updated_at: "2026-10-18T00:00:00Z", score_state: "SCORED", score: { resting_heart_rate: 58, hrv_rmssd_milli: 40 } }],
  }, "2026-10-17", "2026-10-17");
  assert.equal(batch.samples.find(s => s.metric === "sleep").value, 7);
  assert(batch.samples.every(s => s.date === "2026-10-17"));
  assert.equal(batch.physiology[0].kind, "hrv-rmssd");
  const state = initialState(false);
  state.samples = [{ id: "manual", metric: "workout", date: "2026-10-17", source: "Manuell", value: 30 }];
  const once = mergeProviderImport(state, batch), twice = mergeProviderImport(once, batch);
  assert.equal(twice.samples.length, once.samples.length);
  assert.equal(twice.physiology.length, 1);
  assert(twice.samples.some(s => s.id === "manual"));
  assert(readState(JSON.stringify(twice)));
  const strava = normalizeProvider("strava", { workouts: [{ id: 2, name: "Run", start_date: "2026-10-17T12:00:00Z", start_date_local: "2026-10-17T14:00:00", distance: 5000, moving_time: 1800, elapsed_time: 2000 }] }, "2026-10-17", "2026-10-17");
  assert.equal(strava.samples[0].workout.distanceKm, 5);
  assert(likelyDuplicate([{ ...strava.samples[0], id: "apple", source: "Apple Watch" }], strava.samples[0]));
  assert.equal(strava.samples[0].value, 30);
});
