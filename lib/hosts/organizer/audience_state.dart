import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter/foundation.dart';

/// Where the audience summary is: reading, read, or unavailable.
enum OrganizerAudienceStatus { loading, content, unavailable }

/// The organizer all-time figures and its audience, as plain values.
@immutable
class OrganizerAudienceState {
  const OrganizerAudienceState({
    required this.organizer,
    required this.audienceStatus,
    this.eventCount,
    this.upcomingCount,
    this.summary,
  });

  final Organizer organizer;

  /// Every event and the ones not cancelled; null until the events arrive.
  final int? eventCount;
  final int? upcomingCount;
  final OrganizerAudienceStatus audienceStatus;
  final HostCrmSummary? summary;

  /// The rating to one place, or a dash before any review.
  String get rating {
    if (organizer.reviewCount <= 0 || organizer.rating <= 0) return '—';
    final rounded = organizer.rating.roundToDouble();
    return organizer.rating == rounded
        ? rounded.toStringAsFixed(0)
        : organizer.rating.toStringAsFixed(1);
  }
}
