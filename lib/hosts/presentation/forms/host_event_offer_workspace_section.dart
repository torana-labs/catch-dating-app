import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_admission_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/experimental/scope.dart';

part 'host_event_offer_workspace_copy.dart';

/// One manager's reviewed query selection. No offer is prepared from a list
/// label alone: every selected response is read again and the materialized
/// query hash is rechecked after the event choice and an inline return.
class HostEventOfferWorkspaceSection extends StatelessWidget {
  const HostEventOfferWorkspaceSection({
    super.key,
    required this.organizerId,
    required this.accountId,
    this.queryController,
    this.responseId,
    this.recipientLabel,
    required this.offerScope,
    required this.listOffers,
    required this.getOffer,
    required this.prepareHandoff,
    required this.copyMessage,
    required this.openHandoff,
    required this.targets,
    required this.getResponseDetail,
    this.isResponseReviewed,
    required this.openResponseForConversion,
    required this.openEventSettings,
    required this.copy,
    required this.now,
    this.initiallyReviewSelection = false,
    this.initialEventId,
    this.initialEventTarget,
    this.onCreateEvent,
    this.admissionSession,
    this.layoutBuilder,
  });

  final Widget Function(Widget body, Widget? primaryAction)? layoutBuilder;
  final String organizerId;
  final String? accountId;
  final HostResponseQueryController? queryController;
  final String? responseId;
  final String? recipientLabel;
  final HostEventOfferScope offerScope;
  final Future<Map<String, Object?>> Function({
    required String organizerId,
    required String eventId,
    String? afterOfferId,
  })
  listOffers;
  final Future<HostEventOffer> Function({
    required String organizerId,
    required String eventId,
    required String contactId,
  })
  getOffer;
  final Future<HostOfferHandoff> Function({required HostEventOffer offer})
  prepareHandoff;
  final Future<void> Function(String text) copyMessage;
  final Future<bool> Function(Uri uri) openHandoff;
  final HostOfferEventTargetsGateway targets;
  final Future<HostFormResponseDetail> Function(String responseId)
  getResponseDetail;
  final Future<bool> Function(HostFormResponseDetail)? isResponseReviewed;
  final Future<void> Function(String responseId) openResponseForConversion;
  final Future<void> Function(String eventId) openEventSettings;
  final HostEventOfferWorkspaceCopy copy;
  final DateTime Function() now;
  final bool initiallyReviewSelection;
  final String? initialEventId;
  final HostOfferEventTarget? initialEventTarget;

  /// Starts the manager's inline event creation route. The parent owns the
  /// return: a saved event comes back through [initialEventTarget] and this
  /// selection is revalidated before any offer is drafted. Null keeps the
  /// create action hidden while private event setup stays release gated.
  final Future<void> Function()? onCreateEvent;
  final HostFormAdmissionSession Function(
    HostEventOffer offer,
    String responseId,
  )?
  admissionSession;

  @override
  Widget build(BuildContext context) {
    final scope = (
      offers: offerScope,
      query: queryController,
      responseId: responseId,
      initialEventId: initialEventId,
      initialTargetId: initialEventTarget?.eventId,
      initialTargetRevision: initialEventTarget?.setupRevision,
    );
    return ProviderScope(
      overrides: [
        // Own the entire family here so pending work is disposed with this
        // route, including when dependencies are inherited from a parent.
        hostEventOfferWorkspaceControllerProvider.overrideWith2(
          (_) => HostEventOfferWorkspaceController(),
        ),
        hostEventOfferWorkspaceDependenciesProvider.overrideWith(
          (ref, scope) => HostEventOfferWorkspaceDependencies(
            organizerId: organizerId,
            accountId: accountId,
            queryController: queryController,
            responseId: responseId,
            offerScope: offerScope,
            listOffers: listOffers,
            getOffer: getOffer,
            prepareHandoff: prepareHandoff,
            copyMessage: copyMessage,
            openHandoff: openHandoff,
            targets: targets,
            getResponseDetail: getResponseDetail,
            isResponseReviewed: isResponseReviewed,
            openResponseForConversion: openResponseForConversion,
            openEventSettings: openEventSettings,
            now: now,
            initialEventId: initialEventId,
            initialEventTarget: initialEventTarget,
          ),
        ),
      ],
      child: HostEventOfferWorkspaceBodySection(
        key: ValueKey(scope),
        workspace: this,
        scope: scope,
      ),
    );
  }
}

@Dependencies([HostEventOfferWorkspaceController])
class HostEventOfferWorkspaceBodySection extends ConsumerStatefulWidget {
  const HostEventOfferWorkspaceBodySection({
    super.key,
    required this.workspace,
    required this.scope,
  });
  final HostEventOfferWorkspaceSection workspace;
  final HostEventOfferWorkspaceScope scope;
  @override
  ConsumerState<HostEventOfferWorkspaceBodySection> createState() =>
      _HostEventOfferWorkspaceSectionState();
}

class _HostEventOfferWorkspaceSectionState
    extends ConsumerState<HostEventOfferWorkspaceBodySection> {
  HostEventOfferWorkspaceController get _controller => ref.read(
    hostEventOfferWorkspaceControllerProvider(widget.scope).notifier,
  );
  HostEventOfferWorkspaceState get _snapshot =>
      ref.read(hostEventOfferWorkspaceControllerProvider(widget.scope));
  @override
  void initState() {
    super.initState();
    if (widget.workspace.initiallyReviewSelection) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.start();
      });
    }
  }

  String? _amountLabel(BuildContext context) {
    final terms = _snapshot.configuration?.paymentTerms;
    final amount = terms?['expectedAmountMinor'];
    final currency = terms?['currency'];
    if (amount == 0) return context.l10n.hostEventOfferFree;
    if (amount is! int || currency is! String) return null;
    return formatMinorCurrency(amount, currencyCode: currency);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(hostEventOfferWorkspaceControllerProvider(widget.scope));
    final copy = widget.workspace.copy;
    final selected = _snapshot.selectedOffer;
    final event = _snapshot.event;
    final configuration = _snapshot.configuration;
    final draft = _snapshot.draft;
    final commitRequestId = _snapshot.commitRequestId;
    if (event != null &&
        !_snapshot.preparing &&
        _snapshot.missingContacts.isEmpty &&
        configuration != null &&
        configuration.suggestedExpiresAt != null &&
        selected == null &&
        draft != null &&
        commitRequestId != null) {
      return HostEventOfferReviewSection(
        layoutBuilder: (body, action) => HostEventOfferWorkspaceLayout(
          layoutBuilder: widget.workspace.layoutBuilder,
          body: HostEventOfferWorkspaceContentSection(
            _controller,
            _snapshot,
            widget.workspace,
            review: body,
          ),
          action: action,
        ),
        scope: widget.workspace.offerScope,
        draft: draft,
        amountLabel: _amountLabel(context),
        showEvent: false,
        eventTitle: event.name?.trim().isNotEmpty == true
            ? event.name!
            : copy.untitledEvent,
        contactLabel: (id) =>
            _snapshot.details
                .where((detail) => detail.contactId == id)
                .firstOrNull
                ?.response
                .identity
                .primaryLabel ??
            context.l10n.hostFormResponsesAnonymous,
        eventStartsAt: configuration.startsAt,
        now: widget.workspace.now,
        commitRequestId: commitRequestId,
        copy: copy.review,
      );
    }
    if (selected != null &&
        selected.effectiveStatus == HostOfferStatus.offered &&
        selected.paymentSnapshot != null &&
        selected.paymentSnapshot!.expectedAmountMinor > 0 &&
        const {
          'manualInstructions',
          'reusablePage',
          'personalRequest',
        }.contains(selected.paymentSnapshot!.collectionMode)) {
      return HostManualPaymentReviewSection(
        layoutBuilder: (body, action) => HostEventOfferWorkspaceLayout(
          layoutBuilder: widget.workspace.layoutBuilder,
          body: HostEventOfferWorkspaceContentSection(
            _controller,
            _snapshot,
            widget.workspace,
            manual: body,
          ),
          action: action,
        ),
        key: ValueKey(
          'offer-manual-${selected.offerId}-'
          '${selected.generation}-${selected.revision}',
        ),
        scope: widget.workspace.offerScope,
        offer: selected,
        copy: copy.review,
        referenceRequestId: _snapshot.referenceRequestId!,
        reviewRequestId: _snapshot.reviewRequestId!,
        onUpdated: _controller.manualUpdated,
      );
    }
    final personal =
        _snapshot.selectedOffer == null &&
        _snapshot.draft == null &&
        _snapshot.personalMode &&
        _snapshot.missingContacts.isEmpty &&
        _snapshot.configuration?.suggestedExpiresAt != null;
    return HostEventOfferWorkspaceLayout(
      layoutBuilder: widget.workspace.layoutBuilder,
      body: HostEventOfferWorkspaceContentSection(
        _controller,
        _snapshot,
        widget.workspace,
      ),
      action: personal
          ? CatchDock.pageAction(
              label: copy.review.preview,
              onPressed: _snapshot.loading ? null : _controller.previewPersonal,
            )
          : null,
    );
  }
}

class HostEventOfferWorkspaceLayout extends StatelessWidget {
  const HostEventOfferWorkspaceLayout({
    super.key,
    required this.layoutBuilder,
    required this.body,
    this.action,
  });
  final Widget Function(Widget body, Widget? action)? layoutBuilder;
  final Widget body;
  final Widget? action;
  @override
  Widget build(BuildContext context) =>
      layoutBuilder?.call(body, action) ??
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [body, ?action],
      );
}

/// Pure content composition; the parent owns controller lifetime and listeners.
class HostEventOfferWorkspaceContentSection extends StatelessWidget {
  const HostEventOfferWorkspaceContentSection(
    this.controller,
    this.snapshot,
    this.workspace, {
    super.key,
    this.review,
    this.manual,
  });
  final HostEventOfferWorkspaceController controller;
  final HostEventOfferWorkspaceState snapshot;
  final HostEventOfferWorkspaceSection workspace;
  final Widget? review;
  final Widget? manual;

  String _offerLabel(Map<String, Object?> offer) =>
      snapshot.details
          .where((detail) => detail.contactId == offer['contactId'])
          .firstOrNull
          ?.response
          .identity
          .primaryLabel ??
      workspace.copy.existing;

  String _offerStatus(Object? status) => switch (status) {
    'draft' => workspace.copy.statusDraft,
    'offered' => workspace.copy.statusOffered,
    'withdrawn' => workspace.copy.statusWithdrawn,
    'expired' => workspace.copy.statusExpired,
    _ => workspace.copy.loadFailed,
  };

  String _eventTimeLabel(HostOfferEventTarget event) {
    final local = event.startTime.toLocal();
    // The clock is shown in the device's local zone, with one matching label.
    return '${AppTimeFormatters.dateTime(local)} ${local.timeZoneName}';
  }

  @override
  Widget build(BuildContext context) {
    final copy = workspace.copy;
    final intent = workspace.queryController?.selectionIntent;
    final selectedRow = snapshot.ids.length == 1
        ? workspace.queryController?.view.rows
              .where((row) => row.responseId == snapshot.ids.single)
              .firstOrNull
        : null;
    final recipient =
        (workspace.recipientLabel ?? selectedRow?.identity.primaryLabel)
            ?.trim();
    final contextLabel = recipient?.isNotEmpty == true
        ? copy.chooseForRecipient(recipient!)
        : snapshot.ids.length > 1
        ? copy.chooseForRecipients(snapshot.ids.length)
        : copy.selectEvent;
    final stageLabel = switch (snapshot.stage) {
      HostOfferWorkspaceStage.loadingEvents => copy.loadingEvents,
      HostOfferWorkspaceStage.preparingOffer => copy.preparingOffer,
      HostOfferWorkspaceStage.loadingOffer => copy.loadingOffer,
      HostOfferWorkspaceStage.preparingMessage => copy.preparingMessage,
      HostOfferWorkspaceStage.idle => null,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!workspace.initiallyReviewSelection &&
            snapshot.ids.isEmpty &&
            (intent != null || workspace.responseId != null) &&
            workspace.accountId != null)
          CatchSection.plain(
            child: CatchButton(
              label: copy.create,
              onPressed: snapshot.loading ? null : controller.start,
            ),
          ),
        if (snapshot.ids.isNotEmpty) ...[
          CatchSection.plain(
            child: CatchText(
              contextLabel,
              variant: CatchTextVariant.sectionTitle,
            ),
          ),
          if (snapshot.event == null) ...[
            if (snapshot.events.isEmpty && !snapshot.loading)
              CatchSection.plain(
                child: CatchText(
                  copy.emptyEvents,
                  variant: CatchTextVariant.supporting,
                ),
              ),
            if (snapshot.events.isNotEmpty)
              CatchSection.fieldRows(
                children: [
                  for (final event in snapshot.events)
                    CatchField.nav(
                      emphasis: CatchFieldEmphasis.title,
                      key: ValueKey('offer-target-${event.eventId}'),
                      copy: catchFieldCopy(context.l10n),
                      title: event.name?.trim().isNotEmpty == true
                          ? event.name!
                          : copy.untitledEvent,
                      body: _eventTimeLabel(event),
                      onTap: snapshot.loading
                          ? null
                          : () => controller.choose(event),
                    ),
                ],
              ),
            if (snapshot.nextEventCursor != null)
              CatchSection.plain(
                child: CatchButton(
                  label: copy.loadMoreEvents,
                  variant: CatchButtonVariant.secondary,
                  onPressed: snapshot.loading ? null : controller.loadEvents,
                ),
              ),
            if (workspace.onCreateEvent != null) gapH12,
            if (workspace.onCreateEvent != null)
              CatchSection.plain(
                child: CatchButton(
                  key: const ValueKey('offer-create-event'),
                  label: context.l10n.hostsHostEventsListLabelNewEvent,
                  fullWidth: true,
                  variant: CatchButtonVariant.secondary,
                  onPressed: snapshot.loading ? null : workspace.onCreateEvent,
                ),
              ),
          ],
          if (snapshot.event != null) ...[
            CatchSection.fieldRows(
              children: [
                CatchField.nav(
                  emphasis: CatchFieldEmphasis.title,
                  copy: catchFieldCopy(context.l10n),
                  title: snapshot.event!.name ?? copy.untitledEvent,
                  body:
                      '${_eventTimeLabel(snapshot.event!)} · ${context.l10n.hostEventOfferChangeEvent}',
                  onTap:
                      snapshot.loading && !snapshot.canCancelPreparation ||
                          snapshot.hasUnresolvedCommand
                      ? null
                      : controller.changeEvent,
                ),
              ],
            ),
            if (snapshot.missingContacts.isNotEmpty) ...[
              CatchSection.plain(
                child: CatchText(
                  copy.needsContact,
                  variant: CatchTextVariant.supporting,
                ),
              ),
              CatchSection.fieldRows(
                children: [
                  for (final detail in snapshot.missingContacts)
                    CatchField.nav(
                      emphasis: CatchFieldEmphasis.title,
                      key: ValueKey(
                        'offer-convert-${detail.response.responseId}',
                      ),
                      copy: catchFieldCopy(context.l10n),
                      title:
                          detail.response.identity.primaryLabel ??
                          context.l10n.hostFormResponsesAnonymous,
                      body: copy.convertContact,
                      onTap: snapshot.loading
                          ? null
                          : () => controller.returnForConversion(
                              detail.response.responseId,
                            ),
                    ),
                ],
              ),
            ] else if (!snapshot.preparing &&
                snapshot.configuration != null &&
                snapshot.configuration!.suggestedExpiresAt == null)
              CatchSection.plain(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    CatchText(
                      copy.configurePayment,
                      variant: CatchTextVariant.supporting,
                    ),
                    CatchButton(
                      label: copy.openSettings,
                      onPressed: snapshot.loading
                          ? null
                          : controller.openSettings,
                    ),
                  ],
                ),
              )
            else if (snapshot.selectedOffer == null &&
                !snapshot.preparing &&
                snapshot.draft != null &&
                snapshot.commitRequestId != null)
              review!,

            if (snapshot.selectedOffer == null &&
                snapshot.draft == null &&
                snapshot.personalMode &&
                snapshot.missingContacts.isEmpty &&
                snapshot.configuration?.suggestedExpiresAt != null) ...[
              CatchSection.fieldRows(
                children: [
                  for (final detail in snapshot.details)
                    CatchField.input(
                      key: ValueKey('offer-link-${detail.response.responseId}'),
                      copy: catchFieldCopy(context.l10n),
                      title: copy.personalPaymentLink(
                        detail.response.identity.primaryLabel ??
                            context.l10n.hostFormResponsesAnonymous,
                      ),
                      contractExemption:
                          'Explicit organizer-owned HTTPS link '
                          'for this recipient; no provider charge is initiated.',
                      onChanged: (value) =>
                          controller.setPersonalLink(detail.contactId!, value),
                    ),
                ],
              ),
            ],
            if (snapshot.offers.isNotEmpty && snapshot.selectedOffer == null)
              CatchSection.plain(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (snapshot.offerFlow.status ==
                        HostOfferFlowStatus.committed)
                      CatchText(
                        copy.issued,
                        variant: CatchTextVariant.supporting,
                      ),
                    CatchText(
                      copy.existing,
                      variant: CatchTextVariant.sectionTitle,
                    ),
                    if (snapshot.offers.isEmpty)
                      CatchText(
                        copy.noOffers,
                        variant: CatchTextVariant.supporting,
                      ),
                    CatchButton(
                      label: copy.refresh,
                      variant: CatchButtonVariant.secondary,
                      onPressed: snapshot.loading
                          ? null
                          : controller.refreshOffers,
                    ),
                    if (snapshot.nextOfferCursor != null)
                      CatchButton(
                        label: context.l10n.hostFormResponsesLoadMore,
                        variant: CatchButtonVariant.secondary,
                        onPressed: snapshot.loading
                            ? null
                            : () => controller.fetchMoreOffers(),
                      ),
                  ],
                ),
              ),
            if (snapshot.offers.isNotEmpty && snapshot.selectedOffer == null)
              CatchSection.fieldRows(
                children: [
                  for (final offer in snapshot.offers)
                    CatchField.nav(
                      emphasis: CatchFieldEmphasis.title,
                      key: ValueKey('offer-existing-${offer['offerId']}'),
                      copy: catchFieldCopy(context.l10n),
                      title: _offerLabel(offer),
                      body:
                          '${_offerStatus(offer['effectiveStatus'])} · '
                          '${copy.openExisting}',
                      onTap: snapshot.loading
                          ? null
                          : () => controller.selectExisting(offer),
                    ),
                ],
              ),
            if (snapshot.selectedOffer case final selected?) ...[
              CatchSection.fieldRows(
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostEventOfferRecipient,
                    valueText:
                        snapshot.details
                            .where((d) => d.contactId == selected.contactId)
                            .firstOrNull
                            ?.response
                            .identity
                            .primaryLabel ??
                        context.l10n.hostFormResponsesAnonymous,
                    body:
                        '${_offerStatus(selected.effectiveStatus.name)} · ${copy.review.expires(MaterialLocalizations.of(context).formatMediumDate(selected.expiresAt.toLocal()))}',
                  ),
                ],
              ),
              if (snapshot.ids.length > 1)
                CatchSection.plain(
                  child: CatchButton(
                    label: copy.existing,
                    variant: CatchButtonVariant.secondary,
                    onPressed: snapshot.loading
                        ? null
                        : controller.closeExisting,
                  ),
                ),
              if (selected.effectiveStatus == HostOfferStatus.offered)
                CatchSection.plain(
                  child: CatchButton(
                    label: copy.handoffPrepare,
                    fullWidth: true,
                    variant: CatchButtonVariant.secondary,
                    onPressed: snapshot.loading
                        ? null
                        : controller.prepareSelectedHandoff,
                  ),
                ),
              if (snapshot.handoff?.kind == 'blocked')
                CatchSection.plain(
                  child: CatchText(
                    copy.handoffBlocked,
                    variant: CatchTextVariant.supporting,
                  ),
                ),
              if (snapshot.handoff?.kind == 'prepared')
                CatchSection.plain(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchText(
                        copy.handoffDisclosure,
                        variant: CatchTextVariant.supporting,
                      ),
                      CatchText(
                        snapshot.handoff!.editableText!,
                        variant: CatchTextVariant.supporting,
                      ),
                      Wrap(
                        children: [
                          CatchButton(
                            label: copy.openWhatsapp,
                            onPressed:
                                snapshot.loading ||
                                    snapshot.handoff!.whatsappUrl == null
                                ? null
                                : controller.openPreparedWhatsapp,
                          ),
                          CatchButton(
                            label: copy.copyMessage,
                            variant: CatchButtonVariant.secondary,
                            onPressed: snapshot.loading
                                ? null
                                : controller.copyPreparedHandoff,
                          ),
                        ],
                      ),
                      if (snapshot.messageCopied)
                        CatchText(
                          copy.messageCopied,
                          variant: CatchTextVariant.supporting,
                        ),
                      if (snapshot.handoffOpenFailed)
                        CatchText(
                          copy.handoffOpenFailed,
                          variant: CatchTextVariant.supporting,
                        ),
                    ],
                  ),
                ),
              if (workspace.admissionSession != null &&
                  snapshot.selectedResponseId != null &&
                  selected.effectiveStatus == HostOfferStatus.offered)
                HostFormAdmissionSection(
                  key: ValueKey(
                    'admission-${workspace.accountId}-${selected.offerId}-'
                    '${selected.revision}-${selected.generation}',
                  ),
                  session: workspace.admissionSession!(
                    selected,
                    snapshot.selectedResponseId!,
                  ),
                  onAdmitted: controller.refreshOffers,
                ),
              if (selected.effectiveStatus == HostOfferStatus.offered &&
                  selected.paymentSnapshot != null &&
                  selected.paymentSnapshot!.expectedAmountMinor > 0 &&
                  const {
                    'manualInstructions',
                    'reusablePage',
                    'personalRequest',
                  }.contains(selected.paymentSnapshot!.collectionMode))
                manual!,
            ],
          ],
        ],
        if (stageLabel != null)
          CatchSection.plain(
            child: CatchText(stageLabel, variant: CatchTextVariant.supporting),
          ),
        if (snapshot.preparing)
          CatchSection.plain(
            child: CatchButton(
              key: const ValueKey('offer-cancel-preparation'),
              label: copy.cancelPreparation,
              variant: CatchButtonVariant.secondary,
              onPressed: snapshot.canCancelPreparation
                  ? controller.cancelPreparation
                  : null,
            ),
          ),
        if (snapshot.hasError || snapshot.selectionStale) ...[
          CatchSection.plain(
            child: CatchText(
              snapshot.selectionStale ? copy.selectionChanged : copy.loadFailed,
              variant: CatchTextVariant.supporting,
            ),
          ),
          if (!snapshot.hasUnresolvedCommand)
            CatchSection.plain(
              child: CatchButton(
                label: context.l10n.sharedActionTryAgain,
                onPressed: snapshot.loading ? null : controller.retry,
              ),
            ),
        ],
      ],
    );
  }
}
