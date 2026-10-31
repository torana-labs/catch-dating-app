import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
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

part 'organizers_repository.g.dart';

class OrganizersRepository {
  const OrganizersRepository(this._db, this._functions);

  static const _collectionPath = 'organizers';

  /// Firestore rules let a list query return only organizers the app shows
  /// (or ones the reader hosts or owns), so browse queries must filter on it.
  static const _discoverable = 'discoverable';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<Organizer> get _organizersRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Organizer>(
        idField: 'id',
        fromJson: Organizer.fromJson,
        toJson: (organizer) => organizer.toJson(),
      );

  DocumentReference<Organizer> _organizerRef([String? id]) =>
      _organizersRef.doc(id);

  // ── Read ───────────────────────────────────────────────────────────────────

  Stream<Organizer?> watchOrganizer(String id) => withBackendErrorStream(
    () => _organizerRef(
      id,
    ).snapshots().map((doc) => doc.exists ? doc.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer',
      resource: _collectionPath,
    ),
  );

  Future<Organizer?> fetchOrganizer(String id) => withBackendErrorContext(
    () async {
      final doc = await _organizerRef(id).get();
      return doc.exists ? doc.data() : null;
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch organizer',
      resource: _collectionPath,
    ),
  );

  Stream<List<Organizer>> watchOrganizersByLocation(String location) =>
      withBackendErrorStream(
        () => _organizersRef
            .where('locationMarketId', isEqualTo: location)
            .where('appVisibility', isEqualTo: _discoverable)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.directoryPage)
            .snapshots()
            .map(
              (snap) =>
                  _appDiscoverableOrganizers(snap.docs.map((d) => d.data())),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch organizers by location',
          resource: _collectionPath,
        ),
      );

  Stream<List<Organizer>> watchOrganizersByLocationSortedByRating(
    String location,
  ) => withBackendErrorStream(
    () => _organizersRef
        .where('locationMarketId', isEqualTo: location)
        .where('appVisibility', isEqualTo: _discoverable)
        .orderBy('rating', descending: true)
        .limit(ReadLimitPolicy.directoryPage)
        .snapshots()
        .map(
          (snap) => _appDiscoverableOrganizers(snap.docs.map((d) => d.data())),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizers by rating',
      resource: _collectionPath,
    ),
  );

  Stream<List<Organizer>> watchOrganizersHostedBy(String uid) =>
      withBackendErrorStream(
        () => _organizersRef
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

  Stream<List<Organizer>> watchOrganizersOwnedBy(String uid) =>
      withBackendErrorStream(
        () => _organizersRef
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
  Stream<List<Organizer>> watchOrganizersByIds({
    required List<String> organizerIds,
  }) => watchDocumentsOneByOne(
    ids: organizerIds,
    collection: _organizersRef,
    transform: _appDiscoverableOrganizers,
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
  Stream<List<Organizer>> watchOrganizersForMessagingByIds({
    required List<String> organizerIds,
  }) => watchDocumentsOneByOne(
    ids: organizerIds,
    collection: _organizersRef,
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizers for messaging by ids',
      resource: _collectionPath,
    ),
  );

  static List<Organizer> _appDiscoverableOrganizers(
    Iterable<Organizer> organizers,
  ) => organizers
      .where((organizer) => organizer.isPubliclyBrowseable)
      .toList(growable: false);

  // ── Write ──────────────────────────────────────────────────────────────────

  String generateId() => _organizerRef().id;

  Future<String> createOrganizer({
    String? organizerId,
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
    OrganizerHostDefaults? hostDefaults,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createOrganizer')
          .call<Object?>(
            CreateOrganizerCallableRequest(
              organizerId: organizerId,
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
  Future<void> updateOrganizer({
    required String organizerId,
    required UpdateOrganizerPatch patch,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('updateOrganizer')
        .call(patch.toCallableJson(organizerId: organizerId)),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update organizer',
      resource: _collectionPath,
    ),
  );

  // ── Members ────────────────────────────────────────────────────────────────

  /// Follows [organizerId] through the canonical organizer relationship.
  ///
  /// Following touches `organizerFollows` plus denormalized user state, so the
  /// server owns this mutation and Firestore rules can keep membership fields
  /// read-only to direct client writes.
  Future<void> joinOrganizer(String organizerId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('followOrganizer')
        .call(OrganizerFollowCallableRequest(organizerId: organizerId).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'follow organizer',
      resource: _collectionPath,
    ),
  );

  /// Unfollows [organizerId] through the canonical organizer relationship.
  Future<void> leaveOrganizer(String organizerId) => withBackendErrorContext(
    () => _functions
        .httpsCallable('unfollowOrganizer')
        .call(OrganizerFollowCallableRequest(organizerId: organizerId).toJson()),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'unfollow organizer',
      resource: _collectionPath,
    ),
  );

  /// Updates the signed-in user's per-club push notification opt-in.
  Future<void> setOrganizerPushNotifications({
    required String organizerId,
    required bool enabled,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('setOrganizerNotificationPreference')
        .call(
          SetOrganizerNotificationPreferenceCallableRequest(
            organizerId: organizerId,
            enabled: enabled,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update organizer notifications',
      resource: _collectionPath,
    ),
  );

  Future<void> addOrganizerHost({
    required String organizerId,
    String? uid,
    String? phoneNumber,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('addOrganizerManager')
        .call(
          AddOrganizerManagerCallableRequest(
            organizerId: organizerId,
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

  Future<void> removeOrganizerHost({
    required String organizerId,
    required String uid,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('removeOrganizerManager')
        .call(
          RemoveOrganizerManagerCallableRequest(
            organizerId: organizerId,
            uid: uid,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'remove organizer manager',
      resource: _collectionPath,
    ),
  );

  Future<void> transferOrganizerOwnership({
    required String organizerId,
    required String uid,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('transferOrganizerOwnership')
        .call(
          TransferOrganizerOwnershipCallableRequest(
            organizerId: organizerId,
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
      return StartOrganizerHostConversationCallableResponse.fromCallableData(
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
OrganizersRepository organizersRepository(Ref ref) => OrganizersRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<Organizer?> watchOrganizer(Ref ref, String id) {
  final repository = ref.watch(organizersRepositoryProvider);
  return repository.watchOrganizer(id);
}

@riverpod
Stream<List<Organizer>> watchOrganizersByLocation(Ref ref, String location) {
  final repository = ref.watch(organizersRepositoryProvider);
  return repository.watchOrganizersByLocation(location);
}

@riverpod
Stream<List<Organizer>> watchOrganizersByLocationSortedByRating(
  Ref ref,
  String location,
) {
  final repository = ref.watch(organizersRepositoryProvider);
  return repository.watchOrganizersByLocationSortedByRating(location);
}

@riverpod
Stream<List<Organizer>> watchOrganizersHostedBy(Ref ref, String uid) {
  final repository = ref.watch(organizersRepositoryProvider);
  return repository.watchOrganizersHostedBy(uid);
}

@riverpod
Stream<List<Organizer>> watchOrganizersOwnedBy(Ref ref, String uid) {
  final repository = ref.watch(organizersRepositoryProvider);
  return repository.watchOrganizersOwnedBy(uid);
}

@riverpod
Future<Organizer?> fetchOrganizer(Ref ref, String id) =>
    ref.watch(organizersRepositoryProvider).fetchOrganizer(id);

@riverpod
Stream<List<Organizer>> watchOrganizersByIds(
  Ref ref,
  OrganizersByIdQuery query,
) => ref
    .watch(organizersRepositoryProvider)
    .watchOrganizersByIds(organizerIds: query.organizerIds);

@riverpod
Stream<List<Organizer>> watchOrganizersForMessagingByIds(
  Ref ref,
  OrganizersByIdQuery query,
) => ref
    .watch(organizersRepositoryProvider)
    .watchOrganizersForMessagingByIds(organizerIds: query.organizerIds);

@riverpod
AsyncValue<List<Organizer>> hostOperableOrganizers(Ref ref, String uid) {
  final hostedAsync = ref.watch(watchOrganizersHostedByProvider(uid));
  final ownedAsync = ref.watch(watchOrganizersOwnedByProvider(uid));
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
    mergeHostOperableOrganizers(hosted: hosted, owned: owned, uid: uid),
  );
}

List<Organizer> mergeHostOperableOrganizers({
  required Iterable<Organizer> hosted,
  required Iterable<Organizer> owned,
  required String uid,
}) {
  final byId = <String, Organizer>{};
  for (final organizer in hosted) {
    byId[organizer.id] = organizer;
  }
  for (final organizer in owned) {
    byId[organizer.id] = organizer;
  }
  final organizers = byId.values.toList()
    ..sort((a, b) {
      final aOwned = a.isOwnedBy(uid);
      final bOwned = b.isOwnedBy(uid);
      if (aOwned != bOwned) return aOwned ? -1 : 1;
      return a.name.compareTo(b.name);
    });
  return List.unmodifiable(organizers);
}

class OrganizersByIdQuery {
  OrganizersByIdQuery._(Iterable<String> organizerIds)
    : organizerIds = List.unmodifiable(organizerIds.toSet().toList()..sort());

  factory OrganizersByIdQuery(Iterable<String> organizerIds) =>
      OrganizersByIdQuery._(organizerIds);

  static const _equality = ListEquality<String>();

  final List<String> organizerIds;

  @override
  bool operator ==(Object other) {
    return other is OrganizersByIdQuery &&
        _equality.equals(other.organizerIds, organizerIds);
  }

  @override
  int get hashCode => _equality.hash(organizerIds);
}
