# Bounded model draft providers

This directory owns a server-side draft port for reviewed public organizer
research and writing. `provider-contract.mjs` defines the typed request and
schema-validated result. `deepseek-provider.mjs`, `openai-provider.mjs`, and
`anthropic-provider.mjs` translate that port to separate native REST protocols.
`provider-runtime.mjs` shares bounded transport and redacted failures. These
adapters are source support only; no Sales service route instantiates them.

Every factory defaults to disabled and requires explicit model, versioned
trusted prompt, public input schema, opaque secret reference, timeout, attempt,
network, full rendered request byte, output token and cost limits. An enabled
instance needs injected server secret and single-fetch transport ports. There
is no default fetch, environment credential lookup, SDK retry, streaming, tool
execution, provider selection or automatic cross-provider fallback.

## Reviewed provider boundaries

| Provider | Allowlisted model | Native structured draft protocol |
| --- | --- | --- |
| DeepSeek | `deepseek-flash`, `deepseek-v4-pro` | Chat Completions `response_format: json_object`; trusted prompt includes schema; local AJV validates output. Thinking is explicitly disabled. |
| OpenAI | `gpt-4.1-mini-2025-04-14` | Responses `text.format: json_schema` with `strict: true`; all object fields required. `store: false` and truncation disabled. |
| Anthropic | `claude-haiku-4-5-20251001` | Messages `output_config.format: json_schema`; no beta header. Thinking explicitly disabled. |

The narrow local output cap is 8,192 tokens for every listed model. Unknown
provider/model/capability combinations fail closed. Other models and aliases
need a separate capability review. All three require closed object schemas,
concrete array items, and no references or open dictionaries. Native structured
schemas admit only explicitly checked keywords and bounded complexity (100
properties, 100 enum/const values, 10 object levels, 16 unions, 24 optional
fields). OpenAI additionally requires every nested object field. Its subset
supports length, numeric and array bounds. Anthropic's raw subset rejects those
bounds except `minItems` of 0 or 1; it allows primitive `const`. Neither silently
strips constraints. Use a mutually supported schema for interchangeable drafts.
Local AJV validation always applies, including exact enum casing.

Only one unambiguous completed text draft is accepted. Refusal, incomplete,
truncated, tool or unexpected thinking output fails closed, even with HTTP 200.
Core token usage must be present, safe and internally consistent. DeepSeek and
OpenAI inclusive input/output totals already include their reported cache and
reasoning subsets. Anthropic input totals sum ordinary input, cache reads and
cache creation; all three counters are required. Its thinking count is a subset
of output. Unreported optional breakdowns remain null rather than invented zero.

`usage.costMicros` preserves the entire requested ledger reservation, with
`metadata.costBasis = reserved_ceiling` and `estimatedCostMicros = null`. It is
neither the provider bill nor a price estimate, and does not enforce billing.
Errors retain static codes, attempt count, HTTP status and submission outcome;
no payload, headers, credential, vendor error text, cancellation reason or cause
is logged or returned. Unknown usage stays null.

The monotonic deadline spans secret lookup, transport, response reading and
retry delay, races ports that ignore cancellation, and closes response streams.
Transport is a single raw fetch to a fixed endpoint with redirects rejected.
Only an explicit HTTP 429 rejection may retry once within both configured
attempt and network ceilings. An uncertain transport, timeout, 5xx, billed
refusal, incomplete or invalid response never retries or switches provider.

## Required service wiring before activation

The accountable Sales owner retains product and policy decisions. This source
slice does not complete employee/freelancer runtime activation. A separate
bounded service change must satisfy these prerequisites in order:

1. Revalidate the current exact owner, research/writing stage, frozen policy and
   stage hashes, billing source and activation expiry through
   [authorizePreparationStage](../../workflows/outreach-drafting/preparation-policy.mjs)
   before any external I/O. Keep research and writing independently authorized.
2. Build a reviewed public organizer projection and trusted versioned prompt,
   input schema and output schema. Never pass private CRM notes, contact exports,
   guest/attendee lists, credentials or customer/private data. Schema allowlists
   cannot prove that arbitrary strings or schema descriptions are public.
3. Claim a durable unique attempt under a fenced lease and atomically reserve
   model and network allowances against both run and month budgets before the
   adapter runs. Initialize ledgers from durable consumption. Reserve all
   allowed network attempts; never call a provider inside a retrying Firestore
   transaction. Persist unknown submission outcomes for manual reconciliation;
   do not release reservations or retry them across worker restarts.
4. Route the exact authorized provider and model into
   [GuardedModelRunner](guarded-model-runner.mjs), retaining its before-I/O
   reservations and validated-output-only cache. Its current seam drops
   `AbortSignal`, estimated input bounds and adapter metadata, and its cache key
   lacks provider identity. A wiring slice must propagate cancellation, enforce
   conservative full prompt/schema input estimates, preserve normalized
   metadata, and namespace caches by provider/model/version before activation.
5. Freeze a reviewed versioned price book, conservative whole-request token
   estimates, output limits and cost ceilings for the exact model and account.
   Include cache classes, reasoning subsets, schema-injected prompt overhead
   and peak rates where applicable. Reconcile actual bills separately; an
   adapter's reserved ceiling is not billing enforcement.
6. After separately authorized account/billing, retention and data-use review,
   inject server-only credential resolution and a transport with no hidden
   retries. Perform explicitly approved controlled acceptance, then activate
   the exact stage. Existing human draft review and dispatch authority remain
   separate workflow gates.

See the [Operations owner document](../../../../docs/operations_platform.md)
for durable workflow boundaries. Synthetic fixtures in
[model-provider-adapters.test.mjs](../../../test/model-provider-adapters.test.mjs)
exercise the adapter contract with the existing runner and preparation policy;
this slice creates no credentials, bills, provider calls, deployments or sends.

## Bounded research agent

`guarded-agent-runner.mjs` runs one tool-use research loop for a trusted
workflow: it calls the model, executes the caller's tools, and ends when the
model calls the caller's finish tool. It is the only path to agentic model use
in Operations, and it never publishes; its finish input is a proposal for the
calling workflow to review.

- **Model.** `claude-opus-5-5` only (`anthropic-agent-protocol.mjs`), over the
  native Messages API with the same injected transport and secret ports as the
  providers above. Thinking is left to the model (Claude Opus 5.5 cannot
  disable it), effort is explicit, tools are `strict` with automatic choice
  (forced tool choice is rejected by this model), and web search is the
  `web_search_20260209` server tool. Server-side refusal fallback is on
  (`fallbacks: "default"`).
- **Cost.** `price-book.mjs` is a reviewed price book. Before each step the
  runner reserves a proven ceiling in the run and monthly ledgers: input
  bounded from the previous step's reported usage plus everything appended
  since, the full output allowance, every remaining web search, and one
  fallback attempt at the ceiling rate. After the step it settles to the priced
  attempts in `usage.iterations`; a model outside the book is priced at the
  ceiling. A response that cannot be priced (for example, a missing cache
  counter) keeps its whole reservation charged.
- **Bounds.** Steps, tool calls, web searches, per-step output and a per-step
  deadline are capped. Nothing is retried after a request may have been
  billed. Tool inputs are schema-checked before a handler runs, failures go
  back to the model as bounded `is_error` results, and every tool result is
  capped at 24 KB.
- **Transcript.** The conversation only grows: assistant content, including
  thinking blocks and fallback markers, is passed back unchanged.
- **Stops.** `finished`, `ended_without_finish`, `step_limit`,
  `tool_call_limit`, `budget_exhausted`, `max_tokens`, `refusal`,
  `provider_error` and `cancelled`. Every stop other than `finished` is a
  signal for human review.

Its first caller is Supply Intake's listing research
(`workflows/supply-intake/research-agent.mjs`). There the agent reads pages
through the same guarded page source and adapters as gathering, so anything an
adapter can read flows through the ordinary listing builder. Beyond that it can
record only a fact it quotes verbatim from a page it fetched in that run, and
the tool checks the quote against the page text before it counts. Findings rank
below adapter-read facts, carry `method: "agent"` provenance, and never become
copy. `config/agent_policy.json` ships disabled with zero allowance. Enabling it
cites an accepted `agent_research_policy` decision, and its schema caps the
monthly ceiling at $50.

## Primary protocol references

Reviewed on 2026-10-07; model support must be rechecked before activation:

- DeepSeek [JSON mode](https://api-docs.deepseek.com/guides/json_mode/),
  [thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/), and
  [model/pricing reference](https://api-docs.deepseek.com/quick_start/pricing/).
- OpenAI [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
  [GPT-4.1 Mini snapshots](https://developers.openai.com/api/docs/models/gpt-4.1-mini),
  and [official generated Responses types](https://github.com/openai/openai-node/blob/master/src/resources/responses/responses.ts).
- Anthropic [structured outputs and refusals](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
  [Messages API](https://platform.claude.com/docs/en/api/messages/create),
  [Haiku 4.5 snapshot](https://platform.claude.com/docs/en/models/haiku-4-5/overview),
  [cache token totals](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), and
  [official generated Messages types](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/messages/messages.ts).
