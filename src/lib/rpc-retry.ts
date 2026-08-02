import 'server-only'

const DEFAULT_ATTEMPTS = 3
const DEFAULT_DELAY_MS = 1000

/**
 * Retries a transient-failure-prone RPC call (public free endpoints drop
 * requests/time out far more often than paid infra) with linear backoff.
 * Only meant for read/broadcast calls that are safe to retry — never wrap a
 * call whose side effect (e.g. sendTransaction) could have already landed on
 * a prior attempt without a way to detect that.
 */
export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  attempts: number = DEFAULT_ATTEMPTS,
  delayMs: number = DEFAULT_DELAY_MS,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
  }
  throw lastError
}
