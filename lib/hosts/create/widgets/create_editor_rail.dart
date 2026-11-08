import 'package:catch_dating_app/contexts/events/parts/event_draft_poster.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_preview.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The desktop editor's step list: numbered rows, the current one selected.
class CreateStepRail extends StatelessWidget {
  const CreateStepRail({super.key, required this.state, required this.onStep});

  final CreateFlowState state;
  final ValueChanged<CreateStep> onStep;

  static const steps = [
    CreateStep.basics,
    CreateStep.when,
    CreateStep.tickets,
    CreateStep.plan,
  ];

  @override
  Widget build(BuildContext context) {
    return CatchSection(
      dividers: CatchSectionPlacement.none,
      children: [
        for (final step in steps)
          CatchIndexRow(
            key: ValueKey<String>('create-rail-${step.name}'),
            leading: CatchMarker.number(step.number),
            title: context.l10n.hostCreateRailTitle(step: step.name),
            subtitle: switch (step) {
              CreateStep.basics => context.l10n.hostCreateRailNoteBasics,
              CreateStep.plan => context.l10n.hostCreateRailNotePlan,
              _ => null,
            },
            selected: step == state.step,
            density: CatchIndexRowSize.compact,
            onTap: state.working ? null : () => onStep(step),
          ),
      ],
    );
  }
}

/// The desktop editor's live preview: the poster as guests will see it,
/// following the form, and what is still to set before publishing.
class CreateEditorPreview extends StatelessWidget {
  const CreateEditorPreview({
    super.key,
    required this.state,
    required this.stillToSet,
  });

  final CreateFlowState state;

  /// What publishing still needs, already in words.
  final List<String> stillToSet;

  @override
  Widget build(BuildContext context) {
    final preview = CreatePreview.of(context, state);
    return CatchStack(
      children: [
        CatchText(
          context.l10n.hostCreateWhatGuestsSee,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        EventDraftPoster(
          draft: state.draft,
          untitled: context.l10n.hostCreateUntitled,
          formatLabel: preview.formatLabel,
          when: preview.when,
          place: preview.place,
          counts: preview.counts,
        ),
        CatchText(
          context.l10n.hostCreatePreviewNote,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchStack(
          gap: CatchStackGap.g4,
          children: [
            CatchText(
              context.l10n.hostCreateStillToSet,
              variant: CatchTextVariant.labelAction,
            ),
            CatchText(
              stillToSet.isEmpty
                  ? context.l10n.hostCreateNothingToSet
                  : stillToSet.join(' · '),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ],
    );
  }
}
