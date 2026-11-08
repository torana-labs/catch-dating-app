import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/parts/event_plan_step_row.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Step four in board order: what the plan does, Start from the format's
/// template or blank, the steps with their times, and Add a step.
class CreatePlanBody extends StatelessWidget {
  const CreatePlanBody({
    super.key,
    required this.state,
    required this.onTemplate,
    required this.onBlank,
    required this.onEdit,
    required this.onAdd,
    this.onPlanVisible,
    this.showTitle = false,
  });

  final CreateFlowState state;
  final VoidCallback onTemplate;
  final VoidCallback onBlank;
  final ValueChanged<EventItineraryItem> onEdit;
  final VoidCallback onAdd;

  /// Guests see the plan; null hides the switch.
  final ValueChanged<bool>? onPlanVisible;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    final format = state.format ?? CreateFormat.other;
    final steps = state.plan;
    final start = createMinutes(state.draft.eventLocalStartTime);
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        if (showTitle)
          CatchText(
            context.l10n.hostCreateStepTitle(step: CreateStep.plan.name),
            variant: CatchTextVariant.displaySection,
          ),
        CatchText(
          context.l10n.hostCreatePlanIntro,
          tone: CatchTextTone.secondary,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          align: CatchStackAlign.center,
          wrap: true,
          children: [
            CatchText(
              context.l10n.hostCreateStartFrom,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
            CatchChip.choice(
              key: const ValueKey<String>('create-plan-template'),
              label: context.l10n.hostCreateTemplate(format: format.name),
              selected: steps.isNotEmpty,
              mode: CatchChipMode.single,
              size: CatchChipSize.sm,
              onPressed: onTemplate,
            ),
            CatchChip.choice(
              key: const ValueKey<String>('create-plan-blank'),
              label: context.l10n.hostCreateBlank,
              selected: steps.isEmpty,
              mode: CatchChipMode.single,
              size: CatchChipSize.sm,
              onPressed: onBlank,
            ),
          ],
        ),
        if (steps.isNotEmpty)
          CatchSection(
            children: [
              for (final step in steps)
                EventPlanStepRow(
                  key: ValueKey<String>('create-plan-step-${step.id}'),
                  step: step,
                  eventStartMinutes: start,
                  subtitle: switch (step.description) {
                    final String note when note.isNotEmpty =>
                      context.l10n.hostCreateStepMinutesNote(
                        minutes: step.durationMinutes ?? 0,
                        note: note,
                      ),
                    _ => context.l10n.hostCreateStepMinutes(
                      minutes: step.durationMinutes ?? 0,
                    ),
                  },
                  editLabel: context.l10n.hostCreateEditStepLabel(
                    title: step.title,
                  ),
                  onEdit: () => onEdit(step),
                ),
            ],
          ),
        CatchChoiceTile(
          key: const ValueKey<String>('create-plan-add'),
          variant: CatchChoiceTileVariant.add,
          title: context.l10n.hostCreateAddStep,
          contract: CatchContractConstraints
              .updatePrivateEventDetailsCallablePayloadDetailsItinerary,
          onTap: onAdd,
        ),
        if (onPlanVisible != null)
          CatchIndexRow(
            title: context.l10n.hostCreatePlanVisible,
            subtitle: context.l10n.hostCreatePlanVisibleBody,
            onTap: null,
            trailing: CatchToggleInput(
              key: const ValueKey<String>('create-plan-visible'),
              value: state.planVisible,
              semanticLabel: context.l10n.hostCreatePlanVisible,
              contractExemption: 'An event detail saved when it publishes.',
              onChanged: onPlanVisible,
            ),
          ),
      ],
    );
  }
}

/// A stored "HH:mm" as minutes after midnight.
int? createMinutes(String? localTime) {
  final parts = localTime?.split(':');
  if (parts == null || parts.length != 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return null;
  return hour * 60 + minute;
}

/// The format's starting plan: doors, the main part and goodbyes, sized to
/// the event's length.
List<EventItineraryItem> createPlanTemplate(
  AppLocalizations l10n,
  CreateFormat format,
  int durationMinutes,
) {
  final main = (durationMinutes - 50).clamp(20, 600);
  return [
    EventItineraryItem(
      id: 'doors',
      kind: EventItineraryKind.gather,
      offsetMinutes: 0,
      durationMinutes: 30,
      title: l10n.hostCreateDoorsAndHellos,
    ),
    EventItineraryItem(
      id: 'main',
      kind: EventItineraryKind.activity,
      offsetMinutes: 30,
      durationMinutes: main,
      title: l10n.hostCreateMainStep(format: format.name),
    ),
    EventItineraryItem(
      id: 'goodbyes',
      kind: EventItineraryKind.transition,
      offsetMinutes: 30 + main,
      durationMinutes: 20,
      title: l10n.hostCreateGoodbyes,
    ),
  ];
}
