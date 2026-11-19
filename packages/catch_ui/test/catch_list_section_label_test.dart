import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('a kicker with no title is the section label', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CatchRoot(
          child: CatchScreen(
            body: CatchPageBody(
              child: CatchSection(
                kicker: 'Arriving',
                children: const [Text('Asha')],
              ),
            ),
          ),
        ),
      ),
    );

    final label = tester.widget<Text>(find.text('Arriving'));
    final context = tester.element(find.text('Arriving'));
    expect(
      label.style?.fontSize ?? DefaultTextStyle.of(context).style.fontSize,
      CatchTextStyles.kicker(context).fontSize,
    );
    expect(
      tester.getSemantics(find.text('Arriving')),
      matchesSemantics(label: 'Arriving', isHeader: true),
    );
    expect(
      tester.getTopLeft(find.text('Asha')).dy,
      greaterThan(tester.getBottomLeft(find.text('Arriving')).dy),
    );
  });
}
