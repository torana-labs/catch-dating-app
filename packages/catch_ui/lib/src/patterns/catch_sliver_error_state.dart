import 'package:catch_ui/src/components/catch_error_state.dart';
import 'package:catch_ui/src/patterns/catch_state_viewport.dart';
import 'package:flutter/material.dart';

class CatchSliverErrorState extends StatelessWidget {
  const CatchSliverErrorState({
    super.key,
    required this.title,
    required this.message,
    this.onRetry,
    this.retryLabel,
    this.actions = const [],
    this.icon,
    this.fillRemaining = true,
  }) : assert(
         onRetry == null || retryLabel != null,
         'CatchSliverErrorState requires retryLabel when onRetry is provided.',
       );

  final String title;
  final String message;
  final VoidCallback? onRetry;

  /// Caller-resolved label, required when [onRetry] is supplied.
  final String? retryLabel;
  final List<Widget> actions;

  /// Defaults to [CatchErrorState]'s error icon.
  final IconData? icon;
  final bool fillRemaining;

  @override
  Widget build(BuildContext context) {
    final child = CatchErrorState(
      title: title,
      message: message,
      icon: icon,
      onRetry: onRetry,
      retryLabel: retryLabel,
      actions: actions,
    );

    if (fillRemaining) {
      return CatchStateViewport.sliver(child: child);
    }

    return SliverToBoxAdapter(child: child);
  }
}
