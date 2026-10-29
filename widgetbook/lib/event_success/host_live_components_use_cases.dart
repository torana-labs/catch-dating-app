import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_control_room_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_activity_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_help_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_resource_error_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_plan_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_accountability_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_stage_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_sync_badge.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_exclusion_alert_banner.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_host_live_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_presence_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_room_summary_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_step_action_row.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Contained spatial selection',
  type: EventSuccessAttendeeSpatialRow,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewSpatialAttendeeRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Spatial attendee',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessAttendeeSpatialRow(
          assignment: EventSuccessCompanionFixtures.microPodAssignment,
          profile: null,
          selected: true,
          pending: false,
          canDrag: false,
          onSelect: (_) async {},
        ),
      ],
    );

final _draft = EventSuccessHostDraft.fromFormat(
  EventSuccessCompanionFixtures.socialEvent.eventFormat,
);
final _livePlan = EventSuccessLivePlan.fromDraft(_draft);
final _layout = EventSuccessLayout.parametric(
  label: 'Room A',
  shape: EventSuccessLayoutShape.round,
  unitCount: 6,
  unitCapacity: 4,
  columnCount: 2,
);

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostLivePageBody,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictLiveTab(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostLivePageBody',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessHostLivePageBody(
          event: EventSuccessCompanionFixtures.socialEvent,
          plan: EventSuccessCompanionFixtures.basePlan,
          planIsPersisted: true,
          spatialLayout: null,
          spatialLayoutState:
              const EventSuccessSpatialLayoutState.notApplicable(),
          showRoomWorkspace: false,
          roster: EventParticipationRoster.empty(),
          assignments: [EventSuccessCompanionFixtures.microPodAssignment],
          assignmentParticipantProfiles: EventSuccessCompanionFixtures.peers,
          rotationAssignments: const [],
          rotationDraftAssignments: const [],
          rotationParticipantProfiles: const [],
          preferences: const [],
          wingmanRequests: const [],
          wingmanProfiles: const [],
          resourceFailures: const [],
          onRetryResource: (_) {},
          compactLiveControls: false,
          operationalRosterSummary: null,
          onOpenGuests: () {},
          actionState: const EventSuccessLiveActionState(),
          onPreviousStep: (_) async {},
          onNextStep: (_) async {},
          onCompleteGuide: (_) async {},
          microPodsGenerationState:
              const EventSuccessAssignmentGenerationActionState(),
          rotationsGenerationState:
              const EventSuccessAssignmentGenerationActionState(),
          onGenerateMicroPods: () async {},
          onGenerateGuidedRotations: () async {},
          onPublishGuidedRotationRound: (_) async {},
          onOverrideGroupAssignments: (_) async {},
          onOverrideGuidedRotations: (_) async {},
          onPreviewSpatial: null,
          onReassignSpatial: null,
          onConfirmSpatial: null,
          onReleaseSpatial: null,
          revealActionState: const EventSuccessRevealActionState(),
          onStartRevealCountdown: (_, _) async {},
          onRevealRound: (_) async {},
          onResetReveal: () async {},
          outcomeActionState: const EventSuccessOutcomeActionState(),
          onRecordOutcomes: null,
          exclusionAlertThreshold: const Duration(minutes: 5),
          exclusionReferenceNow: EventSuccessCompanionFixtures.now,
          embedded: true,
          referenceNow: EventSuccessCompanionFixtures.now,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessControlRoomPageBody,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictLiveNowConsole(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessControlRoomPageBody',
      catalogId: 'Event Success Host live',
      children: [
        SizedBox(
          height: 780,
          child: EventSuccessControlRoomPageBody(
            plan: _livePlan,
            event: EventSuccessCompanionFixtures.socialEvent,
            compactCopy: true,
            currentStepControls: const [],
            onPrevious: () {},
            onNext: () {},
            onComplete: () {},
            onOpenGuests: () {},
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessStepActionRow,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictLiveStepNavigation(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessStepActionRow',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessStepActionRow(
          plan: _livePlan,
          onPrevious: () {},
          onNext: () {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessAccountabilitySection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessAccountabilitySection(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessAccountabilitySection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessAccountabilitySection(
          attendees: const [],
          isLoading: false,
          isResolving: false,
          error: null,
          onResolve: (_, _) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessRoomSummarySection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessRoomSummarySection(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRoomSummarySection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessRoomSummarySection(
          layout: _layout,
          assignments: [EventSuccessCompanionFixtures.tableAssignment],
          attentionCount: 1,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessPresenceSection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessPresenceSection(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessPresenceSection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessPresenceSection(
          summary: const EventSuccessPresenceSummary(
            serverTimeMillis: 1,
            liveControlRevision: 1,
            nextRoundIndex: 1,
            policy: EventSuccessPresencePolicy(
              heartbeatIntervalSeconds: 30,
              presentWindowSeconds: 60,
              likelyDepartedAfterSeconds: 120,
            ),
            entries: [
              EventSuccessPresenceEntry(
                uid: 'departed-fixture',
                displayName: 'Sam',
                state: EventSuccessPresenceState.likelyDeparted,
                heartbeatAtMillis: 1,
              ),
            ],
            lateArrivals: [
              EventSuccessLateArrivalCandidate(
                uid: 'late-fixture',
                displayName: 'Jo',
                checkedInAtMillis: 1,
              ),
            ],
          ),
          presenceError: null,
          lateArrivalError: null,
          resolvingLateArrival: false,
          onRegenerate: () async {},
          onResolveLateArrival: (_) async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessExclusionAlertBanner,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessExclusionAlertBanner(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessExclusionAlertBanner',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessExclusionAlertBanner(
          attendeeUids: const [EventSuccessCompanionFixtures.viewerUid],
          trackingStartedAtByUid: const {},
          assignments: const [],
          trackingStartedAt: EventSuccessCompanionFixtures.now.subtract(
            const Duration(minutes: 10),
          ),
          trackingEndedAt: EventSuccessCompanionFixtures.now.add(
            const Duration(hours: 1),
          ),
          alertThreshold: const Duration(minutes: 5),
          referenceNow: EventSuccessCompanionFixtures.now,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessControlRoomStageSection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessControlRoomStageSection(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessControlRoomStageSection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessControlRoomStageSection(
          event: EventSuccessCompanionFixtures.socialEvent,
          plan: _livePlan,
          syncState: EventSuccessControlRoomSyncState.synced,
          nextStepTitle: 'Continue to the next beat',
          attendeeExperience: 'Follow the host’s next instruction.',
          showVenue: true,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessControlRoomSyncBadge,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessControlRoomSyncBadge(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessControlRoomSyncBadge',
      catalogId: 'Event Success Host live',
      children: [
        const EventSuccessControlRoomSyncBadge(
          state: EventSuccessControlRoomSyncState.synced,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostResourceErrorState,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessHostResourceErrorState(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostResourceErrorState',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessHostResourceErrorState(
          failure: EventSuccessHostResourceFailure(
            retryIntent: EventSuccessHostRetryIntent.roster,
            error: StateError('Fixture roster unavailable'),
          ),
          onRetry: () {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessLiveWorkspaceTabBar,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget previewEventSuccessLiveWorkspaceTabBar(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessLiveWorkspaceTabBar',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessLiveWorkspaceTabBar(
          selected: EventSuccessLiveWorkspace.now,
          onChanged: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostTabBar,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictEventSuccessTabPicker(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostTabBar',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessHostTabBar(
          selectedTab: EventSuccessHostTab.live,
          onChanged: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostTabPageBody,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictEventSuccessHostTabBody(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostTabPageBody',
      catalogId: 'Event Success Host live',
      children: [
        const EventSuccessHostTabPageBody(
          embedded: true,
          children: [Text('Current step'), Text('Supporting operations')],
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessPlanFieldLanes,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictPlanSummary(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessPlanFieldLanes',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessPlanFieldLanes(
          plan: EventSuccessCompanionFixtures.basePlan,
          draft: _draft,
          planIsPersisted: true,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessActivityFieldLanes,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictHostActivitySummary(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessActivityFieldLanes',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessActivityFieldLanes(
          profile: EventSuccessActivityProfile.forFormat(
            EventSuccessCompanionFixtures.socialEvent.eventFormat,
          ),
          draft: _draft,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessCompatibilitySection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictCompatibilitySignalHostCard(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCompatibilitySection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessCompatibilitySection(
          plan: EventSuccessCompanionFixtures.basePlan,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostHelpSection,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictWingmanRequestsHostCard(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostHelpSection',
      catalogId: 'Event Success Host live',
      children: [
        EventSuccessHostHelpSection(
          requests: [EventSuccessCompanionFixtures.wingmanRequest],
          profiles: EventSuccessCompanionFixtures.peers,
          rotationsEnabled: true,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: CatchPersonLayout,
  path: '[P1 product surfaces]/Event Success/Host live components',
)
Widget eventSuccessStrictWingmanRequestHostRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Host help request',
      catalogId: 'Event Success Host live',
      children: [
        CatchSection.containedRows(
          children: [
            CatchField.read(
              content: eventSuccessHostHelpLayout(
                context,
                request: EventSuccessCompanionFixtures.wingmanRequest,
                requester: null,
                target: EventSuccessCompanionFixtures.peer,
              ),
            ),
          ],
        ),
      ],
    );
