import 'dart:async';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_review_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'event_editor_preview.dart';
import 'host_form_workspace_use_cases.dart';
import 'operations/role_theme.dart';

enum _PreviewMode { loading, empty, failure, needsContact, prepared, existing }

@widgetbook.UseCase(
  name: 'Offer target loading',
  type: HostEventOfferWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferTargetLoading(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.loading);

@widgetbook.UseCase(
  name: 'No upcoming offer target',
  type: HostEventOfferWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferTargetEmpty(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.empty);

@widgetbook.UseCase(
  name: 'Offer target unavailable',
  type: HostEventOfferWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferTargetFailure(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.failure);

@widgetbook.UseCase(
  name: 'CRM contact conversion required',
  type: HostEventOfferWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferNeedsContact(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.needsContact);

@widgetbook.UseCase(
  name: 'Offer review ready',
  type: HostEventOfferWorkspaceBodySection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferPrepared(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.prepared);

@widgetbook.UseCase(
  name: 'Existing offer review',
  type: HostEventOfferWorkspaceSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferExisting(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.existing);

class _OfferWorkspaceFixture extends StatefulWidget {
  const _OfferWorkspaceFixture({required this.mode});
  final _PreviewMode mode;

  @override
  State<_OfferWorkspaceFixture> createState() => _OfferWorkspaceFixtureState();
}

class _OfferWorkspaceFixtureState extends State<_OfferWorkspaceFixture> {
  late final HostResponseQueryController _query = HostResponseQueryController(
    _FixtureQuery(),
  );
  bool _selected = false;

  @override
  void initState() {
    super.initState();
    _query
        .apply(
          const HostResponseQueryRequest(
            organizerId: 'org_demo',
            formId: 'form_1',
            versionId: 'version_1',
          ),
        )
        .then((_) {
          if (!mounted) return;
          _query.toggleSelection('response_1');
          setState(() => _selected = true);
        });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => WidgetbookThemedHostPreview(
    themeMode: Theme.of(context).brightness == Brightness.dark
        ? ThemeMode.dark
        : ThemeMode.light,
    child: SizedBox(
      width: 580,
      height: 740,
      child: Scaffold(
        body: SingleChildScrollView(
          child: _selected
              ? eventOfferPreview(
                  _FixtureOffers(),
                  HostEventOfferWorkspaceSection(
                    organizerId: 'org_demo',
                    accountId: 'manager_demo',
                    queryController: _query,
                    offerScope: previewOfferScope,
                    listOffers:
                        ({
                          required organizerId,
                          required eventId,
                          afterOfferId,
                        }) async => {
                          'items': widget.mode == _PreviewMode.existing
                              ? [
                                  {
                                    'offerId': 'offer_demo',
                                    'eventId': 'event_demo',
                                    'contactId': 'contact_demo',
                                    'effectiveStatus': 'offered',
                                  },
                                ]
                              : <Object>[],
                          'nextCursor': null,
                        },
                    getOffer:
                        ({
                          required organizerId,
                          required eventId,
                          required contactId,
                        }) async => _previewOffer(),
                    prepareHandoff: ({required offer}) async =>
                        const HostOfferHandoff(
                          kind: 'blocked',
                          offerId: 'offer_demo',
                          blockers: ['fixture'],
                        ),
                    copyMessage: (_) async {},
                    openHandoff: (_) async => false,
                    targets: _FixtureTargets(widget.mode),
                    getResponseDetail: (_) async => HostFormResponseDetail(
                      response: hostFormResponsePreviewDetail.response,
                      contactId: widget.mode == _PreviewMode.needsContact
                          ? null
                          : 'contact_demo',
                      answers: hostFormResponsePreviewDetail.answers,
                      consentVersion:
                          hostFormResponsePreviewDetail.consentVersion,
                      completionMillis:
                          hostFormResponsePreviewDetail.completionMillis,
                    ),
                    openResponseForConversion: (_) async {},
                    openEventSettings: (_) async {},
                    copy: _copy,
                    now: () => DateTime.utc(2026, 9, 24),
                    initiallyReviewSelection: true,
                    initialEventId:
                        widget.mode == _PreviewMode.needsContact ||
                            widget.mode == _PreviewMode.prepared ||
                            widget.mode == _PreviewMode.existing
                        ? 'event_demo'
                        : null,
                  ),
                )
              : const Center(child: CircularProgressIndicator()),
        ),
      ),
    ),
  );
}

class _FixtureQuery implements HostResponseQueryGateway {
  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async =>
      HostResponseQueryPage(
        form: const HostResponseQueryForm(
          formId: 'form_1',
          title: 'Saturday Social application',
          versionId: 'version_1',
          version: 1,
        ),
        items: [
          HostResponseQueryRow(
            responseId: 'response_1',
            formId: 'form_1',
            formTitle: 'Saturday Social application',
            versionId: 'version_1',
            version: 1,
            status: HostFormResponseStatus.submitted,
            identityKind: HostFormResponseIdentityKind.phoneVerified,
            identity: hostFormResponsePreviewDetail.response.identity,
            sourceLinkId: null,
            submittedAt: DateTime.utc(2026, 9, 20),
            withdrawnAt: null,
          ),
        ],
        nextCursor: null,
        total: 1,
        selectedIds: const {'response_1'},
        queryHash: 'fixture-query',
        resultHash: 'fixture-result',
        fieldCatalog: const [],
      );
}

class _FixtureTargets implements HostOfferEventTargetsGateway {
  const _FixtureTargets(this.mode);
  final _PreviewMode mode;

  @override
  Future<HostOfferEventTargetPage> list({
    required String organizerId,
    String? cursor,
  }) async {
    if (mode == _PreviewMode.loading) {
      return Completer<HostOfferEventTargetPage>().future;
    }
    if (mode == _PreviewMode.failure) {
      throw StateError('Synthetic manager list unavailable');
    }
    return HostOfferEventTargetPage(
      mode == _PreviewMode.empty
          ? const []
          : [
              HostOfferEventTarget(
                eventId: 'event_demo',
                name: 'Sunday run',
                startTime: DateTime.utc(2026, 10, 4),
                timezone: 'Asia/Kolkata',
                publicationState: 'private',
                setupRevision: 2,
              ),
            ],
      null,
    );
  }

  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) async => HostOfferEventConfiguration(
    organizerId: organizerId,
    eventId: eventId,
    eventSourceRevision: 2,
    startsAt: DateTime.utc(2026, 10, 4),
    serverNow: DateTime.utc(2026, 9, 24),
    paymentTerms: const {'preferredCollection': 'manualInstructions'},
    suggestedExpiresAt: DateTime.utc(2026, 10, 1),
  );
}

class _FixtureOffers implements HostEventOfferGateway {
  @override
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft) async =>
      const HostOfferPreview(
        planDigest: 'fixture',
        rows: [
          HostOfferPreviewRow(
            offerId: 'offer_demo',
            revision: 0,
            generation: 0,
            status: 'new',
          ),
        ],
      );

  @override
  Future<HostOfferCommitReceipt> commit({
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  }) => Future.error(StateError('Widgetbook fixture does not write offers.'));

  @override
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) => Future.error(StateError('Widgetbook fixture does not write evidence.'));

  @override
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) => Future.error(StateError('Widgetbook fixture does not attest payment.'));
}

final _copy = HostEventOfferWorkspaceCopy(
  create: 'Create event offers',
  selectEvent: 'Choose an event',
  chooseForRecipient: (name) => 'Choose an event for $name',
  chooseForRecipients: (count) => 'Choose an event for $count people',
  loadingEvents: 'Loading events',
  preparingOffer: 'Preparing offer',
  loadingOffer: 'Loading offer',
  preparingMessage: 'Preparing message',
  cancelPreparation: 'Cancel preparation',
  emptyEvents: 'No eligible upcoming events',
  untitledEvent: 'Untitled event',
  loadMoreEvents: 'Load more events',
  needsContact: 'Create a CRM contact first',
  convertContact: 'Create CRM contact',
  selectionChanged: 'Selected responses changed; review again',
  loadFailed: 'Could not load event offers',
  issued: 'Offers recorded; no admission created',
  refresh: 'Refresh offers',
  existing: 'Existing offers',
  noOffers: 'No offers recorded',
  configurePayment: 'Configure event payment terms',
  openSettings: 'Open event settings',
  statusDraft: 'Draft',
  statusOffered: 'Offered',
  statusWithdrawn: 'Withdrawn',
  statusExpired: 'Expired',
  personalPaymentLink: (name) => 'Personal payment link for $name',
  openExisting: 'Review offer',
  handoffPrepare: 'Prepare personal handoff',
  handoffBlocked: 'Handoff unavailable',
  handoffDisclosure: 'Review and send in WhatsApp; Catch cannot track it.',
  openWhatsapp: 'Open WhatsApp',
  copyMessage: 'Copy message',
  messageCopied: 'Message copied. Sending is your choice.',
  handoffOpenFailed: 'Could not open WhatsApp.',
  review: HostEventOfferReviewCopy(
    title: 'Event offer',
    preview: 'Preview offers',
    previewing: 'Checking eligibility',
    review: 'Review offer details',
    expires: (date) => 'Expires $date',
    commit: 'Record offers',
    committing: 'Recording offers',
    committed: 'Offers recorded',
    failed: 'Offer action failed',
    noReservation: 'No seat or admission is created',
    paymentReference: 'Payment reference',
    recordReference: 'Record reference',
    evidenceSubmitted: 'Evidence submitted',
    bankReceiptChecked: 'Bank receipt checked',
    reviewNote: 'Review note',
    attestReceived: 'Attest received',
    rejectReference: 'Reject reference',
    hostAttested: 'Attested',
    rejected: 'Rejected',
  ),
);

HostEventOffer _previewOffer() => HostEventOffer(
  offerId: 'offer_demo',
  organizerId: 'org_demo',
  eventId: 'event_demo',
  contactId: 'contact_demo',
  sourceId: 'response_1',
  sourceKind: HostOfferSourceKind.formResponse,
  status: HostOfferStatus.offered,
  effectiveStatus: HostOfferStatus.offered,
  generation: 1,
  revision: 2,
  expiresAt: DateTime.utc(2026, 10, 1),
  organizerPaymentLink: null,
  manualPayment: const HostManualPaymentReview(
    status: HostManualPaymentStatus.none,
    evidenceReference: null,
    evidenceRecordedAt: null,
    reviewedByUid: null,
    reviewedAt: null,
    reviewNote: null,
    bankReceiptChecked: false,
  ),
);

@widgetbook.UseCase(
  name: 'Offer body and primary action',
  type: HostEventOfferWorkspaceLayout,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferLayoutPreview(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.prepared);

@widgetbook.UseCase(
  name: 'Prepared offer content',
  type: HostEventOfferWorkspaceContentSection,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostOfferContentPreview(BuildContext context) =>
    const _OfferWorkspaceFixture(mode: _PreviewMode.prepared);
