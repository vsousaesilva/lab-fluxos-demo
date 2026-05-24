"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createElAction } from "./actions";

const CATEGORIES = [
  { value: "ASSINATURA", label: "Assinatura" },
  { value: "TAREFA", label: "Tarefa" },
  { value: "DECISAO", label: "Decisão" },
  { value: "DADO", label: "Dado" },
  { value: "OUTRO", label: "Outro" },
] as const;

export function ElForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [objective, setObjective] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCode("");
    setObjective("");
    setCategory("");
    setTagsRaw("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await createElAction({
        code,
        objective,
        category: category ? (category as "ASSINATURA" | "TAREFA" | "DECISAO" | "DADO" | "OUTRO") : undefined,
        tags,
        status: "ATIVO",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("EL cadastrada");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nova EL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Expression Language</DialogTitle>
          <DialogDescription>
            Cadastre uma EL usada nos fluxos jPDL/BPMN do PJe. Formato típico:
            <code className="ml-1 rounded bg-muted px-1 font-mono text-xs">
              #{"{home.parametro}"}
            </code>{" "}
            ou{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              ${"{tarefaService.executar()}"}
            </code>
            .
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código*</Label>
            <Input
              id="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="#{home.parametro}"
              className="font-mono text-sm"
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objective">Objetivo (o que faz)</Label>
            <textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex.: retorna o parâmetro X do contexto da home..."
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              >
                <option value="">— escolha —</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
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
                placeholder="prazo, assinatura, juiz"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !code.trim()}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
