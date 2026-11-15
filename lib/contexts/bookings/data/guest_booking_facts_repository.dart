import 'package:catch_dating_app/contexts/bookings/domain/event_viewer_composition.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'guest_booking_facts_repository.g.dart';

/// Reads `guestBookingFacts/{uid}`: booking facts about one guest that need
/// documents the guest cannot read, projected by the server for the guest
/// alone.
class GuestBookingFactsRepository {
  const GuestBookingFactsRepository(this._db);

  static const _collection = 'guestBookingFacts';

  final FirebaseFirestore _db;

  /// The guest's community membership state per organizer id. A missing
  /// document means no organizer has decided a membership for them.
  Stream<Map<String, GuestCommunityMembershipState>> watchCommunityMemberships(
    String uid,
  ) => withBackendErrorStream(
    () => _db
        .collection(_collection)
        .doc(uid)
        .snapshots()
        .map((snap) => _memberships(snap.data()?['communityMemberships'])),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch guest booking facts',
      resource: _collection,
    ),
  );
}

Map<String, GuestCommunityMembershipState> _memberships(Object? raw) {
  if (raw is! Map) return const {};
  return {
    for (final entry in raw.entries)
      if (entry.key is String && entry.value is Map)
        entry.key as String: ?_state((entry.value as Map)['state']),
  };
}

GuestCommunityMembershipState? _state(Object? value) => switch (value) {
  'active' => GuestCommunityMembershipState.active,
  'revoked' => GuestCommunityMembershipState.revoked,
  _ => null,
};

@riverpod
GuestBookingFactsRepository guestBookingFactsRepository(Ref ref) =>
    GuestBookingFactsRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<Map<String, GuestCommunityMembershipState>>
watchGuestCommunityMemberships(Ref ref, String uid) => ref
    .watch(guestBookingFactsRepositoryProvider)
    .watchCommunityMemberships(uid);
