type JsonSchema = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesType(value: unknown, type: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((candidate) => matchesType(value, candidate));
  }
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === type;
}

function matchesFormat(value: string, format: unknown): boolean {
  if (format === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
  }
  if (format === "date-time") {
    return Number.isFinite(Date.parse(value)) && value.includes("T");
  }
  return true;
}

/**
 * The bounded draft-07 check the website reader applies to optional public
 * event fields (website/src/shared/contracts/jsonSchema.ts). The read model
 * uses the same check so both decide identically which optional fields show.
 */
export function matchesJsonSchema(
  value: unknown,
  schema: JsonSchema
): boolean {
  if (schema.$ref !== undefined) return false;
  const oneOf = schema.oneOf;
  if (Array.isArray(oneOf)) {
    return oneOf.filter((candidate) =>
      isRecord(candidate) && matchesJsonSchema(value, candidate)
    ).length === 1;
  }
  const anyOf = schema.anyOf;
  if (Array.isArray(anyOf)) {
    return anyOf.some((candidate) =>
      isRecord(candidate) && matchesJsonSchema(value, candidate)
    );
  }
  if ("const" in schema && !Object.is(value, schema.const)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return false;
  }
  if (schema.type !== undefined && !matchesType(value, schema.type)) {
    return false;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return false;
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      return false;
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      return false;
    }
  }
  if (typeof value === "string") {
    if (typeof schema.pattern === "string" &&
        !new RegExp(schema.pattern, "u").test(value)) return false;
    if (typeof schema.minLength === "number" &&
        value.length < schema.minLength) return false;
    if (typeof schema.maxLength === "number" &&
        value.length > schema.maxLength) return false;
    if (!matchesFormat(value, schema.format)) return false;
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" &&
        value.length < schema.minItems) return false;
    if (typeof schema.maxItems === "number" &&
        value.length > schema.maxItems) return false;
    if (schema.uniqueItems === true &&
        new Set(value.map((item) => JSON.stringify(item))).size !==
          value.length) return false;
    if (isRecord(schema.items) &&
        !value.every((item) =>
          matchesJsonSchema(item, schema.items as JsonSchema))) return false;
  }
  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    if (required.some((key) => typeof key !== "string" ||
        !Object.prototype.hasOwnProperty.call(value, key))) return false;
    for (const [key, propertyValue] of Object.entries(value)) {
      const propertySchema = properties[key];
      if (isRecord(propertySchema)) {
        if (!matchesJsonSchema(propertyValue, propertySchema)) return false;
      } else if (schema.additionalProperties === false) {
        return false;
      }
    }
  }
  return true;
}
