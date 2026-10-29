import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_invitation_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

class _FakeCrossPathsRepository extends Fake implements CrossPathsRepository {
  Object? error;
  final calls = <String>[];

  @override
  Future<CrossPathsInvitationReceipt> sendInvitation({
    required String eventId,
    required String recipientUid,
    required String suggestionToken,
  }) async {
    calls.add('send:$eventId:$recipientUid:$suggestionToken');
    final failure = error;
    if (failure != null) throw failure;
    return const CrossPathsInvitationReceipt(
      invitationId: 'invitation-1',
      status: CrossPathsInvitationStatus.pending,
      conversationId: null,
    );
  }

  @override
  Future<CrossPathsInvitationReceipt> respondToInvitation({
    required String invitationId,
    required bool accept,
  }) async {
    calls.add('respond:$invitationId:$accept');
    final failure = error;
    if (failure != null) throw failure;
    return CrossPathsInvitationReceipt(
      invitationId: invitationId,
      status: accept
          ? CrossPathsInvitationStatus.accepted
          : CrossPathsInvitationStatus.declined,
      conversationId: accept ? 'plan-1' : null,
    );
  }

  @override
  Future<CrossPathsInvitationReceipt> cancelInvitationOrPlan(
    String invitationId,
  ) async {
    calls.add('cancel:$invitationId');
    final failure = error;
    if (failure != null) throw failure;
    return CrossPathsInvitationReceipt(
      invitationId: invitationId,
      status: CrossPathsInvitationStatus.cancelled,
      conversationId: null,
    );
  }
}

void main() {
  test('controller exposes typed send, respond, and cancel receipts', () async {
    final repository = _FakeCrossPathsRepository();
    final container = ProviderContainer(
      overrides: [crossPathsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      crossPathsInvitationControllerProvider.notifier,
    );

    final sent = await controller.send(
      eventId: 'event-1',
      recipientUid: 'runner-2',
      suggestionToken: 'token-1',
    );
    final accepted = await controller.respond(
      invitationId: sent.invitationId,
      accept: true,
    );
    final cancelled = await controller.cancel(sent.invitationId);

    expect(accepted.conversationId, 'plan-1');
    expect(cancelled.status, CrossPathsInvitationStatus.cancelled);
    expect(repository.calls, [
      'send:event-1:runner-2:token-1',
      'respond:invitation-1:true',
      'cancel:invitation-1',
    ]);
  });

  test('controller preserves a failed mutation as AsyncError', () async {
    final repository = _FakeCrossPathsRepository()
      ..error = StateError('unavailable');
    final container = ProviderContainer(
      overrides: [crossPathsRepositoryProvider.overrideWithValue(repository)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      crossPathsInvitationControllerProvider.notifier,
    );

    await expectLater(controller.cancel('invitation-1'), throwsA(anything));
    final state = container.read(crossPathsInvitationControllerProvider);
    expect(state, isA<AsyncError<CrossPathsInvitationReceipt?>>());
    expect(state.error, isA<StateError>());
  });

  test('pair booking converts a free hold through booking authority', () async {
    final payments = FakePaymentRepository();
    final container = ProviderContainer(
      overrides: [paymentRepositoryProvider.overrideWithValue(payments)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      crossPathsInvitationControllerProvider.notifier,
    );

    await controller.completePairBooking(
      hold: _pairHold(priceInPaise: 0),
      event: buildEvent(),
      user: buildUser(),
    );

    expect(payments.bookFreeEventCalled, isTrue);
    expect(payments.bookedFreeEventCrossPathsPairHoldId, 'hold-1');
    expect(payments.processPaymentCalled, isFalse);
  });

  test('pair booking carries a paid hold into checkout authority', () async {
    final payments = FakePaymentRepository();
    final container = ProviderContainer(
      overrides: [paymentRepositoryProvider.overrideWithValue(payments)],
    );
    addTearDown(container.dispose);
    final controller = container.read(
      crossPathsInvitationControllerProvider.notifier,
    );

    await controller.completePairBooking(
      hold: _pairHold(priceInPaise: 2500),
      event: buildEvent(priceInPaise: 2500),
      user: buildUser(),
    );

    expect(payments.processPaymentCalled, isTrue);
    expect(payments.lastProcessPaymentCall?.crossPathsPairHoldId, 'hold-1');
    expect(payments.lastProcessPaymentCall?.currencyCode, 'INR');
    expect(payments.bookFreeEventCalled, isFalse);
  });
}

CrossPathsPairHold _pairHold({required int priceInPaise}) => CrossPathsPairHold(
  id: 'hold-1',
  eventId: 'event-1',
  invitationId: 'invitation-1',
  requesterUid: 'runner-1',
  attendeeUid: 'runner-2',
  participantIds: const ['runner-1', 'runner-2'],
  status: CrossPathsPairHoldStatus.active,
  requesterBookingStatus: 'held',
  attendeeBookingStatus: 'signedUp',
  requesterPriceInPaise: priceInPaise,
  currency: 'INR',
  expiresAt: DateTime.utc(2026, 8, 6, 12, 15),
  conversationId: null,
);
