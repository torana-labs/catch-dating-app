import 'package:catch_dating_app/contexts/events/domain/event.dart';

extension ExternalBookingProviderX on ExternalBookingProvider {
  String get rosterAdapterVersion => switch (this) {
    ExternalBookingProvider.luma => 'luma-v1',
    ExternalBookingProvider.eventbrite => 'eventbrite-v1',
    ExternalBookingProvider.partiful => 'partiful-v1',
    ExternalBookingProvider.posh => 'posh-v1',
    ExternalBookingProvider.generic => 'generic-v1',
    ExternalBookingProvider.bookmyshow => 'bookmyshow-sample-required',
    ExternalBookingProvider.district => 'district-sample-required',
    ExternalBookingProvider.sortmyscene => 'sortmyscene-sample-required',
    ExternalBookingProvider.airbnb => 'airbnb-sample-required',
    ExternalBookingProvider.catchPlatform => 'catch-native',
  };

  static const externalValues = <ExternalBookingProvider>[
    ExternalBookingProvider.luma,
    ExternalBookingProvider.eventbrite,
    ExternalBookingProvider.partiful,
    ExternalBookingProvider.posh,
    ExternalBookingProvider.bookmyshow,
    ExternalBookingProvider.district,
    ExternalBookingProvider.sortmyscene,
    ExternalBookingProvider.airbnb,
    ExternalBookingProvider.generic,
  ];
}

String eventBookingAuthorityToJson(EventBookingAuthority value) =>
    value == EventBookingAuthority.catchPlatform ? 'catch' : value.name;

EventBookingAuthority eventBookingAuthorityFromJson(String value) =>
    value == 'catch'
    ? EventBookingAuthority.catchPlatform
    : EventBookingAuthority.values.byName(value);

String externalBookingProviderToJson(ExternalBookingProvider value) =>
    value == ExternalBookingProvider.catchPlatform ? 'catch' : value.name;

ExternalBookingProvider externalBookingProviderFromJson(String value) =>
    value == 'catch'
    ? ExternalBookingProvider.catchPlatform
    : ExternalBookingProvider.values.byName(value);

class ExternalEventOriginInput {
  const ExternalEventOriginInput({
    required this.provider,
    this.externalEventId,
    this.externalEventUrl,
    this.sourceExternalEventId,
    this.adapterVersion,
  });

  final ExternalBookingProvider provider;
  final String? externalEventId;
  final String? externalEventUrl;
  final String? sourceExternalEventId;
  final String? adapterVersion;

  Map<String, Object?> toJson() => {
    'provider': externalBookingProviderToJson(provider),
    'externalEventId': externalEventId,
    'externalEventUrl': externalEventUrl,
    'sourceExternalEventId': sourceExternalEventId,
    'adapterVersion': adapterVersion,
  };
}

/// The current booking status of a specific event from one user's perspective.
enum EventSignUpStatus {
  /// Event is upcoming, not full, and the user hasn't signed up.
  eligible,

  /// The user has already signed up.
  signedUp,

  /// The event is full and the user is not on the waitlist.
  full,

  /// The event is full and the user is on the waitlist.
  waitlisted,

  /// The user attended this event.
  attended,

  /// The event has started (or ended) and the user did not sign up.
  past,

  /// The user does not meet the event's eligibility constraints (age or gender cap).
  ineligible,
}

Object? readEventOrganizerId(Map<dynamic, dynamic> json, String key) =>
    json[key] ?? json['organizerId'];
