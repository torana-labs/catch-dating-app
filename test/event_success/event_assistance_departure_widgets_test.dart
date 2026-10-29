import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_movement_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_movement_fixtures.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_departure_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets(
    'actual rehearsal runtime exposes group departure without a parallel runtime',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 932);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final repository = _Practice();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
            eventRehearsalProvider(
              repository.snapshot.session.id,
            ).overrideWith((ref) => Stream.value(repository.snapshot)),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: HostEventRehearsalScreen(
              clubId: repository.snapshot.session.organizerId,
              sessionId: repository.snapshot.session.id,
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceMovementSection), findsOneWidget);
      final open = find.text('Record departure');
      await tester.ensureVisible(open);
      await tester.tap(open);
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceDepartureSection), findsOneWidget);
      expect(repository.writes, isEmpty);
      await tester.ensureVisible(find.text('Done'));
      await tester.tap(find.text('Done'));
      await pumpFeatureUi(tester);
      final history = find.text('Departure rosters & checkpoints');
      await tester.ensureVisible(history);
      await tester.tap(history);
      await pumpFeatureUi(tester);
      expect(
        find.byType(EventAssistanceDepartureHistorySection),
        findsOneWidget,
      );
      expect(repository.writes, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'departure freezes reviewed choices across closure: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = _Live();
          final rehearsal = _Practice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          late BuildContext root;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceDepartureRepositoryProvider.overrideWith(
                  (ref) => live,
                ),
                eventRehearsalRepositoryProvider.overrideWith(
                  (ref) => rehearsal,
                ),
                watchEventAttendeesProvider('event-1').overrideWith(
                  (ref) => Stream.value([
                    for (final id in ['guest-1', 'guest-2'])
                      EventAttendee(
                        id: id,
                        eventId: 'event-1',
                        clubId: 'organizer-1',
                        organizerId: 'organizer-1',
                        displayName: id == 'guest-1' ? 'Asha Menon' : 'Sam Rao',
                        searchName: id,
                        source: EventAttendeeSource.hostManual,
                        status: EventAttendeeStatus.checkedIn,
                        createdAt: DateTime(2026),
                        updatedAt: DateTime(2026),
                      ),
                  ]),
                ),
              ],
              child: MaterialApp(
                theme: AppTheme.light,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                supportedLocales: AppLocalizations.supportedLocales,
                builder: (context, child) => RepaintBoundary(
                  key: boundary,
                  child: MediaQuery(
                    data: MediaQuery.of(
                      context,
                    ).copyWith(textScaler: TextScaler.linear(scale)),
                    child: child!,
                  ),
                ),
                home: Scaffold(
                  body: Builder(
                    builder: (context) {
                      root = context;
                      return CatchButton(
                        label: 'Open departure',
                        onPressed: () => showCatchBottomSheet<void>(
                          context: context,
                          builder: (_) => practice
                              ? EventRehearsalDepartureSheet(
                                  selection: rehearsal
                                      .snapshot
                                      .movementReview!
                                      .selection,
                                )
                              : EventAssistanceDepartureSheet(
                                  scope: departureScope(),
                                  groupLabel: 'Everyone',
                                  eventEnd: DateTime.fromMillisecondsSinceEpoch(
                                    departureNow + 7200000,
                                  ),
                                ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          Future<void> tap(Finder finder) async {
            await tester.ensureVisible(finder);
            await tester.tap(finder);
            await pumpFeatureUi(tester);
          }

          await tap(find.text('Open departure'));
          auth.add('host-1');
          await pumpFeatureUi(tester);
          expect(find.byType(EventAssistanceDepartureSection), findsOneWidget);
          expect(find.text('Record who is leaving'), findsNothing);
          await tap(find.text('Where are you heading?'));
          final label = practice
              ? rehearsal.snapshot.movementReview!.destinations
                    .firstWhere(
                      (d) => d.target.toJson()['kind'] != 'fixedPlace',
                    )
                    .label
              : 'Second stop';
          await tap(find.text(label));
          await tap(find.byKey(const ValueKey('departure.recordRoster')));
          final ids = practice
              ? rehearsal.snapshot.movementReview!.candidates
                    .map((c) => c.attendeeId)
                    .toList()
              : ['guest-1', 'guest-2'];
          for (final id in ids) {
            await tap(find.byKey(ValueKey('departure.guest.$id')));
          }
          await tap(find.byKey(const ValueKey('departure.requestCheckpoint')));
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          if (Platform.environment['CAPTURE_DEPARTURE'] == '1') {
            await tester.ensureVisible(find.text('Confirm departure'));
            await pumpFeatureUi(tester);
            await tester.runAsync(() async {
              final image =
                  await (boundary.currentContext!.findRenderObject()
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/departure-${practice ? 'practice' : 'live'}-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await tap(find.text('Confirm departure'));
          final Object frozen = practice
              ? rehearsal.writes.single.change
              : live.writes.single.change;
          if (practice) {
            final command =
                rehearsal.writes.single.change.command
                    as RehearsalConfirmDeparture;
            expect(command.roster!.attendeeIds, ids);
            expect(command.checkpoint!.responsibleOperatorId, 'host-1');
            expect(
              command.checkpoint!.dueAt,
              command.snapshot.serverTime + 1800000,
            );
          } else {
            expect(live.reviews, 1);
            expect(live.writes.single.change.roster!.attendeeIds, ids);
            expect(
              live.writes.single.change.checkpoint!.responsibleOperatorId,
              'host-1',
            );
          }
          (practice
                  ? rehearsal.writes.single.result
                  : live.writes.single.result)
              .completeError(
                const NetworkException('unavailable', 'Unknown result'),
              );
          await pumpFeatureUi(tester);
          expect(find.text('Retry this departure'), findsOneWidget);
          final container = ProviderScope.containerOf(root);
          if (practice) {
            container
                .read(
                  eventRehearsalMovementProvider(
                    rehearsal.snapshot.movementReview!.selection,
                  ).notifier,
                )
                .reload();
          } else {
            container
                .read(
                  eventAssistanceDepartureProvider(departureScope()).notifier,
                )
                .reload();
          }
          await pumpFeatureUi(tester);
          await tap(find.text('Done'));
          await tap(find.text('Open departure'));
          expect(find.text('Retry this departure'), findsOneWidget);
          expect(find.text('Where are you heading?'), findsNothing);
          await tap(find.text('Retry this departure'));
          expect(
            practice ? rehearsal.writes.last.change : live.writes.last.change,
            same(frozen),
          );
          if (practice) {
            rehearsal.confirm();
          } else {
            live.complete();
          }
          await pumpFeatureUi(tester);
          expect(find.text('Departure recorded'), findsOneWidget);
          expect(find.text(label), findsOneWidget);
          auth.add(null);
          await pumpFeatureUi(tester);
          expect(find.byType(EventAssistanceDepartureSection), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

class _Live extends Fake implements EventAssistanceDepartureRepository {
  int reviews = 0;
  final writes =
      <
        ({
          EventAssistanceDepartureChange change,
          Completer<EventAssistanceGroupProgressResult> result,
        })
      >[];
  @override
  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) async => parseDeparture(
    departureResponse(
      actorUid: actorUid,
      scope: scope,
      validUntil: departureNow + 86400000,
    ),
    actorUid: actorUid,
    scope: scope,
  ).view;
  @override
  Future<EventAssistanceDepartureRosterReview> reviewRoster(
    EventAssistanceGroupProgressView snapshot,
    EventAssistanceDepartureRosterSelection selection,
  ) async {
    reviews++;
    return EventAssistanceDepartureRosterReview.fromCallableData(
      departureRosterResponse(attendeeIds: selection.attendeeIds),
      snapshot: snapshot,
      expectedSelection: selection,
    );
  }

  @override
  Future<EventAssistanceGroupProgressResult> confirm(
    EventAssistanceDepartureChange change,
  ) {
    final result = Completer<EventAssistanceGroupProgressResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void complete() {
    final w = writes.last;
    w.result.complete(
      parseDeparture(
        departureResponse(
          actorUid: 'host-1',
          outcome: 'replayed',
          operationRevision: 1,
          revision: 1,
          freshness: 'current',
          target: w.change.destination,
        ),
        actorUid: 'host-1',
      ),
    );
  }
}

class _Practice extends Fake implements EventRehearsalRepository {
  EventRehearsalBootstrap snapshot = movementSnapshot();
  final writes =
      <
        ({
          RehearsalMovementChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) async => RehearsalMovementReview.fromJson(
    movementSample('ready')['review'],
    session: snapshot.session,
    actors: snapshot.actors,
    selection: selection,
    expectedActorUid: actorUid,
  );
  @override
  Future<EventRehearsalBootstrap> applyMovement(
    RehearsalMovementChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final w = writes.last;
    w.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        movementResult(w.change, departureSample: 'uiDeparted'),
      ),
    );
  }
}
