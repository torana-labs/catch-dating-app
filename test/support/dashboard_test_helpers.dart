import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
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

OrganizerMembership membership({
  required String clubId,
  String uid = 'runner-1',
}) {
  return OrganizerMembership(
    id: organizerMembershipId(clubId: clubId, uid: uid),
    clubId: clubId,
    uid: uid,
    role: OrganizerMembershipRole.member,
    status: OrganizerMembershipStatus.active,
    joinedAt: DateTime(2026),
  );
}

dynamic membershipsOverride(UserProfile user, List<String> organizerIds) =>
    watchActiveOrganizerMembershipsForUserProvider(user.uid).overrideWith(
      (ref) => Stream.value(
        organizerIds
            .map((clubId) => membership(clubId: clubId, uid: user.uid))
            .toList(),
      ),
    );

dynamic activityNotificationsOverride(
  UserProfile user, [
  List<ActivityNotification> notifications = const [],
]) => watchActivityNotificationsProvider(
  user.uid,
).overrideWithValue(AsyncData<List<ActivityNotification>>(notifications));
