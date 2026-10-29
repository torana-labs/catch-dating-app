import 'dart:math' as math;

import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/startup/startup_animation_scope.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'onboarding_test_helpers.dart';

void main() {
  group('Welcome reel handoff', () {
    testWidgets('does not replay after the consumer cold-start reel', (
      tester,
    ) async {
      final reporter = _WelcomeReelAnalyticsReporter();
      final container = createOnboardingTestContainer(
        appAnalytics: AppAnalytics(reporter: reporter, shouldCollect: true),
      );
      addTearDown(container.dispose);

      await pumpOnboardingPage(
        tester,
        container: container,
        child: const StartupAnimationScope(
          consumerWelcomeReelPlayed: true,
          child: OnboardingWelcomeBody(),
        ),
      );

      expect(
        find.widgetWithText(CatchButton, 'Continue with phone'),
        findsOneWidget,
      );
      expect(
        find.widgetWithText(CatchButton, 'See what\'s on'),
        findsOneWidget,
      );
      expect(
        reporter.events.single.parameters,
        containsPair(AnalyticsParameters.splashMotion, 'direct'),
      );
    });

    testWidgets('landed scene pins reel and CTA anchors', (tester) async {
      tester.view.physicalSize = const Size(320, 630);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: WelcomeSceneLayout(
            viewportWidth: 320,
            viewportHeight: 630,
            mediaPadding: EdgeInsets.zero,
            spinValue: 1,
            landingValue: 1,
            landed: true,
            onContinue: () {},
            onExplore: () {},
          ),
        ),
      );

      final catchFinder = find.byKey(WelcomeSceneLayout.catchWordKey);
      final catchTopLeft = tester.getTopLeft(catchFinder);
      expect(
        catchTopLeft.dx,
        closeTo(CatchWelcomeTokens.welcomeReelCatchLeft, 0.1),
      );
      expect(
        catchTopLeft.dy,
        closeTo(
          CatchWelcomeTokens.welcomeReelTop +
              CatchWelcomeTokens.welcomeReelCatchFocusTop,
          0.1,
        ),
      );

      final focusTextFinder = find.descendant(
        of: catchFinder,
        matching: find.byKey(WelcomeFocusText.textKey),
      );
      final focusText = tester.widget<Text>(focusTextFinder);
      final rootSpan = focusText.textSpan! as TextSpan;
      expect(rootSpan.toPlainText(), 'Catch the sunset 5K.');
      expect((rootSpan.children![1] as TextSpan).text, ' ');
      expect((rootSpan.children!.last as TextSpan).text, 'the sunset 5K.');
      expect(focusText.maxLines, 1);
      expect(
        focusText.style!.fontVariations,
        contains(const FontVariation('wdth', CatchFonts.archivoWidth)),
      );

      final focusTextTopLeft = tester.getTopLeft(focusTextFinder);
      expect(focusTextTopLeft.dy, closeTo(catchTopLeft.dy, 0.1));

      final underlineFinder = find.descendant(
        of: catchFinder,
        matching: find.byKey(WelcomeFocusText.underlineKey),
      );
      final underlineRect = tester.getRect(underlineFinder);
      expect(
        underlineRect.top,
        greaterThan(tester.getBottomLeft(focusTextFinder).dy),
      );
      expect(underlineRect.left, greaterThan(catchTopLeft.dx));
      expect(
        underlineRect.right,
        lessThanOrEqualTo(
          320 - CatchWelcomeTokens.welcomeReelRightForWidth(320) + 0.1,
        ),
      );
      expect(find.byKey(WelcomeReelRow.focusedUnderlineKey), findsNothing);

      expect(
        tester
            .getBottomLeft(find.widgetWithText(CatchButton, 'See what\'s on'))
            .dy,
        closeTo(630 - CatchWelcomeTokens.welcomeButtonsBottom, 0.1),
      );
    });

    testWidgets('spinning focus treatment stays pinned to the Catch baseline', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(393, 852);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      const padding = EdgeInsets.only(top: 59, bottom: 34);

      for (final spinValue in <double>[0.12, 0.42, 0.73]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: WelcomeSceneLayout(
              key: ValueKey<double>(spinValue),
              viewportWidth: 393,
              viewportHeight: 852,
              mediaPadding: padding,
              spinValue: spinValue,
              landingValue: 0,
              landed: false,
              onContinue: () {},
              onExplore: () {},
            ),
          ),
        );

        final lockupFinder = find.byKey(WelcomeSceneLayout.catchWordKey);
        final textFinder = find.descendant(
          of: lockupFinder,
          matching: find.byKey(WelcomeFocusText.textKey),
        );
        final text = tester.widget<Text>(textFinder);
        expect(text.textSpan!.toPlainText(), startsWith('Catch '));
        expect(
          tester.getTopLeft(lockupFinder).dy,
          closeTo(CatchWelcomeTokens.welcomeReelCatchTopFor(padding), 0.1),
        );
        expect(find.byKey(WelcomeFocusText.underlineKey), findsOneWidget);
        expect(find.byKey(WelcomeReelRow.focusedUnderlineKey), findsNothing);
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('focus lockup fits supported phone widths and large text', (
      tester,
    ) async {
      const devices = <({Size size, EdgeInsets padding})>[
        (size: Size(320, 568), padding: EdgeInsets.only(top: 20)),
        (size: Size(375, 667), padding: EdgeInsets.only(top: 20)),
        (size: Size(393, 852), padding: EdgeInsets.only(top: 59, bottom: 34)),
        (size: Size(430, 932), padding: EdgeInsets.only(top: 59, bottom: 34)),
      ];
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      for (final device in devices) {
        tester.view.physicalSize = device.size;
        tester.view.devicePixelRatio = 1;
        final sceneWidth = math.min(
          device.size.width,
          CatchWelcomeTokens.welcomeMaxWidth,
        );
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: MediaQuery(
              data: MediaQueryData(
                size: device.size,
                padding: device.padding,
                textScaler: const TextScaler.linear(1.5),
              ),
              child: Align(
                alignment: Alignment.topCenter,
                child: SizedBox(
                  width: sceneWidth,
                  height: device.size.height,
                  child: WelcomeSceneLayout(
                    viewportWidth: sceneWidth,
                    viewportHeight: device.size.height,
                    mediaPadding: device.padding,
                    spinValue: 1,
                    landingValue: 1,
                    landed: true,
                    showLandingContent: false,
                    onContinue: () {},
                    onExplore: () {},
                  ),
                ),
              ),
            ),
          ),
        );

        final lockupRect = tester.getRect(
          find.byKey(WelcomeSceneLayout.catchWordKey),
        );
        expect(lockupRect.left, greaterThanOrEqualTo(0));
        expect(lockupRect.right, lessThanOrEqualTo(device.size.width));
        expect(lockupRect.top, greaterThanOrEqualTo(device.padding.top));
        expect(
          tester
              .widget<Text>(find.byKey(WelcomeFocusText.textKey))
              .textSpan!
              .toPlainText(),
          'Catch the sunset 5K.',
        );
        expect(tester.takeException(), isNull);
      }
    });
  });
}

final class _WelcomeReelAnalyticsEvent {
  const _WelcomeReelAnalyticsEvent(this.name, this.parameters);

  final String name;
  final Map<String, Object>? parameters;
}

final class _WelcomeReelAnalyticsReporter implements AnalyticsReporter {
  final events = <_WelcomeReelAnalyticsEvent>[];

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add(_WelcomeReelAnalyticsEvent(name, parameters));
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}
