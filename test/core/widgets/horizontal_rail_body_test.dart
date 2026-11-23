import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final height in <double?>[80, null]) {
    testWidgets('rail height $height keeps item order and trailing action', (
      tester,
    ) async {
      var selected = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 420,
                child: CatchHorizontalScrollView(
                  itemCount: 2,
                  height: height,
                  spacing: 12,
                  listPadding: const EdgeInsets.symmetric(horizontal: 8),
                  itemWidth: const CatchRailItemWidth.fixed(100),
                  itemBuilder: (context, index) =>
                      SizedBox(height: 44, child: Text('Item $index')),
                  footer: TextButton(
                    onPressed: () => selected++,
                    child: const Text('More'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(tester.getTopLeft(find.text('Item 0')).dx, 8);
      expect(
        tester.getTopLeft(find.text('Item 1')).dx -
            tester.getTopLeft(find.text('Item 0')).dx,
        112,
      );
      if (height != null) {
        expect(
          tester.getSize(find.byType(CatchHorizontalScrollView)).height,
          80,
        );
        expect(find.byType(ListView), findsOneWidget);
      } else {
        expect(find.byType(SingleChildScrollView), findsOneWidget);
        expect(
          tester.getSize(find.byType(CatchHorizontalScrollView)).height,
          tester.getSize(find.byType(TextButton)).height,
        );
      }
      await tester.tap(find.text('More'));
      expect(selected, 1);
      expect(tester.takeException(), isNull);
    });
  }

  for (final sizing in [(160.0, 200.0), (320.0, 240.0), (600.0, 260.0)]) {
    testWidgets('parent rail clamps item width at viewport ${sizing.$1}', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: sizing.$1,
                child: CatchSection.horizontal(
                  title: 'Rail',
                  itemCount: 1,
                  height: null,
                  itemWidth: const CatchRailItemWidth.fractional(
                    fraction: 0.75,
                    min: 200,
                    max: 260,
                  ),
                  itemBuilder: (context, index) => const SizedBox(
                    key: ValueKey('slot'),
                    height: 40,
                    child: Text('Item'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('slot'))).width,
        sizing.$2,
      );
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('bounded horizontal collection stays lazy', (tester) async {
    final built = <int>{};
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 240,
              child: CatchHorizontalScrollView(
                itemCount: 1000,
                height: 80,
                spacing: 12,
                listPadding: EdgeInsets.zero,
                itemWidth: const CatchRailItemWidth.fixed(100),
                itemBuilder: (context, index) {
                  built.add(index);
                  return Text('Item $index');
                },
              ),
            ),
          ),
        ),
      ),
    );
    expect(built, contains(0));
    expect(built.length, lessThan(20));
    expect(built, isNot(contains(999)));
    await tester.drag(find.byType(ListView), const Offset(-500, 0));
    await pumpFeatureUi(tester);
    expect(built.any((index) => index >= 5), isTrue);
    expect(built.length, lessThan(30));
  });

  for (final height in <double?>[80, null]) {
    testWidgets(
      'footer-only collection at height $height never builds content',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            home: Scaffold(
              body: Align(
                alignment: Alignment.topLeft,
                child: SizedBox(
                  width: 320,
                  child: CatchHorizontalScrollView(
                    itemCount: 0,
                    height: height,
                    spacing: 12,
                    listPadding: const EdgeInsets.only(left: 8),
                    itemWidth: const CatchRailItemWidth.fixed(120),
                    itemBuilder: (_, _) => throw StateError('No content items'),
                    footer: const SizedBox(
                      key: ValueKey('footer'),
                      height: 44,
                      child: Text('More'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        expect(tester.getTopLeft(find.byKey(const ValueKey('footer'))).dx, 8);
        expect(tester.getSize(find.byKey(const ValueKey('footer'))).width, 120);
        expect(find.text('More'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('fractional item and footer widths follow viewport resizing', (
    tester,
  ) async {
    for (final width in [240.0, 400.0]) {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: width,
                child: CatchSection.horizontal(
                  title: 'Resize',
                  height: null,
                  itemCount: 1,
                  itemWidth: const CatchRailItemWidth.fractional(
                    fraction: 0.5,
                    min: 100,
                    max: 220,
                  ),
                  itemBuilder: (_, _) => const SizedBox(
                    key: ValueKey('content'),
                    height: 44,
                    child: Text('Card'),
                  ),
                  footer: const SizedBox(
                    key: ValueKey('footer'),
                    height: 44,
                    child: Text('More'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('content'))).width,
        width / 2,
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('footer'))).width,
        width / 2,
      );
    }
  });
}
