import 'dart:math' as math;

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_service.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

const _legacyUnattributedCohortId = 'legacyUnattributed';

extension EventX on Event {
  String get organizerId => clubId;

  double get distanceMiles => distanceKm * 0.621371;
  ActivityKind get activityKind => eventFormat.activityKind;
  int get signedUpCount => bookedCount ?? 0;
  int get attendedCount => checkedInCount ?? 0;
  int get waitlistCount => waitlistedCount ?? 0;
  int get spotsRemaining => math.max(0, capacityLimit - signedUpCount);
  bool get isFull => signedUpCount >= capacityLimit;
  bool get isFree => priceInPaise == 0;
  bool get isCancelled => status == EventLifecycleStatus.cancelled;
  bool get isExternalCompanion => eventOrigin?.isExternal ?? false;
  bool get hasWebRuntime => runtimeAccess?.isJoinable ?? false;
  Uri? runtimeJoinUri({String baseUrl = 'https://catchdates.com'}) {
    final runtimeId = runtimeAccess?.publicRuntimeId;
    if (runtimeId == null || runtimeId.isEmpty) return null;
    return Uri.parse(
      baseUrl,
    ).resolve('/join/${Uri.encodeComponent(runtimeId)}');
  }

  bool isUpcomingAt(DateTime now) => !isCancelled && startTime.isAfter(now);
  bool get hasRequirements => constraints.hasRequirements;
  bool get hasExactStartingPoint =>
      effectiveStartingPointLat != null && effectiveStartingPointLng != null;
  String? get primaryPhotoUrl {
    if (eventPhotos.isNotEmpty) return eventPhotos.first.url;
    return photoUrl;
  }

  EventMeetingLocation? get effectiveMeetingLocation =>
      meetingLocation ??
      eventMeetingLocationFromLegacy(
        name: meetingPoint,
        latitude: startingPointLat,
        longitude: startingPointLng,
        notes: locationDetails,
      );
  String get locationName => effectiveMeetingLocation?.name ?? meetingPoint;
  String? get locationNotes =>
      effectiveMeetingLocation?.notes ?? locationDetails;
  double? get effectiveStartingPointLat =>
      effectiveMeetingLocation?.latitude ?? startingPointLat;
  double? get effectiveStartingPointLng =>
      effectiveMeetingLocation?.longitude ?? startingPointLng;
  EventPolicyBundle get effectiveEventPolicy =>
      eventPolicy ??
      EventPolicyBundle.legacyEvent(
        capacityLimit: capacityLimit,
        priceInPaise: priceInPaise,
        maxMen: constraints.maxMen,
        maxWomen: constraints.maxWomen,
      );

  Map<String, int> get effectiveCohortCounts {
    if (cohortCounts.isNotEmpty) return cohortCounts;
    final nonBinaryOrOther =
        (genderCounts[Gender.nonBinary.name] ?? 0) +
        (genderCounts[Gender.other.name] ?? 0);
    final legacyGenderCohorts = {
      if ((genderCounts[Gender.man.name] ?? 0) > 0)
        EventCohortIds.menInterestedInWomen: genderCounts[Gender.man.name]!,
      if ((genderCounts[Gender.woman.name] ?? 0) > 0)
        EventCohortIds.womenInterestedInMen: genderCounts[Gender.woman.name]!,
      if (nonBinaryOrOther > 0)
        EventCohortIds.nonBinaryOrOther: nonBinaryOrOther,
    };
    if (legacyGenderCohorts.isNotEmpty) return legacyGenderCohorts;

    // Older event documents projected only an aggregate bookedCount. Preserve
    // that total for global capacity and waitlist decisions without assigning
    // it to a real cohort whose cap or pricing rule it could distort.
    final legacyBookedCount = bookedCount ?? 0;
    return legacyBookedCount > 0
        ? {_legacyUnattributedCohortId: legacyBookedCount}
        : const {};
  }

  Map<String, int> get effectiveWaitlistedCohortCounts =>
      waitlistedCohortCounts;

  int priceInPaiseFor(UserProfile user) {
    final policy = effectiveEventPolicy;
    final attendee = EventAttendeeProfile.fromUserProfile(user);
    final cohort = policy.cohortResolver.resolve(attendee);
    return policy.pricingPolicy
        .quoteFor(
          cohort: cohort,
          roster: EventRosterSnapshot(
            bookedCountsByCohort: effectiveCohortCounts,
            waitlistedCountsByCohort: effectiveWaitlistedCohortCounts,
            crossPathsPairConfirmedCount: crossPathsPairConfirmedCount,
          ),
        )
        .finalAmount
        .inPaise;
  }

  /// Returns fresh-viewer eligibility of [user] for this event.
  ///
  /// User-specific roster state lives in `eventParticipations`, so callers that
  /// know the viewer's participation edge should prefer a view-model seam that
  /// combines the event and participation before rendering action state.
  @Deprecated('Use EventService.eligibilityFor instead')
  EventEligibility eligibilityFor(
    UserProfile user, {
    required DateTime now,
    bool hasValidInvite = false,
  }) {
    return EventService.eligibilityFor(
      this,
      user,
      now: now,
      hasValidInvite: hasValidInvite,
    );
  }

  /// Returns the fresh-viewer booking status for [user].
  ///
  /// Signed-up, waitlisted, and attended statuses require a `EventParticipation`
  /// edge and are intentionally resolved outside this model.
  EventSignUpStatus statusFor(
    UserProfile user, {
    required DateTime now,
    bool hasValidInvite = false,
  }) {
    return switch (EventService.eligibilityFor(
      this,
      user,
      now: now,
      hasValidInvite: hasValidInvite,
    )) {
      EventPast() => EventSignUpStatus.past,
      EventFull() => EventSignUpStatus.full,
      Eligible() => EventSignUpStatus.eligible,
      _ => EventSignUpStatus.ineligible,
    };
  }

  String get title {
    final authoredName = name.trim();
    if (authoredName.isNotEmpty) return authoredName;
    return legacyDerivedTitle;
  }

  String get legacyDerivedTitle {
    final weekday = AppTimeFormatters.longWeekday(startTime);
    final hour = startTime.hour;
    final period = hour < 12
        ? StructuredDomainCopy.eventTitleMorning
        : hour < 17
        ? StructuredDomainCopy.eventTitleAfternoon
        : StructuredDomainCopy.eventTitleEvening;
    // copy:allow-inline(Composes governed period copy with dynamic event data)
    return '$weekday $period ${eventFormat.eventTitleLabel}';
  }
}

extension EventOriginX on EventOrigin {
  bool get isExternal => mode == EventOriginMode.externalCompanion;
}

extension EventRuntimeAccessX on EventRuntimeAccess {
  bool get isJoinable => enabled && publicRuntimeId != null;
}
