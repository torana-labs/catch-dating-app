import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/event_success/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_reveal_card_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessOutcomeSection extends StatefulWidget {
  const EventSuccessOutcomeSection({
    super.key,
    required this.unitOutcome,
    required this.units,
    required this.nextRoundIndex,
    required this.expectedRevision,
    required this.actionState,
    this.onRecord,
  });

  final EventSuccessUnitOutcome unitOutcome;
  final List<EventSuccessOutcomeUnit> units;
  final int nextRoundIndex;
  final int expectedRevision;
  final EventSuccessOutcomeActionState actionState;
  final Future<void> Function({
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  })?
  onRecord;

  @override
  State<EventSuccessOutcomeSection> createState() =>
      _EventSuccessOutcomeSectionState();
}

class _EventSuccessOutcomeSectionState
    extends State<EventSuccessOutcomeSection> {
  final Map<String, TextEditingController> _controllers = {};

  @override
  void didUpdateWidget(covariant EventSuccessOutcomeSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.nextRoundIndex != widget.nextRoundIndex ||
        oldWidget.unitOutcome != widget.unitOutcome) {
      _clearControllers();
    }
  }

  @override
  void dispose() {
    _clearControllers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final isRank = widget.unitOutcome == EventSuccessUnitOutcome.rank;
    return Padding(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            context.l10n.eventSuccessLiveControlRecordRoundTitle(
              roundNumber: widget.nextRoundIndex + 1,
            ),
            variant: CatchTextVariant.sectionTitle,
            color: t.surface,
          ),
          gapH6,
          CatchText(
            isRank
                ? context.l10n.eventSuccessLiveControlRankEntryInstructions
                : context.l10n.eventSuccessLiveControlScoreEntryInstructions,
            variant: CatchTextVariant.supporting,
            color: t.surface.withValues(
              alpha: CatchOpacity.revealMutedForeground,
            ),
          ),
          gapH12,
          if (widget.units.isEmpty)
            CatchText(
              isRank
                  ? context.l10n.eventSuccessLiveControlEmptyUnitsMessage
                  : context.l10n.eventSuccessLiveControlEmptyScoreTeamsMessage,
              variant: CatchTextVariant.supporting,
              color: t.surface,
            )
          else
            CatchSection.fieldRows(
              children: [
                for (var index = 0; index < widget.units.length; index++)
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    key: ValueKey(
                      'event_success.outcome.${widget.nextRoundIndex}.${widget.units[index].id}',
                    ),
                    title: widget.units[index].label,
                    contract: isRank
                        ? CatchContractConstraints
                              .recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsRank
                        : CatchContractConstraints
                              .recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsScore,
                    placeholder: isRank ? '${index + 1}' : '0',
                    controller: _controllerFor(widget.units[index].id),
                    keyboardType: TextInputType.numberWithOptions(
                      decimal: !isRank,
                      signed: !isRank,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
              ],
            ),
          if (widget.actionState.error != null) ...[
            gapH10,
            CatchText(
              appErrorMessage(
                widget.actionState.error!,
                l10n: context.l10n,
                context: AppErrorContext.event,
              ),
              variant: CatchTextVariant.supporting,
              color: t.surface,
            ),
          ],
          gapH12,
          CatchButton(
            label: context.l10n.eventSuccessLiveControlSaveRoundLabel,
            status: (widget.actionState.isLoading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed:
                widget.actionState.isLoading ||
                    widget.onRecord == null ||
                    _entries() == null
                ? null
                : () => unawaited(
                    widget.onRecord!(
                      expectedRevision: widget.expectedRevision,
                      roundIndex: widget.nextRoundIndex,
                      entries: _entries()!,
                    ),
                  ),
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  List<EventSuccessUnitOutcomeEntryInput>? _entries() {
    if (widget.units.isEmpty) return null;
    if (widget.unitOutcome == EventSuccessUnitOutcome.score) {
      final entries = <EventSuccessUnitOutcomeEntryInput>[];
      for (final unit in widget.units) {
        final score = num.tryParse(_controllers[unit.id]?.text.trim() ?? '');
        if (score == null) return null;
        entries.add(
          EventSuccessScoreOutcomeInput(
            unitId: unit.id,
            unitLabel: unit.label,
            score: score,
          ),
        );
      }
      return entries;
    }
    if (widget.unitOutcome == EventSuccessUnitOutcome.rank) {
      final entries = <EventSuccessUnitOutcomeEntryInput>[];
      final ranks = <int>{};
      for (final unit in widget.units) {
        final rank = int.tryParse(_controllers[unit.id]?.text.trim() ?? '');
        if (rank == null || !ranks.add(rank)) return null;
        entries.add(
          EventSuccessRankOutcomeInput(
            unitId: unit.id,
            unitLabel: unit.label,
            rank: rank,
          ),
        );
      }
      final sorted = ranks.toList()..sort();
      if (sorted.indexed.any((item) => item.$2 != item.$1 + 1)) return null;
      return entries;
    }
    return null;
  }

  TextEditingController _controllerFor(String unitId) =>
      _controllers.putIfAbsent(unitId, TextEditingController.new);

  void _clearControllers() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    _controllers.clear();
  }
}
