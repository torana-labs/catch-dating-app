import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/core/formatters/distance_formatter.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

class ExploreCoverStoryState {
  const ExploreCoverStoryState({
    required this.kicker,
    required this.title,
    required this.ctaLabel,
    required this.timePriceLabel,
    required this.attendanceLabel,
  });

  factory ExploreCoverStoryState.from(
    ExploreEventItem item, {
    required AppLocalizations l10n,
    DateTime? now,
  }) {
    return ExploreCoverStoryState(
      kicker: _coverKicker(item, l10n: l10n, now: now),
      title: item.event.title,
      ctaLabel: _coverCtaLabel(item, l10n),
      timePriceLabel: l10n.exploreExploreScreenStateVisiblecopyTimePricelabel(
        time: EventFormatters.time(item.event.startTime),
        priceLabel: eventPriceLabel(
          l10n,
          item.event,
          quotedPriceInPaise: item.availability?.quotedPriceInPaise,
        ),
      ),
      attendanceLabel: l10n
          .exploreExploreScreenStateVisiblecopySignedupcountGoingCoverspotslabel(
            signedUpCount: item.event.signedUpCount,
            coverSpotsLabel: _coverSpotsLabel(item, l10n),
          ),
    );
  }

  final String kicker;
  final String title;
  final String ctaLabel;
  final String timePriceLabel;
  final String attendanceLabel;
}

class ExploreEventRowState {
  const ExploreEventRowState({
    required this.kicker,
    required this.title,
    required this.supportingLabel,
    required this.priceLabel,
    required this.capacityLabel,
    required this.statusLabel,
  });

  factory ExploreEventRowState.from(
    ExploreEventItem item, {
    required AppLocalizations l10n,
  }) {
    return ExploreEventRowState(
      kicker: item.club.name,
      title: item.event.eventFormat.customActivityLabel == null
          ? item.event.eventFormat.label
          : item.event.eventFormat.eventTitleLabel,
      supportingLabel: _rowSupportingLabel(item, l10n),
      priceLabel: eventPriceLabel(
        l10n,
        item.event,
        quotedPriceInPaise: item.availability?.quotedPriceInPaise,
      ),
      capacityLabel: _capacityLabel(item, l10n),
      statusLabel: _cardStatusLabel(item, l10n),
    );
  }

  final String kicker;
  final String title;
  final String supportingLabel;
  final String priceLabel;
  final String capacityLabel;
  final String? statusLabel;
}

String exploreEventMapKicker(ExploreEventItem item) {
  return item.club.name;
}

class ExploreExternalEventRowState {
  const ExploreExternalEventRowState({
    required this.sourceLabel,
    required this.statusLabel,
    required this.supportingLabel,
    required this.timePriceLabel,
    required this.actionLabel,
    required this.actionSemanticsLabel,
    required this.readOnlySupplyLabel,
    required this.semanticLabel,
    required this.hasExternalLink,
  });

  factory ExploreExternalEventRowState.from(
    ExploreExternalEventItem item, {
    required AppLocalizations l10n,
  }) {
    final event = item.event;
    final hasExternalLink = event.primaryExternalUri != null;
    return ExploreExternalEventRowState(
      sourceLabel: l10n.exploreExploreScreenStateVisiblecopyFromTouppercase(
        toUpperCase: event.platformLabel.toUpperCase(),
      ),
      statusLabel: l10n.exploreExploreScreenStateVisiblecopyExternal,
      supportingLabel: _externalEventSupportingLabel(item, l10n),
      timePriceLabel: l10n
          .exploreExploreScreenStateVisiblecopyTimePricelabelc30029(
            time: EventFormatters.time(event.startTime),
            priceLabel: externalEventPriceLabel(l10n, event),
          ),
      actionLabel: hasExternalLink
          ? l10n.exploreExploreScreenStateActionlabelOpen
          : l10n.exploreExploreScreenStateActionlabelNoLink,
      actionSemanticsLabel: hasExternalLink
          ? l10n.exploreExploreScreenStateVisiblecopyOpenExternalEventSource
          : l10n.exploreExploreScreenStateVisiblecopyExternalEventLinkUnavailable,
      readOnlySupplyLabel:
          l10n.exploreExploreScreenStateVisiblecopyReadOnlySupplyNo,
      semanticLabel: l10n.exploreExploreScreenStateExternalEventSemantics(
        title: event.title,
        sourceLabel: l10n.exploreExploreScreenStateVisiblecopyFromTouppercase(
          toUpperCase: event.platformLabel.toUpperCase(),
        ),
        statusLabel: l10n.exploreExploreScreenStateVisiblecopyExternal,
        supportingLabel: _externalEventSupportingLabel(item, l10n),
        timePriceLabel: l10n
            .exploreExploreScreenStateVisiblecopyTimePricelabelc30029(
              time: EventFormatters.time(event.startTime),
              priceLabel: externalEventPriceLabel(l10n, event),
            ),
        readOnlySupplyLabel:
            l10n.exploreExploreScreenStateVisiblecopyReadOnlySupplyNo,
      ),
      hasExternalLink: hasExternalLink,
    );
  }

  final String sourceLabel;
  final String statusLabel;
  final String supportingLabel;
  final String timePriceLabel;
  final String actionLabel;
  final String actionSemanticsLabel;
  final String readOnlySupplyLabel;
  final String semanticLabel;
  final bool hasExternalLink;
}

String _rowSupportingLabel(ExploreEventItem item, AppLocalizations l10n) {
  final event = item.event;
  return [
    if (event.eventFormat.isDistanceBased) event.activitySummaryLabel,
    event.locationName,
    DistanceFormatter.away(l10n, item.distanceFromUserKm),
  ].whereType<String>().where((label) => label.trim().isNotEmpty).join(' · ');
}

String _capacityLabel(ExploreEventItem item, AppLocalizations l10n) {
  final event = item.event;
  final goingLabel = l10n.exploreExploreScreenStateGoingCount(
    count: event.signedUpCount,
  );
  final availabilityLabel = event.spotsRemaining <= 0
      ? l10n.exploreExploreScreenStateAvailabilityFull
      : _availabilityLabel(item.availability, l10n) ??
            l10n.exploreExploreScreenStateAvailabilitySpotsLeft(
              spots: event.spotsRemaining,
            );
  return l10n.exploreExploreScreenStateGoingAvailability(
    goingLabel: goingLabel,
    availabilityLabel: availabilityLabel,
  );
}

String? _cardStatusLabel(ExploreEventItem item, AppLocalizations l10n) {
  return switch (item.status) {
    EventTileStatus.open => _availabilityStatusLabel(item, l10n),
    EventTileStatus.recommended => _availabilityStatusLabel(item, l10n),
    EventTileStatus.joined ||
    EventTileStatus.saved ||
    EventTileStatus.hosted ||
    EventTileStatus.waitlisted ||
    EventTileStatus.attended ||
    EventTileStatus.past ||
    EventTileStatus.cancelled => eventTileStatusLabel(item.status, l10n),
    EventTileStatus.ineligible =>
      _availabilityLabel(item.availability, l10n) ??
          eventTileStatusLabel(EventTileStatus.ineligible, l10n),
    EventTileStatus.full => _availabilityStatusLabel(item, l10n),
  };
}

String? _availabilityStatusLabel(ExploreEventItem item, AppLocalizations l10n) {
  final availability = item.availability;
  if (availability == null ||
      availability.status == ViewerEventAvailabilityStatus.open ||
      availability.status == ViewerEventAvailabilityStatus.full) {
    return null;
  }
  return _availabilityLabel(availability, l10n);
}

String _externalEventSupportingLabel(
  ExploreExternalEventItem item,
  AppLocalizations l10n,
) {
  final event = item.event;
  return _joinExploreLabels([
    event.activityKind.label,
    event.meetingPoint,
    DistanceFormatter.away(l10n, item.distanceFromUserKm),
  ]);
}

String? _availabilityLabel(
  ViewerEventAvailability? availability,
  AppLocalizations l10n,
) {
  if (availability == null) return null;
  final lowSpotLabel =
      availability.spotsRemaining > 0 && availability.spotsRemaining <= 4
      ? l10n.exploreExploreScreenStateAvailabilitySpotsLeft(
          spots: availability.spotsRemaining,
        )
      : null;
  return switch (availability.status) {
    ViewerEventAvailabilityStatus.open =>
      lowSpotLabel ?? l10n.exploreExploreScreenStateAvailabilityOpen,
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.hosted => lowSpotLabel,
    ViewerEventAvailabilityStatus.joined ||
    ViewerEventAvailabilityStatus.waitlisted ||
    ViewerEventAvailabilityStatus.attended => null,
    ViewerEventAvailabilityStatus.approvedToBook =>
      l10n.exploreExploreScreenStateAvailabilityApprovedToJoin,
    ViewerEventAvailabilityStatus.requestRequired =>
      l10n.exploreExploreScreenStateAvailabilityRequestRequired,
    ViewerEventAvailabilityStatus.waitlistAvailable =>
      l10n.exploreExploreScreenStateAvailabilityWaitlistOpen,
    ViewerEventAvailabilityStatus.full =>
      l10n.exploreExploreScreenStateAvailabilityFull,
    ViewerEventAvailabilityStatus.fullForViewer =>
      l10n.exploreExploreScreenStateAvailabilityFullForYou,
    ViewerEventAvailabilityStatus.inviteRequired =>
      l10n.exploreExploreScreenStateAvailabilityInviteRequired,
    ViewerEventAvailabilityStatus.membershipRequired =>
      l10n.exploreExploreScreenStateAvailabilityMembersOnly,
    ViewerEventAvailabilityStatus.profileRequired ||
    ViewerEventAvailabilityStatus.runPreferencesRequired =>
      l10n.exploreExploreScreenStateAvailabilitySetPreferences,
    ViewerEventAvailabilityStatus.ageRestricted => _ageRestrictedLabel(
      availability,
      l10n,
    ),
    ViewerEventAvailabilityStatus.past =>
      l10n.exploreExploreScreenStateAvailabilityEnded,
    ViewerEventAvailabilityStatus.cancelled =>
      l10n.exploreExploreScreenStateAvailabilityCancelled,
  };
}

String _ageRestrictedLabel(
  ViewerEventAvailability availability,
  AppLocalizations l10n,
) {
  return switch (availability.eligibility) {
    AgeTooYoung(:final minAge) =>
      l10n.exploreExploreScreenStateAvailabilityMinimumAge(minAge: minAge),
    AgeTooOld(:final maxAge) =>
      l10n.exploreExploreScreenStateAvailabilityMaximumAge(maxAge: maxAge),
    _ => l10n.exploreExploreScreenStateAvailabilityAgeRestricted,
  };
}

String _joinExploreLabels(Iterable<String?> labels) {
  return labels
      .whereType<String>()
      .map((label) => label.trim())
      .where((label) => label.isNotEmpty)
      .join(' · ');
}

String _coverKicker(
  ExploreEventItem item, {
  required AppLocalizations l10n,
  DateTime? now,
}) {
  return l10n
      .exploreExploreScreenStateVisiblecopyCovertimescopeNameLocationname(
        coverTimeScope: _coverTimeScope(
          item.event.startTime,
          l10n: l10n,
          now: now,
        ),
        name: item.club.name,
        locationName: item.event.locationName,
      );
}

String _coverTimeScope(
  DateTime start, {
  required AppLocalizations l10n,
  DateTime? now,
}) {
  final reference = now ?? DateTime.now();
  final today = DateUtils.dateOnly(reference);
  final eventDay = DateUtils.dateOnly(start);
  final dayOffset = eventDay.difference(today).inDays;
  return switch (dayOffset) {
    0 => l10n.exploreExploreScreenStateVisiblecopyTonight,
    1 => l10n.exploreExploreScreenStateVisiblecopyTomorrow,
    _ when dayOffset >= 0 && dayOffset < DateTime.daysPerWeek =>
      l10n.exploreExploreScreenStateVisiblecopyThisWeek,
    _ => EventFormatters.shortWeekday(start),
  };
}

String _coverSpotsLabel(ExploreEventItem item, AppLocalizations l10n) {
  final spots = math.max(0, item.event.spotsRemaining);
  return spots == 1
      ? l10n.exploreExploreScreenStateVisiblecopy1Left
      : l10n.exploreExploreScreenStateVisiblecopySpotsLeft(spots: spots);
}

String _coverCtaLabel(ExploreEventItem item, AppLocalizations l10n) {
  return switch (item.availability?.status) {
    ViewerEventAvailabilityStatus.open ||
    ViewerEventAvailabilityStatus.saved ||
    ViewerEventAvailabilityStatus.approvedToBook ||
    null => l10n.exploreExploreScreenStateCtaViewAndBook,
    ViewerEventAvailabilityStatus.requestRequired =>
      l10n.exploreExploreScreenStateCtaViewAndRequest,
    ViewerEventAvailabilityStatus.waitlistAvailable ||
    ViewerEventAvailabilityStatus.waitlisted =>
      l10n.exploreExploreScreenStateCtaViewWaitlist,
    _ => l10n.exploreExploreScreenStateCtaViewEvent,
  };
}
