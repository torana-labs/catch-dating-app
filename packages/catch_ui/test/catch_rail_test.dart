import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child, {required double width}) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(
    body: Center(
      child: SizedBox(width: width, child: child),
    ),
  ),
);

void main() {
  testWidgets('scrolls on narrow screens and names the list', (tester) async {
    await tester.pumpWidget(
      host(
        const CatchRail(
          label: 'More from Afterfly',
          itemWidth: 200,
          children: [Text('Run'), Text('Supper'), Text('Trivia')],
        ),
        width: 390,
      ),
    );
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.bySemanticsLabel('More from Afterfly'), findsOneWidget);
    expect(tester.getSize(find.text('Run')).width, lessThanOrEqualTo(200));
  });

  testWidgets('wraps on desktops unless told never to', (tester) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    Widget rail(CatchRailMode wrap) => host(
      CatchRail(
        label: 'Formats',
        wrap: wrap,
        children: const [Text('Runs'), Text('Dinners')],
      ),
      width: 1000,
    );
    await tester.pumpWidget(rail(CatchRailMode.auto));
    expect(find.byType(Wrap), findsOneWidget);
    await tester.pumpWidget(rail(CatchRailMode.never));
    expect(find.byType(Wrap), findsNothing);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
  });
}
