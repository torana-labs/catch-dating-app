import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_roster_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventAssistanceCheckpointPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  unavailable,
}

String? assistanceCheckpointRequestCopy(
  BuildContext context,
  AssistanceCheckpointRequest? request,
) {
  if (request == null) return null;
  final l10n = context.l10n;
  final local = MaterialLocalizations.of(context);
  final due = DateTime.fromMillisecondsSinceEpoch(request.dueAt);
  final deadline =
      '${local.formatMediumDate(due)} · ${local.formatTimeOfDay(TimeOfDay.fromDateTime(due))}';
  return switch (request.state) {
    AssistanceCheckpointRequestState.awaitingReport =>
      l10n.eventAssistanceCheckpointDue(deadline: deadline),
    AssistanceCheckpointRequestState.overdue =>
      l10n.eventAssistanceCheckpointOverdue(deadline: deadline),
    AssistanceCheckpointRequestState.discrepancy =>
      l10n.eventAssistanceCheckpointDiscrepancy,
    AssistanceCheckpointRequestState.complete =>
      l10n.eventAssistanceCheckpointComplete,
    AssistanceCheckpointRequestState.closedOut =>
      l10n.eventAssistanceCheckpointClosedOut,
    AssistanceCheckpointRequestState.sourceUnavailable =>
      l10n.eventAssistanceCheckpointSetupChanged,
  };
}

/// One observation form for live and simulated checkpoint reporting.
class EventAssistanceCheckpointSection extends StatefulWidget {
  const EventAssistanceCheckpointSection({
    super.key,
    required this.reviewIdentity,
    required this.availability,
    required this.names,
    required this.progressRevision,
    required this.phase,
    required this.contextMessage,
    required this.canReport,
    required this.onConfirm,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.submittedObservation,
    this.error,
    this.requestMessage,
    this.onManageRequest,
  });
  final Object reviewIdentity;
  final AssistanceCheckpointAvailability availability;
  final Map<String, String> names;
  final int progressRevision;
  final EventAssistanceCheckpointPhase phase;
  final String contextMessage;
  final bool canReport;
  final AssistanceCheckpointObservation? submittedObservation;
  final Object? error;
  final String? requestMessage;
  final VoidCallback? onManageRequest;
  final ValueChanged<AssistanceCheckpointObservation> onConfirm;
  final VoidCallback onRetry, onReload, onDone;
  @override
  State<EventAssistanceCheckpointSection> createState() =>
      _EventAssistanceCheckpointSectionState();
}

class _EventAssistanceCheckpointSectionState
    extends State<EventAssistanceCheckpointSection> {
  final _reason = TextEditingController();
  Set<String> _selected = {};
  @override
  void initState() {
    super.initState();
    _reset();
  }

  @override
  void didUpdateWidget(covariant EventAssistanceCheckpointSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity)) _reset();
  }

  void _reset() {
    final availability = widget.availability;
    _selected =
        widget.submittedObservation?.accountedFor.toSet() ??
        (availability is AssistanceCheckpointRoster
            ? availability.members
                  .where((m) => m.accountedFor)
                  .map((m) => m.attendeeId)
                  .toSet()
            : {});
    _reason.text = widget.submittedObservation?.correctionReason ?? '';
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final available = widget.availability;
    final roster = available is AssistanceCheckpointRoster ? available : null;
    final busy = widget.phase == EventAssistanceCheckpointPhase.submitting;
    final ready =
        widget.phase == EventAssistanceCheckpointPhase.ready &&
        widget.canReport &&
        roster != null;
    final selected = widget.phase == EventAssistanceCheckpointPhase.saved
        ? roster?.members
                  .where((m) => m.accountedFor)
                  .map((m) => m.attendeeId)
                  .toSet() ??
              <String>{}
        : widget.submittedObservation?.accountedFor.toSet() ?? _selected;
    final correction =
        roster?.members.any(
          (m) => m.accountedFor && !selected.contains(m.attendeeId),
        ) ??
        false;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(widget.contextMessage, variant: CatchTextVariant.supporting),
        gapH8,
        CatchText(
          l10n.eventAssistanceCheckpointDeparture(
            number: widget.progressRevision,
          ),
          variant: CatchTextVariant.supporting,
        ),
        if (roster != null) ...[
          gapH12,
          CatchText(roster.label, variant: CatchTextVariant.titleL),
          gapH8,
          CatchText(
            l10n.eventAssistanceCheckpointBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          Text(
            l10n.eventAssistanceCheckpointSelected(
              count: selected.length,
              total: roster.members.length,
            ),
            style: CatchTextStyles.labelL(context),
          ),
          if (roster.members.isEmpty) ...[
            gapH8,
            CatchText(
              l10n.eventAssistanceCheckpointEmptyRoster,
              variant: CatchTextVariant.supporting,
            ),
          ],
          if (widget.requestMessage case final message?) ...[
            gapH8,
            CatchText(message, variant: CatchTextVariant.supporting),
          ],
          gapH12,
          if (roster.members.isNotEmpty)
            EventAssistanceCheckpointRosterSection(
              members: roster.members,
              names: widget.names,
              selectedIds: selected,
              enabled: ready,
              onChanged: (next) => setState(() => _selected = next),
            ),
          if (correction && ready) ...[
            gapH12,
            CatchFieldLanes.single(
              child: CatchField.input(
                key: const ValueKey('checkpoint.correction'),
                copy: catchFieldCopy(l10n),
                title: l10n.eventAssistanceCheckpointCorrection,
                contract: CatchContractConstraints
                    .recordEventAssistanceCheckpointCallablePayloadCommandPayloadCorrectionReason,
                controller: _reason,
                minLines: 2,
                maxLines: 4,
                onChanged: (_) => setState(() {}),
              ),
            ),
            gapH8,
            CatchText(
              l10n.eventAssistanceCheckpointCorrectionBody,
              variant: CatchTextVariant.supporting,
            ),
          ] else if (widget.phase != EventAssistanceCheckpointPhase.saved &&
              widget.submittedObservation?.correctionReason != null) ...[
            gapH8,
            CatchText(
              widget.submittedObservation!.correctionReason!,
              variant: CatchTextVariant.supporting,
            ),
          ],
        ] else if (available is AssistanceCheckpointUnavailable) ...[
          gapH12,
          CatchText(switch (available.reason) {
            AssistanceCheckpointUnavailableReason.rosterNotRecorded =>
              l10n.eventAssistanceCheckpointNoRoster,
            AssistanceCheckpointUnavailableReason.destinationNotRecorded =>
              l10n.eventAssistanceCheckpointNoDestination,
            AssistanceCheckpointUnavailableReason.notCheckpoint =>
              l10n.eventAssistanceCheckpointNotApplicable,
            AssistanceCheckpointUnavailableReason.differentCheckpoint ||
            AssistanceCheckpointUnavailableReason.setupChanged =>
              l10n.eventAssistanceCheckpointSetupChanged,
          }, variant: CatchTextVariant.supporting),
        ],
        if (widget.phase != EventAssistanceCheckpointPhase.ready) ...[
          gapH12,
          CatchText(switch (widget.phase) {
            EventAssistanceCheckpointPhase.submitting =>
              l10n.eventAssistanceCheckpointSaving,
            EventAssistanceCheckpointPhase.retryRequired =>
              l10n.eventAssistanceCheckpointUnconfirmed,
            EventAssistanceCheckpointPhase.refreshRequired =>
              l10n.eventAssistanceCheckpointChanged,
            EventAssistanceCheckpointPhase.saved =>
              l10n.eventAssistanceCheckpointSaved,
            EventAssistanceCheckpointPhase.unavailable =>
              l10n.eventAssistanceCheckpointReadOnly,
            EventAssistanceCheckpointPhase.ready => '',
          }, variant: CatchTextVariant.supporting),
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (ready) ...[
          gapH16,
          CatchButton(
            key: const ValueKey('checkpoint.confirm'),
            label: l10n.eventAssistanceCheckpointSave,
            onPressed:
                correction &&
                    (_reason.text.trim().isEmpty ||
                        _reason.text.trim().length > 500)
                ? null
                : () => widget.onConfirm(
                    AssistanceCheckpointObservation(
                      _selected,
                      correctionReason: correction ? _reason.text : null,
                    ),
                  ),
          ),
        ],
        if (widget.phase == EventAssistanceCheckpointPhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceCheckpointRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceCheckpointPhase.refreshRequired ||
            widget.phase == EventAssistanceCheckpointPhase.unavailable ||
            widget.phase == EventAssistanceCheckpointPhase.ready) ...[
          gapH8,
          CatchButton(
            label: l10n.eventAssistanceCheckpointReload,
            variant: CatchButtonVariant.ghost,
            onPressed: widget.onReload,
          ),
        ],
        if (widget.requestMessage != null &&
            widget.onManageRequest != null &&
            (widget.phase == EventAssistanceCheckpointPhase.ready ||
                widget.phase == EventAssistanceCheckpointPhase.saved ||
                widget.phase ==
                    EventAssistanceCheckpointPhase.refreshRequired)) ...[
          gapH8,
          CatchButton(
            key: const ValueKey('checkpoint.manageRequest'),
            label: l10n.eventAssistanceCheckpointRequestManage,
            variant: CatchButtonVariant.secondary,
            onPressed: widget.onManageRequest,
          ),
        ],
        gapH8,
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
