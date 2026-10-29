import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';

class EventParticipationRoster {
  const EventParticipationRoster({
    required this.bookedIds,
    required this.checkedInIds,
    required this.waitlistedIds,
    this.checkedInAtByUid = const {},
  });

  factory EventParticipationRoster.fromParticipations(
    List<EventParticipation> participations,
  ) {
    final bookedParticipations =
        participations
            .where(
              (participation) => switch (participation.status) {
                EventParticipationStatus.signedUp ||
                EventParticipationStatus.attended => true,
                EventParticipationStatus.waitlisted ||
                EventParticipationStatus.cancelled ||
                EventParticipationStatus.deleted => false,
              },
            )
            .toList()
          ..sort(_compareBookedParticipations);
    final checkedInParticipations =
        participations
            .where(
              (participation) =>
                  participation.status == EventParticipationStatus.attended,
            )
            .toList()
          ..sort(_compareCheckedInParticipations);
    final waitlistedParticipations =
        participations
            .where(
              (participation) =>
                  participation.status == EventParticipationStatus.waitlisted,
            )
            .toList()
          ..sort(_compareWaitlistedParticipations);

    return EventParticipationRoster(
      bookedIds: List.unmodifiable(_uniqueUids(bookedParticipations)),
      checkedInIds: List.unmodifiable(_uniqueUids(checkedInParticipations)),
      waitlistedIds: List.unmodifiable(_uniqueUids(waitlistedParticipations)),
      checkedInAtByUid: Map.unmodifiable({
        for (final participation in checkedInParticipations)
          participation.uid:
              participation.attendedAt ?? participation.createdAt,
      }),
    );
  }

  factory EventParticipationRoster.empty() => const EventParticipationRoster(
    bookedIds: [],
    checkedInIds: [],
    waitlistedIds: [],
  );

  final List<String> bookedIds;
  final List<String> checkedInIds;
  final List<String> waitlistedIds;
  final Map<String, DateTime> checkedInAtByUid;

  int get bookedCount => bookedIds.length;
  int get checkedInCount => checkedInIds.length;
  int get waitlistedCount => waitlistedIds.length;

  bool get isBookedEmpty => bookedIds.isEmpty;
  bool get isWaitlistEmpty => waitlistedIds.isEmpty;

  bool isCheckedIn(String uid) => checkedInIds.contains(uid);
}

List<String> _uniqueUids(List<EventParticipation> participations) {
  final ids = <String>[];
  final seen = <String>{};
  for (final participation in participations) {
    if (seen.add(participation.uid)) {
      ids.add(participation.uid);
    }
  }
  return ids;
}

int _compareBookedParticipations(EventParticipation a, EventParticipation b) {
  final aTime = a.signedUpAt ?? a.attendedAt ?? a.createdAt;
  final bTime = b.signedUpAt ?? b.attendedAt ?? b.createdAt;
  return _compareTimeThenUid(a, b, aTime, bTime);
}

int _compareCheckedInParticipations(
  EventParticipation a,
  EventParticipation b,
) {
  final aTime = a.attendedAt ?? a.signedUpAt ?? a.createdAt;
  final bTime = b.attendedAt ?? b.signedUpAt ?? b.createdAt;
  return _compareTimeThenUid(a, b, aTime, bTime);
}

int _compareWaitlistedParticipations(
  EventParticipation a,
  EventParticipation b,
) {
  final aTime = a.waitlistedAt ?? a.createdAt;
  final bTime = b.waitlistedAt ?? b.createdAt;
  return _compareTimeThenUid(a, b, aTime, bTime);
}

int _compareTimeThenUid(
  EventParticipation a,
  EventParticipation b,
  DateTime aTime,
  DateTime bTime,
) {
  final byTime = aTime.compareTo(bTime);
  if (byTime != 0) return byTime;
  return a.uid.compareTo(b.uid);
}
