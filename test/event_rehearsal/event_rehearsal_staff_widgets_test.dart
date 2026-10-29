import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'practice team configures group, duty and expiry $dark $scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final repository = _Repository();
          final capture = GlobalKey();
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => Stream.value('host-1')),
                eventRehearsalRepositoryProvider.overrideWith(
                  (ref) => repository,
                ),
              ],
              child: MaterialApp(
                theme: dark ? AppTheme.dark : AppTheme.light,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                supportedLocales: AppLocalizations.supportedLocales,
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: TextScaler.linear(scale)),
                  child: child!,
                ),
                home: RepaintBoundary(
                  key: capture,
                  child: const Scaffold(
                    body: Align(
                      alignment: Alignment.bottomCenter,
                      child: CatchSheet(
                        mode: CatchSheetMode.scrollable,
                        title: 'Practice tools',
                        child: EventRehearsalStaffSection(
                          sessionId: 'practice-room',
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(
            find.textContaining(RegExp('practice team', caseSensitive: false)),
            findsOneWidget,
          );
          await tester.ensureVisible(find.text('Add practice staff'));
          await tester.tap(find.text('Add practice staff'));
          await pumpFeatureUi(tester);
          expect(find.text('Name'), findsOneWidget);
          expect(find.text('Group'), findsOneWidget);
          expect(find.text('Duty'), findsOneWidget);
          expect(find.text('Access ends'), findsOneWidget);
          expect(find.text('Save practice staff'), findsOneWidget);
          expect(tester.takeException(), isNull);
          if (Platform.environment['CAPTURE_PRACTICE_STAFF'] == '1') {
            await tester.runAsync(() async {
              final image =
                  await (capture.currentContext!.findRenderObject()
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/practice-staff-${dark ? 'dark' : 'light'}-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          final name = find.byType(EditableText).hitTestable();
          await tester.ensureVisible(name);
          await tester.enterText(name, '');
          await tester.pump();
          expect(
            tester
                .widget<CatchButton>(
                  find.widgetWithText(CatchButton, 'Save practice staff'),
                )
                .onPressed,
            isNull,
          );
          await tester.enterText(name, 'New group lead');
          await tester.pump();
          await tester.ensureVisible(find.text('Save practice staff'));
          await tester.tap(find.text('Save practice staff'));
          await tester.pump();
          expect(repository.writes, hasLength(1));
          final frozen = repository.writes.single.change;
          expect(frozen.displayName, 'New group lead');
          expect(frozen.groupId, 'easy');
          repository.writes.single.result.completeError(
            const FormatException('Unconfirmed response'),
          );
          await pumpFeatureUi(tester);
          expect(find.text('Check this save again'), findsOneWidget);
          expect(find.text('Add practice staff'), findsNothing);
          await tester.ensureVisible(find.text('Check this save again'));
          await tester.tap(find.text('Check this save again'));
          await tester.pump();
          expect(repository.writes.last.change, same(frozen));
          repository.writes.last.result.completeError(
            const FormatException('Unconfirmed response'),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}

class _Repository extends Fake implements EventRehearsalRepository {
  final writes =
      <
        ({
          RehearsalStaffChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async {
    final data =
        jsonDecode(
              File(
                'test/event_rehearsal/fixtures/staff_reviews.json',
              ).readAsStringSync(),
            )
            as Map;
    return EventRehearsalBootstrap.fromCallableData(data['manager']);
  }

  @override
  Future<EventRehearsalBootstrap> applyStaff(RehearsalStaffChange change) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }
}
