"use client";

import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintTriggerProps = {
  href: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
};

/**
 * Botão "Baixar PDF" — abre uma rota /print/* numa nova aba.
 * A rota é uma página print-friendly que dispara `window.print()`
 * automaticamente; o usuário escolhe "Microsoft Print to PDF"
 * (ou similar) na janela do navegador.
 */
export function PrintTrigger({
  href,
  label = "Baixar PDF",
  variant = "outline",
  size = "sm",
}: PrintTriggerProps) {
  return (
    <Button asChild variant={variant} size={size}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Download className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

/**
 * Componente client para incluir em pages /print/* — dispara
 * window.print() automaticamente assim que a página termina de carregar.
 * Botões extras para reimprimir e voltar.
 */
export function AutoPrintBar({ printDelayMs = 400 }: { printDelayMs?: number }) {
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (printed) return;
    const t = setTimeout(() => {
      window.print();
      setPrinted(true);
    }, printDelayMs);
    return () => clearTimeout(t);
  }, [printDelayMs, printed]);

  return (
    <div
      data-print="hide"
      className="fixed right-4 top-4 z-50 flex gap-2 rounded-md border bg-card p-2 shadow-md"
    >
      <Button size="sm" variant="default" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Imprimir / PDF
      </Button>
      <Button size="sm" variant="ghost" onClick={() => window.close()}>
        Fechar
      </Button>
    </div>
  );
}
