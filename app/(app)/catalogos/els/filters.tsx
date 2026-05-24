"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "ATIVO", label: "Ativo" },
  { value: "EXPERIMENTAL", label: "Experimental" },
  { value: "DEPRECADO", label: "Deprecado" },
];

const CATEGORIES = [
  { value: "", label: "Todas" },
  { value: "ASSINATURA", label: "Assinatura" },
  { value: "TAREFA", label: "Tarefa" },
  { value: "DECISAO", label: "Decisão" },
  { value: "DADO", label: "Dado" },
  { value: "OUTRO", label: "Outro" },
];

export function ElsFilters() {
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  // sync local search input to URL after debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (q === initialQ) return;
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (category) qs.set("category", category);
      if (q.trim()) qs.set("q", q.trim());
      const search = qs.toString();
      const url = search ? `/catalogos/els?${search}` : "/catalogos/els";
      window.history.replaceState(null, "", url);
    }, 300);
    return () => clearTimeout(t);
  }, [q, status, category, initialQ]);

  function buildHref(next: { status?: string; category?: string }) {
    const s = next.status ?? status;
    const c = next.category ?? category;
    const qs = new URLSearchParams();
    if (s) qs.set("status", s);
    if (c) qs.set("category", c);
    if (q.trim()) qs.set("q", q.trim());
    const search = qs.toString();
    return search ? `/catalogos/els?${search}` : "/catalogos/els";
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Status
        </p>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => {
            const active = s.value === status;
            return (
              <Link
                key={s.value}
                href={buildHref({ status: s.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Categoria
        </p>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => {
            const active = c.value === category;
            return (
              <Link
                key={c.value}
                href={buildHref({ category: c.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Busca (código ou objetivo)
        </p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ex.: home.parametro, prazo, assinatura..."
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}
