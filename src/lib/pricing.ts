// Rough OpenRouter list prices in $ / 1M total tokens. The cost meter doesn't
// distinguish prompt vs completion so we use a flat blended estimate. Update
// from openrouter.ai/models when prices shift.

const PRICE_PER_M_TOKENS: Record<string, number> = {
  'openai/gpt-5.5':                 18,
  'openai/gpt-5.4':                 12,
  'anthropic/claude-opus-4.7':      30,
  'anthropic/claude-sonnet-4.6':     6,
  'google/gemini-3.5-flash':         0.6,
  'google/gemini-3-flash-preview':   0.4,
  'google/gemini-3.1-pro-preview':   8,
  'google/gemini-3.1-flash-lite':    0.15,
  'qwen/qwen3.7-max':                7,
  'qwen/qwen3.6-plus':               2,
  'moonshotai/kimi-k2.6':            2,
  'moonshotai/kimi-k2.5':            1,
  'xiaomi/mimo-v2.5-pro':            3,
  'xiaomi/mimo-v2.5':                1,
  'x-ai/grok-4.3':                  10,
  'x-ai/grok-build-0.1':             4,
  'z-ai/glm-5.1':                    1,
  'deepseek/deepseek-v4-pro':        3,
  'deepseek/deepseek-v4-flash':      0.3,
  'openrouter/owl-alpha':            0,
};

export function estimateCost(usageByModel: Record<string, number>): number {
  let total = 0;
  for (const [model, tokens] of Object.entries(usageByModel || {})) {
    const price = PRICE_PER_M_TOKENS[model] ?? 5; // unknown → $5/M average
    total += (tokens / 1_000_000) * price;
  }
  return total;
}

export function formatCost(usd: number): string {
  if (usd <= 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1)    return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
