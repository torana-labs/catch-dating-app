import path from "node:path";
import {fileURLToPath} from "node:url";
import {OperationsError} from "../platform/errors.mjs";

// Splits `<command> [subject] [--flags]`. Flags are declared up front so an
// unknown or misspelt flag is an error, never silently ignored.
export function parseCommandLine(argv, {
  subjectCommands = [],
  booleans = [],
  values = [],
  exclusive = [],
  codePrefix = "COMMAND_CLI",
} = {}) {
  const rest = [...argv];
  const command = rest.shift() ?? "help";
  if (["help", "--help", "-h"].includes(command)) {
    return {
      command: "help",
      subject: null,
      flags: parseFlags(rest, {booleans, values, exclusive, codePrefix}),
    };
  }
  const subject = subjectCommands.includes(command) && rest[0] &&
      !rest[0].startsWith("--") ? rest.shift() : null;
  return {
    command,
    subject,
    flags: parseFlags(rest, {booleans, values, exclusive, codePrefix}),
  };
}

export function parseFlags(argv, {
  booleans = [],
  values = [],
  exclusive = [],
  codePrefix = "COMMAND_CLI",
} = {}) {
  const booleanSet = new Set(booleans);
  const valueSet = new Set(values);
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (booleanSet.has(flag)) flags[camel(flag)] = true;
    else if (valueSet.has(flag)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new OperationsError(
          `${codePrefix}_ARGUMENT_INVALID`,
          `${flag} requires a value.`,
          {exitCode: 2}
        );
      }
      flags[camel(flag)] = value;
      index += 1;
    } else {
      throw new OperationsError(
        `${codePrefix}_ARGUMENT_INVALID`,
        `Unknown argument: ${flag}.`,
        {exitCode: 2}
      );
    }
  }
  for (const [left, right] of exclusive) {
    if (flags[camel(left)] !== undefined && flags[camel(right)] !== undefined) {
      throw new OperationsError(
        `${codePrefix}_ARGUMENT_INVALID`,
        `${left} and ${right} cannot be combined.`,
        {exitCode: 2}
      );
    }
  }
  return flags;
}

export function camel(flag) {
  return flag.slice(2).replace(/-([a-z])/gu, (_match, letter) =>
    letter.toUpperCase());
}

export function positiveInteger(value, fallback, minimum, maximum, {
  codePrefix = "COMMAND_CLI",
} = {}) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new OperationsError(
      `${codePrefix}_ARGUMENT_INVALID`,
      `Expected an integer between ${minimum} and ${maximum}.`,
      {exitCode: 2}
    );
  }
  return parsed;
}

export function isMainModule(metaUrl, argv1 = process.argv[1]) {
  return Boolean(argv1) && path.resolve(argv1) === fileURLToPath(metaUrl);
}
