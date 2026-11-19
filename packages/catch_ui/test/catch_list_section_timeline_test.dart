import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// A feature row that wraps the system row, as the app's plan steps do.
class _WrappedStep extends StatelessWidget {
  const _WrappedStep({required this.title, this.subtitle, this.meta});

  final String title;
  final String? subtitle;
  final String? meta;

  @override
  Widget build(BuildContext context) => CatchIndexRow(
    title: title,
    subtitle: subtitle,
    meta: meta,
    time: subtitle == null ? '7:30 PM' : null,
    marker: CatchIndexRowTone.neutral,
    density: CatchIndexRowSize.compact,
    onTap: null,
  );
}

Future<void> _pump(WidgetTester tester, Widget section) => tester.pumpWidget(
  MaterialApp(
    home: CatchRoot(
      child: CatchScreen(body: CatchPageBody(child: section)),
    ),
  ),
);

void main() {
  const lineKey = ValueKey('catch-index-row-timeline-line');

  Future<void> pumpTimeline(WidgetTester tester, List<Widget> rows) => _pump(
    tester,
    CatchListSection(
      title: 'Tonight',
      dividers: CatchSectionPlacement.none,
      timeline: true,
      children: rows,
    ),
  );

  Finder markerOf(String title) => find
      .descendant(
        of: find.widgetWithText(CatchIndexRow, title),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is DecoratedBox &&
              widget.decoration is BoxDecoration &&
              (widget.decoration as BoxDecoration).shape == BoxShape.circle,
        ),
      )
      .first;

  void expectJoined(WidgetTester tester, Finder line, String from, String to) {
    final marker = tester.getRect(markerOf(from));
    final next = tester.getRect(markerOf(to));
    final rect = tester.getRect(line);
    expect(rect.center.dx, closeTo(marker.center.dx, 0.5));
    // The line starts 3 px under one marker and stops 3 px above the next.
    expect(rect.top, closeTo(marker.bottom + 3, 0.5));
    expect(rect.bottom, closeTo(next.top - 3, 0.5));
  }

  testWidgets('wrapped rows join their markers, not the time column', (
    tester,
  ) async {
    await pumpTimeline(tester, const [
      _WrappedStep(title: 'Doors'),
      _WrappedStep(title: 'Round one'),
      _WrappedStep(title: 'Reveal'),
    ]);

    final lines = find.byKey(lineKey);
    // Every step but the last draws the line down to the next one.
    expect(lines, findsNWidgets(2));
    expectJoined(tester, lines.at(0), 'Doors', 'Round one');
    expectJoined(tester, lines.at(1), 'Round one', 'Reveal');
  });

  testWidgets('rows with more lines keep the marker by the title', (
    tester,
  ) async {
    await pumpTimeline(tester, const [
      _WrappedStep(title: 'Save the date', subtitle: 'Tue 1 Sep', meta: 'Sent'),
      _WrappedStep(title: 'The itinerary', subtitle: 'Sat 5 Dec', meta: 'All'),
    ]);

    final line = find.byKey(lineKey);
    expect(line, findsOneWidget);
    expectJoined(tester, line, 'Save the date', 'The itinerary');
    final title = tester.getRect(find.text('Save the date'));
    expect(
      tester.getRect(markerOf('Save the date')).center.dy,
      closeTo(title.center.dy, 1),
    );
  });

  testWidgets('a section without a timeline draws no line', (tester) async {
    await _pump(
      tester,
      const CatchListSection(
        title: 'Tonight',
        children: [
          _WrappedStep(title: 'Doors'),
          _WrappedStep(title: 'Round one'),
        ],
      ),
    );

    expect(find.byKey(lineKey), findsNothing);
  });
}
