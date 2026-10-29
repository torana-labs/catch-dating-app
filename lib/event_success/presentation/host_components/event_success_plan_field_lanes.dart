import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessPlanFieldLanes extends StatelessWidget {
  const EventSuccessPlanFieldLanes({
    super.key,
    required this.plan,
    required this.draft,
    required this.planIsPersisted,
  });

  final EventSuccessPlan plan;
  final EventSuccessHostDraft draft;
  final bool planIsPersisted;

  @override
  Widget build(BuildContext context) {
    final ready = draft.status == EventSuccessSetupStatus.readyForLaunch;
    return CatchFieldLanes.single(
      child: CatchField.content(
        copy: catchFieldCopy(context.l10n),
        title: draft.playbook.title,
        body: context.l10n.eventSuccessEventSuccessHostSharedLabelLengthTools(
          length: draft.selectedModules.length,
        ),
        actions: CatchBadge(
          label: planIsPersisted
              ? draft.status.label
              : context.l10n.eventSuccessEventSuccessHostSharedLabelNotSaved,
          tone: planIsPersisted
              ? (ready ? CatchBadgeTone.success : CatchBadgeTone.warning)
              : CatchBadgeTone.warning,
        ),
        icon: CatchIcons.rules,
      ),
    );
  }
}
