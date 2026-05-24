import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { id } = await ctx.params;
  const db = await getDb();
  const att = await db.query.demandAttachment.findFirst({
    where: eq(schema.demandAttachment.id, id),
  });
  if (!att) return new Response("Anexo não encontrado", { status: 404 });

  const { env } = await getCloudflareContext({ async: true });
  if (!env.DEMAND_ATTACHMENTS) {
    return new Response("Bucket não configurado", { status: 500 });
  }

  const obj = await env.DEMAND_ATTACHMENTS.get(att.r2Key);
  if (!obj) return new Response("Arquivo não encontrado no storage", { status: 404 });

  const headers_ = new Headers();
  headers_.set("Content-Type", att.mimeType);
  headers_.set("Content-Length", String(att.size));
  headers_.set(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(att.fileName)}"`
  );
  headers_.set("Cache-Control", "private, max-age=300");

  return new Response(obj.body, { headers: headers_ });
}
