import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import {
  ATTACHMENT_LIMITS,
  buildR2Key,
  classifyMime,
} from "@/lib/attachments/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Auth
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const demandId = url.searchParams.get("demandId");
  if (!demandId) {
    return Response.json(
      { error: "demandId é obrigatório (query param)." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const demandRow = await db.query.demand.findFirst({
    where: eq(schema.demand.id, demandId),
  });
  if (!demandRow) {
    return Response.json({ error: "Demanda não encontrada." }, { status: 404 });
  }

  // Parse multipart
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error("[upload] falha ao ler FormData", err);
    return Response.json(
      { error: "Falha ao ler o upload (FormData inválido)." },
      { status: 400 }
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Campo 'file' ausente ou inválido." },
      { status: 400 }
    );
  }

  // Valida MIME
  const category = classifyMime(file.type);
  if (category === "unknown") {
    return Response.json(
      {
        error: `Tipo "${file.type}" não suportado. Aceitos: imagens (JPG/PNG/WEBP/GIF), PDF, TXT/MD/CSV, XLSX/DOCX.`,
      },
      { status: 415 }
    );
  }

  // Valida tamanho do arquivo
  if (file.size > ATTACHMENT_LIMITS.maxFileBytes) {
    return Response.json(
      {
        error: `Arquivo "${file.name}" excede ${
          ATTACHMENT_LIMITS.maxFileBytes / 1024 / 1024
        } MB.`,
      },
      { status: 413 }
    );
  }

  // Valida limites por demanda (count + total bytes)
  const existing = await db
    .select({
      size: schema.demandAttachment.size,
    })
    .from(schema.demandAttachment)
    .where(eq(schema.demandAttachment.demandId, demandId));

  if (existing.length >= ATTACHMENT_LIMITS.maxFilesPerDemand) {
    return Response.json(
      {
        error: `Limite de ${ATTACHMENT_LIMITS.maxFilesPerDemand} arquivos por demanda atingido.`,
      },
      { status: 409 }
    );
  }
  const totalAfter =
    existing.reduce((s, a) => s + a.size, 0) + file.size;
  if (totalAfter > ATTACHMENT_LIMITS.maxTotalBytes) {
    return Response.json(
      {
        error: `Soma dos anexos excederia ${
          ATTACHMENT_LIMITS.maxTotalBytes / 1024 / 1024
        } MB.`,
      },
      { status: 413 }
    );
  }

  // Sobe pro R2
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DEMAND_ATTACHMENTS) {
    return Response.json(
      {
        error:
          "Bucket DEMAND_ATTACHMENTS não configurado. Rode _cf-create-attachments-bucket.cmd.",
      },
      { status: 500 }
    );
  }

  const r2Key = buildR2Key(demandId, file.name);
  try {
    const buf = await file.arrayBuffer();
    await env.DEMAND_ATTACHMENTS.put(r2Key, buf, {
      httpMetadata: { contentType: file.type },
    });
  } catch (err) {
    console.error("[upload] R2 put falhou", err);
    return Response.json(
      { error: "Falha ao armazenar arquivo." },
      { status: 500 }
    );
  }

  // Insert no D1
  try {
    const [row] = await db
      .insert(schema.demandAttachment)
      .values({
        demandId,
        fileName: file.name.slice(0, 250),
        mimeType: file.type,
        size: file.size,
        r2Key,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();
    return Response.json({ ok: true, data: row });
  } catch (err) {
    // Se DB falhar, limpa R2 pra não ficar órfão
    try {
      await env.DEMAND_ATTACHMENTS.delete(r2Key);
    } catch {}
    console.error("[upload] D1 insert falhou", err);
    return Response.json(
      { error: "Falha ao registrar anexo no banco." },
      { status: 500 }
    );
  }
}
