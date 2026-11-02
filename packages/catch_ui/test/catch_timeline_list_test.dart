import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _copy = CatchTimelineListCopy(done: 'Done', current: 'Now', next: 'Next');

const _steps = [
  CatchSectionStep(
    title: 'Your page went live',
    subtitle: 'Hidden from search',
    meta: 'Thu 31 Oct',
    status: CatchSectionStepStatus.done,
  ),
  CatchSectionStep(
    title: 'You asked to claim it',
    meta: 'Today',
    status: CatchSectionStepStatus.current,
    tone: CatchSectionStepTone.warning,
  ),
  CatchSectionStep(title: 'Run your page', status: CatchSectionStepStatus.next),
];

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);

void main() {
  testWidgets('steps show their text and join with one line fewer', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(const CatchTimelineList(steps: _steps, copy: _copy)),
    );
    expect(find.text('Your page went live'), findsOneWidget);
    expect(find.text('Hidden from search'), findsOneWidget);
    expect(find.text('Thu 31 Oct'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('catch-timeline-list-line')),
      findsNWidgets(_steps.length - 1),
    );
  });

  testWidgets('a screen reader hears where each step stands', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      _app(const CatchTimelineList(steps: _steps, copy: _copy)),
    );
    expect(find.bySemanticsLabel(RegExp('^Done: Your page')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^Now: You asked')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^Next: Run your')), findsOneWidget);
    handle.dispose();
  });
}
