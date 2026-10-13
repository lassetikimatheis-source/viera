import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white", {
  variants: {
    variant: {
      default: "bg-neutral-950 text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950",
      secondary: "border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-white",
      ghost: "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10",
      violet: "bg-violet-600 text-white shadow-sm hover:bg-violet-500",
      pink: "bg-[#F7B2C4] text-neutral-950 shadow-sm hover:bg-[#f59eb6]",
    },
    size: { sm: "h-9 px-4", md: "h-11 px-5", icon: "size-10" },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
