import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 600);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(
          size: const Size(390, 600),
          textScaler: TextScaler.linear(scale),
        ),
        child: CatchRoot(
          theme: CatchThemeMode.day,
          child: Padding(padding: const EdgeInsets.all(40), child: child),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets(
    'a section action hangs on the title line and keeps its whole target',
    (tester) async {
      var taps = 0;
      await _pump(
        tester,
        Column(
          children: [
            // Room above the section, as the gap between sections gives it.
            const SizedBox(height: 40),
            CatchSection(
              key: const Key('with'),
              title: 'Plans',
              action: CatchSectionAction(label: 'New', onPressed: () => taps++),
              children: const [SizedBox(height: 20)],
            ),
            CatchSection(
              key: const Key('without'),
              title: 'Week',
              children: const [SizedBox(height: 20)],
            ),
          ],
        ),
      );
      // The action does not push its title down or make its section taller.
      final withTitle = tester.getRect(find.text('Plans'));
      expect(
        withTitle.top,
        tester.getTopLeft(find.byKey(const Key('with'))).dy,
      );
      expect(
        tester.getSize(find.byKey(const Key('with'))).height,
        tester.getSize(find.byKey(const Key('without'))).height,
      );
      // Its 48 px target still answers above and below the title line.
      final button = tester.getRect(find.byType(CatchButton));
      expect(button.height, greaterThanOrEqualTo(48));
      await tester.tapAt(Offset(button.center.dx, button.top + 2));
      await tester.tapAt(Offset(button.center.dx, button.bottom - 2));
      expect(taps, 2);
    },
  );

  testWidgets('at large text the action drops under the title, flush with it', (
    tester,
  ) async {
    await _pump(
      tester,
      CatchSection(
        title: 'Programmes',
        action: CatchSectionAction(label: 'New programme', onPressed: () {}),
        children: const [SizedBox(height: 20)],
      ),
      scale: 2,
    );
    final title = tester.getRect(find.text('Programmes'));
    final label = tester.getRect(find.text('New programme'));
    expect(label.top, greaterThan(title.bottom));
    expect(label.left, title.left);
  });
}
