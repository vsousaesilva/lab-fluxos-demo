"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { createDemandAction, updateDemandAction } from "./actions";
import { createDemandSchema } from "@/lib/validators/demand";
import type { Demand } from "@/lib/db/schema";

type Props = {
  /** Se informado, o form opera em modo edição (UPDATE). */
  initial?: Demand;
  /** Customiza o botão que abre o dialog. Default = "Nova demanda". */
  trigger?: React.ReactNode;
};

export function DemandForm({ initial, trigger }: Props) {
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [requesterName, setRequesterName] = useState(
    initial?.requesterName ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setRequesterName(initial?.requesterName ?? "");
    setErrors({});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createDemandSchema.safeParse({
      title,
      description,
      requesterName,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "";
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = isEdit
        ? await updateDemandAction({ id: initial!.id, ...parsed.data })
        : await createDemandAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Demanda atualizada" : "Demanda registrada");
      reset();
      setOpen(false);
    });
  }

  const defaultTrigger = isEdit ? (
    <Button size="sm" variant="outline">
      <Pencil className="h-4 w-4" />
      Editar
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4" />
      Nova demanda
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar demanda" : "Registrar demanda"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os campos abaixo. O status atual não muda."
              : "Toda demanda registrada entra no pipeline com status REGISTERED."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Migração do fluxo de RPV"
              required
              maxLength={140}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requesterName">Solicitante</Label>
            <Input
              id="requesterName"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Nome do solicitante"
              required
              maxLength={120}
            />
            {errors.requesterName ? (
              <p className="text-xs text-destructive">{errors.requesterName}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, motivação, escopo desejado…"
              required
              rows={6}
              maxLength={5000}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : isEdit ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
