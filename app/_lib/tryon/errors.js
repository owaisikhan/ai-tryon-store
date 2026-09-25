import "server-only";

// One error type for everything the route can refuse or fail with. `message`
// is written for the shopper. `hint` (one line: what failed) and `advice`
// (how to fix it) are for the developer, sent only in development.
export class TryOnError extends Error {
  constructor(status, code, message, { retryAfter = null, hint = null, advice = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.hint = hint;
    this.advice = advice;
  }
}
