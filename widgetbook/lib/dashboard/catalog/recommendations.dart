import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/dashboard_surface_fixtures.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_recommendations_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/recommend_card.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

final _recommendationEvent = DashboardSurfaceFixtures.recommendationEvent;

final _dashboardRecommendation = ExploreEventRecommendation(
  event: _recommendationEvent,
  clubName: widgetbookDashboardClub.name,
  reasonLabel: 'Matches your 10K pace',
  score: 0.92,
);

@widgetbook.UseCase(
  name: 'Review states',
  type: RecommendCard,
  path: '[P1 product surfaces]/Explore primitives',
)
Widget dashboardRecommendCardReviewStates(BuildContext context) {
  final soonEvent = _recommendationVariant(
    id: 'widgetbook-recommend-soon-free',
    startsIn: const Duration(hours: 3, minutes: 20),
    bookedCount: 11,
    capacityLimit: 12,
    priceInPaise: 0,
  );
  final dinnerEvent = _recommendationVariant(
    id: 'widgetbook-recommend-dinner-paid',
    startsIn: const Duration(days: 2, hours: 5),
    activityKind: ActivityKind.dinner,
    meetingPoint: 'The Table, Colaba',
    distanceKm: 0,
    pace: PaceLevel.easy,
    bookedCount: 8,
    capacityLimit: 8,
    waitlistedCount: 5,
    priceInPaise: 220000,
  );
  final longCopyEvent = _recommendationVariant(
    id: 'widgetbook-recommend-long-copy',
    startsIn: const Duration(days: 5, hours: 6),
    meetingPoint: 'Mahalaxmi Race Course north gate beside the main paddock',
    bookedCount: 27,
    capacityLimit: 32,
    priceInPaise: 15000,
  );

  return WidgetbookPageCatalogFrame(
    title: 'RecommendCard',
    contractId: 'explore.primitives.recommend_card',
    children: [
      WidgetbookPageStateCard(
        label: 'ranked recommendation',
        child: WidgetbookDashboardPrimitiveFrame(
          child: IgnorePointer(
            child: RecommendCard.fromRecommendation(
              recommendation: ExploreEventRecommendation(
                event: _recommendationEvent,
                clubName: widgetbookDashboardClub.name,
                reasonLabel: 'Matches your 10K pace',
                score: 0.92,
              ),
              width: WidgetbookDashboardPreviewLayout.recommendationCardWidth,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'free event soon',
        child: WidgetbookDashboardPrimitiveFrame(
          child: IgnorePointer(
            child: RecommendCard(
              event: soonEvent,
              clubName: widgetbookDashboardClub.name,
              reasonLabel: 'Almost full near you',
              width: WidgetbookDashboardPreviewLayout.recommendationCardWidth,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'paid full event',
        child: WidgetbookDashboardPrimitiveFrame(
          child: IgnorePointer(
            child: RecommendCard(
              event: dinnerEvent,
              clubName: 'Colaba Dinner Club',
              reasonLabel: 'Popular with your clubs',
              width: WidgetbookDashboardPreviewLayout.recommendationCardWidth,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event fallback factory',
        child: WidgetbookDashboardPrimitiveFrame(
          child: IgnorePointer(
            child: RecommendCard.fromEvent(
              event: soonEvent,
              width: WidgetbookDashboardPreviewLayout.recommendationCardWidth,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long venue and reason',
        child: WidgetbookDashboardPrimitiveFrame(
          child: IgnorePointer(
            child: RecommendCard(
              event: longCopyEvent,
              clubName: 'Mumbai Long Run Collective and Coffee Society',
              reasonLabel: 'Because you saved paced social runs this week',
              width: WidgetbookDashboardPreviewLayout.recommendationCardWidth,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Recommendation rail',
  type: ExploreRecommendationsSection,
  path: '[P1 product surfaces]/Explore feed',
)
Widget dashboardRecommendationsReview(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ExploreRecommendationsSection',
    contractId: 'explore.feed.recommendations',
    children: [
      WidgetbookPageStateCard(
        label: 'ranked events',
        child: WidgetbookDashboardPrimitiveFrame(
          child: ExploreRecommendationsSection(
            recommendations: [
              _dashboardRecommendation,
              ExploreEventRecommendation(
                event: _recommendationVariant(
                  id: 'widgetbook-recommend-rail-paid',
                  startsIn: const Duration(days: 2),
                  priceInPaise: 15000,
                ),
                clubName: widgetbookDashboardClub.name,
                reasonLabel: 'Popular with your clubs',
                score: 0.84,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

Event _recommendationVariant({
  required String id,
  required Duration startsIn,
  ActivityKind activityKind = ActivityKind.socialRun,
  String meetingPoint = 'Race Course Road main gate',
  double distanceKm = 10,
  PaceLevel pace = PaceLevel.moderate,
  int bookedCount = 4,
  int capacityLimit = 12,
  int waitlistedCount = 0,
  int priceInPaise = 0,
}) {
  final start = DateTime.now().add(startsIn);
  return _recommendationEvent.copyWith(
    id: id,
    startTime: start,
    endTime: start.add(const Duration(hours: 1, minutes: 20)),
    meetingPoint: meetingPoint,
    meetingLocation: EventMeetingLocation(
      name: meetingPoint,
      latitude: 18.993,
      longitude: 72.824,
      notes: 'Widgetbook review fixture',
    ),
    startingPointLat: 18.993,
    startingPointLng: 72.824,
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: distanceKm,
    pace: pace,
    bookedCount: bookedCount,
    capacityLimit: capacityLimit,
    waitlistedCount: waitlistedCount,
    priceInPaise: priceInPaise,
  );
}
