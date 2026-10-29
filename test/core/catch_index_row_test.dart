import 'dart:ui' show Tristate;

import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('CatchIndexRow owns selected button semantics and activation', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      var taps = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchIndexRow(
              title: 'Running',
              semanticLabel: 'Running events',
              selected: true,
              onTap: () => taps += 1,
            ),
          ),
        ),
      );

      final node = find.semantics.byLabel('Running events').evaluate().single;
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.flagsCollection.isEnabled == Tristate.isTrue, isTrue);
      expect(node.flagsCollection.isSelected == Tristate.isTrue, isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.semantics.tap(find.semantics.byLabel('Running events'));
      expect(taps, 1);
      final gesture = await tester.startGesture(
        tester.getCenter(find.byType(CatchIndexRow)),
      );
      await tester.pump();
      expect(find.byType(InkWell), findsNothing);
      expect(
        tester
            .widget<ColoredBox>(
              find.byKey(const ValueKey<String>('catch-row-press-overlay')),
            )
            .color,
        isNot(Colors.transparent),
      );
      await gesture.up();
      expect(taps, 2);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('a disabled index row keeps its label without a tap action', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: CatchIndexRow(title: 'Coming soon', onTap: null),
          ),
        ),
      );
      final node = find.semantics.byLabel('Coming soon').evaluate().single;
      expect(node.flagsCollection.isEnabled == Tristate.isTrue, isFalse);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isFalse);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('a stacked row reads its subtitle and keeps a band around it', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: CatchIndexRow(
              title: 'Sunday Long Run',
              subtitle: '6:30 am · Carter Road',
              footer: const Text('₹500'),
              onTap: () {},
            ),
          ),
        ),
      );
      expect(find.text('6:30 am · Carter Road'), findsOneWidget);
      expect(find.text('₹500'), findsOneWidget);
      expect(
        find.semantics.byLabel('Sunday Long Run, 6:30 am · Carter Road'),
        findsOne,
      );
      final title = tester.getRect(find.text('Sunday Long Run'));
      final footer = tester.getRect(find.text('₹500'));
      final row = tester.getRect(find.byType(CatchIndexRow));
      expect(title.top - row.top, greaterThanOrEqualTo(CatchSpacing.s3));
      expect(row.bottom - footer.bottom, greaterThanOrEqualTo(CatchSpacing.s3));
    } finally {
      semantics.dispose();
    }
  });
}
