import 'dart:async';

import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/consumer_bootstrap.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  test('animated bootstrap is consumer mobile only', () {
    expect(
      usesAnimatedConsumerBootstrap(
        appRole: AppRole.consumer,
        isWeb: false,
        platform: TargetPlatform.iOS,
      ),
      isTrue,
    );
    expect(
      usesAnimatedConsumerBootstrap(
        appRole: AppRole.consumer,
        isWeb: false,
        platform: TargetPlatform.android,
      ),
      isTrue,
    );
    expect(
      usesAnimatedConsumerBootstrap(
        appRole: AppRole.host,
        isWeb: false,
        platform: TargetPlatform.iOS,
      ),
      isFalse,
    );
    expect(
      usesAnimatedConsumerBootstrap(
        appRole: AppRole.consumer,
        isWeb: true,
        platform: TargetPlatform.iOS,
      ),
      isFalse,
    );
    expect(
      usesAnimatedConsumerBootstrap(
        appRole: AppRole.consumer,
        isWeb: false,
        platform: TargetPlatform.macOS,
      ),
      isFalse,
    );
  });

  testWidgets('initialized app waits for both startup work and the reel', (
    tester,
  ) async {
    var nativeHandoffs = 0;

    await tester.pumpWidget(
      CatchConsumerBootstrap(
        initialize: () async {},
        initializedAppBuilder: (_) =>
            const MaterialApp(home: Text('Initialized app')),
        onNativeSplashReady: () => nativeHandoffs += 1,
        prepareFirstFrame: _prepareFirstFrame,
      ),
    );

    expect(find.text('Initialized app'), findsNothing);
    expect(find.byKey(CatchConsumerBootstrap.bootKey), findsOneWidget);

    await tester.tap(find.byKey(CatchConsumerBootScreen.tapTargetKey));
    await _pumpConsumerBootstrap(tester);

    expect(find.text('Initialized app'), findsOneWidget);
    expect(nativeHandoffs, 1);
  });

  testWidgets('startup work can outlast the reel without exposing the router', (
    tester,
  ) async {
    final initialization = Completer<void>();
    var nativeHandoffs = 0;

    await tester.pumpWidget(
      CatchConsumerBootstrap(
        initialize: () => initialization.future,
        initializedAppBuilder: (_) =>
            const MaterialApp(home: Text('Initialized app')),
        onNativeSplashReady: () => nativeHandoffs += 1,
        playIntro: false,
        prepareFirstFrame: _prepareFirstFrame,
      ),
    );
    await _pumpConsumerBootstrap(tester);

    expect(find.text('Initialized app'), findsNothing);
    expect(find.text('Catch the sunset 5K.'), findsOneWidget);
    expect(nativeHandoffs, 1);

    initialization.complete();
    await _pumpConsumerBootstrap(tester);

    expect(find.text('Initialized app'), findsOneWidget);
  });

  testWidgets('handoff never overlaps independent MaterialApp roots', (
    tester,
  ) async {
    final initialization = Completer<void>();

    await tester.pumpWidget(
      CatchConsumerBootstrap(
        initialize: () => initialization.future,
        initializedAppBuilder: (_) =>
            const MaterialApp(home: Text('Initialized app')),
        onNativeSplashReady: () {},
        playIntro: false,
        prepareFirstFrame: _prepareFirstFrame,
      ),
    );
    await _pumpConsumerBootstrap(tester);

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byKey(CatchConsumerBootstrap.bootKey), findsOneWidget);

    initialization.complete();
    await tester.pump();
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byKey(CatchConsumerBootstrap.bootKey), findsNothing);
    expect(find.byKey(CatchConsumerBootstrap.initializedKey), findsOneWidget);
    expect(find.text('Initialized app'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'bootstrap failure is retryable and never repeats native handoff',
    (tester) async {
      var attempts = 0;
      var nativeHandoffs = 0;
      final reportedErrors = <(Object, StackTrace)>[];

      await tester.pumpWidget(
        CatchConsumerBootstrap(
          initialize: () async {
            attempts += 1;
            if (attempts == 1) throw StateError('startup failed');
          },
          onInitializationError: (error, stackTrace) {
            reportedErrors.add((error, stackTrace));
          },
          initializedAppBuilder: (_) =>
              const MaterialApp(home: Text('Initialized app')),
          onNativeSplashReady: () => nativeHandoffs += 1,
          playIntro: false,
          prepareFirstFrame: _prepareFirstFrame,
        ),
      );
      await _pumpConsumerBootstrap(tester);

      expect(find.byKey(CatchConsumerBootstrap.failureKey), findsOneWidget);
      expect(find.widgetWithText(CatchButton, 'Try again'), findsOneWidget);
      expect(reportedErrors, hasLength(1));
      expect(reportedErrors.single.$1, isA<StateError>());
      expect(reportedErrors.single.$2.toString(), isNotEmpty);

      await tester.tap(find.widgetWithText(CatchButton, 'Try again'));
      await _pumpConsumerBootstrap(tester);

      expect(attempts, 2);
      expect(reportedErrors, hasLength(1));
      expect(nativeHandoffs, 1);
      expect(find.text('Initialized app'), findsOneWidget);
    },
  );

  testWidgets('boot reel lands without mounting logged-out actions', (
    tester,
  ) async {
    var firstFrames = 0;
    var completions = 0;

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: CatchConsumerBootScreen(
          playIntro: false,
          onFirstFlutterFrameReady: () => firstFrames += 1,
          onAnimationComplete: () => completions += 1,
          prepareFirstFrame: _prepareFirstFrame,
        ),
      ),
    );
    await _pumpConsumerBootstrap(tester);

    expect(firstFrames, 1);
    expect(completions, 1);
    expect(find.text('Catch the sunset 5K.'), findsOneWidget);
    expect(
      find.widgetWithText(CatchButton, 'Continue with phone'),
      findsNothing,
    );
    expect(find.widgetWithText(CatchButton, 'See what\'s on'), findsNothing);
  });

  testWidgets('static Catch_ and reel Catch share the exact device anchor', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const padding = EdgeInsets.only(top: 59, bottom: 34);

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: MediaQuery(
          data: const MediaQueryData(size: Size(393, 852), padding: padding),
          child: CatchConsumerBootScreen(
            onFirstFlutterFrameReady: () {},
            onAnimationComplete: () {},
            prepareFirstFrame: _prepareFirstFrame,
          ),
        ),
      ),
    );

    final staticFinder = find.byKey(CatchConsumerBootScreen.markKey);
    final reelFinder = find.byKey(WelcomeSceneLayout.catchWordKey);
    expect(tester.getTopLeft(staticFinder), tester.getTopLeft(reelFinder));
    expect(
      tester.getTopLeft(staticFinder).dy,
      closeTo(CatchWelcomeTokens.welcomeReelCatchTopFor(padding), 0.1),
    );

    final staticText = tester.widget<Text>(
      find.descendant(
        of: staticFinder,
        matching: find.byKey(WelcomeFocusText.textKey),
      ),
    );
    final reelText = tester.widget<Text>(
      find.descendant(
        of: reelFinder,
        matching: find.byKey(WelcomeFocusText.textKey),
      ),
    );
    expect(staticText.textSpan!.toPlainText(), 'Catch_');
    expect(reelText.textSpan!.toPlainText(), startsWith('Catch '));
    expect(tester.takeException(), isNull);
  });
}

Future<void> _prepareFirstFrame(BuildContext context, String asset) async {}

Future<void> _pumpConsumerBootstrap(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}
