export const providers = ["whoop", "strava"] as const;
export type Provider = typeof providers[number];
export const isProvider = (value: string): value is Provider => providers.includes(value as Provider);
export const providerConfig = {
  whoop: {
    name: "WHOOP", issuer: "https://api.prod.whoop.com", authorize: "https://api.prod.whoop.com/oauth/oauth2/auth",
    token: "https://api.prod.whoop.com/oauth/oauth2/token", scopes: ["offline", "read:recovery", "read:sleep", "read:workout"],
  },
  strava: {
    name: "Strava", issuer: "https://www.strava.com", authorize: "https://www.strava.com/oauth/authorize",
    token: "https://www.strava.com/oauth/token", scopes: ["read", "activity:read"],
  },
} as const;
export function missingConfig(provider: Provider) {
  return [`${provider.toUpperCase()}_CLIENT_ID`, `${provider.toUpperCase()}_CLIENT_SECRET`, "VYRA_CONNECTION_SECRET", "VYRA_APP_URL"]
    .filter(key => !process.env[key] || (key === "VYRA_CONNECTION_SECRET" && process.env[key]!.length < 32));
}
export function appOrigin() {
  const url = new URL(process.env.VYRA_APP_URL || "http://localhost:3021");
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost"))
    throw new Error("VYRA_APP_URL benötigt HTTPS.");
  return url.origin;
}
