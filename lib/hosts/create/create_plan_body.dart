import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/parts/event_plan_step_row.dart';
import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
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
    this.showTitle = false,
  });

  final CreateFlowState state;
  final VoidCallback onTemplate;
  final VoidCallback onBlank;
  final ValueChanged<EventItineraryItem> onEdit;
  final VoidCallback onAdd;
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
            CreateCopy.stepTitle(CreateStep.plan),
            variant: CatchTextVariant.displaySection,
          ),
        const CatchText(CreateCopy.planIntro, tone: CatchTextTone.secondary),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          align: CatchStackAlign.center,
          wrap: true,
          children: [
            const CatchText(
              CreateCopy.startFrom,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
            CatchChip.choice(
              key: const ValueKey<String>('create-plan-template'),
              label: CreateCopy.template(format),
              selected: steps.isNotEmpty,
              mode: CatchChipMode.single,
              size: CatchChipSize.sm,
              onPressed: onTemplate,
            ),
            CatchChip.choice(
              key: const ValueKey<String>('create-plan-blank'),
              label: CreateCopy.blank,
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
                  subtitle: CreateCopy.stepMinutes(
                    step.durationMinutes ?? 0,
                    step.description,
                  ),
                  editLabel: CreateCopy.editStepLabel(step.title),
                  onEdit: () => onEdit(step),
                ),
            ],
          ),
        CatchChoiceTile(
          key: const ValueKey<String>('create-plan-add'),
          variant: CatchChoiceTileVariant.add,
          title: CreateCopy.addStep,
          onTap: onAdd,
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
  CreateFormat format,
  int durationMinutes,
) {
  final main = (durationMinutes - 50).clamp(20, 600);
  return [
    const EventItineraryItem(
      id: 'doors',
      kind: EventItineraryKind.gather,
      offsetMinutes: 0,
      durationMinutes: 30,
      title: CreateCopy.doorsAndHellos,
    ),
    EventItineraryItem(
      id: 'main',
      kind: EventItineraryKind.activity,
      offsetMinutes: 30,
      durationMinutes: main,
      title: CreateCopy.mainStep(format),
    ),
    EventItineraryItem(
      id: 'goodbyes',
      kind: EventItineraryKind.transition,
      offsetMinutes: 30 + main,
      durationMinutes: 20,
      title: CreateCopy.goodbyes,
    ),
  ];
}
