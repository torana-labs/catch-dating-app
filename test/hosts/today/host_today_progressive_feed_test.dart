import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_view_model.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../clubs/clubs_test_helpers.dart' show buildClub;
import '../../events/events_test_helpers.dart' show buildEvent;
import '../../test_pump_helpers.dart';

typedef _EventPage = CursorPage<Event, DocumentSnapshot<Event>>;

enum _OptionalSource { attention, attendance, history }

// Actual generated controller, async adapter, view model and production body.
// Only repository I/O is held; this does not replace the feed or assert latency.
void main() {
  for (final held in _OptionalSource.values) {
    testWidgets('available event renders while ${held.name} remains pending', (
      tester,
    ) async {
      final rig = _Rig();
      rig.completeActive();
      rig.completeOptionalExcept(held);
      await rig.mount(tester);
      try {
        await pumpUntilFound(tester, find.text(rig.event.title));
        expect(rig.isCompleted(held), isFalse);
        expect(rig.state(tester).featuredEvent?.id, rig.event.id);
        expect(isHostTodayQuiet(rig.state(tester)), isFalse);
        expect(
          rig.state(tester).attentionCountIsComplete,
          held == _OptionalSource.history,
        );
        expect(rig.container.read(rig.provider).value?.activeEvents, [
          rig.event,
        ]);
        rig.expectOneBoundedReadPerSource();
        rig.completeOptional(held);
        await pumpFeatureUi(tester);
        expect(find.text(rig.event.title), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await rig.close(tester);
      }
    });

    if (held != _OptionalSource.history) {
      testWidgets(
        'empty active feed is not quiet while ${held.name} is pending',
        (tester) async {
          final rig = _Rig(emptyActive: true);
          rig.completeActive();
          rig.completeOptionalExcept(held);
          await rig.mount(tester);
          try {
            final state = rig.state(tester);
            expect(rig.isCompleted(held), isFalse);
            expect(state.status, isNot(HostTodayStatus.empty));
            expect(isHostTodayQuiet(state), isFalse);
            expect(
              buildHostTodayPersonalizationState(
                today: state,
                preference: const HostTodayPreference.unanswered(),
                evidence: const HostTodayRoadmapEvidence(),
              ).showOrientation,
              isFalse,
            );
            expect(find.byType(HostTodayEmptyState), findsNothing);
            rig.completeOptional(held);
            await pumpUntilFound(tester, find.byType(HostTodayEmptyState));
            expect(isHostTodayQuiet(rig.state(tester)), isTrue);
            rig.expectOneBoundedReadPerSource();
            expect(tester.takeException(), isNull);
          } finally {
            await rig.close(tester);
          }
        },
      );
    }

    testWidgets('${held.name} failure keeps the event and exposes an error', (
      tester,
    ) async {
      final rig = _Rig();
      rig.completeActive();
      rig.completeOptionalExcept(held);
      await rig.mount(tester);
      try {
        rig.failOptional(held, StateError('${held.name} unavailable'));
        await pumpUntilFound(tester, find.byType(CatchLocalizedErrorState));
        expect(find.text(rig.event.title), findsOneWidget);
        expect(rig.state(tester).featuredEvent?.id, rig.event.id);
        expect(isHostTodayQuiet(rig.state(tester)), isFalse);
        expect(find.byType(CatchLocalizedErrorState), findsWidgets);
        rig.expectOneBoundedReadPerSource();
        expect(tester.takeException(), isNull);
      } finally {
        await rig.close(tester);
      }
    });
  }

  testWidgets('independent sources start before active events settle', (
    tester,
  ) async {
    final rig = _Rig();
    await rig.mount(tester);
    try {
      expect(rig.active.isCompleted, isFalse);
      expect(rig.attention.isCompleted, isFalse);
      expect(rig.attendance.isCompleted, isFalse);
      expect(rig.history.isCompleted, isFalse);
      rig.expectOneBoundedReadPerSource();
      expect(rig.state(tester).status, HostTodayStatus.loading);
    } finally {
      await rig.close(tester);
    }
  });

  testWidgets('settled sources render real events and exact task coverage', (
    tester,
  ) async {
    final rig = _Rig();
    rig.completeAll();
    await rig.mount(tester);
    try {
      await pumpUntilFound(tester, find.text(rig.event.title));
      final state = rig.state(tester);
      expect(state.status, HostTodayStatus.content);
      expect(state.featuredEvent?.id, rig.event.id);
      expect(state.hasPastEvents, isTrue);
      expect(state.attentionCountIsComplete, isTrue);
      expect(state.attentionIssues, isEmpty);
      expect(find.byType(HostTodayEmptyState), findsNothing);
      rig.expectOneBoundedReadPerSource();
      expect(tester.takeException(), isNull);
    } finally {
      await rig.close(tester);
    }
  });

  for (final first in _OptionalSource.values) {
    for (final second in _OptionalSource.values) {
      if (first == second) continue;
      final third = _OptionalSource.values.singleWhere(
        (source) => source != first && source != second,
      );
      testWidgets(
        'preserves progressive results in ${first.name}, ${second.name}, '
        '${third.name} completion order',
        (tester) async {
          final rig = _Rig(withTasks: true);
          rig.completeActive();
          await rig.mount(tester);
          try {
            await pumpUntilFound(tester, find.text(rig.event.title));
            expect(rig.state(tester).attentionCountIsComplete, isFalse);
            expect(rig.state(tester).hasPastEvents, isFalse);
            final completed = <_OptionalSource>{};
            for (final source in [first, second, third]) {
              rig.completeOptional(source);
              completed.add(source);
              final historySettled = completed.contains(
                _OptionalSource.history,
              );
              final attentionComplete =
                  completed.contains(_OptionalSource.attention) &&
                  completed.contains(_OptionalSource.attendance);
              // Other sources may still animate their loading indicator.
              // Wait for delivered state, not for the entire UI to settle.
              await pumpUntilFound(
                tester,
                find.byWidgetPredicate(
                  (widget) =>
                      widget is HostTodayBody &&
                      widget.state.hasPastEvents == historySettled &&
                      widget.state.attentionItems.length ==
                          completed
                              .where(
                                (source) => source != _OptionalSource.history,
                              )
                              .length &&
                      widget.state.attentionCountIsComplete ==
                          attentionComplete,
                ),
              );
              final state = rig.state(tester);
              expect(find.text(rig.event.title), findsOneWidget);
              expect(state.featuredEvent?.id, rig.event.id);
              expect(
                state.hasPastEvents,
                completed.contains(_OptionalSource.history),
              );
              expect(
                state.attentionCountIsComplete,
                completed.contains(_OptionalSource.attention) &&
                    completed.contains(_OptionalSource.attendance),
              );
              expect(state.attentionIssues, isEmpty);
              final items = rig.container
                  .read(rig.provider)
                  .requireValue
                  .attentionItems;
              expect(items.map((item) => item.id).toSet(), {
                if (completed.contains(_OptionalSource.attention))
                  'server-task',
                if (completed.contains(_OptionalSource.attendance))
                  'local-attendance-local-operation',
              });
              if (completed.contains(_OptionalSource.attendance)) {
                final local = items.singleWhere(
                  (item) => item.id.startsWith('local-'),
                );
                expect(
                  local.policyVersion,
                  completed.contains(_OptionalSource.attention) ? 7 : null,
                );
                expect(local.context.eventName, rig.event.title);
              }
              expect(isHostTodayQuiet(state), isFalse);
              rig.expectOneBoundedReadPerSource();
              expect(tester.takeException(), isNull);
            }
          } finally {
            await rig.close(tester);
          }
        },
      );
    }
  }

  testWidgets('active source failure never becomes a quiet empty feed', (
    tester,
  ) async {
    final rig = _Rig();
    rig.completeOptionalExcept(null);
    await rig.mount(tester);
    try {
      final failure = StateError('active events unavailable');
      rig.active.completeError(failure);
      await pumpUntilFound(tester, find.byType(CatchLocalizedSliverErrorState));
      expect(rig.state(tester).status, HostTodayStatus.error);
      expect(rig.state(tester).error, same(failure));
      expect(isHostTodayQuiet(rig.state(tester)), isFalse);
      expect(find.byType(HostTodayEmptyState), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      await rig.close(tester);
    }
  });

  for (final beforeActive in [true, false]) {
    testWidgets(
      'same-turn optional payloads ${beforeActive ? 'before' : 'after'} active '
      'survive the initial build publication',
      (tester) async {
        final rig = _Rig(withTasks: true);
        final publications = <HostTodayFeedData>[];
        final subscription = rig.container.listen(rig.provider, (_, next) {
          if (next.asData?.value case final data?) publications.add(data);
        });
        try {
          if (beforeActive) rig.completeOptionalExcept(null);
          rig.completeActive();
          await rig.mount(tester);
          if (!beforeActive) rig.completeOptionalExcept(null);
          await pumpUntilFound(tester, rig.settledBody);
          await pumpFeatureUi(tester);
          expect(publications.first.activeEvents, [rig.event]);
          expect(publications.first.attentionPending, isTrue);
          expect(publications.first.attendancePending, isTrue);
          expect(publications.first.historyPending, isTrue);
          final data = rig.container.read(rig.provider).requireValue;
          expect(data.pastEvents, [rig.pastEvent]);
          expect(data.attentionItems.map((item) => item.id).toSet(), {
            'server-task',
            'local-attendance-local-operation',
          });
          final local = data.attentionItems.singleWhere(
            (item) => item.id == 'local-attendance-local-operation',
          );
          expect(local.context.eventName, rig.event.title);
          expect(local.policyVersion, 7);
          expect(data.attentionItems, hasLength(2));
          expect(rig.state(tester).attentionCountIsComplete, isTrue);
          rig.expectOneBoundedReadPerSource();
          expect(tester.takeException(), isNull);
        } finally {
          subscription.close();
          await rig.close(tester);
        }
      },
    );
  }

  for (final held in _OptionalSource.values) {
    for (final failOld in [false, true]) {
      testWidgets('same-family retry ignores old ${held.name} '
          '${failOld ? 'error' : 'success'}', (tester) async {
        final rig = _Rig(withTasks: true);
        rig.completeActive();
        rig.completeOptionalExcept(held);
        await rig.mount(tester);
        try {
          await pumpUntilFound(tester, find.text(rig.event.title));
          final replacement = _Rig();
          replacement.completeAll();
          rig.nextRead = replacement;
          rig.container.read(rig.provider.notifier).retry();
          await pumpUntilFound(tester, rig.settledBody);
          final current = rig.container.read(rig.provider).requireValue;
          expect(current.attentionItems, isEmpty);
          expect(current.attentionIssues, isEmpty);
          expect(current.historyError, isNull);
          if (failOld) {
            rig.failOptional(held, StateError('obsolete optional failure'));
          } else {
            rig.completeOptional(held);
          }
          await pumpFeatureUi(tester);
          expect(rig.container.read(rig.provider).requireValue, same(current));
          for (final source in [
            'active',
            'attention',
            'attendance',
            'history',
          ]) {
            expect(rig.calls.where((call) => call == source), hasLength(2));
          }
          expect(tester.takeException(), isNull);
        } finally {
          await rig.close(tester);
        }
      });

      testWidgets('disposed feed ignores held ${held.name} '
          '${failOld ? 'error' : 'success'}', (tester) async {
        final rig = _Rig();
        rig.completeActive();
        rig.completeOptionalExcept(held);
        await rig.mount(tester);
        await pumpUntilFound(tester, find.text(rig.event.title));
        await tester.pumpWidget(const SizedBox.shrink());
        rig.container.dispose();
        if (failOld) {
          rig.failOptional(held, StateError('disposed optional failure'));
        } else {
          rig.completeOptional(held);
        }
        await pumpFeatureUi(tester);
        rig.expectOneBoundedReadPerSource();
        expect(tester.takeException(), isNull);
      });
    }
  }

  for (final failOptional in [false, true]) {
    testWidgets('active error remains terminal after late optional '
        '${failOptional ? 'errors' : 'successes'}', (tester) async {
      final rig = _Rig(withTasks: true);
      await rig.mount(tester);
      try {
        final failure = StateError('required active source failed');
        rig.active.completeError(failure);
        await pumpUntilFound(
          tester,
          find.byType(CatchLocalizedSliverErrorState),
        );
        for (final source in _OptionalSource.values) {
          if (failOptional) {
            rig.failOptional(source, StateError('optional ${source.name}'));
          } else {
            rig.completeOptional(source);
          }
        }
        await pumpFeatureUi(tester);
        expect(rig.container.read(rig.provider).error, same(failure));
        expect(rig.state(tester).status, HostTodayStatus.error);
        expect(rig.state(tester).error, same(failure));
        rig.expectOneBoundedReadPerSource();
        expect(tester.takeException(), isNull);
      } finally {
        await rig.close(tester);
      }
    });
  }

  testWidgets('optional errors before active failure stay handled', (
    tester,
  ) async {
    final rig = _Rig();
    await rig.mount(tester);
    try {
      for (final source in _OptionalSource.values) {
        rig.failOptional(source, StateError('early ${source.name} failure'));
      }
      await tester.pump();
      expect(rig.state(tester).status, HostTodayStatus.loading);
      expect(tester.takeException(), isNull);
      final failure = StateError('required active source failed later');
      rig.active.completeError(failure);
      await pumpUntilFound(tester, find.byType(CatchLocalizedSliverErrorState));
      expect(rig.state(tester).error, same(failure));
      rig.expectOneBoundedReadPerSource();
      expect(tester.takeException(), isNull);
    } finally {
      await rig.close(tester);
    }
  });

  testWidgets(
    'synchronous active failure still starts each independent read once',
    (tester) async {
      final failure = StateError('synchronous active failure');
      final rig = _Rig(synchronousActiveError: failure);
      await rig.mount(tester);
      try {
        await pumpUntilFound(
          tester,
          find.byType(CatchLocalizedSliverErrorState),
        );
        expect(rig.state(tester).error, same(failure));
        rig.expectOneBoundedReadPerSource();
        rig.completeOptionalExcept(null);
        await pumpFeatureUi(tester);
        expect(rig.container.read(rig.provider).error, same(failure));
        expect(tester.takeException(), isNull);
      } finally {
        await rig.close(tester);
      }
    },
  );

  testWidgets('empty feed waits for history before restoring Focus', (
    tester,
  ) async {
    final rig = _Rig(emptyActive: true);
    rig.completeActive();
    rig.completeOptionalExcept(_OptionalSource.history);
    await rig.mount(tester);
    try {
      expect(rig.state(tester).status, HostTodayStatus.loading);
      final pending = buildHostTodayPersonalizationState(
        today: rig.state(tester),
        preference: const HostTodayPreference.selected(HostTodayFocus.audience),
        evidence: const HostTodayRoadmapEvidence(),
      );
      expect(pending.focus, HostTodayFocus.audience);
      expect(pending.primaryAction, isNull);
      expect(pending.showOrientation, isFalse);
      rig.completeOptional(_OptionalSource.history);
      await pumpUntilFound(tester, find.byType(HostTodayEmptyState));
      final settled = buildHostTodayPersonalizationState(
        today: rig.state(tester),
        preference: const HostTodayPreference.selected(HostTodayFocus.audience),
        evidence: const HostTodayRoadmapEvidence(),
      );
      expect(settled.primaryAction, HostTodaySuggestedAction.openAudience);
      rig.expectOneBoundedReadPerSource();
    } finally {
      await rig.close(tester);
    }
  });

  testWidgets('empty history error exposes retry and can recover to quiet', (
    tester,
  ) async {
    final rig = _Rig(emptyActive: true);
    rig.completeActive();
    rig.completeOptionalExcept(_OptionalSource.history);
    await rig.mount(tester);
    try {
      final failure = StateError('history unavailable');
      rig.failOptional(_OptionalSource.history, failure);
      await pumpUntilFound(tester, find.byType(CatchLocalizedErrorState));
      expect(rig.state(tester).historyError, same(failure));
      expect(rig.state(tester).status, HostTodayStatus.content);
      expect(isHostTodayQuiet(rig.state(tester)), isFalse);
      final replacement = _Rig(emptyActive: true)..completeAll();
      rig.nextRead = replacement;
      final errorSurface = tester.widget<CatchLocalizedErrorState>(
        find.byType(CatchLocalizedErrorState),
      );
      expect(errorSurface.onRetry, isNotNull);
      errorSurface.onRetry!();
      await pumpUntilFound(tester, find.byType(HostTodayEmptyState));
      expect(rig.state(tester).historyError, isNull);
      expect(rig.state(tester).hasPastEvents, isTrue);
      for (final source in ['active', 'attention', 'attendance', 'history']) {
        expect(rig.calls.where((call) => call == source), hasLength(2));
      }
      expect(tester.takeException(), isNull);
    } finally {
      await rig.close(tester);
    }
  });
}

class _Rig {
  _Rig({
    this.emptyActive = false,
    this.withTasks = false,
    this.synchronousActiveError,
  });

  final bool emptyActive;
  final bool withTasks;
  final Object? synchronousActiveError;
  _Rig? nextRead;
  _Rig get readSource => nextRead ?? this;
  final boundary = DateTime(2026, 10, 17, 12);
  late final event = buildEvent(
    id: 'available-event',
    name: 'Available event before optional sources',
    clubId: 'organizer-105',
    startTime: boundary.add(const Duration(hours: 2)),
    endTime: boundary.add(const Duration(hours: 4)),
  );
  late final pastEvent = buildEvent(
    id: 'past-event',
    clubId: 'organizer-105',
    startTime: boundary.subtract(const Duration(hours: 2)),
    endTime: boundary.subtract(const Duration(hours: 1)),
  );
  late final request = HostTodayFeedRequest(
    organizerId: 'organizer-105',
    accountId: 'host-105',
    sessionBoundary: boundary,
  );
  final active = Completer<_EventPage>();
  final history = Completer<_EventPage>();
  final attention = Completer<HostAttentionProjection>();
  final attendance = Completer<HostAttendanceOutboxSummary>();
  final calls = <String>[];
  late final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      eventRepositoryProvider.overrideWithValue(_HeldEvents(this)),
      hostAttentionRepositoryProvider.overrideWithValue(_HeldAttention(this)),
      hostAttendanceOutboxProvider.overrideWithValue(_HeldAttendance(this)),
    ],
  );
  HostTodayFeedControllerProvider get provider =>
      hostTodayFeedControllerProvider(request);

  Finder get settledBody => find.byWidgetPredicate(
    (widget) =>
        widget is HostTodayBody &&
        !widget.state.hasPendingSources &&
        widget.state.status == HostTodayStatus.content,
  );

  Future<void> mount(WidgetTester tester) async {
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Consumer(
            builder: (context, ref, _) {
              final state = buildHostTodayState(
                catchAsyncStateFromAsyncValue(ref.watch(provider)),
                now: boundary,
                l10n: context.l10n,
              );
              return Scaffold(
                body: CustomScrollView(
                  slivers: [
                    HostTodayBody(
                      organizer: buildClub(id: request.organizerId),
                      state: state,
                      now: boundary,
                      onRetry: () => ref.read(provider.notifier).retry(),
                      onOpenEvent: (_) {},
                      onOpenAttention: (_) {},
                      onCreateEvent: () {},
                      onViewEvents: () {},
                      onStartRehearsal: () {},
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
    // Drain delivered futures and rebuild once without waiting on held I/O or
    // attempting to settle the intentional loading animation.
    await tester.pump();
    await tester.pump();
  }

  HostTodayState state(WidgetTester tester) =>
      tester.widget<HostTodayBody>(find.byType(HostTodayBody)).state;

  void expectOneBoundedReadPerSource() {
    expect(
      calls,
      unorderedEquals(['active', 'history', 'attention', 'attendance']),
    );
  }

  void completeActive() {
    if (!active.isCompleted) {
      active.complete(
        _EventPage(items: emptyActive ? [] : [event], hasMore: false),
      );
    }
  }

  void completeOptionalExcept(_OptionalSource? held) {
    for (final source in _OptionalSource.values) {
      if (source != held) completeOptional(source);
    }
  }

  bool isCompleted(_OptionalSource source) => switch (source) {
    _OptionalSource.attention => attention.isCompleted,
    _OptionalSource.attendance => attendance.isCompleted,
    _OptionalSource.history => history.isCompleted,
  };

  void completeOptional(_OptionalSource source) {
    if (isCompleted(source)) return;
    switch (source) {
      case _OptionalSource.attention:
        attention.complete(
          HostAttentionProjection(
            organizerId: request.organizerId,
            policyVersion: 7,
            generatedAt: boundary,
            horizonEndsAt: boundary.add(const Duration(days: 7)),
            items: withTasks ? [_serverTask(this)] : const [],
            coverage: [
              for (final kind in HostAttentionKind.values)
                HostAttentionCoverage(
                  kind: kind,
                  state: kind == HostAttentionKind.attendanceSync
                      ? HostAttentionCoverageState.clientMergeRequired
                      : HostAttentionCoverageState.complete,
                  reason: 'Authoritative synthetic source settled.',
                ),
            ],
          ),
        );
      case _OptionalSource.attendance:
        attendance.complete(
          HostAttendanceOutboxSummary([
            if (withTasks)
              HostAttendanceOutboxEntry(
                eventId: event.id,
                attendeeId: 'attendee-105',
                desiredCheckedIn: true,
                expectedRevision: 1,
                clientOperationId: 'local-operation',
                createdAt: boundary.subtract(const Duration(hours: 1)),
                status: HostAttendanceOutboxStatus.needsReview,
              ),
          ]),
        );
      case _OptionalSource.history:
        history.complete(_EventPage(items: [pastEvent], hasMore: false));
    }
  }

  void failOptional(_OptionalSource source, Object error) {
    switch (source) {
      case _OptionalSource.attention:
        attention.completeError(error);
      case _OptionalSource.attendance:
        attendance.completeError(error);
      case _OptionalSource.history:
        history.completeError(error);
    }
  }

  void completeAll() {
    completeActive();
    completeOptionalExcept(null);
  }

  Future<void> close(WidgetTester tester) async {
    completeAll();
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    container.dispose();
    await tester.pump();
  }
}

class _HeldEvents extends Fake implements EventRepository {
  _HeldEvents(this.rig);
  final _Rig rig;

  @override
  Future<_EventPage> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    expectSync(organizerId, rig.request.organizerId);
    expectSync(sessionBoundary, rig.boundary);
    expectSync(startAfter, isNull);
    expectSync(limit, ReadLimitPolicy.directoryPage);
    rig.calls.add('active');
    if (rig.readSource.synchronousActiveError case final error?) throw error;
    return rig.readSource.active.future;
  }

  @override
  Future<_EventPage> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    expectSync(organizerId, rig.request.organizerId);
    expectSync(sessionBoundary, rig.boundary);
    expectSync(startAfter, isNull);
    expectSync(limit, ReadLimitPolicy.directoryPage);
    rig.calls.add('history');
    return rig.readSource.history.future;
  }
}

class _HeldAttention implements HostAttentionRepository {
  _HeldAttention(this.rig);
  final _Rig rig;

  @override
  Future<HostAttentionProjection> fetch(String organizerId) {
    expectSync(organizerId, rig.request.organizerId);
    rig.calls.add('attention');
    return rig.readSource.attention.future;
  }
}

class _HeldAttendance extends Fake implements HostAttendanceOutbox {
  _HeldAttendance(this.rig);
  final _Rig rig;

  @override
  Future<HostAttendanceOutboxSummary> loadAll({
    required String accountId,
    DateTime? now,
  }) {
    expectSync(accountId, rig.request.accountId);
    expectSync(now, rig.boundary);
    rig.calls.add('attendance');
    return rig.readSource.attendance.future;
  }
}

HostAttentionItem _serverTask(_Rig rig) => HostAttentionItem(
  id: 'server-task',
  kind: HostAttentionKind.eventWaitlistReview,
  scope: HostAttentionScope.event,
  sourceOwner: HostAttentionSourceOwner.events,
  sourceId: rig.event.id,
  sourceRevision: 'revision-1',
  eventId: rig.event.id,
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.risksGuestExperience,
  blocking: false,
  urgency: HostAttentionUrgency.immediate,
  destination: HostAttentionDestination(
    route: HostAttentionDestinationRoute.hostEventManage,
    section: 'guests',
    eventId: rig.event.id,
  ),
  context: HostAttentionContext(eventName: rig.event.title, count: 3),
  dedupeKey: 'eventWaitlistReview:${rig.event.id}',
  policyVersion: 7,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: rig.boundary,
  dueAt: rig.boundary.add(const Duration(hours: 1)),
  expiresAt: rig.boundary.add(const Duration(hours: 4)),
);
