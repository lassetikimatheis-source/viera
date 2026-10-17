import { appOrigin } from "./config.ts";
import { beginAuthorization } from "./oauth.ts";
import { seal, unseal, type OAuthFlow } from "./session.ts";

const context = "vyra-native-whoop-v1";
export const nativeWHOOPScopes = ["offline", "read:recovery", "read:sleep", "read:workout", "read:cycles"] as const;

export async function prepareNativeWHOOP() {
  const { flow, url } = await beginAuthorization("whoop", true, nativeWHOOPScopes);
  return { authorizationURL: url, state: flow.state, transaction: seal(flow, context), redirectURI: flow.redirect };
}

export function nativeWHOOPFlow(transaction: string, state: string, now = Date.now()): OAuthFlow | null {
  const flow = unseal<OAuthFlow>(transaction, context);
  if (!flow || flow.native !== true || !Number.isFinite(flow.expiresAt) || flow.expiresAt <= now ||
      typeof flow.verifier !== "string" || !flow.verifier || flow.state !== state ||
      flow.redirect !== `vyra://${new URL(appOrigin()).hostname}/oauth/whoop`) return null;
  return flow;
}
