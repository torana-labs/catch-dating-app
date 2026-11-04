import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _viewportKey = ValueKey('dock-viewport');

void main() {
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'primary dock keeps platform clearance at $platform / $scale',
        (tester) async {
          var pressed = 0;
          await tester.pumpWidget(
            _frame(
              platform: platform,
              scale: scale,
              child: CatchLegacyDock.primary(
                label: 'Save',
                onPressed: () => pressed++,
              ),
            ),
          );
          final viewport = tester.getRect(find.byKey(_viewportKey));
          final button = find.widgetWithText(CatchButton, 'Save');
          final buttonRect = tester.getRect(button);
          expect(
            viewport.bottom - buttonRect.bottom,
            closeTo(24 + CatchSpacing.s3, 0.01),
          );
          final floating = platform == TargetPlatform.iOS;
          final chrome = find.byKey(
            ValueKey(
              floating
                  ? 'catch_bottom_action.floating_chrome'
                  : 'catch_bottom_action.anchored_chrome',
            ),
          );
          final chromeRect = tester.getRect(chrome);
          expect(
            chromeRect.left - viewport.left,
            floating ? CatchSpacing.screenPx : 0,
          );
          expect(viewport.bottom - chromeRect.bottom, floating ? 24 : 0);
          await tester.tap(button);
          await tester.pumpAndSettle();
          expect(pressed, 1);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  for (final safeArea in [true, false]) {
    testWidgets('utility dock has one optional safe region: $safeArea', (
      tester,
    ) async {
      const bodyKey = ValueKey('utility-body');
      await tester.pumpWidget(
        _frame(
          child: CatchLegacyDock(
            includeSafeArea: safeArea,
            child: const SizedBox(key: bodyKey, height: 40),
          ),
        ),
      );
      expect(
        tester.getBottomRight(find.byKey(_viewportKey)).dy -
            tester.getBottomRight(find.byKey(bodyKey)).dy,
        CatchSpacing.s3 + (safeArea ? 24 : 0),
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('embedded primary content leaves safe area to its caller', (
    tester,
  ) async {
    await tester.pumpWidget(
      _frame(
        child: CatchLegacyDock.primaryContent(
          label: 'Next',
          leading: const Text('Step 2'),
          onPressed: () {},
        ),
      ),
    );
    final button = find.widgetWithText(CatchButton, 'Next');
    expect(
      tester.getBottomRight(find.byKey(_viewportKey)).dy -
          tester.getBottomRight(button).dy,
      CatchSpacing.s3,
    );
    expect(
      find.byKey(const ValueKey('catch_bottom_action.floating_chrome')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('catch_bottom_action.anchored_chrome')),
      findsNothing,
    );
    expect(find.text('Step 2'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('pending primary action cannot be submitted again', (
    tester,
  ) async {
    var pressed = 0;
    await tester.pumpWidget(
      _frame(
        child: CatchLegacyDock.primary(
          label: 'Save',
          isLoading: true,
          onPressed: () => pressed++,
        ),
      ),
    );
    await tester.tap(find.byType(CatchButton));
    await tester.pump();
    expect(pressed, 0);
    expect(tester.takeException(), isNull);
  });
}

Widget _frame({
  required Widget child,
  TargetPlatform platform = TargetPlatform.iOS,
  double scale = 1,
}) => MaterialApp(
  theme: CatchTheme.light.copyWith(platform: platform),
  home: Scaffold(
    body: MediaQuery(
      data: MediaQueryData(
        padding: const EdgeInsets.only(bottom: 24),
        textScaler: TextScaler.linear(scale),
      ),
      child: Align(
        alignment: Alignment.topCenter,
        child: SizedBox(
          key: _viewportKey,
          width: 440,
          height: 240,
          child: Align(alignment: Alignment.bottomCenter, child: child),
        ),
      ),
    ),
  ),
);
