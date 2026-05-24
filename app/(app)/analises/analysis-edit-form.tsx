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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StringArrayField } from "@/components/forms/string-array-field";
import { MultiSelectField } from "@/components/forms/multi-select-field";
import { BacklogItemsField } from "@/components/forms/backlog-items-field";
import { IMPACTED_TEAMS } from "@/lib/agents/demand-analyst/schema";
import { updateAnalysisAction } from "./actions";
import type { DemandAnalysis } from "@/lib/db/schema";

type Props = {
  analysis: DemandAnalysis;
};

export function AnalysisEditForm({ analysis }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(analysis.summary);
  const [objectives, setObjectives] = useState(analysis.objectives);
  const [impactedTeams, setImpactedTeams] = useState(analysis.impactedTeams);
  const [assumptions, setAssumptions] = useState(analysis.assumptions);
  const [risks, setRisks] = useState(analysis.risks);
  const [openQuestions, setOpenQuestions] = useState(analysis.openQuestions);
  const [backlogItems, setBacklogItems] = useState(analysis.backlogItems);
  const [pending, startTransition] = useTransition();

  function reset() {
    setSummary(analysis.summary);
    setObjectives(analysis.objectives);
    setImpactedTeams(analysis.impactedTeams);
    setAssumptions(analysis.assumptions);
    setRisks(analysis.risks);
    setOpenQuestions(analysis.openQuestions);
    setBacklogItems(analysis.backlogItems);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateAnalysisAction({
        id: analysis.id,
        summary,
        objectives: objectives.filter((s) => s.trim()),
        impactedTeams,
        assumptions: assumptions.filter((s) => s.trim()),
        risks: risks.filter((s) => s.trim()),
        openQuestions: openQuestions.filter((s) => s.trim()),
        backlogItems,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Análise atualizada");
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
          <DialogTitle>Editar análise</DialogTitle>
          <DialogDescription>
            Ajuste manualmente os campos da análise. Status atual permanece.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              maxLength={3000}
              required
            />
          </div>

          <StringArrayField
            label="Objetivos"
            values={objectives}
            onChange={setObjectives}
            placeholder="Ex.: Reduzir tempo de tramitação em 30%"
            max={15}
          />

          <MultiSelectField
            label="Times impactados"
            options={IMPACTED_TEAMS}
            value={impactedTeams}
            onChange={setImpactedTeams}
          />

          <StringArrayField
            label="Premissas"
            values={assumptions}
            onChange={setAssumptions}
            placeholder="Ex.: Sistema integrado ao PJe"
            max={15}
          />

          <StringArrayField
            label="Riscos"
            values={risks}
            onChange={setRisks}
            placeholder="Ex.: Dependência de homologação TRF5"
            max={15}
          />

          <StringArrayField
            label="Dúvidas em aberto"
            values={openQuestions}
            onChange={setOpenQuestions}
            placeholder="Ex.: Qual será o prazo de informação?"
            max={15}
          />

          <BacklogItemsField values={backlogItems} onChange={setBacklogItems} />

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
