---
doc_id: programme_assistant
version: 1.0.0
updated: 2026-11-08
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
message, called by `onProgramWhatsappInboundMessageCreated`. In order:

1. **The planner has taken the thread** (`handledBy: planner`): nothing
   happens. The run is recorded as skipped.
2. **The assistant is off**: the kill switch, the pinned key or the
   programme's `enabled` setting. The thread turns `needsYou`. No alert is
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

## Kill switch and operator steps

- `PROGRAM_ASSISTANT_ENABLED` (boolean, default false) is the kill switch
  for every programme.
- `PROGRAM_ASSISTANT_KEY_VERSION` names a pinned version,
  `projects/<project>/secrets/ANTHROPIC_API_KEY/versions/<n>`. When it is
  blank the assistant stays off. No deploy needs the secret to exist.
- To turn it on, the owner:
  1. creates `ANTHROPIC_API_KEY` in Secret Manager;
  2. grants the Functions runtime service account `secretAccessor` on it;
  3. sets the key version param, then the enabled param.

  The materialiser rejects `PROGRAM_ASSISTANT_ENABLED=true` without a key
  version.
- Each programme also needs `enabled: true` in its assistant settings and a
  connected WhatsApp number.

## Try it

`previewProgramAssistantReply({programId, requestId, text, householdId?})`
runs the same policy, fact pack, prompt, provider and budget, and sends
nothing. It needs the `communications` duty and allows 20 calls a minute.
It returns the answer, or the holding reply with the reason, or
`unavailable` when Catch has the assistant off.
