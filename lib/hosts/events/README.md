<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->

# Host Events

Provide the durable event and program inventory plus lifecycle workspace entry: upcoming schedule, history, bounded pagination, create, repeat, and manage navigation independent of Today’s operational queue.

## Ownership

- Primary route: `hostEventsScreen` (`/host/events`)
- Target root: `lib/hosts/events`
- Migration status: implemented as a destination-owned vertical slice
- Responsibility contract updated: 2026-09-22

Current implementation roots:

- `lib/hosts/events`

## This feature owns

- Own the /host/events route, its authentication and organizer-selection states, and the complete event inventory composition.
- Own independent active-schedule and history pagination, partial history recovery, cursor de-duplication, and stable session boundaries.
- Group events by lifecycle without duplicating Today’s command-centre policy.
- Own entry to create, repeat, event detail, and event manage flows while those destination features retain their mutations.
- Retain past events and future events outside Today’s time-sensitivity horizon.
- List private organizer programs as identifiable date-range and function-count rows alongside events, with bounded cursor pagination and exact-ID confirmation after creation.
- Own the Event-or-Program entry choice and the recoverable Program create flow while the existing Program workspace retains constituent function management.

## This feature does not own

- The attention policy, local attendance outbox merge, or Dress Rehearsal entry point.
- Event creation form state, Event Manage mutations, booking decisions, or Event Success runtime behavior.
- Constituent Program function, guest, team, lodging, transport, or operational workspace behavior.
- CRM, Forms, Inbox, Organizer, or global shell state.

## Routes

Owned routes:

- `hostEventsScreen` — `/host/events`

Typed handoffs:

- `hostCreateEventScreen` — `/host/organizers/:organizerId/create-event`
- `hostCreateProgramScreen` — `/host/organizers/:organizerId/create-program`
- `hostAppEventManageScreen` — `/host/organizers/:organizerId/events/:eventId/manage`
- `hostAppEventDetailScreen` — `/host/organizers/:organizerId/events/:eventId`
- `hostProgramWorkspaceScreen` — `/host/programs/:programId`

## Key code owners

| Owner | Source | Responsibility |
|---|---|---|
| `HostEventsScreen` | `lib/hosts/events/presentation/host_events_screen.dart` | Feature-contract actions: retry_host_home. |
| `HostEventsRouteScaffold` | `lib/hosts/events/presentation/host_events_screen.dart` | Feature-contract actions: create_organizer, manage_event. |
| `runHostEventEntryFlow` | `lib/hosts/events/presentation/host_event_entry_flow.dart` | Feature-contract actions: create_event, repeat_event. |
| `HostEventsOrganizerCard` | `lib/hosts/events/presentation/widgets/host_events_list.dart` | Feature-contract actions: retry_host_events, open_program. |
| `HostEventsTimelineController` | `lib/hosts/events/presentation/host_events_timeline_controller.dart` | Feature-contract actions: load_more_schedule, load_more_history, retry_event_history. |
| `HostAppShell` | `lib/routing/shell/host_app_shell.dart` | Feature-contract actions: switch_organizer. |
| `ProgramCreateScreen` | `lib/programs/presentation/program_create_screen.dart` | Recoverable organizer-scoped Program creation route entered from Events. |
| `ProgramEventsController` | `lib/programs/presentation/program_events_controller.dart` | Bounded Program inventory, exact saved-row confirmation, mutation, retry, and actor-generation fences. |
| `ProgramEventsRow` | `lib/programs/presentation/program_events_row.dart` | Identifiable Program date-range, function-count, and lifecycle row inside Events. |

## Shared dependencies

- `lib/contexts/events/data/event_repository.dart` — The shared repository owns canonical event queries; Events owns inventory pagination and display policy.
- `lib/routing/shell/host_app_shell.dart` — The shell owns global destination navigation and organizer scope.
- `lib/programs` — The Program domain retains creation orchestration and existing workspace behavior while Events owns the consolidated inventory entry point.

## Data contracts

- `contracts/callable_responses/organizer_program_list_response.schema.json`
- `contracts/callables/create_organizer_program_payload.schema.json`
- `contracts/callables/list_organizer_programs_payload.schema.json`
- `contracts/firestore/organizers.schema.json`
- `contracts/firestore/events.schema.json`
- `contracts/firestore/organizer_programs.schema.json`
- `contracts/firestore/organizer_team_memberships.schema.json`
- `contracts/firestore/organizers.schema.json`

## Focused tests

- `test/hosts/host_events_screen_state_test.dart`
- `test/hosts/host_events_timeline_controller_test.dart`
- `test/hosts/host_operations_screen_test.dart`
- `test/programs/program_create_controller_test.dart`
- `test/programs/program_create_screen_test.dart`
- `test/programs/program_events_controller_test.dart`

## Maintenance

Do not edit this file directly. Update `design/features/host_feature_responsibilities.json`, then run:

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
```

The generator cross-checks the Host shell order, typed route contract, feature-contract action owners, Dart symbols, data-contract paths, and focused tests.
