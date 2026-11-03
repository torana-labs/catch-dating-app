import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';

/// Returns a user-facing error message for a mutation in error state.
///
/// Usage:
/// ```dart
/// if (mutation.hasError)
///   CatchBanner.error(message: mutationErrorMessage(mutation)),
/// ```
///
/// Prefer `CatchLocalizedErrorBanner.mutation` for new inline mutation error surfaces.
String mutationErrorMessage(
  MutationState mutation, {
  required AppLocalizations l10n,
  AppErrorContext context = AppErrorContext.generic,
}) {
  if (!mutation.hasError) return '';
  return appErrorMessage(
    (mutation as MutationError).error,
    l10n: l10n,
    context: context,
  );
}
