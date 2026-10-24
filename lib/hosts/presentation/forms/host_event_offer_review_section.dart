import 'dart:async';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_manual_payment_review_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Supplied by the Forms localization owner when manager offer APIs are live.
class HostEventOfferReviewCopy {
  const HostEventOfferReviewCopy({
    required this.title,
    required this.preview,
    required this.previewing,
    required this.review,
    required this.expires,
    required this.commit,
    required this.committing,
    required this.committed,
    required this.failed,
    required this.noReservation,
    required this.paymentReference,
    required this.recordReference,
    required this.evidenceSubmitted,
    required this.bankReceiptChecked,
    required this.reviewNote,
    required this.attestReceived,
    required this.rejectReference,
    required this.hostAttested,
    required this.rejected,
  });

  final String title;
  final String preview;
  final String previewing;
  final String review;
  final String Function(String) expires;
  final String commit;
  final String committing;
  final String committed;
  final String failed;
  final String noReservation;
  final String paymentReference;
  final String recordReference;
  final String evidenceSubmitted;
  final String bankReceiptChecked;
  final String reviewNote;
  final String attestReceived;
  final String rejectReference;
  final String hostAttested;
  final String rejected;
}

/// One selected current CRM contact and manager-visible future event are
/// supplied by the parent flow. Preview never reserves or admits a guest.
class HostEventOfferReviewSection extends ConsumerWidget {
  const HostEventOfferReviewSection({
    super.key,
    required this.scope,
    required this.draft,
    required this.eventTitle,
    required this.contactLabel,
    required this.eventStartsAt,
    required this.now,
    required this.commitRequestId,
    required this.copy,
    this.amountLabel,
    this.showEvent = true,
    this.layoutBuilder,
  });

  final HostEventOfferScope scope;
  final HostOfferBatchDraft draft;
  final String eventTitle;
  final String Function(String contactId) contactLabel;
  final DateTime eventStartsAt;
  final DateTime Function() now;
  final String commitRequestId;
  final HostEventOfferReviewCopy copy;
  final String? amountLabel;
  final bool showEvent;
  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(hostEventOfferControllerProvider(scope));
    final controller = ref.read(
      hostEventOfferControllerProvider(scope).notifier,
    );
    final sameDraft = identical(view.draft, draft);
    final busy =
        view.status == HostOfferFlowStatus.previewing ||
        view.status == HostOfferFlowStatus.committing;
    final canPreview =
        !sameDraft ||
        (view.status != HostOfferFlowStatus.committed &&
            !view.canCommit &&
            view.pendingRequestId == null);
    final canCommit =
        sameDraft &&
        (view.canCommit ||
            view.status == HostOfferFlowStatus.failure &&
                view.pendingRequestId == commitRequestId);
    final action = canPreview || canCommit
        ? CatchDock.pageAction(
            label: canCommit ? copy.commit : copy.preview,
            isLoading: busy,
            onPressed: busy
                ? null
                : () {
                    if (canCommit) {
                      controller.commit(commitRequestId);
                    } else {
                      controller.preview(
                        draft: draft,
                        now: now(),
                        eventStartsAt: eventStartsAt,
                      );
                    }
                  },
          )
        : null;
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.plain(
          child: CatchText(
            copy.noReservation,
            variant: CatchTextVariant.supporting,
          ),
        ),
        CatchFieldLanes.divided(
          children: [
            if (showEvent)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventOfferSelectEvent,
                valueText: eventTitle,
              ),
            for (final row in draft.rows)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventOfferRecipient,
                valueText: contactLabel(row.contactId),
              ),
            for (final expiry in draft.rows.map((row) => row.expiresAt).toSet())
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventOfferExpiry,
                valueText:
                    '${AppTimeFormatters.dateTime(expiry.toLocal())} ${expiry.toLocal().timeZoneName}',
                valueMaxLines: 2,
              ),
            if (amountLabel != null)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostEventOfferAmount,
                valueText: amountLabel!,
              ),
          ],
        ),
        if (view.status == HostOfferFlowStatus.failure && sameDraft)
          CatchSection.plain(
            child: CatchText(copy.failed, variant: CatchTextVariant.supporting),
          ),
        if (view.status == HostOfferFlowStatus.committed && sameDraft)
          CatchSection.plain(
            child: CatchText(
              copy.committed,
              variant: CatchTextVariant.supporting,
            ),
          ),
      ],
    );
    return layoutBuilder?.call(body, action) ??
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [body, ?action],
        );
  }
}

/// Reference text is an unverified assertion. Host review is a deliberate
/// manual bank check, with no provider capture or event admission consequence.
class HostManualPaymentReviewSection extends ConsumerStatefulWidget {
  const HostManualPaymentReviewSection({
    super.key,
    required this.scope,
    required this.offer,
    required this.copy,
    required this.referenceRequestId,
    required this.reviewRequestId,
    required this.onUpdated,
    this.layoutBuilder,
  });

  final HostEventOfferScope scope;
  final HostEventOffer offer;
  final HostEventOfferReviewCopy copy;
  final String referenceRequestId;
  final String reviewRequestId;
  final ValueChanged<HostEventOffer> onUpdated;
  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;

  @override
  ConsumerState<HostManualPaymentReviewSection> createState() =>
      _HostManualPaymentReviewSectionState();
}

class _HostManualPaymentReviewSectionState
    extends ConsumerState<HostManualPaymentReviewSection> {
  String _reference = '';
  String _note = '';
  bool _bankReceiptChecked = false;
  @override
  Widget build(BuildContext context) {
    final provider = hostManualPaymentReviewControllerProvider((
      offers: widget.scope,
      offer: widget.offer,
      referenceRequestId: widget.referenceRequestId,
      reviewRequestId: widget.reviewRequestId,
    ));
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    ref.listen(provider, (previous, next) {
      if (next.updatedOffer != null &&
          next.updatedOffer != previous?.updatedOffer) {
        widget.onUpdated(next.updatedOffer!);
      }
    });
    final busy = state.busy || !state.actorAvailable;
    final status = widget.offer.manualPayment.status;
    final copy = widget.copy;
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.pendingMutation != null) ...[
          CatchSection.plain(
            child: CatchText(copy.failed, variant: CatchTextVariant.supporting),
          ),
        ],
        CatchSection.plain(
          child: CatchText(
            copy.noReservation,
            variant: CatchTextVariant.supporting,
          ),
        ),
        if (status == HostManualPaymentStatus.none) ...[
          CatchSection.fieldRows(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: copy.paymentReference,
                maxLength: 240,
                contractExemption:
                    'Only a reference string is recorded; no URL or payment token.',
                onChanged: (value) => setState(() => _reference = value),
              ),
            ],
          ),
        ],
        if (status == HostManualPaymentStatus.evidenceSubmitted) ...[
          CatchSection.plain(
            child: CatchText(
              '${copy.evidenceSubmitted}: ${widget.offer.manualPayment.evidenceReference ?? ''}',
              variant: CatchTextVariant.supporting,
            ),
          ),
          CatchSection.fieldRows(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: copy.reviewNote,
                maxLength: 240,
                contractExemption: 'Host manual review note only.',
                states: {
                  if (state.pendingDecision != null ||
                      state.checkingPending ||
                      state.pendingMutation != null)
                    WidgetState.disabled,
                },
                onChanged:
                    state.pendingDecision == null &&
                        !state.checkingPending &&
                        state.pendingMutation == null
                    ? (value) => _note = value
                    : null,
              ),
              CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: copy.bankReceiptChecked,
                value: _bankReceiptChecked,
                contractExemption:
                    'Explicit Host attestation after checking the bank receipt.',
                onChanged:
                    busy ||
                        state.checkingPending ||
                        state.pendingMutation != null ||
                        state.pendingDecision != null
                    ? null
                    : (value) => setState(() => _bankReceiptChecked = value),
              ),
            ],
          ),
          CatchSection.plain(
            child: Wrap(
              children: [
                CatchButton(
                  label: copy.rejectReference,
                  variant: CatchButtonVariant.secondary,
                  onPressed:
                      busy ||
                          state.checkingPending ||
                          state.pendingMutation != null ||
                          state.pendingDecision ==
                              HostManualPaymentStatus.hostAttestedReceived
                      ? null
                      : () => unawaited(
                          controller.review(
                            decision: HostManualPaymentStatus.rejected,
                            note: _note,
                            bankReceiptChecked: _bankReceiptChecked,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
        if (status == HostManualPaymentStatus.hostAttestedReceived)
          CatchSection.plain(
            child: CatchText(
              copy.hostAttested,
              variant: CatchTextVariant.supporting,
            ),
          ),
        if (status == HostManualPaymentStatus.rejected)
          CatchSection.plain(
            child: CatchText(
              copy.rejected,
              variant: CatchTextVariant.supporting,
            ),
          ),
        if (state.error != null)
          CatchSection.plain(
            child: CatchText(copy.failed, variant: CatchTextVariant.supporting),
          ),
      ],
    );
    final canRetry = state.pendingMutation?.contactId == widget.offer.contactId;
    final canRecord = status == HostManualPaymentStatus.none;
    final canAttest = status == HostManualPaymentStatus.evidenceSubmitted;
    final action = canRetry || canRecord || canAttest
        ? CatchDock.pageAction(
            buttonKey: canRetry
                ? const ValueKey('offer-retry-saved-mutation')
                : null,
            label: canRetry
                ? (state.pendingMutation!.kind ==
                          HostOfferMutationKind.recordEvidence.name
                      ? copy.recordReference
                      : state.pendingMutation!.decision ==
                            HostManualPaymentStatus.rejected.name
                      ? copy.rejectReference
                      : copy.attestReceived)
                : canRecord
                ? copy.recordReference
                : copy.attestReceived,
            isLoading: busy || state.checkingPending,
            onPressed: busy || state.checkingPending
                ? null
                : canRetry
                ? () => unawaited(controller.retry())
                : state.pendingMutation != null
                ? null
                : canRecord
                ? (_reference.trim().isEmpty
                      ? null
                      : () => unawaited(controller.recordReference(_reference)))
                : !_bankReceiptChecked ||
                      state.pendingDecision == HostManualPaymentStatus.rejected
                ? null
                : () => unawaited(
                    controller.review(
                      decision: HostManualPaymentStatus.hostAttestedReceived,
                      note: _note,
                      bankReceiptChecked: _bankReceiptChecked,
                    ),
                  ),
          )
        : null;
    return widget.layoutBuilder?.call(body, action) ??
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [body, ?action],
        );
  }
}
