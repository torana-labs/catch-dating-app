/// Whether the host decides this person (a join request) or can offer them a
/// spot (the waitlist).
enum HostRequestKind {
  request,
  waitlist;

  static HostRequestKind fromWire(String value) =>
      values.firstWhere((kind) => kind.name == value);
}

/// One person waiting on one of an organizer's coming events, read through
/// `listOrganizerRequests`.
class HostRequest {
  const HostRequest({
    required this.uid,
    required this.kind,
    required this.eventId,
    required this.eventName,
    required this.eventStart,
    required this.placesLeft,
    required this.capacityLimit,
    required this.name,
    required this.askedAt,
    required this.waitlistPosition,
    required this.attendedEventCount,
    required this.offerExpiresAt,
  });

  factory HostRequest.fromJson(Map<String, Object?> json) => HostRequest(
    uid: json['uid']! as String,
    kind: HostRequestKind.fromWire(json['kind']! as String),
    eventId: json['eventId']! as String,
    eventName: json['eventName']! as String,
    eventStart: _dateOf(json['eventStartMillis'])!,
    placesLeft: json['placesLeft']! as int,
    capacityLimit: json['capacityLimit']! as int,
    name: json['name'] as String?,
    askedAt: _dateOf(json['askedAtMillis']),
    waitlistPosition: json['waitlistPosition'] as int?,
    attendedEventCount: json['attendedEventCount'] as int?,
    offerExpiresAt: _dateOf(json['offerExpiresAtMillis']),
  );

  final String uid;
  final HostRequestKind kind;
  final String eventId;
  final String eventName;
  final DateTime eventStart;
  final int placesLeft;
  final int capacityLimit;
  final String? name;
  final DateTime? askedAt;
  final int? waitlistPosition;

  /// Events they came to with this organizer; null when no contact is linked.
  final int? attendedEventCount;

  /// When a live waitlist offer runs out.
  final DateTime? offerExpiresAt;

  /// One person can wait on several events, so the pair is the identity.
  String get key => '${eventId}_$uid';

  bool get hasLiveOffer => offerExpiresAt != null;

  static DateTime? _dateOf(Object? millis) => millis == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(millis as int);
}

/// Everyone waiting; [complete] is false when the bounded read left people out.
class HostRequests {
  const HostRequests({required this.rows, required this.complete});

  factory HostRequests.fromJson(Map<String, Object?> json) => HostRequests(
    rows: [
      for (final row in json['rows']! as List<Object?>)
        HostRequest.fromJson(Map<String, Object?>.from(row! as Map)),
    ],
    complete: json['complete']! as bool,
  );

  final List<HostRequest> rows;
  final bool complete;
}
