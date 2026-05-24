import { Logo } from "@/components/logo";

type PrintHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
};

/**
 * Cabeçalho padrão das páginas de impressão (/print/*).
 * Coloca a logo à esquerda e o título/meta à direita. Sempre visível
 * em impressão (não tem data-print="hide").
 */
export function PrintHeader({ title, subtitle, meta }: PrintHeaderProps) {
  return (
    <header className="print-section mb-6 flex items-start justify-between gap-4 border-b border-primary/30 pb-4">
      <div>
        <Logo variant="full" height={48} />
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          5ª Região da Justiça Federal — TRF5 e Seções Vinculadas
        </p>
      </div>
      <div className="text-right">
        <h1 className="text-xl font-semibold text-primary leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta && meta.length > 0 ? (
          <dl className="mt-2 space-y-0.5 text-xs">
            {meta.map((m) => (
              <div key={m.label} className="flex justify-end gap-2">
                <dt className="font-medium text-muted-foreground">{m.label}:</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}

export function PrintFooter() {
  const now = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date());
  return (
    <footer className="mt-12 border-t pt-3 text-[10px] text-muted-foreground">
      Documento emitido em {now} pelo Laboratório de Fluxos —{" "}
      <span className="font-mono">labdefluxos.com.br</span>
    </footer>
  );
}
