import Link from "next/link";
import { BookText, AlertCircle, CheckCircle2, FlaskConical, Archive } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ElCategory, ElStatus } from "@/lib/db/schema";
import { getElMetrics, listEls, listElIdsWithoutObjective } from "./actions";
import { ElsFilters } from "./filters";
import { ElForm } from "./el-form";
import { ExtractButton } from "./extract-button";
import { DescribeButton } from "./describe-button";
import { BatchDescribeButton } from "./batch-describe-button";
import { Pagination } from "./pagination";

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
  searchParams: Promise<{
    status?: string;
    category?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const filter = {
    status: params.status as ElStatus | undefined,
    category: params.category as ElCategory | undefined,
    q: params.q,
  };
  const pageNum = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  // `listEls` agora retorna paginado; `listElIdsWithoutObjective` traz todos
  // os IDs pendentes (não só da página) pra alimentar o batch describe.
  const [pageResult, metrics, pendingDescribeIds] = await Promise.all([
    listEls(filter, pageNum),
    getElMetrics(),
    listElIdsWithoutObjective(filter),
  ]);
  const { rows: els, total, totalPages, page, pageSize } = pageResult;

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
            <ul className="divide-y">
              {els.map((el) => {
                const status = STATUS_META[el.status];
                const hasObjective = Boolean(el.objective?.trim());
                return (
                  <li
                    key={el.id}
                    className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {/* linha 1: código + badges inline */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/catalogos/els/${el.id}`}
                          className="break-all font-mono text-xs font-medium text-primary hover:underline"
                          title={el.code}
                        >
                          {el.code}
                        </Link>
                        {el.category ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {CATEGORY_LABEL[el.category]}
                          </Badge>
                        ) : null}
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.label}
                        </Badge>
                        {el.tags.length > 0
                          ? el.tags.slice(0, 3).map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {t}
                              </Badge>
                            ))
                          : null}
                        {el.tags.length > 3 ? (
                          <span className="text-[10px] text-muted-foreground">
                            +{el.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
                      {/* linha 2: objetivo (1 linha, truncado) */}
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {hasObjective ? (
                          el.objective
                        ) : (
                          <span className="italic opacity-60">
                            sem descrição
                          </span>
                        )}
                      </p>
                    </div>
                    {/* coluna direita: ocorrências + ações */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className="text-xs tabular-nums text-muted-foreground"
                        title="Ocorrências nos fluxos"
                      >
                        {el.occurrenceCount > 0
                          ? `${el.occurrenceCount}×`
                          : "—"}
                      </span>
                      {hasObjective ? null : (
                        <DescribeButton elId={el.id} size="sm" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {els.length > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              searchParams={params}
            />
          ) : null}
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
