import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('nested page insets accumulate and preserve explicit policy', (
    tester,
  ) async {
    EdgeInsets? outsets;
    CatchDividedFieldInteractionScopeMode? interaction;
    final reader = Builder(
      builder: (context) {
        outsets = CatchFieldInteractionPlaneScope.outsetsOf(context);
        interaction = CatchDividedFieldInteractionScope.interactionOf(context);
        return const SizedBox();
      },
    );
    Future<void> pump(
      TextDirection direction,
      double start,
    ) => tester.pumpWidget(
      MaterialApp(
        home: Directionality(
          textDirection: direction,
          child: CatchFieldInteractionPlaneScope(
            outsets: const EdgeInsets.only(left: 4, right: 6),
            child: CatchDividedFieldInteractionScope(
              interaction: CatchDividedFieldInteractionScopeMode.roundedTile,
              child: CatchPageBody(
                padding: EdgeInsetsDirectional.only(start: start, end: 17),
                child: CatchPageBody.formStep(
                  padding: const EdgeInsetsDirectional.only(start: 3, end: 5),
                  child: reader,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await pump(TextDirection.rtl, 11);
    expect(outsets, const EdgeInsets.only(left: 26, right: 20));
    expect(interaction, CatchDividedFieldInteractionScopeMode.roundedTile);
    await pump(TextDirection.ltr, 11);
    expect(outsets, const EdgeInsets.only(left: 18, right: 28));
    await pump(TextDirection.ltr, 21);
    expect(outsets, const EdgeInsets.only(left: 28, right: 28));
    expect(interaction, CatchDividedFieldInteractionScopeMode.roundedTile);
  });

  testWidgets(
    'page geometry supplies a default only without inherited policy',
    (tester) async {
      CatchDividedFieldInteractionScopeMode? interaction;
      await tester.pumpWidget(
        MaterialApp(
          home: CatchPageBody(
            child: Builder(
              builder: (context) {
                interaction = CatchDividedFieldInteractionScope.interactionOf(
                  context,
                );
                return const SizedBox();
              },
            ),
          ),
        ),
      );
      expect(interaction, CatchDividedFieldInteractionScopeMode.fullBleed);
    },
  );

  testWidgets(
    'screen variant changes scroll ownership without losing content',
    (tester) async {
      final key = GlobalKey();
      const childKey = ValueKey('retained-body-child');
      Future<void> pump(CatchPageBodyVariant variant) => tester.pumpWidget(
        MaterialApp(
          home: CatchPageBody.screen(
            key: key,
            variant: variant,
            child: const SizedBox(key: childKey, height: 200),
          ),
        ),
      );
      await pump(CatchPageBodyVariant.scrolling);
      final element = tester.element(find.byKey(key));
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byKey(childKey), findsOneWidget);
      await pump(CatchPageBodyVariant.fixed);
      expect(tester.element(find.byKey(key)), same(element));
      expect(find.byType(SingleChildScrollView), findsNothing);
      expect(find.byKey(childKey), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
