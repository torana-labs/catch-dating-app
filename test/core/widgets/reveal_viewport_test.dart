import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final stationary in [false, true]) {
    testWidgets('reveal owns one animation listener, stationary $stationary', (
      tester,
    ) async {
      final first = _TrackedAnimation();
      final second = _TrackedAnimation();
      Widget frame(Animation<double> animation, int revision) => MaterialApp(
        theme: AppTheme.light,
        home: SizedBox(
          width: 200,
          height: 200,
          child: stationary
              ? CatchRevealViewport.stationary(
                  animation: animation,
                  child: Text('Revision $revision'),
                )
              : CatchRevealViewport(
                  animation: animation,
                  child: Text('Revision $revision'),
                ),
        ),
      );

      await tester.pumpWidget(frame(first, 0));
      expect(first.statusListeners, hasLength(1));
      await tester.pumpWidget(frame(first, 1));
      expect(first.statusListeners, hasLength(1));
      await tester.pumpWidget(frame(second, 2));
      expect(first.statusListeners, isEmpty);
      expect(second.statusListeners, hasLength(1));
      await tester.pumpWidget(const SizedBox.shrink());
      expect(second.statusListeners, isEmpty);
    });
  }

  testWidgets(
    'every reveal recipe exposes resting content with reduced motion',
    (tester) async {
      for (final variant in CatchRevealViewportVariant.values) {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: MediaQuery(
              data: const MediaQueryData(disableAnimations: true),
              child: CatchRevealViewport(
                variant: variant,
                animation: const AlwaysStoppedAnimation<double>(0),
                child: const SizedBox(
                  key: ValueKey('resting-child'),
                  width: 100,
                  height: 80,
                  child: ColoredBox(color: Colors.blue),
                ),
              ),
            ),
          ),
        );
        final viewport = find.byType(CatchRevealViewport);
        expect(
          find.byKey(const ValueKey('resting-child')).hitTestable(),
          findsOneWidget,
        );
        for (final type in [FadeTransition, ScaleTransition, CustomPaint]) {
          expect(
            find.descendant(of: viewport, matching: find.byType(type)),
            findsNothing,
          );
        }
      }
    },
  );
}

class _TrackedAnimation extends Animation<double> {
  final statusListeners = <AnimationStatusListener>{};

  @override
  double get value => 0.5;

  @override
  AnimationStatus get status => AnimationStatus.forward;

  @override
  void addListener(VoidCallback listener) {}

  @override
  void removeListener(VoidCallback listener) {}

  @override
  void addStatusListener(AnimationStatusListener listener) =>
      statusListeners.add(listener);

  @override
  void removeStatusListener(AnimationStatusListener listener) =>
      statusListeners.remove(listener);
}
