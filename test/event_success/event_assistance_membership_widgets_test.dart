import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_membership_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_membership_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_membership_fixtures.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_membership_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'membership keeps its exact retry across dismissal: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = _LiveRepository();
          final rehearsal = _PracticeRepository();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          late BuildContext rootContext;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceMembershipRepositoryProvider.overrideWith(
                  (ref) => live,
                ),
                eventRehearsalRepositoryProvider.overrideWith(
                  (ref) => rehearsal,
                ),
              ],
              child: MaterialApp(
                theme: scale == 2 ? AppTheme.dark : AppTheme.light,
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
                      rootContext = context;
                      return CatchButton(
                        label: 'Open membership',
                        onPressed: () => showCatchBottomSheet<void>(
                          context: context,
                          builder: (_) => practice
                              ? EventRehearsalMembershipSheet(
                                  scope: rehearsal
                                      .snapshot
                                      .membershipReviews!
                                      .rows
                                      .first
                                      .scope,
                                  guestName: 'Asha Menon',
                                )
                              : EventAssistanceMembershipSheet(
                                  scope: membershipScope,
                                  guestName: 'Asha Menon',
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
          Future<void> tap(String label) async {
            await tester.ensureVisible(find.text(label));
            await tester.tap(find.text(label));
            await pumpFeatureUi(tester);
          }

          await tap('Open membership');
          auth.add('host-1');
          await pumpFeatureUi(tester);
          expect(find.byType(EventAssistanceMembershipSection), findsOneWidget);
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          if (Platform.environment['CAPTURE_MEMBERSHIP'] == '1') {
            await tester.runAsync(() async {
              final image =
                  await (boundary.currentContext!.findRenderObject()
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/membership-${practice ? 'practice' : 'live'}-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await tap('Assign to a group');
          await tap('Group');
          await tap(practice ? 'Easy' : 'Easy pace');
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          await tap('Confirm group action');
          expect(find.text('Assign to a group'), findsNothing);
          final Object frozen = practice
              ? rehearsal.writes.single.change
              : live.writes.single.change;
          final first = practice
              ? rehearsal.writes.single.result
              : live.writes.single.result;
          first.completeError(const NetworkException('unavailable', 'Offline'));
          await pumpFeatureUi(tester);
          expect(find.text('Retry this group action'), findsOneWidget);
          final container = ProviderScope.containerOf(rootContext);
          if (practice) {
            container
                .read(eventRehearsalAssistanceProvider('session-1').notifier)
                .reload();
          } else {
            container
                .read(
                  eventAssistanceMembershipProvider(membershipScope).notifier,
                )
                .reload();
          }
          await pumpFeatureUi(tester);
          await tap('Done');
          await tap('Open membership');
          expect(find.text('Retry this group action'), findsOneWidget);
          expect(find.text('Assign to a group'), findsNothing);
          await tap('Retry this group action');
          expect(
            practice ? rehearsal.writes.last.change : live.writes.last.change,
            same(frozen),
          );
          (practice ? rehearsal.writes.last.result : live.writes.last.result)
              .completeError(
                const NetworkException('resource-exhausted', 'Try again later'),
              );
          await pumpFeatureUi(tester);
          await tap('Retry this group action');
          expect(
            practice ? rehearsal.writes.last.change : live.writes.last.change,
            same(frozen),
          );
          if (practice) {
            rehearsal.confirm();
          } else {
            live.confirm();
          }
          await pumpFeatureUi(tester);
          expect(find.text('Group action confirmed.'), findsOneWidget);
          expect(find.text(practice ? 'Easy' : 'Easy pace'), findsOneWidget);
          expect(find.text('Retry this group action'), findsNothing);
          auth.add(null);
          await pumpFeatureUi(tester);
          expect(find.text('Asha Menon'), findsNothing);
          expect(find.text('Assign to a group'), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

class _LiveRepository extends Fake
    implements EventAssistanceMembershipRepository {
  final writes =
      <
        ({
          EventAssistanceMembershipChange change,
          Completer<EventAssistanceMembershipResult> result,
        })
      >[];
  @override
  Future<EventAssistanceMembershipView> fetch(
    EventAssistanceGuestScope scope,
  ) async {
    expect(scope, membershipScope);
    return membershipView();
  }

  @override
  Future<EventAssistanceMembershipResult> apply(
    EventAssistanceMembershipChange change,
  ) {
    final result = Completer<EventAssistanceMembershipResult>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final write = writes.last;
    write.result.complete(
      membershipResult(membershipAppliedWire(write.change)),
    );
  }
}

class _PracticeRepository extends Fake implements EventRehearsalRepository {
  EventRehearsalBootstrap snapshot = practiceMembershipSnapshot();
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;
  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    final write = writes.last;
    snapshot = EventRehearsalBootstrap.fromCallableData(
      practicePlacementResult(write.change),
    );
    write.result.complete(snapshot);
  }
}
