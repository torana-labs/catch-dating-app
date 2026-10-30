import 'dart:async';

import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_check_in_location_service.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_draft_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/profile_location_initializer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/explore/explore.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/cities/city_repository.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/push/fcm_service.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' show User;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderListenable;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../test/events/events_test_helpers.dart' as event_helpers;
import '../../test/onboarding/onboarding_test_helpers.dart'
    as onboarding_helpers;
import '../../test/organizers/organizers_test_helpers.dart'
    as organizer_helpers;
import '../../test/support/empty_event_chat_repository.dart';

const testShellCity = CityData(
  name: 'mumbai',
  label: 'Mumbai',
  latitude: 19.076,
  longitude: 72.8777,
);

const _appShellTestFrame = Duration(milliseconds: 100);
const _mutationPresentationInterval = Duration(milliseconds: 350);

/// Pumps the installable app root. Host journeys pass the Host entrypoint's
/// [hostGoRouterProvider]; consumer journeys keep the role-selected default.
Future<void> pumpCatchAppShell(
  WidgetTester tester, {
  String initialRoute = '/',
  required List<Object> overrides,
  ProviderListenable<GoRouter>? routerProvider,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        initialAppLocationProvider.overrideWithValue(initialRoute),
        ...overrides.cast(),
      ],
      child: MyApp(routerProvider: routerProvider ?? goRouterProvider),
    ),
  );
  await pumpAppShellFrames(tester);
}

/// Route transitions in app-shell integration tests should use this named
/// helper instead of raw settle calls so transition timing stays centralized.
Future<void> pumpRoute(WidgetTester tester) => pumpAppShellFrames(tester);

Future<void> pumpAppShellFrames(WidgetTester tester, {int frames = 8}) async {
  for (var i = 0; i < frames; i += 1) {
    await tester.pump(_appShellTestFrame);
  }
}

/// Advances fake clocks and provider microtasks without draining the process
/// event queue, which can remain live for the lifetime of the mounted app.
Future<void> flushAppShellCallbacks(
  WidgetTester tester, {
  int frames = 4,
}) async {
  for (var i = 0; i < frames; i += 1) {
    await tester.pump(_appShellTestFrame);
  }
}

Future<void> pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  int frames = 40,
}) async {
  for (var i = 0; i < frames; i += 1) {
    if (finder.evaluate().isNotEmpty) return;
    await tester.pump(_appShellTestFrame);
  }
  throw TestFailure(
    'Expected $finder to appear within $frames app-shell frames.',
  );
}

Future<void> pumpMutationUi(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(_mutationPresentationInterval);
  await tester.pump();
}

Future<void> pumpSheet(WidgetTester tester) => pumpAppShellFrames(tester);

Future<void> openOrganizerDetail(
  WidgetTester tester,
  Organizer organizer,
) async {
  if (await _tapVisibleOrganizerCard(tester, organizer)) return;

  final router = _routerFor(tester);
  unawaited(
    router.pushNamed(
      Routes.organizerDetailScreen.name,
      pathParameters: {'clubId': organizer.id},
      extra: organizer,
    ),
  );
  await pumpRoute(tester);
}

Future<void> openEventDetail(
  WidgetTester tester, {
  required Organizer organizer,
  required Event event,
  bool settle = true,
}) async {
  final router = _routerFor(tester);
  unawaited(
    router.pushNamed(
      Routes.eventDetailScreen.name,
      pathParameters: {'clubId': organizer.id, 'eventId': event.id},
      extra: event,
    ),
  );
  if (settle) {
    await pumpRoute(tester);
  } else {
    await pumpMutationUi(tester);
  }
}

Future<void> openSwipeDeck(WidgetTester tester, Event event) async {
  final router = _routerFor(tester);
  unawaited(
    router.pushNamed(
      Routes.swipeEventScreen.name,
      pathParameters: {'eventId': event.id},
    ),
  );
  await pumpRoute(tester);
}

GoRouter _routerFor(WidgetTester tester) {
  final shell = find.byType(AppShell);
  if (shell.evaluate().isNotEmpty) {
    return GoRouter.of(tester.element(shell));
  }

  // App-shell child routes are presented on the root navigator, so the shell
  // itself is intentionally absent while one is visible. The navigator still
  // inherits the same GoRouter and is the stable routing context in both
  // states.
  final navigator = find.byType(Navigator);
  expect(navigator, findsWidgets);
  return GoRouter.of(tester.element(navigator.first));
}

Future<void> openAppTab(WidgetTester tester, String label) async {
  final destination = find.descendant(
    of: find.byKey(AppShellKeys.navigationBar),
    matching: find.bySemanticsLabel(label),
  );
  expect(
    destination,
    findsOneWidget,
    reason: 'The app-shell navigation must expose $label.',
  );
  await tester.tap(destination);
  await pumpRoute(tester);
}

/// Canonical fake app backend for app-shell integration tests.
///
/// New providers required to boot [MyApp] should get a deterministic fake or
/// no-op default here so provider additions fail in this support file instead
/// of in every feature-flow test.
List<Object> appShellTestOverrides({
  required String? uid,
  required UserProfile? user,
  List<Organizer> organizers = const [],
  Set<String> joinedOrganizerIds = const {},
  List<Event> signedUpEvents = const [],
  List<Event> attendedEvents = const [],
  List<Event> recommendedEvents = const [],
  Map<String, List<Event>> organizerEvents = const {},
  Map<String, List<EventParticipation>> eventParticipations = const {},
  List<EventViewerState> eventViewerStates = const [],
  Map<String, List<Review>> organizerReviews = const {},
  Map<String, List<Review>> eventReviews = const {},
  List<Review> reviewsByUser = const [],
  List<PublicProfile> swipeCandidates = const [],
  List<Match> matches = const [],
  List<PublicProfile> publicProfiles = const [],
  ConversationRepository? conversationRepository,
  PaymentRepository? paymentRepository,
  EventRepository? eventRepository,
  OrganizersRepository? organizersRepository,
  AuthRepository? authRepository,
  SafetyRepository? safetyRepository,
  UserProfileRepository? userProfileRepository,
  ReviewsRepository? reviewsRepository,
  SwipeRepository? swipeRepository,
  ImageUploadRepository? imageUploadRepository,
  AppAnalytics? analytics,
  ErrorLogger? errorLogger,
  FcmService? fcmService,
  bool initializeFcm = false,
}) {
  final joinedOrganizers = organizers
      .where((organizer) => joinedOrganizerIds.contains(organizer.id))
      .toList(growable: false);
  final knownEventsById = <String, Event>{
    for (final event in signedUpEvents) event.id: event,
    for (final event in attendedEvents) event.id: event,
    for (final event in recommendedEvents) event.id: event,
    for (final event in organizerEvents.values.expand((events) => events))
      event.id: event,
  };
  final organizersById = {
    for (final organizer in organizers) organizer.id: organizer,
  };
  final knownOrganizerIds = knownEventsById.values
      .map((event) => event.clubId)
      .toSet();
  final resolvedOrganizersRepository =
      organizersRepository ??
      (organizer_helpers.FakeOrganizersRepository()
        ..organizersById.addAll(organizersById)
        ..organizersByLocation[testShellCity.name] = organizers);
  final participationsByEventId = <String, EventParticipation>{
    if (uid != null)
      for (final event in signedUpEvents)
        event.id: event_helpers.buildEventParticipation(event: event, uid: uid),
    if (uid != null)
      for (final event in attendedEvents)
        event.id: event_helpers.buildEventParticipation(
          event: event,
          uid: uid,
          status: EventParticipationStatus.attended,
        ),
  };
  final participationsForEvent = <String, List<EventParticipation>>{
    for (final entry in eventParticipations.entries)
      entry.key: entry.value.toList(),
  };
  for (final entry in participationsByEventId.entries) {
    final list = participationsForEvent.putIfAbsent(
      entry.key,
      () => <EventParticipation>[],
    );
    if (!list.any((participation) => participation.uid == entry.value.uid)) {
      list.add(entry.value);
    }
  }
  final participationRepository =
      event_helpers.FakeEventParticipationRepository()
        ..eventParticipations.addAll(participationsForEvent)
        ..userParticipations.addAll({
          ?uid: participationsByEventId.values.toList(),
        });

  return [
    // Canonical observations are explicit test inputs, independent of local
    // membership, participation and capacity fixtures. Missing reads fail closed.
    if (uid != null)
      for (final viewer in eventViewerStates)
        eventViewerStateProvider(
          viewer.eventId,
          uid,
        ).overrideWithValue(AsyncData(viewer)),
    forceUpdateRequiredProvider.overrideWithValue(const AsyncData(false)),
    forceUpdateRefreshProvider.overrideWithValue(
      (ref, {required invalidatePackageInfo, shouldInvalidate}) async {},
    ),
    profileLocationInitializerProvider.overrideWith(
      _NoopProfileLocationInitializer.new,
    ),
    appAnalyticsProvider.overrideWithValue(
      analytics ??
          AppAnalytics(
            reporter: const NoopAnalyticsReporter(),
            shouldCollect: false,
          ),
    ),
    errorLoggerProvider.overrideWithValue(errorLogger ?? ErrorLogger.silent()),
    appConnectivityProvider.overrideWith(
      (ref) => Stream.value(const [ConnectivityResult.wifi]),
    ),
    deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
    cityListProvider.overrideWith((ref) async => const [testShellCity]),
    onboardingDraftRepositoryProvider.overrideWithValue(
      onboarding_helpers.FakeOnboardingDraftRepository(),
    ),
    authRepositoryProvider.overrideWithValue(
      authRepository ??
          FakeShellAuthRepository(uid: uid, phoneNumber: user?.phoneNumber),
    ),
    userProfileRepositoryProvider.overrideWithValue(
      userProfileRepository ?? FakeShellUserProfileRepository(user: user),
    ),
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith((ref) => Stream.value(user)),
    // Organizer pages show signed-in guests the organizer's membership plans.
    watchPublishedHostMembershipPlansProvider.overrideWith(
      (ref, _) => Stream.value(const []),
    ),
    watchMyHostMembershipsProvider.overrideWith(
      (ref, _) => Stream.value(const []),
    ),
    watchMyHostMembershipBenefitUsesProvider.overrideWith(
      (ref, _) => Stream.value(const []),
    ),
    watchOrganizersByLocationProvider(
      testShellCity.name,
    ).overrideWith((ref) => Stream.value(organizers)),
    reviewsRepositoryProvider.overrideWithValue(
      reviewsRepository ??
          FakeShellReviewsRepository(
            organizerReviews: organizerReviews,
            eventReviews: eventReviews,
            reviewsByUser: reviewsByUser,
          ),
    ),
    organizersRepositoryProvider.overrideWithValue(
      resolvedOrganizersRepository,
    ),
    organizerDraftRepositoryProvider.overrideWithValue(
      FakeShellOrganizerDraftRepository(),
    ),
    swipeCandidateRepositoryProvider.overrideWithValue(
      FakeShellSwipeCandidateRepository(candidates: swipeCandidates),
    ),
    swipeRepositoryProvider.overrideWithValue(
      swipeRepository ?? FakeShellSwipeRepository(),
    ),
    safetyRepositoryProvider.overrideWithValue(
      safetyRepository ?? FakeShellSafetyRepository(),
    ),
    publicProfileRepositoryProvider.overrideWithValue(
      FakeShellPublicProfileRepository(publicProfiles),
    ),
    eventDiscoveryRepositoryProvider.overrideWithValue(
      FakeShellEventDiscoveryRepository(knownEventsById.values.toList()),
    ),
    eventSuccessRepositoryProvider.overrideWithValue(
      EventSuccessRepository(FakeFirebaseFirestore()),
    ),
    if (imageUploadRepository != null)
      imageUploadRepositoryProvider.overrideWithValue(imageUploadRepository),
    fcmServiceProvider.overrideWithValue(
      initializeFcm && fcmService != null
          ? fcmService
          : UnsupportedTestFcmService(),
    ),
    for (final organizer in organizers) ...[
      watchOrganizerProvider(
        organizer.id,
      ).overrideWith((ref) => Stream.value(organizer)),
      watchEventsForOrganizerProvider(organizer.id).overrideWithValue(
        AsyncData<List<Event>>(organizerEvents[organizer.id] ?? const []),
      ),
      watchReviewsForOrganizerProvider(organizer.id).overrideWithValue(
        AsyncData<List<Review>>(organizerReviews[organizer.id] ?? const []),
      ),
      if (uid != null)
        watchOrganizerMembershipProvider(organizer.id, uid).overrideWith(
          (ref) => Stream.value(
            joinedOrganizerIds.contains(organizer.id)
                ? OrganizerMembership(
                    id: organizerMembershipId(clubId: organizer.id, uid: uid),
                    clubId: organizer.id,
                    uid: uid,
                    role: OrganizerMembershipRole.member,
                    status: OrganizerMembershipStatus.active,
                    joinedAt: DateTime(2026),
                  )
                : null,
          ),
        ),
    ],
    for (final clubId in knownOrganizerIds)
      fetchOrganizerProvider(
        clubId,
      ).overrideWith((ref) async => _organizerById(organizers, clubId)),
    for (final event in knownEventsById.values) ...[
      watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
      watchReviewsForEventProvider(event.id).overrideWithValue(
        AsyncData<List<Review>>(eventReviews[event.id] ?? const []),
      ),
      watchEventParticipationsForEventProvider(event.id).overrideWithValue(
        AsyncData<List<EventParticipation>>(
          eventParticipations[event.id] ?? const [],
        ),
      ),
      if (uid != null) ...[
        watchSavedEventProvider(
          uid,
          event.id,
        ).overrideWithValue(const AsyncData(null)),
        watchEventParticipationProvider(
          event.id,
          uid,
        ).overrideWithValue(AsyncData(participationsByEventId[event.id])),
      ],
    ],
    exploreOrganizersViewModelProvider.overrideWithValue(
      AsyncData(
        ExploreViewModel(
          joinedOrganizers: joinedOrganizers,
          allOrganizers: organizers,
          joinedOrganizerIds: joinedOrganizerIds,
        ),
      ),
    ),
    exploreSourceOrganizersProvider.overrideWithValue(
      AsyncData<List<Organizer>>(organizers),
    ),
    exploreFeedViewModelProvider.overrideWithValue(
      const AsyncData(ExploreFeedViewModel(items: [])),
    ),
    exploreRecommendationsProvider.overrideWithValue(const AsyncData([])),
    filteredExploreOrganizersProvider.overrideWithValue(
      AsyncData<List<Organizer>>(organizers),
    ),
    eventRepositoryProvider.overrideWithValue(
      eventRepository ?? event_helpers.FakeEventRepository(),
    ),
    eventParticipationRepositoryProvider.overrideWithValue(
      participationRepository,
    ),
    eventDraftRepositoryProvider.overrideWithValue(
      FakeShellEventDraftRepository(),
    ),
    paymentRepositoryProvider.overrideWithValue(
      paymentRepository ?? event_helpers.FakePaymentRepository(),
    ),
    celebrationEffectsControllerProvider.overrideWithValue(
      _NoopCelebrationEffectsController(),
    ),
    eventCheckInLocationServiceProvider.overrideWithValue(
      const _FakeEventCheckInLocationService(),
    ),
    if (uid != null) ...[
      watchSignedUpEventsProvider(
        uid,
      ).overrideWithValue(AsyncData<List<Event>>(signedUpEvents)),
      watchAttendedEventsProvider(
        uid,
      ).overrideWithValue(AsyncData<List<Event>>(attendedEvents)),
      watchActivityNotificationsProvider(
        uid,
      ).overrideWithValue(const AsyncData([])),
      watchEventParticipationsForUserProvider(uid).overrideWith(
        (ref) => Stream.value(participationsByEventId.values.toList()),
      ),
      watchSavedEventsForUserProvider(
        uid,
      ).overrideWith((ref) => Stream.value(const [])),
      watchPaymentsForUserProvider(
        uid,
      ).overrideWith((ref) => Stream.value(const [])),
      watchReviewsByUserProvider(
        uid,
      ).overrideWith((ref) => Stream.value(reviewsByUser)),
      watchActiveOrganizerMembershipsForUserProvider(uid).overrideWith(
        (ref) => Stream.value([
          for (final clubId in joinedOrganizerIds)
            OrganizerMembership(
              id: organizerMembershipId(clubId: clubId, uid: uid),
              clubId: clubId,
              uid: uid,
              role: OrganizerMembershipRole.member,
              status: OrganizerMembershipStatus.active,
              joinedAt: DateTime(2026),
            ),
        ]),
      ),
      watchOrganizersHostedByProvider(uid).overrideWithValue(
        AsyncData<List<Organizer>>(
          organizers
              .where((organizer) => organizer.hostUserId == uid)
              .toList(growable: false),
        ),
      ),
      watchMatchesForUserProvider(
        uid,
      ).overrideWith((ref) => Stream.value(matches)),
      totalUnreadCountProvider(uid).overrideWithValue(0),
      eventChatRepositoryProvider.overrideWithValue(EmptyEventChatRepository()),
      conversationRepositoryProvider.overrideWithValue(
        conversationRepository ?? FakeShellConversationRepository(),
      ),
      for (final match in matches) ...[
        matchStreamProvider(
          match.id,
        ).overrideWith((ref) => Stream.value(match)),
        watchConversationMessagesProvider(
          match.id,
        ).overrideWith((ref) => Stream.value(const <ChatMessage>[])),
      ],
      for (final profile in publicProfiles)
        watchPublicProfileProvider(
          profile.uid,
        ).overrideWith((ref) => Stream.value(profile)),
      if (matches.isEmpty)
        chatsListViewModelProvider.overrideWithValue(
          const AsyncData(
            ChatsListViewModel(
              newMatches: [],
              conversations: [],
              totalThreadCount: 0,
            ),
          ),
        ),
    ],
  ];
}

Future<bool> _tapVisibleOrganizerCard(
  WidgetTester tester,
  Organizer organizer,
) async {
  final candidates = [
    find.byKey(ValueKey<String>('explore-organizer-${organizer.id}')),
    find.byKey(ValueKey<String>('explore-club-row-${organizer.id}')),
    find.byKey(ValueKey<String>('club-directory-${organizer.id}')),
  ];
  for (final candidate in candidates) {
    final visibleCandidate = candidate.hitTestable();
    if (visibleCandidate.evaluate().isEmpty) continue;
    expect(visibleCandidate, findsOneWidget);
    await tester.tap(visibleCandidate);
    return true;
  }

  return false;
}

Organizer? _organizerById(List<Organizer> organizers, String id) {
  for (final organizer in organizers) {
    if (organizer.id == id) return organizer;
  }
  return null;
}

class _NoopProfileLocationInitializer extends ProfileLocationInitializer {
  @override
  Future<void> build() async {}
}

class _NoDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async => null;
}

class _FakeEventCheckInLocationService implements EventCheckInLocationService {
  const _FakeEventCheckInLocationService();

  @override
  Future<EventCheckInLocation> getCurrentLocation() async {
    return const EventCheckInLocation(latitude: 19.07, longitude: 72.87);
  }
}

class FakeShellEventDiscoveryRepository implements EventDiscoveryRepository {
  const FakeShellEventDiscoveryRepository(this.events);

  final List<Event> events;

  @override
  Future<List<Event>> fetchDiscoverableEvents(EventDiscoveryQuery query) async {
    return [
      for (final event in events)
        if (!event.startTime.isBefore(query.startAt) &&
            (query.endBefore == null ||
                event.startTime.isBefore(query.endBefore!)))
          event,
    ];
  }

  @override
  Future<CursorPage<Event, DocumentSnapshot<Event>>>
  fetchDiscoverableEventsPage(
    EventDiscoveryQuery query, {
    DocumentSnapshot<Event>? startAfter,
  }) async =>
      CursorPage(items: await fetchDiscoverableEvents(query), hasMore: false);
}

class RecordingFcmService extends FcmService {
  RecordingFcmService() : super(FakeFirebaseFirestore(), ErrorLogger.silent());

  final initializedUids = <String>[];

  @override
  bool get isSupportedPlatform => true;

  @override
  Future<void> initialize({
    required String uid,
    required GoRouter router,
    void Function(RemoteMessage message)? onForegroundMessage,
  }) async {
    initializedUids.add(uid);
  }

  @override
  Future<void> unregisterCurrentInstallation() async {}
}

class UnsupportedTestFcmService extends FcmService {
  UnsupportedTestFcmService()
    : super(FakeFirebaseFirestore(), ErrorLogger.silent());

  @override
  bool get isSupportedPlatform => false;
}

class RecordingCrashReporter implements CrashReporter {
  final customKeys = <String, Object>{};
  final recordedErrors = <Object>[];
  bool? collectionEnabled;

  @override
  Future<void> setCollectionEnabled(bool enabled) async {
    collectionEnabled = enabled;
  }

  @override
  Future<void> setCustomKey(String key, Object value) async {
    customKeys[key] = value;
  }

  @override
  Future<void> recordError(
    Object error,
    StackTrace stackTrace, {
    bool fatal = false,
    String? reason,
  }) async {
    recordedErrors.add(error);
  }

  @override
  Future<void> recordFlutterError(
    FlutterErrorDetails details, {
    bool fatal = false,
  }) async {
    recordedErrors.add(details.exception);
  }
}

class RecordingAnalyticsReporter implements AnalyticsReporter {
  final screenViews = <String>[];
  final events = <String>[];
  bool? collectionEnabled;
  String? userId;

  @override
  Future<void> setCollectionEnabled(bool enabled) async {
    collectionEnabled = enabled;
  }

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add(name);
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    screenViews.add(screenName);
  }

  @override
  Future<void> setUserId(String? userId) async {
    this.userId = userId;
  }
}

class NoopAnalyticsReporter implements AnalyticsReporter {
  const NoopAnalyticsReporter();

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {}

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}

class FakeShellAuthRepository implements AuthRepository {
  FakeShellAuthRepository({String? uid, String? phoneNumber})
    : currentUserValue = uid == null
          ? null
          : onboarding_helpers.TestUser(uid: uid, phoneNumber: phoneNumber);

  final User? currentUserValue;
  int signOutCallCount = 0;

  @override
  User? get currentUser => currentUserValue;

  @override
  Stream<User?> authStateChanges() => Stream.value(currentUserValue);

  @override
  Future<void> signOut() async {
    signOutCallCount += 1;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellUserProfileRepository implements UserProfileRepository {
  FakeShellUserProfileRepository({this.user});

  final UserProfile? user;
  String? updatedUid;
  Map<String, dynamic>? updatedFields;

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async {
    return user?.uid == uid ? user : null;
  }

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    updatedUid = uid;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellReviewsRepository implements ReviewsRepository {
  FakeShellReviewsRepository({
    this.organizerReviews = const {},
    this.eventReviews = const {},
    this.reviewsByUser = const [],
  });

  final Map<String, List<Review>> organizerReviews;
  final Map<String, List<Review>> eventReviews;
  final List<Review> reviewsByUser;
  Review? addedReview;
  Review? updatedReview;
  String? deletedReviewId;

  @override
  Stream<List<Review>> watchReviewsForOrganizer(String clubId) {
    return Stream.value(organizerReviews[clubId] ?? const []);
  }

  @override
  Stream<List<Review>> watchReviewsForEvent(String eventId) {
    return Stream.value(eventReviews[eventId] ?? const []);
  }

  @override
  Stream<List<Review>> watchReviewsByUser(String reviewerUserId) {
    return Stream.value(reviewsByUser);
  }

  @override
  Stream<Review?> watchUserReviewForEvent({
    required String eventId,
    required String reviewerUserId,
  }) {
    for (final review in eventReviews[eventId] ?? const <Review>[]) {
      if (review.reviewerUserId == reviewerUserId) {
        return Stream.value(review);
      }
    }
    return Stream.value(null);
  }

  @override
  Future<void> addReview(Review review) async {
    addedReview = review;
  }

  @override
  Future<void> updateReview(Review review) async {
    updatedReview = review;
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    deletedReviewId = reviewId;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellPublicProfileRepository implements PublicProfileRepository {
  const FakeShellPublicProfileRepository(this.profiles);

  final List<PublicProfile> profiles;

  @override
  Future<List<PublicProfile>> fetchPublicProfiles(List<String> uids) async {
    final requested = uids.toSet();
    return profiles
        .where((profile) => requested.contains(profile.uid))
        .toList(growable: false);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellEventDraftRepository implements EventDraftRepository {
  @override
  Future<List<EventDraft>> loadDrafts({
    required String clubId,
    required String userId,
  }) async {
    return const [];
  }

  @override
  Future<void> saveDraft({
    required String userId,
    required EventDraft draft,
  }) async {}

  @override
  Future<void> deleteDraft({
    required String clubId,
    required String userId,
    required String draftId,
  }) async {}

  @override
  Future<void> deleteAllDrafts({
    required String clubId,
    required String userId,
  }) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellOrganizerDraftRepository implements OrganizerDraftRepository {
  @override
  Future<OrganizerDraft?> loadDraft({required String userId}) async => null;

  @override
  Future<void> saveDraft({
    required String userId,
    required OrganizerDraft draft,
  }) async {}

  @override
  Future<void> deleteDraft({required String userId}) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _NoopCelebrationEffectsController extends CelebrationEffectsController {
  _NoopCelebrationEffectsController();

  @override
  Future<void> play(CelebrationMomentKind kind) async {}
}

class FakeShellConversationRepository implements ConversationRepository {
  final List<(String conversationId, String uid)> markReadCalls = [];
  final List<SentTextMessage> sentTextMessages = [];

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      Stream.value(const []);

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      'message-1';

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {
    sentTextMessages.add(
      SentTextMessage(
        conversationId: conversationId,
        senderId: senderId,
        text: text,
      ),
    );
  }

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {}

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {
    markReadCalls.add((conversationId, uid));
  }
}

class FakeShellSwipeCandidateRepository implements SwipeCandidateRepository {
  const FakeShellSwipeCandidateRepository({this.candidates = const []});

  final List<PublicProfile> candidates;

  @override
  Future<List<PublicProfile>> fetchCandidates({required String eventId}) async {
    return candidates;
  }
}

class FakeShellSwipeRepository implements SwipeRepository {
  final List<Swipe> recordedSwipes = [];

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    recordedSwipes.add(swipe);
  }

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async {
    return recordedSwipes
        .where((swipe) => swipe.swiperId == uid)
        .map((swipe) => swipe.targetId)
        .toSet();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShellSafetyRepository implements SafetyRepository {
  FakeShellSafetyRepository({this.blockedUsers = const []});

  final List<BlockedUser> blockedUsers;
  String? blockedUserId;
  String? blockSource;
  String? unblockedUserId;
  String? reportedUserId;
  String? reportSource;
  String? reportContextId;
  String? reportReasonCode;
  int requestDeletionCallCount = 0;

  @override
  Stream<List<BlockedUser>> watchBlockedUsers({required String uid}) {
    return Stream.value(blockedUsers);
  }

  @override
  Future<Set<String>> fetchBlockedUserIds({required String uid}) async {
    return const {};
  }

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {
    blockedUserId = targetUserId;
    blockSource = source;
  }

  @override
  Future<void> unblockUser({required String targetUserId}) async {
    unblockedUserId = targetUserId;
  }

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {
    reportedUserId = targetUserId;
    reportSource = source;
    reportContextId = contextId;
    reportReasonCode = reasonCode;
  }

  @override
  Future<void> requestAccountDeletion() async {
    requestDeletionCallCount += 1;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class SentTextMessage {
  const SentTextMessage({
    required this.conversationId,
    required this.senderId,
    required this.text,
  });

  final String conversationId;
  final String senderId;
  final String text;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SentTextMessage &&
          runtimeType == other.runtimeType &&
          conversationId == other.conversationId &&
          senderId == other.senderId &&
          text == other.text;

  @override
  int get hashCode => Object.hash(conversationId, senderId, text);
}
