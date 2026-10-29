import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RouteEventPlan', () {
    test('selects activity presets without treating activity as a gate', () {
      expect(
        RouteEventPlan.defaultForActivity(ActivityKind.socialRun),
        RouteEventPlan.socialRun,
      );
      expect(
        RouteEventPlan.defaultForActivity(ActivityKind.walking),
        RouteEventPlan.socialWalk,
      );
      expect(
        RouteEventPlan.defaultForActivity(ActivityKind.barCrawl),
        RouteEventPlan.hostedWalk,
      );
      expect(RouteEventPlan.defaultForActivity(ActivityKind.pubQuiz), isNull);
      expect(
        RouteEventPlan.defaultForActivity(ActivityKind.openActivity),
        isNull,
      );
    });

    test('round-trips a photography walk composed from shared axes', () {
      final photographyWalk = RouteEventPlan.customWalk.copyWith(
        routeShape: RouteShape.pointToPoint,
        groupStrategy: RouteGroupStrategy.selfDirected,
      );

      final restored = RouteEventPlan.tryFromJson(photographyWalk.toJson());

      expect(restored, photographyWalk);
      expect(restored!.stopKinds, contains(RouteStopKind.photoSpot));
      expect(restored.roleKinds, contains(RouteRoleKind.photographer));
    });

    test('round-trips v2 path, pace groups, and live tracking policy', () {
      final plan = RouteEventPlan.socialRun.copyWith(
        path: const [
          RoutePoint(latitude: 19.0608, longitude: 72.8365),
          RoutePoint(latitude: 19.0641, longitude: 72.8412),
        ],
        paceGroups: const [
          RoutePaceGroup(
            id: 'social',
            label: 'Social pace',
            sortOrder: 0,
            targetPaceSecondsPerKm: 420,
          ),
        ],
        liveTrackingPolicy: const RouteLiveTrackingPolicy(
          mode: RouteLiveTrackingMode.hostOnly,
          staleAfterSeconds: 120,
          retentionMinutes: 60,
        ),
      );

      expect(plan.version, 2);
      expect(RouteEventPlan.tryFromJson(plan.toJson()), plan);
    });

    test('rejects incomplete or unsupported route plans', () {
      expect(RouteEventPlan.tryFromJson(null), isNull);
      expect(
        RouteEventPlan.tryFromJson({
          ...RouteEventPlan.socialWalk.toJson(),
          'version': 2,
        }),
        isNull,
      );
      expect(
        RouteEventPlan.tryFromJson({
          ...RouteEventPlan.socialWalk.toJson(),
          'stopKinds': <String>[],
        }),
        isNull,
      );
    });

    test('is read from the typed event format activity details boundary', () {
      final snapshot = EventFormatSnapshot.fromActivityKind(
        ActivityKind.barCrawl,
        activityDetails: {'routePlan': RouteEventPlan.hostedWalk.toJson()},
      );

      expect(snapshot.routePlan, RouteEventPlan.hostedWalk);
      expect(
        EventFormatSnapshot.fromJson(snapshot.toJson()).routePlan,
        RouteEventPlan.hostedWalk,
      );
    });
  });
}
