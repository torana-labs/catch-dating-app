import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_notice_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_text.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_group_rotation_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_pod_assignment_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_action_row.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_header.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_progress_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_waiting_notice.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_rotation_row_list.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'EventSuccessAssignmentSurface',
  type: EventSuccessAssignmentSurface,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictAssignmentUnlockedShell(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessAssignmentSurface',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessAssignmentSurface(
          title: 'Unlocked together',
          child: const Text('Your assignment is ready.'),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownSurface',
  type: EventSuccessCountdownSurface,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictAttendeeCountdown(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownSurface',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessCountdownSurface(
          plan: EventSuccessCompanionFixtures.revealCountingDownPlan,
          now: EventSuccessCompanionFixtures.racketStart.subtract(
            const Duration(seconds: 1),
          ),
          kind: EventSuccessRevealAssignmentKind.rotations,
          clue: 'A shared clue is ready.',
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownStepper',
  type: EventSuccessCountdownStepper,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictCountdownBeatRail(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownStepper',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessCountdownStepper(
          items: [
            (label: 'Hold', icon: CatchIcons.tap),
            (label: 'Watch', icon: CatchIcons.show),
            (label: 'Move', icon: CatchIcons.instant),
          ],
          currentIndex: 1,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownNotice',
  type: EventSuccessCountdownNotice,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictCountdownCuePill(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownNotice',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessCountdownNotice(
          icon: CatchIcons.hide,
          title: 'No names shown yet',
          body: 'Partner details stay locked.',
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownNoticeRowList',
  type: EventSuccessCountdownNoticeRowList,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictCountdownCueStack(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownNoticeRowList',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessCountdownNoticeRowList(
          clue: 'A shared clue is ready.',
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownText',
  type: EventSuccessCountdownText,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictCountdownNumber(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownText',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessCountdownText(value: '9', caption: 'SECONDS'),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessCountdownIndicator',
  type: EventSuccessCountdownIndicator,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictCountdownStageDial(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessCountdownIndicator',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessCountdownIndicator(
          seconds: 9,
          progress: 0.4,
          intensity: 0.38,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessAttendeeRevealSurface',
  type: EventSuccessAttendeeRevealSurface,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictEventSuccessLiveRevealAttendeeCard(
  BuildContext context,
) => WidgetbookCatalogFrame(
  title: 'EventSuccessAttendeeRevealSurface',
  catalogId: 'Event Success reveal',
  children: [
    EventSuccessAttendeeRevealSurface(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
      kind: EventSuccessRevealAssignmentKind.rotations,
      assignment: EventSuccessCompanionFixtures.rotationAssignment,
      peerProfiles: EventSuccessCompanionFixtures.peers,
      peersLoading: false,
      optedOut: false,
      onIncludeChanged: (_) {},
      now: EventSuccessCompanionFixtures.racketStart,
    ),
  ],
);

@widgetbook.UseCase(
  name: 'EventSuccessHostRevealSurface',
  type: EventSuccessHostRevealSurface,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictEventSuccessLiveRevealHostCard(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostRevealSurface',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessHostRevealSurface(
          event: EventSuccessCompanionFixtures.racketEvent,
          plan: EventSuccessCompanionFixtures.revealCountingDownPlan,
          podAssignments: const [],
          rotationAssignments: [
            EventSuccessCompanionFixtures.rotationAssignment,
          ],
          preferences: const [],
          participantProfiles: EventSuccessCompanionFixtures.peers,
          now: EventSuccessCompanionFixtures.racketStart.subtract(
            const Duration(seconds: 1),
          ),
          onStartCountdown: (_, _) async {},
          onRevealRound: (_) async {},
          onResetReveal: () async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealActionRow',
  type: EventSuccessRevealActionRow,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictHostRevealActions(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealActionRow',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessRevealActionRow(
          roundCount: 3,
          nextRound: 1,
          activeRound: 0,
          countdownSeconds: 10,
          isCountingDown: false,
          allRevealed: false,
          isLoading: false,
          onStartCountdown: (_, _) async {},
          onRevealRound: (_) async {},
          onResetReveal: () async {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessGroupRotationRow',
  type: EventSuccessGroupRotationRow,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealGroupSlotRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupRotationRow',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessGroupRotationRow(
          slot: EventSuccessCompanionFixtures
              .tableAssignment
              .groupRotationSlots
              .first,
          profilesByUid: {
            for (final p in EventSuccessCompanionFixtures.peers) p.uid: p,
          },
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealHeader',
  type: EventSuccessRevealHeader,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealHostCopy(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealHeader',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessRevealHeader(
          headline: 'Create the next room-wide beat',
          body: 'Partner details unlock together.',
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealProgressIndicator',
  type: EventSuccessRevealProgressIndicator,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealProgressBar(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealProgressIndicator',
      catalogId: 'Event Success reveal',
      children: [const EventSuccessRevealProgressIndicator(progress: 0.4)],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealRoundRowList',
  type: EventSuccessRevealRoundRowList,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealRoundList(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealRoundRowList',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessRevealRoundRowList(
          config: 'Pairs · 15 min rounds · 10s reveal',
          roundCount: 3,
          revealedThrough: 1,
          assignments: [EventSuccessCompanionFixtures.rotationAssignment],
          profilesByUid: {
            for (final p in EventSuccessCompanionFixtures.peers) p.uid: p,
          },
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealRoundStepper',
  type: EventSuccessRevealRoundStepper,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealRoundRail(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealRoundStepper',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessRevealRoundStepper(
          roundCount: 3,
          activeRoundIndex: 1,
          revealedThrough: 0,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRotationRow',
  type: EventSuccessRotationRow,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealSlotRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRotationRow',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessRotationRow(
          slot: EventSuccessCompanionFixtures
              .rotationAssignment
              .rotationSlots
              .first,
          peerName: EventSuccessCompanionFixtures.peer.name,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessGroupRotationRowList',
  type: EventSuccessGroupRotationRowList,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictVisibleGroupRotationSlots(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessGroupRotationRowList',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessGroupRotationRowList(
          slots:
              EventSuccessCompanionFixtures.tableAssignment.groupRotationSlots,
          profilesByUid: {
            for (final p in EventSuccessCompanionFixtures.peers) p.uid: p,
          },
          peersLoading: false,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessPodAssignmentSection',
  type: EventSuccessPodAssignmentSection,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictVisiblePodAssignment(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessPodAssignmentSection',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessPodAssignmentSection(
          assignment: EventSuccessCompanionFixtures.microPodAssignment,
          peerProfiles: EventSuccessCompanionFixtures.peers,
          peersLoading: false,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRotationRowList',
  type: EventSuccessRotationRowList,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictVisibleRotationSlots(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRotationRowList',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessRotationRowList(
          slots: EventSuccessCompanionFixtures.rotationAssignment.rotationSlots,
          profilesByUid: {
            for (final p in EventSuccessCompanionFixtures.peers) p.uid: p,
          },
          peersLoading: false,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealWaitingNotice',
  type: EventSuccessRevealWaitingNotice,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictWaitingRevealCue(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealWaitingNotice',
      catalogId: 'Event Success reveal',
      children: [
        const EventSuccessRevealWaitingNotice(
          kind: EventSuccessRevealAssignmentKind.rotations,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'EventSuccessRevealRoundRow',
  type: EventSuccessRevealRoundRow,
  path:
      '[P1 product surfaces]/Event Success strict coverage/Live reveal components',
)
Widget eventSuccessStrictRevealRoundRow(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessRevealRoundRow',
      catalogId: 'Event Success reveal',
      children: [
        EventSuccessRevealRoundRowList(
          config: 'Pairs · 15 min rounds · 10s reveal',
          roundCount: 3,
          revealedThrough: 1,
          assignments: [EventSuccessCompanionFixtures.rotationAssignment],
          profilesByUid: {
            for (final p in EventSuccessCompanionFixtures.peers) p.uid: p,
          },
        ),
      ],
    );
