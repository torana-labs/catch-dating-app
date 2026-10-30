part of '../host_operations_screen.dart';

class HostOrganizerLiveGuideScreen extends StatelessWidget {
  const HostOrganizerLiveGuideScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context) {
    return HostOrganizerSpokeAsyncBoundary._(
      clubId: clubId,
      title: context.l10n.hostsHostOrganizerEditTabLabelLiveEventGuide,
      builder: (context, organizer, _, isOwner) {
        final activityKind = organizer.hostDefaults.primaryActivityKind;
        if (!isOwner) {
          final enabled = organizer.hostDefaults
              .eventSuccessForActivity(activityKind)
              .enabled;
          return CatchSection.fieldRows(
            first: true,
            child: CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsHostOrganizerEditTabLabelLiveEventGuide,
              body: context
                  .l10n
                  .hostsOrganizerEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
              valueText: enabled
                  ? context.l10n.hostsHostOrganizerEditTabValueOn
                  : context.l10n.hostsHostOrganizerEditTabValueOff,
              icon: CatchIcons.magic,
            ),
          );
        }
        return HostOrganizerDefaultsEditor._(
          organizer: organizer,
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
                      .hostsOrganizerEventSuccessDefaultsStepTitleLiveEventGuide,
                  subtitle: context
                      .l10n
                      .hostsOrganizerEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
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
