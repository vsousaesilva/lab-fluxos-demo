"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { HuEditForm } from "./hu-edit-form";
import { setUserStoryStatusAction } from "./actions";
import type { UserStory, UserStoryStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<
  UserStoryStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  APPROVED: { label: "Aprovada", variant: "success" },
  REJECTED: { label: "Rejeitada", variant: "destructive" },
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(d);
}

export function HuCard({
  story,
  demandTitle,
}: {
  story: UserStory;
  demandTitle?: string;
}) {
  const [pending, startTransition] = useTransition();
  const status = STATUS_LABEL[story.status];

  function changeStatus(next: UserStoryStatus) {
    startTransition(async () => {
      const result = await setUserStoryStatusAction({ id: story.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`HU ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{story.title}</h3>
            <p className="text-xs text-muted-foreground">
              {demandTitle ? `${demandTitle} · ` : ""}
              {formatDate(story.createdAt)} · {story.scenarios.length} cenário(s) ·{" "}
              {story.businessRules.length} RN(s)
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
          <p>
            <strong>Como</strong> {story.asA}
          </p>
          <p>
            <strong>Quero</strong> {story.iWant}
          </p>
          <p>
            <strong>Para</strong> {story.soThat}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {story.status === "DRAFT" ? (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => changeStatus("APPROVED")}
              >
                <Check className="h-4 w-4" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => changeStatus("REJECTED")}
              >
                <X className="h-4 w-4" />
                Rejeitar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => changeStatus("DRAFT")}
            >
              Reabrir
            </Button>
          )}
          <HuEditForm story={story} />
          <RegenerateButton
            endpoint="/api/agents/user-story-writer"
            payload={{
              demandId: story.demandId,
              replaceStoryId: story.id,
            }}
            confirmIfApproved
            approved={story.status === "APPROVED"}
          />
          <PrintTrigger href={`/print/hu/${story.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
