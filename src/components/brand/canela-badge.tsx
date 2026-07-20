import Image from "next/image";

import { cn } from "@/lib/utils";

interface CanelaBadgeProps {
  simple?: boolean;
  size?: number;
  priority?: boolean;
  className?: string;
}

export function CanelaBadge({
  simple = false,
  size = 48,
  priority = false,
  className,
}: CanelaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0",
        simple && "overflow-hidden rounded-full bg-[#F7F0E2]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/canela-logo.png"
        alt="Canela — Diseño artesanal"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
        style={simple ? { transform: "scale(1.06)" } : undefined}
      />
    </span>
  );
}
