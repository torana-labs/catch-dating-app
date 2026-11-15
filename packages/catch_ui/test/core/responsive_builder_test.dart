import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('component responsive builder uses its local width', (
    tester,
  ) async {
    Widget subject(double width) => MaterialApp(
      home: Align(
        alignment: Alignment.topLeft,
        child: SizedBox(
          width: width,
          child: CatchViewport.atWidth(
            breakpoint: 320,
            compactBuilder: (_) => const Text('compact'),
            expandedBuilder: (_) => const Text('expanded'),
          ),
        ),
      ),
    );

    await tester.pumpWidget(subject(319));
    expect(find.text('compact'), findsOneWidget);
    expect(find.text('expanded'), findsNothing);

    await tester.pumpWidget(subject(320));
    expect(find.text('expanded'), findsOneWidget);
    expect(find.text('compact'), findsNothing);
  });

  testWidgets('responsive sliver builder reports local cross-axis width', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: 420,
            height: 300,
            child: CustomScrollView(
              slivers: [
                CatchViewport.sliver(
                  sliverBuilder: (context, viewport) => SliverToBoxAdapter(
                    child: Text('${viewport.width.toInt()}'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    expect(find.text('420'), findsOneWidget);
  });
}
