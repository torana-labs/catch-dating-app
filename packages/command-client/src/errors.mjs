export class OperationsError extends Error {
  constructor(code, message, {details = {}, exitCode = 1, cause} = {}) {
    super(message, {cause});
    this.name = "OperationsError";
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

export function invariant(condition, code, message, details = {}) {
  if (!condition) {
    throw new OperationsError(code, message, {details});
  }
}

export function asOperationsError(error) {
  if (error instanceof OperationsError) return error;
  return new OperationsError("INTERNAL_ERROR", "The operation failed unexpectedly.", {
    cause: error,
    details: {
      cause: error instanceof Error ? error.message : String(error),
    },
  });
}
