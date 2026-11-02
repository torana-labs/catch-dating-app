---
doc_id: action_cardinality_policy
version: 1.1.2
updated: 2026-11-02
owner: product_architecture
status: active
---

# Action Cardinality Policy

Every user-visible action needs an explicit cardinality contract before we
design the UI or backend write path. The contract answers:

1. Who is acting?
2. What object is the action scoped to?
3. Is the action disallowed, allowed once, or allowed repeatedly?
4. If there is a finite limit, is that limit a real product/domain constraint
   or just a UI shortcut?
5. After the action succeeds, what replaces the action in the UI?

This keeps the product honest. If the backend allows many records, the UI must
not pretend there is only one. If the backend allows only one record, the UI
must not keep offering duplicate creation. If an action is disallowed, the UI
must either remove the affordance or explain the disabled state.

## Cardinality Classes

| Class | Meaning | UI obligation | Backend obligation |
|---|---|---|---|
| Not allowed | The user cannot perform this action in the current state. | Hide the CTA when obvious, or disable it with a specific reason when the user needs feedback. | Reject the mutation with a typed, user-safe reason. |
| Singleton | The user may perform the action once per declared scope. | Replace the CTA with the resulting state, plus an inverse action only if undo/cancel is part of the product. | Enforce idempotence or uniqueness by deterministic ids, transactions, claims, or rules. |
| Unbounded | The user may create or accumulate many instances, with no product cap. | Provide list/rail/search/pagination/empty states that work for 0, 1, and many. Do not collapse the model into a single hero. | Use query/index/pagination patterns and avoid arrays that grow without bound. |
| Domain bounded | The action has a real finite limit. | Show the limit and current state, and offer the next valid state when full. | Enforce the limit transactionally. |

Allowed finite limits are things like run capacity, gender capacity, profile
photo slots, payment provider state, abuse/rate limits, or account lifecycle
constraints. A finite limit is not acceptable just because a screen is easier
to build with one item.

## Scope Examples

- Joining a specific run is singleton per `userId + runId`.
- Joining future runs is unbounded per user across different `runId`s.
- Hosting a run club is singleton per `hostUserId`.
- Creating runs is unbounded per host/club, subject to schedule conflict rules.
- Swiping is singleton per `swiperId + targetId + runId`, while the swipe queue
  is unbounded for display purposes.
- Chat messages are unbounded per match, but the conversation itself is
  singleton per matched pair/context.

## Design Rules

- Do not ship an action surface until its cardinality, scope key, terminal
  state, and inverse action are known.
- Disable buttons only for temporary or explainable states. Permanent
  not-allowed states should usually become different UI, not dead buttons.
- Singleton actions should be idempotent. Retrying after a network failure
  should not create duplicates.
- Unbounded collections need a scalable display path before launch: at minimum
  loading, empty, one, many, error, and pagination/refresh expectations.
- Domain-bounded actions must show why the limit exists. Example: "full, join
  waitlist" is valid; "you already have one because this screen only handles
  one" is not.
- Client UI can optimize affordances, but the server/backend contract is the
  source of truth for uniqueness and hard limits.

## Initial Product Audit

| Surface | Contract | Current read | Follow-up |
|---|---|---|---|
| Create run club | Singleton per host user. | `canCreateRunClubProvider` hides create affordances after hosted club exists; callable also enforces host claim. | Watch any new create-club entry point for the same provider. |
| Join run club | Singleton per user/club, with leave as inverse. | List/detail buttons render joined state instead of duplicate join; membership edge is idempotent. | Clean. |
| Create run | Unbounded per hosted club, with schedule-conflict domain guard. | Host detail exposes create run and agenda can display many runs. | Add explicit action inventory entry when host run management is expanded. |
| Join/book run | Singleton per user/run; unbounded across future runs. | `RunDetailCta` switches between join/book, cancel, waitlist, attended, ended, and ineligible states. Dashboard supports multiple signed-up runs. | Keep regression tests for multiple future bookings. |
| Run waitlist | Singleton per user/run, inverse leave waitlist. | `RunDetailCta` exposes join/leave waitlist states. | Clean. |
| Self check-in | Singleton per user/run participation, domain-bounded by time window and geofence. | Arrival card exposes check-in when open; backend validates. | Demo-data TODO still needs check-in-ready validation and checklist reporting. |
| Host attendance | One attendance decision per participant/run, repeatable only as correction if product allows it. | Attendance screen exists, but correction semantics should be audited separately. | Define whether hosts can undo or revise attendance. |
| Save run | Singleton toggle per user/run. | Detail app bar toggles saved state. | Verify saved-runs list supports many saved runs if product keeps this feature. |
| Swipe like/pass | Singleton per swiper/target/run context; queue display is unbounded. | Queue removes the top card after action and ignores duplicate swipe attempts while a swipe write is pending. | Watch backend uniqueness for duplicate event retries. |
| Match | Singleton per user pair/context, created by reciprocal likes. | Match id is deterministic and conversations list supports many matches. | Clean, pending future chat pagination work. |
| Send chat message | Unbounded per conversation. | Message list supports many messages and repository boundary exists. | Future chat roadmap still needs pagination/media/read receipts/typing/push hardening. |
| Block user | Singleton per directed user pair, with unblock as inverse if exposed. | Chat menu exposes block; backend has block documents. | Audit blocked-state UI across swipes/chats/profile. |
| Report user | Domain-bounded by moderation policy, not simple infinite. | Chat menu exposes report. | Decide whether repeat reports are allowed per match, per target, or per incident. |
| Write review | Singleton per user/run or user/club/run, depending final reputation model. | Review prompt exists after attended runs. | Confirm duplicate review prevention and edit/delete semantics. |
| Payment/order | Singleton successful booking per user/run; payment attempts may repeat until success. | Backend prevents duplicate booking and records failed signup state. | Ensure UI makes retry state clear after failed payment/sign-up race. |
| Add to calendar / directions / share / invite | Repeated side effects. | Confirmation screen exposes these as repeated utility actions. | Clean. |
| Cross Paths invitation | Domain-bounded: one recipient chosen by a sender for one event; recipient may hold at most three pending invitations and accept one plan per event. | Explore replaces send with pending/accepted state, invitation detail exposes only legal transitions, and accepted plans have an explicit cancel inverse. | Deterministic invitation and event-plan ids, transactional cap checks, idempotent response/cancel, and competing-pending invalidation are implemented in callables. |
| Cross Paths event-plan message | Unbounded within one active accepted plan and its event-end-plus-24-hour window. | Chat shows event context and becomes read-only when closed, blocked, or expired. | Firestore rules and message trigger enforce participant, status, block, and expiry boundaries without emitting dating-match signals. |
| Edit profile fields | Repeated updates, latest value wins. | Inline editors support repeated edits. | Clean. |

## Open Work Queue

- `ACC-001` (closed): this policy owns `ACTION-CARDINALITY-001`. Declare each
  user-visible action's scope and cardinality; singleton actions render their
  resulting state and are enforced server-side, and unbounded ones support zero,
  one and many.
- `ACC-002`: Build an action inventory from backend callables and primary UI
  CTAs, then keep it current like the backend operation catalog.
- `ACC-003`: Continue auditing rapid repeated taps on singleton mutation
  buttons. Swipe queue duplicate-write guarding is done; remaining higher-risk
  surfaces are check-in, attendance, report, and review.
- `ACC-004`: Finish check-in-ready demo validation so manual QA can exercise
  singleton check-in behavior reliably.
- `ACC-005`: Decide review/report correction and duplication semantics.
- `ACC-006`: Audit all unbounded collections for empty/one/many/error and
  pagination expectations.
