import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessStructureConfigEditor extends StatelessWidget {
  const EventSuccessStructureConfigEditor({
    super.key,
    required this.value,
    required this.targetAttendeeCount,
    required this.enabled,
    required this.onChanged,
    this.sectionTitle,
  });

  final EventSuccessStructureConfig value;
  final int targetAttendeeCount;
  final bool enabled;
  final ValueChanged<EventSuccessStructureConfig> onChanged;
  final String? sectionTitle;

  @override
  Widget build(BuildContext context) {
    final estimatedUnitCount = value.estimatedUnitCount(targetAttendeeCount);
    final supportsUnitCount = value.unitKind.supportsUnitCount;
    final autoUnitCountSummary = supportsUnitCount
        ? context.l10n
              .eventSuccessEventSuccessStructureConfigEditorTextAutoAboutEstimatedunitcountTolowercase(
                estimatedUnitCount: estimatedUnitCount,
                toLowerCase: value.unitKind.label.toLowerCase(),
                targetAttendeeCount: targetAttendeeCount,
              )
        : context
              .l10n
              .eventSuccessEventSuccessStructureConfigEditorTextOneSharedGroupFor;

    return CatchSection.fieldRows(
      title: sectionTitle,
      children: [
        CatchField<EventSuccessUnitKind>.optionCards(
          copy: catchFieldCopy(context.l10n),
          title: context
              .l10n
              .eventSuccessEventSuccessStructureConfigEditorTextGroupPeopleInto,
          contract: CatchContractConstraints
              .eventSuccessPlanDocumentStructureConfigUnitKind,
          contractValueBuilder: (value) => value.name,
          values: EventSuccessUnitKind.values,
          itemTitleBuilder: (kind) => kind.label,
          itemDescriptionBuilder: (kind) => kind.setupHint,
          selected: value.unitKind,
          states: <WidgetState>{if (!enabled) WidgetState.disabled},
          onChanged: enabled ? (kind) => onChanged(_withUnitKind(kind)) : null,
        ),
        if (value.unitKind != EventSuccessUnitKind.wholeGroup)
          CatchField.stepper(
            copy: catchFieldCopy(context.l10n),
            title: value.unitKind.peoplePerLabel,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigUnitSize,
            body: context.l10n
                .eventSuccessEventSuccessStructureConfigEditorDetailTargetSizeForEach(
                  singularLabel: value.unitKind.singularLabel,
                ),
            value: value.unitSize,
            min: 2,
            max: 12,
            valueLabelBuilder: (number) => context.l10n
                .eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointPeople(
                  toInt: number.toInt(),
                ),
            decreaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticDecreasePeoplePerUnit,
            increaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticIncreasePeoplePerUnit,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onChanged: enabled
                ? (number) =>
                      onChanged(value.copyWith(unitSize: number.toInt()))
                : null,
          ),
        if (supportsUnitCount)
          CatchField<bool>.optionCards(
            copy: catchFieldCopy(context.l10n),
            title: value.unitKind.countLabel,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigUnitCount,
            contractValueBuilder: (value) => value.toString(),
            values: const [false, true],
            itemTitleBuilder: (fixed) => fixed
                ? context
                      .l10n
                      .eventSuccessEventSuccessStructureConfigEditorLabelFixed
                : context
                      .l10n
                      .eventSuccessEventSuccessStructureConfigEditorLabelAuto,
            itemDescriptionBuilder: (fixed) => fixed
                ? context
                      .l10n
                      .eventSuccessEventSuccessStructureConfigEditorDetailSetTheNumberYourselfOrLetCatchWorkItOutFromAttendance
                : autoUnitCountSummary,
            selected: value.unitCount != null,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onChanged: enabled
                ? (fixed) => onChanged(
                    value.copyWith(
                      unitCount: fixed ? estimatedUnitCount : null,
                    ),
                  )
                : null,
          ),
        if (supportsUnitCount && value.unitCount != null)
          CatchField.stepper(
            copy: catchFieldCopy(context.l10n),
            title: value.unitKind.countLabel,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigUnitCount,
            body: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorDetailSetTheNumberYourselfOrLetCatchWorkItOutFromAttendance,
            value: value.unitCount ?? estimatedUnitCount,
            min: 1,
            max: 40,
            valueLabelBuilder: (number) => context.l10n
                .eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointTolowercase(
                  toInt: number.toInt(),
                  toLowerCase: value.unitKind.label.toLowerCase(),
                ),
            decreaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticDecreaseUnitCount,
            increaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticIncreaseUnitCount,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onChanged: enabled
                ? (number) =>
                      onChanged(value.copyWith(unitCount: number.toInt()))
                : null,
          ),
        if (value.unitKind != EventSuccessUnitKind.wholeGroup) ...[
          CatchField<EventSuccessActivityAssignmentAttribute>.choices(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTitleSpreadPeopleOutBy,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigBalanceActivityAttributes,
            contractValueBuilder: (value) => value.name,
            body: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTextCatchUsesThisWhenItBuildsTheGroups,
            values: EventSuccessActivityAssignmentAttribute.values,
            itemLabelBuilder: (attribute) => attribute.balanceLabel,
            selected: value.balanceActivityAttributes.toSet(),
            mode: CatchChipMode.multiple,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onSelectionChanged: enabled
                ? (selection) => onChanged(
                    value.copyWith(
                      balanceActivityAttributes: _orderedAttributes(selection),
                      clusterActivityAttributes: value.clusterActivityAttributes
                          .where((attribute) => !selection.contains(attribute))
                          .toList(growable: false),
                    ),
                  )
                : null,
          ),
          CatchField<EventSuccessActivityAssignmentAttribute>.choices(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTitleKeepSimilarPeopleTogetherBy,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigClusterActivityAttributes,
            contractValueBuilder: (value) => value.name,
            body: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTextCatchUsesThisWhenItBuildsTheGroups,
            values: EventSuccessActivityAssignmentAttribute.values,
            itemLabelBuilder: (attribute) => attribute.clusterLabel,
            selected: value.clusterActivityAttributes.toSet(),
            mode: CatchChipMode.multiple,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onSelectionChanged: enabled
                ? (selection) => onChanged(
                    value.copyWith(
                      clusterActivityAttributes: _orderedAttributes(selection),
                      balanceActivityAttributes: value.balanceActivityAttributes
                          .where((attribute) => !selection.contains(attribute))
                          .toList(growable: false),
                    ),
                  )
                : null,
          ),
        ],
        if (value.rotates) ...[
          CatchField<EventSuccessRotationRepeatStrategy>.choices(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTextMeetingTheSamePersonAgain,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigRotationRepeatStrategy,
            contractValueBuilder: (value) => value.name,
            values: EventSuccessRotationRepeatStrategy.values,
            itemLabelBuilder: (strategy) => strategy.label,
            selected: {value.rotationRepeatStrategy},
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onSelectionChanged: enabled
                ? (selection) => onChanged(
                    value.copyWith(rotationRepeatStrategy: selection.single),
                  )
                : null,
          ),
          CatchField.stepper(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorLabelMaxTimesTheSamePairMeets,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigMaxPairMeetings,
            body: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorDetailOnlyUsedWhenThereAreMoreRoundsThanPeopleToMeet,
            value: value.maxPairMeetings,
            min: 1,
            max: 10,
            valueLabelBuilder: (number) => context.l10n
                .eventSuccessEventSuccessStructureConfigEditorVisiblecopyTointValue2(
                  toInt: number.toInt(),
                  value2: number.toInt() == 1 ? 'time' : 'times',
                ),
            decreaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticDecreaseMeetingsPerPair,
            increaseSemanticLabel: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorSemanticIncreaseMeetingsPerPair,
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onChanged: enabled
                ? (number) =>
                      onChanged(value.copyWith(maxPairMeetings: number.toInt()))
                : null,
          ),
        ],
        if (!enabled)
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessStructureConfigEditorTextStructureIsLockedOnce,
            icon: CatchIcons.locked,
          ),
      ],
    );
  }

  EventSuccessStructureConfig _withUnitKind(EventSuccessUnitKind kind) {
    return switch (kind) {
      EventSuccessUnitKind.wholeGroup => value.copyWith(
        unitKind: kind,
        unitSize: targetAttendeeCount,
        unitCount: 1,
        rotationIntervalMinutes: null,
        balanceActivityAttributes: const [],
        clusterActivityAttributes: const [],
      ),
      EventSuccessUnitKind.pods => value.copyWith(
        unitKind: kind,
        unitSize: value.unitSize.clamp(3, 8).toInt(),
        unitCount: null,
        rotationIntervalMinutes: null,
      ),
      EventSuccessUnitKind.pairs => value.copyWith(
        unitKind: kind,
        unitSize: 2,
        unitCount: null,
        rotationIntervalMinutes: value.rotationIntervalMinutes ?? 15,
      ),
      EventSuccessUnitKind.teams => value.copyWith(
        unitKind: kind,
        unitSize: value.unitSize.clamp(3, 8).toInt(),
        unitCount: null,
        rotationIntervalMinutes: value.rotationIntervalMinutes,
      ),
      EventSuccessUnitKind.tables => value.copyWith(
        unitKind: kind,
        unitSize: value.unitSize.clamp(3, 8).toInt(),
        unitCount: value.unitCount,
        rotationIntervalMinutes: value.rotationIntervalMinutes ?? 30,
      ),
    };
  }
}

List<EventSuccessActivityAssignmentAttribute> _orderedAttributes(
  Set<EventSuccessActivityAssignmentAttribute> selected,
) => EventSuccessActivityAssignmentAttribute.values
    .where(selected.contains)
    .toList(growable: false);
