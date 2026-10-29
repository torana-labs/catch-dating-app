import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_accountability_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../event_rehearsal/event_rehearsal_checkpoint_visit_fixtures.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_widget_fixtures.dart';
import 'event_assistance_checkpoint_visit_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'original checkpoint guest outcome preserves arrivals and exact retry: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = CheckpointVisitUiLive();
          final visits = CheckpointVisitUiAccountability(live);
          final rehearsal = CheckpointVisitUiPractice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceAccountabilityRepositoryProvider.overrideWith(
                  (ref) => visits,
                ),
                eventAssistanceCheckpointRepositoryProvider.overrideWith(
                  (ref) => live,
                ),
                eventAssistanceDepartureRepositoryProvider.overrideWith(
                  (ref) => CheckpointRequestUiPermissions(),
                ),
                eventRehearsalRepositoryProvider.overrideWith(
                  (ref) => rehearsal,
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
                    builder: (context) => CatchButton(
                      label: 'Open checkpoint',
                      onPressed: () => showCatchBottomSheet<void>(
                        context: context,
                        builder: (_) => practice
                            ? EventRehearsalCheckpointSheet(
                                selection: rehearsal
                                    .snapshot
                                    .movementReview!
                                    .selection,
                              )
                            : EventAssistanceCheckpointSheet(
                                scope: checkpointScope,
                                groupLabel: 'Everyone',
                              ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.tap(find.text('Open checkpoint'));
          await tester.pump();
          auth.add('host-1');
          await pumpFeatureUi(tester);
          Future<void> tap(Finder finder) async {
            await tester.ensureVisible(finder);
            await tester.tap(finder);
            await pumpFeatureUi(tester);
          }

          Future<void> capture(String screen, Finder target) async {
            if (Platform.environment['CAPTURE_CHECKPOINT_VISIT'] == '1') {
              await tester.ensureVisible(target);
              await pumpFeatureUi(tester);
              await tester.runAsync(() async {
                final render =
                    boundary.currentContext!.findRenderObject()!
                        as RenderRepaintBoundary;
                final image = await render.toImage();
                final bytes = await image.toByteData(
                  format: ui.ImageByteFormat.png,
                );
                await File(
                  '/tmp/checkpoint-$screen-${practice ? 'practice' : 'live'}-$scale.png',
                ).writeAsBytes(bytes!.buffer.asUint8List());
                image.dispose();
              });
            }
          }

          final manage = find.byKey(const ValueKey('checkpoint.manageRequest'));
          final guest = find.byKey(
            ValueKey('checkpoint.visit.${practice ? 'actor-02' : 'b'}'),
          );
          final close = find.byKey(const ValueKey('checkpoint.request.close'));
          final beforeReport = practice
              ? rehearsal
                    .snapshot
                    .movementReview!
                    .checkpoint!
                    .report!
                    .accountedFor
              : live.wire['view'];
          await tap(manage);
          expect(close, findsNothing);
          expect(guest, findsOneWidget);
          await capture('guest-list', guest);
          await tap(guest);
          expect(find.byType(EventAssistanceVisitSection), findsOneWidget);
          await capture(
            'visit',
            find.byKey(const ValueKey('visit.resolve.departed')),
          );
          await tap(find.byKey(const ValueKey('visit.resolve.departed')));
          expect(visits.writes.length + rehearsal.writes.length, 1);
          final frozen = practice
              ? rehearsal.writes.single.change
              : visits.writes.single.change;
          if (practice) {
            rehearsal.writes.last.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          } else {
            visits.writes.last.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          }
          await pumpFeatureUi(tester);
          // A newer physical visit cannot hide or retarget an unknown old decision.
          if (scale == 2) {
            if (practice) {
              rehearsal.wire = checkpointVisitBootstrap('newVisit');
            } else {
              live.replaceVisit();
            }
          }
          await tap(find.byKey(const ValueKey('visit.done')));
          // Leave both nested sheets. Pending ownership must outlive every sheet.
          Navigator.of(
            tester.element(
              practice
                  ? find.byKey(const ValueKey('checkpoint.visit.pending'))
                  : guest,
            ),
          ).pop();
          await pumpFeatureUi(tester);
          await tap(manage);
          await tap(
            practice
                ? find.byKey(const ValueKey('checkpoint.visit.pending'))
                : guest,
          );
          expect(find.text('Retry this observation'), findsOneWidget);
          expect(
            find.byKey(const ValueKey('visit.resolve.returned')),
            findsNothing,
          );
          await tap(find.text('Retry this observation'));
          expect(
            practice ? rehearsal.writes.last.change : visits.writes.last.change,
            same(frozen),
          );
          if (practice) {
            rehearsal.confirm(scale == 2 ? 'newVisit' : 'resolved');
          } else {
            visits.confirm();
          }
          await pumpFeatureUi(tester);
          expect(
            find.text(
              'Save confirmed. The current recorded status is shown above.',
            ),
            findsOneWidget,
          );
          await tap(find.byKey(const ValueKey('visit.done')));
          expect(guest, findsOneWidget);
          expect(close, scale == 2 ? findsNothing : findsOneWidget);
          if (scale == 1) {
            expect(tester.widget<CatchButton>(close).onPressed, isNull);
          } // Still needs a reason.
          if (practice) {
            expect(
              rehearsal
                  .snapshot
                  .movementReview!
                  .checkpoint!
                  .report!
                  .accountedFor,
              beforeReport,
            );
            expect(
              rehearsal
                  .snapshot
                  .movementReview!
                  .checkpoint!
                  .report!
                  .accountedFor,
              ['actor-01'],
            );
          } else {
            expect(
              visits.scopes.every(
                (s) => s.checkpoint == checkpointScope.checkpoint,
              ),
              isTrue,
            );
            expect(
              ((live.wire['view'] as Map)['report'] as Map)['accountedFor'],
              ['a'],
            );
          }
          auth.add(null);
          await pumpFeatureUi(tester);
          expect(find.byType(EventAssistanceVisitSection), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
