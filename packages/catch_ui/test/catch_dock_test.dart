import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(
  WidgetTester tester,
  CatchDock dock, {
  double width = 400,
  double bottomPadding = 0,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 800);
  tester.view.padding = FakeViewPadding(bottom: bottomPadding);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: CatchRoot(
        theme: CatchThemeMode.day,
        child: Material(
          type: MaterialType.transparency,
          child: Align(alignment: Alignment.bottomCenter, child: dock),
        ),
      ),
    ),
  );
}

CatchButton _button(WidgetTester tester, String label) =>
    tester.widget<CatchButton>(
      find.ancestor(of: find.text(label), matching: find.byType(CatchButton)),
    );

void main() {
  testWidgets('auto is a bar on phones and tablets, a card on desktops', (
    tester,
  ) async {
    const dock = CatchDock(primary: CatchDockAction(label: 'Publish'));
    await _pump(tester, dock);
    expect(find.byKey(const ValueKey('catch_dock.bar')), findsOneWidget);
    await _pump(tester, dock, width: 700);
    expect(find.byKey(const ValueKey('catch_dock.bar')), findsOneWidget);
    await _pump(tester, dock, width: 1000);
    expect(find.byKey(const ValueKey('catch_dock.card')), findsOneWidget);
    expect(find.byType(CatchSurface), findsOneWidget);
  });

  testWidgets('a bar puts the quiet secondary before a large full primary', (
    tester,
  ) async {
    var published = 0;
    await _pump(
      tester,
      CatchDock(
        primary: CatchDockAction(
          label: 'Publish',
          onPressed: () => published++,
        ),
        secondary: const CatchDockAction(label: 'Preview'),
      ),
      bottomPadding: 34,
    );
    expect(_button(tester, 'Publish').size, CatchButtonSize.lg);
    expect(_button(tester, 'Publish').fullWidth, isTrue);
    expect(_button(tester, 'Preview').variant, CatchButtonVariant.quiet);
    expect(
      tester.getRect(find.text('Preview')).right,
      lessThan(tester.getRect(find.text('Publish')).left),
    );
    final bar = tester.getRect(find.byKey(const ValueKey('catch_dock.bar')));
    expect(bar.bottom, 800);
    expect(
      tester.getRect(find.byType(CatchButton).last).bottom,
      lessThanOrEqualTo(800 - 34),
    );
    await tester.tap(find.text('Publish'));
    expect(published, 1);
  });

  testWidgets('a summary replaces the secondary action', (tester) async {
    await _pump(
      tester,
      const CatchDock(
        primary: CatchDockAction(label: 'Book'),
        secondary: CatchDockAction(label: 'Later'),
        summary: Text('₹1,200'),
        placement: CatchDockPlacement.bar,
      ),
    );
    expect(find.text('₹1,200'), findsOneWidget);
    expect(find.text('Later'), findsNothing);
  });

  testWidgets('a pane puts the note above next and the three actions', (
    tester,
  ) async {
    final note = TextEditingController();
    addTearDown(note.dispose);
    await _pump(
      tester,
      CatchDock(
        placement: CatchDockPlacement.pane,
        primary: const CatchDockAction(label: 'Approve'),
        secondary: const CatchDockAction(label: 'Ask'),
        danger: const CatchDockAction(label: 'Reject'),
        note: CatchDockNote(label: 'Why?', controller: note),
        next: const Text('Then: Harbor Social'),
      ),
      width: 900,
    );
    expect(find.byKey(const ValueKey('catch_dock.pane')), findsOneWidget);
    expect(find.byType(CatchTextInput), findsOneWidget);
    expect(
      tester.getRect(find.byType(CatchTextInput)).bottom,
      lessThanOrEqualTo(tester.getRect(find.text('Approve')).top),
    );
    final reject = tester.getRect(find.text('Reject'));
    final ask = tester.getRect(find.text('Ask'));
    final approve = tester.getRect(find.text('Approve'));
    expect(reject.right, lessThan(ask.left));
    expect(ask.right, lessThan(approve.left));
    expect(_button(tester, 'Approve').size, CatchButtonSize.md);
    expect(_button(tester, 'Reject').variant, CatchButtonVariant.quiet);
    await tester.enterText(find.byType(EditableText), 'Duplicate');
    expect(note.text, 'Duplicate');
  });

  testWidgets('a loading primary shows the busy state', (tester) async {
    await _pump(
      tester,
      const CatchDock(primary: CatchDockAction(label: 'Save', loading: true)),
    );
    expect(
      tester.widget<CatchButton>(find.byType(CatchButton)).status,
      CatchButtonStatus.loading,
    );
  });
}
