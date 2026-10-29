import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';

/// Resolves app errors and retry copy at the caller's localization boundary.
class CatchLocalizedErrorBanner extends StatelessWidget {
  const CatchLocalizedErrorBanner(
    Object error, {
    super.key,
    AppErrorContext context = AppErrorContext.generic,
    this.onRetry,
  }) : _error = error,
       _mutation = null,
       errorContext = context;

  /// Inline mutation failure; the caller retains watching and action ownership.
  const CatchLocalizedErrorBanner.mutation({
    super.key,
    required MutationState<dynamic> this._mutation,
    AppErrorContext context = AppErrorContext.generic,
    this.onRetry,
  }) : _error = null,
       errorContext = context;

  final Object? _error;
  final MutationState<dynamic>? _mutation;
  final AppErrorContext errorContext;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final mutation = _mutation;
    final error = mutation == null
        ? _error
        : mutation is MutationError
        ? mutation.error
        : null;
    if (error == null) return const SizedBox.shrink();
    final descriptor = appErrorDescriptor(
      error,
      l10n: context.l10n,
      context: errorContext,
    );
    return CatchBanner.errorWithRetry(
      message: descriptor.message,
      retryLabel: context.l10n.coreCatchErrorBannerLabelTryAgain,
      // Caller recovery is authoritative; metadata cannot infer every action.
      onRetry: onRetry,
    );
  }
}
