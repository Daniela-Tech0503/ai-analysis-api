import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-[28px] border border-white/12 bg-slate-950/70 px-5 py-4 text-sm text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none ring-0 placeholder:text-slate-400 focus:border-[var(--accent)]/60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
