// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;

/// Shared deterministic fixtures for Profile/Public Profile design review.
///
/// Keep these provider-free so Widgetbook and future route captures can render
/// the same state inventory without depending on live Firebase data.
final class ProfileSurfaceFixtures {
  const ProfileSurfaceFixtures._();

  static const viewerUid = 'design-profile-viewer';
  static const targetUid = 'design-profile-riya';
  static const ownUid = viewerUid;

  static final now = DateTime(2026, 6, 22, 10);

  static final viewer = UserProfile(
    uid: viewerUid,
    name: 'Neha Kapoor',
    firstName: 'Neha',
    lastName: 'Kapoor',
    displayName: 'Neha',
    dateOfBirth: DateTime(1996, 4, 12),
    gender: Gender.woman,
    phoneNumber: '+919876543210',
    email: 'neha@catch.test',
    instagramHandle: 'neharuns',
    profileComplete: true,
    profilePhotos: profilePhotos(owner: viewerUid, seed: 'neha'),
    profilePrompts: profilePrompts(
      perfectEvent:
          'A golden-hour 5K that ends with filter coffee and no rushed exits.',
      weekend:
          'Long walks through Bandra, easy playlists, and finding the best dosa near the route.',
    ),
    city: 'Mumbai',
    latitude: 19.076,
    longitude: 72.8777,
    interestedInGenders: const [Gender.man],
    height: 166,
    occupation: 'Brand strategist',
    company: 'Studio Coast',
    education: EducationLevel.masters,
    religion: Religion.hindu,
    languages: const [Language.english, Language.hindi, Language.marathi],
    relationshipGoal: RelationshipGoal.relationship,
    drinking: DrinkingHabit.socially,
    workout: WorkoutFrequency.often,
    diet: DietaryPreference.vegetarian,
    children: ChildrenStatus.wantSomeday,
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(
        paceMinSecsPerKm: 315,
        paceMaxSecsPerKm: 390,
        preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
        runningReasons: [RunReason.community, RunReason.social],
        preferredRunTimes: [PreferredRunTime.earlyMorning],
        version: currentRunPreferencesVersion,
      ),
    ),
    prefsOrganizerUpdates: false,
    prefsWeeklyDigest: true,
  );

  static final incompleteViewer = viewer.copyWith(
    displayName: '',
    email: '',
    instagramHandle: null,
    profilePhotos: profilePhotos(
      owner: viewerUid,
      seed: 'minimum',
    ).take(2).toList(),
    profilePrompts: const [],
    height: null,
    occupation: null,
    company: null,
    education: null,
    religion: null,
    languages: const [],
    relationshipGoal: null,
    drinking: null,
    smoking: null,
    workout: null,
    diet: null,
    children: null,
    activityPreferences: const ActivityPreferences(),
  );

  static final longContentViewer = viewer.copyWith(
    displayName: 'Neha K. - sunrise conversational pace captain',
    occupation: 'Community-led growth and event partnerships strategist',
    company: 'A very thoughtfully named independent studio',
    profilePrompts: profilePrompts(
      perfectEvent:
          'A small group run where everyone knows the route, nobody sprints the first kilometer, and the table afterward has enough time for real conversation.',
      weekend:
          'I am happiest when Saturday starts outside, detours through a bookshop, and ends with friends arguing over where the best chaat actually is.',
    ),
  );

  static final targetPublicProfile = PublicProfile(
    uid: targetUid,
    name: 'Riya Shah',
    age: 29,
    gender: Gender.woman,
    profilePhotos: profilePhotos(owner: targetUid, seed: 'riya'),
    profilePrompts: profilePrompts(
      perfectEvent:
          'A social run where the host keeps the pace honest and the coffee plan is not optional.',
      weekend:
          'Easy miles, strong playlists, and a table where nobody has to shout over the music.',
    ),
    city: 'Mumbai',
    height: 170,
    occupation: 'Product designer',
    company: 'Northlight',
    education: EducationLevel.bachelors,
    religion: Religion.jain,
    languages: const [Language.english, Language.hindi, Language.gujarati],
    relationshipGoal: RelationshipGoal.relationship,
    drinking: DrinkingHabit.socially,
    smoking: SmokingHabit.never,
    workout: WorkoutFrequency.often,
    diet: DietaryPreference.vegetarian,
    children: ChildrenStatus.wantSomeday,
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(
        paceMinSecsPerKm: 330,
        preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
        runningReasons: [RunReason.mindfulness, RunReason.social],
        preferredRunTimes: [PreferredRunTime.morning],
        version: currentRunPreferencesVersion,
      ),
    ),
  );

  static final ownPublicProfile = publicProfileFromUserProfile(
    viewer,
    today: now,
  );

  static final noPromptPublicProfile = targetPublicProfile.copyWith(
    uid: 'design-profile-no-prompts',
    name: 'Aarav',
    gender: Gender.man,
    profilePrompts: const [],
    profilePhotos: profilePhotos(
      owner: 'design-profile-no-prompts',
      seed: 'aarav',
    ).take(2).toList(),
  );

  static final analyticsReport = UserAnalyticsReport(
    generatedAt: now,
    summaryCards: const [
      UserAnalyticsMetricCard(
        id: 'profileViews',
        label: 'Profile views',
        value: 184,
        unit: UserAnalyticsMetricUnit.count,
        status: UserAnalyticsMetricStatus.ready,
        caption: 'Up 12% from your previous review window.',
      ),
      UserAnalyticsMetricCard(
        id: 'incomingLikes',
        label: 'Caught you',
        value: 38,
        unit: UserAnalyticsMetricUnit.count,
        status: UserAnalyticsMetricStatus.ready,
        caption: 'People who showed interest after an event.',
      ),
      UserAnalyticsMetricCard(
        id: 'mutualCatches',
        label: 'Mutual catches',
        value: 9,
        unit: UserAnalyticsMetricUnit.count,
        status: UserAnalyticsMetricStatus.ready,
      ),
      UserAnalyticsMetricCard(
        id: 'followThroughRate',
        label: 'Follow-through',
        value: 64,
        unit: UserAnalyticsMetricUnit.percent,
        status: UserAnalyticsMetricStatus.partial,
        caption: 'Based on event-linked conversations.',
      ),
    ],
    trend: [
      UserAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 28)),
        periodEnd: now.subtract(const Duration(days: 21)),
        metrics: const {'caughtYou': 6, 'matches': 2},
      ),
      UserAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 21)),
        periodEnd: now.subtract(const Duration(days: 14)),
        metrics: const {'caughtYou': 8, 'matches': 3},
      ),
      UserAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 14)),
        periodEnd: now.subtract(const Duration(days: 7)),
        metrics: const {'caughtYou': 11, 'matches': 2},
      ),
      UserAnalyticsTrendPoint(
        periodStart: now.subtract(const Duration(days: 7)),
        periodEnd: now,
        metrics: const {'caughtYou': 13, 'matches': 4},
      ),
    ],
    connectionSummary: const UserAnalyticsConnectionSummary(
      outgoingLikes: 24,
      incomingLikes: 38,
      privateInterestReceived: 6,
      mutualCatches: 9,
      chatsStarted: 7,
      chatMessagesSent: 42,
      followThroughRate: 64,
      eventsAttended: 5,
    ),
    profileSummary: const UserAnalyticsProfileSummary(
      profileViews: 184,
      uniqueViewers: 121,
      profileDwellSeconds: 47,
      photoImpressions: 392,
      topPhotoId: 'neha-photo-0',
      activeMinutes: 186,
    ),
    coachingTipRefs: const [
      UserAnalyticsCoachingTipRef(
        id: 'prompt-refresh',
        copyKey: 'refresh_prompt',
        priority: 1,
        metricIds: ['profileViews', 'incomingLikes'],
      ),
    ],
    dataQuality: const [
      UserAnalyticsDataQuality(
        id: 'profile_events',
        state: UserAnalyticsDataQualityState.ok,
        detail: 'Recent event activity is available.',
      ),
      UserAnalyticsDataQuality(
        id: 'message_attribution',
        state: UserAnalyticsDataQualityState.partial,
        detail: 'A few older chats are missing event attribution.',
      ),
    ],
  );

  static final emptyAnalyticsReport = analyticsReport.copyWithMissingCards();

  static List<ProfilePromptAnswer> profilePrompts({
    required String perfectEvent,
    required String weekend,
  }) {
    final definitions = profilePromptCatalog;
    final perfectDefinition = profilePromptDefinition(
      profilePromptPerfectEventId,
    );
    final weekendDefinition = definitions.length > 1
        ? definitions[1]
        : perfectDefinition;
    return [
      profilePromptAnswerFor(
        definition: perfectDefinition,
        answer: perfectEvent,
      ),
      profilePromptAnswerFor(definition: weekendDefinition, answer: weekend),
    ];
  }

  static List<ProfilePhoto> profilePhotos({
    required String owner,
    required String seed,
  }) {
    return List<ProfilePhoto>.generate(5, (index) {
      final definition = defaultPhotoPromptForIndex(index);
      final url =
          'https://images.unsplash.com/photo-${_photoSeeds[index]}?w=900&q=80';
      return ProfilePhoto.uploaded(
        position: index,
        url: url,
        storagePath: 'widgetbook/profiles/$owner/$seed-$index.jpg',
        now: now.subtract(Duration(days: 20 - index)),
        prompt: photoPromptAnswerFor(
          photoIndex: index,
          definition: definition,
          caption: switch (index) {
            0 => 'Post-run coffee order.',
            1 => 'Sunday loop by the sea.',
            _ => '',
          },
        ),
      ).copyWith(id: '$seed-photo-$index');
    });
  }

  static NetworkException offlineException({required String action}) {
    return obviousOfflineException(
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: action,
        resource: 'profiles',
      ),
    );
  }

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);

  static const _photoSeeds = [
    '1494790108377-be9c29b29330',
    '1524504388940-b1c1722653e1',
    '1517841905240-472988babdf9',
    '1500648767791-00dcc994a43e',
    '1529626455594-4ff0802cfb7e',
  ];
}

extension on UserAnalyticsReport {
  UserAnalyticsReport copyWithMissingCards() {
    return UserAnalyticsReport(
      generatedAt: generatedAt,
      summaryCards: [
        for (final card in summaryCards)
          UserAnalyticsMetricCard(
            id: card.id,
            label: card.label,
            value: 0,
            unit: card.unit,
            status: UserAnalyticsMetricStatus.missing,
            caption: card.caption,
          ),
      ],
      trend: const [],
      connectionSummary: const UserAnalyticsConnectionSummary(
        outgoingLikes: 0,
        incomingLikes: 0,
        privateInterestReceived: 0,
        mutualCatches: 0,
        chatsStarted: 0,
        chatMessagesSent: 0,
        followThroughRate: 0,
        eventsAttended: 0,
      ),
      profileSummary: const UserAnalyticsProfileSummary(
        profileViews: 0,
        uniqueViewers: 0,
        profileDwellSeconds: 0,
        photoImpressions: 0,
        topPhotoId: null,
        activeMinutes: 0,
      ),
      coachingTipRefs: const [],
      dataQuality: const [
        UserAnalyticsDataQuality(
          id: 'profile_events',
          state: UserAnalyticsDataQualityState.missing,
          detail: 'Attend events to unlock profile insights.',
        ),
      ],
    );
  }
}

class ProfileFixtureUserProfileRepository implements UserProfileRepository {
  const ProfileFixtureUserProfileRepository({required this.profile});

  final UserProfile? profile;

  @override
  Stream<UserProfile?> watchUserProfile({required String? uid}) =>
      Stream<UserProfile?>.value(uid == null ? null : profile);

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      uid == null ? null : profile;

  @override
  Future<void> setUserProfile({required UserProfile userProfile}) async {}

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {}

  @override
  Future<void> updateProfilePhotos({
    required String uid,
    required List<ProfilePhoto> profilePhotos,
  }) async {}

  @override
  Future<void> updateDetectedLocation({
    required String uid,
    required double latitude,
    required double longitude,
    String? city,
  }) async {}

  @override
  Future<void> setProfileComplete({required String uid}) async {}
}

class ProfileFixturePublicProfileRepository implements PublicProfileRepository {
  const ProfileFixturePublicProfileRepository(this.profiles);

  final Map<String, PublicProfile> profiles;

  @override
  Stream<PublicProfile?> watchPublicProfile({required String uid}) =>
      Stream<PublicProfile?>.value(profiles[uid]);

  @override
  Future<PublicProfile?> fetchPublicProfile({required String uid}) async =>
      profiles[uid];

  @override
  Future<List<PublicProfile>> fetchPublicProfiles(List<String> uids) async => [
    for (final uid in uids)
      if (profiles[uid] != null) profiles[uid]!,
  ];
}

class ProfileFixtureSafetyRepository implements SafetyRepository {
  const ProfileFixtureSafetyRepository();

  @override
  Stream<List<BlockedUser>> watchBlockedUsers({required String uid}) =>
      const Stream<List<BlockedUser>>.empty();

  @override
  Future<Set<String>> fetchBlockedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {}

  @override
  Future<void> unblockUser({required String targetUserId}) async {}

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {}

  @override
  Future<void> requestAccountDeletion() async {}
}

class ProfileFixtureUserAnalyticsRepository implements UserAnalyticsRepository {
  const ProfileFixtureUserAnalyticsRepository({required this.report});

  final UserAnalyticsReport report;

  @override
  Future<UserAnalyticsReport> getUserAnalytics(
    UserAnalyticsQuery query,
  ) async => report;
}
