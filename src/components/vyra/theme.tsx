"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "./ui";
import { useVyra } from "./store";

export function ThemeControl() {
  const { toast } = useVyra();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("vyra-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return (
    <IconButton
      icon={theme === "dark" ? Sun : Moon}
      label={
        theme === "dark"
          ? "Hellen Modus aktivieren"
          : "Dunklen Modus aktivieren"
      }
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        try {
          localStorage.setItem("vyra-theme", next);
        } catch {
          toast("Darstellung konnte nicht gespeichert werden.");
        }
      }}
    />
  );
}
