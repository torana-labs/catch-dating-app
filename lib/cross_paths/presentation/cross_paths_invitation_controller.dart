import 'dart:async';

import 'package:catch_dating_app/contexts/connections/data/cross_paths_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'cross_paths_invitation_controller.g.dart';

@riverpod
class CrossPathsInvitationController extends _$CrossPathsInvitationController {
  @override
  FutureOr<CrossPathsInvitationReceipt?> build() => null;

  Future<CrossPathsInvitationReceipt> send({
    required String eventId,
    required String recipientUid,
    required String suggestionToken,
  }) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(
      () => ref
          .read(crossPathsRepositoryProvider)
          .sendInvitation(
            eventId: eventId,
            recipientUid: recipientUid,
            suggestionToken: suggestionToken,
          ),
    );
    state = result;
    return result.requireValue;
  }

  Future<CrossPathsInvitationReceipt> respond({
    required String invitationId,
    required bool accept,
  }) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(
      () => ref
          .read(crossPathsRepositoryProvider)
          .respondToInvitation(invitationId: invitationId, accept: accept),
    );
    state = result;
    return result.requireValue;
  }

  Future<CrossPathsInvitationReceipt> cancel(String invitationId) async {
    state = const AsyncLoading();
    final result = await AsyncValue.guard(
      () => ref
          .read(crossPathsRepositoryProvider)
          .cancelInvitationOrPlan(invitationId),
    );
    state = result;
    return result.requireValue;
  }

  Future<void> completePairBooking({
    required CrossPathsPairHold hold,
    required Event event,
    required UserProfile user,
  }) async {
    final payments = ref.read(paymentRepositoryProvider);
    if (hold.requesterPriceInPaise == 0) {
      await payments.bookFreeEvent(
        eventId: event.id,
        crossPathsPairHoldId: hold.id,
      );
      return;
    }
    await payments.processPayment(
      eventId: event.id,
      currencyCode: hold.currency,
      description: event.title,
      userName: user.name,
      userEmail: user.email,
      userContact: user.phoneNumber,
      crossPathsPairHoldId: hold.id,
    );
  }
}
