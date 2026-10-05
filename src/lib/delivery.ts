// Best-effort delivery with retry: a booking is NEVER lost because email or Google had a hiccup.
// The booking is saved first; these steps are retried, and failures are recorded (and alerted by HQ).

export type DeliveryResult = { ok: boolean; attempts: number; error?: string };

export async function withRetry(
  step: () => Promise<boolean>,
  opts: { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<DeliveryResult> {
  const attempts = opts.attempts ?? 3;
  const delayMs = opts.delayMs ?? 800;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastError: string | undefined;
  for (let i = 1; i <= attempts; i++) {
    try {
      if (await step()) return { ok: true, attempts: i };
      lastError = "step reported failure";
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (i < attempts) await sleep(delayMs * i);
  }
  return { ok: false, attempts, error: lastError?.slice(0, 300) };
}
