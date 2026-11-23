import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const noRecommendationCandidates =
    AsyncData<List<ExploreEventRecommendationCandidate>>([]);

ExploreRecommendationsQuery recommendationsQueryFor(
  String uid,
  List<String> followedOrganizerIds,
) => ExploreRecommendationsQuery(
  userId: uid,
  followedOrganizerIds: followedOrganizerIds,
);

AsyncData<WeeklyActivitySnapshot> emptyWeeklyActivitySnapshot() {
  return AsyncData(
    WeeklyActivitySnapshot.permissionRequired(
      referenceDate: DateTime(2026, 5, 13),
      platformLabel: 'Apple Health',
    ),
  );
}

ExploreEventRecommendationCandidate recommendationCandidate(
  Event event, {
  String organizerName = 'Stride Social',
  String? organizerLocation = 'mumbai',
}) => ExploreEventRecommendationCandidate(
  event: event,
  organizerName: organizerName,
  organizerLocation: organizerLocation,
);

OrganizerFollow membership({
  required String organizerId,
  String uid = 'runner-1',
}) {
  return OrganizerFollow(
    id: organizerFollowId(organizerId: organizerId, uid: uid),
    organizerId: organizerId,
    uid: uid,
    status: OrganizerFollowStatus.active,
    followedAt: DateTime(2026),
  );
}

dynamic membershipsOverride(UserProfile user, List<String> organizerIds) =>
    watchActiveOrganizerFollowsForUserProvider(user.uid).overrideWith(
      (ref) => Stream.value(
        organizerIds
            .map(
              (organizerId) =>
                  membership(organizerId: organizerId, uid: user.uid),
            )
            .toList(),
      ),
    );

dynamic activityNotificationsOverride(
  UserProfile user, [
  List<ActivityNotification> notifications = const [],
]) => watchActivityNotificationsProvider(
  user.uid,
).overrideWithValue(AsyncData<List<ActivityNotification>>(notifications));
