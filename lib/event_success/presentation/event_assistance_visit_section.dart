import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Presentation phases shared by live visits and synthetic practice visits.
enum EventAssistanceVisitPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  unavailable,
}

String assistanceVisitLabel(
  AppLocalizations l10n,
  AssistanceVisitDisposition value,
) => switch (value) {
  AssistanceVisitDisposition.returned =>
    l10n.eventSuccessAccountabilityReturned,
  AssistanceVisitDisposition.departed =>
    l10n.eventSuccessAccountabilityDeparted,
  AssistanceVisitDisposition.unresolved =>
    l10n.eventSuccessAccountabilityUnresolved,
};

String assistanceVisitUnavailableCopy(
  AppLocalizations l10n,
  AssistanceAccountabilityUnavailableReason reason,
) => switch (reason) {
  AssistanceAccountabilityUnavailableReason.notApplicable =>
    l10n.eventAssistanceVisitNotApplicable,
  AssistanceAccountabilityUnavailableReason.notCheckedIn =>
    l10n.eventAssistanceVisitNotCheckedIn,
  AssistanceAccountabilityUnavailableReason.departureNotRecorded =>
    l10n.eventAssistanceVisitNoDeparture,
  AssistanceAccountabilityUnavailableReason.notOnDeparture =>
    l10n.eventAssistanceVisitNotOnDeparture,
  AssistanceAccountabilityUnavailableReason.visitChanged =>
    l10n.eventAssistanceVisitChanged,
  AssistanceAccountabilityUnavailableReason.setupChanged =>
    l10n.eventAssistanceVisitSetupChanged,
  AssistanceAccountabilityUnavailableReason.differentCheckpoint =>
    l10n.eventAssistanceVisitDifferentCheckpoint,
  AssistanceAccountabilityUnavailableReason.destinationNotRecorded =>
    l10n.eventAssistanceVisitNoDestination,
  AssistanceAccountabilityUnavailableReason.notCheckpoint =>
    l10n.eventAssistanceVisitNotCheckpoint,
};

/// An atomic observation. The caller owns review, authority and exact retries.
class EventAssistanceVisitSection extends StatelessWidget {
  const EventAssistanceVisitSection({
    super.key,
    required this.disposition,
    required this.phase,
    this.submittedDisposition,
    this.unavailableMessage,
    this.contextMessage,
    this.error,
    this.onResolve,
    this.onRetry,
    this.onReload,
    required this.onDone,
  });

  final AssistanceVisitDisposition disposition;
  final AssistanceVisitDisposition? submittedDisposition;
  final EventAssistanceVisitPhase phase;
  final String? unavailableMessage;
  final String? contextMessage;
  final Object? error;
  final ValueChanged<AssistanceVisitDisposition>? onResolve;
  final VoidCallback? onRetry, onReload;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final pending = phase == EventAssistanceVisitPhase.submitting;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l10n.eventAssistanceVisitBody,
          variant: CatchTextVariant.supporting,
        ),
        if (contextMessage != null) ...[
          gapH8,
          CatchText(contextMessage!, variant: CatchTextVariant.supporting),
        ],
        gapH12,
        CatchFieldLanes.single(
          child: CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.eventAssistanceVisitCurrent,
            body: assistanceVisitLabel(l10n, disposition),
          ),
        ),
        if (phase == EventAssistanceVisitPhase.ready) ...[
          gapH12,
          for (final choice in AssistanceVisitDisposition.values) ...[
            CatchButton(
              key: ValueKey('visit.resolve.${choice.name}'),
              label: switch (choice) {
                AssistanceVisitDisposition.returned =>
                  l10n.eventAssistanceVisitMarkReturned,
                AssistanceVisitDisposition.departed =>
                  l10n.eventAssistanceVisitMarkDeparted,
                AssistanceVisitDisposition.unresolved =>
                  l10n.eventAssistanceVisitMarkUnresolved,
              },
              variant: CatchButtonVariant.secondary,
              onPressed: onResolve == null ? null : () => onResolve!(choice),
            ),
            gapH8,
          ],
        ] else ...[
          gapH12,
          CatchText(switch (phase) {
            EventAssistanceVisitPhase.submitting =>
              l10n.eventAssistanceVisitSaving,
            EventAssistanceVisitPhase.retryRequired =>
              l10n.eventAssistanceVisitUnconfirmed,
            EventAssistanceVisitPhase.refreshRequired =>
              l10n.eventAssistanceVisitReviewAgain,
            EventAssistanceVisitPhase.saved => l10n.eventAssistanceVisitSaved,
            EventAssistanceVisitPhase.unavailable =>
              unavailableMessage ?? l10n.eventAssistanceVisitReadOnly,
            EventAssistanceVisitPhase.ready => '',
          }, variant: CatchTextVariant.supporting),
          if (submittedDisposition != null &&
              (pending ||
                  phase == EventAssistanceVisitPhase.retryRequired)) ...[
            gapH8,
            CatchText(
              l10n.eventAssistanceVisitPendingChoice(
                status: assistanceVisitLabel(l10n, submittedDisposition!),
              ),
              variant: CatchTextVariant.supporting,
            ),
          ],
        ],
        if (phase == EventAssistanceVisitPhase.saved &&
            unavailableMessage != null) ...[
          gapH8,
          CatchText(unavailableMessage!, variant: CatchTextVariant.supporting),
        ],
        if (error != null) ...[gapH12, CatchLocalizedErrorBanner(error!)],
        if (phase == EventAssistanceVisitPhase.retryRequired) ...[
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceVisitRetry,
            onPressed: onRetry,
          ),
        ],
        if (phase == EventAssistanceVisitPhase.refreshRequired ||
            phase == EventAssistanceVisitPhase.unavailable) ...[
          gapH12,
          if (onReload != null)
            CatchButton(
              label: l10n.eventAssistanceVisitReload,
              onPressed: onReload,
            ),
        ],
        gapH12,
        CatchButton(
          key: const ValueKey('visit.done'),
          label: l10n.eventAssistanceVisitDone,
          variant: CatchButtonVariant.ghost,
          status: pending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: pending ? null : onDone,
        ),
      ],
    );
  }
}
