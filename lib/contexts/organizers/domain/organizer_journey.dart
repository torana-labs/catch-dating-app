enum OrganizerJourneyStepKind {
  nominated,
  listed,
  claimRequested,
  claimRejected,
  claimed,
  firstEvent,
  firstPaidBooking;

  static OrganizerJourneyStepKind fromWire(String value) =>
      values.firstWhere((kind) => kind.name == value);
}

enum OrganizerJourneyNext {
  runYourPage,
  firstEvent;

  static OrganizerJourneyNext? fromWire(String? value) =>
      value == null ? null : values.firstWhere((next) => next.name == value);
}

class OrganizerJourneyStep {
  const OrganizerJourneyStep({
    required this.kind,
    required this.at,
    required this.detail,
  });

  factory OrganizerJourneyStep.fromJson(Map<String, Object?> json) {
    final atMillis = json['atMillis'] as int?;
    return OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.fromWire(json['kind']! as String),
      at: atMillis == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(atMillis),
      detail: json['detail'] as String?,
    );
  }

  final OrganizerJourneyStepKind kind;
  final DateTime? at;

  /// nominated: the link the page was built from. firstEvent: the event's name.
  final String? detail;
}

/// How a page got here, as its organizer sees it, read through
/// `listMyOrganizerJourneys`.
class OrganizerJourney {
  const OrganizerJourney({
    required this.organizerId,
    required this.organizerName,
    required this.waitingClaim,
    required this.steps,
    required this.next,
  });

  factory OrganizerJourney.fromJson(Map<String, Object?> json) =>
      OrganizerJourney(
        organizerId: json['organizerId']! as String,
        organizerName: json['organizerName']! as String,
        waitingClaim: json['waitingClaim']! as bool,
        steps: [
          for (final step in json['steps']! as List<Object?>)
            OrganizerJourneyStep.fromJson(
              Map<String, Object?>.from(step! as Map),
            ),
        ],
        next: OrganizerJourneyNext.fromWire(json['next'] as String?),
      );

  final String organizerId;
  final String organizerName;

  /// The caller's own claim is still being checked.
  final bool waitingClaim;
  final List<OrganizerJourneyStep> steps;
  final OrganizerJourneyNext? next;
}
