import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';

typedef ProgramReadView<T> = ({
  T value,
  DateTime? snapshotAt,
  DateTime? snapshotExpiresAt,
});

/// A saved projection is usable only during connectivity failures, within its
/// cache lifetime and the last verified grant, for the same signed-in account.
Future<ProgramReadView<T>> readProgramWithSnapshot<T>({
  required String accountId,
  required String programId,
  required String scope,
  required ProgramReadSnapshotStore store,
  required bool Function() isCurrentAccount,
  bool Function()? isCurrentRead,
  required Future<T> Function() live,
  required T Function(Object?) parse,
  // Repository calls purge before rechecking canonical work access. A second
  // purge here would erase that fresh authority. Standalone readers own their
  // invalidation by default; account changes always invalidate locally too.
  bool liveOwnsAccessInvalidation = false,
  bool Function(ProgramWorkAccess)? allowsAccess,
  DateTime Function()? now,
}) async {
  void requireAccount() {
    if (isCurrentRead?.call() == false) throw programReadSuperseded;
    if (!isCurrentAccount()) {
      throw const SignInRequiredException('view program work');
    }
  }

  requireAccount();
  try {
    final value = await live();
    requireAccount();
    return (value: value, snapshotAt: null, snapshotExpiresAt: null);
  } on AppException catch (error) {
    if (isCurrentRead?.call() == false) throw programReadSuperseded;
    if (error is PermissionException ||
        error is SignInRequiredException ||
        error is DocumentNotFoundException) {
      if (!liveOwnsAccessInvalidation ||
          error is SignInRequiredException ||
          !isCurrentAccount()) {
        await store.clearProgram(accountId, programId);
      }
      rethrow;
    }
    if (error is! NetworkException ||
        !{'connection-failed', 'timeout', 'offline'}.contains(error.code)) {
      rethrow;
    }
    requireAccount();
    final generation = store.generation(accountId, programId);
    final work = await store.load(
      accountId,
      programSnapshotScope('work', programId),
    );
    if (work == null) rethrow;
    final access = ProgramWorkAccess.fromCallableData(work.data);
    bool grantIsCurrent() {
      final instant = (now ?? DateTime.now)();
      return access.programId == programId &&
          (access.isManager ||
              (access.grantExpiresAt != null &&
                  access.grantExpiresAt!.isAfter(instant) &&
                  access.activeDutiesAt(instant).isNotEmpty));
    }

    if (generation != store.generation(accountId, programId)) rethrow;
    if (!grantIsCurrent()) {
      await store.clearProgram(accountId, programId);
      rethrow;
    }
    // One expired duty must not erase other, independently valid work access.
    if (allowsAccess != null && !allowsAccess(access)) rethrow;
    final snapshot = await store.load(accountId, scope);
    if (snapshot == null) rethrow;
    // Offline access is bounded by both the authority and projection capture.
    final oldestCapture = work.savedAt.isBefore(snapshot.savedAt)
        ? work.savedAt
        : snapshot.savedAt;
    final snapshotExpiresAt = oldestCapture.add(
      ProgramReadSnapshotStore.maxAge,
    );
    final instant = (now ?? DateTime.now)();
    if (!snapshotExpiresAt.isAfter(instant) ||
        work.savedAt.isAfter(instant) ||
        snapshot.savedAt.isAfter(instant)) {
      rethrow;
    }
    final payload = requiredMap(snapshot.data, 'saved program data');
    if (payload['programId'] != programId) rethrow;
    requireAccount();
    // Loading the projection yields: authority may narrow or expire meanwhile.
    if (generation != store.generation(accountId, programId) ||
        !grantIsCurrent() ||
        (allowsAccess != null && !allowsAccess(access))) {
      rethrow;
    }
    return (
      value: parse(payload),
      snapshotAt: snapshot.savedAt,
      snapshotExpiresAt: snapshotExpiresAt,
    );
  }
}
