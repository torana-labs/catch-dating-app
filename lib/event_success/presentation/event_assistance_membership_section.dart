import 'dart:math';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_membership_receivers.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

enum EventAssistanceMembershipPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  unavailable,
}

/// Shared live/practice controls. A proposal never displays as accepted membership.
class EventAssistanceMembershipSection extends StatefulWidget {
  const EventAssistanceMembershipSection({
    super.key,
    required this.facts,
    required this.phase,
    required this.actorUid,
    this.handoverReview,
    this.submittedDecision,
    this.contextMessage,
    this.unavailableMessage,
    this.error,
    this.onDecide,
    this.onRetry,
    this.onReload,
    required this.onDone,
  });
  final AssistanceMembershipFacts facts;
  final EventAssistanceMembershipPhase phase;
  final String actorUid;
  final AssistanceMembershipHandoverReview? handoverReview;
  final AssistanceMembershipDecision? submittedDecision;
  final String? contextMessage, unavailableMessage;
  final Object? error;
  final ValueChanged<AssistanceMembershipDecision>? onDecide;
  final VoidCallback? onRetry, onReload;
  final VoidCallback onDone;
  @override
  State<EventAssistanceMembershipSection> createState() =>
      _EventAssistanceMembershipSectionState();
}

class _EventAssistanceMembershipSectionState
    extends State<EventAssistanceMembershipSection> {
  AssistanceMembershipAction? _action;
  String? _groupId, _receiverId;
  int? _expiresAt;

  @override
  void didUpdateWidget(covariant EventAssistanceMembershipSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.facts, widget.facts) &&
        widget.phase == EventAssistanceMembershipPhase.ready) {
      _clear();
    }
  }

  void _clear() {
    _action = null;
    _groupId = null;
    _receiverId = null;
    _expiresAt = null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final facts = widget.facts;
    final ready = widget.phase == EventAssistanceMembershipPhase.ready;
    final busy = widget.phase == EventAssistanceMembershipPhase.submitting;
    final action = _action;
    final placement = action == AssistanceMembershipAction.place;
    final proposal = action == AssistanceMembershipAction.propose;
    final groups = facts.groups
        .where((g) => !proposal || g.groupId != facts.accepted?.groupId)
        .toList();
    final receivers =
        widget.handoverReview?.receivers
            .where(
              (r) =>
                  r.groups.containsKey(_groupId) &&
                  (r.operatorId == widget.actorUid || r.displayName != null),
            )
            .toList() ??
        const <AssistanceMembershipReceiver>[];
    final unnamedReceivers =
        widget.handoverReview?.receivers.any(
          (r) =>
              r.groups.containsKey(_groupId) &&
              r.operatorId != widget.actorUid &&
              r.displayName == null,
        ) ??
        false;
    final receiver = receivers
        .where((r) => r.operatorId == _receiverId)
        .firstOrNull;
    final maxExpiry = receiver?.groups[_groupId];
    final expiry = maxExpiry == null
        ? null
        : _expiresAt ?? min(facts.serverTime + 600000, maxExpiry);
    final expiries = <int>{
      ?maxExpiry,
      for (final minutes in [5, 10, 15, 30])
        if (maxExpiry != null && facts.serverTime + minutes * 60000 < maxExpiry)
          facts.serverTime + minutes * 60000,
      ?expiry,
    }.toList()..sort();
    final decision = action == null
        ? null
        : switch (action) {
            AssistanceMembershipAction.place =>
              _groupId == null ? null : AssistancePlaceGroup(_groupId!),
            AssistanceMembershipAction.propose =>
              _groupId == null || receiver == null || expiry == null
                  ? null
                  : AssistanceProposeGroup(
                      groupId: _groupId!,
                      receivingOperatorId: receiver.operatorId,
                      expiresAt: expiry,
                    ),
            AssistanceMembershipAction.accept => const AssistanceAcceptGroup(),
            AssistanceMembershipAction.reject => const AssistanceRejectGroup(),
            AssistanceMembershipAction.cancel => const AssistanceCancelGroup(),
            AssistanceMembershipAction.leave => const AssistanceLeaveGroup(),
          };
    final transfer = assistanceMembershipTransferCopy(l10n, facts);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchText(
          l10n.eventAssistanceGroupBody,
          variant: CatchTextVariant.supporting,
        ),
        if (widget.contextMessage != null) ...[
          gapH8,
          CatchText(
            widget.contextMessage!,
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH12,
        CatchFieldLanes.single(
          child: CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.eventAssistanceGroupCurrent,
            body: assistanceMembershipGroupLabel(
              l10n,
              facts,
              facts.accepted?.groupId,
            ),
          ),
        ),
        if (facts.membership is AssistanceChangedMembership) ...[
          gapH8,
          CatchText(
            l10n.eventAssistanceGroupPrevious,
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (transfer != null) ...[
          gapH8,
          CatchText(transfer, variant: CatchTextVariant.supporting),
        ],
        gapH12,
        if (ready && action == null) ...[
          if (facts.actions.isEmpty)
            CatchText(
              widget.unavailableMessage ?? l10n.eventAssistanceGroupNoActions,
              variant: CatchTextVariant.supporting,
            ),
          for (final choice in facts.actions) ...[
            CatchButton(
              key: ValueKey('membership.choose.${choice.name}'),
              label: assistanceMembershipActionLabel(l10n, choice),
              variant: CatchButtonVariant.secondary,
              onPressed:
                  widget.onDecide == null ||
                      choice == AssistanceMembershipAction.propose &&
                          widget.handoverReview == null
                  ? null
                  : () => setState(() => _action = choice),
            ),
            gapH8,
          ],
          if (facts.actions.contains(AssistanceMembershipAction.propose) &&
              widget.handoverReview == null)
            CatchText(
              l10n.eventAssistanceGroupNoReceivers,
              variant: CatchTextVariant.supporting,
            ),
        ] else if (ready && action != null) ...[
          CatchText(
            assistanceMembershipActionBody(l10n, action),
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          if (placement || proposal)
            CatchFieldLanes.divided(
              children: [
                CatchField<String>.select(
                  copy: catchFieldCopy(l10n),
                  title: l10n.eventAssistanceGroupChoose,
                  contract: placement
                      ? CatchContractConstraints
                            .transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionGroupId
                      : CatchContractConstraints
                            .transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionTo,
                  values: groups.map((g) => g.groupId).toList(),
                  value: _groupId,
                  itemLabelBuilder: (id) =>
                      assistanceMembershipGroupLabel(l10n, facts, id),
                  onChanged: (id) => setState(() {
                    _groupId = id;
                    _receiverId = null;
                    _expiresAt = null;
                  }),
                ),
                if (proposal && _groupId != null) ...[
                  if (receivers.isNotEmpty)
                    CatchField<String>.select(
                      copy: catchFieldCopy(l10n),
                      title: l10n.eventAssistanceGroupReceiver,
                      contract: CatchContractConstraints
                          .transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionReceivingOperatorId,
                      values: receivers.map((r) => r.operatorId).toList(),
                      value: _receiverId,
                      itemLabelBuilder: (id) => id == widget.actorUid
                          ? l10n.eventAssistanceGroupYou
                          : receivers
                                    .firstWhere((r) => r.operatorId == id)
                                    .displayName ??
                                l10n.eventAssistanceGroupUnnamedHost,
                      onChanged: (id) => setState(() {
                        _receiverId = id;
                        _expiresAt = null;
                      }),
                    ),
                  if (unnamedReceivers)
                    CatchText(
                      l10n.eventAssistanceGroupMissingName,
                      variant: CatchTextVariant.supporting,
                    ),
                  if (receivers.isEmpty && !unnamedReceivers)
                    CatchText(
                      l10n.eventAssistanceGroupNoReceivers,
                      variant: CatchTextVariant.supporting,
                    ),
                  if (expiry != null)
                    CatchField<int>.select(
                      copy: catchFieldCopy(l10n),
                      title: l10n.eventAssistanceGroupDeadline,
                      contract: CatchContractConstraints
                          .transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionExpiresAtMillis,
                      values: expiries,
                      value: expiry,
                      itemLabelBuilder: (at) => DateFormat.jm(
                        Localizations.localeOf(context).toLanguageTag(),
                      ).format(DateTime.fromMillisecondsSinceEpoch(at)),
                      onChanged: (at) => setState(() => _expiresAt = at),
                    ),
                ],
              ],
            ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceGroupConfirm,
            onPressed: decision == null || widget.onDecide == null
                ? null
                : () => widget.onDecide!(decision),
          ),
          gapH8,
          CatchButton(
            label: l10n.eventAssistanceGroupChooseAgain,
            variant: CatchButtonVariant.ghost,
            onPressed: () => setState(_clear),
          ),
        ] else ...[
          CatchText(switch (widget.phase) {
            EventAssistanceMembershipPhase.submitting =>
              l10n.eventAssistanceGroupSaving,
            EventAssistanceMembershipPhase.retryRequired =>
              l10n.eventAssistanceGroupUnconfirmed,
            EventAssistanceMembershipPhase.refreshRequired =>
              l10n.eventAssistanceGroupChanged,
            EventAssistanceMembershipPhase.saved =>
              l10n.eventAssistanceGroupSaved,
            EventAssistanceMembershipPhase.unavailable =>
              widget.unavailableMessage ?? l10n.eventAssistanceGroupNoActions,
            EventAssistanceMembershipPhase.ready => '',
          }, variant: CatchTextVariant.supporting),
          if ((busy ||
                  widget.phase ==
                      EventAssistanceMembershipPhase.retryRequired) &&
              widget.submittedDecision != null) ...[
            gapH8,
            CatchText(
              l10n.eventAssistanceGroupSelected(
                action: assistanceMembershipActionLabel(
                  l10n,
                  widget.submittedDecision!.action,
                ),
              ),
              variant: CatchTextVariant.supporting,
            ),
            if (widget.submittedDecision case AssistancePlaceGroup(
              :final groupId,
            ))
              CatchText(
                assistanceMembershipGroupLabel(l10n, facts, groupId),
                variant: CatchTextVariant.supporting,
              ),
            if (widget.submittedDecision case AssistanceProposeGroup(
              :final groupId,
              :final receivingOperatorId,
              :final expiresAt,
            )) ...[
              CatchText(
                assistanceMembershipGroupLabel(l10n, facts, groupId),
                variant: CatchTextVariant.supporting,
              ),
              CatchText(
                l10n.eventAssistanceGroupReceiverValue(
                  name: receivingOperatorId == widget.actorUid
                      ? l10n.eventAssistanceGroupYou
                      : widget.handoverReview?.receivers
                                .where(
                                  (r) => r.operatorId == receivingOperatorId,
                                )
                                .firstOrNull
                                ?.displayName ??
                            l10n.eventAssistanceGroupUnnamedHost,
                ),
                variant: CatchTextVariant.supporting,
              ),
              CatchText(
                '${l10n.eventAssistanceGroupDeadline} ${DateFormat.jm(Localizations.localeOf(context).toLanguageTag()).format(DateTime.fromMillisecondsSinceEpoch(expiresAt))}',
                variant: CatchTextVariant.supporting,
              ),
            ],
          ],
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == EventAssistanceMembershipPhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceGroupRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceMembershipPhase.refreshRequired ||
            widget.phase == EventAssistanceMembershipPhase.unavailable ||
            ready &&
                (facts.actions.isEmpty ||
                    widget.handoverReview == null &&
                        facts.actions.contains(
                          AssistanceMembershipAction.propose,
                        ))) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceGroupRefresh,
            variant: CatchButtonVariant.secondary,
            onPressed: widget.onReload,
          ),
        ],
        gapH12,
        CatchButton(
          label: l10n.eventAssistanceVisitDone,
          variant: CatchButtonVariant.ghost,
          status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: busy ? null : widget.onDone,
        ),
      ],
    );
  }
}
