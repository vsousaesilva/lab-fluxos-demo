"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
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
import { updateGeneratedFlowAction } from "./actions";
import type { GeneratedFlow } from "@/lib/db/schema";

type Props = {
  flow: GeneratedFlow;
};

export function FlowEditForm({ flow }: Props) {
  const [open, setOpen] = useState(false);
  const [processName, setProcessName] = useState(flow.processName);
  const [xml, setXml] = useState(flow.xml);
  const [pending, startTransition] = useTransition();

  function reset() {
    setProcessName(flow.processName);
    setXml(flow.xml);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateGeneratedFlowAction({
        id: flow.id,
        processName,
        xml,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Fluxo atualizado e validado");
      setOpen(false);
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
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar XML jPDL</DialogTitle>
          <DialogDescription>
            Edite o XML manualmente. Ao salvar, o lint roda automaticamente e
            findings são atualizados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="processName">Nome do processo</Label>
            <Input
              id="processName"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xml">XML jPDL 3.2</Label>
            <Textarea
              id="xml"
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              rows={24}
              className="font-mono text-[10px] leading-relaxed"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              {xml.length.toLocaleString("pt-BR")} caracteres
            </p>
          </div>
          <DialogFooter className="gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar e validar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
