/**
 * AAA - Cost and Usage Management for Multi-Provider AI Scoring
 * Tracks tokens, calls, and estimated USD expenditure across Gemini, OpenAI, and Groq.
 */

export type AIProviderName = "gemini" | "openai" | "groq";

export type ProviderUsageStats = {
  callsCount: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastCallTimestamp?: string;
};

export type AiUsageSummary = {
  totalCalls: number;
  totalCostUsd: number;
  monthlyBudgetUsd: number;
  isBudgetExceeded: boolean;
  providers: Record<AIProviderName, ProviderUsageStats>;
};

// In-memory usage store (persists for server lifecycle)
const usageStore: Record<AIProviderName, ProviderUsageStats> = {
  gemini: {
    callsCount: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  },
  openai: {
    callsCount: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  },
  groq: {
    callsCount: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  },
};

/**
 * Standard public cost rates per 1,000,000 tokens / second
 */
const PRICING_RATES: Record<
  AIProviderName,
  { inputPerMillion: number; outputPerMillion: number; audioPerSecond?: number }
> = {
  gemini: {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    audioPerSecond: 0.00002, // ~$0.0012 per minute
  },
  openai: {
    inputPerMillion: 0.15, // gpt-4o-mini
    outputPerMillion: 0.6,
    audioPerSecond: 0.0001,
  },
  groq: {
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
  },
};

export function getMonthlyBudgetUsd(): number {
  const envBudget = process.env.AI_MONTHLY_BUDGET_USD;
  if (envBudget) {
    const parsed = Number(envBudget);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 50.0; // Default $50.00 safety limit
}

/**
 * Calculates estimated USD cost for an evaluation call
 */
export function estimateCost(
  provider: AIProviderName,
  inputTokens: number,
  outputTokens: number,
  audioSeconds = 0,
): number {
  const rates = PRICING_RATES[provider] || PRICING_RATES.gemini;
  const inputCost = (inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPerMillion;
  const audioCost = audioSeconds * (rates.audioPerSecond || 0);

  const total = inputCost + outputCost + audioCost;
  return Math.round(total * 1_000_000) / 1_000_000;
}

/**
 * Records usage metrics after each provider call
 */
export function recordAiUsage(
  provider: AIProviderName,
  options: {
    success: boolean;
    inputTokens?: number;
    outputTokens?: number;
    audioSeconds?: number;
  },
): { costUsd: number; totalCostUsd: number; isBudgetExceeded: boolean } {
  const stats = usageStore[provider] || usageStore.gemini;
  stats.callsCount += 1;
  stats.lastCallTimestamp = new Date().toISOString();

  if (options.success) {
    stats.successfulCalls += 1;
  } else {
    stats.failedCalls += 1;
  }

  const inTok = options.inputTokens || 0;
  const outTok = options.outputTokens || 0;
  const tokens = inTok + outTok;
  stats.totalTokens += tokens;

  const cost = estimateCost(provider, inTok, outTok, options.audioSeconds || 0);
  stats.estimatedCostUsd += cost;

  const totalCostUsd = Object.values(usageStore).reduce(
    (sum, p) => sum + p.estimatedCostUsd,
    0,
  );
  const isBudgetExceeded = totalCostUsd >= getMonthlyBudgetUsd();

  if (isBudgetExceeded) {
    console.warn(
      `[AI Cost Tracker] Monthly AI budget reached: $${totalCostUsd.toFixed(4)} / $${getMonthlyBudgetUsd().toFixed(2)}`,
    );
  }

  return {
    costUsd: cost,
    totalCostUsd,
    isBudgetExceeded,
  };
}

/**
 * Returns current usage report across all providers
 */
export function getAiUsageSummary(): AiUsageSummary {
  const totalCalls = Object.values(usageStore).reduce(
    (sum, p) => sum + p.callsCount,
    0,
  );
  const totalCostUsd = Object.values(usageStore).reduce(
    (sum, p) => sum + p.estimatedCostUsd,
    0,
  );
  const monthlyBudgetUsd = getMonthlyBudgetUsd();

  return {
    totalCalls,
    totalCostUsd: Math.round(totalCostUsd * 10_000) / 10_000,
    monthlyBudgetUsd,
    isBudgetExceeded: totalCostUsd >= monthlyBudgetUsd,
    providers: { ...usageStore },
  };
}

export function isBudgetExceeded(): boolean {
  const totalCostUsd = Object.values(usageStore).reduce(
    (sum, p) => sum + p.estimatedCostUsd,
    0,
  );
  return totalCostUsd >= getMonthlyBudgetUsd();
}

/**
 * Reset function used by unit tests
 */
export function resetAiUsage(): void {
  for (const key of Object.keys(usageStore) as AIProviderName[]) {
    usageStore[key] = {
      callsCount: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
  }
}

