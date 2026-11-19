# @catch/command-client

The shared core of Catch's catalog-driven command clients. It uses Node
built-ins only, so `tool/`, `operations/` and the Functions copy of the
Operations runtime can all import it without an install step. Import it by
relative path, for example
`../../packages/command-client/src/index.mjs`.

Clients today:

- `tool/firebase` probes (synthetic backend, Storage rules canary, callable
  dependency and platform availability checks), for tokens and callable URLs;
  each keeps its own request handling and errors, because each tests something
  different;
- `operations/src/admin-cli` (`catch-admin`), over `contracts/admin/actions/`;
- `operations/src/catch-cli` (`catch`), over `contracts/commands/catalog.json`;
- `operations/src/command-tools`, which turns catalog commands into AI tools.

| Module | Owns |
|---|---|
| `src/transport.mjs` | `callableUrl` (the address the `tool/firebase` probes call), HTTPS callable envelope, ID token and App Check headers, timeout, error codes under the caller's prefix, indeterminate-outcome classification |
| `src/tokens.mjs` | Custom-token to ID-token and App Check debug exchanges over Google's REST endpoints, with a caller-supplied error factory; the `tool/firebase` probes use them |
| `src/execution.mjs` | Local receipt around one live call, optional remote start/terminal receipt, `actionCompleted: null` for unknown outcomes |
| `src/receipt-store.mjs` | Immutable local receipts, one file per execution id |
| `src/argv.mjs` | Declared-flag parsing (unknown flags fail), exclusive pairs, `isMainModule` |
| `src/envelope.mjs` | The `{schemaVersion, program, command, ok, data|error}` JSON envelope and process exit code |
| `src/confirmation-policy.mjs` | What apply needs per command effect class; every client reads this one table |
| `src/admin-catalog.mjs` | Reads the admin action catalog (the index plus `contracts/admin/actions/*.json`) as one document; `tool/lib/admin_registries.mjs` re-exports it and `catch-admin` compiles it with Ajv |
| `src/errors.mjs` | `OperationsError`; `operations/src/platform/errors.mjs` re-exports it, so there is one error class |
| `src/canonical-json.mjs` | Canonical JSON and SHA-256 hashing; `operations/src/platform/canonical-json.mjs` re-exports it |

Each CLI keeps its own error-code prefixes (`ADMIN_CALLABLE_*`, `ADMIN_CLI_*`
for the admin CLI; `CATCH_CLI_*`, `CATCH_CALLABLE_*` for `catch`), so receipts
and runbooks keep working.

Anything that needs a dependency stays with its caller. The product command
catalog loader, which compiles schemas with Ajv, is
`operations/src/command-client/command-catalog.mjs`.

Its tests are `operations/test/command-client.test.mjs`, which the Operations
test runner already runs.
