import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

int _feedbackSequence = 0;

/// Publishes brief action feedback through the app's bounded notice queue.
/// Stable keys replace repeated queued copies and retain FIFO priority order.
void showCatchNotice(
  BuildContext context,
  String message, {
  String? dedupeKey,
  String? actionLabel,
  VoidCallback? onAction,
  CatchNoticeTone tone = CatchNoticeTone.status,
}) {
  final stableDedupeKey = dedupeKey ?? 'feedback.$tone.$message';
  ProviderScope.containerOf(context, listen: false)
      .read(catchNoticeControllerProvider.notifier)
      .show(
        CatchNoticeData(
          id: 'feedback.${_feedbackSequence++}',
          title: message,
          icon: tone == CatchNoticeTone.success ? CatchIcons.success : null,
          tone: tone,
          actionLabel: actionLabel,
          onAction: onAction,
          dedupeKey: stableDedupeKey,
        ),
      );
}

/// Publishes a localized transient failure and preserves an explicit retry.
void showCatchNoticeError(
  BuildContext context,
  Object error, {
  AppErrorContext errorContext = AppErrorContext.generic,
  VoidCallback? onRetry,
  String? dedupeKey,
}) {
  final descriptor = appErrorDescriptor(
    error,
    l10n: context.l10n,
    context: errorContext,
  );
  final errorDedupeKey = dedupeKey ?? 'feedback.error.${descriptor.message}';
  ProviderScope.containerOf(context, listen: false)
      .read(catchNoticeControllerProvider.notifier)
      .show(
        CatchNoticeData(
          id: 'feedback.${_feedbackSequence++}',
          title: descriptor.title,
          message: descriptor.message,
          icon: descriptor.icon,
          tone: CatchNoticeTone.danger,
          actionLabel: onRetry == null ? null : descriptor.retryLabel,
          onAction: onRetry,
          dedupeKey: errorDedupeKey,
        ),
      );
}

/// Subscribe during the Consumer build branch that owns these mutations.
/// Existing failures are never replayed after rebuilds.
void listenToCatchMutationErrors(
  BuildContext context,
  WidgetRef ref, {
  required List<Mutation<dynamic>> mutations,
  AppErrorContext errorContext = AppErrorContext.generic,
}) {
  for (final mutation in mutations.toSet()) {
    ref.listen(mutation, (previous, current) {
      if (previous?.isPending == true && current is MutationError) {
        showCatchNoticeError(
          context,
          current.error,
          errorContext: errorContext,
        );
      }
    });
  }
}
