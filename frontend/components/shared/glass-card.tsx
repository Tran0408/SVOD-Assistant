import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  strong?: boolean;
  glow?: boolean;
};

export function GlassCard({ className, strong, glow, ...rest }: Props) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        glow && "shadow-[0_0_60px_-20px_var(--accent-glow)]",
        "p-6",
        className,
      )}
      {...rest}
    />
  );
}
