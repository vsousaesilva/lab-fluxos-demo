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
import { CeremonySectionsField } from "@/components/forms/ceremony-sections-field";
import { ActionItemsField } from "@/components/forms/action-items-field";
import {
  CEREMONY_TYPES,
  type CeremonyTypeValue,
} from "@/lib/agents/rites-scribe/schema";
import { ceremonyLabel } from "@/lib/agents/rites-scribe/prompt";
import { updateCeremonyAction } from "./actions";
import type { CeremonyRecord, Sprint } from "@/lib/db/schema";

type Props = {
  ceremony: CeremonyRecord;
  sprints: Sprint[];
};

export function CeremonyEditForm({ ceremony, sprints }: Props) {
  const [open, setOpen] = useState(false);
  const [ceremonyType, setCeremonyType] = useState<CeremonyTypeValue>(
    ceremony.ceremonyType
  );
  const [occurredOn, setOccurredOn] = useState(ceremony.occurredOn);
  const [sprintId, setSprintId] = useState(ceremony.sprintId ?? "");
  const [title, setTitle] = useState(ceremony.title);
  const [summary, setSummary] = useState(ceremony.summary);
  const [participants, setParticipants] = useState(ceremony.participants);
  const [sections, setSections] = useState(ceremony.sections);
  const [actionItems, setActionItems] = useState(ceremony.actionItems);
  const [rawNotes, setRawNotes] = useState(ceremony.rawNotes ?? "");
  const [additionalContext, setAdditionalContext] = useState(
    ceremony.additionalContext ?? ""
  );
  const [pending, startTransition] = useTransition();

  function reset() {
    setCeremonyType(ceremony.ceremonyType);
    setOccurredOn(ceremony.occurredOn);
    setSprintId(ceremony.sprintId ?? "");
    setTitle(ceremony.title);
    setSummary(ceremony.summary);
    setParticipants(ceremony.participants);
    setSections(ceremony.sections);
    setActionItems(ceremony.actionItems);
    setRawNotes(ceremony.rawNotes ?? "");
    setAdditionalContext(ceremony.additionalContext ?? "");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCeremonyAction({
        id: ceremony.id,
        ceremonyType,
        occurredOn,
        sprintId: sprintId || null,
        title,
        summary,
        participants: participants.filter((s) => s.trim()),
        sections,
        actionItems,
        rawNotes,
        additionalContext: additionalContext || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ata atualizada");
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
          <DialogTitle>Editar ata</DialogTitle>
          <DialogDescription>
            Ajuste a ata da cerimônia. Status atual permanece.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={ceremonyType}
                onChange={(e) =>
                  setCeremonyType(e.target.value as CeremonyTypeValue)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {CEREMONY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ceremonyLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sprint">Sprint</Label>
              <select
                id="sprint"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">— sem sprint —</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Título da ata</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={2000}
              required
            />
          </div>

          <StringArrayField
            label="Participantes"
            values={participants}
            onChange={setParticipants}
            placeholder="Nome do participante"
            max={40}
          />

          <CeremonySectionsField values={sections} onChange={setSections} />

          <ActionItemsField values={actionItems} onChange={setActionItems} />

          <div className="space-y-1.5">
            <Label htmlFor="rawNotes">
              Anotações brutas (preservadas para regenerar)
            </Label>
            <Textarea
              id="rawNotes"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              rows={4}
              maxLength={50000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ctx">Contexto adicional</Label>
            <Textarea
              id="ctx"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
              maxLength={5000}
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
