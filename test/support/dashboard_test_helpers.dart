import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const noRecommendationCandidates =
    AsyncData<List<ExploreEventRecommendationCandidate>>([]);

ExploreRecommendationsQuery recommendationsQueryFor(
  String uid,
  List<String> followedClubIds,
) => ExploreRecommendationsQuery(userId: uid, followedClubIds: followedClubIds);

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
  String clubName = 'Stride Social',
  String? clubLocation = 'mumbai',
}) => ExploreEventRecommendationCandidate(
  event: event,
  clubName: clubName,
  clubLocation: clubLocation,
);

ClubMembership membership({required String clubId, String uid = 'runner-1'}) {
  return ClubMembership(
    id: clubMembershipId(clubId: clubId, uid: uid),
    clubId: clubId,
    uid: uid,
    role: ClubMembershipRole.member,
    status: ClubMembershipStatus.active,
    joinedAt: DateTime(2026),
  );
}

dynamic membershipsOverride(UserProfile user, List<String> clubIds) =>
    watchActiveClubMembershipsForUserProvider(user.uid).overrideWith(
      (ref) => Stream.value(
        clubIds
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
