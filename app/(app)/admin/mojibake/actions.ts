"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { fixMojibake, looksLikeMojibake } from "@/lib/text/mojibake";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");
  if (!(await isAdminEmail(session.user.email))) {
    throw new Error("Acesso restrito a administradores");
  }
}

export type MojibakeFix = {
  id: string;
  field: "processName" | "fileName";
  current: string;
  fixed: string;
};

/**
 * Varre flow_source procurando processName/fileName com padrão de mojibake.
 * Retorna lista de correções propostas (sem aplicar).
 */
export async function previewMojibakeFixesAction(): Promise<
  ActionResult<{ total: number; fixes: MojibakeFix[] }>
> {
  try {
    await requireAdmin();
    const db = await getDb();
    const rows = await db
      .select({
        id: schema.flowSource.id,
        processName: schema.flowSource.processName,
        fileName: schema.flowSource.fileName,
      })
      .from(schema.flowSource);

    const fixes: MojibakeFix[] = [];
    for (const r of rows) {
      if (looksLikeMojibake(r.processName)) {
        const fixed = fixMojibake(r.processName);
        if (fixed !== r.processName) {
          fixes.push({
            id: r.id,
            field: "processName",
            current: r.processName,
            fixed,
          });
        }
      }
      if (looksLikeMojibake(r.fileName)) {
        const fixed = fixMojibake(r.fileName);
        if (fixed !== r.fileName) {
          fixes.push({
            id: r.id,
            field: "fileName",
            current: r.fileName,
            fixed,
          });
        }
      }
    }

    return { ok: true, data: { total: rows.length, fixes } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no preview";
    console.error("[previewMojibakeFixesAction]", err);
    return { ok: false, error: message };
  }
}

/**
 * Aplica as correções propostas pelo preview. Volta a fazer o varre antes,
 * pra trabalhar com dados frescos (não confiar em payload do cliente).
 */
export async function applyMojibakeFixesAction(): Promise<
  ActionResult<{ updated: number; rowsTouched: number }>
> {
  try {
    await requireAdmin();

    const previewResult = await previewMojibakeFixesAction();
    if (!previewResult.ok) return previewResult;

    const fixes = previewResult.data.fixes;
    if (fixes.length === 0) {
      return { ok: true, data: { updated: 0, rowsTouched: 0 } };
    }

    const db = await getDb();
    const now = new Date();

    // Agrupa fixes por id pra fazer 1 UPDATE por row (pode ter ambos
    // processName e fileName corrompidos no mesmo fluxo).
    const byId = new Map<
      string,
      Partial<{ processName: string; fileName: string }>
    >();
    for (const f of fixes) {
      const cur = byId.get(f.id) ?? {};
      cur[f.field] = f.fixed;
      byId.set(f.id, cur);
    }

    let updated = 0;
    for (const [id, set] of byId.entries()) {
      await db
        .update(schema.flowSource)
        .set({ ...set, updatedAt: now })
        .where(eq(schema.flowSource.id, id));
      updated++;
    }

    revalidatePath("/catalogos/els");
    revalidatePath("/admin/mojibake");
    return { ok: true, data: { updated, rowsTouched: byId.size } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao aplicar";
    console.error("[applyMojibakeFixesAction]", err);
    return { ok: false, error: message };
  }
}
