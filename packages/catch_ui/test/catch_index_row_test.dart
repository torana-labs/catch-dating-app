import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) => tester.pumpWidget(
  MaterialApp(
    theme: CatchTheme.light,
    home: Scaffold(
      body: CatchRoot(theme: CatchThemeMode.day, child: child),
    ),
  ),
);

void main() {
  testWidgets('a row action keeps its own button beside the row', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    var reviewed = 0;
    var opened = 0;
    await _pump(
      tester,
      CatchIndexRow(
        title: '2 people want in',
        subtitle: 'Ishaan and Zoya asked to join tonight',
        marker: CatchIndexRowTone.warning,
        action: CatchIndexRowAction(
          label: 'Review',
          onPressed: () => reviewed += 1,
        ),
        density: CatchIndexRowSize.roomy,
        onTap: () => opened += 1,
      ),
    );
    expect(
      find.bySemanticsLabel(
        '2 people want in, Ishaan and Zoya asked to join tonight',
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(CatchButton),
        matching: find.text('Review'),
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Review'));
    expect(reviewed, 1);
    expect(opened, 0);
    await tester.tap(find.text('2 people want in'));
    expect(opened, 1);
    handle.dispose();
  });

  testWidgets('a system row pads by density and draws no line of its own', (
    tester,
  ) async {
    Widget row(CatchIndexRowSize? density) => Column(
      children: [
        CatchIndexRow(
          key: const ValueKey('row'),
          title: 'Carter Road Social Run',
          density: density,
          onTap: null,
        ),
      ],
    );
    await _pump(tester, row(null));
    expect(
      tester.getSize(find.byKey(const ValueKey('row'))).height,
      CatchLayout.eventTypeIndexRowHeight,
    );
    await _pump(tester, row(CatchIndexRowSize.compact));
    final compact = tester.getSize(find.byKey(const ValueKey('row'))).height;
    await _pump(tester, row(CatchIndexRowSize.roomy));
    final roomy = tester.getSize(find.byKey(const ValueKey('row'))).height;
    expect(roomy - compact, 8);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('row')),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is DecoratedBox &&
              widget.decoration is BoxDecoration &&
              (widget.decoration as BoxDecoration).border != null,
        ),
      ),
      findsNothing,
    );
  });

  testWidgets('the date tile, status and meter read as one row', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await _pump(
      tester,
      CatchIndexRow(
        title: 'Long Table Supper',
        meta: '8:00 PM · 14 of 14 booked',
        status: 'Full',
        statusTone: CatchIndexRowTone.success,
        progress: const CatchIndexRowProgress(
          value: 14,
          max: 14,
          label: 'Booked',
        ),
        date: const CatchIndexRowDate(
          day: 'Wed',
          date: '4',
          format: CatchFormat.dinner,
        ),
        density: CatchIndexRowSize.regular,
        onTap: () {},
      ),
    );
    expect(
      find.bySemanticsLabel(
        'Long Table Supper, Full, 8:00 PM · 14 of 14 booked',
      ),
      findsOneWidget,
    );
    expect(find.text('Wed'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('the system section draws lines between rows or its empty copy', (
    tester,
  ) async {
    Widget section(CatchSectionPlacement dividers, List<Widget> rows) =>
        CatchSection(
          title: 'This week',
          action: CatchSectionAction(label: 'All events', onPressed: () {}),
          dividers: dividers,
          empty: 'Nothing this week.',
          children: rows,
        );
    final rows = [
      for (final title in ['Run', 'Supper', 'Ladder'])
        CatchIndexRow(
          title: title,
          density: CatchIndexRowSize.regular,
          onTap: null,
        ),
    ];
    await _pump(tester, section(CatchSectionPlacement.between, rows));
    expect(find.byType(CatchDivider), findsNWidgets(2));
    await _pump(tester, section(CatchSectionPlacement.all, rows));
    expect(find.byType(CatchDivider), findsNWidgets(3));
    await _pump(tester, section(CatchSectionPlacement.none, rows));
    expect(find.byType(CatchDivider), findsNothing);
    await _pump(tester, section(CatchSectionPlacement.between, const []));
    expect(find.text('Nothing this week.'), findsOneWidget);
    expect(find.text('All events'), findsOneWidget);
  });

  testWidgets('the poster shows its counts and a +N for the rest', (
    tester,
  ) async {
    await _pump(
      tester,
      const CatchEventCard(
        format: CatchFormat.games,
        formatLabel: 'Trivia',
        when: 'Tonight · doors at 7:30',
        title: 'Tuesday Trivia Night',
        counts: [CatchMetricValue(value: '26', label: 'Booked')],
        people: [
          CatchPersonAvatarItem(name: 'Aanya Mehta'),
          CatchPersonAvatarItem(name: 'Kabir Rao'),
        ],
        peopleTotal: 26,
      ),
    );
    expect(find.text('Booked'), findsOneWidget);
    expect(find.text('+24'), findsOneWidget);
  });
}
