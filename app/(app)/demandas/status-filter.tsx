"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEMAND_STATUSES } from "@/lib/validators/demand";
import type { DemandStatus } from "@/lib/db/schema";

const LABELS: Record<DemandStatus | "all", string> = {
  all: "Todas",
  REGISTERED: "Registradas",
  APPROVED: "Aprovadas",
  REJECTED: "Rejeitadas",
};

export function StatusFilter({ counts }: { counts: Record<DemandStatus | "all", number> }) {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  const options = ["all", ...DEMAND_STATUSES] as const;

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {options.map((value) => {
        const isActive = current === value;
        const href = value === "all" ? "/demandas" : `/demandas?status=${value}`;
        return (
          <Link
            key={value}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {LABELS[value]}{" "}
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px]",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background text-muted-foreground"
              )}
            >
              {counts[value]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
