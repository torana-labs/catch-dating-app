import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_callable_responses.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        AddOrganizerManagerCallableRequest,
        CreateOrganizerCallableRequest,
        OrganizerFollowCallableRequest,
        RemoveOrganizerManagerCallableRequest,
        SetOrganizerNotificationPreferenceCallableRequest,
        StartOrganizerConversationCallableRequest,
        TransferOrganizerOwnershipCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'clubs_repository.g.dart';

class ClubsRepository {
  const ClubsRepository(this._db, this._functions);

  static const _collectionPath = 'organizers';

  /// Firestore rules let a list query return only organizers the app shows
  /// (or ones the reader hosts or owns), so browse queries must filter on it.
  static const _discoverable = 'discoverable';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Club> get _clubsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Club>(
        idField: 'id',
        fromJson: Club.fromJson,
        toJson: (club) => club.toJson(),
      );

  DocumentReference<Club> _clubRef([String? id]) => _clubsRef.doc(id);

  // ── Read ───────────────────────────────────────────────────────────────────

  Stream<Club?> watchClub(String id) => withBackendErrorStream(
    () => _clubRef(id).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer',
      resource: _collectionPath,
    ),
  );

  Future<Club?> fetchClub(String id) => withBackendErrorContext(
    () async {
      final doc = await _clubRef(id).get();
      return doc.exists ? doc.data() : null;
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch organizer',
      resource: _collectionPath,
    ),
  );

  Stream<List<Club>> watchClubsByLocation(String location) =>
      withBackendErrorStream(
        () => _clubsRef
            .where('locationMarketId', isEqualTo: location)
            .where('appVisibility', isEqualTo: _discoverable)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.directoryPage)
            .snapshots()
            .map(
              (snap) => _appDiscoverableClubs(snap.docs.map((d) => d.data())),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizers by location',
          resource: _collectionPath,
        ),
      );

  Stream<List<Club>> watchClubsByLocationSortedByRating(String location) =>
      withBackendErrorStream(
        () => _clubsRef
            .where('locationMarketId', isEqualTo: location)
            .where('appVisibility', isEqualTo: _discoverable)
            .orderBy('rating', descending: true)
            .limit(ReadLimitPolicy.directoryPage)
            .snapshots()
            .map(
              (snap) => _appDiscoverableClubs(snap.docs.map((d) => d.data())),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizers by rating',
          resource: _collectionPath,
        ),
      );

  Stream<List<Club>> watchClubsHostedBy(String uid) => withBackendErrorStream(
    () => _clubsRef
        .where(
          Filter.or(
            Filter('hostUserId', isEqualTo: uid),
            Filter('hostUserIds', arrayContains: uid),
          ),
        )
        .limit(ReadLimitPolicy.directoryPage)
        .snapshots()
        .map((snap) => snap.docs.map((d) => d.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch hosted organizers',
      resource: _collectionPath,
    ),
  );

  Stream<List<Club>> watchClubsOwnedBy(String uid) => withBackendErrorStream(
    () => _clubsRef
        .where(
          Filter.or(
            Filter('hostUserId', isEqualTo: uid),
            Filter('ownerUserId', isEqualTo: uid),
          ),
        )
        .limit(ReadLimitPolicy.directoryPage)
        .snapshots()
        .map((snap) => snap.docs.map((d) => d.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch owned organizers',
      resource: _collectionPath,
    ),
  );

  /// Search matches resolve by id, one read per organizer: Firestore rules
  /// check an id-list query against every matched document, so one hidden
  /// organizer among the ids would deny the whole query. Hidden organizers
  /// are then dropped here.
  Stream<List<Club>> watchClubsByIds({required List<String> clubIds}) =>
      watchDocumentsOneByOne(
        ids: clubIds,
        collection: _clubsRef,
        transform: _appDiscoverableClubs,
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizers by ids',
          resource: _collectionPath,
        ),
      );

  /// Resolves conversation identity even when a club is intentionally hidden
  /// from discovery. Authorization still comes from the match and Firestore
  /// rules; app visibility must not degrade an existing thread to a fallback.
  /// Hidden organizers are not returned by list queries, so each is read by
  /// its ID.
  Stream<List<Club>> watchClubsForMessagingByIds({
    required List<String> clubIds,
  }) => watchDocumentsOneByOne(
    ids: clubIds,
    collection: _clubsRef,
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizers for messaging by ids',
      resource: _collectionPath,
    ),
  );

  static List<Club> _appDiscoverableClubs(Iterable<Club> clubs) =>
      clubs.where((club) => club.isPubliclyBrowseable).toList(growable: false);

  // ── Write ──────────────────────────────────────────────────────────────────

  String generateId() => _clubRef().id;

  Future<String> createClub({
    String? clubId,
    required String name,
    required String description,
    required String location,
    required String area,
    OrganizerType organizerType = OrganizerType.club,
    String? imageUrl,
    String? profileImageUrl,
    String? instagramHandle,
    String? phoneNumber,
    String? email,
    ClubHostDefaults? hostDefaults,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createOrganizer')
          .call<Object?>(
            CreateOrganizerCallableRequest(
              organizerId: clubId,
              name: name,
              description: description,
              location: location,
              area: area,
              organizerType: organizerType.name,
              imageUrl: imageUrl,
              profileImageUrl: profileImageUrl,
              instagramHandle: instagramHandle,
              phoneNumber: phoneNumber,
              email: email,
              hostDefaults: hostDefaults?.toJson(),
            ).toJson(),
          );
      return CreateOrganizerCallableResponse.fromCallableData(
        result.data,
      ).organizerId;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create organizer',
      resource: _collectionPath,
    ),
  );

  /// Updates only fields present in [patch] via `updateOrganizer`.
  Future<void> updateClub({
    required String clubId,
    required UpdateClubPatch patch,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('updateOrganizer')
        .call(patch.toCallableJson(clubId: clubId)),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update organizer',
      resource: _collectionPath,
    ),
  );

  // ── Members ────────────────────────────────────────────────────────────────

  /// Follows [clubId] through the canonical organizer relationship.
  ///
  /// Following touches `organizerFollows` plus denormalized user state, so the
  /// server owns this mutation and Firestore rules can keep membership fields
  /// read-only to direct client writes.
  Future<void> joinClub(String clubId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('followOrganizer')
        .call(OrganizerFollowCallableRequest(organizerId: clubId).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'follow organizer',
      resource: _collectionPath,
    ),
  );

  /// Unfollows [clubId] through the canonical organizer relationship.
  Future<void> leaveClub(String clubId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('unfollowOrganizer')
        .call(OrganizerFollowCallableRequest(organizerId: clubId).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'unfollow organizer',
      resource: _collectionPath,
    ),
  );

  /// Updates the signed-in user's per-club push notification opt-in.
  Future<void> setClubPushNotifications({
    required String clubId,
    required bool enabled,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('setOrganizerNotificationPreference')
        .call(
          SetOrganizerNotificationPreferenceCallableRequest(
            organizerId: clubId,
            enabled: enabled,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update organizer notifications',
      resource: _collectionPath,
    ),
  );

  Future<void> addClubHost({
    required String clubId,
    String? uid,
    String? phoneNumber,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('addOrganizerManager')
        .call(
          AddOrganizerManagerCallableRequest(
            organizerId: clubId,
            uid: uid,
            phoneNumber: phoneNumber,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'add organizer manager',
      resource: _collectionPath,
    ),
  );

  Future<void> removeClubHost({required String clubId, required String uid}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('removeOrganizerManager')
            .call(
              RemoveOrganizerManagerCallableRequest(
                organizerId: clubId,
                uid: uid,
              ).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'remove organizer manager',
          resource: _collectionPath,
        ),
      );

  Future<void> transferClubOwnership({
    required String clubId,
    required String uid,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('transferOrganizerOwnership')
        .call(
          TransferOrganizerOwnershipCallableRequest(
            organizerId: clubId,
            uid: uid,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'transfer organizer ownership',
      resource: _collectionPath,
    ),
  );

  Future<String> startOrganizerConversation({
    required String organizerId,
    required String hostUid,
    String? eventId,
  }) => withBackendErrorContext(
    () async {
      final callable = _functions.httpsCallable('startOrganizerConversation');
      final result = await callable.call(
        StartOrganizerConversationCallableRequest(
          organizerId: organizerId,
          hostUid: hostUid,
          eventId: eventId,
        ).toJson(),
      );
      return StartClubHostConversationCallableResponse.fromCallableData(
        result.data,
      ).matchId;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'start organizer host conversation',
      resource: _collectionPath,
    ),
  );
}

// keepalive: club repository is a shared Firestore/Functions facade reused by
// discovery, hosting, and route guards.
@Riverpod(keepAlive: true)
ClubsRepository clubsRepository(Ref ref) => ClubsRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<Club?> watchClub(Ref ref, String id) {
  final repository = ref.watch(clubsRepositoryProvider);
  return repository.watchClub(id);
}

@riverpod
Stream<List<Club>> watchClubsByLocation(Ref ref, String location) {
  final repository = ref.watch(clubsRepositoryProvider);
  return repository.watchClubsByLocation(location);
}

@riverpod
Stream<List<Club>> watchClubsByLocationSortedByRating(
  Ref ref,
  String location,
) {
  final repository = ref.watch(clubsRepositoryProvider);
  return repository.watchClubsByLocationSortedByRating(location);
}

@riverpod
Stream<List<Club>> watchClubsHostedBy(Ref ref, String uid) {
  final repository = ref.watch(clubsRepositoryProvider);
  return repository.watchClubsHostedBy(uid);
}

@riverpod
Stream<List<Club>> watchClubsOwnedBy(Ref ref, String uid) {
  final repository = ref.watch(clubsRepositoryProvider);
  return repository.watchClubsOwnedBy(uid);
}

@riverpod
Future<Club?> fetchClub(Ref ref, String id) =>
    ref.watch(clubsRepositoryProvider).fetchClub(id);

@riverpod
Stream<List<Club>> watchClubsByIds(Ref ref, ClubsByIdQuery query) =>
    ref.watch(clubsRepositoryProvider).watchClubsByIds(clubIds: query.clubIds);

@riverpod
Stream<List<Club>> watchClubsForMessagingByIds(Ref ref, ClubsByIdQuery query) =>
    ref
        .watch(clubsRepositoryProvider)
        .watchClubsForMessagingByIds(clubIds: query.clubIds);

@riverpod
AsyncValue<List<Club>> hostOperableClubs(Ref ref, String uid) {
  final hostedAsync = ref.watch(watchClubsHostedByProvider(uid));
  final ownedAsync = ref.watch(watchClubsOwnedByProvider(uid));
  if (hostedAsync case AsyncError(:final error, :final stackTrace)) {
    return AsyncError(error, stackTrace);
  }
  if (ownedAsync case AsyncError(:final error, :final stackTrace)) {
    return AsyncError(error, stackTrace);
  }
  final hosted = hostedAsync.asData?.value;
  final owned = ownedAsync.asData?.value;
  if (hosted == null || owned == null) return const AsyncLoading();
  return AsyncData(
    mergeHostOperableClubs(hosted: hosted, owned: owned, uid: uid),
  );
}

List<Club> mergeHostOperableClubs({
  required Iterable<Club> hosted,
  required Iterable<Club> owned,
  required String uid,
}) {
  final byId = <String, Club>{};
  for (final club in hosted) {
    byId[club.id] = club;
  }
  for (final club in owned) {
    byId[club.id] = club;
  }
  final clubs = byId.values.toList()
    ..sort((a, b) {
      final aOwned = a.isOwnedBy(uid);
      final bOwned = b.isOwnedBy(uid);
      if (aOwned != bOwned) return aOwned ? -1 : 1;
      return a.name.compareTo(b.name);
    });
  return List.unmodifiable(clubs);
}

class ClubsByIdQuery {
  ClubsByIdQuery._(Iterable<String> clubIds)
    : clubIds = List.unmodifiable(clubIds.toSet().toList()..sort());

  factory ClubsByIdQuery(Iterable<String> clubIds) => ClubsByIdQuery._(clubIds);

  static const _equality = ListEquality<String>();

  final List<String> clubIds;

  @override
  bool operator ==(Object other) {
    return other is ClubsByIdQuery && _equality.equals(other.clubIds, clubIds);
  }

  @override
  int get hashCode => _equality.hash(clubIds);
}
