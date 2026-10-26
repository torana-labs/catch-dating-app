import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('badge typography keeps metadata case and normalizes status', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const Wrap(
          children: [
            CatchBadge(label: 'Ready soon'),
            CatchBadge.functional(label: 'Ready soon'),
            CatchBadge.live(label: 'Live now'),
          ],
        ),
      ),
    );

    expect(find.text('Ready soon'), findsOneWidget);
    expect(find.text('READY SOON'), findsOneWidget);
    expect(find.text('LIVE NOW'), findsOneWidget);
    expect(find.byType(CatchStatusIndicator), findsOneWidget);
  });

  testWidgets('live badge owns its fill and dot recipe', (tester) async {
    await tester.pumpWidget(_wrap(const CatchBadge.live(label: 'Live now')));

    final badgeDecoration = tester
        .widgetList<DecoratedBox>(find.byType(DecoratedBox))
        .map((widget) => widget.decoration)
        .whereType<BoxDecoration>()
        .firstWhere(
          (decoration) => decoration.color == CatchTokens.light.primary,
        );

    expect(badgeDecoration.color, CatchTokens.light.primary);
    expect(find.byType(CatchStatusIndicator), findsOneWidget);
    expect(find.text('LIVE NOW'), findsOneWidget);
  });

  testWidgets('on-dark badge owns the fixed editorial recipe', (tester) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 160,
          child: CatchBadge.onDarkStatus(
            label: 'Preview only',
            icon: CatchIcons.show,
          ),
        ),
        textScale: 2,
      ),
    );

    final decoration =
        tester
                .widget<DecoratedBox>(
                  find.descendant(
                    of: find.byType(CatchBadge),
                    matching: find.byType(DecoratedBox),
                  ),
                )
                .decoration
            as BoxDecoration;
    final border = decoration.border! as Border;

    expect(
      decoration.color,
      CatchTokens.editorialWhite.withValues(
        alpha: CatchOpacity.badgeOnDarkFill,
      ),
    );
    expect(
      border.top.color,
      CatchTokens.editorialWhite.withValues(
        alpha: CatchOpacity.badgeOnDarkBorder,
      ),
    );
    expect(
      tester.widget<Text>(find.text('PREVIEW ONLY')).style?.color,
      CatchTokens.editorialWhite,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('count badge hides zero, clamps 99+, and preserves child size', (
    tester,
  ) async {
    const wrapperKey = ValueKey('count-wrapper');
    const zeroLabelKey = ValueKey('zero-label');
    await tester.pumpWidget(
      _wrap(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchCountBadge(count: 0, child: Icon(CatchIcons.notifications)),
            CatchCountBadge(
              key: wrapperKey,
              count: 99,
              child: Icon(CatchIcons.notifications),
            ),
            CatchCountBadge(count: 100, child: Icon(CatchIcons.notifications)),
            const CatchCountBadge.label(count: 7),
            const CatchCountBadge.label(key: zeroLabelKey, count: 0),
          ],
        ),
        textScale: 2,
      ),
    );

    expect(find.text('0'), findsNothing);
    expect(find.text('99'), findsOneWidget);
    expect(find.text('99+'), findsOneWidget);
    expect(find.text('7'), findsOneWidget);
    final wrapperRect = tester.getRect(find.byKey(wrapperKey));
    final boundaryLabelRect = tester.getRect(find.text('99'));
    expect(wrapperRect.size, const Size(24, 24));
    expect(boundaryLabelRect.left, lessThan(wrapperRect.left));
    expect(boundaryLabelRect.right, lessThanOrEqualTo(wrapperRect.right));
    expect(tester.getSize(find.byKey(zeroLabelKey)), Size.zero);
  });

  testWidgets('inline status remains unboxed and handles constrained copy', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 120,
          child: CatchStatusRow(
            label: 'Unsaved changes with long localized copy',
            tone: CatchStatusRowTone.warning,
          ),
        ),
        textScale: 2,
      ),
    );

    expect(find.byType(CatchStatusIndicator), findsOneWidget);
    expect(find.byType(DecoratedBox), findsOneWidget);
    final text = tester.widget<Text>(
      find.text('Unsaved changes with long localized copy'),
    );
    expect(text.maxLines, isNull);
    expect(text.overflow, isNull);
    expect(
      tester.getSize(find.byType(CatchStatusIndicator)),
      const Size.square(CatchIconSize.unsavedDot),
    );
    expect(tester.getSize(find.byType(CatchStatusRow)).height, greaterThan(60));
    expect(tester.takeException(), isNull);
  });

  testWidgets('status dot preserves the reviewed seven-pixel default', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const CatchStatusIndicator()));

    expect(
      tester.getSize(find.byType(CatchStatusIndicator)),
      const Size.square(CatchLayout.badgeMdDotExtent),
    );
  });
  testWidgets(
    'count and status markers speak caller copy without duplicate labels',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          _wrap(
            const Column(
              children: [
                CatchCountBadge.label(
                  count: 120,
                  semanticsLabel: '120 unread messages',
                ),
                CatchCountBadge.label(
                  count: 0,
                  semanticsLabel: 'No unread messages',
                ),
                CatchStatusIndicator(
                  size: CatchSpacing.s2,
                  semanticsLabel: 'New match',
                ),
              ],
            ),
          ),
        );
        expect(find.text('99+'), findsOneWidget);
        expect(find.text('0'), findsNothing);
        expect(find.bySemanticsLabel('120 unread messages'), findsOneWidget);
        expect(find.bySemanticsLabel('No unread messages'), findsOneWidget);
        expect(find.bySemanticsLabel('New match'), findsOneWidget);
        expect(find.bySemanticsLabel('99+'), findsNothing);
        expect(
          tester.getSize(find.byType(CatchStatusIndicator)),
          const Size.square(CatchSpacing.s2),
        );
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets('uncapped count text settles immediately with reduced motion', (
    tester,
  ) async {
    Widget frame(int count) => _wrap(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: CatchCountText(count: count),
      ),
    );
    await tester.pumpWidget(frame(8));
    await tester.pumpWidget(frame(124));
    await tester.pump();
    expect(find.text('8'), findsNothing);
    expect(find.text('124'), findsOneWidget);
    expect(tester.binding.hasScheduledFrame, isFalse);
  });
}

Widget _wrap(Widget child, {double textScale = 1}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}
