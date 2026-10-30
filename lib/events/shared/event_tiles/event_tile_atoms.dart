import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

String eventTileKickerLabel(
  EventTileData data, {
  required bool showOrganizerName,
}) {
  final organizerName = data.organizerName?.trim();
  if (showOrganizerName && organizerName != null && organizerName.isNotEmpty) {
    return organizerName;
  }
  final meetingPoint = data.meetingPoint.trim();
  if (meetingPoint.isNotEmpty) return meetingPoint;
  if (organizerName != null && organizerName.isNotEmpty) return organizerName;
  return data.title;
}

String? eventTileSupportingLabel(
  EventTileData data, {
  required bool showOrganizerName,
}) {
  final activity = data.activitySummaryLabel.trim();
  final meetingPoint = data.meetingPoint.trim();
  if (showOrganizerName && meetingPoint.isNotEmpty) {
    return _joinEventTileLabels([activity, meetingPoint]);
  }
  if (activity.isNotEmpty && activity != data.title.trim()) return activity;
  return null;
}

String eventTileStatusLabel(EventTileStatus status, AppLocalizations l10n) {
  return switch (status) {
    EventTileStatus.open => l10n.eventsTileStatusOpen,
    EventTileStatus.joined => l10n.eventsTileStatusJoined,
    EventTileStatus.saved => l10n.eventsTileStatusSaved,
    EventTileStatus.recommended => l10n.eventsTileStatusRecommended,
    EventTileStatus.hosted => l10n.eventsTileStatusHosted,
    EventTileStatus.waitlisted => l10n.eventsTileStatusWaitlisted,
    EventTileStatus.attended => l10n.eventsTileStatusAttended,
    EventTileStatus.past => l10n.eventsTileStatusPast,
    EventTileStatus.full => l10n.eventsTileStatusFull,
    EventTileStatus.ineligible => l10n.eventsTileStatusIneligible,
    EventTileStatus.cancelled => l10n.eventsTileStatusCancelled,
  };
}

EventTileStatus eventTileStatusForBadge(String? badgeLabel) {
  return switch (badgeLabel?.toUpperCase()) {
    'JOINED' => EventTileStatus.joined,
    'SAVED' => EventTileStatus.saved,
    'PAST' => EventTileStatus.past,
    'WAITLISTED' => EventTileStatus.waitlisted,
    'ATTENDED' => EventTileStatus.attended,
    'HOSTED' => EventTileStatus.hosted,
    'FULL' => EventTileStatus.full,
    _ => EventTileStatus.open,
  };
}

String? eventTileCardStatusLabel(
  EventTileStatus status,
  AppLocalizations l10n, {
  String? label,
}) {
  final explicit = label?.trim();
  if (explicit != null && explicit.isNotEmpty) {
    if (explicit.toUpperCase() == _eventTileViewBadge) return null;
    return explicit;
  }
  if (status == EventTileStatus.open) return null;
  return eventTileStatusLabel(status, l10n);
}

const _eventTileViewBadge = 'VIEW';

CatchBadgeTone eventTileStatusTone(EventTileStatus status) {
  return switch (status) {
    EventTileStatus.open => CatchBadgeTone.neutral,
    EventTileStatus.joined => CatchBadgeTone.success,
    EventTileStatus.saved => CatchBadgeTone.brand,
    EventTileStatus.recommended => CatchBadgeTone.brand,
    EventTileStatus.hosted => CatchBadgeTone.brand,
    EventTileStatus.waitlisted => CatchBadgeTone.warning,
    EventTileStatus.attended => CatchBadgeTone.success,
    EventTileStatus.past => CatchBadgeTone.neutral,
    EventTileStatus.full => CatchBadgeTone.warning,
    EventTileStatus.ineligible => CatchBadgeTone.danger,
    EventTileStatus.cancelled => CatchBadgeTone.danger,
  };
}

Map<DateTime, List<T>> groupEventDateRailItems<T>(
  Iterable<T> items, {
  required DateTime Function(T item) startTimeOf,
  bool preserveInputOrder = false,
}) {
  final sorted = preserveInputOrder
      ? items.toList(growable: false)
      : (items.toList(growable: false)
          ..sort((a, b) => startTimeOf(a).compareTo(startTimeOf(b))));
  final grouped = <DateTime, List<T>>{};
  for (final item in sorted) {
    final day = DateUtils.dateOnly(startTimeOf(item));
    grouped.putIfAbsent(day, () => <T>[]).add(item);
  }
  return grouped;
}

String eventDateRailDayLabel(DateTime date, DateTime today) {
  if (DateUtils.isSameDay(date, today)) return 'Today';
  return '${EventFormatters.shortWeekday(date)} · ${date.day} ${EventFormatters.shortMonth(date)}';
}

IconData? eventTileStatusIcon(EventTileStatus status) {
  return switch (status) {
    EventTileStatus.joined => CatchIcons.check,
    EventTileStatus.saved => CatchIcons.bookmark,
    EventTileStatus.recommended => CatchIcons.magic,
    EventTileStatus.hosted => CatchIcons.admin,
    EventTileStatus.waitlisted => CatchIcons.time,
    EventTileStatus.attended => CatchIcons.activity,
    EventTileStatus.full => CatchIcons.personRemoved,
    EventTileStatus.ineligible => CatchIcons.block,
    EventTileStatus.cancelled => CatchIcons.close,
    EventTileStatus.open || EventTileStatus.past => null,
  };
}

String _joinEventTileLabels(Iterable<String> labels) {
  return labels
      .map((label) => label.trim())
      .where((label) => label.isNotEmpty)
      .join(' · ');
}
