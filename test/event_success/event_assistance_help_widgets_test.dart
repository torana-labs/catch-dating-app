import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_help_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_help_queue_fixtures.dart';
import 'event_assistance_help_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'named help handoff, detached retry and resolution: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = HelpUiLive();
          final rehearsal = HelpUiPractice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          final query = helpQueueQuery();
          final guest = practice
              ? rehearsal.snapshot.actors.first.displayName
              : 'Alex Morgan';
          final id = practice
              ? rehearsal.snapshot.helpRequests!.cases.single.caseId
              : helpQueuePage('initial').cases.single.scope.caseId;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceCasesRepositoryProvider.overrideWith(
                  (ref) => live,
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
                  body: SingleChildScrollView(
                    child: practice
                        ? EventRehearsalHelpSection(
                            sessionId: rehearsal.snapshot.session.id,
                          )
                        : EventAssistanceLiveHelpSection(
                            organizerId: query.organizerId,
                            eventId: query.eventId,
                          ),
                  ),
                ),
              ),
            ),
          );
          await tester.pump();
          auth.add('host-1');
          await pumpFeatureUi(tester);
          Future<void> tap(Finder finder) async {
            await tester.ensureVisible(finder);
            await tester.tap(finder);
            await pumpFeatureUi(tester);
          }

          Future<void> capture(String name) async {
            if (Platform.environment['CAPTURE_HELP_QUEUE'] != '1') return;
            await tester.runAsync(() async {
              final image =
                  await (boundary.currentContext!.findRenderObject()!
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/help-$name-$practice-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }

          await tap(find.text('Review requests'));
          expect(find.text(guest), findsOneWidget);
          await capture('queue');
          await tap(find.byKey(ValueKey('help.request.$id')));
          expect(
            find.byType(EventAssistanceHelpDecisionSection),
            findsOneWidget,
          );
          await tap(find.byKey(const ValueKey('help.choose.transfer')));
          final confirm = find.byKey(const ValueKey('help.confirm'));
          expect(tester.widget<CatchButton>(confirm).onPressed, isNull);
          await tap(find.text('Responsible host'));
          await tap(find.text('Priya'));
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          await capture('handoff');
          await tap(confirm);
          final original = practice
              ? rehearsal.writes.single.change
              : live.writes.single.change;
          if (practice) {
            rehearsal.writes.single.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          } else {
            live.writes.single.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          }
          await pumpFeatureUi(tester);
          expect(
            find.byKey(const ValueKey('help.choose.resolve')),
            findsNothing,
          );
          expect(find.text('Decision: Assign to Priya'), findsOneWidget);
          await tap(find.text('Done'));
          await tap(find.byKey(ValueKey('help.pending.$id')));
          expect(find.text('Decision: Assign to Priya'), findsOneWidget);
          await tap(find.text('Retry this decision'));
          if (practice) {
            expect(rehearsal.writes.last.change, same(original));
            rehearsal.confirm();
          } else {
            expect(live.writes.last.change, same(original));
            live.confirm(replay: true);
          }
          await pumpFeatureUi(tester);
          expect(find.text('Decision saved.'), findsOneWidget);
          await tap(find.text('Done'));
          expect(find.text('Confirmation needed'), findsNothing);
          expect(find.text('Responsible: Priya'), findsOneWidget);
          await tap(find.byKey(ValueKey('help.request.$id')));
          await tap(find.byKey(const ValueKey('help.choose.resolve')));
          await tap(confirm);
          if (practice) {
            rehearsal.confirm();
          } else {
            live.confirm();
          }
          await pumpFeatureUi(tester);
          expect(find.text('Decision saved.'), findsOneWidget);
          await tap(find.text('Done'));
          expect(find.text('No open requests on this page.'), findsOneWidget);
          await tap(find.text('Handled'));
          expect(find.text(guest), findsOneWidget);
          expect(find.text('Resolved'), findsOneWidget);
          expect(practice ? rehearsal.writes.length : live.writes.length, 3);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
