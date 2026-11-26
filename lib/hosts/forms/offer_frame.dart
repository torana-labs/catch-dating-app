part of 'offer_screen.dart';

/// What the offer frame shows and what its dock does, read from the offer
/// workspace, the payment check and the admission.
extension _HostOfferFrameView on _HostOfferFrameState {
  HostOfferState _state(
    AppLocalizations l10n,
    HostEventOfferWorkspaceState ws,
    HostManualPaymentReviewState? manual,
    HostFormAdmissionState? admission,
  ) {
    String? nameOf(String? contactId) => ws.details
        .where((detail) => detail.contactId == contactId)
        .firstOrNull
        ?.response
        .identity
        .primaryLabel;
    final event = ws.event;
    final configuration = ws.configuration;
    final draft = ws.draft;
    final selected = ws.selectedOffer;
    final flow = ws.offerFlow;
    final sameDraft = draft != null && identical(flow.draft, draft);
    final HostOfferStage stage;
    if (event == null) {
      stage = ws.events.isEmpty && ws.loading
          ? HostOfferStage.loading
          : HostOfferStage.events;
    } else if (ws.preparing) {
      stage = HostOfferStage.loading;
    } else if (ws.missingContacts.isNotEmpty) {
      stage = HostOfferStage.needsContact;
    } else if (configuration != null &&
        configuration.suggestedExpiresAt == null) {
      stage = HostOfferStage.needsSettings;
    } else if (selected != null) {
      stage = HostOfferStage.selected;
    } else if (draft != null && ws.commitRequestId != null) {
      stage = HostOfferStage.review;
    } else if (ws.personalMode && configuration != null) {
      stage = HostOfferStage.personalLinks;
    } else if (ws.offers.isNotEmpty) {
      stage = HostOfferStage.existing;
    } else {
      stage = ws.loading ? HostOfferStage.loading : HostOfferStage.events;
    }
    final terms = configuration?.paymentTerms;
    final amountMinor = terms?['expectedAmountMinor'];
    final currency = terms?['currency'];
    final handoff = ws.handoff;
    return HostOfferState(
      stage: stage,
      recipient: widget.recipient,
      events: [
        for (final target in ws.events) _HostOfferFrameState._event(target),
      ],
      canLoadMoreEvents: ws.nextEventCursor != null && event == null,
      event: event == null ? null : _HostOfferFrameState._event(event),
      missing: [
        for (final detail in ws.missingContacts)
          HostOfferPerson(
            id: detail.response.responseId,
            name: detail.response.identity.primaryLabel,
          ),
      ],
      personal: [
        for (final detail in ws.details)
          if (detail.contactId case final contactId?)
            HostOfferPerson(
              id: contactId,
              name: detail.response.identity.primaryLabel,
            ),
      ],
      recipients: [
        for (final row in draft?.rows ?? const <HostOfferRow>[])
          nameOf(row.contactId) ?? l10n.hostFormsAnonymous,
      ],
      amount: amountMinor == 0
          ? l10n.hostFormsOfferFree
          : amountMinor is int && currency is String
          ? formatMinorCurrency(amountMinor, currencyCode: currency)
          : null,
      expiresAt: draft?.rows.firstOrNull?.expiresAt,
      sent: sameDraft && flow.status == HostOfferFlowStatus.committed,
      sendFailed: sameDraft && flow.status == HostOfferFlowStatus.failure,
      existing: [
        for (final item in ws.offers)
          HostOfferExisting(
            item: item,
            name: nameOf(item['contactId'] as String?),
            status: HostOfferStatus.values
                .where((status) => status.name == item['effectiveStatus'])
                .firstOrNull,
          ),
      ],
      selected: selected == null
          ? null
          : HostOfferSelected(
              name: nameOf(selected.contactId),
              status: selected.effectiveStatus,
              expiresAt: selected.expiresAt,
              message: handoff?.kind == 'prepared'
                  ? handoff?.editableText
                  : null,
              blocked: handoff?.kind == 'blocked',
              copied: ws.messageCopied,
              openFailed: ws.handoffOpenFailed,
              canOpenWhatsapp: handoff?.whatsappUrl != null,
              manual: _HostOfferFrameState._manualApplies(selected)
                  ? HostOfferManual(
                      status: selected.manualPayment.status,
                      reference: selected.manualPayment.evidenceReference,
                      failed:
                          manual?.error != null ||
                          manual?.pendingMutation != null,
                      busy: manual?.busy ?? true,
                    )
                  : null,
              admission: admission == null
                  ? null
                  : HostOfferAdmission(
                      phase: admission.receipt != null
                          ? HostOfferAdmissionPhase.done
                          : admission.pending != null
                          ? (admission.pending!.needsReview
                                ? HostOfferAdmissionPhase.again
                                : HostOfferAdmissionPhase.saved)
                          : admission.preview?.canCommit == true
                          ? (admission.preview!.seatAlreadyOccupied == true
                                ? HostOfferAdmissionPhase.keep
                                : HostOfferAdmissionPhase.ready)
                          : HostOfferAdmissionPhase.check,
                      blocker: admission.preview?.blocker,
                      failed: admission.error != null,
                      busy: admission.busy,
                      error: admission.error == null
                          ? null
                          : appErrorMessage(
                              admission.error!,
                              l10n: l10n,
                              context: AppErrorContext.forms,
                            ),
                    ),
            ),
      busy: ws.loading,
      canCancel: ws.canCancelPreparation,
      failed: ws.error != null,
      stale: ws.selectionStale,
      canRetry: !ws.hasUnresolvedCommand,
      recipientCount: widget.scope.query?.selectionIntent?.ids.length ?? 1,
      progress: switch (ws.stage) {
        HostOfferWorkspaceStage.loadingEvents => HostOfferProgress.events,
        HostOfferWorkspaceStage.preparingOffer => HostOfferProgress.preparing,
        HostOfferWorkspaceStage.loadingOffer => HostOfferProgress.existing,
        HostOfferWorkspaceStage.preparingMessage => HostOfferProgress.message,
        HostOfferWorkspaceStage.idle => null,
      },
      previewed:
          sameDraft &&
          (flow.canCommit ||
              flow.status == HostOfferFlowStatus.failure &&
                  flow.pendingRequestId == ws.commitRequestId),
      issued: flow.status == HostOfferFlowStatus.committed,
      canChangeEvent: !ws.hasUnresolvedCommand,
      creatingEvent: widget.creatingEvent,
      canCloseExisting: widget.scope.query != null,
    );
  }

  CatchDock _dock(
    AppLocalizations l10n,
    HostEventOfferWorkspaceState ws,
    HostOfferState state,
    HostManualPaymentReviewScope? manualScope,
    HostManualPaymentReviewState? manual,
  ) {
    final cancel = CatchDockAction(
      label: state.canCancel
          ? l10n.hostFormsOfferStop
          : l10n.hostFormsOfferCancel,
      onPressed: state.canCancel
          ? _workspace.cancelPreparation
          : () => Navigator.of(context).maybePop(),
    );
    final selected = state.selected;
    final payment = selected?.manual;
    if (manualScope != null && manual != null && payment != null) {
      final controller = ref.read(
        hostManualPaymentReviewControllerProvider(manualScope).notifier,
      );
      final busy =
          manual.busy || manual.checkingPending || !manual.actorAvailable;
      if (manual.pendingMutation case final pending?) {
        return CatchDock(
          primary: CatchDockAction(
            // The saved mutation names what is being retried.
            label: pending.kind == HostOfferMutationKind.recordEvidence.name
                ? l10n.hostEventOfferRecordReference
                : pending.decision == HostManualPaymentStatus.rejected.name
                ? l10n.hostEventOfferRejectReference
                : l10n.hostEventOfferAttestReceived,
            loading: busy,
            onPressed: busy ? null : () => unawaited(controller.retry()),
          ),
        );
      }
      switch (payment.status) {
        case HostManualPaymentStatus.none:
          return CatchDock(
            primary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentRecord,
              loading: busy,
              onPressed: busy || _reference.trim().isEmpty
                  ? null
                  : () => unawaited(controller.recordReference(_reference)),
            ),
          );
        case HostManualPaymentStatus.evidenceSubmitted:
          final deciding = busy || manual.pendingDecision != null;
          return CatchDock(
            primary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentAttest,
              loading: busy,
              onPressed: deciding || !_bankChecked
                  ? null
                  : () => unawaited(
                      controller.review(
                        decision: HostManualPaymentStatus.hostAttestedReceived,
                        note: _manualNote,
                        bankReceiptChecked: _bankChecked,
                      ),
                    ),
            ),
            secondary: CatchDockAction(
              label: l10n.hostFormsOfferPaymentReject,
              onPressed: deciding
                  ? null
                  : () => unawaited(
                      controller.review(
                        decision: HostManualPaymentStatus.rejected,
                        note: _manualNote,
                        bankReceiptChecked: _bankChecked,
                      ),
                    ),
            ),
          );
        case HostManualPaymentStatus.hostAttestedReceived ||
            HostManualPaymentStatus.rejected:
          break;
      }
    }
    switch (state.stage) {
      case HostOfferStage.review:
        // Preview checks the offer with the server first; only then does
        // the dock send it, under the request id it was checked with.
        return CatchDock(
          primary: CatchDockAction(
            label: state.previewed
                ? l10n.hostFormsOfferSend
                : l10n.hostEventOfferPreview,
            loading: ws.loading,
            onPressed: ws.loading || state.sent
                ? null
                : () => unawaited(state.previewed ? _commit(ws) : _preview(ws)),
          ),
          secondary: cancel,
        );
      case HostOfferStage.personalLinks:
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsOfferNext,
            loading: ws.loading,
            onPressed: ws.loading
                ? null
                : () => unawaited(_workspace.previewPersonal()),
          ),
          secondary: cancel,
        );
      case HostOfferStage.selected:
        return CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsOfferDone,
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        );
      case HostOfferStage.loading ||
          HostOfferStage.events ||
          HostOfferStage.needsContact ||
          HostOfferStage.needsSettings ||
          HostOfferStage.existing:
        return CatchDock(
          primary: CatchDockAction(label: l10n.hostFormsOfferSend),
          secondary: cancel,
        );
    }
  }
}
