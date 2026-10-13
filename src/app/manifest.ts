import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VYRA",
    short_name: "VYRA",
    description: "High Performance for Everybody.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#171717",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
