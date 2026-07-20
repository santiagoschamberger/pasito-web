export class EmailDeliveryError extends Error {
  readonly attempts: number

  constructor(attempts: number, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(`No se pudo enviar el email después de ${attempts} intentos: ${detail}`)
    this.name = 'EmailDeliveryError'
    this.attempts = attempts
  }
}

type RetryEmailOptions = {
  maxAttempts?: number
  delaysMs?: number[]
  wait?: (milliseconds: number) => Promise<void>
}

export async function retryEmailDelivery<T>(
  operation: () => Promise<T>,
  options: RetryEmailOptions = {},
): Promise<{ value: T; attempts: number }> {
  const maxAttempts = options.maxAttempts ?? 3
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts debe ser un entero mayor a cero.')
  }

  const delaysMs = options.delaysMs ?? [250, 1_000]
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  }))
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return { value: await operation(), attempts: attempt }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts) break
      const delay = delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 0
      if (delay > 0) await wait(delay)
    }
  }

  throw new EmailDeliveryError(maxAttempts, lastError)
}

export function emailDeliveryErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 1_000)
}
