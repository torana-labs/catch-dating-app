import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_draft.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessRotationOverrideRoundSection extends StatelessWidget {
  const EventSuccessRotationOverrideRoundSection({
    super.key,
    required this.round,
    required this.participantUids,
    required this.participantLabel,
    required this.onChanged,
    required this.onAddPair,
    required this.onRemovePair,
  });

  final RotationOverrideRoundDraft round;
  final List<String> participantUids;
  final String Function(String uid) participantLabel;
  final VoidCallback onChanged;
  final VoidCallback onAddPair;
  final ValueChanged<RotationOverridePairDraft> onRemovePair;

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
                    .eventSuccessEventSuccessHostOverridesLabelAddPair,
                leading: Icon(CatchIcons.addRounded),
                size: CatchButtonSize.sm,
                variant: CatchButtonVariant.secondary,
                onPressed: onAddPair,
              ),
            ],
          ),
          gapH10,
          if (round.pairings.isEmpty)
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesTextNoPairsInThis,
              variant: CatchTextVariant.supporting,
              color: t.ink3,
            )
          else
            for (final pair in round.pairings) ...[
              EventSuccessRotationPairFieldLanes(
                pair: pair,
                participantUids: participantUids,
                participantLabel: participantLabel,
                onChanged: onChanged,
                onRemove: () => onRemovePair(pair),
              ),
              if (pair != round.pairings.last) gapH8,
            ],
        ],
      ),
    );
  }
}

class EventSuccessRotationPairFieldLanes extends StatelessWidget {
  const EventSuccessRotationPairFieldLanes({
    super.key,
    required this.pair,
    required this.participantUids,
    required this.participantLabel,
    required this.onChanged,
    required this.onRemove,
  });

  final RotationOverridePairDraft pair;
  final List<String> participantUids;
  final String Function(String uid) participantLabel;
  final VoidCallback onChanged;
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
                  .eventSuccessEventSuccessHostOverridesTitleFirstRotationAttendee,
              contract: CatchContractConstraints
                  .overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidA,
              contractValueBuilder: (value) => value,
              values: participantUids,
              value: pair.uidA,
              itemLabelBuilder: participantLabel,
              hintText: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesHinttextAttendee,
              showLabel: false,
              onChanged: (value) {
                pair.uidA = value;
                onChanged();
              },
            ),
          ),
        ),
        gapW8,
        Expanded(
          child: CatchFieldLanes.single(
            child: CatchField<String>.select(
              copy: catchFieldCopy(context.l10n),
              title: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesTitleSecondRotationAttendee,
              contract: CatchContractConstraints
                  .overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidB,
              contractValueBuilder: (value) => value,
              values: participantUids,
              value: pair.uidB,
              itemLabelBuilder: participantLabel,
              hintText: context
                  .l10n
                  .eventSuccessEventSuccessHostOverridesHinttextPartner,
              showLabel: false,
              onChanged: (value) {
                pair.uidB = value;
                onChanged();
              },
            ),
          ),
        ),
        gapW8,
        CatchIconAction(
          tooltip: context
              .l10n
              .eventSuccessEventSuccessHostOverridesTooltipRemovePair,
          onPressed: onRemove,
          child: Icon(
            CatchIcons.deleteOutlineRounded,
            color: CatchTokens.of(context).danger,
            size: CatchIcon.md,
          ),
        ),
      ],
    );
  }
}
