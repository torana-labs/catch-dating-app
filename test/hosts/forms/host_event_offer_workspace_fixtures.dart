part of 'host_event_offer_workspace_test.dart';

// Synthetic collaborators shared by the offer-workspace behavior scenarios.
class _SwitchingAuth extends Fake implements FirebaseAuth {
  _SwitchingAuth(this.uid);
  String? uid;

  @override
  User? get currentUser => uid == null ? null : _SwitchingUser(uid!);
}

class _SwitchingUser extends Fake implements User {
  _SwitchingUser(this.uid);
  @override
  final String uid;
}

class _UnusedFunctions extends Fake implements FirebaseFunctions {}

class _SwitchingQuery implements HostResponseQueryGateway {
  int calls = 0;
  Completer<HostResponseQueryPage>? nextResponse;

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) {
    calls++;
    return nextResponse?.future ?? Future.value(page('Maya', 'response-one'));
  }

  static HostResponseQueryPage page(String name, String responseId) =>
      HostResponseQueryPage(
        form: const HostResponseQueryForm(
          formId: 'form',
          title: 'Form',
          versionId: 'form_v1',
          version: 1,
        ),
        items: [
          HostResponseQueryRow.fromMap({
            'responseId': responseId,
            'formId': 'form',
            'formTitle': 'Form',
            'versionId': 'form_v1',
            'version': 1,
            'status': 'submitted',
            'identityKind': 'phoneVerified',
            'identity': {
              'displayName': name,
              'email': null,
              'phoneE164': null,
              'origin': 'respondentGranted',
            },
            'sourceLinkId': null,
            'submittedAtMillis': 1790000000000,
            'withdrawnAtMillis': null,
          }),
        ],
        nextCursor: null,
        total: 1,
        selectedIds: {responseId},
        queryHash: 'query',
        resultHash: 'result-$responseId',
        fieldCatalog: const [],
      );
}

/// Scripted legacy reads shared by every request family. Riverpod gives each
/// family element its own notifier, so tests must not reuse one instance.
class _LegacyResponseScript {
  Completer<HostFormResponsesState>? nextResponse;
}

class _SwitchingLegacyResponses extends HostFormResponsesController {
  _SwitchingLegacyResponses([this._script]);

  final _LegacyResponseScript? _script;

  @override
  Future<HostFormResponsesState> build(HostFormResponseListRequest request) =>
      _script?.nextResponse?.future ??
      Future.value(
        HostFormResponsesState(
          responses: [response('Maya', 'response-one')],
          nextCursor: null,
        ),
      );

  static HostFormResponseSummary response(String name, String id) =>
      HostFormResponseSummary.fromMap({
        'responseId': id,
        'formId': 'form',
        'formTitle': 'Form',
        'versionId': 'form_v1',
        'version': 1,
        'status': 'submitted',
        'identityKind': 'phoneVerified',
        'identity': {
          'displayName': name,
          'email': null,
          'phoneE164': null,
          'origin': 'respondentGranted',
        },
        'sourceLinkId': null,
        'sourceLabel': null,
        'submittedAtMillis': 1790000000000,
        'withdrawnAtMillis': null,
        'highlights': const <Object>[],
        'conversionKinds': const <Object>[],
      });
}

class _PendingMutation implements HostOfferMutationOutbox {
  bool unresolved = true;
  int reads = 0;
  int replays = 0;
  int newMutations = 0;

  @override
  Future<HostOfferPendingMutation?> pendingMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) async {
    reads++;
    return unresolved
        ? const HostOfferPendingMutation(
            requestId: 'reference_saved',
            contactId: 'contact-one',
            kind: 'recordEvidence',
            decision: null,
          )
        : null;
  }

  @override
  Future<HostEventOffer> replayMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) async {
    replays++;
    unresolved = false;
    return _existingOffer();
  }

  @override
  Future<HostEventOffer> mutate({
    required String accountId,
    required HostEventOffer offer,
    required Map<String, Object?> action,
  }) async {
    newMutations++;
    return offer;
  }
}

class _Query implements HostResponseQueryGateway {
  String hash = 'result';

  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async =>
      HostResponseQueryPage(
        form: const HostResponseQueryForm(
          formId: 'form',
          title: 'Form',
          versionId: 'form_v1',
          version: 1,
        ),
        items: [
          HostResponseQueryRow.fromMap(const {
            'responseId': 'response-one',
            'formId': 'form',
            'formTitle': 'Form',
            'versionId': 'form_v1',
            'version': 1,
            'status': 'submitted',
            'identityKind': 'phoneVerified',
            'identity': {
              'displayName': 'Maya',
              'email': null,
              'phoneE164': null,
              'origin': 'respondentGranted',
            },
            'sourceLinkId': null,
            'submittedAtMillis': 1790000000000,
            'withdrawnAtMillis': null,
          }),
        ],
        nextCursor: null,
        total: 1,
        selectedIds: const {'response-one'},
        queryHash: 'query',
        resultHash: hash,
        fieldCatalog: const [],
      );
}

class _Targets implements HostOfferEventTargetsGateway {
  _Targets({this.empty = false});
  final bool empty;
  int listCalls = 0;
  int configurationCalls = 0;
  int revision = 1;
  @override
  Future<HostOfferEventTargetPage> list({
    required String organizerId,
    String? cursor,
  }) async {
    listCalls++;
    if (empty) return const HostOfferEventTargetPage([], null);
    return HostOfferEventTargetPage([
      HostOfferEventTarget(
        eventId: 'event-one',
        name: 'Sunday run',
        startTime: _start,
        timezone: 'Asia/Kolkata',
        publicationState: 'private',
        setupRevision: 1,
      ),
    ], null);
  }

  @override
  Future<HostOfferEventConfiguration> configuration({
    required String organizerId,
    required String eventId,
  }) async {
    configurationCalls++;
    return HostOfferEventConfiguration(
      organizerId: organizerId,
      eventId: eventId,
      eventSourceRevision: revision,
      startsAt: _start,
      serverNow: DateTime.fromMillisecondsSinceEpoch(1799990000000),
      paymentTerms: const {
        'preferredCollection': 'manualInstructions',
        'expectedAmountMinor': 50000,
        'currency': 'INR',
      },
      suggestedExpiresAt: DateTime.fromMillisecondsSinceEpoch(1799995000000),
    );
  }
}

final _start = DateTime.fromMillisecondsSinceEpoch(1800000000000);

HostFormResponseDetail _detail(
  String? contactId, {
  String? applicationId,
  String responseId = 'response-one',
  HostFormResponseStatus status = HostFormResponseStatus.submitted,
  HostFormDataOrigin origin = HostFormDataOrigin.respondentGranted,
}) => HostFormResponseDetail(
  applicationId: applicationId,
  response: HostFormResponseSummary(
    responseId: responseId,
    formId: 'form',
    formTitle: 'Form',
    versionId: 'form_v1',
    version: 1,
    status: status,
    identityKind: HostFormResponseIdentityKind.phoneVerified,
    identity: HostFormResponseIdentity(
      displayName: 'Maya',
      email: null,
      phoneE164: null,
      origin: origin,
    ),
    sourceLinkId: null,
    sourceLabel: null,
    submittedAt: DateTime.fromMillisecondsSinceEpoch(1790000000000),
    withdrawnAt: null,
    highlights: const [],
    conversionKinds: const {},
  ),
  contactId: contactId,
  answers: const [],
  consentVersion: 'v1',
  completionMillis: 1790000000000,
);

class _Offers implements HostEventOfferGateway {
  int previewCalls = 0;
  HostOfferBatchDraft? previewed;

  @override
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft) async {
    previewCalls++;
    previewed = draft;
    return const HostOfferPreview(
      planDigest: 'digest',
      rows: [
        HostOfferPreviewRow(
          offerId: 'offer-one',
          revision: 0,
          generation: 0,
          status: 'new',
        ),
      ],
    );
  }

  @override
  Future<HostOfferCommitReceipt> commit({
    required HostOfferBatchDraft draft,
    required HostOfferPreview preview,
    required String requestId,
  }) => throw UnimplementedError();

  @override
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) => throw UnimplementedError();

  @override
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) => throw UnimplementedError();
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
  emptyEvents: 'No events',
  untitledEvent: 'Untitled event',
  loadMoreEvents: 'Load more events',
  needsContact: 'Convert response first',
  convertContact: 'Create CRM contact',
  selectionChanged: 'Selection changed',
  loadFailed: 'Load failed',
  issued: 'Offers recorded',
  refresh: 'Refresh',
  existing: 'Existing offers',
  noOffers: 'No offers',
  configurePayment: 'Configure payment',
  openSettings: 'Open settings',
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
    previewing: 'Checking',
    review: 'Review offer details',
    expires: (date) => 'Expires $date',
    commit: 'Record offers',
    committing: 'Recording',
    committed: 'Recorded',
    failed: 'Failed',
    noReservation: 'No seat or admission',
    paymentReference: 'Payment reference',
    recordReference: 'Record',
    evidenceSubmitted: 'Submitted',
    bankReceiptChecked: 'Checked',
    reviewNote: 'Note',
    attestReceived: 'Attest',
    rejectReference: 'Reject',
    hostAttested: 'Attested',
    rejected: 'Rejected',
  ),
);

HostEventOffer _existingOffer({
  String? applicationId,
  int amount = 50000,
  String mode = 'manualInstructions',
}) => HostEventOffer(
  offerId: 'offer-one',
  organizerId: 'org',
  eventId: 'event-one',
  contactId: 'contact-one',
  sourceId: applicationId ?? 'response-one',
  sourceKind: applicationId == null
      ? HostOfferSourceKind.formResponse
      : HostOfferSourceKind.application,
  status: HostOfferStatus.offered,
  effectiveStatus: HostOfferStatus.offered,
  generation: 1,
  revision: 2,
  expiresAt: DateTime.fromMillisecondsSinceEpoch(1799995000000),
  organizerPaymentLink: null,
  paymentSnapshot: HostOfferPaymentSnapshot(
    eventPaymentRevision: 1,
    eventPaymentHash: 'payment-hash',
    collectionMode: mode,
    expectedAmountMinor: amount,
    currency: 'INR',
    reusablePaymentPageUrl: null,
    paymentInstructions: 'Bank transfer',
    messageTemplate: null,
    personalPaymentLink: null,
    expiresAt: DateTime.fromMillisecondsSinceEpoch(1799995000000),
  ),
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

class _RouteFunctions extends Fake implements FirebaseFunctions {
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _RouteCallable(name);
}

/// The offer settings listeners, answering once [gate] completes.
class _GatedConfigurationReads extends EventOfferConfigurationReads {
  _GatedConfigurationReads() : super(FakeFirebaseFirestore());
  Future<void>? gate;

  @override
  Stream<EventOfferConfiguration> watch({
    required String organizerId,
    required String eventId,
  }) async* {
    await gate;
    final now = DateTime.now().millisecondsSinceEpoch;
    yield EventOfferConfiguration(
      organizerId: organizerId,
      eventId: eventId,
      eventSourceRevision: 1,
      startsAtMillis: 2100000000000,
      nowMillis: now,
      suggestedExpiresAtMillis: now + 3600000,
      preferencesRevision: 1,
      preferences: const PrivateEventPreferencesSnapshot(
        revision: 1,
        intents: PrivateEventPreferenceIntents(),
        resolvedValues: {},
        paymentTerms: {
          'preferredCollection': 'manualInstructions',
          'expectedAmountMinor': 50000,
          'currency': 'INR',
        },
      ),
    );
  }
}

class _RouteCallable extends Fake implements HttpsCallable {
  _RouteCallable(this.name);
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    final Object data = switch (name) {
      'listOfferEventTargets' => {
        'events': [
          {
            'eventId': 'event-one',
            'name': 'Sunday run',
            'startTimeMillis': 2100000000000,
            'timezone': 'Asia/Kolkata',
            'publicationState': 'private',
            'setupRevision': 1,
          },
        ],
        'nextCursor': null,
      },
      'listEventOffers' => {'items': <Object>[], 'nextCursor': null},
      _ => throw StateError('Unexpected callable: $name'),
    };
    return _RouteResult<T>(data as T);
  }
}

class _RouteResult<T> extends Fake implements HttpsCallableResult<T> {
  _RouteResult(this.data);
  @override
  final T data;
}
