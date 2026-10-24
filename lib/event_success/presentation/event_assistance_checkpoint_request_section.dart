import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_visits_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Closing a request resolves the obligation, without inventing arrival evidence.
class EventAssistanceCheckpointRequestSection extends StatefulWidget {
  const EventAssistanceCheckpointRequestSection({
    super.key,
    required this.reviewIdentity,
    required this.contextMessage,
    required this.request,
    required this.eligibility,
    required this.canClose,
    required this.canReopen,
    required this.phase,
    required this.onConfirm,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.submittedDecision,
    this.error,
    this.observationSummary,
    this.checkpointLabel,
    this.members = const [],
    this.guestNames = const {},
    this.reviewableGuestIds = const {},
    this.onReviewGuest,
    this.reporterOptions,
    this.canReassign = false,
  });
  final Object reviewIdentity;
  final String contextMessage;
  final AssistanceCheckpointRequest? request;
  final AssistanceCheckpointCloseoutEligibility? eligibility;
  final bool canClose, canReopen;
  final bool canReassign;
  final AssistanceCheckpointReporterOptions? reporterOptions;
  final EventAssistanceCheckpointPhase phase;
  final CheckpointRequestDecision? submittedDecision;
  final Object? error;
  final String? observationSummary, checkpointLabel;
  final List<AssistanceCheckpointMember> members;
  final Map<String, String> guestNames;
  final Set<String> reviewableGuestIds;
  final ValueChanged<String>? onReviewGuest;
  final ValueChanged<CheckpointRequestDecision> onConfirm;
  final VoidCallback onRetry, onReload, onDone;
  @override
  State<EventAssistanceCheckpointRequestSection> createState() =>
      _EventAssistanceCheckpointRequestSectionState();
}

class _EventAssistanceCheckpointRequestSectionState
    extends State<EventAssistanceCheckpointRequestSection> {
  final _reason = TextEditingController();
  bool _choosingReporter = false;
  String? _reporterId;
  @override
  void initState() {
    super.initState();
    _reason.text = widget.submittedDecision?.reason ?? '';
  }

  @override
  void didUpdateWidget(covariant EventAssistanceCheckpointRequestSection old) {
    super.didUpdateWidget(old);
    if (!identical(widget.reviewIdentity, old.reviewIdentity)) {
      _reason.text = widget.submittedDecision?.reason ?? '';
      _choosingReporter = false;
      _reporterId = null;
    }
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ready = widget.phase == EventAssistanceCheckpointPhase.ready;
    final busy = widget.phase == EventAssistanceCheckpointPhase.submitting;
    final decision = widget.submittedDecision;
    final validReason =
        _reason.text.trim().isNotEmpty && _reason.text.trim().length <= 500;
    final eligibility = widget.eligibility;
    final due = widget.request == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(widget.request!.dueAt);
    final local = MaterialLocalizations.of(context);
    final reporterOptions = widget.reporterOptions;
    final alternativeReporters = reporterOptions?.reporters
        .where(
          (reporter) =>
              reporter.operatorId != widget.request?.responsibleOperatorId,
        )
        .toList();
    final namedReporters = alternativeReporters
        ?.where(
          (reporter) =>
              reporter.displayName != null ||
              reporter.operatorId == reporterOptions?.actorUid,
        )
        .toList();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(widget.contextMessage, variant: CatchTextVariant.supporting),
        if (widget.checkpointLabel case final label?) ...[
          gapH8,
          CatchText(label, variant: CatchTextVariant.titleL),
        ],
        gapH12,
        CatchText(
          l10n.eventAssistanceCheckpointRequestBody,
          variant: CatchTextVariant.supporting,
        ),
        if (assistanceCheckpointRequestCopy(context, widget.request)
            case final status?) ...[
          gapH12,
          CatchText(status, variant: CatchTextVariant.supporting),
        ],
        if (due != null) ...[
          gapH8,
          CatchText(
            l10n.eventAssistanceCheckpointDue(
              deadline:
                  '${local.formatMediumDate(due)} · ${local.formatTimeOfDay(TimeOfDay.fromDateTime(due))}',
            ),
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (widget.request case final request?) ...[
          gapH8,
          CatchText(
            l10n.eventAssistanceCheckpointReporterCurrent(
              name: checkpointReporterName(
                context,
                widget.reporterOptions,
                request.responsibleOperatorId,
              ),
            ),
            variant: CatchTextVariant.supporting,
          ),
        ],
        if (widget.observationSummary case final summary?) ...[
          gapH8,
          Text(summary, style: CatchTextStyles.labelL(context)),
        ],
        if (ready) ...[
          if (widget.members.any((m) => !m.accountedFor)) ...[
            gapH12,
            EventAssistanceCheckpointVisitsSection(
              members: widget.members,
              names: widget.guestNames,
              reviewableGuestIds: widget.reviewableGuestIds,
              onReview: widget.onReviewGuest,
            ),
          ],
          gapH12,
          CatchText(
            widget.request == null
                ? l10n.eventAssistanceCheckpointRequestMissing
                : eligibility == null
                ? l10n.eventAssistanceCheckpointRequestUnknown
                : switch (eligibility) {
                    AssistanceCheckpointCloseoutReady() =>
                      l10n.eventAssistanceCheckpointRequestReady,
                    AssistanceCheckpointCloseoutUnavailable(:final reason) =>
                      switch (reason) {
                        AssistanceCheckpointCloseoutUnavailableReason
                            .sourceUnavailable =>
                          l10n.eventAssistanceCheckpointSetupChanged,
                        AssistanceCheckpointCloseoutUnavailableReason
                            .reportMissing =>
                          l10n.eventAssistanceCheckpointRequestReportFirst,
                        AssistanceCheckpointCloseoutUnavailableReason
                            .reportComplete =>
                          l10n.eventAssistanceCheckpointComplete,
                        AssistanceCheckpointCloseoutUnavailableReason
                            .unresolvedMembers =>
                          l10n.eventAssistanceCheckpointRequestResolveFirst,
                        AssistanceCheckpointCloseoutUnavailableReason
                            .alreadyClosed =>
                          l10n.eventAssistanceCheckpointClosedOut,
                      },
                  },
            variant: CatchTextVariant.supporting,
          ),
          if (widget.canReassign && widget.reporterOptions != null) ...[
            gapH8,
            CatchButton(
              key: const ValueKey('checkpoint.request.changeReporter'),
              label: _choosingReporter
                  ? l10n.eventAssistanceCheckpointReporterCancel
                  : l10n.eventAssistanceCheckpointRequestReassign,
              variant: CatchButtonVariant.ghost,
              onPressed: () => setState(() {
                _choosingReporter = !_choosingReporter;
                _reporterId = null;
              }),
            ),
            if (_choosingReporter)
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchText(
                    l10n.eventAssistanceCheckpointReporterBody,
                    variant: CatchTextVariant.supporting,
                  ),
                  gapH8,
                  if (namedReporters?.isNotEmpty == true)
                    CatchFieldLanes.single(
                      child: CatchField<String>.select(
                        key: const ValueKey('checkpoint.request.reporter'),
                        copy: catchFieldCopy(l10n),
                        title: l10n.eventAssistanceCheckpointReporterLabel,
                        contract: CatchContractConstraints
                            .reassignEventAssistanceCheckpointReporterCallablePayloadCommandPayloadResponsibleOperatorId,
                        values: namedReporters!
                            .map((reporter) => reporter.operatorId)
                            .toList(),
                        value: _reporterId,
                        itemLabelBuilder: (id) =>
                            id == reporterOptions?.actorUid
                            ? l10n.eventAssistanceGroupYou
                            : namedReporters
                                  .firstWhere(
                                    (reporter) => reporter.operatorId == id,
                                  )
                                  .displayName!,
                        onChanged: (id) => setState(() => _reporterId = id),
                      ),
                    )
                  else
                    CatchText(
                      l10n.eventAssistanceCheckpointReporterEmpty,
                      variant: CatchTextVariant.supporting,
                    ),
                  if (alternativeReporters?.length != namedReporters?.length)
                    CatchText(
                      l10n.eventAssistanceCheckpointReporterUnnamed,
                      variant: CatchTextVariant.supporting,
                    ),
                ],
              ),
          ],
          if (widget.canClose || widget.canReopen || _choosingReporter) ...[
            gapH12,
            CatchFieldLanes.single(
              child: CatchField.input(
                key: const ValueKey('checkpoint.request.reason'),
                copy: catchFieldCopy(l10n),
                title: l10n.eventAssistanceCheckpointRequestReason,
                contract: CatchContractConstraints
                    .setEventAssistanceCheckpointCloseoutCallablePayloadCommandPayloadReason,
                controller: _reason,
                minLines: 2,
                maxLines: 4,
                onChanged: (_) => setState(() {}),
              ),
            ),
            gapH12,
            if (_choosingReporter)
              CatchButton(
                key: const ValueKey('checkpoint.request.reassign'),
                label: l10n.eventAssistanceCheckpointReporterSave,
                onPressed: validReason && _reporterId != null
                    ? () => widget.onConfirm(
                        ReassignCheckpointReporter(
                          reporterId: _reporterId!,
                          reason: _reason.text,
                        ),
                      )
                    : null,
              ),
            if (!_choosingReporter && widget.canClose)
              CatchButton(
                key: const ValueKey('checkpoint.request.close'),
                label: l10n.eventAssistanceCheckpointRequestClose,
                onPressed: validReason
                    ? () =>
                          widget.onConfirm(CloseCheckpointRequest(_reason.text))
                    : null,
              ),
            if (!_choosingReporter && widget.canReopen) ...[
              gapH8,
              CatchButton(
                key: const ValueKey('checkpoint.request.reopen'),
                label: l10n.eventAssistanceCheckpointRequestReopen,
                variant: CatchButtonVariant.secondary,
                onPressed: validReason
                    ? () => widget.onConfirm(
                        ReopenCheckpointRequest(_reason.text),
                      )
                    : null,
              ),
            ],
          ] else if (widget.request != null) ...[
            gapH8,
            CatchText(
              l10n.eventAssistanceCheckpointRequestAuthority,
              variant: CatchTextVariant.supporting,
            ),
          ],
        ] else ...[
          gapH12,
          CatchText(switch (widget.phase) {
            EventAssistanceCheckpointPhase.submitting =>
              l10n.eventAssistanceCheckpointRequestSaving,
            EventAssistanceCheckpointPhase.retryRequired =>
              l10n.eventAssistanceCheckpointRequestUnconfirmed,
            EventAssistanceCheckpointPhase.refreshRequired =>
              l10n.eventAssistanceCheckpointChanged,
            EventAssistanceCheckpointPhase.saved =>
              l10n.eventAssistanceCheckpointRequestSaved,
            EventAssistanceCheckpointPhase.unavailable =>
              l10n.eventAssistanceCheckpointRequestAuthority,
            EventAssistanceCheckpointPhase.ready => '',
          }, variant: CatchTextVariant.supporting),
          if ((busy ||
                  widget.phase ==
                      EventAssistanceCheckpointPhase.retryRequired) &&
              decision != null) ...[
            gapH8,
            Text(switch (decision) {
              CloseCheckpointRequest() =>
                l10n.eventAssistanceCheckpointRequestClose,
              ReopenCheckpointRequest() =>
                l10n.eventAssistanceCheckpointRequestReopen,
              ReassignCheckpointReporter() =>
                l10n.eventAssistanceCheckpointRequestReassign,
            }, style: CatchTextStyles.labelL(context)),
            gapH8,
            if (decision case ReassignCheckpointReporter(
              :final reporterId,
            )) ...[
              CatchText(
                checkpointReporterName(
                  context,
                  widget.reporterOptions,
                  reporterId,
                ),
                variant: CatchTextVariant.supporting,
              ),
              gapH8,
            ],
            CatchText(decision.reason, variant: CatchTextVariant.supporting),
          ],
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == EventAssistanceCheckpointPhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceCheckpointRequestRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (ready ||
            widget.phase == EventAssistanceCheckpointPhase.refreshRequired) ...[
          gapH8,
          CatchButton(
            label: l10n.eventAssistanceCheckpointReload,
            variant: CatchButtonVariant.ghost,
            onPressed: widget.onReload,
          ),
        ],
        gapH8,
        CatchButton(
          key: const ValueKey('checkpoint.request.done'),
          label: l10n.eventAssistanceVisitDone,
          variant: CatchButtonVariant.ghost,
          status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: busy ? null : widget.onDone,
        ),
      ],
    );
  }
}

String checkpointReporterName(
  BuildContext context,
  AssistanceCheckpointReporterOptions? options,
  String id,
) {
  if (id == options?.actorUid) return context.l10n.eventAssistanceGroupYou;
  for (final reporter
      in options?.reporters ?? <AssistanceCheckpointReporterCandidate>[]) {
    if (reporter.operatorId == id && reporter.displayName != null) {
      return reporter.displayName!;
    }
  }
  return context.l10n.eventAssistanceCheckpointReporterUnknown;
}
