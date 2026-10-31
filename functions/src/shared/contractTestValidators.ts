import {createRequire} from "node:module";
import path from "node:path";

import type {ValidateFunction} from "ajv";

import {lazyValidator} from "./generated/schemaValidationRuntime";

/**
 * Test-only access to every schema contract. Runtime code imports the
 * individual modules generated for contracts/functions/runtime_modules.json;
 * tests reach the remaining contracts here, built at test time from the
 * canonical bundled schemas the generator writes for tooling, with the same
 * Ajv options as the runtime validators.
 */

type SchemaRegistry = Record<string, Record<string, unknown>>;

let registry: SchemaRegistry | undefined;
const validators = new Map<string, ValidateFunction<unknown>>();

/** The bundled JSON Schema for the schema spec [name], e.g. "EventDocument". */
export function contractSchema(name: string): Record<string, unknown> {
  registry ??= createRequire(__filename)(path.resolve(
    __dirname,
    "../../../tool/contracts/generated/schema_contract_registry.mjs"
  )) as SchemaRegistry;
  const key = `${name.charAt(0).toLowerCase()}${name.slice(1)}Schema`;
  const schema = registry[key];
  if (!schema) throw new Error(`No schema contract is named ${name}.`);
  return schema;
}

/** A lazily compiled validator for the schema spec [name]. */
export function contractValidator<T = unknown>(
  name: string
): ValidateFunction<T> {
  let validator = validators.get(name);
  if (!validator) {
    // Runtime modules share one Ajv instance that rejects a second schema
    // with the same $id. Bundles inline every $ref, so the id is not needed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {$id, ...schema} = contractSchema(name);
    validator = lazyValidator<unknown>(schema);
    validators.set(name, validator);
  }
  return validator as ValidateFunction<T>;
}
