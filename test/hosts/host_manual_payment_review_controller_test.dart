import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_manual_payment_review_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'forms/event_offer_controller_test_support.dart';

void main() {
  test(
    'recovers the saved command and blocks a new reference until replay',
    () async {
      final outbox = _Outbox()..pending = _pending;
      final host = TestHostEventOfferController(
        _Gateway(),
        mutationOutbox: outbox,
      );
      addTearDown(host.dispose);
      final provider = hostManualPaymentReviewControllerProvider(_scope(host));
      final ready = Completer<void>();
      host.container.listen(provider, (_, next) {
        if (!next.checkingPending && !ready.isCompleted) ready.complete();
      });
      await ready.future;
      final controller = host.container.read(provider.notifier);
      expect(host.container.read(provider).pendingMutation, _pending);
      await controller.recordReference('another reference');
      expect(outbox.writes, 0);
      await controller.retry();
      expect(outbox.replays, 1);
      expect(host.container.read(provider).updatedOffer, _offer);
      expect(host.container.read(provider).pendingMutation, isNull);
    },
  );

  test(
    'deduplicates an in-flight command and suppresses account-stale completion',
    () async {
      final outbox = _Outbox()..completion = Completer<HostEventOffer>();
      final host = TestHostEventOfferController(
        _Gateway(),
        mutationOutbox: outbox,
      );
      addTearDown(host.dispose);
      final provider = hostManualPaymentReviewControllerProvider(_scope(host));
      final ready = Completer<void>();
      host.container.listen(provider, (_, next) {
        if (!next.checkingPending && !ready.isCompleted) ready.complete();
      });
      await ready.future;
      final controller = host.container.read(provider.notifier);
      final first = controller.recordReference('bank reference');
      await controller.recordReference('duplicate reference');
      expect(outbox.writes, 1);
      expect(host.container.read(provider).busy, isTrue);
      host.container
          .read(hostEventOfferControllerProvider(host.scope).notifier)
          .invalidateActor();
      outbox.completion!.complete(_offer);
      await first;
      expect(host.container.read(provider).actorAvailable, isFalse);
      expect(host.container.read(provider).updatedOffer, isNull);
    },
  );

  test(
    'ambiguous mutation failure reloads the durable command for retry',
    () async {
      final outbox = _Outbox()..completion = Completer<HostEventOffer>();
      final host = TestHostEventOfferController(
        _Gateway(),
        mutationOutbox: outbox,
      );
      addTearDown(host.dispose);
      final provider = hostManualPaymentReviewControllerProvider(_scope(host));
      final ready = Completer<void>();
      host.container.listen(provider, (_, next) {
        if (!next.checkingPending && !ready.isCompleted) ready.complete();
      });
      await ready.future;
      final controller = host.container.read(provider.notifier);
      final operation = controller.recordReference('bank reference');
      outbox.pending = _pending;
      outbox.completion!.completeError(StateError('Response lost'));
      await operation;
      expect(host.container.read(provider).error, isA<StateError>());
      expect(host.container.read(provider).pendingMutation, _pending);
      expect(host.container.read(provider).busy, isFalse);
      await controller.recordReference('replacement');
      expect(outbox.writes, 1);
    },
  );
  test('disposed review ignores a late recovery failure', () async {
    final outbox = _Outbox()
      ..completion = Completer<HostEventOffer>()
      ..recovery = Completer<HostOfferPendingMutation?>();
    final host = TestHostEventOfferController(
      _Gateway(),
      mutationOutbox: outbox,
    );
    addTearDown(host.dispose);
    final provider = hostManualPaymentReviewControllerProvider(_scope(host));
    final ready = Completer<void>();
    final subscription = host.container.listen(provider, (_, next) {
      if (!next.checkingPending && !ready.isCompleted) ready.complete();
    });
    await ready.future;
    final command = host.container
        .read(provider.notifier)
        .recordReference('bank reference');
    outbox.completion!.completeError(StateError('Response lost'));
    await outbox.recoveryStarted.future;
    subscription.close();
    await host.container.pump();
    outbox.recovery!.completeError(StateError('Storage unavailable'));
    await command;
  });
  test('an already invalidated account cannot enter recovery', () {
    final host = TestHostEventOfferController(
      _Gateway(),
      mutationOutbox: _Outbox(),
    );
    addTearDown(host.dispose);
    host.notifier.invalidateActor();
    final state = host.container.read(
      hostManualPaymentReviewControllerProvider(_scope(host)),
    );
    expect(state.actorAvailable, isFalse);
    expect(state.checkingPending, isFalse);
  });
}

HostManualPaymentReviewScope _scope(TestHostEventOfferController host) => (
  offers: host.scope,
  offer: _offer,
  referenceRequestId: 'reference-one',
  reviewRequestId: 'review-one',
);
const _pending = HostOfferPendingMutation(
  requestId: 'saved-one',
  contactId: 'contact-one',
  kind: 'recordEvidence',
  decision: null,
);

class _Gateway extends Fake implements HostEventOfferGateway {}

class _Outbox implements HostOfferMutationOutbox {
  HostOfferPendingMutation? pending;
  Completer<HostEventOffer>? completion;
  Completer<HostOfferPendingMutation?>? recovery;
  final recoveryStarted = Completer<void>();
  int writes = 0;
  int replays = 0;
  @override
  Future<HostOfferPendingMutation?> pendingMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) async {
    if (writes > 0 && recovery != null) {
      if (!recoveryStarted.isCompleted) recoveryStarted.complete();
      return recovery!.future;
    }
    return pending;
  }

  @override
  Future<HostEventOffer> mutate({
    required String accountId,
    required HostEventOffer offer,
    required Map<String, Object?> action,
  }) {
    writes++;
    return completion?.future ?? Future.value(offer);
  }

  @override
  Future<HostEventOffer> replayMutation({
    required String accountId,
    required String organizerId,
    required String eventId,
  }) async {
    replays++;
    pending = null;
    return _offer;
  }
}

final _offer = HostEventOffer(
  offerId: 'offer-one',
  organizerId: 'org',
  eventId: 'event-one',
  contactId: 'contact-one',
  sourceId: 'response-one',
  sourceKind: HostOfferSourceKind.formResponse,
  status: HostOfferStatus.offered,
  effectiveStatus: HostOfferStatus.offered,
  generation: 1,
  revision: 2,
  expiresAt: DateTime.fromMillisecondsSinceEpoch(1799995000000),
  organizerPaymentLink: null,
  paymentSnapshot: HostOfferPaymentSnapshot(
    eventPaymentRevision: 1,
    eventPaymentHash: 'payment-hash',
    collectionMode: 'manualInstructions',
    expectedAmountMinor: 50000,
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
