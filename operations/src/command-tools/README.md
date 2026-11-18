# Command tools

Turns `contracts/commands/catalog.json` into AI tool definitions and runs the
preview-then-confirm protocol around them, for an agent client such as the
later WhatsApp surface. It shares the catalog loader and the effect-class
confirmation policy with the `catch` CLI (`../command-client/`).

- A tool's input schema is the command's `input` only, with `$ref`s resolved.
  The model cannot set mode, idempotency key, surface or confirm.
- Calling a tool always previews. The model gets the plain-language summary to
  relay and no hash or key.
- `CommandToolSession.confirmPending` applies a pending preview only for a
  confirmation whose `source` is `"person"`, and always sends the reviewed
  `previewHash`. For `messages-guests` and `moves-money` the confirmation must
  also echo that exact hash.
- Pending previews expire (15 minutes by default). A `running` preview is
  refreshed with the same idempotency key. A retried confirmation reuses its
  apply key, so the server replays instead of applying twice.
- `agentTools()` returns the `{name, description, inputSchema, handler}` shape
  `platform/model/guarded-agent-runner.mjs` takes; `anthropicTool()` gives the
  Messages API shape.
- A command is offered only on the surfaces the catalog lists for it.
