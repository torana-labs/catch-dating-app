import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: Center(child: child)),
);

void main() {
  testWidgets('disabled shell ignores tap and keyboard activation', (
    tester,
  ) async {
    var calls = 0;
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      _host(
        CatchControlSurface(
          enabled: false,
          semanticButton: true,
          status: CatchControlSurfaceStatus.focused,
          onTap: () => calls++,
          child: const Text('Choose city'),
        ),
      ),
    );
    await tester.tap(find.text('Choose city'));
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await tester.pump();
    expect(calls, 0);
    expect(tester.widget<InkWell>(find.byType(InkWell)).onTap, isNull);
    final node = tester.getSemantics(find.byType(CatchControlSurface));
    expect(node.flagsCollection.isEnabled.toBoolOrNull(), isFalse);
    expect(node.flagsCollection.isButton, isTrue);
    final container = tester.widget<AnimatedContainer>(
      find.byType(AnimatedContainer),
    );
    expect((container.decoration! as BoxDecoration).boxShadow, isEmpty);
    semantics.dispose();
  });

  testWidgets('enabled shell still invokes its callback once', (tester) async {
    var calls = 0;
    await tester.pumpWidget(
      _host(
        CatchControlSurface(
          onTap: () => calls++,
          child: const Text('Choose city'),
        ),
      ),
    );
    await tester.tap(find.text('Choose city'));
    expect(calls, 1);
  });

  testWidgets('disabled shell leaves nested control enablement with caller', (
    tester,
  ) async {
    var calls = 0;
    await tester.pumpWidget(
      _host(
        CatchControlSurface(
          enabled: false,
          child: TextButton(
            onPressed: () => calls++,
            child: const Text('Nested action'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Nested action'));
    expect(calls, 1);
  });
}
