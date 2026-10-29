import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_late_join_setting_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_destination_field.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_settings_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_late_join_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'custom rules survive mode changes and a closed uncertain save at $scale',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(430, 932);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final repository = LateJoinUiRepository();
        final auth = StreamController<String?>.broadcast();
        addTearDown(auth.close);
        final boundary = GlobalKey();
        final scope = lateJoinUiScope();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              uidProvider.overrideWith((ref) => auth.stream),
              eventAssistanceLateJoinSettingRepositoryProvider.overrideWith(
                (ref) => repository,
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
                  child: EventAssistanceLiveSettingsSection(
                    event: buildEvent(
                      id: scope.eventId,
                      clubId: scope.organizerId,
                    ),
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
          if (Platform.environment['CAPTURE_LATE_JOIN_SETTINGS'] != '1') return;
          await tester.runAsync(() async {
            final image =
                await (boundary.currentContext!.findRenderObject()!
                        as RenderRepaintBoundary)
                    .toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await File(
              '/tmp/late-join-$name-$scale.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await tap(find.byKey(const ValueKey('lateJoin.open')));
        expect(find.byType(EventAssistanceLateJoinSection), findsOneWidget);
        expect(
          find.byType(EventAssistanceLateJoinDestinationField),
          findsNothing,
        );
        expect(repository.writes, isEmpty);
        await capture('summary');
        await tap(find.byKey(const ValueKey('lateJoin.customize')));
        expect(
          find.byType(EventAssistanceLateJoinDestinationField),
          findsOneWidget,
        );
        expect(repository.writes, isEmpty);
        await capture('rules');
        await tap(find.byKey(const ValueKey('lateJoin.mode')));
        await tap(find.text('Off').hitTestable());
        await tap(find.byKey(const ValueKey('lateJoin.save')));
        expect(repository.writes, hasLength(1));
        final original = repository.writes.single.change;
        final preference = original.preference as LateJoinConfigured;
        expect(preference.template.setting, isA<AssistanceTemplateDisabled>());
        final before =
            lateJoinUiView('custom').own!.preference as LateJoinConfigured;
        expect(
          preference.template.rules.toJson(),
          before.template.rules.toJson(),
        );
        repository.writes.single.result.completeError(
          const NetworkException('unavailable', 'Lost reply'),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Check save result'), findsOneWidget);
        await tap(find.text('Done'));
        await tap(find.byKey(const ValueKey('lateJoin.pending.event:whole')));
        await tap(find.text('Check save result'));
        expect(repository.writes.last.change, same(original));
        repository.confirmDisabled();
        await pumpFeatureUi(tester);
        expect(find.text('Turned off'), findsOneWidget);
        expect(
          find.text('Your current saved rules are shown below.'),
          findsOneWidget,
        );
        await capture('saved');
        await tap(find.text('Done'));
        expect(
          find.byKey(const ValueKey('lateJoin.pending.event:whole')),
          findsNothing,
        );
        expect(repository.writes, hasLength(2));
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'sign-out hides an uncertain settings review and its recovery entry',
    (tester) async {
      final repository = LateJoinUiRepository();
      final auth = StreamController<String?>.broadcast();
      addTearDown(auth.close);
      final scope = lateJoinUiScope();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => auth.stream),
            eventAssistanceLateJoinSettingRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: SingleChildScrollView(
                child: EventAssistanceLiveSettingsSection(
                  event: buildEvent(
                    id: scope.eventId,
                    clubId: scope.organizerId,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      auth.add('host-1');
      await pumpFeatureUi(tester);
      await tester.tap(find.byKey(const ValueKey('lateJoin.open')));
      await pumpFeatureUi(tester);
      await tester.ensureVisible(find.byKey(const ValueKey('lateJoin.save')));
      await tester.tap(find.byKey(const ValueKey('lateJoin.save')));
      await pumpFeatureUi(tester);
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost reply'),
      );
      await pumpFeatureUi(tester);
      auth.add(null);
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceLateJoinSection), findsNothing);
      expect(find.text('Check save result'), findsNothing);
      expect(
        find.byKey(const ValueKey('lateJoin.pending.event:whole')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
