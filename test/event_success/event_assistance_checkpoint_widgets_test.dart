import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_history_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_departure_history_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_checkpoint_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'history opens original report and retains unknown save: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = CheckpointUiLive();
          final rehearsal = CheckpointUiPractice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          late BuildContext root;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceCheckpointRepositoryProvider.overrideWith(
                  (ref) => live,
                ),
                eventAssistanceDepartureHistoryRepositoryProvider.overrideWith(
                  (ref) => CheckpointUiHistory(live),
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
                    builder: (context) {
                      root = context;
                      return CatchButton(
                        label: 'Open movement history',
                        onPressed: () => showCatchBottomSheet<void>(
                          context: context,
                          builder: (_) => practice
                              ? EventRehearsalDepartureHistorySheet(
                                  selection: rehearsal
                                      .snapshot
                                      .movementReview!
                                      .selection,
                                )
                              : EventAssistanceDepartureHistorySheet(
                                  scope: checkpointUiScope.group,
                                  groupLabel: 'Everyone',
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

          await tester.tap(find.text('Open movement history'));
          await tester.pump();
          auth.add('host-1');
          await pumpFeatureUi(tester);
          expect(
            find.byType(EventAssistanceDepartureHistorySection),
            findsOneWidget,
          );
          final revision = practice ? 1 : checkpointUiScope.progressRevision;
          final row = find.byKey(ValueKey('checkpoint.history.$revision'));
          await tap(row);
          expect(find.byType(EventAssistanceCheckpointSection), findsOneWidget);
          expect(find.text('From departure $revision'), findsOneWidget);
          final roster = practice
              ? rehearsal.snapshot.movementReview!.checkpoint!.availability
                    as AssistanceCheckpointRoster
              : checkpointUiResult('initial').view.availability
                    as AssistanceCheckpointRoster;
          final id = roster.members.first.attendeeId;
          await tap(find.byKey(ValueKey('checkpoint.guest.$id')));
          expect(find.text('1 of 2 guests observed'), findsOneWidget);
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          if (Platform.environment['CAPTURE_CHECKPOINT'] == '1') {
            await tester.ensureVisible(find.text('Save checkpoint report'));
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
                '/tmp/checkpoint-${practice ? 'practice' : 'live'}-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await tap(find.text('Save checkpoint report'));
          final Object frozen = practice
              ? rehearsal.writes.single.change
              : live.writes.single.change;
          final decision = practice
              ? (rehearsal.writes.single.change.command
                        as RehearsalRecordCheckpoint)
                    .observation
              : live.writes.single.change.decision;
          expect(decision.accountedFor, [id]);
          expect(decision.correctionReason, isNull);
          (practice
                  ? rehearsal.writes.single.result
                  : live.writes.single.result)
              .completeError(
                const NetworkException('unavailable', 'Unknown result'),
              );
          await pumpFeatureUi(tester);
          expect(find.text('Retry this report'), findsOneWidget);
          await tap(find.text('Done'));
          Navigator.of(root).pop();
          await pumpFeatureUi(tester);
          await tap(find.text('Open movement history'));
          await tap(row);
          expect(find.text('Retry this report'), findsOneWidget);
          expect(find.text('1 of 2 guests observed'), findsOneWidget);
          await tap(find.text('Retry this report'));
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
          expect(
            find.text(
              'Checkpoint report saved. The latest recorded observations are shown above.',
            ),
            findsOneWidget,
          );
          expect(find.text('1 of 2 guests observed'), findsOneWidget);
          await tap(find.text('Done'));
          expect(
            find.text('Last report: 1 of 2 guests observed'),
            findsOneWidget,
          );
          await tap(row);
          auth.add(null);
          await pumpFeatureUi(tester);
          expect(find.byType(EventAssistanceCheckpointSection), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
