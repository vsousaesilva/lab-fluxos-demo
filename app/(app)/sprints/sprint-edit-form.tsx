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
import { StringArrayField } from "@/components/forms/string-array-field";
import { SprintItemsField } from "@/components/forms/sprint-items-field";
import { updateSprintAction } from "./actions";
import type { Sprint } from "@/lib/db/schema";

type Props = {
  sprint: Sprint;
};

export function SprintEditForm({ sprint }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal);
  const [weeks, setWeeks] = useState(sprint.weeks);
  const [capacityNotes, setCapacityNotes] = useState(sprint.capacityNotes ?? "");
  const [capacityDescription, setCapacityDescription] = useState(
    sprint.capacityDescription ?? ""
  );
  const [goalHint, setGoalHint] = useState(sprint.goalHint ?? "");
  const [items, setItems] = useState(sprint.items);
  const [outOfScope, setOutOfScope] = useState(sprint.outOfScope);
  const [risks, setRisks] = useState(sprint.risks);
  const [definitionOfDone, setDefinitionOfDone] = useState(sprint.definitionOfDone);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName(sprint.name);
    setGoal(sprint.goal);
    setWeeks(sprint.weeks);
    setCapacityNotes(sprint.capacityNotes ?? "");
    setCapacityDescription(sprint.capacityDescription ?? "");
    setGoalHint(sprint.goalHint ?? "");
    setItems(sprint.items);
    setOutOfScope(sprint.outOfScope);
    setRisks(sprint.risks);
    setDefinitionOfDone(sprint.definitionOfDone);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSprintAction({
        id: sprint.id,
        name,
        goal,
        weeks,
        capacityNotes: capacityNotes || undefined,
        capacityDescription: capacityDescription || null,
        goalHint: goalHint || null,
        items,
        outOfScope: outOfScope.filter((s) => s.trim()),
        risks: risks.filter((s) => s.trim()),
        definitionOfDone: definitionOfDone.filter((s) => s.trim()),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sprint atualizada");
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
          <DialogTitle>Editar sprint</DialogTitle>
          <DialogDescription>
            Ajuste o planejamento manualmente. Status atual permanece.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weeks">Semanas</Label>
              <Input
                id="weeks"
                type="number"
                min={1}
                max={8}
                value={weeks}
                onChange={(e) =>
                  setWeeks(Math.max(1, Math.min(8, Number(e.target.value) || 1)))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal">Sprint Goal</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              maxLength={500}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacityNotes">
              Notas de capacidade x escopo (output do agente)
            </Label>
            <Textarea
              id="capacityNotes"
              value={capacityNotes}
              onChange={(e) => setCapacityNotes(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacityDescription">
              Descrição da capacidade (input original)
            </Label>
            <Textarea
              id="capacityDescription"
              value={capacityDescription}
              onChange={(e) => setCapacityDescription(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Ex.: 2 devs em tempo integral, 1 QA meio período…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goalHint">Indicação de objetivo (input original)</Label>
            <Input
              id="goalHint"
              value={goalHint}
              onChange={(e) => setGoalHint(e.target.value)}
              maxLength={500}
              placeholder="Ex.: estabilizar o fluxo de RPV"
            />
          </div>

          <SprintItemsField values={items} onChange={setItems} />

          <StringArrayField
            label="Fora do escopo"
            values={outOfScope}
            onChange={setOutOfScope}
            max={40}
          />
          <StringArrayField
            label="Riscos"
            values={risks}
            onChange={setRisks}
            max={20}
          />
          <StringArrayField
            label="Definition of Done"
            values={definitionOfDone}
            onChange={setDefinitionOfDone}
            max={20}
          />

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
