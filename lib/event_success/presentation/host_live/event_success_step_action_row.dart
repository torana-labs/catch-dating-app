import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_run_of_show_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessStepActionRow extends StatelessWidget {
  const EventSuccessStepActionRow({
    super.key,
    required this.plan,
    required this.onPrevious,
    required this.onNext,
    this.primaryLabel,
    this.accentColor,
    this.isLoading = false,
  });

  final EventSuccessLivePlan plan;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final String? primaryLabel;
  final Color? accentColor;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final nextLabel =
        primaryLabel ??
        (plan.activeStepIndex >= plan.steps.length - 1
            ? context.l10n.eventSuccessEventSuccessHostLiveVisiblecopyFinalStep
            : context.l10n.eventSuccessEventSuccessHostLiveVisiblecopyNextTitle(
                title: eventSuccessRunOfShowStepLabel(
                  context,
                  plan,
                  plan.activeStepIndex + 1,
                ),
              ));
    return CatchDock.primaryContent(
      label: nextLabel,
      onPressed: onNext,
      isLoading: isLoading,
      buttonAccentColor: accentColor,
      buttonKey: ValueKey(
        context
            .l10n
            .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccessnextstepbutton,
      ),
      leading: CatchIconAction.icon(
        key: ValueKey(
          context
              .l10n
              .eventSuccessEventSuccessHostLiveCatchbuttonEventsuccesspreviousstepbutton,
        ),
        icon: CatchIcons.back,
        onPressed: onPrevious,
        tooltip: context.l10n.eventSuccessEventSuccessHostLiveLabelPrevious,
      ),
    );
  }
}
