// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import type {ErrorObject} from "ajv";

export class AdminCallableValidationError extends Error {
  constructor(
    readonly callable: string,
    readonly direction: "request" | "response",
    readonly instancePath: string,
    readonly validationErrors: ErrorObject[]
  ) {
    const first = validationErrors[0];
    super(`Invalid ${direction} for ${callable} at ${instancePath}: ${first?.message ?? "schema validation failed"}`);
    this.name = "AdminCallableValidationError";
  }
}

export type AdminCallableValidators = {
  validateAdminCallableRequest(callable: string, value: unknown): void;
  validateAdminCallableResponse(callable: string, value: unknown): void;
};

export function missingAdminCallableValidator(
  callable: string,
  direction: "request" | "response"
): AdminCallableValidationError {
  return new AdminCallableValidationError(callable, direction, "/", [{
    instancePath: "", schemaPath: "", keyword: "missing-validator", params: {}, message: "validator is not generated",
  }]);
}

export const missingAdminCallableValidators: AdminCallableValidators = {
  validateAdminCallableRequest(callable) {
    throw missingAdminCallableValidator(callable, "request");
  },
  validateAdminCallableResponse(callable) {
    throw missingAdminCallableValidator(callable, "response");
  },
};
