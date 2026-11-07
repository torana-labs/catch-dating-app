import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/forms/offer_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// An event's start in the device's zone, with its zone name.
String hostOfferTime(DateTime at) {
  final local = at.toLocal();
  return '${AppTimeFormatters.dateTime(local)} ${local.timeZoneName}';
}

/// An offer's status in the host's words.
String hostOfferStatusText(AppLocalizations l10n, HostOfferStatus? status) =>
    switch (status) {
      HostOfferStatus.draft => l10n.hostFormsOfferStatusDraft,
      HostOfferStatus.offered => l10n.hostFormsOfferStatusOffered,
      HostOfferStatus.withdrawn => l10n.hostFormsOfferStatusWithdrawn,
      HostOfferStatus.expired => l10n.hostFormsOfferStatusExpired,
      null => l10n.hostFormsOfferStatusUnknown,
    };

/// The longest reference or note the payment check records.
const hostOfferReferenceLimit = 240;

/// Offering a place in board order: which event, then what the offer needs
/// (people added to People, the event's terms, payment links), the ready
/// offer, and an offer already made with its WhatsApp message, payment
/// check and admission.
class HostOfferBody extends StatelessWidget {
  const HostOfferBody({
    super.key,
    required this.state,
    required this.bankChecked,
    required this.onChoose,
    required this.onLoadMoreEvents,
    required this.onAddToPeople,
    required this.onOpenSettings,
    required this.onPersonalLink,
    required this.onOpenExisting,
    required this.onPrepareMessage,
    required this.onOpenWhatsapp,
    required this.onCopyMessage,
    required this.onReference,
    required this.onManualNote,
    required this.onBankChecked,
    required this.onAdmit,
    required this.onRetry,
  });

  final HostOfferState state;

  /// The host has checked the bank receipt for a manual payment.
  final bool bankChecked;
  final ValueChanged<HostOfferEvent> onChoose;
  final VoidCallback onLoadMoreEvents;
  final ValueChanged<String> onAddToPeople;
  final VoidCallback onOpenSettings;
  final void Function(String contactId, String link) onPersonalLink;
  final ValueChanged<Map<String, Object?>> onOpenExisting;
  final VoidCallback onPrepareMessage;
  final VoidCallback onOpenWhatsapp;
  final VoidCallback onCopyMessage;
  final ValueChanged<String> onReference;
  final ValueChanged<String> onManualNote;
  final ValueChanged<bool> onBankChecked;
  final VoidCallback onAdmit;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final event = state.event;
    final selected = state.selected;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostFormsOfferWhichEvent,
              variant: CatchTextVariant.labelAction,
            ),
            if (state.events.isEmpty && state.stage == HostOfferStage.loading)
              CatchSkeleton.content(
                child: CatchChoiceTile(
                  title: l10n.hostFormsOfferWhichEvent,
                  subtitle: l10n.hostFormsOfferLoading,
                  variant: CatchChoiceTileVariant.row,
                ),
              )
            else if (state.events.isEmpty)
              CatchText(
                l10n.hostFormsOfferNoEvents,
                tone: CatchTextTone.secondary,
              ),
            for (final option in state.events)
              CatchChoiceTile(
                key: ValueKey<String>('host-offer-event-${option.id}'),
                variant: CatchChoiceTileVariant.row,
                title: option.name?.trim().isNotEmpty == true
                    ? option.name!.trim()
                    : l10n.hostFormsOfferUntitledEvent,
                subtitle: hostOfferTime(option.startsAt),
                selected: option.id == event?.id,
                onTap: state.busy || option.id == event?.id
                    ? null
                    : () => onChoose(option),
              ),
            if (state.canLoadMoreEvents)
              CatchButton(
                label: l10n.hostFormsOfferMoreEvents,
                variant: CatchButtonVariant.quiet,
                size: CatchButtonSize.sm,
                onPressed: state.busy ? null : onLoadMoreEvents,
              ),
          ],
        ),
        if (state.stage == HostOfferStage.needsContact)
          CatchSection(
            title: l10n.hostFormsOfferNeedsContactTitle,
            kicker: l10n.hostFormsOfferNeedsContact,
            children: [
              for (final person in state.missing)
                CatchIndexRow(
                  key: ValueKey<String>('host-offer-missing-${person.id}'),
                  title: person.name ?? l10n.hostFormsAnonymous,
                  onTap: null,
                  density: CatchIndexRowSize.compact,
                  action: CatchIndexRowAction(
                    label: l10n.hostFormsResponseAddToPeople,
                    onPressed: state.busy
                        ? null
                        : () => onAddToPeople(person.id),
                  ),
                ),
            ],
          ),
        if (state.stage == HostOfferStage.needsSettings)
          CatchNotice.inline(
            body: l10n.hostFormsOfferNeedsSettings,
            tone: CatchNoticeTone.neutral,
            action: CatchNoticeAction(
              label: l10n.hostFormsOfferOpenSettings,
              onPressed: state.busy ? null : onOpenSettings,
            ),
          ),
        if (state.stage == HostOfferStage.personalLinks)
          CatchSection(
            dividers: CatchSectionPlacement.none,
            children: [
              for (final person in state.personal)
                CatchField.input(
                  key: ValueKey<String>('host-offer-link-${person.id}'),
                  copy: catchFieldCopy(l10n),
                  title: l10n.hostFormsOfferPaymentLink(
                    name: person.name ?? l10n.hostFormsAnonymous,
                  ),
                  keyboardType: TextInputType.url,
                  contractExemption:
                      'An organiser-owned HTTPS link for this person; the '
                      'offer command validates it and no charge is started.',
                  onChanged: (value) => onPersonalLink(person.id, value),
                ),
            ],
          ),
        if (state.stage == HostOfferStage.review)
          _HostOfferReview(state: state),
        if (state.stage == HostOfferStage.existing)
          CatchSection(
            title: l10n.hostFormsOfferExistingTitle,
            children: [
              for (final offer in state.existing)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-offer-existing-${offer.item['offerId']}',
                  ),
                  title: offer.name ?? l10n.hostFormsAnonymous,
                  status: hostOfferStatusText(l10n, offer.status),
                  onTap: state.busy ? null : () => onOpenExisting(offer.item),
                  density: CatchIndexRowSize.compact,
                  chevron: true,
                ),
            ],
          ),
        if (state.stage == HostOfferStage.selected && selected != null)
          _HostOfferSelected(
            selected: selected,
            busy: state.busy,
            bankChecked: bankChecked,
            onPrepareMessage: onPrepareMessage,
            onOpenWhatsapp: onOpenWhatsapp,
            onCopyMessage: onCopyMessage,
            onReference: onReference,
            onManualNote: onManualNote,
            onBankChecked: onBankChecked,
            onAdmit: onAdmit,
          ),
        if (state.stage == HostOfferStage.loading && event != null)
          CatchText(
            l10n.hostFormsOfferLoading,
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.secondary,
          ),
        if (state.failed || state.stale)
          CatchNotice.inline(
            body: state.stale
                ? l10n.hostFormsOfferStale
                : l10n.hostFormsOfferFailed,
            tone: CatchNoticeTone.danger,
            action: state.canRetry
                ? CatchNoticeAction(
                    label: l10n.hostFormsTryAgain,
                    onPressed: state.busy ? null : onRetry,
                  )
                : null,
          ),
      ],
    );
  }
}

/// The ready offer: who gets it, until when the place is held, the cost,
/// and whether it was sent.
class _HostOfferReview extends StatelessWidget {
  const _HostOfferReview({required this.state});

  final HostOfferState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final expiresAt = state.expiresAt;
    final amount = state.amount;
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchSection(
          title: l10n.hostFormsOfferWhoGetsIt,
          children: [
            for (final name in state.recipients)
              CatchIndexRow(
                title: name,
                onTap: null,
                density: CatchIndexRowSize.compact,
                leading: CatchAvatar.system(
                  size: CatchAvatarSize.sm,
                  name: name,
                ),
              ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g6,
          children: [
            if (expiresAt != null)
              CatchText(
                l10n.hostFormsOfferHeldUntil(when: hostOfferTime(expiresAt)),
              ),
            CatchText(
              amount == null
                  ? l10n.hostFormsOfferCostUnknown
                  : l10n.hostFormsOfferCost(amount: amount),
              variant: CatchTextVariant.bodyMeta,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        if (state.sent)
          CatchNotice.inline(
            body: l10n.hostFormsOfferSent,
            tone: CatchNoticeTone.success,
          )
        else if (state.sendFailed)
          CatchNotice.inline(
            body: l10n.hostFormsOfferSendFailed,
            tone: CatchNoticeTone.danger,
          ),
      ],
    );
  }
}

/// An offer already made: its status, the WhatsApp message as the person
/// will get it, the payment check and letting them in.
class _HostOfferSelected extends StatelessWidget {
  const _HostOfferSelected({
    required this.selected,
    required this.busy,
    required this.bankChecked,
    required this.onPrepareMessage,
    required this.onOpenWhatsapp,
    required this.onCopyMessage,
    required this.onReference,
    required this.onManualNote,
    required this.onBankChecked,
    required this.onAdmit,
  });

  final HostOfferSelected selected;
  final bool busy;
  final bool bankChecked;
  final VoidCallback onPrepareMessage;
  final VoidCallback onOpenWhatsapp;
  final VoidCallback onCopyMessage;
  final ValueChanged<String> onReference;
  final ValueChanged<String> onManualNote;
  final ValueChanged<bool> onBankChecked;
  final VoidCallback onAdmit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = selected.name ?? l10n.hostFormsAnonymous;
    final message = selected.message;
    final manual = selected.manual;
    final admission = selected.admission;
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchText(
          l10n.hostFormsOfferStatusLine(
            status: hostOfferStatusText(l10n, selected.status),
            when: hostOfferTime(selected.expiresAt),
          ),
        ),
        if (selected.status == HostOfferStatus.offered)
          CatchStack(
            gap: CatchStackGap.g6,
            children: [
              CatchText(
                l10n.hostFormsOfferOnWhatsapp(name: name),
                variant: CatchTextVariant.labelKicker,
                tone: CatchTextTone.secondary,
              ),
              if (message != null) ...[
                CatchChatBubble(
                  text: message,
                  variant: CatchChatBubbleVariant.mine,
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g8,
                  equal: true,
                  children: [
                    CatchButton(
                      label: l10n.hostFormsOfferOpenWhatsapp,
                      leading: CatchIcon(CatchIcons.send),
                      size: CatchButtonSize.md,
                      fullWidth: true,
                      onPressed: busy || !selected.canOpenWhatsapp
                          ? null
                          : onOpenWhatsapp,
                    ),
                    CatchButton(
                      label: l10n.hostFormsOfferCopyMessage,
                      leading: CatchIcon(CatchIcons.copy),
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.md,
                      fullWidth: true,
                      onPressed: busy ? null : onCopyMessage,
                    ),
                  ],
                ),
                if (selected.copied || selected.openFailed)
                  CatchText(
                    selected.copied
                        ? l10n.hostFormsOfferMessageCopied
                        : l10n.hostFormsOfferWhatsappFailed,
                    variant: CatchTextVariant.bodyMeta,
                    tone: CatchTextTone.secondary,
                  ),
              ] else if (selected.blocked)
                CatchNotice.inline(
                  body: l10n.hostFormsOfferMessageBlocked,
                  tone: CatchNoticeTone.warning,
                )
              else
                CatchButton(
                  key: const ValueKey<String>('host-offer-prepare-message'),
                  label: l10n.hostFormsOfferPrepareMessage,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.md,
                  onPressed: busy ? null : onPrepareMessage,
                ),
            ],
          ),
        if (manual != null)
          _HostOfferManual(
            manual: manual,
            bankChecked: bankChecked,
            onReference: onReference,
            onNote: onManualNote,
            onBankChecked: onBankChecked,
          ),
        if (admission != null)
          _HostOfferAdmission(admission: admission, onAdmit: onAdmit),
      ],
    );
  }
}

/// The manual payment check: the guest's reference, the host's note and
/// their word that the bank shows the money.
class _HostOfferManual extends StatelessWidget {
  const _HostOfferManual({
    required this.manual,
    required this.bankChecked,
    required this.onReference,
    required this.onNote,
    required this.onBankChecked,
  });

  final HostOfferManual manual;
  final bool bankChecked;
  final ValueChanged<String> onReference;
  final ValueChanged<String> onNote;
  final ValueChanged<bool> onBankChecked;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection(
      title: l10n.hostFormsOfferPaymentTitle,
      kicker: l10n.hostFormsOfferPaymentKicker,
      dividers: CatchSectionPlacement.none,
      children: [
        ...switch (manual.status) {
          HostManualPaymentStatus.none => [
            CatchField.input(
              key: const ValueKey<String>('host-offer-reference'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormsOfferPaymentReference,
              maxLength: hostOfferReferenceLimit,
              contractExemption:
                  'Only a reference string is recorded; no URL or payment '
                  'token.',
              onChanged: onReference,
            ),
          ],
          HostManualPaymentStatus.evidenceSubmitted => [
            CatchText(
              l10n.hostFormsOfferPaymentEvidence(
                reference: manual.reference ?? '',
              ),
            ),
            CatchField.input(
              key: const ValueKey<String>('host-offer-review-note'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormsOfferPaymentNote,
              maxLength: hostOfferReferenceLimit,
              contractExemption: 'Host manual review note only.',
              onChanged: manual.busy ? null : onNote,
            ),
            CatchField.toggle(
              copy: catchFieldCopy(l10n),
              title: l10n.hostFormsOfferPaymentChecked,
              value: bankChecked,
              contractExemption:
                  'Explicit Host attestation after checking the bank receipt.',
              onChanged: manual.busy ? null : onBankChecked,
            ),
          ],
          HostManualPaymentStatus.hostAttestedReceived => [
            CatchText(
              l10n.hostFormsOfferPaymentReceived,
              tone: CatchTextTone.success,
            ),
          ],
          HostManualPaymentStatus.rejected => [
            CatchText(
              l10n.hostFormsOfferPaymentRejected,
              tone: CatchTextTone.warning,
            ),
          ],
        },
        if (manual.failed)
          CatchNotice.inline(
            body: l10n.hostFormsOfferFailed,
            tone: CatchNoticeTone.danger,
          ),
      ],
    );
  }
}

/// Letting the offered person in: check the place, then confirm.
class _HostOfferAdmission extends StatelessWidget {
  const _HostOfferAdmission({required this.admission, required this.onAdmit});

  final HostOfferAdmission admission;
  final VoidCallback onAdmit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSection(
      title: l10n.hostFormsOfferLetInTitle,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchText(switch (admission.phase) {
          HostOfferAdmissionPhase.check => l10n.hostFormsOfferLetInCheck,
          HostOfferAdmissionPhase.ready => l10n.hostFormsOfferLetInReady,
          HostOfferAdmissionPhase.keep => l10n.hostFormsOfferLetInKeep,
          HostOfferAdmissionPhase.saved ||
          HostOfferAdmissionPhase.again => l10n.hostFormsOfferLetInSaved,
          HostOfferAdmissionPhase.done => l10n.hostFormsOfferLetInDone,
        }, tone: CatchTextTone.secondary),
        if (admission.blocker case final blocker?)
          CatchNotice.inline(body: blocker, tone: CatchNoticeTone.danger),
        if (admission.failed)
          CatchNotice.inline(
            body: l10n.hostFormsOfferFailed,
            tone: CatchNoticeTone.danger,
          ),
        if (admission.phase != HostOfferAdmissionPhase.done)
          CatchStack(
            direction: CatchStackDirection.row,
            children: [
              CatchButton(
                key: const ValueKey<String>('host-offer-admit'),
                label: switch (admission.phase) {
                  HostOfferAdmissionPhase.check =>
                    l10n.hostFormsOfferLetInCheckAction,
                  HostOfferAdmissionPhase.again =>
                    l10n.hostFormsOfferLetInAgainAction,
                  HostOfferAdmissionPhase.saved => l10n.hostFormsTryAgain,
                  _ => l10n.hostFormsLetIn,
                },
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.md,
                status: admission.busy
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: admission.busy ? null : onAdmit,
              ),
            ],
          ),
      ],
    );
  }
}
