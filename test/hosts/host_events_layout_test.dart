import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/widgets/host_events_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import '../clubs/clubs_test_helpers.dart';
import '../test_pump_helpers.dart';

final _now = DateTime(2026, 9, 4, 12);
const _longTitle = 'Friday Evening Trivia Night at The Daily Bar';
final _club = buildClub();

void main() {
  setUpAll(() => initializeDateFormatting('en'));
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    for (final dark in [false, true]) {
      for (final scale in [1.0, 2.0]) {
        testWidgets(
          'Events reflows and pins its rail $platform dark=$dark scale=$scale',
          (tester) async {
            tester.view.physicalSize = const Size(320, 800);
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);
            final events = [
              for (var index = 0; index < 12; index++)
                buildEvent(
                  id: 'event-$index',
                  startTime: DateTime(2026, 9, 4 + index, 18),
                  endTime: DateTime(2026, 9, 4 + index, 20),
                ).copyWith(name: _longTitle),
            ];
            var opened = '';
            await _pump(
              tester,
              state: HostEventsWorkspaceState.fromEvents(
                events: events,
                now: _now,
              ),
              platform: platform,
              dark: dark,
              scale: scale,
              onOpen: (id) => opened = id,
            );
            expect(find.text('Upcoming'), findsOneWidget);
            expect(find.text('Past'), findsOneWidget);
            expect(find.text('TODAY · FRI, 4 SEP'), findsOneWidget);
            final firstRow = find.byWidgetPredicate(
              (widget) =>
                  widget is CatchField &&
                  widget.key == const ValueKey('host-event-row-event-0'),
            );
            expect(
              find.descendant(
                of: firstRow,
                matching: find.textContaining('18:00'),
              ),
              findsOneWidget,
            );
            expect(
              find.descendant(
                of: firstRow,
                matching: find.textContaining('registered'),
              ),
              findsOneWidget,
            );
            for (final element
                in find
                    .descendant(of: firstRow, matching: find.byType(RichText))
                    .evaluate()) {
              expect(
                (element.renderObject! as RenderParagraph).didExceedMaxLines,
                isFalse,
              );
            }
            expect(tester.getTopLeft(firstRow).dx, 0);
            expect(tester.getSize(firstRow).width, 320);
            await tester.tap(firstRow);
            expect(opened, 'event-0');
            final page = find.byKey(
              const PageStorageKey('host-events-club-1-upcoming'),
            );
            await tester.drag(page, const Offset(0, -600));
            await pumpFeatureUi(tester);
            final rail = find.byKey(const ValueKey('host-events-tabs'));
            expect(find.text('Upcoming').hitTestable(), findsOneWidget);
            final pinnedTop = tester.getTopLeft(rail).dy;
            await tester.drag(page, const Offset(0, -250));
            await pumpFeatureUi(tester);
            expect(tester.getTopLeft(rail).dy, closeTo(pinnedTop, 0.5));
            if (find.text('Past').hitTestable().evaluate().isEmpty) {
              await tester.drag(rail, const Offset(-240, 0));
              await pumpFeatureUi(tester);
            }
            await tester.tap(find.text('Past').hitTestable());
            await pumpFeatureUi(tester);
            expect(find.text('No past events yet'), findsOneWidget);
            expect(tester.takeException(), isNull);
          },
          variant: TargetPlatformVariant.only(platform),
        );
      }
    }
  }

  testWidgets(
    'retrying empty Past shows derived rows, not a false empty state',
    (tester) async {
      await _pump(
        tester,
        state: HostEventsWorkspaceState.fromEvents(
          events: const [],
          now: _now,
          pastError: StateError('offline'),
        ),
      );
      await tester.tap(find.text('Past'));
      await pumpFeatureUi(tester);
      await _pump(
        tester,
        state: HostEventsWorkspaceState.fromEvents(
          events: const [],
          now: _now,
          loadingMorePast: true,
        ),
      );
      await tester.tap(find.text('Past').hitTestable());
      await pumpFeatureUi(tester);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is CatchSkeleton &&
              widget.variant == CatchSkeletonVariant.content,
        ),
        findsNWidgets(4),
      );
      expect(find.text('No past events yet'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Past keeps date and attendance in the shared record row', (
    tester,
  ) async {
    var opened = '';
    final event = buildEvent(
      id: 'past',
      startTime: DateTime(2026, 8, 28, 18),
      endTime: DateTime(2026, 8, 28, 20),
      bookedCount: 20,
      checkedInCount: 12,
    ).copyWith(name: _longTitle);
    await _pump(
      tester,
      state: HostEventsWorkspaceState.fromEvents(events: [event], now: _now),
      onOpen: (id) => opened = id,
    );
    await tester.tap(find.text('Past'));
    await pumpFeatureUi(tester);
    expect(find.text('AUGUST 2026'), findsOneWidget);
    final row = find.byWidgetPredicate(
      (widget) =>
          widget is CatchField &&
          widget.key == const ValueKey('host-event-row-past'),
    );
    expect(
      find.descendant(of: row, matching: find.textContaining('Aug 28')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: row, matching: find.textContaining('18:00')),
      findsOneWidget,
    );
    expect(find.text('12 attended'), findsOneWidget);
    final bounds = tester.getRect(row);
    expect(bounds.left, 0);
    expect(
      bounds.width,
      tester.view.physicalSize.width / tester.view.devicePixelRatio,
    );
    await tester.tapAt(Offset(1, bounds.center.dy));
    expect(opened, 'past');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'Events shows one identifiable program row with dates and count',
    (tester) async {
      String? opened;
      final program = OrganizerProgramListRow(
        programId: 'program',
        title: 'Wedding weekend',
        kind: 'wedding',
        status: 'draft',
        timezone: 'Asia/Kolkata',
        revision: 1,
        startsAt: _now,
        endsAt: _now.add(const Duration(days: 3)),
        functionCount: 4,
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: HostEventsClubSection(
            club: _club,
            now: _now,
            state: HostEventsWorkspaceState.fromEvents(
              events: const [],
              now: _now,
            ),
            entryState: HostEventEntryState.resolve(organizerId: _club.id),
            programs: CatchAsyncState.data([program]),
            onOpenProgram: (p) => opened = p.programId,
            onLoadMoreActive: () {},
            onLoadMorePast: () {},
            onRetryPast: () {},
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
          ),
        ),
      );
      await tester.pump();
      final row = find.byKey(const ValueKey('host-program-row-program'));
      expect(row, findsOneWidget);
      expect(find.text('Program'), findsOneWidget);
      expect(find.text('4 events'), findsOneWidget);
      expect(find.textContaining('4 Sep'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('host-events-view-programs')),
        findsNothing,
      );
      await tester.tap(row);
      expect(opened, 'program');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Events advances Programs with the selected lifecycle tab', (
    tester,
  ) async {
    final loadedViewNames = <String>[];
    final program = OrganizerProgramListRow(
      programId: 'upcoming-program',
      title: 'Wedding weekend',
      kind: 'wedding',
      status: 'draft',
      timezone: 'Asia/Kolkata',
      revision: 1,
      startsAt: _now,
      endsAt: _now.add(const Duration(days: 3)),
      functionCount: 4,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HostEventsClubSection(
          club: _club,
          now: _now,
          state: HostEventsWorkspaceState.fromEvents(
            events: const [],
            now: _now,
          ),
          entryState: HostEventEntryState.resolve(organizerId: _club.id),
          programs: CatchAsyncState.data([program]),
          hasMorePrograms: true,
          onLoadMorePrograms: (view) => loadedViewNames.add(view.name),
          onLoadMoreActive: () {},
          onLoadMorePast: () {},
          onRetryPast: () {},
          onEventEntrySelected: (_, _, _) {},
          onManageEvent: (_, _) {},
        ),
      ),
    );
    await tester.pump();
    expect(loadedViewNames, isEmpty);
    await tester.tap(find.text('Past').hitTestable());
    await pumpFeatureUi(tester);
    expect(loadedViewNames, ['past']);
    await tester.tap(
      find.byKey(const ValueKey('host-programs-load-more-past')),
    );
    expect(loadedViewNames, ['past', 'past']);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  required HostEventsWorkspaceState state,
  TargetPlatform platform = TargetPlatform.iOS,
  bool dark = false,
  double scale = 1,
  ValueChanged<String>? onOpen,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: (dark ? AppTheme.dark : AppTheme.light).copyWith(
        platform: platform,
      ),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(scale),
          alwaysUse24HourFormat: true,
          disableAnimations: true,
        ),
        child: child!,
      ),
      home: HostEventsClubSection(
        club: _club,
        state: state,
        entryState: HostEventEntryState.resolve(organizerId: _club.id),
        onLoadMoreActive: () {},
        onLoadMorePast: () {},
        onRetryPast: () {},
        onEventEntrySelected: (_, _, _) {},
        onManageEvent: (_, event) => onOpen?.call(event.id),
      ),
    ),
  );
  // Loading skeletons intentionally animate continuously; wait only for the
  // state-delivery frame, not for every animation in the tree to become idle.
  await tester.pump();
}
