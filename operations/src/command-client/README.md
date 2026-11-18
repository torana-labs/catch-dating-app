# Command client core

Shared by every catalog-driven CLI that calls Firebase callables: the admin
action CLI (`src/admin-cli`, catalog `contracts/admin/`) today, and the product
command CLI (catalog `contracts/commands/catalog.json`) next.

| Module | Owns |
|---|---|
| `transport.mjs` | HTTPS callable envelope, ID token and App Check headers, timeout, error normalisation under the caller's code prefix, indeterminate-outcome classification |
| `execution.mjs` | Local receipt around one live call, optional remote start/terminal receipt, `actionCompleted: null` for unknown outcomes |
| `receipt-store.mjs` | Immutable local receipts, one file per execution id |
| `argv.mjs` | Declared-flag parsing (unknown flags fail), exclusive pairs, `isMainModule` |
| `command-catalog.mjs` | Loads `contracts/commands/catalog.json` read-only, compiles payload and response schemas, resolves a command's `input` schema |
| `confirmation-policy.mjs` | What apply needs per effect class; read by every client so the rule lives in one place |
| `envelope.mjs` | The `{schemaVersion, program, command, ok, data|error}` JSON envelope and process exit code |

Each CLI keeps its own error-code prefixes (`ADMIN_CALLABLE_*`, `ADMIN_CLI_*`
for the admin CLI), so receipts and runbooks keep working.
