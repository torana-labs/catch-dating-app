import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sheet action purpose fixes emphasis and full-width layout', () {
    for (final role in CatchButtonEmphasis.values) {
      final button = CatchButton.sheet(
        label: 'Action',
        onPressed: () {},
        role: role,
      );
      expect(button.fullWidth, isTrue);
      expect(
        button.variant,
        role == CatchButtonEmphasis.commit
            ? CatchButtonVariant.primary
            : CatchButtonVariant.secondary,
      );
    }
  });

  for (final scale in [1.0, 2.0]) {
    for (final size in [const Size(320, 568), const Size(844, 390)]) {
      testWidgets('standard sheet keeps actions reachable at $size and $scale', (
        tester,
      ) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        tester.view.viewInsets = const FakeViewPadding(bottom: 180);
        addTearDown(tester.view.reset);
        var saved = false;
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () => showCatchBottomSheet<void>(
                    context: context,
                    builder: (_) => CatchSheet.standard(
                      title: 'Edit a long descriptive event name',
                      subtitle:
                          'Details remain readable when the keyboard is open.',
                      footer: CatchButton(
                        label: 'Save',
                        fullWidth: true,
                        onPressed: () => saved = true,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (var i = 0; i < 16; i++)
                            Text('Field $i with supporting information'),
                        ],
                      ),
                    ),
                  ),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        final scroll = find.byKey(const ValueKey('catch-sheet-scroll'));
        expect(
          find.descendant(
            of: find.byType(CatchSheet),
            matching: find.byType(Scrollable),
          ),
          findsOneWidget,
        );
        final bounds = tester.getRect(scroll);
        expect(
          bounds.height,
          lessThanOrEqualTo(
            (size.height - 180) * CatchLayout.sheetViewportMaxHeightFraction +
                1,
          ),
        );
        expect(bounds.bottom, lessThanOrEqualTo(size.height - 180));
        await tester.drag(scroll, const Offset(0, -4000));
        await tester.pumpAndSettle();
        final footer = find.widgetWithText(CatchButton, 'Save');
        final rect = tester.getRect(footer);
        expect(rect.top, greaterThanOrEqualTo(bounds.top));
        expect(rect.bottom, lessThanOrEqualTo(bounds.bottom));
        await tester.tap(footer);
        expect(saved, isTrue);
        expect(tester.takeException(), isNull);
      });
    }
  }

  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'pinned filter Close stays visible while choices scroll at $scale',
      (tester) async {
        tester.view.physicalSize = const Size(320, 568);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        var closed = false;
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.dark,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: CatchSheet.filter(
                  title: 'Filters',
                  closeLabel: 'Close',
                  onClose: () => closed = true,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var i = 0; i < 30; i++) Text('Filter option $i'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
        final close = find.widgetWithText(CatchButton, 'Close');
        final before = tester.getRect(close);
        expect(
          tester.widget<CatchButton>(close).variant,
          CatchButtonVariant.secondary,
        );
        expect(
          tester.widget<CatchSheet>(find.byType(CatchSheet)).subtitle,
          isNull,
        );
        expect(
          tester
              .widgetList<CatchLegacySurface>(find.byType(CatchLegacySurface))
              .where(
                (surface) => surface.emphasis == CatchSurfaceEmphasis.floating,
              ),
          hasLength(1),
        );
        expect(close.hitTestable(), findsOneWidget);
        await tester.drag(
          find.byKey(const ValueKey('catch-sheet-scroll')),
          const Offset(0, -400),
        );
        await tester.pumpAndSettle();
        expect(tester.getRect(close), before);
        await tester.tap(close);
        expect(closed, isTrue);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('standard short sheet shrink wraps and aligns choice rows', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: CatchSelectionSheet<int>(
              title: 'Sort',
              value: 1,
              items: const [
                CatchSelectionMenuItem(value: 1, label: 'Name'),
                CatchSelectionMenuItem(value: 2, label: 'Recently checked'),
              ],
            ),
          ),
        ),
      ),
    );
    final bounds = tester.getRect(
      find.byKey(const ValueKey('catch-sheet-scroll')),
    );
    expect(bounds.height, lessThan(300));
    expect(
      tester.getTopLeft(find.text('Sort')).dx,
      tester.getTopLeft(find.text('Name')).dx,
    );
    expect(tester.takeException(), isNull);
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'whole-sheet scrolling exposes a keyboard-safe footer at $scale',
      (tester) async {
        var saved = false;
        const viewportKey = ValueKey('sheet-viewport');
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            home: Scaffold(
              body: MediaQuery(
                data: MediaQueryData(
                  textScaler: TextScaler.linear(scale),
                  viewInsets: const EdgeInsets.only(bottom: 180),
                  viewPadding: const EdgeInsets.only(bottom: 24),
                ),
                child: Align(
                  alignment: Alignment.topCenter,
                  child: SizedBox(
                    key: viewportKey,
                    width: 440,
                    height: 500,
                    child: CatchSheet(
                      title: 'Edit details',
                      keyboardSafe: true,
                      mode: CatchSheetMode.scrollable,
                      // Caller padding cannot remove the terminal safe region.
                      padding: const EdgeInsets.all(8),
                      footer: CatchButton(
                        label: 'Save',
                        onPressed: () => saved = true,
                      ),
                      child: const SizedBox(
                        height: 800,
                        child: Text('Long body'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        final footer = find.widgetWithText(CatchButton, 'Save');
        final viewport = tester.getRect(find.byKey(viewportKey));
        expect(tester.getTopLeft(footer).dy, greaterThan(viewport.bottom));
        expect(find.byType(Scrollable), findsOneWidget);
        await tester.drag(
          find.byType(SingleChildScrollView),
          const Offset(0, -1600),
        );
        await tester.pumpAndSettle();
        final footerRect = tester.getRect(footer);
        expect(footerRect.top, greaterThanOrEqualTo(viewport.top));
        expect(
          viewport.bottom - footerRect.bottom,
          closeTo(180 + CatchLayout.sheetBottomSafeAreaGap, 0.01),
        );
        await tester.tap(footer);
        await tester.pumpAndSettle();
        expect(saved, isTrue);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('content mode retains body-owned scrolling and a fixed footer', (
    tester,
  ) async {
    final controller = ScrollController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: Align(
            alignment: Alignment.topCenter,
            child: SizedBox(
              width: 440,
              height: 500,
              child: CatchSheet(
                title: 'Choose a city',
                footer: CatchButton(label: 'Done', onPressed: () {}),
                child: SizedBox(
                  height: 240,
                  child: ListView.builder(
                    controller: controller,
                    itemCount: 30,
                    itemExtent: 48,
                    itemBuilder: (_, index) => Text('City $index'),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    expect(find.byType(Scrollable), findsOneWidget);
    final footer = find.widgetWithText(CatchButton, 'Done');
    final footerBefore = tester.getRect(footer);
    await tester.drag(find.byType(ListView), const Offset(0, -1000));
    await tester.pumpAndSettle();
    expect(controller.offset, greaterThan(0));
    expect(tester.getRect(footer), footerBefore);
    expect(tester.takeException(), isNull);
  });
}
