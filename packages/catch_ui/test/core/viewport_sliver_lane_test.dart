import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final direction in TextDirection.values) {
    for (final width in [320.0, 400.0, 600.0]) {
      testWidgets(
        'readable sliver lane retains geometry at $width $direction',
        (tester) async {
          const laneKey = ValueKey('lane-content');
          const scrollKey = ValueKey('lane-scroll');
          final controller = ScrollController();
          addTearDown(controller.dispose);
          await tester.pumpWidget(
            MaterialApp(
              home: Directionality(
                textDirection: direction,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: SizedBox(
                    width: width,
                    height: 300,
                    child: CustomScrollView(
                      key: scrollKey,
                      controller: controller,
                      slivers: const [
                        CatchViewport.sliverLane(
                          maxExtent: 400,
                          child: SliverToBoxAdapter(
                            child: SizedBox(key: laneKey, height: 900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
          final bounds = tester.getRect(find.byKey(laneKey));
          final scroll = tester.getRect(find.byKey(scrollKey));
          expect(bounds.width, width <= 400 ? width : 400);
          expect(bounds.center.dx, scroll.center.dx);
          expect(
            find.byType(SliverCrossAxisGroup),
            width <= 400 ? findsNothing : findsOneWidget,
          );
          controller.jumpTo(100);
          await tester.pump();
          expect(tester.getTopLeft(find.byKey(laneKey)).dy, bounds.top - 100);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
