"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractElsFromFlowsAction } from "./actions";

export function ExtractButton() {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await extractElsFromFlowsAction();
      if (!result.ok) {
        toast.info(result.error, { duration: 6000 });
        return;
      }
      toast.success("Extração concluída");
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      <Sparkles className={pending ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
      {pending ? "Extraindo…" : "Extrair com IA"}
    </Button>
  );
}
