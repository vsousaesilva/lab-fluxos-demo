/**
 * Tabela de preços Gemini (estimativa em USD por 1M tokens).
 *
 * ⚠️ Valores aproximados — confirme em
 * https://ai.google.dev/pricing antes de usar pra cobrança real.
 * Quando o modelo não está mapeado, retorna custo 0.
 */
const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gemini-3-flash-preview": { inputPerM: 0.1, outputPerM: 0.4 },
  "gemini-3.5-flash": { inputPerM: 0.1, outputPerM: 0.4 },
  "gemini-3.1-flash-lite": { inputPerM: 0.05, outputPerM: 0.2 },
  "gemini-3.1-pro-preview": { inputPerM: 1.25, outputPerM: 5.0 },
  // Legados (mantidos pra histórico)
  "gemini-2.5-flash": { inputPerM: 0.1, outputPerM: 0.4 },
  "gemini-2.5-pro": { inputPerM: 1.25, outputPerM: 5.0 },
  "gemini-2.0-flash": { inputPerM: 0.075, outputPerM: 0.3 },
  // Embedding
  "gemini-embedding-001": { inputPerM: 0.025, outputPerM: 0 },
  "text-embedding-004": { inputPerM: 0.0125, outputPerM: 0 },
};

export type CostBreakdown = {
  /** USD com 6 casas */
  totalUsd: number;
  inputUsd: number;
  outputUsd: number;
  hasPricing: boolean;
};

export function estimateCost(
  model: string | null | undefined,
  promptTokens: number,
  completionTokens: number
): CostBreakdown {
  if (!model || !PRICING[model]) {
    return { totalUsd: 0, inputUsd: 0, outputUsd: 0, hasPricing: false };
  }
  const p = PRICING[model];
  const inputUsd = (promptTokens / 1_000_000) * p.inputPerM;
  const outputUsd = (completionTokens / 1_000_000) * p.outputPerM;
  return {
    totalUsd: inputUsd + outputUsd,
    inputUsd,
    outputUsd,
    hasPricing: true,
  };
}

export function formatUsd(value: number): string {
  if (value === 0) return "—";
  if (value < 0.0001) return "< $0.0001";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(4)}`;
}

/**
 * Taxa de conversão USD → BRL aproximada.
 * Atualize manualmente quando o câmbio variar muito.
 */
export const USD_TO_BRL_RATE = 5.5;

export function convertUsdToBrl(usd: number): number {
  return usd * USD_TO_BRL_RATE;
}

export function formatBrl(usdValue: number): string {
  if (usdValue === 0) return "—";
  const brl = convertUsdToBrl(usdValue);
  if (brl < 0.001) return "< R$ 0,001";
  const fractionDigits = brl < 0.01 ? 4 : brl < 1 ? 3 : 2;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(brl);
}
