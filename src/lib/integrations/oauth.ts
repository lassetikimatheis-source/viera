import * as oauth from "oauth4webapi";
import { appOrigin, missingConfig, providerConfig, type Provider } from "./config.ts";
import type { ConnectionTokens, OAuthFlow } from "./session.ts";

function settings(provider: Provider) {
  if (missingConfig(provider).length) throw new Error("Diese Verbindung ist noch nicht auf dem Server eingerichtet.");
  const config = providerConfig[provider];
  return {
    as: { issuer: config.issuer, authorization_endpoint: config.authorize, token_endpoint: config.token } satisfies oauth.AuthorizationServer,
    client: { client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`]! },
    auth: oauth.ClientSecretPost(process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!),
  };
}
export async function beginAuthorization(provider: Provider, native: boolean, scopes: readonly string[] = providerConfig[provider].scopes) {
  const { as, client } = settings(provider);
  const state = oauth.generateRandomState(), verifier = oauth.generateRandomCodeVerifier();
  const redirect = native ? `vyra://${new URL(appOrigin()).hostname}/oauth/${provider}` : `${appOrigin()}/api/integrations/${provider}/callback`;
  const flow: OAuthFlow = { state, verifier, redirect, native, expiresAt: Date.now() + 10 * 60000 };
  const url = new URL(as.authorization_endpoint!);
  if (native && provider === "strava") url.pathname = "/oauth/mobile/authorize";
  url.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirect, response_type: "code", state,
    scope: scopes.join(provider === "strava" ? "," : " "),
    code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256" }).toString();
  return { flow, url: url.href };
}
function tokens(result: oauth.TokenEndpointResponse, old?: ConnectionTokens): ConnectionTokens {
  const expires = Number(result.expires_in);
  if (!Number.isFinite(expires) || expires <= 0) throw new Error("Der Anbieter hat keine gültige Laufzeit zurückgegeben.");
  return { access: result.access_token, refresh: result.refresh_token || old?.refresh,
    expiresAt: Date.now() + expires * 1000, scope: result.scope || old?.scope || "", issuedAt: old?.issuedAt || Date.now() };
}
export async function exchangeAuthorization(provider: Provider, flow: OAuthFlow, params: URLSearchParams, fetcher?: typeof fetch) {
  if (flow.expiresAt < Date.now()) throw new Error("Die Anmeldung ist abgelaufen. Bitte erneut verbinden.");
  const { as, client, auth } = settings(provider);
  const checked = oauth.validateAuthResponse(as, client, params, flow.state);
  const response = await oauth.authorizationCodeGrantRequest(as, client, auth, checked, flow.redirect, flow.verifier,
    { signal: AbortSignal.timeout(15000), ...(fetcher ? { [oauth.customFetch]: fetcher } : {}) });
  return tokens(await oauth.processAuthorizationCodeResponse(as, client, response));
}
export async function refreshConnection(provider: Provider, old: ConnectionTokens, fetcher?: typeof fetch) {
  if (old.expiresAt > Date.now() + 60000) return old;
  if (!old.refresh) throw new Error("Die Verbindung ist abgelaufen. Bitte erneut anmelden.");
  const { as, client, auth } = settings(provider);
  const response = await oauth.refreshTokenGrantRequest(as, client, auth, old.refresh,
    { signal: AbortSignal.timeout(15000), ...(provider === "whoop" ? { additionalParameters: { scope: "offline" } } : {}),
      ...(fetcher ? { [oauth.customFetch]: fetcher } : {}) });
  return tokens(await oauth.processRefreshTokenResponse(as, client, response), old);
}
