import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventSuccessDefaultsSection, EventSuccessDefaultsUpdate;
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The live event guide for the organizer main activity. The owner turns
/// it on and tunes the plan through the shared guide setup; a manager
/// reads whether it is on. A failed save says why under it.
class OrganizerLiveGuideBody extends StatelessWidget {
  const OrganizerLiveGuideBody({
    super.key,
    required this.defaults,
    required this.editable,
    required this.onChanged,
    this.errorMessage,
  });

  final OrganizerHostDefaults defaults;

  /// Whether this account owns the organizer and may change the guide.
  final bool editable;
  final ValueChanged<EventSuccessDefaultsUpdate> onChanged;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final activity = defaults.primaryActivityKind;
    final guide = defaults.eventSuccessForActivity(activity);
    final subtitle = l10n
        .hostsOrganizerEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity;
    return CatchPageBody.screen(
      children: [
        if (editable)
          EventSuccessDefaultsSection(
            defaults: guide,
            activityKind: activity,
            onChanged: onChanged,
            title:
                l10n.hostsOrganizerEventSuccessDefaultsStepTitleLiveEventGuide,
            subtitle: subtitle,
          )
        else
          CatchField.read(
            key: const ValueKey<String>('live-guide-read'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostsHostOrganizerEditTabLabelLiveEventGuide,
            body: subtitle,
            valueText: guide.enabled
                ? l10n.hostsHostOrganizerEditTabValueOn
                : l10n.hostsHostOrganizerEditTabValueOff,
            icon: CatchIcons.magic,
          ),
        if (errorMessage case final message?)
          CatchNotice.inline(
            key: const ValueKey<String>('live-guide-error'),
            tone: CatchNoticeTone.danger,
            body: message,
          ),
      ],
    );
  }
}
