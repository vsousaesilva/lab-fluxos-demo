"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { describeElsBatchAction } from "./actions";

type Props = {
  /** Lista de IDs de ELs sem objective (a descrever). */
  pendingIds: string[];
};

const BATCH_SIZE = 5; // server action aceita até 5 por chamada

export function BatchDescribeButton({ pendingIds }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, failed: 0 });

  if (pendingIds.length === 0) return null;

  async function run() {
    if (
      !confirm(
        `Vou descrever ${pendingIds.length} EL(s) com Gemini Flash. Custo estimado: ~R$ ${(pendingIds.length * 0.0006).toFixed(3)}. Pode demorar ${Math.ceil((pendingIds.length * 3) / 60)} min. Continuar?`
      )
    ) {
      return;
    }
    setRunning(true);
    let done = 0;
    let failed = 0;
    setProgress({ done, failed });

    try {
      for (let i = 0; i < pendingIds.length; i += BATCH_SIZE) {
        const slice = pendingIds.slice(i, i + BATCH_SIZE);
        const result = await describeElsBatchAction({ ids: slice });
        if (result.ok) {
          done += result.data.ok;
          failed += result.data.failed;
        } else {
          failed += slice.length;
          toast.error(result.error);
        }
        setProgress({ done, failed });
      }
      if (failed === 0) {
        toast.success(`${done} EL(s) descritas com IA`);
      } else {
        toast.warning(
          `${done} descritas, ${failed} falharam — veja /agentes pros detalhes`
        );
      }
      router.refresh();
    } finally {
      setRunning(false);
      setProgress({ done: 0, failed: 0 });
    }
  }

  const total = pendingIds.length;
  const completed = progress.done + progress.failed;

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={running}
      title={`Roda Gemini Flash em ${total} EL(s) sem descrição, em batches de ${BATCH_SIZE}`}
    >
      <Sparkles
        className={running ? "h-4 w-4 animate-pulse" : "h-4 w-4"}
      />
      {running
        ? `Descrevendo ${completed}/${total}…`
        : `Descrever ${total} pendentes com IA`}
    </Button>
  );
}
