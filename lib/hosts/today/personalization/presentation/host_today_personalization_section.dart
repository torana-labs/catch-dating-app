import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_page_body.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostTodayPersonalizationSection extends StatelessWidget {
  const HostTodayPersonalizationSection({
    super.key,
    required this.state,
    required this.onChangeFocus,
    required this.onAction,
  });

  final HostTodayPersonalizationState state;
  final VoidCallback onChangeFocus;
  final ValueChanged<HostTodaySuggestedAction> onAction;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.content(
          title: l10n.hostTodayYourFocus,
          trailing: CatchButton.command(
            key: const ValueKey('host-today-change-focus'),
            label: l10n.hostTodayChangeFocus,
            onPressed: onChangeFocus,
          ),
          child: CatchText(
            state.focus == null
                ? l10n.hostTodayExploreFocus
                : hostTodayFocusTitle(l10n, state.focus!),
            variant: CatchTextVariant.titleL,
          ),
        ),
        if (state.primaryAction case final action?)
          CatchSection.content(
            child: CatchSection.action(
              title: _actionTitle(l10n, action),
              message: _actionBody(l10n, action),
              actionKey: const ValueKey('host-today-suggested-action'),
              actionLabel: _actionLabel(l10n, action),
              onAction: () => onAction(action),
            ),
          ),
        CatchSection.content(
          title: l10n.hostTodayRoadmapTitle,
          child: CatchText(
            l10n.hostTodayRoadmapIntroduction,
            variant: CatchTextVariant.supporting,
          ),
        ),
        CatchSection.rows(
          children: [
            for (final step in state.roadmap)
              CatchField.navigate(
                key: ValueKey('host-today-milestone-${step.milestone.name}'),
                content: CatchRecordLayout(
                  title: _milestoneTitle(l10n, step.milestone),
                  icon: step.progress == HostTodayMilestoneProgress.complete
                      ? CatchIcons.checkCircle
                      : CatchIcons.circle,
                  metadata: !step.enabled
                      ? l10n.hostTodayMilestoneOwnerOnly
                      : switch (step.progress) {
                          HostTodayMilestoneProgress.complete =>
                            l10n.hostTodayMilestoneComplete,
                          HostTodayMilestoneProgress.incomplete =>
                            l10n.hostTodayMilestoneAvailable,
                          HostTodayMilestoneProgress.unknown =>
                            l10n.hostTodayMilestoneUnknown,
                        },
                ),
                states: {if (!step.enabled) WidgetState.disabled},
                onActivate: () => onAction(step.action),
              ),
          ],
        ),
      ],
    );
  }
}

String _milestoneTitle(AppLocalizations l10n, HostTodayMilestone milestone) =>
    switch (milestone) {
      HostTodayMilestone.audience => l10n.hostTodayMilestoneAudience,
      HostTodayMilestone.rehearsal => l10n.hostTodayMilestoneRehearsal,
      HostTodayMilestone.organizerPage => l10n.hostTodayMilestonePage,
      HostTodayMilestone.payouts => l10n.hostTodayMilestonePayouts,
    };

String _actionTitle(AppLocalizations l10n, HostTodaySuggestedAction action) =>
    switch (action) {
      HostTodaySuggestedAction.addCustomer => l10n.hostTodayAddCustomerTitle,
      HostTodaySuggestedAction.openAudience => l10n.hostTodayAudienceTitle,
      HostTodaySuggestedAction.startDressRehearsal =>
        l10n.hostTodayPracticeTitle,
      HostTodaySuggestedAction.openOrganizerPage => l10n.hostTodayPresenceTitle,
      HostTodaySuggestedAction.managePayouts => l10n.hostTodayMilestonePayouts,
    };

String _actionBody(AppLocalizations l10n, HostTodaySuggestedAction action) =>
    switch (action) {
      HostTodaySuggestedAction.addCustomer ||
      HostTodaySuggestedAction.openAudience => l10n.hostTodayAudienceBody,
      HostTodaySuggestedAction.startDressRehearsal =>
        l10n.hostTodayPracticeBody,
      HostTodaySuggestedAction.openOrganizerPage => l10n.hostTodayPresenceBody,
      HostTodaySuggestedAction.managePayouts => l10n.hostTodayPayoutsBody,
    };

String _actionLabel(
  AppLocalizations l10n,
  HostTodaySuggestedAction action,
) => switch (action) {
  HostTodaySuggestedAction.addCustomer => l10n.hostTodayAddCustomerAction,
  HostTodaySuggestedAction.openAudience => l10n.hostTodayAudienceAction,
  HostTodaySuggestedAction.startDressRehearsal => l10n.hostTodayPracticeAction,
  HostTodaySuggestedAction.openOrganizerPage => l10n.hostTodayPresenceAction,
  HostTodaySuggestedAction.managePayouts => l10n.hostTodayPayoutsAction,
};
