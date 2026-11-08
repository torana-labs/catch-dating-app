import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The operations outbox as a staff screen reads it: what this phone holds,
/// whether a send is on its way, and the last failure.
@immutable
class StaffOperations {
  const StaffOperations({
    required this.outbox,
    required this.busy,
    this.error,
    this.accountId,
  });

  final ProgramOperationOutboxSummary outbox;

  /// A command or send is on its way, or the outbox has not loaded.
  final bool busy;
  final Object? error;

  /// The signed-in account the outbox belongs to.
  final String? accountId;
}

/// The arrivals roster, dispatch and the door write through the programme's
/// operations outbox: a change made in a dead zone is kept on the phone and
/// replayed with the same operation id. This wires a staff screen to it.
mixin StaffOperationsScreen<T extends ConsumerStatefulWidget>
    on ConsumerState<T> {
  /// The programme whose outbox this screen writes to.
  String get operationsProgramId;

  /// The pickup point whose roster names the refused changes, if any.
  String? get operationsPickupPointId => null;

  /// Watches the outbox and the signed-in account.
  StaffOperations watchOperations() {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = uid.isSettledData ? uid.value : null;
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(operationsProgramId)),
    );
    final current = operations.value;
    return StaffOperations(
      outbox: current?.outbox ?? const ProgramOperationOutboxSummary([]),
      busy: !operations.isSettledData || current == null || current.busy,
      error: operations.error ?? current?.error,
      accountId: accountId,
    );
  }

  /// The controller that queues commands for [accountId].
  ProgramOperationsController? operationsController(String? accountId) =>
      accountId == null
      ? null
      : ref.read(
          programOperationsControllerProvider(
            operationsProgramId,
            accountId,
          ).notifier,
        );

  /// What went wrong, in the words the person reads.
  String? operationsErrorMessage(StaffOperations operations) =>
      switch (operations.error) {
        final error? => appErrorMessage(error, l10n: context.l10n),
        null => null,
      };

  /// Sends what the phone holds now, or reloads the outbox if it never
  /// loaded.
  void syncOperations(StaffOperations operations) {
    final accountId = operations.accountId;
    if (accountId == null) return;
    final provider = programOperationsControllerProvider(
      operationsProgramId,
      accountId,
    );
    if (ref.read(provider).asData == null) {
      ref.invalidate(provider);
    } else {
      unawaited(ref.read(provider.notifier).sync());
    }
  }

  /// Opens the refused changes so the person can drop them.
  void reviewOperations(StaffOperations operations) {
    final accountId = operations.accountId;
    if (accountId == null) return;
    unawaited(
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => ProgramOperationReviewSheet(
          programId: operationsProgramId,
          accountId: accountId,
          pickupPointId: operationsPickupPointId,
        ),
      ),
    );
  }

  /// Save a copy, offered only when the phone could not read its journal.
  VoidCallback? saveCopyOf(StaffOperations operations) {
    final accountId = operations.accountId;
    final error = operations.error;
    if (accountId == null ||
        error is! AppException ||
        !const {
          'local-journal-unavailable',
          'local-journal-quarantined',
        }.contains(error.code)) {
      return null;
    }
    return () => unawaited(
      showCatchBottomSheet<void>(
        context: context,
        builder: (_) => ProgramJournalRecoverySheet(accountId: accountId),
      ),
    );
  }
}
