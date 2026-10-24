part of 'catch_primitives_test.dart';

void _registerCatchPrimitivesButtonTests() {
  testWidgets('CatchButton draws D20 4px corners in rounded mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchButton(
          key: const ValueKey('rounded-button'),
          label: 'Review & publish',
          mode: CatchButtonMode.rounded,
          onPressed: () {},
        ),
      ),
    );

    final decoration = tester.widget<DecoratedBox>(
      find.descendant(
        of: find.byKey(const ValueKey('rounded-button')),
        matching: find.byType(DecoratedBox),
      ),
    );
    expect(
      (decoration.decoration as BoxDecoration).borderRadius,
      BorderRadius.circular(CatchButtonTokens.radius),
    );
  });

  testWidgets('CatchButton reflows full-width labels at large text', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 220,
          child: CatchButton(
            key: const ValueKey('large-text-button'),
            label: 'Review every submitted response',
            fullWidth: true,
            onPressed: () {},
          ),
        ),
        textScale: 2,
      ),
    );

    expect(
      tester.getSize(find.byKey(const ValueKey('large-text-button'))).height,
      greaterThan(CatchSpacing.s12),
    );
    final label = tester.widget<CatchButtonContentRow>(
      find.byType(CatchButtonContentRow),
    );
    expect(label.allowMultiline, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('CatchButton resolves transitions under reduced motion', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: CatchButton(
            key: const ValueKey('reduced-motion-button'),
            label: 'Continue',
            onPressed: () {},
          ),
        ),
      ),
    );

    final button = find.byKey(const ValueKey('reduced-motion-button'));
    expect(
      tester
          .widget<AnimatedScale>(
            find.descendant(of: button, matching: find.byType(AnimatedScale)),
          )
          .duration,
      CatchMotion.none,
    );
    expect(
      tester
          .widget<AnimatedOpacity>(
            find.descendant(of: button, matching: find.byType(AnimatedOpacity)),
          )
          .duration,
      CatchMotion.none,
    );
    expect(
      tester
          .widget<AnimatedSwitcher>(
            find.descendant(
              of: button,
              matching: find.byType(AnimatedSwitcher),
            ),
          )
          .duration,
      CatchMotion.none,
    );
  });

  testWidgets('CatchButton pairs primary activity accent with white ink', (
    tester,
  ) async {
    const accent = Color(0xFF116466);

    await tester.pumpWidget(
      _wrap(
        CatchButton(
          key: const ValueKey('accent-button'),
          label: 'Run crew',
          onPressed: () {},
          accentColor: accent,
        ),
      ),
    );

    final buttonFinder = find.byKey(const ValueKey('accent-button'));
    final buttonBox = tester.widget<DecoratedBox>(
      find.descendant(of: buttonFinder, matching: find.byType(DecoratedBox)),
    );
    final buttonLabel = tester.widget<Text>(
      find.descendant(of: buttonFinder, matching: find.text('Run crew')),
    );
    final decoration = buttonBox.decoration as BoxDecoration;

    expect(decoration.color, accent);
    expect(buttonLabel.style?.color, CatchTokens.editorialWhite);
  });

  testWidgets('CatchDock forwards activity accent to the primary button', (
    tester,
  ) async {
    const accent = Color(0xFF116466);

    await tester.pumpWidget(
      _wrap(
        CatchDock.primary(
          label: 'Join event',
          onPressed: () {},
          buttonAccentColor: accent,
          buttonMode: CatchButtonMode.rounded,
        ),
      ),
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchDock && widget.variant == CatchDockVariant.primary,
      ),
      findsOneWidget,
    );
    final button = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Join event'),
    );
    expect(button.accentColor, accent);
    expect(button.mode, CatchButtonMode.rounded);
  });
}
