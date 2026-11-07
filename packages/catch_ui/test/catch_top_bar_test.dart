import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// A screen of [width] holding [topBar] over a long body.
Future<void> _pumpScreen(
  WidgetTester tester,
  CatchTopBar topBar, {
  double width = 400,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 800);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: CatchRoot(
        theme: CatchThemeMode.day,
        child: CatchScreen(
          topBar: topBar,
          body: const SizedBox(key: ValueKey('body'), height: 2000),
        ),
      ),
    ),
  );
}

Border? _hairline(WidgetTester tester) {
  final boxes = tester.widgetList<DecoratedBox>(
    find.descendant(
      of: find.byType(CatchTopBar),
      matching: find.byType(DecoratedBox),
    ),
  );
  final foreground = boxes.firstWhere(
    (box) => box.position == DecorationPosition.foreground,
  );
  return (foreground.decoration as BoxDecoration).border as Border?;
}

void main() {
  testWidgets('a compact tab home puts the kicker over a section title', (
    tester,
  ) async {
    await _pumpScreen(
      tester,
      const CatchTopBar(
        variant: CatchTopBarVariant.tabHome,
        kicker: 'Tuesday 27 October',
        title: 'Good evening, Meher',
        actions: [SizedBox(key: ValueKey('action'), width: 40, height: 40)],
      ),
    );
    final kicker = tester.getRect(find.text('Tuesday 27 October'));
    final title = tester.getRect(find.text('Good evening, Meher'));
    expect(kicker.bottom, lessThanOrEqualTo(title.top));
    expect(
      tester
          .widget<CatchText>(
            find.ancestor(
              of: find.text('Good evening, Meher'),
              matching: find.byType(CatchText),
            ),
          )
          .variant,
      CatchTextVariant.displaySection,
    );
    expect(
      tester.getRect(find.byKey(const ValueKey('action'))).right,
      400 - GeneratedCatchLayoutTokens.gutterCompact,
    );
  });

  testWidgets('a wide bar is one 56 px row with a breadcrumb', (tester) async {
    await _pumpScreen(
      tester,
      CatchTopBar(
        variant: CatchTopBarVariant.tool,
        kicker: 'Lantern Lane Social',
        title: 'Edit event',
        back: CatchTopBarBack(onPressed: () {}),
        action: const CatchTopBarAction(label: 'Save'),
      ),
      width: 900,
    );
    final bar = tester.getRect(find.byType(CatchTopBar));
    expect(bar.height, CatchLayout.topBarHeight);
    final kicker = tester.getRect(find.text('Lantern Lane Social'));
    final title = tester.getRect(find.text('Edit event'));
    expect(kicker.right, lessThan(title.left));
    expect(find.text('/'), findsOneWidget);
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).size,
      CatchButtonSize.sm,
    );
  });

  testWidgets('a step bar shows its position and one segment per step', (
    tester,
  ) async {
    await _pumpScreen(
      tester,
      CatchTopBar(
        variant: CatchTopBarVariant.step,
        title: 'When is it?',
        back: CatchTopBarBack(onPressed: () {}),
        step: const CatchTopBarStep(index: 2, total: 5, label: 'Step 2 of 5'),
      ),
    );
    expect(find.text('Step 2 of 5'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == 'Step 2 of 5',
      ),
      findsOneWidget,
    );
    final segments = find.descendant(
      of: find.byType(CatchTopBar),
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is SizedBox &&
            widget.height == GeneratedCatchStrokeTokens.meterSm,
      ),
    );
    expect(segments, findsNWidgets(5));
  });

  testWidgets('a moment shows close alone, at the end', (tester) async {
    var closed = 0;
    await _pumpScreen(
      tester,
      CatchTopBar(
        variant: CatchTopBarVariant.moment,
        title: 'Hidden',
        back: CatchTopBarBack(close: true, onPressed: () => closed++),
      ),
    );
    expect(find.text('Hidden'), findsNothing);
    await tester.tap(find.byType(CatchIconAction));
    expect(closed, 1);
    expect(
      tester.getRect(find.byType(CatchIconAction)).center.dx,
      greaterThan(200),
    );
  });

  testWidgets('live puts the kicker under the title', (tester) async {
    await _pumpScreen(
      tester,
      const CatchTopBar(
        variant: CatchTopBarVariant.live,
        title: 'Live console',
        kicker: 'Harbor Social',
        live: 'Live · 9:04 PM',
      ),
    );
    expect(
      tester.getRect(find.text('Harbor Social')).top,
      greaterThanOrEqualTo(tester.getRect(find.text('Live console')).bottom),
    );
    expect(find.byType(CatchBadge), findsOneWidget);
  });

  testWidgets('the hairline shows once the body has scrolled', (tester) async {
    await _pumpScreen(
      tester,
      const CatchTopBar(variant: CatchTopBarVariant.tool, title: 'Guests'),
    );
    expect(_hairline(tester)?.bottom.style, BorderStyle.none);
    await tester.dragFrom(const Offset(200, 600), const Offset(0, -40));
    await tester.pump();
    expect(_hairline(tester)?.bottom.style, BorderStyle.solid);
  });

  testWidgets('a subject bar hides its titles over the hero until scrolled', (
    tester,
  ) async {
    await _pumpScreen(
      tester,
      CatchTopBar(
        variant: CatchTopBarVariant.subject,
        title: 'Harbor Social',
        back: CatchTopBarBack(onPressed: () {}),
      ),
    );
    final semantics = tester.ensureSemantics();
    expect(find.bySemanticsLabel('Harbor Social'), findsNothing);
    expect(tester.getRect(find.byKey(const ValueKey('body'))).top, 0);
    await tester.dragFrom(const Offset(200, 600), const Offset(0, -40));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Harbor Social'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('back pops the navigator when it has no callback', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const CatchRoot(
                  child: CatchScreen(
                    topBar: CatchTopBar(
                      variant: CatchTopBarVariant.tool,
                      title: 'Pushed',
                      back: CatchTopBarBack(),
                    ),
                    body: SizedBox(),
                  ),
                ),
              ),
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Pushed'), findsOneWidget);
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Pushed'), findsNothing);
  });
}
