"use client";

import { useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Send, Sparkles, StopCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Citation = {
  flowSourceId: string;
  fileName: string;
  processName: string;
};

export function ChatRunner() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
    setMessages,
  } = useChat({
    api: "/api/agents/flow-consultant",
    onError: (err) => {
      toast.error(err.message || "Falha ao consultar");
    },
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit();
      }
    }
  }

  function onClear() {
    setMessages([]);
  }

  return (
    <Card>
      <CardContent className="flex h-[70vh] flex-col gap-3 p-0">
        <div
          ref={scrollerRef}
          className="flex-1 space-y-4 overflow-y-auto p-5"
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        {error ? (
          <p className="px-5 text-sm text-destructive">{error.message}</p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t bg-muted/30 p-3"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            disabled={isLoading}
            placeholder="Pergunte sobre os fluxos PJe… (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            className="resize-none"
          />
          {isLoading ? (
            <Button type="button" variant="outline" onClick={() => stop()}>
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
          {messages.length > 0 && !isLoading ? (
            <Button type="button" variant="ghost" onClick={onClear}>
              Limpar
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground">
        Pergunte sobre comportamento, transições, EL ou estrutura de qualquer
        fluxo PJe indexado.
      </p>
      <div className="grid w-full max-w-md gap-2 text-xs text-muted-foreground">
        <Hint label="Como o fluxo de RPV trata o desvio?" />
        <Hint label="Quais ELs são usadas no SACI?" />
        <Hint label="Quais fluxos têm decisão por #{taskInstanceUtil}?" />
      </div>
    </div>
  );
}

function Hint({ label }: { label: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-left">
      <span className="font-mono">{label}</span>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: { id: string; role: string; content: string };
}) {
  const isUser = message.role === "user";
  const citations = extractCitations(message.content);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] space-y-2 rounded-lg px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-background"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        {!isUser && citations.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-t pt-2">
            {citations.map((c, i) => (
              <Badge key={i} variant="outline" className="gap-1 text-[10px]">
                <FileText className="h-3 w-3" />
                {c}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Procura citações no formato [FILENAME.xml] dentro do texto.
 */
function extractCitations(text: string): string[] {
  const found = new Set<string>();
  const re = /\[([A-Za-z0-9_\-.[\] ]+\.xml)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found.add(m[1].trim());
  }
  return Array.from(found);
}
