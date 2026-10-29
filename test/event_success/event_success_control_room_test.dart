import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_workspace_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_room_map.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;
import '../test_pump_helpers.dart';
import '../ui_captures/catalog/screen_capture_catalog.dart'
    show findScreenCapture;

void main() {
  testWidgets(
    'report waiting state uses the shared quiet section and full content lane',
    (tester) async {
      final event = buildEvent(id: 'waiting-report');
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventSuccessHostWorkspacePageBody(
                event: event,
                plan: plan,
                planIsPersisted: true,
                roster: EventParticipationRoster.empty(),
                initialTab: EventSuccessHostTab.report,
                showTabs: false,
                embedded: true,
              ),
            ),
          ),
        ),
      );

      final waiting = find.text('Waiting for attendee feedback');
      expect(waiting, findsOneWidget);
      final section = find.byKey(const ValueKey('event-success-report-status'));
      expect(section, findsOneWidget);
      final surface = tester.widget<CatchSurface>(
        find.descendant(of: section, matching: find.byType(CatchSurface)),
      );
      expect(surface.tone, CatchSurfaceTone.primarySoft);
      expect(
        find.descendant(of: section, matching: find.byType(CatchEmptyState)),
        findsNothing,
      );
      final bounds = tester.getRect(section);
      final message = tester.getRect(
        find.text(
          'The post-event report appears once checked-in attendees share feedback. '
          'There is no signal to summarize yet.',
        ),
      );
      final heading = tester.getRect(waiting);
      expect(message.left, bounds.left + CatchSpacing.s4);
      expect(message.width, bounds.width - CatchSpacing.s4 * 2);
      expect(message.top, greaterThan(heading.bottom));
    },
  );

  testWidgets('restart mid-round resumes the correct persisted beat', (
    tester,
  ) async {
    final event = buildEvent(
      id: 'restart-control-room',
      eventFormat: const EventFormatSnapshot(
        activityKind: ActivityKind.pubQuiz,
        interactionModel: EventInteractionModel.hostLedProgram,
        customActivityLabel: 'host-led social',
        defaultPlaybookId: 'host_led_social',
      ),
    );
    final persisted =
        EventSuccessPlan.defaultForEvent(event, now: event.startTime).copyWith(
          status: EventSuccessPlanStatus.live,
          activeStepIndex: 2,
          liveControlRevision: 9,
          assignmentDraftRevision: 3,
          publishedRotationRoundIndex: 1,
          publishedRevealRoundIndex: 1,
        );

    Future<void> pumpControlRoom(EventSuccessPlan plan) => tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              roster: EventParticipationRoster.empty(),
              initialTab: EventSuccessHostTab.live,
              showTabs: false,
              compactLiveControls: true,
              onSetLiveStep: (_) async {},
              onCompleteLiveGuide: (_) async {},
            ),
          ),
        ),
      ),
    );

    await pumpControlRoom(persisted);
    expect(find.textContaining('Step 3 of 4'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    final restarted = EventSuccessPlan.fromJson({
      ...persisted.toJson(),
      'id': persisted.id,
    });
    await pumpControlRoom(restarted);

    expect(restarted.liveControlRevision, 9);
    expect(restarted.publishedRotationRoundIndex, 1);
    expect(find.textContaining('Step 3 of 4'), findsOneWidget);
    expect(find.textContaining('Step 1 of 4'), findsNothing);
  });

  testWidgets(
    'compact Control Room fits the first viewport with an external-only roster',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 812);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent(
        id: 'external-only-control-room',
        eventFormat: const EventFormatSnapshot(
          activityKind: ActivityKind.pubQuiz,
          interactionModel: EventInteractionModel.hostLedProgram,
          customActivityLabel: 'host-led social',
          defaultPlaybookId: 'host_led_social',
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(status: EventSuccessPlanStatus.live, activeStepIndex: 1);
      var guestDrawerOpenCount = 0;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventSuccessHostWorkspacePageBody(
                event: event,
                plan: plan,
                planIsPersisted: true,
                roster: EventParticipationRoster.empty(),
                operationalRosterSummary:
                    const EventSuccessOperationalRosterSummary(
                      checkedInCount: 18,
                      expectedCount: 24,
                    ),
                initialTab: EventSuccessHostTab.live,
                showTabs: false,
                compactLiveControls: true,
                onSetLiveStep: (_) async {},
                onCompleteLiveGuide: (_) async {},
                onOpenGuests: () => guestDrawerOpenCount += 1,
              ),
            ),
          ),
        ),
      );

      expect(find.textContaining('LIVE NOW'), findsOneWidget);
      expect(find.textContaining('SYNCED'), findsOneWidget);
      expect(find.textContaining('Step 2 of 4'), findsOneWidget);
      expect(find.text('18 checked in · 24 expected'), findsOneWidget);
      expect(find.text('Guests'), findsNWidgets(2));
      expect(find.text('Help & fallback'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.primary,
        ),
        findsOneWidget,
      );
      expect(
        tester
            .getBottomRight(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchDock &&
                    widget.variant == CatchDockVariant.primary,
              ),
            )
            .dy,
        lessThanOrEqualTo(812),
      );

      await tester.tap(
        find.descendant(
          of: find.byType(EventSuccessLiveWorkspaceTabBar),
          matching: find.text('Guests'),
        ),
      );
      await tester.pump();
      expect(guestDrawerOpenCount, 1);

      await tester.tap(find.text('Room'));
      await tester.pump();
      expect(find.text('One shared room'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.primary,
        ),
        findsNothing,
      );
    },
  );

  testWidgets(
    'wide Control Room keeps command and supporting operations concurrent',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1180, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final event = buildEvent(
        id: 'wide-control-room',
        eventFormat: const EventFormatSnapshot(
          activityKind: ActivityKind.pubQuiz,
          interactionModel: EventInteractionModel.hostLedProgram,
          customActivityLabel: 'host-led social',
          defaultPlaybookId: 'host_led_social',
        ),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(status: EventSuccessPlanStatus.live, activeStepIndex: 1);
      var guestDrawerOpenCount = 0;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventSuccessHostWorkspacePageBody(
                event: event,
                plan: plan,
                planIsPersisted: true,
                roster: EventParticipationRoster.empty(),
                operationalRosterSummary:
                    const EventSuccessOperationalRosterSummary(
                      checkedInCount: 18,
                      expectedCount: 24,
                    ),
                initialTab: EventSuccessHostTab.live,
                showTabs: false,
                compactLiveControls: true,
                onSetLiveStep: (_) async {},
                onCompleteLiveGuide: (_) async {},
                onOpenGuests: () => guestDrawerOpenCount += 1,
              ),
            ),
          ),
        ),
      );

      final commandPane = find.byKey(
        const ValueKey<String>('event_success.live.command_pane'),
      );
      final supportingPane = find.byKey(
        const ValueKey<String>('event_success.live.supporting_pane'),
      );
      expect(
        find.byKey(const ValueKey<String>('event_success.live.wide_workspace')),
        findsOneWidget,
      );
      expect(commandPane, findsOneWidget);
      expect(supportingPane, findsOneWidget);
      expect(
        tester.getRect(supportingPane).width,
        CatchLayout.hostEventLiveSupportingPaneWidth,
      );
      expect(
        tester.getRect(commandPane).right,
        lessThanOrEqualTo(tester.getRect(supportingPane).left),
      );
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.primary,
        ),
        findsOneWidget,
      );
      expect(find.text('18 checked in · 24 expected'), findsOneWidget);

      await tester.tap(
        find.descendant(of: supportingPane, matching: find.text('Guests')),
      );
      await tester.pump();
      expect(guestDrawerOpenCount, 1);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: Scaffold(
              body: EventSuccessHostWorkspacePageBody(
                event: event,
                plan: plan,
                planIsPersisted: true,
                roster: EventParticipationRoster.empty(),
                operationalRosterSummary:
                    const EventSuccessOperationalRosterSummary(
                      checkedInCount: 18,
                      expectedCount: 24,
                    ),
                initialTab: EventSuccessHostTab.live,
                showTabs: false,
                compactLiveControls: true,
                onSetLiveStep: (_) async {},
                onCompleteLiveGuide: (_) async {},
                onOpenGuests: () => guestDrawerOpenCount += 1,
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const ValueKey<String>('event_success.live.wide_workspace')),
        findsNothing,
      );
      expect(supportingPane, findsNothing);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchDock && widget.variant == CatchDockVariant.primary,
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Room workspace renders the saved map before placements exist', (
    tester,
  ) async {
    final event = buildEvent(
      id: 'saved-room-control-room',
      eventFormat: EventFormatSnapshot.custom(
        label: 'Table mixer',
        interactionModel: EventInteractionModel.pairedRotations,
      ),
    );
    final layout = EventSuccessLayout.parametric(
      layoutId: 'room-a',
      label: 'Room A',
      shape: EventSuccessLayoutShape.round,
      unitCount: 6,
      unitCapacity: 4,
      columnCount: 2,
    );
    final plan = EventSuccessPlan.defaultForEvent(
      event,
      now: event.startTime,
    ).copyWith(status: EventSuccessPlanStatus.live, layoutId: layout.layoutId);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostWorkspacePageBody(
              event: event,
              plan: plan,
              planIsPersisted: true,
              roster: EventParticipationRoster.empty(),
              initialTab: EventSuccessHostTab.live,
              showTabs: false,
              compactLiveControls: true,
              spatialLayout: layout,
              spatialLayoutState: EventSuccessSpatialLayoutState.ready(layout),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Room'));
    await tester.pump();

    expect(find.text('6 tables · 24 seats'), findsOneWidget);
    expect(find.text('Waiting for placements'), findsOneWidget);
  });
  testWidgets('Room forwards initial selection and typed spatial actions', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final event = buildEvent(
      eventFormat: EventFormatSnapshot.custom(
        label: 'Table mixer',
        interactionModel: EventInteractionModel.pairedRotations,
      ),
    );
    final layout = EventSuccessLayout.parametric(
      label: 'Room A',
      shape: EventSuccessLayoutShape.round,
      unitCount: 2,
      unitCapacity: 4,
      columnCount: 2,
    );
    final assignment = EventSuccessAssignment(
      id: 'placement',
      eventId: event.id,
      clubId: event.clubId,
      uid: 'guest',
      moduleId: 'micro_pods',
      label: 'Table 1',
      displayTitle: 'Guest',
      peerUids: const [],
      source: 'test',
      layoutUnitId: layout.units.first.id,
      createdAt: event.startTime,
      updatedAt: event.startTime,
    );
    final calls = <Object>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: EventSuccessHostWorkspacePageBody(
            event: event,
            plan: EventSuccessPlan.defaultForEvent(event, now: event.startTime),
            planIsPersisted: true,
            roster: EventParticipationRoster.empty(),
            initialTab: EventSuccessHostTab.live,
            showTabs: false,
            compactLiveControls: true,
            initialLiveWorkspace: EventSuccessLiveWorkspace.room,
            spatialLayout: layout,
            spatialLayoutState: EventSuccessSpatialLayoutState.ready(layout),
            assignments: [assignment],
            initialSpatialSelectionUid: assignment.uid,
            onPreviewSpatial: (value) async {
              calls.add(value);
              return [
                EventSuccessSpatialDestination(
                  unitId: layout.units.last.id,
                  valid: true,
                  reason: null,
                  recommendedScope: EventSuccessSpatialScope.thisRound,
                ),
              ];
            },
            onReassignSpatial: (value, unit, scope) async =>
                calls.add([value, unit, scope]),
            onConfirmSpatial: (value) async => calls.add(['confirm', value]),
            onReleaseSpatial: (value) async => calls.add(['release', value]),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(calls, [same(assignment)]);
    final map = tester.widget<EventSuccessRoomMap>(
      find.byType(EventSuccessRoomMap),
    );
    expect(map.initialSelectedUid, assignment.uid);
    await map.onReassign!(
      assignment,
      layout.units.last.id,
      EventSuccessSpatialScope.thisRound,
    );
    await map.onConfirmPosition!(assignment);
    await map.onReleasePinned!(assignment);
    expect(calls, [
      same(assignment),
      [
        same(assignment),
        layout.units.last.id,
        EventSuccessSpatialScope.thisRound,
      ],
      ['confirm', same(assignment)],
      ['release', same(assignment)],
    ]);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'real Host room fixture forwards spatial callbacks through its shell',
    (tester) async {
      tester.view.physicalSize = const Size(430, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final fixture = findScreenCapture('host_live_room_workspace');
      await tester.pumpWidget(
        ProviderScope(
          overrides: [...fixture.providerOverrides],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(body: Builder(builder: fixture.builder)),
          ),
        ),
      );
      await pumpUntilFound(
        tester,
        find.byType(EventSuccessHostWorkspacePageBody),
      );
      final shell = tester.widget<HostEventManageScreen>(
        find.byType(HostEventManageScreen),
      );
      final workspace = tester.widget<EventSuccessHostWorkspacePageBody>(
        find.byType(EventSuccessHostWorkspacePageBody),
      );
      expect(
        workspace.initialSpatialSelectionUid,
        shell.initialSpatialSelectionUid,
      );
      expect(workspace.onPreviewSpatial, same(shell.onPreviewSpatial));
      expect(workspace.onReassignSpatial, same(shell.onReassignSpatial));
      expect(workspace.onConfirmSpatial, same(shell.onConfirmSpatial));
      expect(workspace.onReleaseSpatial, same(shell.onReleaseSpatial));
      await tester.tap(find.text('Room'));
      await pumpUntilFound(tester, find.byType(EventSuccessRoomMap));
      await tester.pump();
      final map = tester.widget<EventSuccessRoomMap>(
        find.byType(EventSuccessRoomMap),
      );
      expect(map.initialSelectedUid, shell.initialSpatialSelectionUid);
      final guest = map.assignments.singleWhere(
        (a) => a.uid == map.initialSelectedUid,
      );
      final destinations = await map.onPreview!(guest);
      expect(destinations.where((d) => d.valid).map((d) => d.unitId), [
        'round-4',
        'round-5',
        'round-6',
      ]);
      expect(
        destinations.first.reason,
        EventSuccessSpatialDestinationReason.declaredConstraint,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await fixture.cleanup?.call(tester);
    },
  );
}
