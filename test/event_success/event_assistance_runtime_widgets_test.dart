import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_settings_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_limits_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_runtime_section.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_runtime_ui_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets('a replayed pause displays newer configured state honestly', (
    tester,
  ) async {
    final view = runtimeUiView('configured');
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: EventAssistanceRuntimeSection(
              reviewIdentity: Object(),
              view: view,
              choices: view.senderSetup!.choices,
              moreRoutes: const {},
              phase: EventAssistanceRuntimePhase.saved,
              canChooseSenders: false,
              submitted: const AssistanceRuntimePause(),
              onConfigure: (_) {},
              onPause: () {},
              onMore: (_) {},
              onRetry: () {},
              onReload: () {},
              onDone: () {},
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Configured for this event'), findsOneWidget);
    expect(find.textContaining('Automation paused.'), findsNothing);
    expect(find.textContaining('Settings saved.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'channels, optional limits and exact retry remain usable at $scale',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(430, 932);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final repository = RuntimeUiRepository();
        final boundary = GlobalKey();
        await tester.pumpWidget(
          _app(repository, scale: scale, boundary: boundary),
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
          if (Platform.environment['CAPTURE_RUNTIME_SETTINGS'] != '1') return;
          await tester.runAsync(() async {
            final image =
                await (boundary.currentContext!.findRenderObject()!
                        as RenderRepaintBoundary)
                    .toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await File(
              '/tmp/runtime-$name-$scale.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }

        await tap(find.byKey(const ValueKey('runtime.open')));
        expect(find.byType(EventAssistanceRuntimeSection), findsOneWidget);
        expect(find.byType(EventAssistanceRuntimeLimitsSection), findsNothing);
        expect(repository.writes, isEmpty);
        await capture('initial');
        await tap(find.byKey(const ValueKey('runtime.channel.0')));
        final choice = repository.view.senderSetup!.choices.first;
        await tap(
          find
              .text(runtimeSenderLabel(AppLocalizationsEn(), choice))
              .hitTestable(),
        );
        await tap(find.byKey(const ValueKey('runtime.customize')));
        expect(
          find.byType(EventAssistanceRuntimeLimitsSection),
          findsOneWidget,
        );
        expect(repository.writes, isEmpty);
        await capture('limits');
        await tap(find.byKey(const ValueKey('runtime.customize')));
        await tap(find.byKey(const ValueKey('runtime.save')), busy: true);
        expect(repository.writes, hasLength(1));
        final original = repository.writes.single.change;
        final configuration =
            (original.command as AssistanceRuntimeConfigure).configuration;
        expect(configuration.routes.single.senderId, choice.senderId);
        expect(original.senderReviews!.single.reviewHash, choice.reviewHash);
        expect(configuration.responseDeadline, isNull);
        repository.writes.single.result.completeError(
          const NetworkException('unavailable', 'Lost reply'),
        );
        await pumpFeatureUi(tester);
        expect(find.byKey(const ValueKey('runtime.retry')), findsOneWidget);
        await capture('uncertain');
        await tap(find.byKey(const ValueKey('runtime.done')));
        expect(find.text('Confirm your previous update'), findsOneWidget);
        await tap(find.byKey(const ValueKey('runtime.open')));
        await tap(find.byKey(const ValueKey('runtime.retry')), busy: true);
        expect(repository.writes.last.change, same(original));
        repository.confirm();
        await pumpFeatureUi(tester);
        expect(find.text('Configured for this event'), findsOneWidget);
        await capture('saved');
        await tap(find.byKey(const ValueKey('runtime.done')));
        expect(find.text('Confirm your previous update'), findsNothing);
        expect(repository.writes, hasLength(2));
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('pause remains available with no eligible senders', (
    tester,
  ) async {
    final repository = RuntimeUiRepository(
      stage: 'configured',
      noSenders: true,
    );
    await tester.pumpWidget(_app(repository));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('runtime.open')));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.byKey(const ValueKey('runtime.pause')));
    await tester.tap(find.byKey(const ValueKey('runtime.pause')));
    await tester.pump();
    expect(
      repository.writes.single.change.command,
      isA<AssistanceRuntimePause>(),
    );
    expect(repository.writes.single.change.senderReviews, isNull);
    repository.confirm();
    await pumpFeatureUi(tester);
    expect(find.text('Paused'), findsOneWidget);
    expect(find.textContaining('already accepted'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('sign-out removes a private pending review and recovery prompt', (
    tester,
  ) async {
    final repository = RuntimeUiRepository(stage: 'configured');
    final auth = StreamController<String?>.broadcast();
    addTearDown(auth.close);
    await tester.pumpWidget(_app(repository, auth: auth.stream));
    await tester.pump();
    auth.add('host-1');
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('runtime.open')));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.byKey(const ValueKey('runtime.pause')));
    await tester.tap(find.byKey(const ValueKey('runtime.pause')));
    await tester.pump();
    repository.writes.single.result.completeError(
      const NetworkException('unavailable', 'Lost reply'),
    );
    await pumpFeatureUi(tester);
    auth.add(null);
    await pumpFeatureUi(tester);
    expect(find.byType(EventAssistanceRuntimeSection), findsNothing);
    expect(find.text('Confirm your previous update'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

Widget _app(
  RuntimeUiRepository repository, {
  double scale = 1,
  GlobalKey? boundary,
  Stream<String?>? auth,
}) {
  final scope = repository.view.scope;
  return ProviderScope(
    overrides: [
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      uidProvider.overrideWith((ref) => auth ?? Stream.value('host-1')),
      // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
      eventAssistanceRuntimeRepositoryProvider.overrideWith(
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
              organizerId: scope.organizerId,
            ),
          ),
        ),
      ),
    ),
  );
}
