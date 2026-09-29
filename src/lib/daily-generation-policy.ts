/** GlobeQ cost policy. Model changes require code review, not an environment override. */
export const DAILY_POLICY = Object.freeze({
  revision: 'luna-reviewed-20260929-v1',
  model: 'gpt-6-luna',
  maxToolCalls: 8,
  maxOutputTokens: 16000,
  timeoutMs: 180000,
  automaticFallback: false,
  automaticRetry: false,
});

export function dailyGenerationPaused(): boolean {
  return process.env.GLOBEQ_DAILY_GENERATION_PAUSED === '1';
}

/** Only bounded numerical usage is logged. No provider text, source contents or credentials. */
export function dailyUsage(body: any) {
  const count = (v: unknown): number | null => Number.isSafeInteger(v) && Number(v) >= 0 ? Number(v) : null;
  const output = Array.isArray(body?.output) ? body.output : [];
  return {
    model: DAILY_POLICY.model,
    inputTokens: count(body?.usage?.input_tokens),
    outputTokens: count(body?.usage?.output_tokens),
    cachedTokens: count(body?.usage?.input_tokens_details?.cached_tokens),
    cacheWriteTokens: count(body?.usage?.input_tokens_details?.cache_write_tokens),
    webToolCalls: output.filter((x: any) => x?.type === 'web_search_call').length,
    searchActions: output.filter((x: any) => x?.type === 'web_search_call' && x?.action?.type === 'search').length,
  };
}
