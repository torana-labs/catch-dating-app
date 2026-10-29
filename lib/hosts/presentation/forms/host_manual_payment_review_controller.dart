import 'dart:async';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_event_offer.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_controller.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_manual_payment_review_controller.g.dart';

typedef HostManualPaymentReviewScope = ({
  HostEventOfferScope offers,
  HostEventOffer offer,
  String referenceRequestId,
  String reviewRequestId,
});

@immutable
class HostManualPaymentReviewState {
  const HostManualPaymentReviewState({
    this.busy = false,
    this.checkingPending = false,
    this.actorAvailable = true,
    this.error,
    this.pendingDecision,
    this.pendingMutation,
    this.updatedOffer,
  });
  final bool busy;
  final bool checkingPending;
  final bool actorAvailable;
  final Object? error;
  final HostManualPaymentStatus? pendingDecision;
  final HostOfferPendingMutation? pendingMutation;
  final HostEventOffer? updatedOffer;
}

/// Owns recovery and command completion for one account and selected offer.
/// The offer controller retains durable command identity and server authority.
@riverpod
class HostManualPaymentReviewController
    extends _$HostManualPaymentReviewController {
  int _generation = 0;

  @override
  HostManualPaymentReviewState build(HostManualPaymentReviewScope scope) {
    ref.listen(hostEventOfferControllerProvider(scope.offers), (_, next) {
      if (!next.actorAvailable) {
        _generation++;
        state = const HostManualPaymentReviewState(actorAvailable: false);
      }
    });
    ref.onDispose(() => _generation++);
    final available = ref
        .read(hostEventOfferControllerProvider(scope.offers))
        .actorAvailable;
    scheduleMicrotask(() {
      if (ref.mounted) unawaited(recover());
    });
    return HostManualPaymentReviewState(
      checkingPending: available,
      actorAvailable: available,
    );
  }

  bool get _active =>
      ref.mounted &&
      state.actorAvailable &&
      ref.read(hostEventOfferControllerProvider(scope.offers)).actorAvailable;
  bool _current(int generation) => _active && generation == _generation;
  HostEventOfferController get _offers =>
      ref.read(hostEventOfferControllerProvider(scope.offers).notifier);

  Future<void> recover() async {
    if (!_active || state.busy) return;
    final generation = ++_generation;
    final decision = state.pendingDecision;
    state = HostManualPaymentReviewState(
      checkingPending: true,
      pendingDecision: decision,
    );
    try {
      final pending = await _offers.recoverPendingMutation(
        organizerId: scope.offer.organizerId,
        eventId: scope.offer.eventId,
      );
      if (_current(generation)) {
        state = HostManualPaymentReviewState(
          pendingMutation: pending,
          pendingDecision: decision,
        );
      }
    } on Object catch (error) {
      if (_current(generation)) {
        state = HostManualPaymentReviewState(
          error: error,
          pendingDecision: decision,
        );
      }
    }
  }

  Future<void> retry() async {
    if (!_active ||
        state.busy ||
        state.checkingPending ||
        state.pendingMutation?.contactId != scope.offer.contactId) {
      return;
    }
    await _run(
      () => _offers.retryPendingMutation(
        organizerId: scope.offer.organizerId,
        eventId: scope.offer.eventId,
      ),
    );
  }

  Future<void> recordReference(String reference) async {
    if (!_canStart) return;
    await _run(
      () => _offers.recordReference(
        offer: scope.offer,
        reference: reference,
        requestId: scope.referenceRequestId,
      ),
    );
  }

  Future<void> review({
    required HostManualPaymentStatus decision,
    required String note,
    required bool bankReceiptChecked,
  }) async {
    if (!_canStart ||
        state.pendingDecision != null && state.pendingDecision != decision) {
      return;
    }
    await _run(
      () => _offers.reviewReference(
        offer: scope.offer,
        decision: decision,
        note: note,
        bankReceiptChecked:
            decision == HostManualPaymentStatus.hostAttestedReceived &&
            bankReceiptChecked,
        requestId: scope.reviewRequestId,
      ),
      decision: decision,
    );
  }

  bool get _canStart =>
      _active &&
      !state.busy &&
      !state.checkingPending &&
      state.pendingMutation == null;

  Future<void> _run(
    Future<HostEventOffer> Function() command, {
    HostManualPaymentStatus? decision,
  }) async {
    final generation = ++_generation;
    final pendingDecision = decision ?? state.pendingDecision;
    state = HostManualPaymentReviewState(
      busy: true,
      pendingDecision: pendingDecision,
      pendingMutation: state.pendingMutation,
    );
    try {
      final updated = await command();
      if (_current(generation)) {
        state = HostManualPaymentReviewState(updatedOffer: updated);
      }
    } on Object catch (error) {
      if (!_current(generation)) return;
      // An ambiguous failure must recover the journal before another command.
      HostOfferPendingMutation? pending;
      try {
        pending = await _offers.recoverPendingMutation(
          organizerId: scope.offer.organizerId,
          eventId: scope.offer.eventId,
        );
      } on Object catch (_) {
        if (!_current(generation)) return;
        // Keep the original command failure and decision until explicit retry.
        pending = state.pendingMutation;
      }
      if (_current(generation)) {
        state = HostManualPaymentReviewState(
          error: error,
          pendingMutation: pending,
          pendingDecision: pendingDecision,
        );
      }
    }
  }
}
