import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventSuccessDefaultsSection;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class ClubEventSuccessDefaultsStep extends StatelessWidget {
  const ClubEventSuccessDefaultsStep({
    super.key,
    required this.formKey,
    required this.defaults,
    required this.onChanged,
    this.scrollable = true,
    this.padding,
  });

  final GlobalKey<FormState> formKey;
  final ClubHostDefaults defaults;
  final ValueChanged<ClubHostDefaults> onChanged;
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
      title: context.l10n.hostsClubEventSuccessDefaultsStepTitleLiveEventGuide,
      subtitle: context
          .l10n
          .hostsClubEventSuccessDefaultsStepSubtitleNewEventsStartWithAReadyToRunPlanForThisActivity,
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
