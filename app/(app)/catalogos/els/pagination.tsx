import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Query params atuais (status, category, q) pra preservar nos links. */
  searchParams: Record<string, string | undefined>;
};

function buildHref(
  searchParams: Record<string, string | undefined>,
  page: number
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") qs.set(k, v);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/catalogos/els?${s}` : "/catalogos/els";
}

export function Pagination({ page, totalPages, total, pageSize, searchParams }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const linkBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Mostrando <strong>{from}</strong>–<strong>{to}</strong> de{" "}
        <strong>{total.toLocaleString("pt-BR")}</strong>
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(searchParams, 1)}
          aria-disabled={page === 1}
          className={cn(
            linkBase,
            page === 1
              ? "pointer-events-none text-muted-foreground/40"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Link>
        <Link
          href={buildHref(searchParams, Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn(
            linkBase,
            page === 1
              ? "pointer-events-none text-muted-foreground/40"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="px-2 text-xs tabular-nums">
          {page} / {totalPages}
        </span>
        <Link
          href={buildHref(searchParams, Math.min(totalPages, page + 1))}
          aria-disabled={page === totalPages}
          className={cn(
            linkBase,
            page === totalPages
              ? "pointer-events-none text-muted-foreground/40"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          title="Próxima"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={buildHref(searchParams, totalPages)}
          aria-disabled={page === totalPages}
          className={cn(
            linkBase,
            page === totalPages
              ? "pointer-events-none text-muted-foreground/40"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
