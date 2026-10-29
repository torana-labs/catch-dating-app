import 'package:catch_dating_app/explore/presentation/widgets/explore_recommendations_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/recommend_card.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('recommendations load through their horizontal ticket rail', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: ExploreRecommendationsSection.loading()),
      ),
    );
    await tester.pump();

    final cards = find.byType(RecommendCard);
    expect(find.byType(CatchSection), findsOneWidget);
    expect(cards, findsNWidgets(2));
    expect(find.byType(CatchSkeleton), findsNWidgets(2));
    final rects = [
      for (final card in cards.evaluate())
        tester.getRect(find.byWidget(card.widget)),
    ];
    expect(rects.map((rect) => rect.top).toSet(), hasLength(1));
    expect(rects.map((rect) => rect.left).toSet(), hasLength(2));
    expect(find.bySemanticsLabel('Loading recommendation'), findsNothing);
  });
}
