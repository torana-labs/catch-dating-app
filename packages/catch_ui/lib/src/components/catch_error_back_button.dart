import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

/// Canonical exit affordance for terminal error states where retry is not a
/// truthful action (for example a deleted event or an unauthorized route).
class CatchErrorBackButton extends StatelessWidget {
  const CatchErrorBackButton({super.key, this.label, this.onPressed});

  final String? label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return CatchButton(
      label: label ?? MaterialLocalizations.of(context).backButtonTooltip,
      onPressed: onPressed ?? () => Navigator.of(context).maybePop(),
      variant: CatchButtonVariant.secondary,
      leading: Icon(CatchIcons.back),
    );
  }
}
