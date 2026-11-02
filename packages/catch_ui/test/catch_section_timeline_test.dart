import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _copy = CatchSectionTimelineCopy(
  done: 'Done',
  current: 'Now',
  next: 'Next',
);

const _steps = [
  CatchSectionStep(
    title: 'Your page went live',
    subtitle: 'Hidden from search',
    meta: 'Thu 31 Oct',
    state: CatchSectionStepState.done,
  ),
  CatchSectionStep(
    title: 'You asked to claim it',
    meta: 'Today',
    state: CatchSectionStepState.current,
    tone: CatchSectionStepTone.warning,
  ),
  CatchSectionStep(title: 'Run your page', state: CatchSectionStepState.next),
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
      _app(const CatchSectionTimeline(steps: _steps, copy: _copy)),
    );
    expect(find.text('Your page went live'), findsOneWidget);
    expect(find.text('Hidden from search'), findsOneWidget);
    expect(find.text('Thu 31 Oct'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('catch-section-timeline-line')),
      findsNWidgets(_steps.length - 1),
    );
  });

  testWidgets('a screen reader hears where each step stands', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      _app(const CatchSectionTimeline(steps: _steps, copy: _copy)),
    );
    expect(find.bySemanticsLabel(RegExp('^Done: Your page')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^Now: You asked')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^Next: Run your')), findsOneWidget);
    handle.dispose();
  });

  testWidgets('a section titles the timeline', (tester) async {
    await tester.pumpWidget(
      _app(
        CatchSection.timeline(
          title: 'Your page so far',
          steps: _steps,
          copy: _copy,
        ),
      ),
    );
    expect(find.byType(CatchSectionTimeline), findsOneWidget);
  });
}
