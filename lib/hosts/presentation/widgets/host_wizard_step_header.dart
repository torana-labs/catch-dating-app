import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Shared Host wizard chrome for club and event creation.
class HostWizardStepHeader extends StatelessWidget {
  const HostWizardStepHeader({
    super.key,
    required this.title,
    required this.subtitle,
    required this.currentStep,
    required this.totalSteps,
    this.onClose,
    this.onStepOverview,
    this.isReviewing = false,
  });

  final String title;
  final String? subtitle;
  final int currentStep;
  final int totalSteps;
  final VoidCallback? onClose;
  final VoidCallback? onStepOverview;
  final bool isReviewing;

  @override
  Widget build(BuildContext context) {
    return CatchStepHeader(
      stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
      compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(context.l10n),
      title: title,
      subtitle: subtitle,
      step: isReviewing ? null : currentStep + 1,
      total: isReviewing ? null : totalSteps,
      onBack: onClose,
      leadingType: CatchTopBarNavigationMode.close,
      onStepOverview: isReviewing ? null : onStepOverview,
      stepOverviewSemanticsLabel: isReviewing
          ? null
          : context.l10n.hostsWizardStepOverviewSemantics(
              step: currentStep + 1,
              total: totalSteps,
            ),
    );
  }
}
