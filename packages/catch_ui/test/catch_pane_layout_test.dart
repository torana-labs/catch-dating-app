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
}
