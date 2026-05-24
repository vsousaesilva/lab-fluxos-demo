import Link from "next/link";
import { BookText, AlertCircle, CheckCircle2, FlaskConical, Archive } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ElCategory, ElStatus } from "@/lib/db/schema";
import { getElMetrics, listEls } from "./actions";
import { ElsFilters } from "./filters";
import { ElForm } from "./el-form";
import { ExtractButton } from "./extract-button";
import { DescribeButton } from "./describe-button";
import { BatchDescribeButton } from "./batch-describe-button";

const STATUS_META: Record<
  ElStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" }
> = {
  ATIVO: { label: "Ativo", variant: "success" },
  EXPERIMENTAL: { label: "Experimental", variant: "warning" },
  DEPRECADO: { label: "Deprecado", variant: "destructive" },
};

const CATEGORY_LABEL: Record<ElCategory, string> = {
  ASSINATURA: "Assinatura",
  TAREFA: "Tarefa",
  DECISAO: "Decisão",
  DADO: "Dado",
  OUTRO: "Outro",
};

export default async function ElsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = {
    status: params.status as ElStatus | undefined,
    category: params.category as ElCategory | undefined,
    q: params.q,
  };

  const [els, metrics] = await Promise.all([listEls(filter, 200), getElMetrics()]);
  const pendingDescribeIds = els
    .filter((e) => !e.objective || e.objective.trim() === "")
    .map((e) => e.id);

  return (
    <>
      <PageHeader
        title="Catálogo de ELs"
        description="Catálogo de Expression Languages usadas nos fluxos jPDL/BPMN do PJe. Documenta semântica de cada #{...} para reuso, evitar duplicação e marcar deprecações."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExtractButton />
            {pendingDescribeIds.length > 0 ? (
              <BatchDescribeButton pendingIds={pendingDescribeIds} />
            ) : null}
            <ElForm />
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<BookText className="h-4 w-4" />}
          label="Total cadastradas"
          value={metrics.total.toLocaleString("pt-BR")}
          hint={`${metrics.byStatus.ATIVO} ativas`}
        />
        <MetricCard
          icon={<AlertCircle className="h-4 w-4 text-warning" />}
          label="Sem descrição"
          value={metrics.withoutObjective.toLocaleString("pt-BR")}
          hint="Aguardando preenchimento de objetivo"
        />
        <MetricCard
          icon={<FlaskConical className="h-4 w-4 text-info" />}
          label="Experimentais"
          value={metrics.byStatus.EXPERIMENTAL.toLocaleString("pt-BR")}
          hint="Em validação, evitar em produção"
        />
        <MetricCard
          icon={<Archive className="h-4 w-4 text-destructive" />}
          label="Deprecadas"
          value={metrics.byStatus.DEPRECADO.toLocaleString("pt-BR")}
          hint="Não usar em novos fluxos"
        />
      </section>

      <Card>
        <CardContent className="p-5">
          <ElsFilters />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {els.length === 0 ? (
            <div className="space-y-2 py-12 text-center text-sm text-muted-foreground">
              <p>Nenhuma EL cadastrada ainda.</p>
              <p className="text-xs">
                Use <strong>Extrair de fluxos</strong> para popular automaticamente
                a partir dos 212 XMLs em R2, ou <strong>Nova EL</strong> para cadastrar manualmente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Objetivo</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium">Tags</th>
                    <th className="px-3 py-2 text-right font-medium">Ocorrências</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {els.map((el) => {
                    const status = STATUS_META[el.status];
                    return (
                      <tr key={el.id} className="border-b align-top hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <Link
                            href={`/catalogos/els/${el.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {el.code}
                          </Link>
                        </td>
                        <td className="max-w-md px-3 py-2 text-xs text-muted-foreground">
                          {el.objective ? (
                            <span className="line-clamp-2">{el.objective}</span>
                          ) : (
                            <span className="italic opacity-60">sem descrição</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {el.category ? CATEGORY_LABEL[el.category] : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {el.tags.length === 0 ? (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {el.tags.slice(0, 4).map((t) => (
                                <Badge
                                  key={t}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {t}
                                </Badge>
                              ))}
                              {el.tags.length > 4 ? (
                                <span className="text-[10px] text-muted-foreground">
                                  +{el.tags.length - 4}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {el.occurrenceCount > 0 ? (
                            <span className="font-medium">{el.occurrenceCount}</span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={status.variant} className="text-[10px]">
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {el.objective ? (
                            <span className="text-[10px] text-muted-foreground">
                              descrita
                            </span>
                          ) : (
                            <DescribeButton elId={el.id} size="sm" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
