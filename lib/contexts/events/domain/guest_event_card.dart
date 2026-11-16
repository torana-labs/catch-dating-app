import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:meta/meta.dart';

/// The event as a guest's own lists show it: the `eventCard` the guest event
/// triggers copy onto the guest's `savedEvents` edges and
/// `guestEventStatuses` rows (`contracts/embedded/guest_event_card.schema.json`).
///
/// It carries no live booking counts, so lists show capacity terms, never
/// "N going" or "M left". Anything that needs the whole event, or decides
/// booking, reads the event itself.
@immutable
class GuestEventCard {
  const GuestEventCard({
    required this.eventId,
    required this.organizerId,
    required this.name,
    required this.published,
    required this.status,
    required this.startTime,
    required this.endTime,
    required this.eventTimezone,
    required this.eventFormat,
    required this.distanceKm,
    required this.pace,
    required this.meetingPoint,
    required this.meetingLocation,
    required this.startingPointLat,
    required this.startingPointLng,
    required this.locationDetails,
    required this.description,
    required this.capacityLimit,
    required this.priceInPaise,
    required this.currency,
    required this.priceHiddenUntilBookingOpens,
    required this.publicRegistrationEnabled,
    required this.demandPricing,
    required this.synthetic,
  });

  /// The card the guest event triggers write for [event]: its list fields,
  /// without live booking counts.
  factory GuestEventCard.fromEvent(Event event) => GuestEventCard(
    eventId: event.id,
    organizerId: event.organizerId,
    name: event.name,
    published: true,
    status: event.status,
    startTime: event.startTime,
    endTime: event.endTime,
    eventTimezone: event.eventTimezone,
    eventFormat: event.eventFormat,
    distanceKm: event.distanceKm,
    pace: event.pace,
    meetingPoint: event.meetingPoint,
    meetingLocation: event.meetingLocation,
    startingPointLat: event.startingPointLat,
    startingPointLng: event.startingPointLng,
    locationDetails: event.locationDetails,
    description: event.description,
    capacityLimit: event.capacityLimit,
    priceInPaise: event.priceInPaise,
    currency: event.currency,
    priceHiddenUntilBookingOpens: event.priceHiddenUntilBookingOpens,
    publicRegistrationEnabled: event.publicRegistrationEnabled,
    demandPricing: event.effectiveEventPolicy.usesDemandPricing,
    synthetic: event.synthetic,
  );

  /// Parses a stored card, or returns null for a missing or malformed one: a
  /// list leaves out an event it cannot show rather than failing whole.
  static GuestEventCard? fromData(Object? value) {
    if (value is! Map) return null;
    final data = Map<String, dynamic>.from(value);
    final eventId = data['eventId'];
    final organizerId = data['organizerId'];
    final start = data['startTimeMillis'];
    final format = data['eventFormat'];
    if (eventId is! String ||
        eventId.isEmpty ||
        organizerId is! String ||
        start is! int ||
        format is! Map) {
      return null;
    }
    final end = data['endTimeMillis'];
    final location = data['meetingLocation'];
    return GuestEventCard(
      eventId: eventId,
      organizerId: organizerId,
      name: data['name'] as String? ?? '',
      published: data['publicationState'] == 'published',
      status: data['status'] == 'cancelled'
          ? EventLifecycleStatus.cancelled
          : EventLifecycleStatus.active,
      startTime: DateTime.fromMillisecondsSinceEpoch(start),
      endTime: end is int ? DateTime.fromMillisecondsSinceEpoch(end) : null,
      eventTimezone: data['eventTimezone'] as String?,
      eventFormat: EventFormatSnapshot.fromJson(
        Map<String, dynamic>.from(format),
      ),
      distanceKm: (data['distanceKm'] as num?)?.toDouble(),
      pace: PaceLevel.values.asNameMap()[data['pace']],
      meetingPoint: data['meetingPoint'] as String?,
      meetingLocation: location is Map
          ? EventMeetingLocation.fromJson(Map<String, dynamic>.from(location))
          : null,
      startingPointLat: (data['startingPointLat'] as num?)?.toDouble(),
      startingPointLng: (data['startingPointLng'] as num?)?.toDouble(),
      locationDetails: data['locationDetails'] as String?,
      description: data['description'] as String?,
      capacityLimit: data['capacityLimit'] as int?,
      priceInPaise: data['priceInPaise'] as int?,
      currency: data['currency'] as String?,
      priceHiddenUntilBookingOpens:
          data['priceHiddenUntilBookingOpens'] == true,
      publicRegistrationEnabled: data['publicRegistrationEnabled'] == true,
      demandPricing: data['demandPricing'] == true,
      synthetic: data['synthetic'] == true,
    );
  }

  final String eventId;
  final String organizerId;
  final String name;

  /// Lists show only published events, as the event joins they replace did.
  final bool published;
  final EventLifecycleStatus status;
  final DateTime startTime;
  final DateTime? endTime;
  final String? eventTimezone;
  final EventFormatSnapshot eventFormat;
  final double? distanceKm;
  final PaceLevel? pace;
  final String? meetingPoint;
  final EventMeetingLocation? meetingLocation;
  final double? startingPointLat;
  final double? startingPointLng;
  final String? locationDetails;
  final String? description;
  final int? capacityLimit;
  final int? priceInPaise;
  final String? currency;
  final bool priceHiddenUntilBookingOpens;
  final bool publicRegistrationEnabled;

  /// Demand pricing applies, so a price reads as a starting price.
  final bool demandPricing;
  final bool synthetic;

  /// The same title the event itself shows.
  String get title => eventDisplayTitle(
    name: name,
    startTime: startTime,
    eventFormat: eventFormat,
  );

  ActivityKind get activityKind => eventFormat.activityKind;
  bool get isCancelled => status == EventLifecycleStatus.cancelled;

  /// Not cancelled and not started, as for the event.
  bool isUpcomingAt(DateTime now) => !isCancelled && startTime.isAfter(now);

  /// The host hides the price until Catch registration opens.
  bool get priceHiddenForGuests =>
      priceHiddenUntilBookingOpens && !publicRegistrationEnabled;

  EventMeetingLocation? get effectiveMeetingLocation =>
      meetingLocation ??
      eventMeetingLocationFromLegacy(
        name: meetingPoint ?? '',
        latitude: startingPointLat,
        longitude: startingPointLng,
        notes: locationDetails,
      );

  String get locationName =>
      effectiveMeetingLocation?.name ?? meetingPoint ?? '';
  String? get locationNotes =>
      effectiveMeetingLocation?.notes ?? locationDetails;
  double? get effectiveStartingPointLat =>
      effectiveMeetingLocation?.latitude ?? startingPointLat;
  double? get effectiveStartingPointLng =>
      effectiveMeetingLocation?.longitude ?? startingPointLng;

  @override
  bool operator ==(Object other) =>
      other is GuestEventCard &&
      other.eventId == eventId &&
      other.organizerId == organizerId &&
      other.name == name &&
      other.published == published &&
      other.status == status &&
      other.startTime == startTime &&
      other.endTime == endTime &&
      other.eventTimezone == eventTimezone &&
      other.eventFormat.activityKind == eventFormat.activityKind &&
      other.eventFormat.interactionModel == eventFormat.interactionModel &&
      other.eventFormat.customActivityLabel ==
          eventFormat.customActivityLabel &&
      other.distanceKm == distanceKm &&
      other.pace == pace &&
      other.meetingPoint == meetingPoint &&
      other.meetingLocation == meetingLocation &&
      other.startingPointLat == startingPointLat &&
      other.startingPointLng == startingPointLng &&
      other.locationDetails == locationDetails &&
      other.description == description &&
      other.capacityLimit == capacityLimit &&
      other.priceInPaise == priceInPaise &&
      other.currency == currency &&
      other.priceHiddenUntilBookingOpens == priceHiddenUntilBookingOpens &&
      other.publicRegistrationEnabled == publicRegistrationEnabled &&
      other.demandPricing == demandPricing &&
      other.synthetic == synthetic;

  @override
  int get hashCode => Object.hash(
    eventId,
    name,
    status,
    startTime,
    endTime,
    eventFormat.activityKind,
    meetingPoint,
    capacityLimit,
    priceInPaise,
    published,
  );
}
