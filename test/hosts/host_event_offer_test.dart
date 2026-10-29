import 'dart:convert';

import 'package:catch_dating_app/contexts/forms/data/forms/host_event_offer_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms/event_offer_controller_test_support.dart';

void main() {
  final now = DateTime.utc(2026, 9, 24);
  final eventStart = DateTime.utc(2026, 10, 2);

  test(
    'one response may feed event-specific offers, never a duplicate contact',
    () {
      final first = _row(eventId: 'event-one');
      final second = _row(eventId: 'event-two');
      HostOfferBatchDraft(
        organizerId: 'org',
        eventId: 'event-one',
        rows: [first],
      ).validate(now: now, eventStartsAt: eventStart);
      HostOfferBatchDraft(
        organizerId: 'org',
        eventId: 'event-two',
        rows: [second],
      ).validate(now: now, eventStartsAt: eventStart);
      expect(
        () => HostOfferBatchDraft(
          organizerId: 'org',
          eventId: 'event-one',
          rows: [first, first],
        ).validate(now: now, eventStartsAt: eventStart),
        throwsArgumentError,
      );
      expect(first.toJson()['applicationId'], 'response-kabir');
      expect(first.toJson()['sourceKind'], 'formResponse');
    },
  );

  test('expiry and public HTTPS link are validated before review', () {
    expect(
      () => _row(
        eventId: 'event-one',
        expiry: eventStart.add(const Duration(minutes: 1)),
      ).validate(now: now, eventStartsAt: eventStart),
      throwsArgumentError,
    );
    expect(
      () => _row(
        eventId: 'event-one',
        link: Uri.parse('http://example.com/pay'),
      ).validate(now: now, eventStartsAt: eventStart),
      throwsArgumentError,
    );
  });

  test('detail preserves historical terms and manual attestation fields', () {
    final offer = HostEventOffer.fromCallableData({
      'effectiveStatus': 'offered',
      'offer': {
        'offerId': 'offer-1',
        'organizerId': 'org',
        'eventId': 'event-one',
        'contactId': 'contact-kabir',
        'applicationId': 'response-kabir',
        'sourceKind': 'formResponse',
        'status': 'offered',
        'generation': 1,
        'revision': 4,
        'expiresAtMillis': now
            .add(const Duration(days: 1))
            .millisecondsSinceEpoch,
        'organizerPaymentLink': 'https://pay.example.test/kabir',
        'paymentSnapshot': {
          'eventPaymentRevision': 3,
          'eventPaymentHash': List.filled(64, 'a').join(),
          'collectionMode': 'personalRequest',
          'expectedAmountMinor': 180000,
          'currency': 'INR',
          'reusablePaymentPageUrl': null,
          'paymentInstructions': null,
          'messageTemplate': 'Hi {name}',
          'personalPaymentLink': 'https://pay.example.test/kabir',
          'expiresAtMillis': now
              .add(const Duration(days: 1))
              .millisecondsSinceEpoch,
        },
        'manualPayment': {
          'status': 'hostAttestedReceived',
          'evidenceReference': 'BANK-123',
          'evidenceRecordedAtMillis': now.millisecondsSinceEpoch,
          'reviewedByUid': 'manager-one',
          'reviewedAtMillis': now.millisecondsSinceEpoch,
          'reviewNote': 'Checked bank',
          'bankReceiptChecked': true,
          'attestedAmountMinor': 180000,
          'attestedCurrency': 'INR',
          'attestedEventPaymentRevision': 3,
          'attestedEventPaymentHash': List.filled(64, 'a').join(),
        },
      },
    });
    expect(offer.paymentSnapshot?.eventPaymentRevision, 3);
    expect(
      offer.paymentSnapshot?.personalPaymentLink?.host,
      'pay.example.test',
    );
    expect(offer.manualPayment.attestedAmountMinor, 180000);
    expect(offer.isHostAttested, isTrue);
  });

  test(
    'preview gates commit; uncertain retry keeps the same request ID',
    () async {
      final gateway = _Gateway()..failFirstCommit = true;
      final storage = MemoryCommandJournalStorage();
      final outbox = JournalHostOfferCommitOutbox(
        storage: () async => storage,
        currentAccountId: () => 'manager-one',
        gateway: gateway,
      );
      final controller = TestHostEventOfferController(
        gateway,
        outbox: outbox,
        accountId: 'manager-one',
      );
      addTearDown(controller.dispose);
      final draft = HostOfferBatchDraft(
        organizerId: 'org',
        eventId: 'event-one',
        rows: [_row(eventId: 'event-one')],
      );
      await expectLater(controller.commit('request_001'), throwsStateError);
      await controller.preview(
        draft: draft,
        now: now,
        eventStartsAt: eventStart,
      );
      expect(controller.view.canCommit, isTrue);
      expect(gateway.previewCalls, 1);
      expect(gateway.commitCalls, isEmpty);

      await controller.commit('request_001');
      expect(controller.view.status, HostOfferFlowStatus.failure);
      expect(controller.view.pendingRequestId, 'request_001');
      await expectLater(controller.commit('request_002'), throwsStateError);
      final restarted = TestHostEventOfferController(
        gateway,
        outbox: JournalHostOfferCommitOutbox(
          storage: () async => storage,
          currentAccountId: () => 'manager-one',
          gateway: gateway,
        ),
        accountId: 'manager-one',
      );
      addTearDown(restarted.dispose);
      await restarted.recoverPending(organizerId: 'org', eventId: 'event-one');
      expect(restarted.view.pendingRequestId, 'request_001');
      await restarted.commit('request_001');
      expect(restarted.view.status, HostOfferFlowStatus.committed);
      expect(gateway.commitCalls, ['request_001', 'request_001']);
      expect(restarted.view.receipt?.results.single.offerId, 'offer-kabir');
    },
  );

  test(
    'reference and Host bank attestation cannot imply provider capture',
    () async {
      final gateway = _Gateway();
      final controller = TestHostEventOfferController(
        gateway,
        mutationOutbox: _FakeMutationOutbox(gateway),
        accountId: 'manager-one',
      );
      addTearDown(controller.dispose);
      final offered = _offer(HostManualPaymentStatus.none);
      expect(
        () => controller.recordReference(
          offer: offered,
          reference: 'https://example.com/receipt',
          requestId: 'reference_001',
        ),
        throwsArgumentError,
      );
      await controller.recordReference(
        offer: offered,
        reference: 'BANK-12345',
        requestId: 'reference_001',
      );
      expect(gateway.recordedReferences, ['BANK-12345']);

      final evidence = _offer(HostManualPaymentStatus.evidenceSubmitted);
      expect(
        () => controller.reviewReference(
          offer: evidence,
          decision: HostManualPaymentStatus.hostAttestedReceived,
          note: 'Checked in bank',
          bankReceiptChecked: false,
          requestId: 'review_001',
        ),
        throwsArgumentError,
      );
      expect(gateway.reviewCalls, isEmpty);
      await controller.reviewReference(
        offer: evidence,
        decision: HostManualPaymentStatus.hostAttestedReceived,
        note: 'Checked in bank',
        bankReceiptChecked: true,
        requestId: 'review_001',
      );
      expect(
        gateway.reviewCalls.single,
        HostManualPaymentStatus.hostAttestedReceived,
      );
      expect(gateway.admissionCalls, 0);
    },
  );

  test('manual mutation journal replays exact request after restart', () async {
    final storage = MemoryCommandJournalStorage();
    final offer = _offer(HostManualPaymentStatus.none);
    final action = <String, Object?>{
      'kind': 'recordEvidence',
      'requestId': 'reference_001',
      'expectedRevision': 2,
      'expectedGeneration': 1,
      'evidenceReference': 'BANK-12345',
    };
    final sent = <Map<String, Object?>>[];
    var fail = true;
    Future<void> write(Map<String, Object?> payload) async {
      sent.add(payload);
      if (fail) throw StateError('uncertain transport result');
    }

    JournalHostOfferMutationOutbox makeOutbox() =>
        JournalHostOfferMutationOutbox(
          storage: () async => storage,
          currentAccountId: () => 'manager-one',
          write: write,
          refresh:
              ({
                required organizerId,
                required eventId,
                required contactId,
              }) async => offer,
        );
    await expectLater(
      makeOutbox().mutate(
        accountId: 'manager-one',
        offer: offer,
        action: action,
      ),
      throwsStateError,
    );
    fail = false;
    final recovered = await makeOutbox().mutate(
      accountId: 'manager-one',
      offer: offer,
      action: action,
    );
    expect(recovered.offerId, offer.offerId);
    expect(sent, hasLength(2));
    expect(sent[1], sent[0]);
    expect((sent[1]['action']! as Map)['requestId'], 'reference_001');
  });

  test(
    'manual mutation recovery discovers original command after restart',
    () async {
      final storage = MemoryCommandJournalStorage();
      final offer = _offer(HostManualPaymentStatus.none);
      final sent = <Map<String, Object?>>[];
      var fail = true;
      JournalHostOfferMutationOutbox makeOutbox() =>
          JournalHostOfferMutationOutbox(
            storage: () async => storage,
            currentAccountId: () => 'manager-one',
            write: (payload) async {
              sent.add(payload);
              if (fail) throw StateError('lost acknowledgement');
            },
            refresh:
                ({
                  required organizerId,
                  required eventId,
                  required contactId,
                }) async => offer,
          );
      await expectLater(
        makeOutbox().mutate(
          accountId: 'manager-one',
          offer: offer,
          action: {
            'kind': 'recordEvidence',
            'requestId': 'reference_003',
            'expectedRevision': 2,
            'expectedGeneration': 1,
            'evidenceReference': 'BANK-12345',
          },
        ),
        throwsStateError,
      );
      final restarted = makeOutbox();
      final pending = await restarted.pendingMutation(
        accountId: 'manager-one',
        organizerId: 'org',
        eventId: 'event-one',
      );
      expect(pending?.requestId, 'reference_003');
      expect(pending?.contactId, offer.contactId);
      fail = false;
      final replayed = await restarted.replayMutation(
        accountId: 'manager-one',
        organizerId: 'org',
        eventId: 'event-one',
      );
      expect(replayed.offerId, offer.offerId);
      expect(sent, hasLength(2));
      expect(sent.last, sent.first);
      expect(
        await restarted.pendingMutation(
          accountId: 'manager-one',
          organizerId: 'org',
          eventId: 'event-one',
        ),
        isNull,
      );
    },
  );

  test(
    'malformed batch receipt leaves saved operation for exact replay',
    () async {
      final storage = MemoryCommandJournalStorage();
      final gateway = _Gateway()..malformedCommit = true;
      final outbox = JournalHostOfferCommitOutbox(
        storage: () async => storage,
        currentAccountId: () => 'manager-one',
        gateway: gateway,
      );
      final draft = HostOfferBatchDraft(
        organizerId: 'org',
        eventId: 'event-one',
        rows: [_row(eventId: 'event-one')],
      );
      final preview = await gateway.preview(draft);
      await expectLater(
        outbox.submit(
          accountId: 'manager-one',
          draft: draft,
          preview: preview,
          requestId: 'request_003',
        ),
        throwsFormatException,
      );
      expect(
        (await outbox.pending(
          accountId: 'manager-one',
          organizerId: 'org',
          eventId: 'event-one',
        ))?.requestId,
        'request_003',
      );
      gateway.malformedCommit = false;
      gateway.wrongHash = true;
      await expectLater(
        outbox.submit(
          accountId: 'manager-one',
          draft: draft,
          preview: preview,
          requestId: 'request_003',
        ),
        throwsFormatException,
      );
      expect(
        (await outbox.pending(
          accountId: 'manager-one',
          organizerId: 'org',
          eventId: 'event-one',
        ))?.requestId,
        'request_003',
      );
      gateway.wrongHash = false;
      final receipt = await outbox.submit(
        accountId: 'manager-one',
        draft: draft,
        preview: preview,
        requestId: 'request_003',
      );
      expect(receipt?.requestId, 'request_003');
      expect(gateway.commitCalls, [
        'request_003',
        'request_003',
        'request_003',
      ]);
    },
  );

  test('manual write acknowledgement binds scope, action and result', () {
    final id =
        'applicationoffer_${sha256.convert(utf8.encode(['org', 'event-one', 'contact-kabir'].join('\u001f'))).toString().substring(0, 40)}';
    final payload = <String, Object?>{
      'row': {
        'organizerId': 'org',
        'eventId': 'event-one',
        'contactId': 'contact-kabir',
        'applicationId': 'response-kabir',
        'sourceKind': 'formResponse',
      },
      'action': {
        'kind': 'recordEvidence',
        'requestId': 'reference_004',
        'expectedRevision': 2,
        'expectedGeneration': 1,
        'evidenceReference': 'BANK-12345',
      },
    };
    final hash = sha256
        .convert(
          utf8.encode(
            jsonEncode([
              id,
              'recordEvidence',
              'reference_004',
              2,
              1,
              'BANK-12345',
            ]),
          ),
        )
        .toString();
    final result = <String, Object?>{
      'offer': {
        'offerId': id,
        'organizerId': 'org',
        'eventId': 'event-one',
        'contactId': 'contact-kabir',
        'applicationId': 'response-kabir',
        'sourceKind': 'formResponse',
        'generation': 1,
        'revision': 3,
      },
      'receipt': {
        'offerId': id,
        'requestId': 'reference_004',
        'requestHash': hash,
        'resultingGeneration': 1,
        'resultingRevision': 3,
      },
      'replayed': false,
    };
    expect(
      () => validateOfferMutationAcknowledgement(payload, result),
      returnsNormally,
    );
    expect(
      () => validateOfferMutationAcknowledgement(payload, {
        ...result,
        'offer': {...(result['offer']! as Map), 'contactId': 'foreign'},
      }),
      throwsFormatException,
    );
    expect(
      () => validateOfferMutationAcknowledgement(payload, {
        ...result,
        'receipt': {
          ...(result['receipt']! as Map),
          'requestHash': List.filled(64, '0').join(),
        },
      }),
      throwsFormatException,
    );
    expect(
      () => validateOfferMutationAcknowledgement(payload, {
        ...result,
        'receipt': {...(result['receipt']! as Map), 'resultingGeneration': 2},
      }),
      throwsFormatException,
    );
    expect(
      () => validateOfferMutationAcknowledgement(payload, {
        ...result,
        'replayed': true,
        'offer': {
          ...(result['offer']! as Map),
          'applicationId': 'later-response',
          'sourceKind': 'application',
          'generation': 2,
          'revision': 5,
        },
      }),
      returnsNormally,
    );
    expect(
      () => validateOfferMutationAcknowledgement(payload, {
        ...result,
        'offer': {
          ...(result['offer']! as Map),
          'applicationId': 'later-response',
        },
      }),
      throwsFormatException,
    );
  });

  test('failed detail refresh never reissues acknowledged mutation', () async {
    final storage = MemoryCommandJournalStorage();
    final offer = _offer(HostManualPaymentStatus.none);
    var writes = 0;
    JournalHostOfferMutationOutbox makeOutbox() =>
        JournalHostOfferMutationOutbox(
          storage: () async => storage,
          currentAccountId: () => 'manager-one',
          write: (_) async {
            writes++;
          },
          refresh:
              ({
                required organizerId,
                required eventId,
                required contactId,
              }) async => throw StateError('detail unavailable'),
        );
    final action = <String, Object?>{
      'kind': 'recordEvidence',
      'requestId': 'reference_002',
      'expectedRevision': 2,
      'expectedGeneration': 1,
      'evidenceReference': 'BANK-98765',
    };
    await expectLater(
      makeOutbox().mutate(
        accountId: 'manager-one',
        offer: offer,
        action: action,
      ),
      throwsStateError,
    );
    expect(writes, 1);
    await expectLater(
      makeOutbox().mutate(
        accountId: 'manager-one',
        offer: offer,
        action: action,
      ),
      throwsA(isA<Exception>()),
    );
    expect(writes, 1);
  });
}

HostOfferRow _row({required String eventId, DateTime? expiry, Uri? link}) =>
    HostOfferRow(
      organizerId: 'org',
      eventId: eventId,
      contactId: 'contact-kabir',
      sourceKind: HostOfferSourceKind.formResponse,
      sourceId: 'response-kabir',
      expiresAt: expiry ?? DateTime.utc(2026, 9, 30),
      organizerPaymentLink: link,
    );

HostEventOffer _offer(HostManualPaymentStatus paymentStatus) => HostEventOffer(
  offerId: 'offer-kabir',
  organizerId: 'org',
  eventId: 'event-one',
  contactId: 'contact-kabir',
  sourceId: 'response-kabir',
  sourceKind: HostOfferSourceKind.formResponse,
  status: HostOfferStatus.offered,
  effectiveStatus: HostOfferStatus.offered,
  generation: 1,
  revision: 2,
  expiresAt: DateTime.utc(2026, 9, 30),
  organizerPaymentLink: Uri.parse('https://example.com/pay'),
  manualPayment: HostManualPaymentReview(
    status: paymentStatus,
    evidenceReference: paymentStatus == HostManualPaymentStatus.none
        ? null
        : 'BANK-12345',
    evidenceRecordedAt: null,
    reviewedByUid: null,
    reviewedAt: null,
    reviewNote: null,
    bankReceiptChecked: false,
  ),
);

class _Gateway implements HostEventOfferGateway {
  int previewCalls = 0;
  final List<String> commitCalls = [];
  final List<String> recordedReferences = [];
  final List<HostManualPaymentStatus> reviewCalls = [];
  int admissionCalls = 0;
  bool failFirstCommit = false;
  bool malformedCommit = false;
  bool wrongHash = false;

  @override
  Future<HostOfferPreview> preview(HostOfferBatchDraft draft) async {
    previewCalls++;
    return const HostOfferPreview(
      planDigest: 'digest-one',
      rows: [
        HostOfferPreviewRow(
          offerId: 'offer-kabir',
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
  }) async {
    commitCalls.add(requestId);
    if (failFirstCommit && commitCalls.length == 1) {
      throw StateError('uncertain network result');
    }
    return HostOfferCommitReceipt(
      organizerId: malformedCommit ? 'foreign' : draft.organizerId,
      eventId: draft.eventId,
      requestId: requestId,
      requestHash: wrongHash
          ? List.filled(64, 'a').join()
          : sha256
                .convert(
                  utf8.encode(
                    jsonEncode([
                      [
                        draft.organizerId,
                        draft.eventId,
                        draft.mode,
                        [
                          for (final row in draft.rows)
                            [
                              row.sourceKind.name,
                              row.sourceId,
                              row.contactId,
                              row.expiresAt.millisecondsSinceEpoch,
                              row.organizerPaymentLink?.toString(),
                            ],
                        ],
                      ],
                      preview.planDigest,
                    ]),
                  ),
                )
                .toString(),
      results: const [
        HostOfferPreviewRow(
          offerId: 'offer-kabir',
          revision: 2,
          generation: 1,
          status: 'committed',
        ),
      ],
    );
  }

  @override
  Future<HostEventOffer> recordReference({
    required HostEventOffer offer,
    required String reference,
    required String requestId,
  }) async {
    recordedReferences.add(reference);
    return offer;
  }

  @override
  Future<HostEventOffer> reviewReference({
    required HostEventOffer offer,
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
    required String requestId,
  }) async {
    reviewCalls.add(decision);
    return offer;
  }
}

class _FakeMutationOutbox implements HostOfferMutationOutbox {
  const _FakeMutationOutbox(this.gateway);
  final _Gateway gateway;

  @override
  Future<HostOfferPendingMutation?> pendingMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) async => null;

  @override
  Future<HostEventOffer> replayMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) => throw UnimplementedError();

  @override
  Future<HostEventOffer> mutate({
    required String accountId,
    required HostEventOffer offer,
    required Map<String, Object?> action,
  }) {
    if (action['kind'] == 'recordEvidence') {
      return gateway.recordReference(
        offer: offer,
        reference: action['evidenceReference']! as String,
        requestId: action['requestId']! as String,
      );
    }
    return gateway.reviewReference(
      offer: offer,
      decision: HostManualPaymentStatus.values.byName(
        action['decision']! as String,
      ),
      note: action['reviewNote']! as String,
      bankReceiptChecked: action['bankReceiptChecked']! as bool,
      requestId: action['requestId']! as String,
    );
  }
}
