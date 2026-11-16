---
doc_id: programme_assistant
owner: program_operations
status: active
---

# Programme assistant

The wedding assistant answers a guest's WhatsApp message to the wedding's
number from that household's own itinerary, and passes everything else to
the planner. Code: `functions/src/programs/assistant/`. The WhatsApp
threads, messages, settings document and reply service it uses belong to
the programme WhatsApp inbox (`functions/src/programs/programWhatsapp/`).

## How a message is handled

`handleProgramWhatsappInbound(event, deps)` runs for each inbound guest
message, called by `onProgramWhatsappInboundMessageCreated`. The inbox stores
times as integer millis (`serviceWindowExpiresAtMillis`, `createdAtMillis`);
the assistant reads those, and still accepts a timestamp. In order:

1. **The planner has taken the thread** (`handledBy: planner`): nothing
   happens. The run is recorded as skipped.
2. **The assistant is off**: the kill switch, a blank federation param or
   the programme's `enabled` setting. The thread turns `needsYou`. No alert is
   raised and nothing is sent, because the planner owns every message.
3. **The 24-hour window is closed**: no free text is allowed, so the
   message is passed on without a reply.
4. **Refused before the model**: media (tickets, ID photos), asking for a
   person, sounding distressed, gifts or money, or asking to change a
   booking.
5. **Budget**: the run reserves its upper bound on the programme's daily
   ledger. If it does not fit, the message is passed on.
6. **The model** (`claude-sonnet-5-5`, low effort, at most 1,200 output
   tokens) reads the fixed instructions, the household's fact pack and the
   last six thread messages. It returns an answer or a reason to pass the
   message on. An answer with a phone number, email or link that is not in
   the fact pack, or longer than 1,000 characters, is never sent.
7. **Answer**: sent through `sendProgramServiceReply({programId,
   householdId, text, author: "assistant", runId})`. That is the same
   reserved, fail-closed reply path a planner uses.

**Passed to you** means:

- the thread gets `state: needsYou` and `escalationReason`;
- a staff attention journal row (`organizerMomentSends`, `actionKind:
  staffAttention`, duty `communications`, urgent for distress) puts it on
  the live board, the staff attention feed and the organiser's Today list;
- a `programAlerts` row assigns that alert to the first escalation contact,
  or to the programme's manager when none is set;
- while the window is open, the guest gets a holding reply in their
  language: "I've passed this to your planner. They'll reply here today."
  (or within the hour, or within four hours, per `replyWithin`).

Every step is idempotent per run. A retried trigger finds its run and does
nothing twice. If an earlier attempt reserved budget and never settled, the
message is passed on rather than sent to the model again, because the guest
may already have an answer.

## What it reads

The fact pack (`facts.ts`, read by `factsSource.ts`) holds only the
household that wrote in:

- the wedding's title, dates and time zone;
- each function a member is invited to: day, time, venue, dress code,
  guest-facing instructions and each member's own status;
- each member's RSVP;
- their hotel stays: hotel, address, room, check-in and check-out;
- their travel legs: flight, route, arrival, flight status, pickup point
  and its guest instructions, and where the car goes.

The fact pack never holds another household's guests, rooms or flights.
It also leaves out phone numbers, emails, staff notes, ID records and
anything from the CRM. The programme has no separate public notes field,
so the guest-facing function and pickup instructions serve that purpose.
"Try it" without a household reads programme-wide functions only.

## What it never does

The settings screen shows this fixed list (`NEVER_DOES` in `policy.ts`):

- Never changes anyone's replies, rooms or flights. It has no tools, and
  change requests are passed on.
- Never shares another guest's details. The fact pack holds none.
- Never guesses. If the answer is not in the itinerary, it asks you.
- Never promises anything on the planner's behalf. The holding reply says
  only that the message was passed on and when to expect a reply.

## Languages

It replies in the language the guest writes in when the programme offers
it: English, Hindi, Gujarati, Marathi or Tamil. The default is English and
Hindi. Devanagari text reads as Hindi unless only Marathi is offered.
Otherwise it replies in the programme's first language. Holding replies
are written out in English and Hindi. Other languages get English.

## Budget

`programAssistantSettings.dailyTokenBudget` caps the tokens a programme
spends per local day. The default is 200,000 and the maximum is 5,000,000.
Each run reserves an input estimate plus `max_tokens` on
`programAssistantBudgets/{programId}_{YYYY-MM-DD}` in the same transaction
that writes its intent, before any call. Afterwards the reservation settles
to the tokens actually used. A timeout counts the whole reservation,
because it may have been billed. Anthropic bills Catch per token.

`programAssistantRuns/{runId}` keeps one audit row per run: ids, the
SHA-256 of the exact request and of the fact pack, tokens, attempts, the
provider status, latency and the outcome. It never stores the guest's
text, the reply, names or phone numbers.

## Provider

The provider (`provider.ts`) calls `https://api.anthropic.com/v1/messages`
with `anthropic-version: 2023-06-01` and a 20-second timeout. On 429 or
5xx it retries once, honouring `retry-after` up to 5 seconds. Then it gives
up and the message is passed on. A timeout is never retried. A refusal or a
truncated reply is passed on too.

Catch holds no Anthropic API key. The provider authenticates with Anthropic Workload
Identity Federation:

1. It asks the metadata server for a Google ID token for the function's
   runtime service account, with audience `https://api.anthropic.com` and
   `format=full`.
2. It exchanges that token at `https://api.anthropic.com/v1/oauth/token`
   with the federation rule id and the organization id. A fresh ID token is
   minted for every exchange.
3. It sends the short-lived access token as `Authorization: Bearer` on the
   Messages call, with `anthropic-beta: oauth-2025-04-20`.

The access token is kept in memory until a minute before it expires. A
failed exchange is a provider error: the message is passed on and nothing is
billed. Errors name the step and the HTTP status, never the ID token or the
access token.

## Kill switch and operator steps

- `PROGRAM_ASSISTANT_ENABLED` (boolean, default false) is the kill switch
  for every programme.
- `PROGRAM_ASSISTANT_FEDERATION_RULE_ID` (string) is this project's
  Anthropic federation rule, `fdrl_` followed by letters and digits. It
  differs per environment.
- `ANTHROPIC_ORGANIZATION_ID` (string) is the Anthropic organization UUID.
  It is the same in every environment.
- When either is blank the assistant stays off, and no deploy needs anything
  to exist. The materialiser rejects a malformed value, and it rejects
  `PROGRAM_ASSISTANT_ENABLED=true` unless both are set.
- Two identities call Anthropic. `onProgramWhatsappInboundMessageCreated`
  (live replies) runs as `catch-whatsapp-reader@<project>`, and
  `previewProgramAssistantReply` (Try it) runs as the default Functions
  runtime service account. The rule must accept both, or Try it fails while
  live replies work (or the other way round).
- To turn it on, the owner, in the Claude Console:
  1. creates a service account for the assistant (for example
     `catch-programme-assistant-dev`) and adds it to the workspace that
     should carry the usage;
  2. registers one Google issuer for the organization: issuer URL
     `https://accounts.google.com`, JWKS mode discovery;
  3. creates one federation rule per Firebase project. It targets that
     service account and is bound to that single workspace (a rule enabled
     for more than one workspace needs a `workspace_id` the provider does not
     send). It matches audience `https://api.anthropic.com` and the subject
     and `email` claims of the runtime identities. Find each identity's
     numeric unique id with `gcloud iam service-accounts describe <email>
     --format='value(uniqueId)'`. Because two identities call, use a CEL
     condition such as `claims.sub in ["<reader id>", "<runtime id>"] &&
     claims.email in ["<reader email>", "<runtime email>"]`; never a
     `subject_prefix` wildcard. Scope `workspace:inference`, token lifetime
     3600 seconds;
  4. sets the GitHub environment variables
     `PROGRAM_ASSISTANT_FEDERATION_RULE_ID` (per environment) and `ANTHROPIC_ORGANIZATION_ID`, deploys, then sets
     `PROGRAM_ASSISTANT_ENABLED=true`.

  The authentication history on the Console's Workload identity page shows
  why an exchange was refused; the API itself always answers an opaque
  `401 Authentication failed`.
- Each programme also needs `enabled: true` in its assistant settings and a
  connected WhatsApp number.

## Try it

`previewProgramAssistantReply({programId, requestId, text, householdId?})`
runs the same policy, fact pack, prompt, provider and budget, and sends
nothing. It needs the `communications` duty and allows 20 calls a minute.
It returns the answer, or the holding reply with the reason, or
`unavailable` when Catch has the assistant off.
