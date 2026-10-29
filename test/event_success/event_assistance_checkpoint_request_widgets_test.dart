import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_checkpoint_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_request_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_checkpoint_fixtures.dart';
import 'event_assistance_checkpoint_request_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'original request closes and reopens with exact retry: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = CheckpointRequestUiLive();
          final rehearsal = CheckpointRequestUiPractice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
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

          final manage = find.byKey(const ValueKey('checkpoint.manageRequest'));
          final reason = find.byKey(
            const ValueKey('checkpoint.request.reason'),
          );
          final close = find.byKey(const ValueKey('checkpoint.request.close'));
          expect(
            manage,
            findsOneWidget,
            reason: tester
                .widgetList<Text>(find.byType(Text))
                .map((t) => t.data)
                .join(' | '),
          );
          await tap(manage);
          expect(
            find.byType(EventAssistanceCheckpointRequestSection),
            findsOneWidget,
          );
          expect(tester.widget<CatchButton>(close).onPressed, isNull);
          await tester.enterText(
            find.descendant(of: reason, matching: find.byType(EditableText)),
            checkpointRequestReason,
          );
          await pumpFeatureUi(tester);
          if (Platform.environment['CAPTURE_CHECKPOINT_REQUEST'] == '1') {
            await tester.ensureVisible(close);
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
                '/tmp/checkpoint-request-${practice ? 'practice' : 'live'}-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await tap(close);
          expect(live.writes.length + rehearsal.writes.length, 1);
          if (practice) {
            rehearsal.writes.last.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          } else {
            live.writes.last.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          }
          await pumpFeatureUi(tester);
          await tap(find.byKey(const ValueKey('checkpoint.request.done')));
          await tap(manage);
          expect(find.text('Retry checkpoint decision'), findsOneWidget);
          expect(
            find.byKey(const ValueKey('checkpoint.request.reason')),
            findsNothing,
          );
          await tap(find.text('Retry checkpoint decision'));
          if (practice) {
            expect(
              rehearsal.writes.last.change,
              same(rehearsal.writes.first.change),
            );
            rehearsal.confirm('closed');
          } else {
            expect(live.writes.last.change, same(live.writes.first.change));
            live.confirm();
          }
          await pumpFeatureUi(tester);
          expect(
            find.text(
              'Your decision was saved. The latest request status is shown above.',
            ),
            findsOneWidget,
          );
          await tap(find.byKey(const ValueKey('checkpoint.request.done')));
          await tap(manage);
          final reopen = find.byKey(
            const ValueKey('checkpoint.request.reopen'),
          );
          expect(reopen, findsOneWidget);
          expect(close, findsNothing);
          expect(tester.widget<CatchButton>(reopen).onPressed, isNull);
          await tester.enterText(
            find.descendant(of: reason, matching: find.byType(EditableText)),
            checkpointRequestReason,
          );
          await pumpFeatureUi(tester);
          await tap(reopen);
          if (practice) {
            rehearsal.confirm('reopened');
          } else {
            live.confirm();
          }
          await pumpFeatureUi(tester);
          expect(
            find.text(
              'Your decision was saved. The latest request status is shown above.',
            ),
            findsOneWidget,
          );
          expect(live.writes.length + rehearsal.writes.length, 3);
          auth.add(null);
          await pumpFeatureUi(tester);
          expect(
            find.byType(EventAssistanceCheckpointRequestSection),
            findsNothing,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
