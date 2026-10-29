import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/dispatch_manifest.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operation_projection.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_operations_controller.g.dart';

class ProgramOperationsState {
  const ProgramOperationsState({
    this.outbox = const ProgramOperationOutboxSummary([]),
    this.busy = false,
    this.error,
  });
  final ProgramOperationOutboxSummary outbox;
  final bool busy;
  final Object? error;

  bool get hasStatus => outbox.entries.isNotEmpty || error != null;
}

/// The wrapper switches family instances immediately when the account changes.
@riverpod
AsyncValue<ProgramOperationsState> programOperationsState(
  Ref ref,
  String programId,
) {
  final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
  final uid = uidState.isSettledData ? uidState.value : null;
  if (uid == null || uid.isEmpty) {
    return AsyncError(
      const SignInRequiredException('manage program work'),
      StackTrace.current,
    );
  }
  return ref.watch(programOperationsControllerProvider(programId, uid));
}

@riverpod
class ProgramOperationsController extends _$ProgramOperationsController {
  bool _syncRequested = false;

  @override
  Future<ProgramOperationsState> build(
    String programId,
    String accountId,
  ) async {
    ref.listen(isObviouslyOfflineProvider, (previous, offline) {
      if (previous == true && !offline && state.asData != null) {
        if (state.asData!.value.busy) {
          _syncRequested = true;
        } else {
          unawaited(sync());
        }
      }
    });
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != accountId) {
        state = const AsyncData(
          ProgramOperationsState(
            error: SignInRequiredException('manage program work'),
          ),
        );
      }
    });
    final outbox = await ref
        .read(programOperationsOutboxProvider)
        .loadForProgram(accountId: accountId, programId: programId);
    _requireAccount();
    if (ref.read(isObviouslyOfflineProvider)) {
      return ProgramOperationsState(outbox: outbox);
    }
    try {
      final synced = await ref
          .read(programOperationsOutboxProvider)
          .flushProgram(accountId: accountId, programId: programId);
      _requireAccount();
      if (outbox.pendingCount != synced.pendingCount) _refreshReads();
      return ProgramOperationsState(outbox: synced);
    } on Object catch (error) {
      _requireAccount();
      final preserved = await _loadOutboxOr(outbox);
      _requireAccount();
      if (outbox.pendingCount != preserved.pendingCount) _refreshReads();
      return ProgramOperationsState(outbox: preserved, error: error);
    }
  }

  bool get _current =>
      ref.mounted && ref.read(uidProvider).asData?.value == accountId;

  void _requireAccount() {
    if (!_current) {
      throw const SignInRequiredException('manage program work');
    }
  }

  void _refreshReads() {
    ref.invalidate(programArrivalsRosterProvider);
    ref.invalidate(programTransportPlanProvider);
    ref.invalidate(programTripListProvider);
    ref.invalidate(programFunctionDoorViewProvider);
  }

  Future<bool> _run(
    Future<ProgramOperationOutboxSummary> Function(
      ProgramOperationOutboxSummary current,
    )
    action,
  ) async {
    if (!_current) return false;
    final current = state.asData?.value;
    if (current == null || current.busy) return false;
    state = AsyncData(
      ProgramOperationsState(outbox: current.outbox, busy: true),
    );
    try {
      final result = await action(current.outbox);
      _requireAccount();
      state = AsyncData(ProgramOperationsState(outbox: result));
      _refreshReads();
      return true;
    } on Object catch (error) {
      if (!_current) return false;
      final preserved = await _loadOutboxOr(current.outbox);
      if (_current) {
        state = AsyncData(
          ProgramOperationsState(outbox: preserved, error: error),
        );
        _refreshReads();
      }
      return false;
    } finally {
      if (_syncRequested && _current) {
        _syncRequested = false;
        unawaited(sync());
      }
    }
  }

  Future<ProgramOperationOutboxSummary> _loadOutboxOr(
    ProgramOperationOutboxSummary fallback,
  ) async {
    try {
      return await ref
          .read(programOperationsOutboxProvider)
          .loadForProgram(accountId: accountId, programId: programId);
    } on Object {
      // Keep the last visible queue if storage is temporarily unavailable.
      return fallback;
    }
  }

  Future<ProgramOperationOutboxSummary> _enqueue(
    ProgramOperationOutboxEntry entry,
  ) async {
    final result = await ref
        .read(programOperationsOutboxProvider)
        .enqueueAndAttempt(
          accountId: accountId,
          offline: ref.read(isObviouslyOfflineProvider),
          entry: entry,
        );
    if (result.entries.any(
      (saved) =>
          saved.clientOperationId == entry.clientOperationId &&
          saved.status == ProgramOperationOutboxStatus.needsReview,
    )) {
      throw const ValidationException(
        'This saved operation needs review before it can be recorded.',
        code: 'program-operation-needs-review',
      );
    }
    return result;
  }

  Future<bool> sync() => _run(
    (_) => ref
        .read(programOperationsOutboxProvider)
        .flushProgram(accountId: accountId, programId: programId),
  );

  Future<bool> dismissReview(String commandId) => _run(
    (_) => ref
        .read(programOperationsOutboxProvider)
        .clearNeedsReview(
          accountId: accountId,
          programId: programId,
          commandId: commandId,
        ),
  );

  Future<bool> observe(
    ArrivalsRosterRow row,
    String action, {
    String? manualCurbNote,
  }) => _run((outbox) {
    final projected = projectProgramArrival(row, outbox);
    if (projected.blocked) {
      throw const ValidationException(
        'Review this journey before recording more work.',
        code: 'program-operation-needs-review',
      );
    }
    final now = DateTime.now();
    return _enqueue(
      ProgramOperationOutboxEntry.legObservation(
        programId: programId,
        legId: row.legId,
        action: action,
        clientOperationId: 'arrival_${now.microsecondsSinceEpoch}_$action',
        createdAt: now,
        expectedRevision: row.revision,
        afterObservation: projected.afterObservation,
        manualCurbNote: manualCurbNote,
      ),
    );
  });

  Future<bool> dispatch({
    required ProgramArrivalsRoster roster,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
  }) => _run((outbox) {
    if (roster.programId != programId) {
      throw const ValidationException(
        'The manifest belongs to another program.',
        code: 'program-manifest-reload-required',
      );
    }
    final fences = captureDispatchLegRevisions(roster, legIds, outbox: outbox);
    final now = DateTime.now();
    return _enqueue(
      ProgramOperationOutboxEntry.dispatch(
        programId: programId,
        pickupPointId: pickupPointId,
        vehicleClassId: vehicleClassId,
        plateDisplay: plateDisplay,
        legIds: legIds,
        destinationHotelId: destinationHotelId,
        destinationLabel: destinationLabel,
        vendorId: vendorId,
        expectedLegRevisions: fences,
        clientOperationId: 'dispatch_${now.microsecondsSinceEpoch}',
        createdAt: now,
      ),
    );
  });

  /// Queues one door journal action. The server folds it through the durable
  /// journal, so a retry of this entry reports `duplicate` harmlessly.
  Future<bool> doorAction({
    required String functionId,
    required String guestId,
    required String action,
    int? partySize,
    String? note,
  }) => _run((outbox) {
    final pending = outbox.forDoorGuest(functionId, guestId);
    if (pending != null &&
        pending.status == ProgramOperationOutboxStatus.needsReview) {
      throw const ValidationException(
        'Review this guest before recording more door activity.',
        code: 'program-operation-needs-review',
      );
    }
    final now = DateTime.now();
    return _enqueue(
      ProgramOperationOutboxEntry.doorAction(
        programId: programId,
        functionId: functionId,
        guestId: guestId,
        action: action,
        partySize: partySize,
        note: note,
        clientOperationId:
            'door_${now.microsecondsSinceEpoch}_${action}_$guestId',
        createdAt: now,
      ),
    );
  });

  /// Queues a walk-in registration; the guest id derives from the operation
  /// id server-side, so replays return the original guest.
  Future<bool> walkIn({
    required String functionId,
    required String displayName,
    int? partySize,
    String? note,
  }) => _run((outbox) {
    final now = DateTime.now();
    return _enqueue(
      ProgramOperationOutboxEntry.walkIn(
        programId: programId,
        functionId: functionId,
        displayName: displayName,
        partySize: partySize,
        note: note,
        clientOperationId: 'walkin_${now.microsecondsSinceEpoch}',
        createdAt: now,
      ),
    );
  });
}
