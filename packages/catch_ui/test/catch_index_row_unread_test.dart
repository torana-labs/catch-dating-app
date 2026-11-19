import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget row) => tester.pumpWidget(
  MaterialApp(
    home: CatchRoot(
      child: CatchScreen(body: CatchPageBody(child: row)),
    ),
  ),
);

const _dot = ValueKey<String>('catch-index-row-unread-dot');

void main() {
  testWidgets('an unread row puts a dot under its time', (tester) async {
    await _pump(
      tester,
      CatchIndexRow(
        title: 'Asha',
        subtitle: 'See you at seven',
        value: '2m',
        emphasis: CatchIndexRowEmphasis.unread,
        onTap: () {},
      ),
    );
    expect(find.byKey(_dot), findsOneWidget);
    expect(
      tester.getTopLeft(find.byKey(_dot)).dy,
      greaterThan(tester.getBottomLeft(find.text('2m')).dy),
    );
  });

  testWidgets('a read row has no dot', (tester) async {
    await _pump(
      tester,
      CatchIndexRow(title: 'Asha', value: '2m', onTap: () {}),
    );
    expect(find.byKey(_dot), findsNothing);
  });
}
