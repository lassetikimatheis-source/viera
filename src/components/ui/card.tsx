import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-[1.5rem] border border-neutral-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(23,23,23,0.06)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-black/20", className)} {...props} />;
}
