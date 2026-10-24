import 'dart:math';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_departure_draft.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_roster_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

enum EventAssistanceDeparturePhase {
  ready,
  reviewingRoster,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  unavailable,
}

/// One departure form shared by real and synthetic transports.
class EventAssistanceDepartureSection extends StatefulWidget {
  const EventAssistanceDepartureSection({
    super.key,
    required this.reviewIdentity,
    required this.destinations,
    required this.guests,
    required this.canConfirm,
    required this.actorUid,
    required this.serverTime,
    required this.checkpointUntil,
    required this.phase,
    required this.onConfirm,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.currentDestination,
    this.sourceChanged = false,
    this.contextMessage,
    this.submittedDraft,
    this.error,
    this.rosterLoading = false,
    this.rosterError,
  });
  final Object reviewIdentity;
  final List<EventAssistanceDepartureOption> destinations;
  final List<EventAssistanceDepartureGuest> guests;
  final bool canConfirm, sourceChanged, rosterLoading;
  final String actorUid;
  final int serverTime, checkpointUntil;
  final EventAssistanceDeparturePhase phase;
  final String? currentDestination, contextMessage;
  final EventAssistanceDepartureDraft? submittedDraft;
  final Object? error, rosterError;
  final ValueChanged<EventAssistanceDepartureDraft> onConfirm;
  final VoidCallback onRetry, onReload, onDone;
  @override
  State<EventAssistanceDepartureSection> createState() =>
      _EventAssistanceDepartureSectionState();
}

class _EventAssistanceDepartureSectionState
    extends State<EventAssistanceDepartureSection> {
  AssistanceJoiningTarget? _destination;
  bool _recordRoster = false, _requestCheckpoint = false;
  Set<String> _selected = {};
  int? _dueAt;
  @override
  void didUpdateWidget(covariant EventAssistanceDepartureSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.reviewIdentity, widget.reviewIdentity) &&
        widget.phase == EventAssistanceDeparturePhase.ready) {
      _destination = null;
      _recordRoster = false;
      _requestCheckpoint = false;
      _selected = {};
      _dueAt = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ready =
        widget.phase == EventAssistanceDeparturePhase.ready &&
        widget.canConfirm;
    final busy =
        widget.phase == EventAssistanceDeparturePhase.submitting ||
        widget.phase == EventAssistanceDeparturePhase.reviewingRoster;
    final target = widget.destinations
        .where((d) => d.target == _destination)
        .firstOrNull;
    final deadlineChoices = [
      for (final minutes in [5, 10, 15, 30, 45, 60, 90, 120])
        if (widget.serverTime + minutes * 60000 <= widget.checkpointUntil)
          widget.serverTime + minutes * 60000,
    ];
    final defaultDeadline = deadlineChoices.isEmpty
        ? null
        : min(widget.serverTime + 1800000, deadlineChoices.last);
    final deadline = _dueAt ?? defaultDeadline;
    final canRequest =
        _recordRoster &&
        target != null &&
        target.target is! AssistanceFixedPlace &&
        deadlineChoices.isNotEmpty;
    final selectionValid =
        !_recordRoster ||
        !widget.rosterLoading &&
            widget.rosterError == null &&
            _selected.every((id) => widget.guests.any((g) => g.id == id));
    final submitted = widget.submittedDraft;
    String time(int at) => DateFormat.jm(
      Localizations.localeOf(context).toLanguageTag(),
    ).format(DateTime.fromMillisecondsSinceEpoch(at));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchText(
          l10n.eventAssistanceDepartureBody,
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
            title: l10n.eventAssistanceDepartureCurrent,
            body:
                widget.currentDestination ??
                l10n.eventAssistanceDepartureUnrecorded,
          ),
        ),
        if (widget.sourceChanged)
          CatchText(
            l10n.eventAssistanceDepartureSourceChanged,
            variant: CatchTextVariant.supporting,
          ),
        gapH12,
        if (ready) ...[
          CatchFieldLanes.single(
            child: CatchField<AssistanceJoiningTarget>.select(
              key: const ValueKey('departure.destination'),
              copy: catchFieldCopy(l10n),
              title: l10n.eventAssistanceDepartureDestination,
              contractExemption:
                  'Selects a complete generated joining-target union from the current authorized review; each variant has its own target identifier.',
              values: widget.destinations.map((d) => d.target).toList(),
              value: target?.target,
              itemLabelBuilder: (value) => widget.destinations
                  .firstWhere((d) => d.target == value)
                  .label,
              onChanged: (value) => setState(() {
                _destination = value;
                _requestCheckpoint = false;
                _dueAt = null;
              }),
            ),
          ),
          if (target != null) ...[
            if (target.detail.isNotEmpty) ...[
              gapH8,
              CatchText(target.detail, variant: CatchTextVariant.supporting),
            ],
            CatchFieldLanes.single(
              child: CatchField.toggle(
                key: const ValueKey('departure.recordRoster'),
                copy: catchFieldCopy(l10n),
                title: l10n.eventAssistanceDepartureRecordRoster,
                titleMaxLines: 3,
                contractExemption:
                    'Controls presence of the optional departureRoster payload; it is not a persisted boolean.',
                value: _recordRoster,
                onChanged: (value) => setState(() {
                  _recordRoster = value;
                  _selected = {};
                  _requestCheckpoint = false;
                  _dueAt = null;
                }),
              ),
            ),
            if (_recordRoster) ...[
              if (widget.rosterLoading)
                const CatchLoadingIndicator()
              else if (widget.rosterError != null)
                CatchLocalizedErrorBanner(widget.rosterError!)
              else
                EventAssistanceDepartureRosterSection(
                  guests: widget.guests,
                  selectedIds: _selected,
                  onChanged: (ids) => setState(() {
                    _selected = ids;
                    _requestCheckpoint = false;
                    _dueAt = null;
                  }),
                ),
              gapH8,
              if (_selected.isEmpty)
                CatchText(
                  l10n.eventAssistanceDepartureNobody,
                  variant: CatchTextVariant.supporting,
                ),
              if (canRequest)
                CatchFieldLanes.single(
                  child: CatchField.toggle(
                    key: const ValueKey('departure.requestCheckpoint'),
                    copy: catchFieldCopy(l10n),
                    title: l10n.eventAssistanceDepartureRequestCheckpoint,
                    titleMaxLines: 3,
                    body: l10n.eventAssistanceDepartureReportMyself,
                    bodyMaxLines: 3,
                    contractExemption:
                        'Explicitly includes a checkpointRequest for the current authenticated operator; current duty is rechecked at confirmation.',
                    value: _requestCheckpoint,
                    onChanged: (value) =>
                        setState(() => _requestCheckpoint = value),
                  ),
                ),
              if (canRequest && _requestCheckpoint && deadline != null)
                CatchFieldLanes.single(
                  child: CatchField<int>.select(
                    key: const ValueKey('departure.deadline'),
                    copy: catchFieldCopy(l10n),
                    title: l10n.eventAssistanceDepartureDeadline,
                    contract: CatchContractConstraints
                        .confirmEventAssistanceDepartureCallablePayloadCommandPayloadCheckpointRequestDueAt,
                    values: deadlineChoices,
                    value: deadline,
                    itemLabelBuilder: time,
                    onChanged: (value) => setState(() => _dueAt = value),
                  ),
                ),
            ],
            gapH12,
          ],
          CatchButton(
            label: l10n.eventAssistanceDepartureConfirm,
            onPressed: target == null || !selectionValid
                ? null
                : () => widget.onConfirm(
                    EventAssistanceDepartureDraft(
                      destination: target.target,
                      roster: _recordRoster
                          ? EventAssistanceDepartureRosterSelection(_selected)
                          : null,
                      checkpoint:
                          canRequest && _requestCheckpoint && deadline != null
                          ? AssistanceDepartureCheckpointRequest(
                              responsibleOperatorId: widget.actorUid,
                              dueAt: deadline,
                            )
                          : null,
                    ),
                  ),
          ),
        ] else ...[
          CatchText(switch (widget.phase) {
            EventAssistanceDeparturePhase.ready ||
            EventAssistanceDeparturePhase.unavailable =>
              l10n.eventAssistanceDepartureUnavailable,
            EventAssistanceDeparturePhase.reviewingRoster =>
              l10n.eventAssistanceDepartureReviewing,
            EventAssistanceDeparturePhase.submitting =>
              l10n.eventAssistanceDepartureSaving,
            EventAssistanceDeparturePhase.retryRequired =>
              l10n.eventAssistanceDepartureUnknown,
            EventAssistanceDeparturePhase.refreshRequired =>
              l10n.eventAssistanceDepartureChanged,
            EventAssistanceDeparturePhase.saved =>
              l10n.eventAssistanceDepartureSaved,
          }, variant: CatchTextVariant.supporting),
          if (submitted != null &&
              widget.phase != EventAssistanceDeparturePhase.saved) ...[
            gapH8,
            CatchText(
              widget.destinations
                      .where((d) => d.target == submitted.destination)
                      .firstOrNull
                      ?.label ??
                  l10n.eventAssistanceDepartureDestination,
              variant: CatchTextVariant.supporting,
            ),
            CatchText(
              submitted.roster == null
                  ? l10n.eventAssistanceDepartureRosterSkipped
                  : l10n.eventAssistanceDepartureSelected(
                      count: submitted.roster!.attendeeIds.length,
                    ),
              variant: CatchTextVariant.supporting,
            ),
            if (submitted.checkpoint != null)
              CatchText(
                l10n.eventAssistanceDepartureReportAt(
                  time: time(submitted.checkpoint!.dueAt),
                ),
                variant: CatchTextVariant.supporting,
              ),
          ],
        ],
        if (widget.error != null) ...[
          gapH12,
          CatchLocalizedErrorBanner(widget.error!),
        ],
        if (widget.phase == EventAssistanceDeparturePhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDepartureRetry,
            onPressed: widget.onRetry,
          ),
        ],
        if (widget.phase == EventAssistanceDeparturePhase.refreshRequired ||
            widget.phase == EventAssistanceDeparturePhase.unavailable ||
            widget.phase == EventAssistanceDeparturePhase.ready &&
                (!widget.canConfirm || widget.rosterError != null)) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDepartureReload,
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
