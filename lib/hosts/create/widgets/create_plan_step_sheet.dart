import 'package:catch_dating_app/contexts/events/domain/event_content_validation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/hosts/create/create_event_form_keys.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// One plan step in a contained sheet: what happens, a note and how long,
/// with Done, and Remove for a step already in the plan.
///
/// Editing a saved event adds what kind of step it is, when it starts, its
/// own place and, on a route, how far into it the step is.
class CreatePlanStepSheet extends StatefulWidget {
  const CreatePlanStepSheet({
    super.key,
    required this.step,
    required this.isNew,
    required this.onDone,
    required this.onRemove,
    this.onPickPlace,
    this.showRouteDistance = false,
  });

  final EventItineraryItem step;
  final bool isNew;
  final ValueChanged<EventItineraryItem> onDone;
  final VoidCallback onRemove;

  /// Opens the place picker for the step as edited so far; the screen hands
  /// the step back with its place. Set when editing a saved event, which
  /// also shows the kind and start fields.
  final ValueChanged<EventItineraryItem>? onPickPlace;

  /// The event has a drawn route, so a step can say how far along it is.
  final bool showRouteDistance;

  @override
  State<CreatePlanStepSheet> createState() => _CreatePlanStepSheetState();
}

class _CreatePlanStepSheetState extends State<CreatePlanStepSheet> {
  late EventItineraryItem _step = widget.step;

  @override
  void didUpdateWidget(CreatePlanStepSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new step, or this step handed back with a picked place.
    if (!identical(oldWidget.step, widget.step)) _step = widget.step;
  }

  void _pickPlace() => widget.onPickPlace?.call(_step);

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final title = _step.title.trim();
    final detailed = widget.onPickPlace != null;
    final place = _step.location;
    return CatchSheet.contained(
      key: const ValueKey<String>('create-plan-step-sheet'),
      title: widget.isNew
          ? context.l10n.hostCreateAddStep
          : context.l10n.hostCreateEditStep,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('create-plan-step-done'),
            label: context.l10n.hostCreateDone,
            fullWidth: true,
            onPressed:
                title.isEmpty ||
                    (detailed &&
                        !isValidEventItinerary([_step.copyWith(title: title)]))
                ? null
                : () => widget.onDone(_step.copyWith(title: title)),
          ),
          if (!widget.isNew)
            CatchButton(
              label: context.l10n.hostCreateRemoveStep,
              variant: CatchButtonVariant.quiet,
              fullWidth: true,
              onPressed: widget.onRemove,
            ),
        ],
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchFieldLanes.single(
            child: CatchField.input(
              key: ValueKey<String>('create-plan-step-title-${_step.id}'),
              copy: copy,
              title: context.l10n.hostCreateStepWhat,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsTitle,
              initialValue: _step.title,
              maxLength: 80,
              onChanged: (value) =>
                  setState(() => _step = _step.copyWith(title: value)),
            ),
          ),
          CatchFieldLanes.single(
            child: CatchField.input(
              key: ValueKey<String>('create-plan-step-note-${_step.id}'),
              copy: copy,
              title: context.l10n.hostCreateStepNote,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsDescription,
              initialValue: _step.description ?? '',
              maxLength: 160,
              onChanged: (value) => setState(
                () => _step = _step.copyWith(
                  description: value.trim().isEmpty ? null : value.trim(),
                ),
              ),
            ),
          ),
          CatchFieldLanes.single(
            child: CatchField.stepper(
              copy: copy,
              title: context.l10n.hostCreateMinutes,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsItineraryItemsDurationMinutes,
              value: _step.durationMinutes ?? 30,
              min: 5,
              max: 600,
              step: 5,
              decreaseSemanticLabel: context.l10n.hostCreateShorter,
              increaseSemanticLabel: context.l10n.hostCreateLonger,
              onChanged: (value) => setState(
                () => _step = _step.copyWith(durationMinutes: value.toInt()),
              ),
            ),
          ),
          if (detailed) ...[
            CatchFieldLanes.single(
              child: CatchField.stepper(
                key: CreateEventFormKeys.itineraryOffset,
                copy: copy,
                title: context.l10n.hostsEventItineraryFieldOffset,
                contract: CatchContractConstraints
                    .createEventCallablePayloadItineraryItemsOffsetMinutes,
                value: _step.offsetMinutes,
                min: 0,
                max: 24 * 60,
                step: 5,
                decreaseSemanticLabel: context.l10n.hostCreateShorter,
                increaseSemanticLabel: context.l10n.hostCreateLonger,
                onChanged: (value) => setState(
                  () => _step = _step.copyWith(offsetMinutes: value.toInt()),
                ),
              ),
            ),
            CatchStack(
              gap: CatchStackGap.g8,
              children: [
                CatchText(
                  context.l10n.hostsEventItineraryFieldKind,
                  variant: CatchTextVariant.labelAction,
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g8,
                  wrap: true,
                  children: [
                    for (final kind in EventItineraryKind.values)
                      CatchChip.choice(
                        key: ValueKey<String>(
                          'create-plan-step-kind-${kind.name}',
                        ),
                        label: _kindLabel(context, kind),
                        selected: _step.kind == kind,
                        mode: CatchChipMode.single,
                        size: CatchChipSize.sm,
                        onPressed: () =>
                            setState(() => _step = _step.copyWith(kind: kind)),
                      ),
                  ],
                ),
              ],
            ),
            CatchIndexRow(
              key: const ValueKey<String>('create-plan-step-place'),
              leading: CatchIcon(CatchIcons.location),
              title: context.l10n.hostsEventItineraryLocationTitle,
              subtitle:
                  place?.name ?? context.l10n.hostsEventItineraryLocationEmpty,
              onTap: _pickPlace,
              action: CatchIndexRowAction(
                label: place == null
                    ? context.l10n.hostsEventItineraryLocationChoose
                    : context.l10n.hostsEventItineraryLocationChange,
                onPressed: _pickPlace,
              ),
            ),
            if (place != null)
              CatchButton(
                key: const ValueKey<String>('create-plan-step-place-remove'),
                label: context.l10n.hostsEventItineraryLocationRemove,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
                onPressed: () =>
                    setState(() => _step = _step.copyWith(location: null)),
              ),
            if (widget.showRouteDistance || _step.routeDistanceMeters != null)
              CatchFieldLanes.single(
                child: CatchField.input(
                  key: const ValueKey<String>('event-itinerary-route-distance'),
                  copy: copy,
                  title: context.l10n.hostsItineraryRouteDistance,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsRouteDistanceMeters,
                  labelMode: CatchFieldLabelTextMode.optional,
                  initialValue: _step.routeDistanceMeters?.toString() ?? '',
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  suffixText: 'm',
                  onChanged: (value) => setState(
                    () => _step = _step.copyWith(
                      routeDistanceMeters: int.tryParse(value.trim()),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

String _kindLabel(BuildContext context, EventItineraryKind kind) =>
    switch (kind) {
      EventItineraryKind.gather => context.l10n.hostsEventItineraryKindGather,
      EventItineraryKind.activity =>
        context.l10n.hostsEventItineraryKindActivity,
      EventItineraryKind.stop => context.l10n.hostsEventItineraryKindStop,
      EventItineraryKind.breakTime => context.l10n.hostsEventItineraryKindBreak,
      EventItineraryKind.transition =>
        context.l10n.hostsEventItineraryKindTransition,
      EventItineraryKind.finish => context.l10n.hostsEventItineraryKindFinish,
    };
