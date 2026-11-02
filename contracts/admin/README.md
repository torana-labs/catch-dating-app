# Admin action contracts

`admin_action_catalog.json` and `actions/*.json` are the shared inventory for
the callable-backed actions available in the React admin console and the agent
CLI. `actions/` holds one file per workflow, so two PRs adding actions to
different workflows do not collide; a new action goes in the file of its first
workflow, and a workflow lists no actions of its own. Each entry owns
the stable action id, callable name, roles, GUI route, request schema, risk,
confirmation policy, and a schema-valid non-production example.

The catalog does not grant authority. Firebase Authentication, App Check,
callable role checks, rate limits, server-side validation, transaction guards,
and audit logging remain authoritative. Mutations are dry-run by default in the
CLI and require the catalog confirmation policy before the callable is invoked.

`operations.record-execution` is a control-plane action used by the CLI to
create remotely visible execution receipts. It is not a business workflow step
and cannot be invoked as a normal catalog action. Ambiguous transport outcomes
become terminal `indeterminate` receipts and must be reconciled before retry.

Validate catalog, GUI, Functions, schema, workflow, and example parity with:

```sh
node operations/scripts/check-admin-action-catalog.mjs
```
