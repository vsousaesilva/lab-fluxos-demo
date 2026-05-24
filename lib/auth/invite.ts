import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { Invite } from "@/lib/db/schema";

/**
 * Gera um código curto e legível pra convite.
 * Formato: 4 grupos de 4 chars maiúsculos/dígitos (sem ambíguos 0/O/1/I).
 * Ex: "K3VR-7QXF-T9MZ-A4N2"
 */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let chunk = "";
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      chunk += alphabet[idx];
    }
    groups.push(chunk);
  }
  return groups.join("-");
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export type InviteValidation =
  | { ok: true; invite: Invite }
  | { ok: false; error: string };

/**
 * Valida um código de convite contra a base.
 * Retorna `ok: false` com motivo se inválido / usado / revogado / email não bate.
 * Não consome — chame `consumeInvite` depois de criar o usuário.
 */
export async function validateInvite(
  rawCode: string,
  email?: string
): Promise<InviteValidation> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código de convite obrigatório." };

  const db = await getDb();
  const found = await db.query.invite.findFirst({
    where: eq(schema.invite.code, code),
  });

  if (!found) {
    return { ok: false, error: "Código de convite inválido." };
  }
  if (found.revokedAt) {
    return { ok: false, error: "Este convite foi revogado." };
  }
  if (found.usedBy) {
    return { ok: false, error: "Este convite já foi utilizado." };
  }
  if (found.email && email && found.email.toLowerCase() !== email.toLowerCase()) {
    return {
      ok: false,
      error: `Este convite é exclusivo para ${found.email}.`,
    };
  }

  return { ok: true, invite: found };
}

/** Marca o convite como usado por um usuário. Idempotente — se já usado, no-op. */
export async function consumeInvite(
  inviteId: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db
    .update(schema.invite)
    .set({
      usedBy: userId,
      usedAt: now,
      updatedAt: now,
    })
    .where(and(eq(schema.invite.id, inviteId), isNull(schema.invite.usedBy)));
}
