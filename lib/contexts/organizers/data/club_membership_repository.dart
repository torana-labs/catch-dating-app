import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'club_membership_repository.g.dart';

class ClubMembershipRepository {
  const ClubMembershipRepository(this._db);

  static const _collectionPath = 'organizerFollows';

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _membershipsRef =>
      _db.collection(_collectionPath);

  Stream<List<ClubMembership>> watchActiveMembershipsForUser({
    required String uid,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('uid', isEqualTo: uid)
        .where('status', isEqualTo: ClubMembershipStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_followAsMembership).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch user organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<List<ClubMembership>> watchActiveMembershipsForClub({
    required String clubId,
  }) => withBackendErrorStream(
    () => _membershipsRef
        .where('organizerId', isEqualTo: clubId)
        .where('status', isEqualTo: ClubMembershipStatus.active.name)
        .limit(ReadLimitPolicy.boundedWorkingSet)
        .snapshots()
        .map((snap) => snap.docs.map(_followAsMembership).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer follows',
      resource: _collectionPath,
    ),
  );

  Stream<ClubMembership?> watchMembership({
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

  static ClubMembership _followAsMembership(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    final followedAt = data['followedAt'];
    final unfollowedAt = data['unfollowedAt'];
    return ClubMembership(
      id: doc.id,
      clubId: data['organizerId'] as String,
      uid: data['uid'] as String,
      role: ClubMembershipRole.member,
      status: data['status'] == 'active'
          ? ClubMembershipStatus.active
          : ClubMembershipStatus.left,
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
ClubMembershipRepository clubMembershipRepository(Ref ref) =>
    ClubMembershipRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<ClubMembership>> watchActiveClubMembershipsForUser(
  Ref ref,
  String uid,
) => ref
    .watch(clubMembershipRepositoryProvider)
    .watchActiveMembershipsForUser(uid: uid);

@riverpod
Stream<List<ClubMembership>> watchActiveClubMembershipsForClub(
  Ref ref,
  String clubId,
) => ref
    .watch(clubMembershipRepositoryProvider)
    .watchActiveMembershipsForClub(clubId: clubId);

@riverpod
Stream<ClubMembership?> watchClubMembership(
  Ref ref,
  String clubId,
  String uid,
) => ref
    .watch(clubMembershipRepositoryProvider)
    .watchMembership(clubId: clubId, uid: uid);

@riverpod
AsyncValue<Set<String>> currentUserFollowedClubIds(Ref ref) {
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
    watchActiveClubMembershipsForUserProvider(uid),
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
        in membershipsAsync.asData?.value ?? const <ClubMembership>[])
      membership.clubId,
  });
}
