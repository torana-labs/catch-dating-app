import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_eligibility.freezed.dart';

@freezed
sealed class EventEligibility with _$EventEligibility {
  const factory EventEligibility.profileDetailsRequired() =
      ProfileDetailsRequired;
  const factory EventEligibility.eligible() = Eligible;
  const factory EventEligibility.alreadySignedUp() = AlreadySignedUp;
  const factory EventEligibility.onWaitlist() = OnWaitlist;
  const factory EventEligibility.attended() = Attended;
  const factory EventEligibility.eventPast() = EventPast;
  const factory EventEligibility.eventFull() = EventFull;
  const factory EventEligibility.inviteRequired() = EventInviteRequired;

  /// The user's gender cap for this event has been reached.
  const factory EventEligibility.genderCapacityReached() =
      GenderCapacityReached;

  const factory EventEligibility.ageTooYoung(int minAge) = AgeTooYoung;
  const factory EventEligibility.ageTooOld(int maxAge) = AgeTooOld;
}
