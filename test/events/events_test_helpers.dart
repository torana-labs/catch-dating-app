import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/discovery/domain/saved_event.dart'
    as saved_domain;
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Event buildEvent({
  String id = 'event-1',
  bool synthetic = false,
  String? seedPrefix,
  String clubId = 'club-1',
  String name = '',
  DateTime? startTime,
  DateTime? endTime,
  String meetingPoint = 'Carter Road',
  EventMeetingLocation? meetingLocation,
  double startingPointLat = 19.0608,
  double startingPointLng = 72.8365,
  String? locationDetails,
  List<EventItineraryItem> itinerary = const [],
  String? photoUrl,
  EventFormatSnapshot eventFormat = const EventFormatSnapshot.socialRun(),
  double distanceKm = 5,
  PaceLevel pace = PaceLevel.easy,
  int capacityLimit = 20,
  String description = 'Easy paced seaside event.',
  int priceInPaise = 0,
  String currency = defaultCurrencyCode,
  int? bookedCount,
  int? checkedInCount,
  int? waitlistedCount,
  bool crossPathsDiscoveryEnabled = false,
  EventLifecycleStatus status = EventLifecycleStatus.active,
  EventConstraints constraints = const EventConstraints(),
  EventPolicyBundle? eventPolicy,
  Map<String, int> genderCounts = const {},
  Map<String, int> cohortCounts = const {},
  Map<String, int> waitlistedCohortCounts = const {},
}) {
  final start = startTime ?? DateTime.now().add(const Duration(hours: 2));
  final resolvedLocation =
      meetingLocation?.normalized() ??
      EventMeetingLocation(
        name: meetingPoint,
        latitude: startingPointLat,
        longitude: startingPointLng,
        notes: locationDetails,
      );
  return Event(
    id: id,
    synthetic: synthetic,
    seedPrefix: seedPrefix,
    clubId: clubId,
    name: name,
    startTime: start,
    endTime: endTime ?? start.add(const Duration(hours: 1)),
    meetingPoint: resolvedLocation.name,
    meetingLocation: resolvedLocation,
    startingPointLat: resolvedLocation.latitude,
    startingPointLng: resolvedLocation.longitude,
    locationDetails: resolvedLocation.notes,
    itinerary: itinerary,
    photoUrl: photoUrl,
    eventFormat: eventFormat,
    distanceKm: distanceKm,
    pace: pace,
    capacityLimit: capacityLimit,
    description: description,
    priceInPaise: priceInPaise,
    crossPathsDiscoveryEnabled: crossPathsDiscoveryEnabled,
    currency: currency,
    bookedCount: bookedCount,
    checkedInCount: checkedInCount,
    waitlistedCount: waitlistedCount,
    status: status,
    constraints: constraints,
    eventPolicy: eventPolicy,
    genderCounts: genderCounts,
    cohortCounts: cohortCounts,
    waitlistedCohortCounts: waitlistedCohortCounts,
  );
}

EventParticipation buildEventParticipation({
  required Event event,
  required String uid,
  EventParticipationStatus status = EventParticipationStatus.signedUp,
  DateTime? createdAt,
  Gender? genderAtSignup,
  String? cohortAtSignup,
  EventJoinRequestStatus? hostApprovalStatus,
  EventWaitlistOfferStatus? waitlistOfferStatus,
  DateTime? waitlistOfferedAt,
  DateTime? waitlistOfferExpiresAt,
  DateTime? waitlistOfferAcceptedAt,
  String? waitlistOfferId,
  String? paymentId,
  String? inviteLinkId,
  String? inviteSource,
  DateTime? inviteCapturedAt,
}) {
  final timestamp = createdAt ?? DateTime(2026, 5, 6, 7);
  return EventParticipation(
    id: eventParticipationId(eventId: event.id, uid: uid),
    eventId: event.id,
    clubId: event.clubId,
    uid: uid,
    status: status,
    createdAt: timestamp,
    updatedAt: timestamp,
    signedUpAt:
        status == EventParticipationStatus.signedUp ||
            status == EventParticipationStatus.attended
        ? timestamp
        : null,
    attendedAt: status == EventParticipationStatus.attended ? timestamp : null,
    waitlistedAt: status == EventParticipationStatus.waitlisted
        ? timestamp
        : null,
    cancelledAt: status == EventParticipationStatus.cancelled
        ? timestamp
        : null,
    deletedAt: status == EventParticipationStatus.deleted ? timestamp : null,
    genderAtSignup: genderAtSignup,
    cohortAtSignup: cohortAtSignup,
    paymentId: paymentId,
    hostApprovalStatus: hostApprovalStatus,
    waitlistOfferStatus: waitlistOfferStatus,
    waitlistOfferedAt: waitlistOfferedAt,
    waitlistOfferExpiresAt: waitlistOfferExpiresAt,
    waitlistOfferAcceptedAt: waitlistOfferAcceptedAt,
    waitlistOfferId: waitlistOfferId,
    inviteLinkId: inviteLinkId,
    inviteSource: inviteSource,
    inviteCapturedAt: inviteCapturedAt,
  );
}

UserProfile buildUser({
  String uid = 'runner-1',
  String name = 'Runner',
  String? firstName,
  String? lastName,
  String displayName = '',
  String email = 'runner@example.com',
  String bio = 'Here for the event.',
  List<ProfilePromptAnswer>? profilePrompts,
  Gender gender = Gender.man,
  List<Gender> interestedInGenders = const [Gender.woman],
  DateTime? dateOfBirth,
  String phoneNumber = '+910000000000',
  List<String> photoUrls = const [],
  int runPreferencesVersion = currentRunPreferencesVersion,
}) {
  final nameParts = name.trim().split(RegExp(r'\s+'));
  return UserProfile(
    uid: uid,
    email: email,
    name: name,
    firstName: firstName ?? nameParts.first,
    lastName:
        lastName ?? (nameParts.length > 1 ? nameParts.skip(1).join(' ') : ''),
    displayName: displayName,
    dateOfBirth: dateOfBirth ?? DateTime(1995, 6, 15),
    profilePrompts:
        profilePrompts ??
        normalizeProfilePromptAnswers(const [], legacyBio: bio),
    gender: gender,
    phoneNumber: phoneNumber,
    profileComplete: true,
    interestedInGenders: interestedInGenders,
    profilePhotos: _profilePhotosFromUrls(uid: uid, photoUrls: photoUrls),
    activityPreferences: _activityPreferences(version: runPreferencesVersion),
  );
}

Review buildReview({
  String id = 'review-1',
  String clubId = 'club-1',
  String? eventId = 'event-1',
  String reviewerUserId = 'runner-1',
  String reviewerName = 'Runner 1',
  int rating = 5,
  String comment = 'Loved it.',
  ReviewOwnerResponse? ownerResponse,
  DateTime? createdAt,
}) {
  return Review(
    id: id,
    organizerId: clubId,
    eventId: eventId,
    reviewerUserId: reviewerUserId,
    reviewerName: reviewerName,
    rating: rating,
    comment: comment,
    ownerResponse: ownerResponse,
    createdAt: createdAt ?? DateTime(2025, 1, 2),
  );
}

Club buildClub({
  String id = 'club-1',
  String name = 'Stride Social',
  String description = 'Morning runners who like easy city loops.',
  String location = 'mumbai',
  String area = 'Bandra',
  String hostUserId = 'host-1',
  String hostName = 'Host',
  DateTime? createdAt,
}) {
  return Club(
    id: id,
    name: name,
    description: description,
    location: location,
    area: area,
    hostUserId: hostUserId,
    hostName: hostName,
    createdAt: createdAt ?? DateTime(2025),
    memberCount: 1,
    appVisibility: ClubAppVisibility.discoverable,
  );
}

PublicProfile buildPublicProfile({
  String uid = 'runner-1',
  String name = 'Runner',
  int age = 30,
  String bio = 'Always up for a sunrise event.',
  List<ProfilePromptAnswer>? profilePrompts,
  Gender gender = Gender.man,
  List<String> photoUrls = const [],
  List<String> photoThumbnailUrls = const [],
  int runPreferencesVersion = currentRunPreferencesVersion,
}) {
  return PublicProfile(
    uid: uid,
    name: name,
    age: age,
    profilePrompts:
        profilePrompts ??
        normalizeProfilePromptAnswers(const [], legacyBio: bio),
    gender: gender,
    profilePhotos: _profilePhotosFromUrls(
      uid: uid,
      photoUrls: photoUrls,
      photoThumbnailUrls: photoThumbnailUrls,
    ),
    activityPreferences: _activityPreferences(version: runPreferencesVersion),
  );
}

ActivityPreferences _activityPreferences({required int version}) {
  return ActivityPreferences(running: RunningPreferences(version: version));
}

List<ProfilePhoto> _profilePhotosFromUrls({
  required String uid,
  required List<String> photoUrls,
  List<String> photoThumbnailUrls = const [],
}) {
  return [
    for (final indexed in photoUrls.indexed)
      ProfilePhoto.uploaded(
        position: indexed.$1,
        url: indexed.$2,
        storagePath: 'test-profiles/$uid/${indexed.$1}.jpg',
        now: DateTime(2026),
      ).copyWith(
        thumbnailUrl: indexed.$1 < photoThumbnailUrls.length
            ? photoThumbnailUrls[indexed.$1]
            : indexed.$2,
      ),
  ];
}

Future<void> pumpEventsTestApp(
  WidgetTester tester,
  Widget child, {
  Iterable overrides = const [],
  String? signedInUid = 'runner-1',
  CommandJournalStorage? recoveryStorage,
  EventViewerState? viewerState,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        commandJournalStorageProvider.overrideWith((ref) {
          final storage = recoveryStorage ?? MemoryCommandJournalStorage();
          return () async => storage;
        }),
        if (signedInUid != null)
          uidProvider.overrideWith((ref) => Stream.value(signedInUid)),
        if (viewerState != null && signedInUid != null)
          eventViewerStateProvider(
            viewerState.eventId,
            signedInUid,
          ).overrideWithValue(AsyncData(viewerState)),
        ...overrides,
      ],
      child: _EventTestProviderPrimer(
        primeUid: signedInUid != null,
        child: MaterialApp(
          theme: AppTheme.light,
          builder: (context, appChild) =>
              CatchNoticeOverlay(child: appChild ?? const SizedBox.shrink()),
          home: child,
        ),
      ),
    ),
  );
  await tester.pump();
}

class _EventTestProviderPrimer extends ConsumerWidget {
  const _EventTestProviderPrimer({required this.primeUid, required this.child});

  final bool primeUid;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (primeUid) {
      ref.watch(uidProvider);
    }
    return child;
  }
}

class FakeEventRepository extends Fake implements EventRepository {
  String generatedId = 'generated-event-id';
  String generatedBroadcastRequestId = 'generated-broadcast-request-id';
  Event? createdEvent;
  int createEventCallCount = 0;
  final mediaRequests =
      <({Event event, String requestId, String expectedMediaHash})>[];
  bool loseMediaAcknowledgement = false;
  final _mediaWireHashes = <String, String>{};
  final _mediaReceipts = <String, Map<Object?, Object?>>{};
  Future<void> Function()? duringCreate;
  Object? createError;
  Object? cancelError;
  Object? hostCancelError;
  Object? deleteEventError;
  Object? updateEventError;
  Completer<void>? updateEventCompleter;
  int updateEventCallCount = 0;
  Object? joinWaitlistError;
  Object? leaveWaitlistError;
  Object? recordInviteOpenError;
  Object? createWaitlistOfferError;
  Object? acceptWaitlistOfferError;
  Object? declineWaitlistOfferError;
  Object? decideJoinRequestError;
  Object? markAttendanceError;
  Object? selfCheckInError;
  String? cancelledEventId;
  String? hostCancelledEventId;
  String? hostCancelReason;
  String? deletedEventId;
  Event? updatedEvent;
  bool? updatedEventIncludePolicy;
  String? updatedEventInviteCode;
  String? joinedWaitlistEventId;
  String? joinedWaitlistInviteCode;
  String? joinedWaitlistInviteLinkId;
  String? createdInviteLinkEventId;
  String? createdInviteLinkLabel;
  String? createdInviteLinkSource;
  String? disabledInviteLinkEventId;
  String? disabledInviteLinkId;
  String? requestedInviteLinkTokenEventId;
  String? requestedInviteLinkTokenId;
  String? recordedInviteOpenEventId;
  String? recordedInviteOpenLinkId;
  String? createdWaitlistOfferEventId;
  List<String>? createdWaitlistOfferUserIds;
  int? createdWaitlistOfferExpiresInMinutes;
  String? acceptedWaitlistOfferEventId;
  String? declinedWaitlistOfferEventId;
  WaitlistOfferAcceptanceCallableResponse acceptWaitlistOfferResponse =
      const WaitlistOfferAcceptanceCallableResponse(
        accepted: true,
        requiresPayment: false,
        booked: true,
      );
  String? decidedJoinRequestEventId;
  String? decidedJoinRequestUserId;
  String? decidedJoinRequestDecision;
  String? createdEventInviteCode;
  String? leftWaitlistEventId;
  String? markedAttendanceEventId;
  String? markedAttendanceUserId;
  String? selfCheckedInEventId;
  String? selfCheckedInVenueSessionToken;
  Event? fetchedEvent;
  Object? fetchEventError;
  EventSuccessDefaults? createdEventSuccessDefaults;
  ExternalEventOriginInput? createdExternalOrigin;
  EventRuntimeWalkInPolicy? createdRuntimeWalkInPolicy;
  final Map<String, Event?> watchedEvents = {};
  final Map<String, List<Event>> clubEvents = {};
  final Map<String, List<Event>> attendedEvents = {};
  final Map<String, List<Event>> signedUpEvents = {};
  final Map<String, EventPrivateAccess?> privateAccessByEventId = {};
  final Map<String, List<EventInviteLink>> inviteLinksByEventId = {};
  List<String>? recommendedClubIds;
  List<Event> recommendedEvents = const [];

  @override
  String generateId() => generatedId;

  @override
  String generateBroadcastRequestId() => generatedBroadcastRequestId;

  @override
  Future<void> createEvent({
    required Event event,
    String? inviteCode,
    EventSuccessDefaults? eventSuccessDefaults,
    ExternalEventOriginInput? externalOrigin,
    EventRuntimeWalkInPolicy? runtimeWalkInPolicy,
  }) async {
    createEventCallCount++;
    if (createError != null) {
      throw createError!;
    }
    createdEvent = event;
    await duringCreate?.call();
    createdEventInviteCode = inviteCode;
    createdEventSuccessDefaults = eventSuccessDefaults;
    createdExternalOrigin = externalOrigin;
    createdRuntimeWalkInPolicy = runtimeWalkInPolicy;
  }

  @override
  Future<Event?> fetchEvent(String id) async {
    if (fetchEventError case final error?) throw error;
    return fetchedEvent;
  }

  @override
  Stream<Event?> watchEvent(String id) => Stream.value(watchedEvents[id]);

  @override
  Stream<EventPrivateAccess?> watchPrivateAccess(String eventId) =>
      Stream.value(privateAccessByEventId[eventId]);

  @override
  Stream<List<EventInviteLink>> watchInviteLinks(String eventId) =>
      Stream.value(inviteLinksByEventId[eventId] ?? const []);

  @override
  Stream<List<Event>> watchEventsForClub({required String clubId}) =>
      Stream.value(clubEvents[clubId] ?? const []);

  @override
  Future<List<Event>> fetchUpcomingEventsForClubs(List<String> clubIds) async {
    recommendedClubIds = clubIds;
    return recommendedEvents;
  }

  @override
  Future<void> cancelSignUpViaFunction({required String eventId}) async {
    if (cancelError != null) {
      throw cancelError!;
    }
    cancelledEventId = eventId;
  }

  @override
  Future<void> cancelEvent({required String eventId, String? reason}) async {
    if (hostCancelError != null) {
      throw hostCancelError!;
    }
    hostCancelledEventId = eventId;
    hostCancelReason = reason;
  }

  @override
  Future<void> deleteEvent({required String eventId}) async {
    if (deleteEventError != null) {
      throw deleteEventError!;
    }
    deletedEventId = eventId;
  }

  @override
  Future<Map<Object?, Object?>> attachEventPhotos({
    required Event event,
    required String requestId,
    required String expectedMediaHash,
  }) async {
    mediaRequests.add((
      event: event,
      requestId: requestId,
      expectedMediaHash: expectedMediaHash,
    ));
    updateEventCallCount++;
    if (updateEventError != null) throw updateEventError!;
    await updateEventCompleter?.future;
    final wireHash = eventPhotoRecoveryHash([
      event.id,
      expectedMediaHash,
      [
        for (final photo in event.eventPhotos)
          [
            photo.id,
            photo.url,
            photo.storagePath,
            photo.position,
            photo.createdAt.microsecondsSinceEpoch,
            photo.updatedAt.microsecondsSinceEpoch,
          ],
      ],
    ]);
    if (_mediaReceipts[requestId] case final receipt?) {
      if (_mediaWireHashes[requestId] != wireHash) {
        throw const ValidationException(
          'Immutable media payload changed',
          code: 'aborted',
        );
      }
      return receipt;
    }
    updatedEvent = event;
    fetchedEvent = event;
    final receipt = <Object?, Object?>{
      'actorUid': mediaActorUid,
      'organizerId': event.clubId,
      'eventId': event.id,
      'requestId': requestId,
      'payloadHash': eventPhotoRecoveryHash([
        mediaActorUid,
        event.clubId,
        event.id,
        requestId,
        expectedMediaHash,
        [
          for (final photo in event.eventPhotos)
            [photo.id, photo.url, photo.storagePath, photo.position],
        ],
      ]),
    };
    _mediaWireHashes[requestId] = wireHash;
    _mediaReceipts[requestId] = receipt;
    if (loseMediaAcknowledgement && mediaRequests.length == 1) {
      throw TimeoutException('media acknowledgement lost');
    }
    return receipt;
  }

  String mediaActorUid = 'runner-1';

  @override
  Future<void> updateEventDetails({
    required Event event,
    bool includePolicy = false,
    String? inviteCode,
  }) async {
    updateEventCallCount += 1;
    if (updateEventError != null) {
      throw updateEventError!;
    }
    final pendingUpdate = updateEventCompleter;
    if (pendingUpdate != null) {
      await pendingUpdate.future;
    }
    updatedEvent = event;
    updatedEventIncludePolicy = includePolicy;
    updatedEventInviteCode = inviteCode;
  }

  @override
  Future<void> joinWaitlistViaFunction({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
  }) async {
    if (joinWaitlistError != null) {
      throw joinWaitlistError!;
    }
    joinedWaitlistEventId = eventId;
    joinedWaitlistInviteCode = inviteCode;
    joinedWaitlistInviteLinkId = inviteLinkId;
  }

  @override
  Future<CreateEventInviteLinkCallableResponse> createInviteLink({
    required String eventId,
    required String label,
    String? source,
  }) async {
    createdInviteLinkEventId = eventId;
    createdInviteLinkLabel = label;
    createdInviteLinkSource = source;
    return CreateEventInviteLinkCallableResponse(
      inviteLinkId: 'invite-link-1',
      inviteToken: 'v2_invite-link-1_test-token',
      eventId: eventId,
      label: label,
      source: source,
    );
  }

  @override
  Future<String> getInviteLinkToken({
    required String eventId,
    required String inviteLinkId,
  }) async {
    requestedInviteLinkTokenEventId = eventId;
    requestedInviteLinkTokenId = inviteLinkId;
    return 'v2_${inviteLinkId}_test-token';
  }

  @override
  Future<void> disableInviteLink({
    required String eventId,
    required String inviteLinkId,
  }) async {
    disabledInviteLinkEventId = eventId;
    disabledInviteLinkId = inviteLinkId;
  }

  @override
  Future<RecordEventInviteLinkOpenCallableResponse> recordInviteLinkOpen({
    required String eventId,
    required String inviteLinkId,
  }) async {
    if (recordInviteOpenError != null) {
      throw recordInviteOpenError!;
    }
    recordedInviteOpenEventId = eventId;
    recordedInviteOpenLinkId = inviteLinkId;
    return RecordEventInviteLinkOpenCallableResponse(
      accepted: true,
      disabled: false,
      eventId: eventId,
      inviteLinkId: inviteLinkId,
    );
  }

  @override
  Future<void> leaveWaitlist({required String eventId}) async {
    if (leaveWaitlistError != null) {
      throw leaveWaitlistError!;
    }
    leftWaitlistEventId = eventId;
  }

  @override
  Future<CreateWaitlistOffersCallableResponse> createWaitlistOffers({
    required String eventId,
    required List<String> userIds,
    int? expiresInMinutes,
  }) async {
    if (createWaitlistOfferError != null) {
      throw createWaitlistOfferError!;
    }
    createdWaitlistOfferEventId = eventId;
    createdWaitlistOfferUserIds = userIds;
    createdWaitlistOfferExpiresInMinutes = expiresInMinutes;
    return const CreateWaitlistOffersCallableResponse(
      createdCount: 1,
      skippedCount: 0,
    );
  }

  @override
  Future<WaitlistOfferAcceptanceCallableResponse> acceptWaitlistOffer({
    required String eventId,
  }) async {
    if (acceptWaitlistOfferError != null) {
      throw acceptWaitlistOfferError!;
    }
    acceptedWaitlistOfferEventId = eventId;
    return acceptWaitlistOfferResponse;
  }

  @override
  Future<void> declineWaitlistOffer({required String eventId}) async {
    if (declineWaitlistOfferError != null) {
      throw declineWaitlistOfferError!;
    }
    declinedWaitlistOfferEventId = eventId;
  }

  @override
  Future<void> decideJoinRequest({
    required String eventId,
    required String userId,
    required String decision,
  }) async {
    if (decideJoinRequestError != null) {
      throw decideJoinRequestError!;
    }
    decidedJoinRequestEventId = eventId;
    decidedJoinRequestUserId = userId;
    decidedJoinRequestDecision = decision;
  }

  @override
  Future<bool> markAttendance({
    required String eventId,
    required String userId,
  }) async {
    if (markAttendanceError != null) {
      throw markAttendanceError!;
    }
    markedAttendanceEventId = eventId;
    markedAttendanceUserId = userId;
    return true;
  }

  @override
  Future<void> selfCheckInAttendance({
    required String eventId,
    required String venueSessionToken,
  }) async {
    if (selfCheckInError != null) {
      throw selfCheckInError!;
    }
    selfCheckedInEventId = eventId;
    selfCheckedInVenueSessionToken = venueSessionToken;
  }
}

class FakeEventParticipationRepository extends Fake
    implements EventParticipationRepository {
  final Map<String, List<EventParticipation>> eventParticipations = {};
  final Map<String, List<EventParticipation>> userParticipations = {};
  String? lastFetchedEventId;

  @override
  Future<List<EventParticipation>> fetchParticipationsForEvent({
    required String eventId,
  }) async {
    lastFetchedEventId = eventId;
    return eventParticipations[eventId] ?? const [];
  }

  @override
  Future<List<EventParticipation>> fetchHostReportParticipationsForEvent({
    required String eventId,
  }) async {
    lastFetchedEventId = eventId;
    return eventParticipations[eventId] ?? const [];
  }

  @override
  Stream<List<EventParticipation>> watchParticipationsForEvent({
    required String eventId,
  }) => Stream.value(eventParticipations[eventId] ?? const []);

  @override
  Stream<List<EventParticipation>> watchParticipationsForUser({
    required String uid,
  }) => Stream.value(userParticipations[uid] ?? const []);
}

class FakePaymentRepository extends Fake implements PaymentRepository {
  FakePaymentRepository({this.supportsPaid = true});

  final bool supportsPaid;
  Object? bookFreeEventError;
  Object? processPaymentError;
  bool bookFreeEventCalled = false;
  String? bookedFreeEventId;
  bool processPaymentCalled = false;
  ProcessPaymentCall? lastProcessPaymentCall;
  PaymentConfirmationData? processPaymentResult;

  @override
  bool get supportsPaidBookings => supportsPaid;

  @override
  bool supportsPaidBookingsForCurrency(String currencyCode) =>
      currencyCode.trim().toUpperCase() == 'INR' ? supportsPaid : true;

  String? bookedFreeEventInviteCode;
  String? bookedFreeEventInviteLinkId;
  String? bookedFreeEventCrossPathsPairHoldId;

  @override
  Future<void> bookFreeEvent({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    if (bookFreeEventError != null) {
      throw bookFreeEventError!;
    }
    bookFreeEventCalled = true;
    bookedFreeEventId = eventId;
    bookedFreeEventInviteCode = inviteCode;
    bookedFreeEventInviteLinkId = inviteLinkId;
    bookedFreeEventCrossPathsPairHoldId = crossPathsPairHoldId;
  }

  @override
  Future<PaymentConfirmationData> processPayment({
    required String eventId,
    required String currencyCode,
    required String description,
    required String userName,
    required String userEmail,
    required String userContact,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    if (!supportsPaid) {
      throw const PaidBookingUnsupportedException();
    }
    if (processPaymentError != null) {
      throw processPaymentError!;
    }
    processPaymentCalled = true;
    lastProcessPaymentCall = ProcessPaymentCall(
      eventId: eventId,
      currencyCode: currencyCode,
      description: description,
      userName: userName,
      userEmail: userEmail,
      userContact: userContact,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
    return processPaymentResult ??
        PaymentConfirmationData(
          paymentId: 'pay_test',
          orderId: 'order_test',
          amountInPaise: 0,
          currency: currencyCode,
          eventId: eventId,
        );
  }

  @override
  void dispose() {}
}

class ProcessPaymentCall {
  const ProcessPaymentCall({
    required this.eventId,
    required this.currencyCode,
    required this.description,
    required this.userName,
    required this.userEmail,
    required this.userContact,
    this.inviteCode,
    this.inviteLinkId,
    this.crossPathsPairHoldId,
  });

  final String eventId;
  final String currencyCode;
  final String description;
  final String userName;
  final String userEmail;
  final String userContact;
  final String? inviteCode;
  final String? inviteLinkId;
  final String? crossPathsPairHoldId;
}

class FakePublicProfileRepository extends Fake
    implements PublicProfileRepository {
  List<String>? lastRequestedUids;
  final List<List<String>> fetchPublicProfilesCalls = [];
  List<PublicProfile> profiles = const [];

  @override
  Future<List<PublicProfile>> fetchPublicProfiles(List<String> uids) async {
    lastRequestedUids = uids;
    fetchPublicProfilesCalls.add(List.unmodifiable(uids));
    return profiles;
  }
}

class FakeSwipeCandidateRepository extends Fake
    implements SwipeCandidateRepository {
  FakeSwipeCandidateRepository([this.candidates = const []]);

  final List<PublicProfile> candidates;
  String? lastEventId;

  @override
  Future<List<PublicProfile>> fetchCandidates({required String eventId}) async {
    lastEventId = eventId;
    return candidates;
  }
}

/// Serves a [FakeEventRepository]'s per-user booked and attended events.
class FakeBookedEventsRepository extends Fake
    implements BookedEventsRepository {
  FakeBookedEventsRepository(this.events);

  final FakeEventRepository events;

  @override
  Stream<List<Event>> watchAttendedEvents({required String uid}) =>
      Stream.value(events.attendedEvents[uid] ?? const []);

  @override
  Stream<List<Event>> watchSignedUpEvents({required String uid}) =>
      Stream.value(events.signedUpEvents[uid] ?? const []);
}

class FakeSavedEventRepository extends Fake implements SavedEventRepository {
  String? savedUid;
  String? savedEventId;
  String? unsavedUid;
  String? unsavedEventId;
  bool throwOnSave = false;
  final Map<String, List<Event>> savedEventDetails = {};
  final Map<String, List<saved_domain.SavedEvent>> savedEvents = {};

  @override
  Future<void> saveEvent({required String uid, required String eventId}) async {
    if (throwOnSave) throw StateError('save failed');
    savedUid = uid;
    savedEventId = eventId;
  }

  @override
  Future<void> unsaveEvent({
    required String uid,
    required String eventId,
  }) async {
    unsavedUid = uid;
    unsavedEventId = eventId;
  }

  @override
  Stream<List<Event>> watchSavedEventDetailsForUser({required String uid}) =>
      Stream.value(savedEventDetails[uid] ?? const []);

  @override
  Stream<List<saved_domain.SavedEvent>> watchSavedEventsForUser({
    required String uid,
  }) {
    final savedEdges = savedEvents[uid];
    if (savedEdges != null) return Stream.value(savedEdges);
    final details = savedEventDetails[uid] ?? const <Event>[];
    return Stream.value([
      for (final event in details)
        saved_domain.SavedEvent(
          id: saved_domain.savedEventId(uid: uid, eventId: event.id),
          uid: uid,
          eventId: event.id,
          savedAt: DateTime(2026),
        ),
    ]);
  }

  @override
  Stream<saved_domain.SavedEvent?> watchSavedEvent({
    required String uid,
    required String eventId,
  }) {
    final edges = savedEvents[uid] ?? const <saved_domain.SavedEvent>[];
    for (final savedEvent in edges) {
      if (savedEvent.eventId == eventId) return Stream.value(savedEvent);
    }
    return Stream.value(null);
  }
}
