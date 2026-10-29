import 'package:catch_dating_app/contexts/events/domain/event_content_validation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef EventItineraryLocationPicker =
    Future<EventMeetingLocation?> Function(EventMeetingLocation? current);

class EventItineraryEditor extends StatelessWidget {
  const EventItineraryEditor({
    super.key,
    required this.items,
    required this.onChanged,
    this.defaultLocation,
    this.onPickLocation,
    this.hasRoutePath = false,
  });

  final bool hasRoutePath;
  final List<EventItineraryItem> items;
  final ValueChanged<List<EventItineraryItem>> onChanged;
  final EventMeetingLocation? defaultLocation;
  final EventItineraryLocationPicker? onPickLocation;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: context.l10n.hostsEventItineraryTitle,
      children: [
        for (final indexed in items.indexed)
          CatchField.action(
            copy: catchFieldCopy(context.l10n),
            key: ValueKey('create-event-itinerary-${indexed.$2.id}'),
            title: indexed.$2.title,
            body: context.l10n.hostsEventItineraryOffset(
              minutes: indexed.$2.offsetMinutes,
            ),
            valueText: context.l10n.hostsEventItineraryEdit,
            icon: _iconFor(indexed.$2.kind),
            onTap: () => _edit(context, indexed.$1, indexed.$2),
          ),
        CatchField.action(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('create-event-itinerary-add'),
          title: context.l10n.hostsEventItineraryAdd,
          body: context.l10n.hostsEventItineraryAddBody,
          valueText: context.l10n.hostsEventItineraryAddAction,
          icon: CatchIcons.add,
          onTap:
              items.length <
                  CatchContractConstraints.eventDocumentItinerary.maxItems!
              ? () => _edit(context, items.length, null)
              : null,
        ),
      ],
    );
  }

  Future<void> _edit(
    BuildContext context,
    int index,
    EventItineraryItem? existing,
  ) async {
    final result = await _showItineraryDialog(
      context,
      existing: existing,
      hasRoutePath: hasRoutePath,
      defaultLocation: defaultLocation,
      onPickLocation: onPickLocation,
      generatedId: 'step-${DateTime.now().microsecondsSinceEpoch}',
    );
    if (result == null) return;
    final next = List<EventItineraryItem>.of(items);
    if (result.delete) {
      if (existing != null) next.removeAt(index);
    } else if (existing == null) {
      next.add(result.item!);
    } else {
      next[index] = result.item!;
    }
    next.sort(
      (left, right) => left.offsetMinutes.compareTo(right.offsetMinutes),
    );
    onChanged(List<EventItineraryItem>.unmodifiable(next));
  }
}

class _ItineraryDialogResult {
  const _ItineraryDialogResult.item(this.item) : delete = false;
  const _ItineraryDialogResult.delete() : item = null, delete = true;

  final EventItineraryItem? item;
  final bool delete;
}

Future<_ItineraryDialogResult?> _showItineraryDialog(
  BuildContext context, {
  required EventItineraryItem? existing,
  required bool hasRoutePath,
  required EventMeetingLocation? defaultLocation,
  required EventItineraryLocationPicker? onPickLocation,
  required String generatedId,
}) async {
  final title = TextEditingController(text: existing?.title);
  final offset = TextEditingController(
    text: existing?.offsetMinutes.toString() ?? '0',
  );
  final duration = TextEditingController(
    text: existing?.durationMinutes?.toString() ?? '',
  );
  final routeDistance = TextEditingController(
    text: existing?.routeDistanceMeters?.toString() ?? '',
  );
  final description = TextEditingController(text: existing?.description);
  var kind = existing?.kind ?? EventItineraryKind.activity;
  var selectedLocation = existing?.location;
  final result = await showDialog<_ItineraryDialogResult>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => CatchDialog(
        title: existing == null
            ? context.l10n.hostsEventItineraryDialogAdd
            : context.l10n.hostsEventItineraryDialogEdit,
        actions: [
          Expanded(
            child: Wrap(
              alignment: WrapAlignment.end,
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                if (existing != null)
                  CatchButton(
                    label: context.l10n.hostsEventItineraryDelete,
                    variant: CatchButtonVariant.danger,
                    size: CatchButtonSize.md,
                    onPressed: () => Navigator.of(
                      dialogContext,
                    ).pop(const _ItineraryDialogResult.delete()),
                  ),
                CatchButton(
                  label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.md,
                  onPressed: () => Navigator.of(dialogContext).pop(),
                ),
                CatchButton(
                  label: context.l10n.hostsEventItinerarySave,
                  size: CatchButtonSize.md,
                  onPressed: () {
                    final normalizedTitle = title.text.trim();
                    final normalizedOffset = int.tryParse(offset.text.trim());
                    final normalizedDuration = duration.text.trim().isEmpty
                        ? null
                        : int.tryParse(duration.text.trim());
                    final meters = routeDistance.text.trim().isEmpty
                        ? null
                        : int.tryParse(routeDistance.text.trim());
                    if (normalizedOffset == null ||
                        (routeDistance.text.trim().isNotEmpty &&
                            meters == null) ||
                        (duration.text.trim().isNotEmpty &&
                            normalizedDuration == null)) {
                      return;
                    }
                    final item = EventItineraryItem(
                      id: existing?.id ?? generatedId,
                      kind: kind,
                      offsetMinutes: normalizedOffset,
                      durationMinutes: normalizedDuration,
                      title: normalizedTitle,
                      description: description.text.trim().isEmpty
                          ? null
                          : description.text.trim(),
                      location: selectedLocation,
                      routeDistanceMeters: meters,
                    );
                    if (!isValidEventItinerary([item])) return;
                    Navigator.of(
                      dialogContext,
                    ).pop(_ItineraryDialogResult.item(item));
                  },
                ),
              ],
            ),
          ),
        ],
        child: Flexible(
          child: SingleChildScrollView(
            child: CatchSection.containedFieldRows(
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.itineraryTitle,
                  title: context.l10n.hostsEventItineraryFieldTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsTitle,
                  controller: title,
                  inputHint: context.l10n.hostsEventItineraryFieldTitleHint,
                  icon: CatchIcons.note,
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.itineraryOffset,
                  title: context.l10n.hostsEventItineraryFieldOffset,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsOffsetMinutes,
                  controller: offset,
                  keyboardType: TextInputType.number,
                  icon: CatchIcons.time,
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.itineraryDuration,
                  title: context.l10n.hostsEventItineraryFieldDuration,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsDurationMinutes,
                  controller: duration,
                  keyboardType: TextInputType.number,
                  labelMode: CatchFieldLabelTextMode.optional,
                  icon: CatchIcons.timer,
                ),
                if (hasRoutePath || existing?.routeDistanceMeters != null)
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    key: const ValueKey('event-itinerary-route-distance'),
                    title: context.l10n.hostsItineraryRouteDistance,
                    contract: CatchContractConstraints
                        .createEventCallablePayloadItineraryItemsRouteDistanceMeters,
                    controller: routeDistance,
                    keyboardType: TextInputType.number,
                    labelMode: CatchFieldLabelTextMode.optional,
                    icon: CatchIcons.route,
                  ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.itineraryDescription,
                  title: context.l10n.hostsEventItineraryFieldDescription,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsDescription,
                  controller: description,
                  maxLines: 3,
                  labelMode: CatchFieldLabelTextMode.optional,
                  icon: CatchIcons.document,
                ),
                CatchField<EventItineraryKind>.choices(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsEventItineraryFieldKind,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadItineraryItemsKind,
                  contractValueBuilder: (value) =>
                      value == EventItineraryKind.breakTime
                      ? 'break'
                      : value.name,
                  values: EventItineraryKind.values,
                  selected: {kind},
                  itemLabelBuilder: (value) => _kindLabel(context, value),
                  onSelectionChanged: (selection) =>
                      setState(() => kind = selection.single),
                ),
                if (defaultLocation != null && onPickLocation == null)
                  CatchField.toggle(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsEventItineraryUseMeetingPoint,
                    body: defaultLocation.name,
                    value: selectedLocation != null,
                    onChanged: (value) => setState(
                      () => selectedLocation = value ? defaultLocation : null,
                    ),
                    contractExemption:
                        'Copies the canonical meeting location into an itinerary item.',
                  ),
                if (onPickLocation != null) ...[
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsEventItineraryLocationTitle,
                    body:
                        selectedLocation?.name ??
                        context.l10n.hostsEventItineraryLocationEmpty,
                    valueText: selectedLocation == null
                        ? context.l10n.hostsEventItineraryLocationChoose
                        : context.l10n.hostsEventItineraryLocationChange,
                    icon: CatchIcons.location,
                    onTap: () async {
                      final picked = await onPickLocation(selectedLocation);
                      if (picked != null) {
                        setState(() => selectedLocation = picked);
                      }
                    },
                  ),
                  if (selectedLocation != null)
                    CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostsEventItineraryLocationRemove,
                      body: selectedLocation!.name,
                      valueText: context.l10n.hostsEventItineraryDelete,
                      icon: CatchIcons.delete,
                      onTap: () => setState(() => selectedLocation = null),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
  return result;
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

IconData _iconFor(EventItineraryKind kind) => switch (kind) {
  EventItineraryKind.gather => CatchIcons.people,
  EventItineraryKind.activity => CatchIcons.route,
  EventItineraryKind.stop => CatchIcons.location,
  EventItineraryKind.breakTime => CatchIcons.timer,
  EventItineraryKind.transition => CatchIcons.swap,
  EventItineraryKind.finish => CatchIcons.flag,
};
