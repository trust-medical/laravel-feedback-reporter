export class FeedbackReporterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeedbackReporterError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AvailabilityError extends FeedbackReporterError {
  constructor(
    message: string = 'Feedback reporter is currently unavailable.',
    public readonly statusCode: number = 404,
  ) {
    super(message)
    this.name = 'AvailabilityError'
  }
}

export class AttachmentValidationError extends FeedbackReporterError {
  constructor(message: string) {
    super(message)
    this.name = 'AttachmentValidationError'
  }
}

export class TransportError extends FeedbackReporterError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

export class ValidationError extends TransportError {
  constructor(
    message: string,
    public readonly errors: Record<string, string[]> = {},
    statusCode: number = 422,
  ) {
    super(message, statusCode, { errors })
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends TransportError {
  constructor(
    message: string = 'Too many requests. Please try again later.',
    statusCode: number = 429,
  ) {
    super(message, statusCode)
    this.name = 'RateLimitError'
  }
}

export class ServerError extends TransportError {
  constructor(message: string = 'Internal server error occurred.', statusCode: number = 500) {
    super(message, statusCode)
    this.name = 'ServerError'
  }
}

export class SessionExpiredError extends TransportError {
  constructor(
    message: string = 'The session or CSRF token is missing or has expired. Reload the page and try again. If the page is not served by Laravel, check the CSRF settings of the reporter routes.',
    statusCode: number = 419,
  ) {
    super(message, statusCode)
    this.name = 'SessionExpiredError'
  }
}

export class PayloadTooLargeError extends TransportError {
  constructor(
    message: string = 'The request payload is too large for the server.',
    statusCode: number = 413,
  ) {
    super(message, statusCode)
    this.name = 'PayloadTooLargeError'
  }
}

export class TimeoutError extends TransportError {
  constructor(public readonly timeoutMs: number) {
    super(`The request timed out after ${timeoutMs} ms.`)
    this.name = 'TimeoutError'
  }
}
