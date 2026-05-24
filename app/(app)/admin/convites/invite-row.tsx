"use client";

import { useTransition } from "react";
import { Copy, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteInviteAction, revokeInviteAction } from "./actions";
import type { Invite } from "@/lib/db/schema";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(d);
}

type InviteStatus = "available" | "used" | "revoked";

function getStatus(invite: Invite): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.usedBy) return "used";
  return "available";
}

const STATUS_META: Record<
  InviteStatus,
  { label: string; variant: "success" | "secondary" | "destructive" }
> = {
  available: { label: "Disponível", variant: "success" },
  used: { label: "Usado", variant: "secondary" },
  revoked: { label: "Revogado", variant: "destructive" },
};

export function InviteRow({ invite }: { invite: Invite }) {
  const [pending, startTransition] = useTransition();
  const status = getStatus(invite);
  const meta = STATUS_META[status];

  function copy() {
    navigator.clipboard
      .writeText(invite.code)
      .then(() => toast.success("Código copiado"))
      .catch(() => toast.error("Falha ao copiar"));
  }

  function revoke() {
    if (!confirm("Revogar este convite? Não dá pra desfazer.")) return;
    startTransition(async () => {
      const result = await revokeInviteAction({ id: invite.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Convite revogado");
    });
  }

  function remove() {
    if (!confirm("Excluir este convite permanentemente?")) return;
    startTransition(async () => {
      const result = await deleteInviteAction({ id: invite.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Convite excluído");
    });
  }

  return (
    <tr className="border-b align-top hover:bg-muted/20">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs">{invite.code}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={copy}
            className="h-6 w-6 p-0"
            title="Copiar código"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2">
        <Badge variant={meta.variant} className="text-[10px]">
          {meta.label}
        </Badge>
      </td>
      <td className="px-3 py-2 text-xs">{invite.email ?? "—"}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {invite.note ?? "—"}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {formatDate(invite.createdAt)}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {formatDate(invite.usedAt)}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          {status === "available" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={revoke}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
              title="Revogar"
            >
              <Ban className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
