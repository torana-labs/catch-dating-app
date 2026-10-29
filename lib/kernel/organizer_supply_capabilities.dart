enum OrganizerSupplyCapabilityMode { denied, unclaimedReadOnly, claimedManaged }

enum OrganizerReviewPolicy { unavailable, afterEventEnd, attendedEventOnly }

class OrganizerSupplyCapabilities {
  const OrganizerSupplyCapabilities({
    required this.mode,
    required this.bookable,
    required this.paymentsEnabled,
    required this.waitlistEnabled,
    required this.hostContactEnabled,
    required this.claimable,
    required this.reviewPolicy,
  });

  const OrganizerSupplyCapabilities.denied()
    : mode = OrganizerSupplyCapabilityMode.denied,
      bookable = false,
      paymentsEnabled = false,
      waitlistEnabled = false,
      hostContactEnabled = false,
      claimable = false,
      reviewPolicy = OrganizerReviewPolicy.unavailable;

  const OrganizerSupplyCapabilities.unclaimedReadOnly({this.claimable = true})
    : mode = OrganizerSupplyCapabilityMode.unclaimedReadOnly,
      bookable = false,
      paymentsEnabled = false,
      waitlistEnabled = false,
      hostContactEnabled = false,
      reviewPolicy = OrganizerReviewPolicy.afterEventEnd;

  const OrganizerSupplyCapabilities.claimedManaged()
    : mode = OrganizerSupplyCapabilityMode.claimedManaged,
      bookable = true,
      paymentsEnabled = true,
      waitlistEnabled = true,
      hostContactEnabled = true,
      claimable = false,
      reviewPolicy = OrganizerReviewPolicy.attendedEventOnly;

  factory OrganizerSupplyCapabilities.fromJson(Map<String, dynamic> json) {
    if (json['mode'] == 'claimed_managed' &&
        json['bookable'] == true &&
        json['paymentsEnabled'] == true &&
        json['waitlistEnabled'] == true &&
        json['hostContactEnabled'] == true &&
        json['claimable'] == false &&
        json['reviewPolicy'] == 'attended_event_only') {
      return const OrganizerSupplyCapabilities.claimedManaged();
    }
    if (json['mode'] == 'unclaimed_read_only' &&
        json['bookable'] == false &&
        json['paymentsEnabled'] == false &&
        json['waitlistEnabled'] == false &&
        json['hostContactEnabled'] == false &&
        json['claimable'] is bool &&
        json['reviewPolicy'] == 'after_event_end') {
      return OrganizerSupplyCapabilities.unclaimedReadOnly(
        claimable: json['claimable'] as bool,
      );
    }
    return const OrganizerSupplyCapabilities.denied();
  }

  final OrganizerSupplyCapabilityMode mode;
  final bool bookable;
  final bool paymentsEnabled;
  final bool waitlistEnabled;
  final bool hostContactEnabled;
  final bool claimable;
  final OrganizerReviewPolicy reviewPolicy;

  bool reviewableAt({required DateTime eventEnd, required DateTime now}) {
    return reviewPolicy == OrganizerReviewPolicy.afterEventEnd &&
        !eventEnd.isAfter(now);
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is OrganizerSupplyCapabilities &&
            mode == other.mode &&
            bookable == other.bookable &&
            paymentsEnabled == other.paymentsEnabled &&
            waitlistEnabled == other.waitlistEnabled &&
            hostContactEnabled == other.hostContactEnabled &&
            claimable == other.claimable &&
            reviewPolicy == other.reviewPolicy;
  }

  @override
  int get hashCode => Object.hash(
    mode,
    bookable,
    paymentsEnabled,
    waitlistEnabled,
    hostContactEnabled,
    claimable,
    reviewPolicy,
  );

  Map<String, dynamic> toJson() => {
    'mode': switch (mode) {
      OrganizerSupplyCapabilityMode.denied => throw StateError(
        'Denied organizer capabilities are not a persisted projection.',
      ),
      OrganizerSupplyCapabilityMode.unclaimedReadOnly => 'unclaimed_read_only',
      OrganizerSupplyCapabilityMode.claimedManaged => 'claimed_managed',
    },
    'bookable': bookable,
    'paymentsEnabled': paymentsEnabled,
    'waitlistEnabled': waitlistEnabled,
    'hostContactEnabled': hostContactEnabled,
    'claimable': claimable,
    'reviewPolicy': switch (reviewPolicy) {
      OrganizerReviewPolicy.unavailable => throw StateError(
        'Unavailable organizer review policy is not persisted.',
      ),
      OrganizerReviewPolicy.afterEventEnd => 'after_event_end',
      OrganizerReviewPolicy.attendedEventOnly => 'attended_event_only',
    },
  };
}

Object? readOrganizerSupplyCapabilities(
  Map<dynamic, dynamic> json,
  String key,
) {
  final stored = json[key];
  return stored is Map<String, dynamic> ? stored : const <String, dynamic>{};
}
