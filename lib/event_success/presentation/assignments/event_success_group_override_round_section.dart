import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_draft.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessGroupOverrideRoundSection extends StatelessWidget {
  const EventSuccessGroupOverrideRoundSection({
    super.key,
    required this.round,
    required this.participantUids,
    required this.participantLabel,
    required this.onChanged,
    required this.onAddGroup,
    required this.onRemoveGroup,
    required this.onAddMember,
    required this.onRemoveMember,
  });

  final GroupOverrideRoundDraft round;
  final List<String> participantUids;
  final String Function(String uid) participantLabel;
  final VoidCallback onChanged;
  final VoidCallback onAddGroup;
  final ValueChanged<GroupOverrideUnitDraft> onRemoveGroup;
  final ValueChanged<GroupOverrideUnitDraft> onAddMember;
  final void Function(GroupOverrideUnitDraft group, String? memberUid)
  onRemoveMember;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      tone: CatchSurfaceTone.raised,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  context.l10n
                      .eventSuccessEventSuccessHostOverridesTextRoundValue1(
                        value1: round.roundIndex + 1,
                      ),
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
              CatchButton(
                label: context
                    .l10n
                    .eventSuccessEventSuccessHostOverridesLabelAddGroup,
                leading: Icon(CatchIcons.addRounded),
                size: CatchButtonSize.sm,
                variant: CatchButtonVariant.secondary,
                onPressed: onAddGroup,
              ),
            ],
          ),
          gapH10,
          if (round.groups.isEmpty)
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesTextNoGroupsInThis,
              variant: CatchTextVariant.supporting,
              color: t.ink3,
            )
          else
            for (final group in round.groups) ...[
              EventSuccessGroupOverrideFieldLanes(
                group: group,
                participantUids: participantUids,
                participantLabel: participantLabel,
                onChanged: onChanged,
                onAddMember: () => onAddMember(group),
                onRemoveGroup: () => onRemoveGroup(group),
                onRemoveMember: (memberUid) => onRemoveMember(group, memberUid),
              ),
              if (group != round.groups.last) gapH10,
            ],
        ],
      ),
    );
  }
}

class EventSuccessGroupOverrideFieldLanes extends StatelessWidget {
  const EventSuccessGroupOverrideFieldLanes({
    super.key,
    required this.group,
    required this.participantUids,
    required this.participantLabel,
    required this.onChanged,
    required this.onAddMember,
    required this.onRemoveGroup,
    required this.onRemoveMember,
  });

  final GroupOverrideUnitDraft group;
  final List<String> participantUids;
  final String Function(String uid) participantLabel;
  final VoidCallback onChanged;
  final VoidCallback onAddMember;
  final VoidCallback onRemoveGroup;
  final ValueChanged<String?> onRemoveMember;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CatchFieldLanes.single(
                  child: CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    title: context
                        .l10n
                        .eventSuccessEventSuccessHostOverridesTitleGroupLabel,
                    contract: CatchContractConstraints
                        .overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsLabel,
                    initialValue: group.label,
                    textCapitalization: TextCapitalization.words,
                    onChanged: (value) {
                      group.label = value;
                      onChanged();
                    },
                  ),
                ),
              ),
              gapW8,
              CatchIconAction(
                tooltip: context
                    .l10n
                    .eventSuccessEventSuccessHostOverridesTooltipRemoveGroup,
                onPressed: onRemoveGroup,
                child: Icon(
                  CatchIcons.deleteOutlineRounded,
                  color: t.danger,
                  size: CatchIcon.md,
                ),
              ),
            ],
          ),
          gapH10,
          for (
            var memberIndex = 0;
            memberIndex < group.memberUids.length;
            memberIndex++
          ) ...[
            EventSuccessGroupMemberField(
              value: group.memberUids[memberIndex],
              participantUids: participantUids,
              participantLabel: participantLabel,
              onChanged: (value) {
                group.memberUids[memberIndex] = value;
                onChanged();
              },
              onRemove: () => onRemoveMember(group.memberUids[memberIndex]),
            ),
            gapH8,
          ],
          CatchButton(
            label: context
                .l10n
                .eventSuccessEventSuccessHostOverridesLabelAddAttendee,
            leading: Icon(CatchIcons.personAddAlt1Rounded),
            size: CatchButtonSize.sm,
            variant: CatchButtonVariant.secondary,
            onPressed: onAddMember,
          ),
        ],
      ),
    );
  }
}

class EventSuccessGroupMemberField extends StatelessWidget {
  const EventSuccessGroupMemberField({
    super.key,
    required this.value,
    required this.participantUids,
    required this.participantLabel,
    required this.onChanged,
    required this.onRemove,
  });

  final String? value;
  final List<String> participantUids;
  final String Function(String uid) participantLabel;
  final ValueChanged<String?> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: CatchFieldLanes.single(
            child: CatchField<String>.select(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesTitleGroupAttendee,
              contract: CatchContractConstraints
                  .overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsParticipantUidsItems,
              contractValueBuilder: (value) => value,
              values: participantUids,
              value: value,
              itemLabelBuilder: participantLabel,
              hintText: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesHinttextAttendee,
              showLabel: false,
              onChanged: onChanged,
            ),
          ),
        ),
        gapW8,
        CatchIconAction(
          tooltip: context
              .l10n
              .eventSuccessEventSuccessHostOverridesTooltipRemoveAttendee,
          onPressed: onRemove,
          child: Icon(CatchIcons.closeRounded, size: CatchIcon.md),
        ),
      ],
    );
  }
}
