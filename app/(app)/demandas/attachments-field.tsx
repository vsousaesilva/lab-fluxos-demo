"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { File as FileIcon, Image as ImageIcon, FileText, X, Paperclip, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DemandAttachment } from "@/lib/db/schema";
import {
  ACCEPT_ATTR,
  ATTACHMENT_LIMITS,
  classifyMime,
  formatBytes,
} from "@/lib/attachments/config";
import { deleteAttachmentAction, listAttachmentsAction } from "@/lib/attachments/actions";

type Props = {
  /** Demanda existente (modo edição). Em modo cadastro novo, undefined. */
  demandId?: string;
  /** Arquivos pendentes (escolhidos mas ainda não enviados). Pra demandas novas, sobem após o submit. */
  pending: File[];
  onPendingChange: (files: File[]) => void;
};

function FileIconFor({ mime }: { mime: string }) {
  const cat = classifyMime(mime);
  const cls = "h-4 w-4 shrink-0";
  if (cat === "image") return <ImageIcon className={cn(cls, "text-info")} />;
  if (cat === "pdf") return <FileText className={cn(cls, "text-destructive")} />;
  if (cat === "text") return <FileText className={cn(cls, "text-muted-foreground")} />;
  if (cat === "office") return <Sheet className={cn(cls, "text-success")} />;
  return <FileIcon className={cls} />;
}

export function AttachmentsField({ demandId, pending, onPendingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [existing, setExisting] = useState<DemandAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Carrega anexos já salvos quando há demandId (modo edição)
  useEffect(() => {
    if (!demandId) {
      setExisting([]);
      return;
    }
    let cancelled = false;
    setLoadingExisting(true);
    listAttachmentsAction(demandId)
      .then((rows) => {
        if (!cancelled) setExisting(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demandId]);

  const totalFiles = existing.length + pending.length;
  const totalBytes =
    existing.reduce((s, a) => s + a.size, 0) +
    pending.reduce((s, f) => s + f.size, 0);
  const slotsLeft = Math.max(0, ATTACHMENT_LIMITS.maxFilesPerDemand - totalFiles);
  const bytesLeft = Math.max(0, ATTACHMENT_LIMITS.maxTotalBytes - totalBytes);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const errors: string[] = [];
    const accepted: File[] = [];
    let runningSize = totalBytes;

    for (const f of incoming) {
      if (totalFiles + accepted.length >= ATTACHMENT_LIMITS.maxFilesPerDemand) {
        errors.push(
          `Máximo de ${ATTACHMENT_LIMITS.maxFilesPerDemand} arquivos por demanda.`
        );
        break;
      }
      if (classifyMime(f.type) === "unknown") {
        errors.push(`"${f.name}" — tipo ${f.type || "desconhecido"} não suportado.`);
        continue;
      }
      if (f.size > ATTACHMENT_LIMITS.maxFileBytes) {
        errors.push(
          `"${f.name}" — ${formatBytes(f.size)} excede o limite de ${formatBytes(ATTACHMENT_LIMITS.maxFileBytes)} por arquivo.`
        );
        continue;
      }
      if (runningSize + f.size > ATTACHMENT_LIMITS.maxTotalBytes) {
        errors.push(
          `"${f.name}" — soma total estouraria ${formatBytes(ATTACHMENT_LIMITS.maxTotalBytes)}.`
        );
        continue;
      }
      accepted.push(f);
      runningSize += f.size;
    }

    if (errors.length > 0) {
      for (const e of errors.slice(0, 3)) toast.error(e);
    }
    if (accepted.length > 0) {
      onPendingChange([...pending, ...accepted]);
    }
  }

  function removePending(idx: number) {
    onPendingChange(pending.filter((_, i) => i !== idx));
  }

  function removeExisting(id: string) {
    if (!confirm("Excluir este anexo?")) return;
    startDelete(async () => {
      const result = await deleteAttachmentAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setExisting((prev) => prev.filter((a) => a.id !== id));
      toast.success("Anexo removido");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Anexos</span>
        <span className="text-[10px] text-muted-foreground">
          {totalFiles}/{ATTACHMENT_LIMITS.maxFilesPerDemand} arquivos ·{" "}
          {formatBytes(totalBytes)} / {formatBytes(ATTACHMENT_LIMITS.maxTotalBytes)}
        </span>
      </div>

      <div
        className={cn(
          "rounded-md border-2 border-dashed px-3 py-4 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/40"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            // permite re-selecionar o mesmo arquivo
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={slotsLeft === 0}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar arquivo
        </Button>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          ou arraste e solte · Imagens, PDF, TXT/MD/CSV, XLSX/DOCX · até{" "}
          {formatBytes(ATTACHMENT_LIMITS.maxFileBytes)} cada
        </p>
      </div>

      {(existing.length > 0 || pending.length > 0 || loadingExisting) && (
        <ul className="space-y-1">
          {loadingExisting && existing.length === 0 ? (
            <li className="text-[11px] text-muted-foreground">
              Carregando anexos…
            </li>
          ) : null}

          {existing.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5"
            >
              <a
                href={`/api/demand-attachments/${a.id}/download`}
                target="_blank"
                rel="noopener"
                className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
              >
                <FileIconFor mime={a.mimeType} />
                <span className="truncate text-xs">{a.fileName}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatBytes(a.size)}
                </span>
              </a>
              <button
                type="button"
                onClick={() => removeExisting(a.id)}
                disabled={deleting}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}

          {pending.map((f, i) => (
            <li
              key={`pending-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/5 px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FileIconFor mime={f.type} />
                <span className="truncate text-xs">{f.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatBytes(f.size)} · pendente
                </span>
              </div>
              <button
                type="button"
                onClick={() => removePending(i)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover pendente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {slotsLeft === 0 ? (
        <p className="text-[10px] text-warning">
          Limite máximo de arquivos atingido.
        </p>
      ) : null}
      {bytesLeft === 0 && totalBytes > 0 ? (
        <p className="text-[10px] text-warning">
          Espaço total esgotado. Remova algum arquivo pra anexar outro.
        </p>
      ) : null}
    </div>
  );
}
