"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { createInviteAction } from "./actions";

export function InviteForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setNote("");
    setGenerated(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createInviteAction({ email, note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Convite gerado");
      setGenerated(result.data.code);
    });
  }

  function copyCode() {
    if (!generated) return;
    navigator.clipboard
      .writeText(generated)
      .then(() => toast.success("Código copiado"))
      .catch(() => toast.error("Falha ao copiar"));
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
          Gerar convite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar convite</DialogTitle>
          <DialogDescription>
            O código gerado permite que UMA pessoa crie conta. Se informar o
            email, só essa pessoa poderá usá-lo.
          </DialogDescription>
        </DialogHeader>
        {generated ? (
          <div className="space-y-3">
            <div className="rounded-md border border-success/40 bg-success/10 p-4 text-center">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Código gerado
              </p>
              <p className="break-all font-mono text-lg font-semibold tracking-wide text-success">
                {generated}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Copie agora e envie ao usuário. Você pode reabrir esta lista
              depois — mas o código continua único.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button onClick={copyCode}>Copiar código</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email do convidado (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="se preenchido, só esse email pode usar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: convite pra Ana JFCE"
                maxLength={500}
              />
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
                {pending ? "Gerando…" : "Gerar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
