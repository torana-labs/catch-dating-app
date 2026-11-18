import {asOperationsError} from "../platform/errors.mjs";

// The JSON envelope every operations CLI prints: one object on stdout for
// success, one on stderr for failure, exit code from the error.
export function successEnvelope({program, command, data, warnings = []}) {
  return {schemaVersion: 1, program, command, ok: true, data, warnings};
}

export function failureEnvelope({program, command, error}) {
  const normalized = asOperationsError(error);
  return {
    schemaVersion: 1,
    program,
    command,
    ok: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
    },
  };
}

export function runCli({program, argv, main, stdout = process.stdout, stderr = process.stderr}) {
  return main(argv).then(({envelope, pretty, text}) => {
    stdout.write(text ?? `${JSON.stringify(envelope, null, pretty ? 2 : 0)}\n`);
  }).catch((error) => {
    const normalized = asOperationsError(error);
    stderr.write(`${JSON.stringify(failureEnvelope({
      program,
      command: argv[0] ?? "help",
      error: normalized,
    }))}\n`);
    process.exitCode = normalized.exitCode;
  });
}
