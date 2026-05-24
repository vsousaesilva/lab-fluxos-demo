"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteElAction, updateElAction } from "../actions";
import type { ExpressionLanguage } from "@/lib/db/schema";

const CATEGORIES = [
  { value: "", label: "— sem categoria —" },
  { value: "ASSINATURA", label: "Assinatura" },
  { value: "TAREFA", label: "Tarefa" },
  { value: "DECISAO", label: "Decisão" },
  { value: "DADO", label: "Dado" },
  { value: "OUTRO", label: "Outro" },
] as const;

const STATUSES = [
  { value: "ATIVO", label: "Ativo" },
  { value: "EXPERIMENTAL", label: "Experimental" },
  { value: "DEPRECADO", label: "Deprecado" },
] as const;

export function EditElForm({ el }: { el: ExpressionLanguage }) {
  const router = useRouter();
  const [objective, setObjective] = useState(el.objective ?? "");
  const [category, setCategory] = useState<string>(el.category ?? "");
  const [tagsRaw, setTagsRaw] = useState(el.tags.join(", "));
  const [status, setStatus] = useState<string>(el.status);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await updateElAction({
        id: el.id,
        objective,
        category: category ? (category as "ASSINATURA" | "TAREFA" | "DECISAO" | "DADO" | "OUTRO") : undefined,
        tags,
        status: status as "ATIVO" | "DEPRECADO" | "EXPERIMENTAL",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("EL atualizada");
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm(`Excluir a EL "${el.code}"? Isso é irreversível.`)) return;
    startDelete(async () => {
      const result = await deleteElAction({ id: el.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("EL excluída");
      router.push("/catalogos/els");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Código (imutável)</Label>
        <Input
          id="code"
          value={el.code}
          readOnly
          disabled
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="objective">Objetivo</Label>
        <textarea
          id="objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Explique o que essa EL faz, onde se encaixa, exemplos de uso..."
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="prazo, assinatura"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={deleting || pending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Excluindo…" : "Excluir EL"}
        </Button>
        <Button type="submit" disabled={pending || deleting}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
