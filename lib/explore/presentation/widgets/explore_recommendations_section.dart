import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/explore/presentation/widgets/recommend_card.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ExploreRecommendationsSection extends StatelessWidget {
  const ExploreRecommendationsSection({
    super.key,
    required this.recommendations,
    this.title,
  }) : _loading = false;

  const ExploreRecommendationsSection.loading({super.key, this.title})
    : recommendations = const [],
      _loading = true;

  final List<ExploreEventRecommendation> recommendations;
  final String? title;
  final bool _loading;

  @override
  Widget build(BuildContext context) {
    return CatchSection.horizontal(
      title: title ?? context.l10n.exploreRecommendationsTitleForYou,
      itemCount: _loading ? 2 : recommendations.length,
      itemBuilder: (context, i) => _loading
          ? RecommendCard.loading()
          : RecommendCard.fromRecommendation(
              recommendation: recommendations[i],
            ),
      height: null,
      spacing: CatchLayout.recommendationRailGap,
      itemWidth: const CatchRailItemWidth.fractional(
        fraction: CatchLayout.recommendationRailItemWidthFraction,
        min: CatchLayout.recommendationRailItemMinWidth,
        max: CatchLayout.recommendationRailItemMaxWidth,
      ),
    );
  }
}
