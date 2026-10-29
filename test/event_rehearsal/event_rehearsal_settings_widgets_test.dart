import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_runtime_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_settings_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_limits_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_rehearsal_settings_ui_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'practice defaults, optional controls and exact retry at $scale',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(430, 932);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final repository = SettingsUiRepository();
        final boundary = GlobalKey();
        await tester.pumpWidget(
          app(repository, scale: scale, boundary: boundary),
        );
        await pumpFeatureUi(tester);
        Future<void> tap(Finder finder, {bool busy = false}) async {
          await tester.ensureVisible(finder);
          await tester.tap(finder);
          if (busy) {
            await tester.pump();
          } else {
            await pumpFeatureUi(tester);
          }
        }

        Future<void> capture(String name) async {
          if (Platform.environment['CAPTURE_PRACTICE_SETTINGS'] != '1') return;
          await tester.runAsync(() async {
            final image =
                await (boundary.currentContext!.findRenderObject()!
                        as RenderRepaintBoundary)
                    .toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await File(
              '/tmp/practice-settings-$name-$scale.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await tap(find.byKey(const ValueKey('practice.openRuntime')));
        expect(find.byType(EventRehearsalRuntimeSection), findsOneWidget);
        expect(find.byType(EventAssistanceRuntimeLimitsSection), findsNothing);
        expect(repository.writes, isEmpty);
        await capture('initial');
        await tap(find.byKey(const ValueKey('practice.customize')));
        expect(
          find.byType(EventAssistanceRuntimeLimitsSection),
          findsOneWidget,
        );
        await tap(find.byKey(const ValueKey('practice.addOutcome')));
        await capture('advanced');
        await tap(find.byKey(const ValueKey('practice.save')), busy: true);
        final original = repository.writes.single.change;
        expect(
          (original.decision as RehearsalConfigureUpdates).configuration.routes,
          hasLength(2),
        );
        expect(
          (original.decision as RehearsalConfigureUpdates)
              .configuration
              .outcomes,
          hasLength(2),
        );
        repository.writes.single.result.completeError(
          const NetworkException('unavailable', 'Lost confirmation'),
        );
        await pumpFeatureUi(tester);
        await capture('uncertain');
        await tap(find.byKey(const ValueKey('practice.runtime.done')));
        expect(
          find.byKey(const ValueKey('practice.pendingSettings')),
          findsOneWidget,
        );
        // A different entry must recover the original runtime decision.
        await tap(find.byKey(const ValueKey('practice.openRule')));
        expect(find.byType(EventRehearsalRuntimeSection), findsOneWidget);
        expect(find.byType(EventAssistanceLateJoinSection), findsNothing);
        await tap(find.byKey(const ValueKey('practice.retry')), busy: true);
        expect(repository.writes.last.change, same(original));
        repository.confirm();
        await pumpFeatureUi(tester);
        await capture('saved');
        await tap(find.byKey(const ValueKey('practice.runtime.done')));
        expect(
          find.byKey(const ValueKey('practice.pendingSettings')),
          findsNothing,
        );
        await tap(find.byKey(const ValueKey('practice.openRule')));
        expect(find.byType(EventAssistanceLateJoinSection), findsOneWidget);
        expect(repository.writes, hasLength(2));
        await tap(find.byKey(const ValueKey('lateJoin.save')), busy: true);
        expect(repository.writes.last.change.decision, isA<RehearsalSetRule>());
        repository.confirm();
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final withDeadline in [false, true]) {
    testWidgets(
      'practice deadline prerequisite is visible before Save: $withDeadline',
      (tester) async {
        final repository = SettingsUiRepository(stage: 'configured');
        if (withDeadline) {
          final runtime =
              (repository.raw['settingsReview'] as Map)['runtime'] as Map;
          (runtime['configuration'] as Map)['responseDeadline'] =
              repository.snapshot.settingsReview!.serverTime + 60000;
        }
        await tester.pumpWidget(app(repository));
        await pumpFeatureUi(tester);
        Future<void> tap(Finder target) async {
          await tester.ensureVisible(target);
          await tester.tap(target);
          await pumpFeatureUi(tester);
        }

        await tap(find.byKey(const ValueKey('practice.openRule')));
        await tap(find.byKey(const ValueKey('lateJoin.customize')));
        await tap(find.byKey(const ValueKey('lateJoin.unanswered')));
        await tap(find.text('Ask a host to review').hitTestable());
        final save = find.byKey(const ValueKey('lateJoin.save'));
        expect(
          tester.widget<CatchButton>(save).onPressed,
          withDeadline ? isNotNull : isNull,
        );
        expect(
          find.text('Set a response deadline'),
          withDeadline ? findsNothing : findsOneWidget,
        );
        expect(repository.writes, isEmpty);
        // Switching to a rule with no deadline dependency remains an immediate
        // correction; the form does not erase the host's other choices.
        await tap(find.text('Keep arrival unknown').hitTestable());
        expect(tester.widget<CatchButton>(save).onPressed, isNotNull);
        expect(find.text('Set a response deadline'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('read-only practice cannot configure or pause', (tester) async {
    final repository = SettingsUiRepository(stage: 'complete');
    await tester.pumpWidget(app(repository));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('practice.openRuntime')));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('practice.save')), findsNothing);
    expect(find.byKey(const ValueKey('practice.pause')), findsNothing);
    expect(repository.writes, isEmpty);
    expect(tester.takeException(), isNull);
  });
}

Widget app(
  SettingsUiRepository repository, {
  double scale = 1,
  GlobalKey? boundary,
}) => ProviderScope(
  overrides: [
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    uidProvider.overrideWith((ref) => Stream.value('host-1')),
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
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
        child: EventRehearsalSettingsSection(
          sessionId: repository.snapshot.session.id,
          review: repository.snapshot.settingsReview!,
        ),
      ),
    ),
  ),
);
