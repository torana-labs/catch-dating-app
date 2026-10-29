export 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        CreateStripeCheckoutSessionCallableRequest,
        CreateStripeHostOnboardingLinkCallableRequest,
        VerifyRazorpayPaymentCallableRequest;

// EventBookingCallableRequest and CreateRazorpayOrderCallableRequest are
// hand-written because they normalize inviteCode via .trim() before
// serialization.
final class EventBookingCallableRequest {
  const EventBookingCallableRequest({
    required this.eventId,
    this.inviteCode,
    this.inviteLinkId,
    this.crossPathsPairHoldId,
  });

  final String eventId;
  final String? inviteCode;
  final String? inviteLinkId;
  final String? crossPathsPairHoldId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteCode': ?inviteCode?.trim(),
    'inviteLinkId': ?inviteLinkId?.trim(),
    'crossPathsPairHoldId': ?crossPathsPairHoldId?.trim(),
  };
}

final class CreateRazorpayOrderCallableRequest {
  const CreateRazorpayOrderCallableRequest({
    required this.eventId,
    this.inviteCode,
    this.inviteLinkId,
    this.crossPathsPairHoldId,
  });

  final String eventId;
  final String? inviteCode;
  final String? inviteLinkId;
  final String? crossPathsPairHoldId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteCode': ?inviteCode?.trim(),
    'inviteLinkId': ?inviteLinkId?.trim(),
    'crossPathsPairHoldId': ?crossPathsPairHoldId?.trim(),
  };
}
