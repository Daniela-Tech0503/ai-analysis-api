import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-slate-950 shadow-[0_10px_30px_rgba(94,234,212,0.18)] hover:bg-[var(--accent-strong)] focus-visible:ring-[var(--accent)]",
        ghost: "bg-white/6 text-slate-100 hover:bg-white/10 focus-visible:ring-white/40",
        outline: "border border-white/12 bg-white/5 text-slate-100 hover:bg-white/10 focus-visible:ring-white/40",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
