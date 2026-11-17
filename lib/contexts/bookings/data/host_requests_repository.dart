import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_requests_repository.g.dart';

/// Everyone waiting across an organizer's coming events, as listeners: one
/// `hostEventRequestViews` document per coming event with anyone waiting
/// (written ahead of time by the request view triggers), and the reader's
/// own block edges, which hide anyone with a block either way.
class HostRequestsRepository {
  const HostRequestsRepository(
    this._db,
    this._summaries, {
    required this.actorId,
    this.clock = const AppClock(),
  });

  static const _views = 'hostEventRequestViews';

  /// The most coming events one list listens to.
  static const eventWindow = 50;

  final FirebaseFirestore _db;
  final HostSummaryReader _summaries;
  final String? Function() actorId;
  final AppClock clock;

  /// The organizer's requests and waitlists while listened to. The device
  /// cache serves the last list at once; a join, an approval, an offer or a
  /// booking elsewhere shows without a reread. Events that end while the list
  /// is open stay until it is reopened.
  Stream<HostRequests> watch(String organizerId) {
    final uid = actorId();
    if (uid == null) {
      return Stream.error(StateError('Sign in to see who is waiting.'));
    }
    final views = _summaries.watchWindow(
      collection: _views,
      organizerId: organizerId,
      orderField: 'eventEndMillis',
      descending: false,
      limit: eventWindow,
      // firestore-index: hostEventRequestViews (organizerId:ASCENDING,eventEndMillis:ASCENDING,__name__:ASCENDING)
      lowerInclusive: clock.now().millisecondsSinceEpoch + 1,
    );
    return combineLatest(
      views,
      _watchBlockEdges(uid),
      (window, hidden) => HostRequests.fromViews(
        window.documents,
        hidden: hidden,
        moreEvents: window.hasMore,
      ),
    );
  }

  /// People with a block either way with [uid]: rules let a person read
  /// only the block edges that name them.
  Stream<Set<String>> _watchBlockEdges(String uid) => withBackendErrorStream(
    () => combineLatest(
      _edges('blockerUserId', uid, 'blockedUserId'),
      _edges('blockedUserId', uid, 'blockerUserId'),
      (outgoing, incoming) => {...outgoing, ...incoming},
    ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch block edges for requests',
      resource: 'blocks',
    ),
  );

  Stream<Set<String>> _edges(String field, String uid, String other) => _db
      .collection('blocks')
      .where(field, isEqualTo: uid)
      .limit(ReadLimitPolicy.boundedWorkingSet)
      .snapshots()
      .map(
        (snapshot) => {
          for (final doc in snapshot.docs)
            if (doc.data()[other] case final String id) id,
        },
      );
}

@riverpod
HostRequestsRepository hostRequestsRepository(Ref ref) {
  final auth = ref.watch(firebaseAuthProvider);
  String? actor() => auth.currentUser?.uid;
  return HostRequestsRepository(
    ref.watch(firebaseFirestoreProvider),
    HostSummaryReader(ref.watch(firebaseFirestoreProvider), actorId: actor),
    actorId: actor,
    clock: ref.watch(appClockProvider),
  );
}

/// The organizer's requests read owner. It is a set of Firestore listeners:
/// it declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error. A new account gets a
/// new list.
@riverpod
Stream<HostRequests> hostOrganizerRequests(Ref ref, String organizerId) {
  ref.watch(uidProvider);
  return ref.watch(hostRequestsRepositoryProvider).watch(organizerId);
}
