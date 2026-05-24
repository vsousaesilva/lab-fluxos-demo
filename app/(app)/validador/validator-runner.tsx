"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Info,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateFlow } from "@/lib/validator";
import type { Finding, Severity, ValidationOutcome } from "@/lib/validator";

/**
 * Lê o encoding declarado no header XML (<?xml ... encoding="..." ?>)
 * e decodifica o buffer com o encoding correto. Aceita ISO-8859-1
 * (Latin-1, padrão do PJe jPDL), Windows-1252 e UTF-8 (default).
 */
function decodeXmlBuffer(buf: ArrayBuffer): string {
  const head = new TextDecoder("ascii", { fatal: false }).decode(
    buf.slice(0, 200)
  );
  const match = head.match(/encoding\s*=\s*["']([^"']+)["']/i);
  const declared = (match?.[1] ?? "utf-8").toLowerCase();

  let encoding = "utf-8";
  if (
    declared === "iso-8859-1" ||
    declared === "iso8859-1" ||
    declared === "latin1"
  ) {
    encoding = "iso-8859-1";
  } else if (declared === "windows-1252" || declared === "cp1252") {
    encoding = "windows-1252";
  }

  try {
    return new TextDecoder(encoding).decode(buf);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

const SEVERITY_META: Record<
  Severity,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeVariant: "destructive" | "warning" | "secondary";
    rowClass: string;
  }
> = {
  ERROR: {
    label: "Erro",
    icon: XCircle,
    badgeVariant: "destructive",
    rowClass: "border-destructive/30 bg-destructive/5",
  },
  WARNING: {
    label: "Aviso",
    icon: AlertTriangle,
    badgeVariant: "warning",
    rowClass: "border-warning/30 bg-warning/5",
  },
  INFO: {
    label: "Info",
    icon: Info,
    badgeVariant: "secondary",
    rowClass: "border-muted bg-muted/30",
  },
};

export function ValidatorRunner() {
  const [xml, setXml] = useState("");
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function onValidate() {
    if (!xml.trim()) {
      setOutcome(null);
      return;
    }
    const result = validateFlow(xml);
    setOutcome(result);
  }

  function onClear() {
    setXml("");
    setOutcome(null);
    setFileName(null);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    setXml(decodeXmlBuffer(buf));
    e.target.value = "";
  }

  function onFixEncoding() {
    // Reverte mojibake comum (bytes ISO-8859-1 lidos como UTF-8):
    // re-encode a string atual como Latin-1 e re-decodifica como UTF-8.
    if (!xml) return;
    const bytes = new Uint8Array(xml.length);
    for (let i = 0; i < xml.length; i++) {
      bytes[i] = xml.charCodeAt(i) & 0xff;
    }
    try {
      const fixed = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      setXml(fixed);
    } catch {
      // não era mojibake reversível
    }
  }

  const hasMojibake = /Ã[-¿]|Â[-¿]/.test(xml);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 className="h-4 w-4 text-primary" />
            XML do fluxo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept=".xml,application/xml,text/xml"
                onChange={onFileChange}
                className="hidden"
              />
              <Button asChild variant="outline" size="sm">
                <span>
                  <Upload className="h-4 w-4" />
                  Carregar arquivo
                </span>
              </Button>
            </label>
            {fileName ? (
              <span className="text-xs text-muted-foreground">
                {fileName}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {xml.length.toLocaleString("pt-BR")} caracteres
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="xml" className="sr-only">
              XML
            </Label>
            <Textarea
              id="xml"
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              rows={14}
              placeholder="Cole aqui o XML jPDL 3.2 (<process-definition ...>) ou BPMN 2.0 (<definitions ...>)"
              className="font-mono text-xs"
            />
          </div>

          {hasMojibake ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-medium">Encoding aparentemente quebrado</p>
              <p className="text-muted-foreground">
                O XML contém sequências como &quot;AnÃ¡lise&quot; (UTF-8 lido como
                Latin-1). Clique abaixo para corrigir.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={onFixEncoding}
              >
                Corrigir encoding
              </Button>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button onClick={onValidate} disabled={!xml.trim()}>
              <CheckCircle2 className="h-4 w-4" />
              Validar
            </Button>
            <Button variant="ghost" onClick={onClear} disabled={!xml && !outcome}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {outcome ? <OutcomeView outcome={outcome} /> : null}
    </div>
  );
}

function OutcomeView({ outcome }: { outcome: ValidationOutcome }) {
  const groups: Record<Severity, Finding[]> = {
    ERROR: [],
    WARNING: [],
    INFO: [],
  };
  for (const f of outcome.findings) groups[f.severity].push(f);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {outcome.passed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span>
            {outcome.passed
              ? "Validação aprovada"
              : "Validação com erros"}
          </span>
          {outcome.dialect ? (
            <Badge variant="outline">{outcome.dialect}</Badge>
          ) : null}
          {outcome.processName ? (
            <span className="text-sm font-normal text-muted-foreground">
              · {outcome.processName}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="destructive">
            {outcome.errorCount} erro(s)
          </Badge>
          <Badge variant="warning">
            {outcome.warningCount} aviso(s)
          </Badge>
          <Badge variant="secondary">{outcome.infoCount} info</Badge>
        </div>

        {outcome.findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum finding. O fluxo passou em todas as regras.
          </p>
        ) : (
          (["ERROR", "WARNING", "INFO"] as Severity[]).map((sev) =>
            groups[sev].length === 0 ? null : (
              <FindingsGroup key={sev} severity={sev} findings={groups[sev]} />
            )
          )
        )}
      </CardContent>
    </Card>
  );
}

function FindingsGroup({
  severity,
  findings,
}: {
  severity: Severity;
  findings: Finding[];
}) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <Icon className="h-4 w-4" />
        {meta.label} ({findings.length})
      </h4>
      <ul className="space-y-2">
        {findings.map((f, i) => (
          <li
            key={i}
            className={`rounded border p-3 text-sm ${meta.rowClass}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.badgeVariant} className="font-mono text-[10px]">
                {f.ruleCode}
              </Badge>
              <span>{f.message}</span>
            </div>
            {f.location ? (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {f.location}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
