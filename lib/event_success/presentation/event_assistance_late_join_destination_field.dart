import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_destinations.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_late_join_setup.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_late_join_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventAssistanceLateJoinDestinationField extends StatelessWidget {
  const EventAssistanceLateJoinDestinationField({
    super.key,
    required this.value,
    required this.setup,
    required this.enabled,
    required this.onChanged,
  });
  final LateJoinDestination value;
  final LateJoinSettingSetup setup;
  final bool enabled;
  final ValueChanged<LateJoinDestination> onChanged;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final presets = lateJoinDestinationPresets(setup);
    final index = presets.indexWhere(
      (p) => sameLateJoinDestinationFamily(p, value),
    );
    final selection = switch (value) {
      LateJoinItinerary(:final permittedStopIds) => permittedStopIds.toSet(),
      LateJoinGroupCheckpoints(:final permittedCheckpointIds) =>
        permittedCheckpointIds.toSet(),
      LateJoinFixedPlace() || LateJoinConfirmedProgress() => <String>{},
    };
    final points = <({String id, String label})>[
      for (final option in setup.destinations)
        if ((value, option.target) case (
          LateJoinItinerary(:final itineraryId),
          AssistanceItineraryStop(itineraryId: final route, :final stopId),
        ) when itineraryId == route)
          (id: stopId, label: option.label)
        else if ((value, option.target) case (
          LateJoinGroupCheckpoints(:final routeId, :final groupId),
          AssistanceGroupCheckpoint(
            routeId: final route,
            groupId: final group,
            :final checkpointId,
          ),
        ) when routeId == route && groupId == group)
          (id: checkpointId, label: option.label),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchFieldLanes.single(
          child: CatchField<int>.select(
            key: const ValueKey('lateJoin.destination'),
            copy: catchFieldCopy(l10n),
            title: l10n.eventAssistanceLateJoinWhere,
            contractExemption:
                'Chooses a typed destination family from the server reviewed setup; the complete preference uses the canonical late-join union.',
            values: [for (var i = 0; i < presets.length; i++) i],
            value: index < 0 ? null : index,
            itemLabelBuilder: (i) => switch (presets[i]) {
              LateJoinConfirmedProgress() =>
                l10n.eventAssistanceLateJoinConfirmed,
              LateJoinFixedPlace() => lateJoinDestinationLabel(
                l10n,
                presets[i],
                setup,
              ),
              LateJoinItinerary() => l10n.eventAssistanceLateJoinItinerary,
              LateJoinGroupCheckpoints() =>
                l10n.eventAssistanceLateJoinCheckpoints,
            },
            onChanged: enabled
                ? (i) {
                    if (i != null) onChanged(presets[i]);
                  }
                : null,
            states: {if (!enabled) WidgetState.disabled},
          ),
        ),
        if (value is LateJoinConfirmedProgress)
          CatchText(
            l10n.eventAssistanceLateJoinConfirmedBody,
            variant: CatchTextVariant.supporting,
          ),
        if (points.isNotEmpty)
          CatchFieldLanes.single(
            child: CatchField<String>.choices(
              key: const ValueKey('lateJoin.points'),
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceLateJoinPoints,
              contract: value is LateJoinItinerary
                  ? CatchContractConstraints
                        .eventAssistanceLateJoinInputPolicyDestinationPermittedStopIds
                  : CatchContractConstraints
                        .eventAssistanceLateJoinInputPolicyDestinationPermittedCheckpointIds,
              values: points.map((p) => p.id).toList(),
              itemLabelBuilder: (id) =>
                  points.firstWhere((p) => p.id == id).label,
              selected: selection,
              mode: CatchChipMode.multiple,
              states: {if (!enabled) WidgetState.disabled},
              onSelectionChanged: enabled
                  ? (selected) {
                      if (selected.isEmpty) return;
                      final ids = points
                          .where((p) => selected.contains(p.id))
                          .map((p) => p.id)
                          .toList();
                      switch (value) {
                        case LateJoinItinerary(:final itineraryId):
                          onChanged(
                            LateJoinItinerary(
                              itineraryId: itineraryId,
                              permittedStopIds: ids,
                            ),
                          );
                        case LateJoinGroupCheckpoints(
                          :final routeId,
                          :final groupId,
                        ):
                          onChanged(
                            LateJoinGroupCheckpoints(
                              routeId: routeId,
                              groupId: groupId,
                              permittedCheckpointIds: ids,
                            ),
                          );
                        case LateJoinFixedPlace() ||
                            LateJoinConfirmedProgress():
                          break;
                      }
                    }
                  : null,
            ),
          ),
        if (value case LateJoinFixedPlace(:final placeId, :final lateEntry))
          CatchFieldLanes.single(
            child: CatchField<LateEntryRule>.choices(
              key: const ValueKey('lateJoin.entry'),
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceLateJoinEntry,
              contract: CatchContractConstraints
                  .eventAssistanceLateJoinInputPolicyDestinationLateEntry,
              contractValueBuilder: (v) => v.name,
              values: LateEntryRule.values,
              itemLabelBuilder: (v) => switch (v) {
                LateEntryRule.allowed =>
                  l10n.eventAssistanceLateJoinEntryAllowed,
                LateEntryRule.hostDecision =>
                  l10n.eventAssistanceLateJoinEntryHost,
                LateEntryRule.closed => l10n.eventAssistanceLateJoinEntryClosed,
              },
              selected: {lateEntry},
              states: {if (!enabled) WidgetState.disabled},
              onSelectionChanged: enabled
                  ? (v) {
                      if (v.isNotEmpty) {
                        onChanged(
                          LateJoinFixedPlace(
                            placeId: placeId,
                            lateEntry: v.single,
                          ),
                        );
                      }
                    }
                  : null,
            ),
          ),
      ],
    );
  }
}
