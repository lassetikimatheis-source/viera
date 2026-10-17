export function sandboxMode() {
  return typeof window !== "undefined" && new URLSearchParams(location.search).get("sandbox") === "1";
}
