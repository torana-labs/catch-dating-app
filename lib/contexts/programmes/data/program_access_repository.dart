import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_gate.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_access_repository.g.dart';

/// Reads the signed-in account's authority over a programme from
/// `programAccessViews`, the trigger-kept mirror of the server's
/// `requireProgramAccess`.
class ProgramAccessRepository {
  const ProgramAccessRepository(this._firestore, this._clock);

  static const collection = 'programAccessViews';

  final FirebaseFirestore _firestore;
  final AppClock _clock;

  /// The account's view of [programId], live. Null while the view does not
  /// exist. Offline the last view this device read is served, so authority
  /// keeps meaning what it meant when the phone last saw it.
  Stream<ProgramAccessView?> watchView(String programId, String uid) =>
      withBackendErrorStream(
        () => _firestore
            .collection(collection)
            .doc('${programId}__$uid')
            .snapshots()
            .map((snapshot) {
              final data = snapshot.data();
              return data == null ? null : ProgramAccessView.fromMap(data);
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load program access',
          resource: collection,
        ),
      );

  /// The account's authority over [programId] against the app clock. It is
  /// rebuilt when the clock reaches the next approval or expiry, with no new
  /// snapshot, so a duty ends on screen at its instant even offline.
  Stream<ProgramAccessState> watchState(String programId, String uid) {
    final tracker = ProgramAccessTracker(programId);
    return clockedListener<ProgramAccessView?, ProgramAccessState>(
      watchView(programId, uid),
      clock: _clock,
      build: (view, now) => tracker.evaluate(view, now),
      nextRebuildAt: (state) => state.view?.nextChangeAfter(state.evaluatedAt),
    );
  }

  /// [data] while the account's authority holds every key in [needs].
  Stream<T> gated<T>(
    String programId,
    String uid, {
    required Set<String> needs,
    required Stream<T> Function(ProgramAccessState state) data,
    Object? Function(ProgramAccessState state)? scopeOf,
    bool Function(ProgramAccessState state)? allows,
  }) => gateByProgramAccess(
    access: watchState(programId, uid),
    data: data,
    needs: needs,
    scopeOf: scopeOf,
    allows: allows,
  );
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
ProgramAccessRepository programAccessRepository(Ref ref) =>
    ProgramAccessRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(appClockProvider),
    );

/// The signed-in account's authority over a programme, rebuilt at each
/// approval or expiry. Programme listeners read through this so cached rows
/// stop at the instant the grant does.
@riverpod
Stream<ProgramAccessState> programAccessState(Ref ref, String programId) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view program work'));
  }
  return ref.watch(programAccessRepositoryProvider).watchState(programId, uid);
}
