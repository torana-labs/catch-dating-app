import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_booking_controller.g.dart';

@riverpod
bool eventPaidBookingSupport(Ref ref, String currency) => ref
    .watch(paymentRepositoryProvider)
    .supportsPaidBookingsForCurrency(currency);

/// **Pattern A: Action controller + static Mutations**
///
/// This is the most common mutation pattern in the app (6 controllers use it):
/// - [build()] returns `void` — the controller holds no Riverpod state.
/// - [Mutation]s (`bookMutation`, `cancelMutation`, etc.) are `static final`
///   fields that track the lifecycle of single-shot operations.
/// - The UI watches mutations directly (e.g. `ref.watch(controller.mutation)`)
///   and checks `.isPending`, `.hasError`, `.isSuccess`.
/// - Controller methods delegate to repositories and let errors propagate
///   into the Mutation error state automatically.
///
/// **When to use this pattern:** Single-shot user actions (book, cancel, join,
/// leave, submit, delete) where the UI needs to show loading/error/success
/// state for a specific action.
@riverpod
class EventBookingController extends _$EventBookingController {
  static final bookMutation = Mutation<void>();
  static final cancelMutation = Mutation<void>();
  static final joinWaitlistMutation = Mutation<void>();
  static final leaveWaitlistMutation = Mutation<void>();
  static final acceptWaitlistOfferMutation = Mutation<void>();
  static final declineWaitlistOfferMutation = Mutation<void>();
  static final selfCheckInMutation = Mutation<void>();

  @override
  void build() {}

  /// Books the user into [event].
  ///
  /// For free events, calls the [signUpForFreeEvent] Cloud Function directly.
  /// For paid events, starts the currency-appropriate payment flow; successful
  /// provider confirmation atomically signs the user up.
  ///
  /// Returns [PaymentConfirmationData] for paid events so the caller can
  /// navigate to the confirmation screen. Returns `null` for free events.
  Future<PaymentConfirmationData?> book({
    required Event event,
    required UserProfile user,
    String? inviteCode,
    String? inviteLinkId,
    int? quotedPriceInPaise,
  }) async {
    _requireBookingSession(user, action: 'book an event');
    final paymentRepo = ref.read(paymentRepositoryProvider);
    final currentPriceInPaise =
        quotedPriceInPaise ?? event.priceInPaiseFor(user);

    if (currentPriceInPaise == 0) {
      await paymentRepo.bookFreeEvent(
        eventId: event.id,
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
      );
      return null;
    }
    return _startCheckout(
      event: event,
      user: user,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
    );
  }

  Future<PaymentConfirmationData> _startCheckout({
    required Event event,
    required UserProfile user,
    String? inviteCode,
    String? inviteLinkId,
  }) {
    final paymentRepo = ref.read(paymentRepositoryProvider);
    if (!paymentRepo.supportsPaidBookingsForCurrency(event.currency)) {
      throw PaidBookingUnsupportedException(
        message: 'Paid bookings in ${event.currency} are not available yet.',
      );
    }
    return paymentRepo.processPayment(
      eventId: event.id,
      currencyCode: event.currency,
      description:
          // copy:allow-inline(Composes governed event title and date separator copy)
          '${event.title}${StructuredDomainCopy.eventTitleDateSeparator}${event.shortDateLabel}',
      userName: user.name,
      userEmail: user.email,
      userContact: user.phoneNumber,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
    );
  }

  /// Cancels the user's sign-up for [event] via the [cancelEventSignUp] Cloud
  /// Function, which atomically updates their event participation edge and
  /// decrements aggregate booking projections.
  Future<void> cancelBooking({required Event event}) async {
    _requireSignedIn(action: 'cancel a booking');
    await ref
        .read(eventRepositoryProvider)
        .cancelSignUpViaFunction(eventId: event.id);
  }

  /// Adds the user to the waitlist for a full event.
  Future<void> joinWaitlist({
    required Event event,
    String? inviteCode,
    String? inviteLinkId,
  }) async {
    _requireSignedIn(action: 'join a waitlist');
    await ref
        .read(eventRepositoryProvider)
        .joinWaitlistViaFunction(
          eventId: event.id,
          inviteCode: inviteCode,
          inviteLinkId: inviteLinkId,
        );
  }

  /// Removes the user from the waitlist.
  Future<void> leaveWaitlist({required Event event}) async {
    _requireSignedIn(action: 'leave a waitlist');
    await ref.read(eventRepositoryProvider).leaveWaitlist(eventId: event.id);
  }

  /// Accepts an expiring waitlist offer. Free offers book immediately; paid
  /// offers unlock and start the existing checkout flow.
  Future<PaymentConfirmationData?> acceptWaitlistOffer({
    required Event event,
    required UserProfile user,
    String? inviteCode,
    String? inviteLinkId,
  }) async {
    const action = 'accept a waitlist offer';
    final session = _requireBookingSession(user, action: action);
    var canContinue = true;
    // Keep observing even when a mounted route pauses its provider listeners.
    // Once revoked, returning to the same UID cannot restore this continuation.
    final subscription = ref.container.listen(authenticatedSessionProvider, (
      previous,
      next,
    ) {
      if (next.isLoading ||
          next.hasError ||
          !identical(next.asData?.value, session)) {
        canContinue = false;
      }
    });
    final removeDisposeListener = ref.onDispose(subscription.close);
    try {
      final response = await ref
          .read(eventRepositoryProvider)
          .acceptWaitlistOffer(eventId: event.id);
      if (response.requiresPayment) {
        if (!ref.mounted || !canContinue) {
          throw const SignInRequiredException(action);
        }
        final current = _requireBookingSession(user, action: action);
        if (!identical(current, session)) {
          throw const SignInRequiredException(action);
        }
        // Acceptance is the current server-owned route; a stale local zero price
        // cannot turn the accepted paid offer into a free booking command.
        return await _startCheckout(
          event: event,
          user: user,
          inviteCode: inviteCode,
          inviteLinkId: inviteLinkId,
        );
      }
      // A completed free booking remains authoritative after departure. Its
      // originating route separately decides whether to present completion.
      return null;
    } finally {
      removeDisposeListener();
      subscription.close();
    }
  }

  /// Declines an expiring waitlist offer without leaving the waitlist.
  Future<void> declineWaitlistOffer({required Event event}) async {
    _requireSignedIn(action: 'decline a waitlist offer');
    await ref
        .read(eventRepositoryProvider)
        .declineWaitlistOffer(eventId: event.id);
  }

  /// Redeems the signed session carried by the Host's live venue QR.
  Future<void> selfCheckIn({
    required String eventId,
    required String venueSessionToken,
  }) async {
    _requireSignedIn(action: 'check in to an event');
    await ref
        .read(eventRepositoryProvider)
        .selfCheckInAttendance(
          eventId: eventId,
          venueSessionToken: venueSessionToken,
        );
  }

  AuthenticatedSession _requireBookingSession(
    UserProfile user, {
    required String action,
  }) {
    final auth = ref.read(authenticatedSessionProvider);
    final session = auth.asData?.value;
    if (auth.isLoading ||
        auth.hasError ||
        session == null ||
        session.uid != user.uid) {
      throw SignInRequiredException(action);
    }
    return session;
  }

  String _requireSignedIn({required String action}) {
    return requireSignedInUid(ref, action: action);
  }
}
