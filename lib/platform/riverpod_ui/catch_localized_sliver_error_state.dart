import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Resolves app errors and inherited-locale copy for [CatchSliverErrorState].
class CatchLocalizedSliverErrorState extends StatelessWidget {
  const CatchLocalizedSliverErrorState(
    this.error, {
    super.key,
    AppErrorContext context = AppErrorContext.generic,
    this.onRetry,
    this.retryLabel,
    this.icon,
    this.actions = const [],
    this.fillRemaining = true,
  }) : errorContext = context;

  final Object error;
  final AppErrorContext errorContext;
  final VoidCallback? onRetry;
  final String? retryLabel;
  final IconData? icon;
  final List<Widget> actions;
  final bool fillRemaining;

  @override
  Widget build(BuildContext context) {
    final descriptor = appErrorDescriptor(
      error,
      l10n: context.l10n,
      context: errorContext,
    );
    return CatchSliverErrorState(
      title: descriptor.title,
      message: descriptor.message,
      icon: icon ?? descriptor.icon,
      // An explicit caller recovery remains authoritative even when the
      // descriptor cannot infer that this operation is retryable.
      onRetry: onRetry,
      retryLabel: retryLabel ?? descriptor.retryLabel,
      actions: actions,
      fillRemaining: fillRemaining,
    );
  }
}
