import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_event_checkout_controller.g.dart';

/// Paid INR seats for this event are sold through the organizer's own
/// Razorpay account, so Catch never collects the guest's money.
bool usesOrganizerCheckout(Event event) =>
    event.publicRegistrationMode == EventPublicRegistrationMode.paid &&
    event.currency.trim().toUpperCase() == 'INR';

/// The booking was paid to the organizer and is refunded from their account.
bool isOrganizerBooking(EventParticipation? participation) =>
    isOrganizerPaymentId(participation?.paymentId);

/// Action controller for organizer-routed paid bookings. The event dock runs
/// these through [EventBookingController]'s book and cancel mutations so the
/// booking UI keeps one pending and error state.
@riverpod
class OrganizerEventCheckoutController
    extends _$OrganizerEventCheckoutController {
  @override
  void build() {}

  /// Resumes or prepares the server-quoted organizer payment for [event].
  Future<OrganizerCheckoutSession> prepare({
    required Event event,
    required UserProfile user,
  }) {
    _requireBookingSession(user);
    return ref
        .read(paymentRepositoryProvider)
        .prepareOrganizerCheckout(eventId: event.id, displayName: user.name);
  }

  /// Pays a prepared session with the method chosen on Catch's payment page.
  Future<PaymentConfirmationData> pay({
    required Event event,
    required UserProfile user,
    required OrganizerCheckoutSession session,
    required OrganizerPaymentMethod method,
  }) {
    _requireBookingSession(user);
    return ref
        .read(paymentRepositoryProvider)
        .payOrganizerCheckout(
          session: session,
          method: method,
          displayName: user.name,
          description:
              // copy:allow-inline(Composes governed event title and date separator copy)
              '${event.title}${StructuredDomainCopy.eventTitleDateSeparator}${event.shortDateLabel}',
          userEmail: user.email,
          userContact: user.phoneNumber,
        );
  }

  /// Confirmation for a booking the server already admitted.
  PaymentConfirmationData alreadyBooked(OrganizerCheckoutSession session) =>
      ref.read(paymentRepositoryProvider).organizerConfirmation(session);

  void _requireBookingSession(UserProfile user) {
    final session = ref.read(authenticatedSessionProvider);
    final current = session.asData?.value;
    if (session.isLoading ||
        session.hasError ||
        current == null ||
        current.uid != user.uid) {
      throw const SignInRequiredException('book an event');
    }
  }

  Future<void> cancel({
    required Event event,
    required EventParticipation participation,
  }) {
    requireSignedInUid(ref, action: 'cancel a booking');
    final paymentId = participation.paymentId;
    if (!isOrganizerPaymentId(paymentId)) {
      throw const PaymentFailedException(
        'This booking has no organizer payment.',
      );
    }
    return ref
        .read(paymentRepositoryProvider)
        .cancelOrganizerBooking(eventId: event.id, paymentId: paymentId!);
  }
}
