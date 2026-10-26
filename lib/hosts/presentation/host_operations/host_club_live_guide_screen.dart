part of '../host_operations_screen.dart';

class HostClubLiveGuideScreen extends StatelessWidget {
  const HostClubLiveGuideScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context) {
    return HostClubSpokeAsyncBoundary._(
      clubId: clubId,
      title: context.l10n.hostsHostClubEditTabLabelLiveEventGuide,
      builder: (context, club, _, isOwner) {
        final activityKind = club.hostDefaults.primaryActivityKind;
        if (!isOwner) {
          final enabled = club.hostDefaults
              .eventSuccessForActivity(activityKind)
              .enabled;
          return CatchSection.fieldRows(
            first: true,
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostClubEditTabLabelLiveEventGuide,
              body: context
                  .l10n
                  .hostsClubEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
              valueText: enabled
                  ? context.l10n.hostsHostClubEditTabValueOn
                  : context.l10n.hostsHostClubEditTabValueOff,
              icon: CatchIcons.magic,
            ),
          );
        }
        return HostClubDefaultsEditor._(
          club: club,
          builder: (context, defaults, apply, errorMessage, _) {
            final currentActivity = defaults.primaryActivityKind;
            return CatchSectionList(
              emptyStateOmitted: true,
              children: [
                EventSuccessDefaultsSection(
                  defaults: defaults.eventSuccessForActivity(currentActivity),
                  activityKind: currentActivity,
                  onChanged: (update) => apply((current) {
                    final activity = current.primaryActivityKind;
                    return current.copyWithEventSuccessForActivity(
                      activityKind: activity,
                      defaults: update(
                        current.eventSuccessForActivity(activity),
                      ),
                    );
                  }),
                  title: context
                      .l10n
                      .hostsClubEventSuccessDefaultsStepTitleLiveEventGuide,
                  subtitle: context
                      .l10n
                      .hostsClubEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
                ),
                if (errorMessage != null)
                  CatchFieldSupportRow(
                    text: errorMessage,
                    color: CatchTokens.of(context).danger,
                    showErrorIcon: true,
                  ),
              ],
            );
          },
        );
      },
    );
  }
}
