"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Search, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  applyMojibakeFixesAction,
  previewMojibakeFixesAction,
  type MojibakeFix,
} from "./actions";

export function MojibakeRunner() {
  const router = useRouter();
  const [scanning, startScan] = useTransition();
  const [applying, startApply] = useTransition();
  const [total, setTotal] = useState<number | null>(null);
  const [fixes, setFixes] = useState<MojibakeFix[]>([]);
  const [scanned, setScanned] = useState(false);

  function onScan() {
    startScan(async () => {
      const result = await previewMojibakeFixesAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTotal(result.data.total);
      setFixes(result.data.fixes);
      setScanned(true);
      if (result.data.fixes.length === 0) {
        toast.success("Nada a corrigir — dados limpos.");
      } else {
        toast.info(`${result.data.fixes.length} correção(ões) propostas`);
      }
    });
  }

  function onApply() {
    if (
      !confirm(
        `Aplicar ${fixes.length} correção(ões) em flow_source? Os valores corrompidos serão sobrescritos. (Os XMLs em R2 e os embeddings em Vectorize não mudam.)`
      )
    ) {
      return;
    }
    startApply(async () => {
      const result = await applyMojibakeFixesAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${result.data.updated} valor(es) corrigido(s) em ${result.data.rowsTouched} fluxo(s)`
      );
      setFixes([]);
      setScanned(false);
      router.refresh();
    });
  }

  const byRow = new Map<string, MojibakeFix[]>();
  for (const f of fixes) {
    if (!byRow.has(f.id)) byRow.set(f.id, []);
    byRow.get(f.id)!.push(f);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onScan} disabled={scanning || applying}>
          <Search className={scanning ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          {scanning ? "Escaneando…" : "Escanear flow_source"}
        </Button>
        {fixes.length > 0 ? (
          <Button
            variant="default"
            onClick={onApply}
            disabled={applying || scanning}
          >
            <Wand2 className={applying ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {applying
              ? `Aplicando…`
              : `Aplicar ${fixes.length} correção(ões)`}
          </Button>
        ) : null}
      </div>

      {scanned && total !== null ? (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p>
              <strong>{total}</strong> registros varridos em <code>flow_source</code>.
            </p>
            <p>
              <strong>{fixes.length}</strong> com padrão de mojibake detectado.
            </p>
            {fixes.length === 0 ? (
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                Nada a fazer.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {byRow.size > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              Preview das correções
            </div>
            <ul className="divide-y text-sm">
              {[...byRow.entries()].map(([id, rowFixes]) => (
                <li key={id} className="space-y-2 px-4 py-3">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {id.slice(0, 8)}…
                  </p>
                  {rowFixes.map((f) => (
                    <div key={`${id}-${f.field}`} className="space-y-1">
                      <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {f.field}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="break-all rounded bg-destructive/10 px-2 py-1 font-mono text-destructive">
                          {f.current}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="break-all rounded bg-success/10 px-2 py-1 font-mono text-success">
                          {f.fixed}
                        </span>
                      </div>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
