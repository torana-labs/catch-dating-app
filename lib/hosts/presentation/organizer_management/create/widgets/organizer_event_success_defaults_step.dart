import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventSuccessDefaultsSection;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class OrganizerEventSuccessDefaultsStep extends StatelessWidget {
  const OrganizerEventSuccessDefaultsStep({
    super.key,
    required this.formKey,
    required this.defaults,
    required this.onChanged,
    this.scrollable = true,
    this.padding,
  });

  final GlobalKey<FormState> formKey;
  final OrganizerHostDefaults defaults;
  final ValueChanged<OrganizerHostDefaults> onChanged;
  final bool scrollable;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final panel = EventSuccessDefaultsSection(
      defaults: defaults.eventSuccessForActivity(defaults.primaryActivityKind),
      activityKind: defaults.primaryActivityKind,
      onChanged: (update) {
        final activityKind = defaults.primaryActivityKind;
        onChanged(
          defaults.copyWithEventSuccessForActivity(
            activityKind: activityKind,
            defaults: update(defaults.eventSuccessForActivity(activityKind)),
          ),
        );
      },
      title: context.l10n.hostsOrganizerEventSuccessDefaultsStepTitleLiveEventGuide,
      subtitle: context
          .l10n
          .hostsOrganizerEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
    );

    return Form(
      key: formKey,
      child: scrollable
          ? ListView(
              padding: padding ?? CatchInsets.formStepBodyWithBottomActions,
              children: [panel],
            )
          : Padding(padding: padding ?? EdgeInsets.zero, child: panel),
    );
  }
}
