import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_error_state.dart';
import 'package:catch_ui/src/patterns/catch_scaffold.dart';
import 'package:flutter/material.dart';

class CatchErrorScaffold extends StatelessWidget {
  const CatchErrorScaffold({
    super.key,
    required this.title,
    required this.message,
    this.onRetry,
    this.retryLabel,
    this.actions = const [],
    this.icon,
    this.backgroundColor,
  }) : assert(
         onRetry == null || retryLabel != null,
         'CatchErrorScaffold requires retryLabel when onRetry is provided.',
       );

  final String title;
  final String message;
  final VoidCallback? onRetry;

  /// Caller-resolved label, required when [onRetry] is supplied.
  final String? retryLabel;
  final List<Widget> actions;

  /// Defaults to [CatchErrorState]'s error icon.
  final IconData? icon;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    return CatchScaffold.standalone(
      backgroundColor: backgroundColor ?? CatchTokens.of(context).bg,
      body: CatchErrorState(
        title: title,
        message: message,
        icon: icon,
        onRetry: onRetry,
        retryLabel: retryLabel,
        actions: actions,
      ),
    );
  }
}
