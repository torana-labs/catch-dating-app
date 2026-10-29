import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'preview.dart';

@widgetbook.UseCase(
  name: "EventSuccessSetupBody",
  type: EventSuccessSetupBody,
  path:
      "[P1 product surfaces]/Event Success strict coverage/Setup body folded states",
)
Widget eventSuccessStrictEventSuccessSetupBody(BuildContext context) {
  final unitKind = context.knobs.object.dropdown<EventSuccessUnitKind>(
    label: "Unit kind",
    options: EventSuccessUnitKind.values,
    initialOption: EventSuccessUnitKind.wholeGroup,
    labelBuilder: (value) => value.label,
  );
  final microPods = context.knobs.boolean(
    label: "Small starter groups",
    initialValue: true,
  );
  final rotations = context.knobs.boolean(label: "Timed partner rotations");
  final reveal = context.knobs.boolean(label: "Synchronized partner reveal");
  final questionnaire = context.knobs.boolean(label: "Match clue questions");

  return StrictCoverageScaffold(
    componentName: "EventSuccessSetupBody",
    child: _SetupBodyKnobPreview(
      key: ValueKey(
        "${unitKind.name}-$microPods-$rotations-$reveal-$questionnaire",
      ),
      unitKind: unitKind,
      microPods: microPods,
      rotations: rotations,
      reveal: reveal,
      questionnaire: questionnaire,
    ),
  );
}

@widgetbook.UseCase(
  name: "Within setup body",
  type: EventSuccessModuleList,
  path:
      "[P1 product surfaces]/Event Success strict coverage/Setup body folded states",
)
Widget eventSuccessStrictEventSuccessModuleRows(BuildContext context) =>
    eventSuccessStrictEventSuccessSetupBody(context);

class _SetupBodyKnobPreview extends StatefulWidget {
  const _SetupBodyKnobPreview({
    super.key,
    required this.unitKind,
    required this.microPods,
    required this.rotations,
    required this.reveal,
    required this.questionnaire,
  });

  final EventSuccessUnitKind unitKind;
  final bool microPods;
  final bool rotations;
  final bool reveal;
  final bool questionnaire;

  @override
  State<_SetupBodyKnobPreview> createState() => _SetupBodyKnobPreviewState();
}

class _SetupBodyKnobPreviewState extends State<_SetupBodyKnobPreview> {
  late EventSuccessHostDraft _draft = _initialDraft();
  String _attendeePrompt =
      "Notice who arrived solo and make the first hello easy.";

  @override
  Widget build(BuildContext context) {
    return EventSuccessSetupBody(
      draft: _draft,
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.socialRun),
      targetAttendeeCount: 24,
      attendeePrompt: _attendeePrompt,
      onChanged: (update) => setState(() => _draft = update(_draft)),
      onAttendeePromptChanged: (next) => setState(() => _attendeePrompt = next),
      showResetToRecommended: true,
      onResetToRecommended: () => setState(() => _draft = _initialDraft()),
    );
  }

  EventSuccessHostDraft _initialDraft() {
    var draft = EventSuccessHostDraft.fromPlaybook(
      EventSuccessPlaybookLibrary.socialRun,
      targetAttendeeCount: 24,
    );
    for (final selection in <(String, bool)>[
      (EventSuccessModuleCatalog.microPods.id, widget.microPods),
      (EventSuccessModuleCatalog.guidedRotations.id, widget.rotations),
      (EventSuccessModuleCatalog.liveReveal.id, widget.reveal),
      (
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
        widget.questionnaire,
      ),
    ]) {
      draft = draft.withModuleSelection(selection.$1, selection.$2);
    }
    return draft.copyWith(
      structureConfig: EventSuccessStructureConfig(
        unitKind: widget.unitKind,
        unitSize: switch (widget.unitKind) {
          EventSuccessUnitKind.wholeGroup => 24,
          EventSuccessUnitKind.pairs => 2,
          _ => 4,
        },
        unitCount: widget.unitKind == EventSuccessUnitKind.wholeGroup
            ? 1
            : null,
        rotationIntervalMinutes: widget.rotations ? 15 : null,
        revealCountdownSeconds: widget.reveal ? 10 : 0,
      ),
    );
  }
}
