export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    // Network errors, timeouts, and 5xx errors are retryable
    return (
      error.statusCode !== undefined &&
      error.statusCode >= 500 &&
      error.statusCode < 600
    )
  }

  if (error instanceof Error) {
    // Network errors are typically retryable
    return (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch')
    )
  }

  return false
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)))
    }
  }

  throw lastError
}



















