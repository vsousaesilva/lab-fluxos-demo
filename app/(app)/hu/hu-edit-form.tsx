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
import { ScenariosField } from "@/components/forms/scenarios-field";
import { BusinessRulesField } from "@/components/forms/business-rules-field";
import { updateUserStoryAction } from "./actions";
import type { UserStory } from "@/lib/db/schema";

type Props = {
  story: UserStory;
};

export function HuEditForm({ story }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(story.title);
  const [asA, setAsA] = useState(story.asA);
  const [iWant, setIWant] = useState(story.iWant);
  const [soThat, setSoThat] = useState(story.soThat);
  const [scenarios, setScenarios] = useState(story.scenarios);
  const [businessRules, setBusinessRules] = useState(story.businessRules);
  const [references, setReferences] = useState(story.references ?? "N/a");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle(story.title);
    setAsA(story.asA);
    setIWant(story.iWant);
    setSoThat(story.soThat);
    setScenarios(story.scenarios);
    setBusinessRules(story.businessRules);
    setReferences(story.references ?? "N/a");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateUserStoryAction({
        id: story.id,
        title,
        asA,
        iWant,
        soThat,
        scenarios,
        businessRules,
        references,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("HU atualizada");
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar HU</DialogTitle>
          <DialogDescription>
            Ajuste a HU manualmente. Status atual permanece.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="rounded-md border bg-secondary/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Visão de usuário
            </p>
            <div className="grid grid-cols-[60px_1fr] items-center gap-x-2 gap-y-2 text-sm">
              <Label htmlFor="asA" className="text-right text-xs">
                Como
              </Label>
              <Input
                id="asA"
                value={asA}
                onChange={(e) => setAsA(e.target.value)}
                maxLength={200}
                required
              />
              <Label htmlFor="iWant" className="text-right text-xs">
                Quero
              </Label>
              <Input
                id="iWant"
                value={iWant}
                onChange={(e) => setIWant(e.target.value)}
                maxLength={500}
                required
              />
              <Label htmlFor="soThat" className="text-right text-xs">
                Para
              </Label>
              <Input
                id="soThat"
                value={soThat}
                onChange={(e) => setSoThat(e.target.value)}
                maxLength={500}
                required
              />
            </div>
          </div>

          <ScenariosField values={scenarios} onChange={setScenarios} />

          <BusinessRulesField
            values={businessRules}
            onChange={setBusinessRules}
          />

          <div className="space-y-1.5">
            <Label htmlFor="references">Referências</Label>
            <Textarea
              id="references"
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="N/a"
            />
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
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
