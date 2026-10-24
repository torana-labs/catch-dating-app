import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_change.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventAssistanceHelpPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  readOnly,
}

enum _HelpAction { take, transfer, resolve, decline }

/// One deliberate practical-help decision, with the same recovery in both modes.
class EventAssistanceHelpDecisionSection extends StatefulWidget {
  const EventAssistanceHelpDecisionSection({
    super.key,
    required this.item,
    required this.reviewIdentity,
    required this.actorUid,
    required this.phase,
    required this.onDone,
    this.options,
    this.submittedDecision,
    this.onDecide,
    this.onRetry,
    this.onReload,
    this.error,
    this.contextMessage,
  });
  final EventAssistanceHelpItem item;
  final Object reviewIdentity;
  final String actorUid;
  final EventAssistanceHelpPhase phase;
  final AssistanceCaseManagerOptions? options;
  final AssistanceCaseDecision? submittedDecision;
  final ValueChanged<AssistanceCaseDecision>? onDecide;
  final VoidCallback? onRetry, onReload;
  final VoidCallback onDone;
  final Object? error;
  final String? contextMessage;
  @override
  State<EventAssistanceHelpDecisionSection> createState() =>
      _EventAssistanceHelpDecisionSectionState();
}

class _EventAssistanceHelpDecisionSectionState
    extends State<EventAssistanceHelpDecisionSection> {
  _HelpAction? _action;
  String? _managerUid;
  void _clear() {
    _action = null;
    _managerUid = null;
  }

  @override
  void didUpdateWidget(covariant EventAssistanceHelpDecisionSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity) &&
        widget.phase == EventAssistanceHelpPhase.ready) {
      _clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = widget.item;
    final ready = widget.phase == EventAssistanceHelpPhase.ready;
    final busy = widget.phase == EventAssistanceHelpPhase.submitting;
    final options = widget.options;
    final candidates =
        options?.managers.where((m) => m.uid != widget.actorUid).toList() ??
        const <AssistanceCaseManager>[];
    final named = candidates
        .where(
          (m) =>
              m.displayName != null &&
              candidates.where((c) => c.displayName == m.displayName).length ==
                  1,
        )
        .toList();
    final selected = named.where((m) => m.uid == _managerUid).firstOrNull;
    final decision = switch (_action) {
      _HelpAction.take => AssistanceCaseDecision.transfer(widget.actorUid),
      _HelpAction.transfer =>
        selected == null ? null : AssistanceCaseDecision.transfer(selected.uid),
      _HelpAction.resolve => const AssistanceCaseDecision.resolve(),
      _HelpAction.decline => const AssistanceCaseDecision.decline(),
      null => null,
    };
    String label(_HelpAction action) => switch (action) {
      _HelpAction.take => l10n.eventAssistanceHelpTake,
      _HelpAction.transfer => l10n.eventAssistanceHelpTransfer,
      _HelpAction.resolve => l10n.eventAssistanceHelpResolve,
      _HelpAction.decline => l10n.eventAssistanceHelpDecline,
    };
    final currentOwner = row.assignment is AssistanceCaseAssigned
        ? (row.assignment! as AssistanceCaseAssigned).managerUid
        : null;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          row.displayName ?? l10n.eventAssistanceHelpUnknownGuest,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        gapH8,
        CatchText(
          helpCategoryLabel(l10n, row.category),
          variant: CatchTextVariant.supporting,
        ),
        CatchText(
          helpReceivedLabel(context, row.receivedAt),
          variant: CatchTextVariant.supporting,
        ),
        if (row.assignment != null)
          CatchText(
            helpAssignmentLabel(l10n, row.assignment!, options),
            variant: CatchTextVariant.supporting,
          ),
        if (row.resolution != null)
          CatchText(
            row.resolution == AssistanceCaseResolutionOutcome.resolved
                ? l10n.eventAssistanceHelpResolved
                : l10n.eventAssistanceHelpDeclined,
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
        if (ready && _action == null) ...[
          for (final action in _HelpAction.values)
            if (action != _HelpAction.take ||
                currentOwner != widget.actorUid) ...[
              CatchButton(
                key: ValueKey('help.choose.${action.name}'),
                label: label(action),
                variant: CatchButtonVariant.secondary,
                onPressed: widget.onDecide == null
                    ? null
                    : () => setState(() => _action = action),
              ),
              gapH8,
            ],
        ] else if (ready) ...[
          CatchText(switch (_action!) {
            _HelpAction.take => l10n.eventAssistanceHelpTakeBody,
            _HelpAction.transfer => l10n.eventAssistanceHelpTransferBody,
            _HelpAction.resolve => l10n.eventAssistanceHelpResolveBody,
            _HelpAction.decline => l10n.eventAssistanceHelpDeclineBody,
          }, variant: CatchTextVariant.supporting),
          if (_action == _HelpAction.transfer) ...[
            gapH12,
            if (named.isNotEmpty)
              CatchFieldLanes.single(
                child: CatchField<String>.select(
                  key: const ValueKey('help.manager'),
                  copy: catchFieldCopy(l10n),
                  title: l10n.eventAssistanceHelpHost,
                  contract: CatchContractConstraints
                      .resolveEventAssistanceCaseCallablePayloadCommandPayloadOwner,
                  values: named.map((m) => m.uid).toList(),
                  value: selected?.uid,
                  itemLabelBuilder: (id) =>
                      named.singleWhere((m) => m.uid == id).displayName!,
                  onChanged: (id) => setState(() => _managerUid = id),
                ),
              )
            else
              CatchText(
                l10n.eventAssistanceHelpNoHosts,
                variant: CatchTextVariant.supporting,
              ),
            if (named.length != candidates.length)
              CatchText(
                l10n.eventAssistanceHelpUnnamedHosts,
                variant: CatchTextVariant.supporting,
              ),
          ],
          gapH12,
          CatchButton(
            key: const ValueKey('help.confirm'),
            label: l10n.eventAssistanceHelpConfirm,
            onPressed: decision == null || widget.onDecide == null
                ? null
                : () => widget.onDecide!(decision),
          ),
          gapH8,
          CatchButton(
            label: l10n.eventAssistanceHelpChooseAgain,
            variant: CatchButtonVariant.ghost,
            onPressed: () => setState(_clear),
          ),
        ] else ...[
          CatchText(switch (widget.phase) {
            EventAssistanceHelpPhase.submitting =>
              l10n.eventAssistanceHelpSaving,
            EventAssistanceHelpPhase.retryRequired =>
              l10n.eventAssistanceHelpUnconfirmed,
            EventAssistanceHelpPhase.refreshRequired =>
              l10n.eventAssistanceHelpChanged,
            EventAssistanceHelpPhase.saved => l10n.eventAssistanceHelpSaved,
            EventAssistanceHelpPhase.readOnly =>
              row.assignment != null
                  ? row.resolution != null
                        ? l10n.eventAssistanceHelpHandled
                        : l10n.eventAssistanceHelpReadOnly
                  : row.sourceChanged
                  ? l10n.eventAssistanceHelpSourceChanged
                  : l10n.eventAssistanceHelpLegacy,
            EventAssistanceHelpPhase.ready => '',
          }, variant: CatchTextVariant.supporting),
          if (widget.submittedDecision case final choice?) ...[
            gapH8,
            CatchText(
              l10n.eventAssistanceHelpSelected(
                action: switch (choice) {
                  AssistanceCaseResolve() => l10n.eventAssistanceHelpResolve,
                  AssistanceCaseDecline() => l10n.eventAssistanceHelpDecline,
                  AssistanceCaseTransfer(:final managerUid) =>
                    l10n.eventAssistanceHelpTransferValue(
                      name: managerUid == widget.actorUid
                          ? l10n.eventAssistanceGroupYou
                          : helpManagerName(l10n, options, managerUid),
                    ),
                },
              ),
              variant: CatchTextVariant.supporting,
            ),
          ],
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == EventAssistanceHelpPhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceHelpRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceHelpPhase.refreshRequired ||
            ready && _action == _HelpAction.transfer && named.isEmpty) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceHelpReload,
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
