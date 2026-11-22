import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_work_repository.g.dart';

/// The unified staff entry point: the caller's live assignments across event
/// and program scopes and the shell the app should land them in, read
/// through a listener (#1339) on the account's own `hostAssignmentViews`
/// rows instead of `listMyHostAssignments`.
///
/// The rows grant nothing — each destination re-checks its own grant.
abstract interface class HostWorkRepository {
  Stream<HostWorkAssignments> watchAssignments(String uid);
}

class FirebaseHostWorkRepository implements HostWorkRepository {
  const FirebaseHostWorkRepository(this._firestore, this._clock);

  /// One row per programme grant, event grant and team membership; the
  /// callable read at most 128 of each kind.
  static const maxRows = 400;

  final FirebaseFirestore _firestore;
  final AppClock _clock;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load work assignments',
    resource: 'hostAssignmentViews',
  );

  @override
  Stream<HostWorkAssignments> watchAssignments(String uid) {
    final rows = withBackendErrorStream(
      () => _firestore
          .collection('hostAssignmentViews')
          .where('uid', isEqualTo: uid)
          .limit(maxRows)
          .snapshots()
          .map(
            (snapshot) => [
              for (final doc in snapshot.docs)
                Map<Object?, Object?>.from(doc.data()),
            ],
          ),
      context: _context,
    );
    return clockedListener<List<Map<Object?, Object?>>, HostWorkAssignments>(
      rows,
      clock: _clock,
      build: HostWorkAssignments.fromViews,
      nextRebuildAt: (assignments) => assignments.nextChangeAt,
    );
  }
}

// keepalive: account-free: one stateless repository is shared by every work
// route.
@Riverpod(keepAlive: true)
HostWorkRepository hostWorkRepository(Ref ref) => FirebaseHostWorkRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(appClockProvider),
);

/// The caller's live assignments, rebuilt whenever the signed-in account
/// changes so a different OTP session never sees another account's grants.
@riverpod
Stream<HostWorkAssignments> hostWorkAssignments(Ref ref) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    throw const SignInRequiredException('load work assignments');
  }
  return ref.watch(hostWorkRepositoryProvider).watchAssignments(uid);
}
