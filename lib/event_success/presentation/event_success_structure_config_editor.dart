import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
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
          for (final attribute in _offeredAttributes(value))
            CatchField<EventSuccessAttributeObjective>.choices(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey('eventSuccessAttributeObjective-${attribute.name}'),
              title: attribute.label,
              contract: CatchContractConstraints
                  .mobileFormStateEventSuccessAttributeObjective,
              contractValueBuilder: (objective) => objective.name,
              body: context
                  .l10n
                  .eventSuccessEventSuccessStructureConfigEditorTextCatchUsesThisWhenItBuildsTheGroups,
              values: EventSuccessAttributeObjective.values,
              itemLabelBuilder: (objective) =>
                  _objectiveLabel(context, objective),
              selected: {value.objectiveFor(attribute)},
              states: <WidgetState>{if (!enabled) WidgetState.disabled},
              onSelectionChanged: enabled
                  ? (selection) => onChanged(
                      value.withObjective(attribute, selection.single),
                    )
                  : null,
            ),
          if (_sensitiveSelected(value))
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('eventSuccessSensitiveAttributeConsent'),
              title: context
                  .l10n
                  .eventSuccessStructureConfigEditorSensitiveConsentTitle,
              body: context
                  .l10n
                  .eventSuccessStructureConfigEditorSensitiveConsentBody,
              bodyMaxLines: 4,
              icon: CatchIcons.protected,
            ),
          CatchField<EventSuccessArrivalGroupPolicy>.choices(
            copy: catchFieldCopy(context.l10n),
            key: const ValueKey('eventSuccessArrivalGroupPolicy'),
            title: context
                .l10n
                .eventSuccessStructureConfigEditorArrivalGroupsTitle,
            contract: CatchContractConstraints
                .eventSuccessPlanDocumentStructureConfigArrivalGroupPolicy,
            contractValueBuilder: (policy) => policy.name,
            body:
                context.l10n.eventSuccessStructureConfigEditorArrivalGroupsBody,
            values: EventSuccessArrivalGroupPolicy.values,
            itemLabelBuilder: (policy) => _arrivalGroupLabel(context, policy),
            selected: {value.effectiveArrivalGroupPolicy},
            states: <WidgetState>{if (!enabled) WidgetState.disabled},
            onSelectionChanged: enabled
                ? (selection) => onChanged(
                    value.copyWith(arrivalGroupPolicy: selection.single),
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
        coverActivityAttributes: const [],
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

/// Activity signals are always offered. Sensitive profile signals (gender,
/// age band) are offered to pair, team and table formats, never selected by
/// default, and stay visible on any format once this event opted in, so a
/// saved choice can be removed (docs/plans/assignment_engine_ui_spec.md).
List<EventSuccessActivityAssignmentAttribute> _offeredAttributes(
  EventSuccessStructureConfig config,
) {
  final selected = {
    ...config.balanceActivityAttributes,
    ...config.clusterActivityAttributes,
    ...config.coverActivityAttributes,
  };
  return EventSuccessActivityAssignmentAttribute.values
      .where(
        (attribute) =>
            !attribute.sensitive ||
            selected.contains(attribute) ||
            config.unitKind.offersSensitiveAttributes,
      )
      .toList(growable: false);
}

bool _sensitiveSelected(EventSuccessStructureConfig config) => [
  ...config.balanceActivityAttributes,
  ...config.clusterActivityAttributes,
  ...config.coverActivityAttributes,
].any((attribute) => attribute.sensitive);

String _objectiveLabel(
  BuildContext context,
  EventSuccessAttributeObjective objective,
) => switch (objective) {
  EventSuccessAttributeObjective.none =>
    context.l10n.eventSuccessStructureConfigEditorObjectiveNone,
  EventSuccessAttributeObjective.balance =>
    context.l10n.eventSuccessStructureConfigEditorObjectiveBalance,
  EventSuccessAttributeObjective.cluster =>
    context.l10n.eventSuccessStructureConfigEditorObjectiveCluster,
  EventSuccessAttributeObjective.cover =>
    context.l10n.eventSuccessStructureConfigEditorObjectiveCover,
};

String _arrivalGroupLabel(
  BuildContext context,
  EventSuccessArrivalGroupPolicy policy,
) => switch (policy) {
  EventSuccessArrivalGroupPolicy.keepTogether =>
    context.l10n.eventSuccessStructureConfigEditorArrivalGroupsKeepTogether,
  EventSuccessArrivalGroupPolicy.spread =>
    context.l10n.eventSuccessStructureConfigEditorArrivalGroupsSpread,
  EventSuccessArrivalGroupPolicy.ignore =>
    context.l10n.eventSuccessStructureConfigEditorArrivalGroupsIgnore,
};
