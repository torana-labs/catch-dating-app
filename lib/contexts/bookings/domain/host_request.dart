/// Whether the host decides this person (a join request) or can offer them a
/// spot (the waitlist).
enum HostRequestKind {
  request,
  waitlist;

  static HostRequestKind fromWire(String value) =>
      values.firstWhere((kind) => kind.name == value);
}

/// One person waiting on one of an organizer's coming events: a row of the
/// event's `hostEventRequestViews` read model.
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

  /// When the active waitlist offer runs out; it may already have passed.
  final DateTime? offerExpiresAt;

  /// One person can wait on several events, so the pair is the identity.
  String get key => '${eventId}_$uid';

  /// Whether a waitlist offer is still open at [now]. The read model keeps
  /// an active offer's expiry after it passes, so the clock decides.
  bool hasLiveOfferAt(DateTime now) => offerExpiresAt?.isAfter(now) ?? false;

  static DateTime? _dateOf(Object? millis) => millis == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(millis as int);
}

/// Everyone waiting; [complete] is false when the bounded read left people out.
class HostRequests {
  const HostRequests({required this.rows, required this.complete});

  /// Everyone waiting across the event views [views], soonest event first and
  /// oldest ask first, leaving out anyone in [hidden] (a block either way
  /// with the reader). [moreEvents] says the event window left views out.
  factory HostRequests.fromViews(
    Iterable<Map<String, Object?>> views, {
    required Set<String> hidden,
    required bool moreEvents,
  }) {
    var complete = !moreEvents;
    final rows = <HostRequest>[];
    for (final view in views) {
      if (view['complete'] != true) complete = false;
      for (final row in view['rows']! as List<Object?>) {
        final request = HostRequest.fromJson(
          Map<String, Object?>.from(row! as Map),
        );
        if (!hidden.contains(request.uid)) rows.add(request);
      }
    }
    rows.sort(_compare);
    return HostRequests(rows: List.unmodifiable(rows), complete: complete);
  }

  final List<HostRequest> rows;
  final bool complete;

  static int _compare(HostRequest left, HostRequest right) {
    final byEvent = left.eventStart.compareTo(right.eventStart);
    if (byEvent != 0) return byEvent;
    final byAsk = (left.askedAt?.millisecondsSinceEpoch ?? 0).compareTo(
      right.askedAt?.millisecondsSinceEpoch ?? 0,
    );
    return byAsk != 0 ? byAsk : left.uid.compareTo(right.uid);
  }
}
