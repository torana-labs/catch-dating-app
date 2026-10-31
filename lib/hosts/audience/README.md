<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->

# Host Audience

Own the participant relationship system as one destination: People, saved Audiences, Forms, and unified Responses review, with shared organizer scope and deliberate handoff to Inbox for delivery.

## Product guide

Authored explanations follow; the reference table is derived from schemas. Source links and named example declarations are checked, but this generator does not run the examples or establish deployment status.

<a id="overview"></a>

### What does Audience do?

Audience is the Host workspace for understanding and organizing an organizer’s relationships with people. Its four peer modes are People (the contact directory), Audiences (reusable groups), Forms (intake design and publication), and Responses (submitted answers and review). Organizer applications belong to this intake workflow. Hosts select the organizer whose records they want to work with; event operations remain in Events and communication delivery moves to Inbox. The implementation still lives across the listed customers, forms, and applications folders; this README is the entry point for the whole destination.

<a id="people"></a>

### What can a host do with People?

People provides organizer-scoped search, filters, sorting, and paginated contact browsing. A contact detail brings together identity, organizer tags and private notes, attendance and revenue context, and contact administration or duplicate review where available. Manual creation requires a name and at least one phone or email endpoint. Entering those details does not verify identity, create a Consumer profile, admit someone to an event, or grant marketing permission. Existing legacy name-only contacts can still be read. A contact is a relationship record; it is not the same thing as a verified account or a communication grant.

<a id="membership"></a>

### How is saved-audience membership decided?

A saved audience is a named, reusable organizer CRM group. Hosts can select people explicitly for a static list, or combine reviewed rules using all/any matching. Rules cover computed segments, tags, attendance counts and named events, recency, communication reachability, application status, versioned form answers, and spending. The server validates and evaluates definitions; Inbox consumes a saved audience rather than rebuilding its rules. Static lists follow contact merges and exclude unavailable people, and cannot be mixed with rule predicates. Spending uses bounded canonical Catch payment data, currency and time-window rules, current refund status, and unique verified identities; it does not establish complete spending across external providers.

<a id="preview"></a>

### Are audience counts and member lists live?

A preview evaluates current source data on the server. It returns an exact result or an explicit failure when source coverage is incomplete or evaluation limits are exceeded. Stored preview counts describe the last evaluation and must not be presented as continuously live. Member-page cursors bind organizer, audience revision and membership; changed membership requires a refresh. Editing a definition clears its stored preview, and stale revisions or archived audiences can block later operations. A matching contact is not necessarily reachable: the reach summary comes from the shared communication plan.

<a id="intake"></a>

### How do Forms, Responses and applications fit together?

Forms owns templates, drafts, the builder, publication, preview and sharing. Responses owns submitted-answer browsing and detail; application review is part of the same Audience intake boundary. Published form versions and response provenance preserve which questions someone answered. Analytics, exports and configured automation actions belong to the form workflow. A response, a contact conversion, and an application decision are separate records or actions. Ordinary form consent authorizes use of submitted answers for that form; it does not by itself grant marketing permission or event admission.

<a id="delivery"></a>

### Who enforces access, and where does messaging happen?

Server callables enforce organizer authorization; selecting an organizer in the UI is not an authorization boundary. Saved-audience operations require an authenticated organizer manager. Participant-controlled communication permission, verified identity, and organizer suppression remain separate authorities. Audience hands a saved audience or eligible contact context to Inbox, which owns composition, sender setup and delivery. Membership alone does not grant permission to send. The People-to-Inbox segment shortcut requires a scoped eligible selection; a generic all-contacts view or live search is not a substitute for a saved audience.

### Schema reference

| Declared constraint | Value | Source |
|---|---|---|
| Rule matching operators | `["all","any"]` | [organizer_saved_audiences.schema.json](../../../contracts/firestore/organizer_saved_audiences.schema.json) `/definitions/definition/properties/join/enum` |
| Maximum predicates per definition | `8` | [organizer_saved_audiences.schema.json](../../../contracts/firestore/organizer_saved_audiences.schema.json) `/definitions/definition/properties/predicates/maxItems` |
| Maximum explicitly selected contact IDs | `2500` | [organizer_saved_audiences.schema.json](../../../contracts/firestore/organizer_saved_audiences.schema.json) `/definitions/staticMembersPredicate/properties/contactIds/maxItems` |
| Maximum saved-audience name length | `80` | [organizer_saved_audiences.schema.json](../../../contracts/firestore/organizer_saved_audiences.schema.json) `/properties/name/maxLength` |
| Maximum preview page size | `25` | [preview_organizer_saved_audience_payload.schema.json](../../../contracts/callables/preview_organizer_saved_audience_payload.schema.json) `/properties/sampleLimit/maximum` |

These are schema declarations, not independent proof of runtime limits.

<details>
<summary>Sources and named examples for each answer</summary>

**What does Audience do?**

- Source: [lib/hosts/presentation/host_audience_view.dart](../presentation/host_audience_view.dart)
- Source: [lib/hosts/presentation/customers/host_customers_screen.dart](../presentation/customers/host_customers_screen.dart)
- Source: [lib/hosts/presentation/forms/host_forms_screen.dart](../presentation/forms/host_forms_screen.dart)
- Source: [lib/routing/go_router.dart](../../routing/go_router.dart)
- Source: [lib/routing/shell/host_app_shell.dart](../../routing/shell/host_app_shell.dart)

**What can a host do with People?**

- Source: [lib/hosts/presentation/customers](../presentation/customers)
- Source: [functions/src/organizers/organizerContacts.ts](../../../functions/src/organizers/organizerContacts.ts)
- Source: [contracts/callables/create_organizer_contact_payload.schema.json](../../../contracts/callables/create_organizer_contact_payload.schema.json)
- Source: [functions/src/shared/organizerContactOrigins.ts](../../../functions/src/shared/organizerContactOrigins.ts)
- Example: [functions/src/organizers/organizerContacts.test.ts](../../../functions/src/organizers/organizerContacts.test.ts) — manual contacts require at least one identity endpoint

**How is saved-audience membership decided?**

- Source: [contracts/firestore/organizer_saved_audiences.schema.json](../../../contracts/firestore/organizer_saved_audiences.schema.json)
- Source: [lib/hosts/presentation/customers/host_saved_audience_editor.dart](../presentation/customers/host_saved_audience_editor.dart)
- Source: [functions/src/organizers/organizerSavedAudiences.ts](../../../functions/src/organizers/organizerSavedAudiences.ts)
- Source: [functions/src/organizers/organizerSavedAudienceSources.ts](../../../functions/src/organizers/organizerSavedAudienceSources.ts)
- Source: [functions/src/organizers/organizerSavedAudienceMembership.ts](../../../functions/src/organizers/organizerSavedAudienceMembership.ts)
- Source: [functions/src/organizers/eventRosterInsights.ts](../../../functions/src/organizers/eventRosterInsights.ts)
- Example: [functions/src/organizers/organizerSavedAudienceMembership.test.ts](../../../functions/src/organizers/organizerSavedAudienceMembership.test.ts) — spend uses completion time, current refunds, currency and ownership
- Example: [functions/src/organizers/organizerSavedAudienceMembership.test.ts](../../../functions/src/organizers/organizerSavedAudienceMembership.test.ts) — static lists follow merges, exclude deleted people and keep empty lists

**Are audience counts and member lists live?**

- Source: [functions/src/organizers/organizerSavedAudiences.ts](../../../functions/src/organizers/organizerSavedAudiences.ts)
- Source: [functions/src/organizers/organizerSavedAudienceMembers.ts](../../../functions/src/organizers/organizerSavedAudienceMembers.ts)
- Source: [functions/src/organizers/organizerAudienceCoverage.ts](../../../functions/src/organizers/organizerAudienceCoverage.ts)
- Source: [lib/hosts/presentation/customers/host_saved_audience_members_controller.dart](../presentation/customers/host_saved_audience_members_controller.dart)
- Source: [lib/hosts/presentation/customers/host_saved_audience_section.dart](../presentation/customers/host_saved_audience_section.dart)
- Example: [functions/src/organizers/organizerSavedAudienceMembers.test.ts](../../../functions/src/organizers/organizerSavedAudienceMembers.test.ts) — changed members, rule revision and foreign scope invalidate the cursor

**How do Forms, Responses and applications fit together?**

- Source: [lib/hosts/presentation/forms](../presentation/forms)
- Source: [lib/hosts/presentation/applications](../presentation/applications)
- Source: [functions/src/organizers/organizerForms.ts](../../../functions/src/organizers/organizerForms.ts)
- Source: [contracts/shared/organizer_form_common.schema.json](../../../contracts/shared/organizer_form_common.schema.json)
- Source: [contracts/shared/organizer_form_response_common.schema.json](../../../contracts/shared/organizer_form_response_common.schema.json)
- Example: [test/hosts/forms/host_form_test.dart](../../../test/hosts/forms/host_form_test.dart) — response pages preserve provenance, pagination, and conversions

**Who enforces access, and where does messaging happen?**

- Source: [functions/src/organizers/organizerSavedAudiences.ts](../../../functions/src/organizers/organizerSavedAudiences.ts)
- Source: [functions/src/shared/organizerCommunicationPreferences.ts](../../../functions/src/shared/organizerCommunicationPreferences.ts)
- Source: [lib/hosts/presentation/customers/host_customers_screen_state.dart](../presentation/customers/host_customers_screen_state.dart)
- Source: [lib/hosts/presentation/customers/host_customers_screen.dart](../presentation/customers/host_customers_screen.dart)
- Source: [tool/architecture/check_host_crm_boundaries.mjs](../../../tool/architecture/check_host_crm_boundaries.mjs)
- Example: [functions/src/organizers/organizerSavedAudienceMembership.test.ts](../../../functions/src/organizers/organizerSavedAudienceMembership.test.ts) — selected resolution authorizes and hides missing data
- Example: [test/hosts/host_customers_screen_state_test.dart](../../../test/hosts/host_customers_screen_state_test.dart) — campaign bridge stays hidden for all customers and live search

</details>

## Ownership

- Primary route: `hostAudienceScreen` (`/host/audience`)
- Target root: `lib/hosts/audience`
- Migration status: target boundary defined; implementation still lives in listed legacy Host roots
- Responsibility contract updated: 2026-09-22
- Product guide updated: 2026-09-05

Current implementation roots:

- `lib/hosts/presentation/customers`
- `lib/hosts/presentation/forms`
- `lib/hosts/presentation/applications`

## This feature owns

- Own the /host/audience destination and its People, Audiences, Forms, and Responses peer modes; Forms must not return as a global tab.
- Own customer directory, identity, private memory, tags, notes, attendance history, merge review, and contact administration.
- Own reusable audience definitions, exact previews, reach summaries, archive, and the vocabulary that decides who belongs to a group.
- Own form templates, drafts, builder state, publication, share links, responses, analytics, exports, and automation configuration or recovery.
- Own organizer application queues and review routing as participant intake.
- Pass saved-audience or contact identity to Inbox without implementing message delivery.

## This feature does not own

- Conversation threads, campaign delivery, provider send adapters, or sender onboarding; those belong to Inbox.
- Event inventory, event-management mutations, organizer profile settings, or payout setup.
- Inferred marketing permission or claims of complete external-provider spending from CRM membership or canonical Catch payments.

## Routes

Owned routes:

- `hostAudienceScreen` — `/host/audience`
- `hostAddCustomerScreen` — `/host/audience/people/new`
- `hostCreateSavedAudienceScreen` — `/host/audience/audiences/new`
- `hostSavedAudienceDetailScreen` — `/host/audience/audiences/:audienceId`
- `hostFormTemplatesScreen` — `/host/audience/forms/new`
- `hostFormResponseDetailScreen` — `/host/audience/responses/:responseId`
- `hostFormBuilderScreen` — `/host/audience/forms/:formId`
- `hostFormPreviewScreen` — `/host/audience/forms/:formId/preview`
- `hostFormShareScreen` — `/host/audience/forms/:formId/share`
- `hostFormAnalyticsScreen` — `/host/audience/forms/:formId/analytics`
- `hostFormAutomationsScreen` — `/host/audience/forms/:formId/automations`
- `hostAudienceAutomationsScreen` — `/host/audience/automations`
- `hostApplicationDetailScreen` — `/host/audience/applications/:applicationId`
- `hostCustomerDetailScreen` — `/host/audience/people/:contactId`

Typed handoffs:

- `hostInboxScreen` — `/host/inbox`
- `hostAppEventDetailScreen` — `/host/organizers/:organizerId/events/:eventId`

## Key code owners

| Owner | Source | Responsibility |
|---|---|---|
| `HostCustomersScreen` | `lib/hosts/presentation/customers/host_customers_screen.dart` | Feature-contract actions: switch_customers_view, open_saved_audience_create, retry_directory, switch_organizer, search_customers, open_customer_filters, filter_customers, sort_customers, message_filtered_customers, review_whatsapp_sender_setup, open_customer, review_duplicate_customers. |
| `HostSavedAudiencesWorkspace` | `lib/hosts/presentation/customers/host_saved_audiences_workspace.dart` | Feature-contract actions: search_saved_audiences, open_saved_audience_detail. |
| `HostSavedAudienceEditorScreen` | `lib/hosts/presentation/customers/host_saved_audience_editor.dart` | Feature-contract actions: save_saved_audience, archive_saved_audience. |
| `HostAddCustomerScreen` | `lib/hosts/presentation/customers/host_customer_editor.dart` | Structural owner from feature.host_customers. |
| `HostCustomersDirectoryController` | `lib/hosts/presentation/customers/host_customers_controller.dart` | Feature-contract actions: load_more. |
| `HostCustomersController` | `lib/hosts/presentation/customers/host_customers_controller.dart` | Feature-contract actions: export_customers, create_customer, manage_customer, start_conversation. |
| `HostCustomerDetailScreen` | `lib/hosts/presentation/customers/host_customer_detail_screen.dart` | Feature-contract actions: open_customer_event, undo_customer_merge, retry_customer_detail, open_personal_whatsapp_handoff. |
| `HostCustomerMemorySection` | `lib/hosts/presentation/customers/host_customer_memory_section.dart` | Feature-contract actions: edit_contact_tags, create_contact_note, edit_contact_note. |
| `HostContactMergeReviewSheet` | `lib/hosts/presentation/customers/host_contact_merge_review_sheet.dart` | Feature-contract actions: decide_duplicate_customer. |
| `HostAudienceView` | `lib/hosts/presentation/host_audience_view.dart` | Closed peer-mode vocabulary for People, Audiences, Forms, and Responses. |
| `HostFormsScreen` | `lib/hosts/presentation/forms/host_forms_screen.dart` | Forms and Responses route composition inside Audience. |
| `HostFormsDirectoryController` | `lib/hosts/presentation/forms/host_forms_controller.dart` | Organizer form inventory state. |
| `HostFormEditorController` | `lib/hosts/presentation/forms/host_forms_controller.dart` | Draft/editor state and publication actions. |
| `HostFormResponsesController` | `lib/hosts/presentation/forms/host_form_operations_controller.dart` | Response list and review-facing projection. |
| `HostFormAutomationsController` | `lib/hosts/presentation/forms/host_form_operations_controller.dart` | Automation configuration and run recovery. |
| `HostApplicationsDirectoryController` | `lib/hosts/presentation/applications/host_applications_controller.dart` | Organizer application intake queue. |

## Shared dependencies

- `lib/contexts/audience/data/crm/host_contacts_repository.dart` — Owns organizer contacts, customer context, notes, and merge review.
- `lib/contexts/audience/data/crm/host_saved_audience_repository.dart` — Owns reusable audience definitions, filter options, membership resolution, and previews.
- `lib/contexts/forms/data/host_forms_repository.dart` — Current shared Host data seam for forms, responses, exports, and automations until A3 relocates it.
- `lib/routing/shell/host_app_shell.dart` — The shell owns global destination navigation and organizer scope.

## Data contracts

- `contracts/callable_responses/create_organizer_contact_response.schema.json`
- `contracts/callable_responses/export_organizer_contacts_response.schema.json`
- `contracts/callable_responses/get_organizer_contact_detail_response.schema.json`
- `contracts/callable_responses/list_organizer_contact_merge_candidates_response.schema.json`
- `contracts/callable_responses/list_organizer_contacts_response.schema.json`
- `contracts/callable_responses/list_organizer_saved_audiences_response.schema.json`
- `contracts/callable_responses/mutate_organizer_contact_response.schema.json`
- `contracts/callable_responses/organizer_contact_note_response.schema.json`
- `contracts/callable_responses/organizer_messaging_setup_response.schema.json`
- `contracts/callable_responses/organizer_saved_audience_response.schema.json`
- `contracts/callable_responses/preview_organizer_saved_audience_response.schema.json`
- `contracts/callable_responses/review_organizer_contact_merge_candidate_response.schema.json`
- `contracts/callables/archive_organizer_saved_audience_payload.schema.json`
- `contracts/callables/create_organizer_contact_note_payload.schema.json`
- `contracts/callables/create_organizer_contact_payload.schema.json`
- `contracts/callables/export_organizer_contacts_payload.schema.json`
- `contracts/callables/get_organizer_contact_detail_payload.schema.json`
- `contracts/callables/list_organizer_contact_merge_candidates_payload.schema.json`
- `contracts/callables/list_organizer_contacts_payload.schema.json`
- `contracts/callables/list_organizer_saved_audiences_payload.schema.json`
- `contracts/callables/mutate_organizer_contact_note_payload.schema.json`
- `contracts/callables/mutate_organizer_contact_payload.schema.json`
- `contracts/callables/preview_organizer_saved_audience_payload.schema.json`
- `contracts/callables/review_organizer_contact_merge_candidate_payload.schema.json`
- `contracts/callables/start_organizer_contact_conversation_payload.schema.json`
- `contracts/callables/upsert_organizer_saved_audience_payload.schema.json`
- `contracts/firestore/organizer_applications.schema.json`
- `contracts/firestore/organizer_contact_channel_states.schema.json`
- `contracts/firestore/organizer_contact_event_edges.schema.json`
- `contracts/firestore/organizer_contact_merge_receipts.schema.json`
- `contracts/firestore/organizer_contact_merge_review_decisions.schema.json`
- `contracts/firestore/organizer_contact_notes.schema.json`
- `contracts/firestore/organizer_contact_tag_vocabularies.schema.json`
- `contracts/firestore/organizer_contact_traits.schema.json`
- `contracts/firestore/organizer_contacts.schema.json`
- `contracts/firestore/organizer_form_automation_rules.schema.json`
- `contracts/firestore/organizer_form_automation_runs.schema.json`
- `contracts/firestore/organizer_form_responses.schema.json`
- `contracts/firestore/organizer_form_versions.schema.json`
- `contracts/firestore/organizer_forms.schema.json`
- `contracts/firestore/organizer_saved_audiences.schema.json`
- `contracts/firestore/payments.schema.json`
- `contracts/shared/organizer_form_common.schema.json`
- `contracts/shared/organizer_form_response_common.schema.json`

## Focused tests

- `test/hosts/host_customers_screen_state_test.dart`
- `test/hosts/forms/host_forms_screen_test.dart`
- `test/hosts/forms/host_form_builder_screen_test.dart`
- `test/hosts/forms/host_form_response_detail_screen_test.dart`
- `test/hosts/host_operations_screen_test.dart`

## Maintenance

Do not edit this file directly. Update `design/features/host_feature_responsibilities.json`, then run:

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
```

The generator cross-checks the Host shell order, typed route contract, feature-contract action owners, Dart symbols, data-contract paths, and focused tests.

Product answers live in this feature's `guide` in the same responsibility contract. Edit that source, never the generated README. Update the guide date when its explanation changes. To retrieve the guide or review change impact:

```sh
node tool/design/build_host_feature_responsibilities.mjs --explain audience
node tool/design/build_host_feature_responsibilities.mjs --explain audience --question membership --json
node tool/design/build_host_feature_responsibilities.mjs --affected audience --base origin/main --json
node tool/run.mjs check design:host-feature-responsibilities audit:host-crm-boundaries
```

Impact is an explicit, read-only PR review command. It compares the base with the tracked working tree plus untracked non-ignored files, using section dependencies from both versions. It reports relevant changes even if a source or dependency was removed. It does not traverse every import or certify unchanged prose. The registered generator check blocks stale generated output and broken guide references; prose impact remains advisory. Review each affected answer against the change and update it, or explain why it remains accurate in the PR. Run the linked behavior suites when their implementation changes. No review stamps, generated history, or dependency snapshots are committed.
