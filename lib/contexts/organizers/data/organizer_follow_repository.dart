import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_follow_repository.g.dart';

class OrganizerFollowRepository {
  const OrganizerFollowRepository(this._db);

  static const _collectionPath = 'organizerFollows';

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _membershipsRef =>
      _db.collection(_collectionPath);

  Stream<List<OrganizerFollow>> watchActiveFollowsForUser({
    required String uid,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('uid', isEqualTo: uid)
        .where('status', isEqualTo: OrganizerFollowStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_follow).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch user organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<List<OrganizerFollow>> watchActiveFollowsForOrganizer({
    required String organizerId,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('organizerId', isEqualTo: organizerId)
        .where('status', isEqualTo: OrganizerFollowStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_follow).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<OrganizerFollow?> watchFollow({
    required String organizerId,
    required String uid,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('organizerId', isEqualTo: organizerId)
        .where('uid', isEqualTo: uid)
        .limit(ReadLimitPolicy.lookup)
        .snapshots()
        .map((snap) => snap.docs.isEmpty ? null : _follow(snap.docs.first)),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer follow',
      resource: _collectionPath,
    ),
  );

  static OrganizerFollow _follow(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) => OrganizerFollow.fromJson({...doc.data(), 'id': doc.id});
}

// keepalive: the follow repository is a shared Firestore facade for organiser
// follow checks across host and public routes.
@Riverpod(keepAlive: true)
OrganizerFollowRepository organizerFollowRepository(Ref ref) =>
    OrganizerFollowRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<OrganizerFollow>> watchActiveOrganizerFollowsForUser(
  Ref ref,
  String uid,
) => ref
    .watch(organizerFollowRepositoryProvider)
    .watchActiveFollowsForUser(uid: uid);

@riverpod
Stream<List<OrganizerFollow>> watchActiveOrganizerFollowsForOrganizer(
  Ref ref,
  String organizerId,
) => ref
    .watch(organizerFollowRepositoryProvider)
    .watchActiveFollowsForOrganizer(organizerId: organizerId);

@riverpod
Stream<OrganizerFollow?> watchOrganizerFollow(
  Ref ref,
  String organizerId,
  String uid,
) => ref
    .watch(organizerFollowRepositoryProvider)
    .watchFollow(organizerId: organizerId, uid: uid);

@riverpod
AsyncValue<Set<String>> currentUserFollowedOrganizerIds(Ref ref) {
  final uidAsync = ref.watch(uidProvider);
  if (uidAsync.isLoading) return const AsyncLoading();
  if (uidAsync.hasError) {
    return AsyncError(
      uidAsync.error!,
      uidAsync.stackTrace ?? StackTrace.current,
    );
  }

  final uid = uidAsync.asData?.value;
  if (uid == null) return const AsyncData(<String>{});

  final membershipsAsync = ref.watch(
    watchActiveOrganizerFollowsForUserProvider(uid),
  );
  if (membershipsAsync.isLoading) return const AsyncLoading();
  if (membershipsAsync.hasError) {
    return AsyncError(
      membershipsAsync.error!,
      membershipsAsync.stackTrace ?? StackTrace.current,
    );
  }

  return AsyncData({
    for (final membership
        in membershipsAsync.asData?.value ?? const <OrganizerFollow>[])
      membership.organizerId,
  });
}
