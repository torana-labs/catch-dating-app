import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostStepperDock extends StatelessWidget {
  const HostStepperDock({
    super.key,
    required this.body,
    required this.isLastStep,
    required this.isLoading,
    required this.onPrimary,
    this.onPrevious,
    this.notice,
    this.primaryLabel,
    this.lastStepLabel = 'Done',
    this.primaryEnabled = true,
    this.primaryIcon,
    this.expandSoloPrimary = false,
  });

  final Widget body;
  final bool isLastStep;
  final bool isLoading;
  final VoidCallback? onPrimary;
  final VoidCallback? onPrevious;
  final Widget? notice;
  final String? primaryLabel;
  final String lastStepLabel;
  final bool primaryEnabled;
  final Widget? primaryIcon;
  final bool expandSoloPrimary;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final label =
        primaryLabel ??
        (isLastStep ? lastStepLabel : context.l10n.hostsStepperFooterLabelNext);
    final previousButton = CatchButton(
      label: context.l10n.hostsWizardPrevious,
      onPressed: isLoading ? null : onPrevious,
      variant: CatchButtonVariant.quiet,
      leading: Icon(CatchIcons.arrowBackRounded),
      foregroundColor: t.primary,
      fullWidth: true,
    );
    final primaryButton = CatchButton(
      label: label,
      onPressed: isLoading || !primaryEnabled ? null : onPrimary,
      status: (isLoading) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      fullWidth: true,
      leading:
          primaryIcon ??
          (isLastStep ? null : Icon(CatchIcons.arrowForwardRounded)),
    );
    final stacksActions =
        onPrevious != null && MediaQuery.textScalerOf(context).scale(1) >= 1.6;

    return CatchBottomActionOverlay(
      body: body,
      meta: notice,
      actions: onPrevious == null && expandSoloPrimary
          ? primaryButton
          : stacksActions
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                primaryButton,
                const SizedBox(height: CatchSpacing.s2),
                previousButton,
              ],
            )
          : Row(
              children: [
                if (onPrevious != null)
                  Expanded(child: previousButton)
                else
                  const Spacer(),
                const SizedBox(width: CatchSpacing.s3),
                Expanded(child: primaryButton),
              ],
            ),
    );
  }
}
