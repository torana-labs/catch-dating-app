import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child, {required double width}) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(
    body: Center(
      child: SizedBox(width: width, height: 400, child: child),
    ),
  ),
);

void main() {
  testWidgets('a wide queue places the table beside a 440 inspector', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      host(
        const CatchPaneLayout(
          pattern: CatchPaneLayoutMode.queue,
          children: [
            Text('Table'),
            SizedBox.expand(
              key: ValueKey('inspector'),
              child: Text('Inspector'),
            ),
          ],
        ),
        width: 1100,
      ),
    );
    expect(find.text('Table'), findsOneWidget);
    expect(find.text('Inspector'), findsOneWidget);
    expect(tester.getSize(find.byKey(const ValueKey('inspector'))).width, 440);
  });

  testWidgets('a narrow queue shows one pane, the detail once it is open', (
    tester,
  ) async {
    Widget layout({required bool open}) => host(
      CatchPaneLayout(
        pattern: CatchPaneLayoutMode.queue,
        detailOpen: open,
        children: const [Text('Table'), Text('Inspector')],
      ),
      width: 640,
    );
    await tester.pumpWidget(layout(open: false));
    expect(find.text('Table'), findsOneWidget);
    expect(find.text('Inspector'), findsNothing);
    await tester.pumpWidget(layout(open: true));
    expect(find.text('Table'), findsNothing);
    expect(find.text('Inspector'), findsOneWidget);
  });

  test('split widths match the web pattern thresholds', () {
    expect(CatchPaneLayout.splitWidthOf(CatchPaneLayoutMode.listDetail), 600);
    expect(CatchPaneLayout.splitWidthOf(CatchPaneLayoutMode.queue), 900);
    expect(
      CatchPaneLayout.splitWidthOf(CatchPaneLayoutMode.wideTable),
      double.infinity,
    );
    expect(
      CatchPaneLayout.secondPaneWidthOf(CatchPaneLayoutMode.queue, 1500),
      480,
    );
  });

  testWidgets('an editor puts the form between the step list and preview', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    Widget editor(double width) => host(
      const CatchPaneLayout(
        pattern: CatchPaneLayoutMode.editor,
        children: [
          SizedBox(key: ValueKey('form'), height: 100),
          SizedBox(key: ValueKey('preview'), height: 100),
          SizedBox(key: ValueKey('steps'), height: 100),
        ],
      ),
      width: width,
    );
    await tester.pumpWidget(editor(1400));
    final steps = tester.getRect(find.byKey(const ValueKey('steps')));
    final form = tester.getRect(find.byKey(const ValueKey('form')));
    final preview = tester.getRect(find.byKey(const ValueKey('preview')));
    expect(steps.width, CatchPaneLayout.editorStepsWidth);
    expect(form.width, 600);
    expect(preview.width, 320);
    expect(steps.right, lessThan(form.left));
    expect(form.right, lessThan(preview.left));
    await tester.pumpWidget(editor(900));
    expect(find.byKey(const ValueKey('preview')), findsNothing);
    expect(find.byKey(const ValueKey('steps')), findsNothing);
    expect(find.byKey(const ValueKey('form')), findsOneWidget);
  });

  testWidgets('operations caps the console and adds the live pane', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      host(
        const CatchPaneLayout(
          pattern: CatchPaneLayoutMode.operations,
          children: [
            SizedBox.expand(key: ValueKey('console')),
            SizedBox.expand(key: ValueKey('live')),
          ],
        ),
        width: 1400,
      ),
    );
    final console = tester.getRect(find.byKey(const ValueKey('console')));
    final live = tester.getRect(find.byKey(const ValueKey('live')));
    expect(live.width, 360);
    expect(live.right - console.left, 1040);
  });

  testWidgets('browse lays its cells in columns of at least 280 px', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    Widget browse(double width) => host(
      CatchPaneLayout(
        pattern: CatchPaneLayoutMode.browse,
        children: [
          for (var index = 0; index < 6; index++)
            SizedBox(key: ValueKey('cell $index'), height: 80),
        ],
      ),
      width: width,
    );
    await tester.pumpWidget(browse(920));
    final first = tester.getRect(find.byKey(const ValueKey('cell 0')));
    final third = tester.getRect(find.byKey(const ValueKey('cell 2')));
    expect(first.width, greaterThanOrEqualTo(280));
    expect(first.top, third.top);
    expect(
      CatchPaneLayout.splitWidthOf(CatchPaneLayoutMode.browse),
      double.infinity,
    );
    await tester.pumpWidget(browse(400));
    expect(tester.getRect(find.byKey(const ValueKey('cell 0'))).width, 400);
  });

  testWidgets('a feed splits 40 apart from 960 and stacks 24 apart below', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    Widget feed(double width) => host(
      const SingleChildScrollView(
        child: CatchPaneLayout(
          pattern: CatchPaneLayoutMode.feed,
          children: [
            SizedBox(key: ValueKey('main'), height: 300),
            SizedBox(key: ValueKey('side'), height: 120),
          ],
        ),
      ),
      width: width,
    );
    await tester.pumpWidget(feed(1100));
    var main = tester.getRect(find.byKey(const ValueKey('main')));
    var side = tester.getRect(find.byKey(const ValueKey('side')));
    expect(side.width, 360);
    expect(side.left - main.right, 40);
    expect(side.top, main.top);
    expect(side.height, 120);
    await tester.pumpWidget(feed(700));
    main = tester.getRect(find.byKey(const ValueKey('main')));
    side = tester.getRect(find.byKey(const ValueKey('side')));
    expect(main.width, 700);
    expect(side.top - main.bottom, 24);
  });
}
