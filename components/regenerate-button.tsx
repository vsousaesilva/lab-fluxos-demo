"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  endpoint: string;
  /**
   * Payload do POST. Inclua `replace<Entity>Id: id` aqui pra que o agente
   * faça UPDATE em vez de INSERT.
   */
  payload: Record<string, unknown>;
  /**
   * Quando true e `approved` for true, pede confirmação antes
   * (evita descartar versão aprovada por acidente).
   */
  confirmIfApproved?: boolean;
  approved?: boolean;
  /**
   * Quando true, desabilita o botão. Útil pra atas/sprints antigas
   * sem inputs persistidos.
   */
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * Botão que dispara o mesmo endpoint do agente passando o ID do registro
 * existente em `payload.replace<Entity>Id`. O agente faz UPDATE em vez de
 * INSERT e reseta o status pra DRAFT/PROPOSED (precisa nova revisão).
 *
 * Consome o stream em background — não mostra preview, só aguarda o
 * `onComplete` server-side terminar e dispara `router.refresh()`.
 */
export function RegenerateButton({
  endpoint,
  payload,
  confirmIfApproved,
  approved,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function regenerate() {
    if (confirmIfApproved && approved) {
      const ok = window.confirm(
        "Este item já está aprovado. Regenerar vai descartar a versão atual e marcá-lo como Rascunho novamente. Continuar?"
      );
      if (!ok) return;
    }
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          message = JSON.parse(text).error ?? text;
        } catch {
          // ignora
        }
        throw new Error(message || `HTTP ${res.status}`);
      }
      // Consome o stream até terminar (server-side onComplete persiste)
      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      toast.success("Regenerado");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao regenerar";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title={disabledReason ?? "Indisponível"}
      >
        <Sparkles className="h-4 w-4" />
        Regenerar com IA
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={regenerate}
    >
      <Sparkles className={pending ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
      {pending ? "Regerando…" : "Regenerar com IA"}
    </Button>
  );
}
