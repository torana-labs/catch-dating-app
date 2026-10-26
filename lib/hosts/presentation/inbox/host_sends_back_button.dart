import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostSendsBackButton extends StatelessWidget {
  const HostSendsBackButton({super.key, required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: CatchButton(
      label: context.l10n.hostMessagingWorkspaceSends,
      variant: CatchButtonVariant.quiet,
      onPressed: onPressed,
    ),
  );
}
