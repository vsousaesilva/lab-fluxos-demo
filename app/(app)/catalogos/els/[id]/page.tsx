import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ElStatus } from "@/lib/db/schema";
import { getEl } from "../actions";
import { EditElForm } from "./edit-form";

const STATUS_META: Record<
  ElStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  ATIVO: { label: "Ativo", variant: "success" },
  EXPERIMENTAL: { label: "Experimental", variant: "warning" },
  DEPRECADO: { label: "Deprecado", variant: "destructive" },
};

export default async function ElDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { el, flows } = await getEl(id);
  if (!el) notFound();

  const status = STATUS_META[el.status];

  return (
    <>
      <PageHeader
        title="Expression Language"
        description={
          <span className="font-mono text-xs">
            {el.code}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            <Link
              href="/catalogos/els"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <EditElForm el={el} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fluxos onde aparece
              </h3>
              {flows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma ocorrência registrada ainda. Quando a auto-extração rodar (próximo release), os fluxos contendo esta EL aparecerão aqui.
                </p>
              ) : (
                <ul className="space-y-2">
                  {flows.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-start justify-between gap-2 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {f.processName}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {f.fileName}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {f.count}×
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Criada em:</span>{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Fortaleza",
                }).format(el.createdAt)}
              </div>
              <div>
                <span className="font-medium text-foreground">Atualizada em:</span>{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Fortaleza",
                }).format(el.updatedAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
