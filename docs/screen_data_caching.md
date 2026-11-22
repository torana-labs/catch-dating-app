---
doc_id: screen_data_caching
owner: app_architecture
status: active
---

# Screen Data Caching

How long screen data stays in memory, when a returning screen refetches, which
writes make data stale, and what the provider graph checks. The owner approved
this contract on 1 November 2026 (issue #1323) together with fourteen
freshness answers; on 2 November the owner decided the read path below, and
this text is adapted to it.

## Read path

Redesigned screens read through Firestore listeners by default, and the read
models they need are built first (#1488). Cloud Functions stay for commands
and for eight reads that cannot move: `previewEventOfferPreferences`,
`createEventVenueSession`, `listOrganizerLumaEvents`, `manageHostRosterIntake`,
`getEventInviteLinkToken`, `getEventAssistanceDepartureRoster`,
`getEventAssistanceRuntimeConfig` and `getHostAnalytics`.

Decision S (2 November) settles what the cache serves: the timed policies,
`ref.callableRead` and tags serve those eight callables and the one-shot gets
that survive wave 1, and nothing else. Legacy screens that P3, P5 and P6
replace are not migrated; their findings leave the baseline with the screen
(see Rollout). Listeners need little more than a 60-second window after
leaving: they render from the on-device cache on re-open and deliver their own
updates.

Of the eight, a command (create, manage, preview, token issue) stays a plain
callable and declares what its write makes stale; a read goes through
`ref.callableRead` with its freshness-table policy. `getHostAnalytics`
(`hostReports`) is on the contract. The departure roster review, the runtime
sender pages and the Luma event list are still called imperatively from their
flows: the first two are steps inside a reviewed command, checked against the
listener snapshot they were read from, and the third is keyed by an API key
the host has just typed, which a session cache must not hold.

## Lifetimes

A read owner is a provider whose own body, or a repository method it calls,
reaches `.snapshots()`, a Firestore `.get()`, `httpsCallable` or
`callHostCrm`. It declares exactly one lifetime in its `build`.

| Lifetime | Declared by | Kept until | Use for |
|---|---|---|---|
| Route (default) | `@riverpod` alone | The last listener leaves | Forms, flows and editors; anything refetched on every open; listeners off the hot paths |
| Timed | `ref.retain(CachePolicies.x)` | `retain` after the last listener leaves | Records and reports re-opened within a session |
| Session | `ref.retainForSession(session)`, with an `AuthenticatedSession` in the family key | That signed-in period ends: sign-out, account change or auth failure | Per-account data reused across many screens |

A hidden tab is not a closed screen. Riverpod pauses the listeners of a screen
whose tickers are off and never disposes a provider whose listeners are only
paused, so the retain window starts only when a listener is removed. A return
or a hidden tab becoming visible refetches once in the background when the
data is older than `staleAfter`.

Per-account state that is not a read, such as a search box, the selected
organizer, a flow's draft or a set of pending references, also takes the
session lifetime: its `build` calls `ref.retainForCurrentSession()`
(`lib/contexts/account/data/authenticated_session.dart`). The provider stays
while the signed-in account stays the same, and a sign-out, an account change
or an auth failure rebuilds it from scratch, so nothing one account entered
reaches the next and nothing has to be reset by hand at sign-out. A guest's
state is kept the same way while signed out, and a first sign-in keeps it,
because it belongs to no account.

`@Riverpod(keepAlive: true)` stays reserved for two scopes, and its
`// keepalive:` marker names one of them first:

- `account-free:` holds nothing that belongs to one account: SDK singletons,
  stateless repositories, platform facades, routers, app-wide UI state, public
  configuration and durable stores keyed inside by account.
- `session-root:` is the signed-in identity, or follows it, and kept-alive
  infrastructure reads it: the auth stream, `uid`, the authenticated session
  and the signed-in account's own profile, which the router reads. Riverpod
  forbids a kept-alive provider reading an auto-dispose one, so the router's
  inputs stay kept alive; each follows the uid and reads null while signed
  out.

## The owner's freshness table

Every caching duration lives in `packages/platform/lib/cache/cache_policies.dart`,
which names the owner. Changing a value is a product decision; no read owner
writes a `Duration` inline.

| Policy | Data | Kept after leaving | Stale after | Answer |
|---|---|---|---|---|
| `hostReports` | Host analytics, form analytics, attendance report, roster insights, CRM and programme counts | 10 min | 5 min | Q1 |
| `hostCustomerRecords` | Contact, form response and application records with personal data | 2 min, never on disk | Always refetched on return | Q2 |
| `liveOperations` | Help requests, departures, checkpoints, presence, assistance roster read through functions | 60 s | Always refetched on return; rows shown as updating | Q3 |
| `bookingState` | Price, seats, eligibility, waitlist | 5 min | 60 s | Q4 |
| `discovery` | Search, recommendations, cross-paths suggestions, "who's going" | 10 min | 2 min | Q5 |
| `swipeDeck` | The catches deck | 10 min | Not within the window; refetched when it runs out | Q6 |
| `eventChat` | Event chat messages and participants | 60 s | Read again when the chat's change signal moves (typing at most every 3 s); no polling | Q7 |
| `accountReference` | Operable organizers, form templates, programme list, messaging setup, tracking settings | Session | 1 h | Q8 |
| `guestProfileAnalytics` | Guest profile analytics | Session | 10 min | Q9 |
| `listener` | Firestore listeners on detail screens | 60 s | Never: the listener stays current | Q14 |
| `sessionState` | Per-account state such as the selected organizer or search text | Session | Never | Contract default |

The other answers set behaviour rather than durations: guests at a venue and
hosts at the door already open offline through listeners and the attendance
outbox (Q10, Q11); the programme staff snapshot extends to guests, trips and
hotel rooms through the shared persisted-read store (Q12, #1330); and both
apps wipe the on-device Firestore cache at sign-out (Q13, below).

## Cache keys

- The family argument is the cache key: a value-equality query object.
  Sets are sorted, strings trimmed and defaults filled before it is built.
- A timed or session read of account data carries `AuthenticatedSession` in
  its key; watching the uid alone keeps the previous account's value attached
  during a reload. Host reads also carry the `organizerId`.
- The key builds the request: a `CacheQuery`'s `toRequest()` produces the
  callable payload, so key and request cannot drift apart.
- Time never enters a key raw: use `CacheTimeBucket.minute(now)` (or `hour`,
  `day`), or a boundary the owning screen resets on purpose.

## Stale-while-revalidate

`ref.callableRead(policy:, query:, fetch:, previous:)` is the one client for
Cloud Function reads and one-shot gets. Its read owner is an `AsyncNotifier`
whose family argument is the query, and whose `build` passes `state.value` as
`previous`.

- First view: loading, then data, stamped with `fetchedAt` from the app clock.
  A read longer than the initial-load timeout fails.
- Return within `retain`, data younger than `staleAfter`: instant, no request.
- Return within `retain`, data older: the kept data renders at once and one
  background refetch runs; `CatchAsyncBoundary` keeps the data meanwhile.
- Return after `retain`: the provider is gone and the screen loads.
- A failed background refetch keeps the data and sets
  `CachedRead.refreshError`, so the screen can say "Couldn't refresh, updated
  4 min ago"; it never becomes a full-screen error.

View models pass `fetchedAt`, `refreshError` and `AsyncValue.isRefreshing`
through as data, so a redrawn screen can show freshness without knowing the
cache.

## Invalidation declared by writes

Each bounded context defines typed `CacheTag`s in its domain, such as
`EventTags.roster(eventId)`. A read owner declares what it provides with
`ref.providesTags({...})`; an action controller declares what its write makes
stale in the same `Mutation.run`:
`tx.get(cacheTagsProvider).invalidate({EventTags.roster(eventId)})`.

- Firestore listener providers declare no tags for their own documents: the
  listener already delivers the write.
- Widgets never invalidate after a write. A direct `ref.invalidate` stays
  legal in an error retry or a pull-to-refresh, and both target the read
  owner, not a view model composed from it (`retryFailedReads` does this).
- The tag registry is session-scoped: `AuthSessionController` replaces it at
  sign-out and after account deletion.

## Writes: deadline, still working, unknown outcome

The owner approved this policy on 17 November 2026. It covers commands, the
callables that change data; reads keep the load deadlines of the table above.

- **Deadline.** `firebaseFunctionsProvider` hands out `DeadlineFirebaseFunctions`
  (`packages/platform/lib/firebase/deadline_firebase_functions.dart`), which
  gives every callable without options of its own `HttpsCallableOptions` with
  a 30 second timeout (`callableDefaultTimeout`; the plugin's default is 60).
  A call that needs more or less passes its own options.
- **Still working.** `PendingWriteObserver`, an observer on the app container,
  watches every `Mutation`. One still pending after 8 seconds
  (`writeStillWorkingAfter`) counts in `stillWorkingWritesProvider`, and the
  notice overlay shows "Still working on it…" until the last such write
  settles. The notice never cancels or retries anything.
- **No automatic retry.** A mutation never retries, and the container retry
  policy applies to provider reads only. A write that is safe to repeat is
  repeated by the user (or by an idempotent flow that says so), never by the
  client behind their back.
- **Unknown outcome.** A write that runs out of time may still finish on the
  server. `writeFailure` turns a timeout into the `write-outcome-unknown`
  failure on the error banner, the notice and the message helpers, which says
  the change could not be confirmed and may still go through. The screen then
  confirms from its own Firestore listener, or from a read-back, before it
  offers the action again; a command whose result no listener shows reads the
  record back first.

## Persistence, sign-out and retries

- Firestore persistence stays on for every platform.
- Cloud Function responses are written to disk only through the shared
  persisted-read store (#1330), for data marked "must open offline".
- At sign-out both apps terminate the Firestore instance and clear its
  persistence before another account can sign in
  (`packages/platform/lib/firebase/firestore_cache_wipe.dart`, called by
  `AuthSessionController`). Native plugins start a fresh instance on the next
  call; on the web the terminated instance cannot restart, so the page
  reloads. A failed wipe is reported and sign-out continues.
- The container retry policy (`catchProviderRetry`, #1345) retries only
  failures the backend marks retryable, three times within 1.4 s. One rule
  decides the `@Riverpod(retry:)` opt-outs: a Firestore listener read owner
  keeps its opt-out, because restarting a listener is the user's reload and
  never an automatic retry; a Cloud Function or one-shot read owner takes the
  container policy unless a comment on it names a reason review accepted.
  Today nine listener read owners opt out and no callable read owner does.

## App clock and time to content

`appClockProvider` (`packages/platform/lib/cache/app_clock.dart`) gives now and timers;
tests drive it with `fake_async` through `AppClock.custom`. Read owners and
time rules under `lib/contexts` take the time from it. `dashboardNow`,
`exploreDiscoveryReferenceNow`, `eventChatNow` and `programProjectionClock`
still read it for the dashboard, Explore, event chat and programme screens,
and leave with those screens.

`CatchAsyncBoundary` logs `screen_time_to_content` once per screen visit
through the app analytics: the route name (`surface`), milliseconds from the
route's first boundary mounting to its first data (`duration_ms`), and
`content_source` (`memory` when the screen opened with its data, otherwise
`load`). Unnamed routes, sheets and dialogs are not measured, and the Host app
drops the event because it sends only its closed product events.

## Testing

Every migrated read owner passes the six tests in
`test/platform/cache/cache_lifetime_harness.dart`: leave and return within
`retain`; return after `staleAfter`; after `retain`; a paused listener
outliving `retain`; a new session never observing the previous session's
value; a write tag refetching only the matching keys. Apply it with a
`CacheHarnessSubject` that routes the read owner's backend to the harness's
counting fake, as `test/platform/cache/cache_lifetime_test.dart` does.

## Enforcement

`tool/architecture/provider_graph.dart` (`audit:provider-graph`) holds the
rules. They run in report-only mode: the findings that existed when the rules
landed are listed by exact rule, path, symbol and detail in
`tool/architecture/provider_graph_baseline.json`, and the check fails only
when a finding is not listed. Each context's migration PR deletes the entries
it fixes, so the list only shrinks.

| Rule | Fails when | Listed at landing |
|---|---|---|
| CACHE-LIFETIME-001 | A read owner declares more than one lifetime, or is `keepAlive: true` without an `account-free:` or `session-root:` decision | 3 |
| CACHE-POLICY-001 | A lifetime gets anything but a `CachePolicies` member, or a `CachePolicy` is built outside the table | 0 |
| CACHE-ACCOUNT-001 | A timed or session read owner of account data has no `AuthenticatedSession` in its key | 0 |
| CACHE-KEY-001 | A timed or session read owner's key holds a raw `DateTime` | 0 |
| CACHE-INVALIDATE-001 | Presentation code invalidates or refreshes a read owner outside a retry or pull-to-refresh, or a retry targets a composition instead of the read owner | 120 |
| CACHE-LISTENER-001 | A write invalidates a Firestore listener provider, or a listener declares tags | 9 |
| KEEPALIVE-MANUAL-001 | A handwritten provider without `.autoDispose` lacks a `// keepalive:` marker | 5 |
| KEEPALIVE-SCOPE-001 | A kept-alive provider's marker names no scope; a `session-root:` reads no identity (`uid`, the session, the auth stream or repository, `currentUser`); or an `account-free:` notifier reads the signed-in account, which makes it per-account state that needs the session lifetime | added 22 November 2026 with every marker scoped |

```sh
dart run tool/architecture/provider_graph.dart --check
dart run tool/architecture/provider_graph.dart --json   # readOwner, readKinds, lifetime per provider
dart run tool/architecture/provider_graph.dart --write-cache-baseline   # reviewed reset only
```

The pass reads parsed source, not resolved types. It follows a repository
call through the provider's declared return type, typed locals, fields,
same-class helpers, mixins and interface implementations; it misses dynamic
dispatch and reads handed off through untyped helpers. "Account data" means a
read owner that touches the uid, the session or an `organizerId`, `userId`
or `uid` parameter. A retry is a closure passed as `onRetry`, `onRefresh` or
`onReload`, or a function named for a retry, refresh or reload.

## Rollout

### Phase 1: foundations, report-only

The pieces above land with no read owner migrated, and the rules list today's
findings instead of failing on them.

### Phase 2: context migrations empty the baseline

Code that survives the redesign is on the contract: the listener and
keep-alive findings are gone, and so are the invalidations outside legacy
screens. On 22 November 2026 every kept-alive provider was classified: about
110 are `account-free:` infrastructure, four are `session-root:` (the auth
stream, `uid`, the authenticated session and `watchUserProfileProvider`, which
the router reads), and fourteen that held per-account state moved to the
session lifetime: the Chats and Explore search and filter state, the selected
Explore city and its guard, the Host organizer selection, the five pending
rehearsal and assistance reference sets, the foreground notification
controller, the companion launch registry and the onboarding controller.
Sign-out no longer resets Explore by hand. Everything else the baseline lists
is `CACHE-INVALIDATE-001` in screens the redesign deletes, so each screen PR
deletes its entries with the screen. When the baseline is empty, the rules
gate with no list.

| Legacy code | Entries | Call sites | Deleted by |
|---|---|---|---|
| `lib/hosts/today/personalization` | 2 | 2 | P3.1 Today |
| `lib/event_success/presentation` (departure controller, attendance disposition editor) | 3 | 3 | P3.4 Live |
| `lib/event_rehearsal/presentation` (start screen source refresh) | 1 | 1 | P5 events workspace |
| `lib/hosts/presentation/customers` | 22 | 23 | P5 people |
| `lib/hosts/presentation/inbox` | 10 | 10 | P5 people |
| `lib/hosts/presentation/forms` | 12 | 14 | P5 forms |
| `lib/hosts/presentation/host_operations/host_whatsapp_setup_section.dart`, `host_tracking_settings_section.dart` | 5 | 5 | P5 organizer |
| `lib/programs/presentation` | 11 | 12 | P5 programmes |
| `lib/explore/presentation` | 7 | 7 | P6 explore |
| `lib/chats/presentation/chat_retry_controller.dart`, `lib/swipes/presentation` | 5 | 5 | P6 after and chats |
| `lib/user_profile/presentation` | 2 | 2 | P6 you |
| Total | 81 | 85 | |

## Code map

| Piece | File |
|---|---|
| App clock | `packages/platform/lib/cache/app_clock.dart` |
| Lifetimes, `CachePolicy`, `CacheSession` | `packages/platform/lib/cache/cache_policy.dart` |
| Freshness table | `packages/platform/lib/cache/cache_policies.dart` |
| Key rules, time buckets | `packages/platform/lib/cache/cache_time_bucket.dart` |
| Stale-while-revalidate client | `packages/platform/lib/cache/callable_read.dart` |
| Cache tags and registry | `packages/platform/lib/cache/cache_tags.dart` |
| Sign-out wipe | `packages/platform/lib/firebase/firestore_cache_wipe.dart` |
| Callable timeout | `packages/platform/lib/firebase/deadline_firebase_functions.dart` |
| Still working, unknown write outcome | `packages/platform/lib/riverpod_ui/pending_write_observer.dart`, `packages/platform/lib/errors/write_outcome.dart` |
| Listener first-value deadline | `packages/platform/lib/firebase/listener_first_value.dart` |
| Time to content | `packages/platform/lib/cache/screen_time_to_content.dart` |
| Tests and harness | `test/platform/cache/` |
