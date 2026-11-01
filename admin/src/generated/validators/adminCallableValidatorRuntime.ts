// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import Ajv, {type ValidateFunction} from "ajv";
import addFormats from "ajv-formats";
import {
  AdminCallableValidationError,
  type AdminCallableValidators,
  missingAdminCallableValidator,
} from "./adminCallableValidation";

export function createAdminCallableValidators(
  schemas: object[],
  requestSchemaIds: Record<string, string>,
  responseSchemaIds: Record<string, string>
): AdminCallableValidators {
  const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
  addFormats(ajv);
  for (const schema of schemas) ajv.addSchema(schema);
  const validators = (ids: Record<string, string>): Record<string, ValidateFunction> =>
    Object.fromEntries(Object.entries(ids).map(([name, id]) => {
      const validate = ajv.getSchema(id);
      if (!validate) throw new Error(`Missing generated validator for ${name}.`);
      return [name, validate];
    }));
  const requestValidators = validators(requestSchemaIds);
  const responseValidators = validators(responseSchemaIds);
  const validate = (direction: "request" | "response", callable: string, value: unknown) => {
    const validateFunction = direction === "request" ?
      requestValidators[callable] : responseValidators[callable];
    if (!validateFunction) throw missingAdminCallableValidator(callable, direction);
    if (validateFunction(value)) return;
    const errors = validateFunction.errors ?? [];
    const instancePath = errors[0]?.instancePath || "/";
    throw new AdminCallableValidationError(callable, direction, instancePath, [...errors]);
  };
  return {
    validateAdminCallableRequest: (callable, value) => validate("request", callable, value),
    validateAdminCallableResponse: (callable, value) => validate("response", callable, value),
  };
}
