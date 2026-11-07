import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:flutter/foundation.dart';

/// Where a saved group is: still reading, ready to edit (or new), or unable
/// to read it.
enum HostSavedGroupStatus { loading, ready, error }

/// A saved group and who it holds now.
@immutable
class HostSavedGroupState {
  const HostSavedGroupState({
    required this.status,
    this.audience,
    this.preview,
    this.previewFailed = false,
    this.eventTitle,
    this.error,
  });

  const HostSavedGroupState.loading()
    : this(status: HostSavedGroupStatus.loading);

  /// A group that is not saved yet.
  const HostSavedGroupState.creating()
    : this(status: HostSavedGroupStatus.ready);

  final HostSavedGroupStatus status;

  /// The saved group; null while creating one.
  final HostSavedAudience? audience;

  /// Who the group holds at its current revision; null while counting.
  final HostSavedAudiencePreview? preview;

  /// The count could not be read.
  final bool previewFailed;

  /// The event a Went to rule names, when the events read has it.
  final String? eventTitle;
  final Object? error;

  HostSavedAudienceDefinition? get definition => audience?.definition;

  /// The group is a hand-picked list, not rules.
  bool get handPicked => definition?.isStatic ?? false;

  /// At least N nights, from the attendance rule.
  int? get atLeast {
    for (final rule in definition?.predicates ?? const []) {
      if (rule case HostSavedAudienceAttendanceCount(
        operator: HostSavedAudienceAttendanceOperator.atLeast,
        :final eventCount,
      )) {
        return eventCount;
      }
    }
    return null;
  }

  /// In the last N days, from the last-seen rule.
  int? get withinDays {
    for (final rule in definition?.predicates ?? const []) {
      if (rule case HostSavedAudienceLastSeenWithinDays(:final days)) {
        return days;
      }
    }
    return null;
  }

  /// The event a Went to rule names.
  String? get attendedEventId {
    for (final rule in definition?.predicates ?? const []) {
      if (rule case HostSavedAudienceAttendedEvent(:final eventId)) {
        return eventId;
      }
    }
    return null;
  }

  /// Rules this screen shows no row for; Save keeps them as they are.
  int get otherRules => (definition?.predicates ?? const []).where((rule) {
    return switch (rule) {
      HostSavedAudienceAttendanceCount(
        operator: HostSavedAudienceAttendanceOperator.atLeast,
      ) ||
      HostSavedAudienceLastSeenWithinDays() ||
      HostSavedAudienceAttendedEvent() => false,
      _ => true,
    };
  }).length;
}
