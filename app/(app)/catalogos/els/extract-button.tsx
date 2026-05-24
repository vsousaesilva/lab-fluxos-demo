"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractElsFromFlowsAction } from "./actions";

export function ExtractButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "Vai varrer todos os 212 XMLs em R2 e extrair as ELs (regex, sem IA). Pode demorar 10-30 segundos. Continuar?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await extractElsFromFlowsAction();
      if (!result.ok) {
        toast.error(result.error, { duration: 8000 });
        return;
      }
      const r = result.data;
      toast.success(
        `${r.uniqueEls} ELs únicas (${r.createdEls} novas, ${r.updatedEls} atualizadas) em ${r.processedFlows} fluxos · ${(r.durationMs / 1000).toFixed(1)}s`,
        { duration: 8000 }
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      <Download className={pending ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
      {pending ? "Extraindo…" : "Extrair de fluxos"}
    </Button>
  );
}
