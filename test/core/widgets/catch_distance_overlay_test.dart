import 'dart:ui' show Tristate;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';

Finder get _circle => find.byWidgetPredicate((widget) {
  if (widget is! DecoratedBox) return false;
  final decoration = widget.decoration;
  return decoration is BoxDecoration && decoration.shape == BoxShape.circle;
});

void main() {
  setUpAll(loadCatchTestFonts);

  for (final fitAvailable in [false, true]) {
    for (final labelled in [false, true]) {
      testWidgets('radius geometry: fitted=$fitAvailable / label=$labelled', (
        tester,
      ) async {
        await tester.pumpWidget(
          _frame(
            SizedBox(
              width: 240,
              height: 180,
              child: Center(
                child: CatchDistanceOverlay(
                  fitAvailable: fitAvailable,
                  label: labelled ? '  2 km  ' : null,
                ),
              ),
            ),
          ),
        );
        final diameter = fitAvailable ? 162.0 : 170.0;
        expect(tester.getSize(_circle), Size.square(diameter));
        final circleTop = tester.getTopLeft(_circle).dy;
        final overlay = find.byType(CatchDistanceOverlay);
        expect(
          circleTop - tester.getTopLeft(overlay).dy,
          labelled ? CatchLayout.distanceRingLabelOverhang : 0,
        );
        if (labelled) {
          expect(find.text('2 km'), findsOneWidget);
          final label = find.byType(CatchLegacySurface);
          expect(tester.getCenter(label).dx, tester.getCenter(_circle).dx);
          expect(tester.getTopLeft(label).dy, tester.getTopLeft(overlay).dy);
        }
        expect(tester.takeException(), isNull);
      });
    }
  }

  for (final label in ['', ' \n ']) {
    testWidgets('an empty radius label creates no annotation: $label', (
      tester,
    ) async {
      await tester.pumpWidget(_frame(CatchDistanceOverlay(label: label)));
      expect(_circle, findsOneWidget);
      expect(find.byType(CatchLegacySurface), findsNothing);
    });
  }

  for (final scale in [1.0, 2.0]) {
    testWidgets('radius label stays inside its width at $scale', (
      tester,
    ) async {
      const label = 'within comfortable walking distance';
      await tester.pumpWidget(
        _frame(const CatchDistanceOverlay(label: label), scale: scale),
      );
      final circle = tester.getRect(_circle);
      final surface = tester.getRect(find.byType(CatchLegacySurface));
      expect(surface.left, greaterThanOrEqualTo(circle.left));
      expect(surface.right, lessThanOrEqualTo(circle.right));
      final paragraph = tester.renderObject<RenderParagraph>(find.text(label));
      final boxes = paragraph.getBoxesForSelection(
        const TextSelection(baseOffset: 0, extentOffset: label.length),
      );
      expect(boxes.length, greaterThan(1), reason: 'Reflow the whole label.');
      for (final box in boxes) {
        expect(box.left, greaterThanOrEqualTo(0));
        expect(box.right, lessThanOrEqualTo(paragraph.size.width));
      }
      expect(tester.takeException(), isNull);
    });

    testWidgets('native-map label wraps and activates once at $scale', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      try {
        var taps = 0;
        await tester.pumpWidget(
          _frame(
            SizedBox(
              width: 150,
              child: CatchDistanceOverlay.label(
                label: 'Within walking distance',
                semanticLabel: 'Distance filter',
                semanticHint: 'Change the map radius',
                onTap: () => taps++,
              ),
            ),
            scale: scale,
          ),
        );
        expect(_circle, findsNothing);
        final surface = find.byType(CatchLegacySurface);
        final size = tester.getSize(surface);
        expect(size.width, 150);
        expect(size.height, greaterThanOrEqualTo(48));
        final node = tester.getSemantics(
          find.bySemanticsLabel('Distance filter'),
        );
        final data = node.getSemanticsData();
        expect(data.flagsCollection.isButton, isTrue);
        expect(data.hasAction(SemanticsAction.tap), isTrue);
        expect(data.hint, 'Change the map radius');
        await tester.tap(surface);
        expect(taps, 1);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        expect(taps, 2);
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    });
  }

  testWidgets('a passive native annotation is not a disabled button', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        _frame(const CatchDistanceOverlay.label(label: '3 km')),
      );
      final data = tester
          .getSemantics(find.bySemanticsLabel('3 km'))
          .getSemanticsData();
      expect(data.flagsCollection.isButton, isFalse);
      expect(data.flagsCollection.isEnabled != Tristate.none, isFalse);
      expect(data.hasAction(SemanticsAction.tap), isFalse);
      expect(_circle, findsNothing);
    } finally {
      semantics.dispose();
    }
  });
}

Widget _frame(Widget child, {double scale = 1}) => MaterialApp(
  theme: CatchTheme.light,
  home: MediaQuery(
    data: MediaQueryData(textScaler: TextScaler.linear(scale)),
    child: Scaffold(body: Center(child: child)),
  ),
);
