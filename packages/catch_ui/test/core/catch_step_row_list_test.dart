import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('replacing steps renumbers and terminates the trace', (
    tester,
  ) async {
    Future<void> pump(List<CatchStepRowData> steps) => tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(body: CatchStepList(steps: steps)),
      ),
    );
    final connectors = find.byWidgetPredicate(
      (widget) =>
          widget is Container &&
          widget.constraints?.maxWidth == CatchStroke.underline &&
          widget.color != null,
    );

    await pump(const [
      CatchStepRowData(title: 'Arrive', body: 'Check in with the host.'),
      CatchStepRowData(title: 'Meet'),
      CatchStepRowData(title: 'Follow up'),
    ]);
    expect(connectors, findsNWidgets(2));
    expect(find.text('03'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Arrive')).dy,
      lessThan(tester.getTopLeft(find.text('Meet')).dy),
    );

    await pump(const [CatchStepRowData(title: 'Finished')]);
    expect(connectors, findsNothing);
    expect(find.text('01'), findsOneWidget);
    expect(find.text('02'), findsNothing);
    expect(find.text('Check in with the host.'), findsNothing);

    await pump(const []);
    expect(find.byType(Text), findsNothing);
    expect(connectors, findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('scaled supporting copy keeps the trace beside its own row', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.dark,
        home: const Scaffold(
          body: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(2)),
            child: SingleChildScrollView(
              child: SizedBox(
                width: 320,
                child: CatchStepList(
                  steps: [
                    CatchStepRowData(
                      title: 'A longer first instruction',
                      body: 'Supporting copy wraps inside the content column.',
                    ),
                    CatchStepRowData(title: 'The final instruction'),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
    final title = tester.getRect(find.text('A longer first instruction'));
    final body = tester.getRect(
      find.text('Supporting copy wraps inside the content column.'),
    );
    final finalTitle = tester.getRect(find.text('The final instruction'));
    final number = tester.renderObject<RenderParagraph>(find.text('01'));
    final numberBoxes = number.getBoxesForSelection(
      const TextSelection(baseOffset: 0, extentOffset: 2),
    );
    expect(
      numberBoxes,
      hasLength(1),
      reason: 'An ordered-list number must stay on one visual line.',
    );
    expect(numberBoxes.single.right, lessThanOrEqualTo(number.size.width));
    expect(body.left, title.left);
    expect(finalTitle.left, title.left);
    expect(body.top, greaterThanOrEqualTo(title.bottom));
    expect(finalTitle.top, greaterThan(body.bottom));
    expect(tester.takeException(), isNull);
  });

  testWidgets('markers replace the numbers and tags take the accent', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: const Scaffold(
          body: CatchStepList(
            accent: Color(0xFF8A2F12),
            steps: [
              CatchStepRowData(
                marker: '5:45',
                title: 'Meet at the jetty',
                tag: 'Bag drop and water',
              ),
              CatchStepRowData(marker: '10:30', title: 'Breakfast'),
            ],
          ),
        ),
      ),
    );
    expect(find.text('01'), findsNothing);
    expect(find.text('5:45'), findsOneWidget);
    final tag = tester.widget<Text>(find.text('Bag drop and water'));
    expect(tag.style?.color, const Color(0xFF8A2F12));
    final marker = tester.getRect(find.text('10:30'));
    final title = tester.getRect(find.text('Breakfast'));
    expect(marker.right, lessThan(title.left));
    expect(
      tester.getRect(find.text('Meet at the jetty')).left,
      title.left,
      reason: 'Every row shares the widest marker column.',
    );
  });
}
