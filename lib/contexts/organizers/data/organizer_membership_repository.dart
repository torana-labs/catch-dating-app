import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_membership.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_membership_repository.g.dart';

class OrganizerMembershipRepository {
  const OrganizerMembershipRepository(this._db);

  static const _collectionPath = 'organizerFollows';

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _membershipsRef =>
      _db.collection(_collectionPath);

  Stream<List<OrganizerMembership>> watchActiveMembershipsForUser({
    required String uid,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('uid', isEqualTo: uid)
        .where('status', isEqualTo: OrganizerMembershipStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_followAsMembership).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch user organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<List<OrganizerMembership>> watchActiveMembershipsForOrganizer({
    required String clubId,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('organizerId', isEqualTo: clubId)
        .where('status', isEqualTo: OrganizerMembershipStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_followAsMembership).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<OrganizerMembership?> watchMembership({
    required String clubId,
    required String uid,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('organizerId', isEqualTo: clubId)
        .where('uid', isEqualTo: uid)
        .limit(ReadLimitPolicy.lookup)
        .snapshots()
        .map(
          (snap) =>
              snap.docs.isEmpty ? null : _followAsMembership(snap.docs.first),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer follow',
      resource: _collectionPath,
    ),
  );

  static OrganizerMembership _followAsMembership(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    final followedAt = data['followedAt'];
    final unfollowedAt = data['unfollowedAt'];
    return OrganizerMembership(
      id: doc.id,
      clubId: data['organizerId'] as String,
      uid: data['uid'] as String,
      role: OrganizerMembershipRole.member,
      status: data['status'] == 'active'
          ? OrganizerMembershipStatus.active
          : OrganizerMembershipStatus.left,
      pushNotificationsEnabled:
          data['pushNotificationsEnabled'] as bool? ?? false,
      joinedAt: followedAt is Timestamp
          ? followedAt.toDate()
          : DateTime.fromMillisecondsSinceEpoch(0),
      leftAt: unfollowedAt is Timestamp ? unfollowedAt.toDate() : null,
    );
  }
}

// keepalive: membership repository is a shared Firestore facade for club
// access checks across host and public routes.
@Riverpod(keepAlive: true)
OrganizerMembershipRepository organizerMembershipRepository(Ref ref) =>
    OrganizerMembershipRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<OrganizerMembership>> watchActiveOrganizerMembershipsForUser(
  Ref ref,
  String uid,
) => ref
    .watch(organizerMembershipRepositoryProvider)
    .watchActiveMembershipsForUser(uid: uid);

@riverpod
Stream<List<OrganizerMembership>> watchActiveOrganizerMembershipsForOrganizer(
  Ref ref,
  String clubId,
) => ref
    .watch(organizerMembershipRepositoryProvider)
    .watchActiveMembershipsForOrganizer(clubId: clubId);

@riverpod
Stream<OrganizerMembership?> watchOrganizerMembership(
  Ref ref,
  String clubId,
  String uid,
) => ref
    .watch(organizerMembershipRepositoryProvider)
    .watchMembership(clubId: clubId, uid: uid);

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
    watchActiveOrganizerMembershipsForUserProvider(uid),
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
        in membershipsAsync.asData?.value ?? const <OrganizerMembership>[])
      membership.clubId,
  });
}
