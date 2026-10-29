import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessActivityFieldLanes extends StatelessWidget {
  const EventSuccessActivityFieldLanes({
    super.key,
    required this.profile,
    required this.draft,
  });

  final EventSuccessActivityProfile profile;
  final EventSuccessHostDraft draft;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.content(
        copy: catchFieldCopy(context.l10n),
        title: profile.formatLabel,
        body: profile.summary,
        valueText: profile.interactionModel.label,
        icon: CatchIcons.magic,
        actions: CatchBadge(
          label: context.l10n
              .eventSuccessEventSuccessHostSharedLabelLengthSelected(
                length: draft.selectedModules.length,
              ),
        ),
      ),
    );
  }
}
