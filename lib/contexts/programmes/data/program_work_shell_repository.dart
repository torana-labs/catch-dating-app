import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_work_shell.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_work_shell_repository.g.dart';

/// The work shell's access, read through listeners: the account's access
/// view, the programme's work summary and the pickup point, hotel and
/// function labels its work lists reach. Replaces the
/// `getProgramWorkAccess` callable. The whole read is gated on the account's
/// authority, so offline rows stop at the instant a duty or the grant does.
class ProgramWorkShellRepository {
  const ProgramWorkShellRepository(this._firestore, this._access, this._clock);

  static const summaries = 'programWorkSummaries';
  static const resources = 'programResourceViews';

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _context = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load program work',
    resource: resources,
  );

  Stream<ProgramWorkAccess> watchWorkAccess(String programId, String uid) =>
      _access.gated<ProgramWorkAccess>(
        programId,
        uid,
        needs: const {},
        scopeOf: (state) => state.view!.workScopeKey,
        data: (state) {
          final access = state.view!;
          return combineLatest<
            ({
              Map<Object?, Object?> summary,
              List<Map<Object?, Object?>> pickups,
              List<Map<Object?, Object?>> hotels,
            }),
            List<Map<Object?, Object?>>,
            ProgramWorkAccess
          >(
            combineLatest(
              combineLatest(
                _summary(programId),
                watchResources(
                  programId,
                  'pickupPoint',
                  access.workPickup,
                  access,
                  activeOnly: true,
                ),
                (summary, pickups) => (summary: summary, pickups: pickups),
              ),
              watchResources(
                programId,
                'hotel',
                access.workHotel,
                access,
                activeOnly: true,
              ),
              (partial, hotels) => (
                summary: partial.summary,
                pickups: partial.pickups,
                hotels: hotels,
              ),
            ),
            watchResources(
              programId,
              'function',
              access.workFunction,
              access,
              activeOnly: false,
            ),
            (partial, functions) => programWorkAccessFromViews(
              access: access,
              summary: partial.summary,
              pickupPoints: partial.pickups,
              hotels: partial.hotels,
              functions: functions,
            ),
          );
        },
      );

  Stream<Map<Object?, Object?>> _summary(String programId) =>
      withBackendErrorStream(
        () => _firestore
            .collection(summaries)
            .doc(programId)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.data() ??
                  (throw const DocumentNotFoundException('program work')),
            ),
        context: _context,
      );

  /// One kind of resource label: a query for all of them when the account's
  /// work list reaches every one (the `*` key, or the owner), otherwise one
  /// listener per named id, since a scoped account may read only those.
  Stream<List<Map<Object?, Object?>>> watchResources(
    String programId,
    String kind,
    Map<String, DateTime> workList,
    ProgramAccessView access, {
    required bool activeOnly,
  }) {
    final now = _clock.now();
    final listsAll =
        access.isManager ||
        (workList[ProgramAccessView.allKey]?.isAfter(now) ?? false);
    if (listsAll) {
      Query<Map<String, dynamic>> query = _firestore
          .collection(resources)
          .where('programId', isEqualTo: programId)
          .where('kind', isEqualTo: kind);
      if (activeOnly) query = query.where('active', isEqualTo: true);
      return withBackendErrorStream(
        // A programme's pickup points, hotels or functions are a small set.
        () => query
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snapshot) => [for (final doc in snapshot.docs) doc.data()]),
        context: _context,
      );
    }
    final ids = [
      for (final entry in workList.entries)
        if (entry.key != ProgramAccessView.allKey && entry.value.isAfter(now))
          entry.key,
    ]..sort();
    if (ids.isEmpty) return Stream.value(const []);
    return _all([
      for (final id in ids)
        withBackendErrorStream(
          () => _firestore
              .collection(resources)
              .doc('${programId}__${kind}__$id')
              .snapshots()
              .map(
                (snapshot) => snapshot.data() == null
                    ? null
                    : snapshot.data()! as Map<Object?, Object?>,
              ),
          context: _context,
        ),
    ]).map((rows) => [for (final row in rows) ?row]);
  }
}

/// The latest value of every stream, once each has delivered.
Stream<List<T>> _all<T>(List<Stream<T>> streams) {
  var combined = streams.first.map((value) => [value]);
  for (final next in streams.skip(1)) {
    combined = combineLatest<List<T>, T, List<T>>(
      combined,
      next,
      (list, value) => [...list, value],
    );
  }
  return combined;
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
ProgramWorkShellRepository programWorkShellRepository(Ref ref) =>
    ProgramWorkShellRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

/// The signed-in account's work access for a programme, live.
@riverpod
Stream<ProgramWorkAccess> programWorkAccessStream(Ref ref, String programId) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    return Stream.error(const SignInRequiredException('view program work'));
  }
  return ref
      .watch(programWorkShellRepositoryProvider)
      .watchWorkAccess(programId, uid);
}

/// The next work access of [programId], which callable-reading screens bind
/// their offline snapshots to: each delivery refreshes the saved work access
/// they read, and a denial clears the programme's saved projections, as a
/// denied callable did.
Future<ProgramWorkAccess> readWorkAccessSavingSnapshot(
  Ref ref,
  String accountId,
  String programId,
) async {
  final store = ref.read(programReadSnapshotStoreProvider);
  final ProgramWorkAccess access;
  try {
    access = await ref.watch(programWorkAccessStreamProvider(programId).future);
  } on AppException catch (error) {
    if (error is PermissionException ||
        error is SignInRequiredException ||
        error is DocumentNotFoundException) {
      await store.clearProgram(accountId, programId);
    }
    rethrow;
  }
  await store.save(
    accountId,
    programSnapshotScope('work', programId),
    access.toCallableData(),
  );
  return access;
}
