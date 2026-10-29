// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/eventPolicyCohort.dart.template

part of '../event_policy.dart';

class EventCohortIds {
  const EventCohortIds._();

  static const unspecified = 'unspecified';
  static const menInterestedInWomen = 'menInterestedInWomen';
  static const womenInterestedInMen = 'womenInterestedInMen';
  static const queerOrOpen = 'queerOrOpen';
  static const nonBinaryOrOther = 'nonBinaryOrOther';
}

class EventCohort {
  const EventCohort({required this.id, required this.label});

  static const unspecified = EventCohort(
    id: EventCohortIds.unspecified,
    label: '',
  );
  static const menInterestedInWomen = EventCohort(
    id: EventCohortIds.menInterestedInWomen,
    label: 'Men interested in women',
  );
  static const womenInterestedInMen = EventCohort(
    id: EventCohortIds.womenInterestedInMen,
    label: 'Women interested in men',
  );
  static const queerOrOpen = EventCohort(
    id: EventCohortIds.queerOrOpen,
    label: 'Queer or open',
  );
  static const nonBinaryOrOther = EventCohort(
    id: EventCohortIds.nonBinaryOrOther,
    label: 'Non-binary or other',
  );

  final String id;
  final String label;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventCohort && other.id == id && other.label == label;

  @override
  int get hashCode => Object.hash(id, label);

  @override
  String toString() => 'EventCohort(id: $id, label: $label)';
}

class EventAttendeeProfile {
  const EventAttendeeProfile({
    required this.uid,
    required this.gender,
    required this.interestedInGenders,
  });

  factory EventAttendeeProfile.fromUserProfile(UserProfile profile) =>
      EventAttendeeProfile(
        uid: profile.uid,
        gender: profile.gender,
        interestedInGenders: profile.interestedInGenders.toSet(),
      );

  final String uid;
  final Gender? gender;
  final Set<Gender> interestedInGenders;
}

class EventCohortResolver {
  const EventCohortResolver();

  EventCohort resolve(EventAttendeeProfile attendee) {
    if (attendee.gender == null || attendee.interestedInGenders.isEmpty) {
      return EventCohort.unspecified;
    }
    return switch (attendee.gender) {
      Gender.man when _isOnlyInterestedIn(attendee, Gender.woman) =>
        EventCohort.menInterestedInWomen,
      Gender.woman when _isOnlyInterestedIn(attendee, Gender.man) =>
        EventCohort.womenInterestedInMen,
      Gender.nonBinary || Gender.other => EventCohort.nonBinaryOrOther,
      _ => EventCohort.queerOrOpen,
    };
  }

  bool _isOnlyInterestedIn(EventAttendeeProfile attendee, Gender gender) {
    return attendee.interestedInGenders.length == 1 &&
        attendee.interestedInGenders.contains(gender);
  }
}

class EventRosterSnapshot {
  const EventRosterSnapshot({
    this.bookedCountsByCohort = const {},
    this.waitlistedCountsByCohort = const {},
    this.offeredCountsByCohort = const {},
    this.crossPathsPairConfirmedCount = 0,
  });

  final Map<String, int> bookedCountsByCohort;
  final Map<String, int> waitlistedCountsByCohort;
  final Map<String, int> offeredCountsByCohort;
  final int crossPathsPairConfirmedCount;

  int bookedCountFor(String cohortId) => bookedCountsByCohort[cohortId] ?? 0;

  int waitlistedCountFor(String cohortId) =>
      waitlistedCountsByCohort[cohortId] ?? 0;

  int offeredCountFor(String cohortId) => offeredCountsByCohort[cohortId] ?? 0;

  int interestCountFor(String cohortId) =>
      bookedCountFor(cohortId) +
      waitlistedCountFor(cohortId) +
      offeredCountFor(cohortId);

  int get totalBooked => _sum(bookedCountsByCohort);
  int get totalWaitlisted => _sum(waitlistedCountsByCohort);
  int get totalOffered => _sum(offeredCountsByCohort);

  static int _sum(Map<String, int> values) =>
      values.values.fold(0, (total, value) => total + math.max(0, value));
}
