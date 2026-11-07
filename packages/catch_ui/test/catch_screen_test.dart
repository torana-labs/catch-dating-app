import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Records the scroll state the screen publishes.
class _ScrollProbe extends StatelessWidget {
  const _ScrollProbe(this.seen);

  final List<bool> seen;

  @override
  Widget build(BuildContext context) {
    seen.add(CatchScreenScope.scrolledOf(context));
    return const SizedBox(key: ValueKey('probe'), height: 2000);
  }
}

Future<void> _pump(
  WidgetTester tester,
  Widget screen, {
  double width = 400,
  double bottomPadding = 0,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 800);
  tester.view.padding = FakeViewPadding(bottom: bottomPadding);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: CatchRoot(theme: CatchThemeMode.day, child: screen),
    ),
  );
}

const _dock = CatchDock(
  key: ValueKey('dock'),
  primary: CatchDockAction(label: 'Publish'),
);

void main() {
  test('the scroll state is false outside a screen', () {
    expect(const CatchScreenScopeData(scrolled: false).scrolled, isFalse);
  });

  testWidgets('the screen publishes scrolled once the body passes 4 px', (
    tester,
  ) async {
    final seen = <bool>[];
    await _pump(
      tester,
      CatchScreen(
        topBar: const CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: 'Guests',
        ),
        body: _ScrollProbe(seen),
      ),
    );
    expect(seen.last, isFalse);
    await tester.dragFrom(const Offset(200, 500), const Offset(0, -3));
    await tester.pump();
    expect(seen.last, isFalse);
    await tester.dragFrom(const Offset(200, 500), const Offset(0, -40));
    await tester.pump();
    expect(seen.last, isTrue);
    await tester.dragFrom(const Offset(200, 500), const Offset(0, 200));
    await tester.pumpAndSettle();
    expect(seen.last, isFalse);
  });

  testWidgets('a body that scrolls itself is heard too', (tester) async {
    final seen = <bool>[];
    await _pump(
      tester,
      CatchScreen(
        bodyScrolls: false,
        body: Builder(
          builder: (context) {
            seen.add(CatchScreenScope.scrolledOf(context));
            return ListView(
              children: [for (var i = 0; i < 200; i++) Text('Row $i')],
            );
          },
        ),
      ),
    );
    expect(seen.last, isFalse);
    await tester.dragFrom(const Offset(200, 500), const Offset(0, -80));
    await tester.pump();
    expect(seen.last, isTrue);
  });

  testWidgets('the top bar sits above the body; a subject bar over the hero', (
    tester,
  ) async {
    await _pump(
      tester,
      const CatchScreen(
        topBar: CatchTopBar(variant: CatchTopBarVariant.tool, title: 'Tool'),
        body: SizedBox(key: ValueKey('body'), height: 100),
      ),
    );
    expect(
      tester.getRect(find.byKey(const ValueKey('body'))).top,
      tester.getRect(find.byType(CatchTopBar)).bottom,
    );
    await _pump(
      tester,
      const CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.subject,
          title: 'Subject',
        ),
        body: SizedBox(key: ValueKey('body'), height: 100),
      ),
    );
    expect(tester.getRect(find.byKey(const ValueKey('body'))).top, 0);
    expect(tester.getRect(find.byType(CatchTopBar)).top, 0);
  });

  testWidgets('the dock sits below the body and takes the device inset', (
    tester,
  ) async {
    await _pump(
      tester,
      const CatchScreen(
        body: SizedBox(key: ValueKey('body'), height: 2000),
        dock: _dock,
      ),
      bottomPadding: 34,
    );
    final dock = tester.getRect(find.byKey(const ValueKey('dock')));
    expect(dock.bottom, 800);
    final viewport = tester.getRect(find.byType(SingleChildScrollView));
    expect(viewport.bottom, dock.top);
    expect(find.byKey(const ValueKey('catch_dock.bar')), findsOneWidget);
  });

  testWidgets('inside a shell the dock clears a floating bottom bar', (
    tester,
  ) async {
    await _pump(
      tester,
      CatchShellScope(
        data: const CatchShellScopeData(
          navigationPlacement: CatchTabBarPlacement.bottom,
          bottomInset: 90,
        ),
        child: const CatchScreen(body: SizedBox(height: 2000), dock: _dock),
      ),
      bottomPadding: 34,
    );
    expect(tester.getRect(find.byKey(const ValueKey('dock'))).bottom, 710);
  });

  testWidgets('the overlay covers the top bar and the body', (tester) async {
    await _pump(
      tester,
      const CatchScreen(
        topBar: CatchTopBar(variant: CatchTopBarVariant.tool, title: 'Tool'),
        body: SizedBox(height: 100),
        overlay: SizedBox.expand(key: ValueKey('overlay')),
      ),
    );
    expect(
      tester.getRect(find.byKey(const ValueKey('overlay'))),
      const Rect.fromLTWH(0, 0, 400, 800),
    );
  });

  testWidgets('an offset the body starts at counts as scrolled', (
    tester,
  ) async {
    final seen = <bool>[];
    final controller = ScrollController(initialScrollOffset: 48);
    addTearDown(controller.dispose);
    await _pump(
      tester,
      PrimaryScrollController(
        controller: controller,
        child: CatchScreen(body: _ScrollProbe(seen)),
      ),
    );
    await tester.pump();
    expect(seen.last, isTrue);
  });
}
