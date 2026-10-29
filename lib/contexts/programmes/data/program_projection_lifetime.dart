import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/widgets.dart' show AppLifecycleListener;
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_projection_lifetime.g.dart';

@riverpod
DateTime Function() programProjectionClock(Ref ref) => DateTime.now;

/// One exact deadline signal shared by reads and modal projections. Null is
/// reserved for organizer managers; staff projections carry a server deadline.
bool isProgramProjectionActive(DateTime? expiresAt, DateTime now) =>
    expiresAt == null || expiresAt.isAfter(now);

/// Server authority and offline freshness independently bound a visible view.
DateTime? programProjectionDeadline(
  DateTime? accessExpiresAt,
  DateTime? snapshotExpiresAt,
) {
  if (accessExpiresAt == null) return snapshotExpiresAt;
  if (snapshotExpiresAt == null) return accessExpiresAt;
  return accessExpiresAt.isBefore(snapshotExpiresAt)
      ? accessExpiresAt
      : snapshotExpiresAt;
}

@riverpod
bool programProjectionActive(Ref ref, DateTime? expiresAt) {
  if (expiresAt == null) return true;
  // Recheck wall time on resume even if a suspended timer has not fired yet.
  final lifecycle = AppLifecycleListener(
    onResume: () => ref.invalidateSelf(asReload: true),
  );
  ref.onDispose(lifecycle.dispose);
  final remaining = expiresAt.difference(
    ref.watch(programProjectionClockProvider)(),
  );
  if (remaining <= Duration.zero) return false;
  final timer = Timer(remaining, () => ref.invalidateSelf(asReload: true));
  ref.onDispose(timer.cancel);
  return true;
}

/// Rebuilding this dependency clears old data while a narrower view reloads.
void retainProgramProjection(
  Ref ref,
  DateTime? expiresAt, {
  void Function()? onExpiry,
}) {
  if (!ref.mounted) {
    throw const PermissionException(
      'Program access changed. Refresh this view.',
    );
  }
  final provider = programProjectionActiveProvider(expiresAt);
  if (onExpiry != null) {
    ref.listen(provider, (_, active) {
      if (!active) onExpiry();
    });
  }
  if (!ref.watch(provider)) {
    throw const PermissionException(
      'Program access expired. Refresh this view.',
    );
  }
}

const programReadSuperseded = BackendOperationException(
  code: 'program-read-superseded',
  message: 'Program access changed. Refresh to load current work.',
  retryable: true,
  context: BackendErrorContext(
    service: BackendService.functions,
    action: 'load current program work',
  ),
);

/// Keep displayed projections tied to the same authority generation. A change
/// during a successful read requires a new projection too. Failed reads do not
/// reload themselves in response to their own denial and cache invalidation.
Future<T> readWithProgramAuthority<T>(
  Ref ref,
  String accountId,
  String programId,
  Future<T> Function() read, {
  void Function()? onAuthorityChanged,
}) async {
  var delivered = false;
  var changed = false;
  void reload() {
    if (!ref.mounted) return;
    onAuthorityChanged?.call();
    if (ref.mounted) ref.invalidateSelf(asReload: true);
  }

  final cancel = ref.read(programReadSnapshotStoreProvider).listenToGeneration(
    accountId,
    programId,
    () {
      changed = true;
      if (delivered) reload();
    },
  );
  ref.onDispose(cancel);
  try {
    final result = await read();
    if (!ref.mounted) throw programReadSuperseded;
    if (changed) {
      reload();
      throw programReadSuperseded;
    }
    delivered = true;
    return result;
  } on Object {
    cancel();
    rethrow;
  }
}
