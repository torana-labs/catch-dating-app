import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

typedef HostEventsManageEventCallback = void Function(Club club, Event event);

enum HostEventsRouteStatus { authRequired, loading, error, empty, loaded }

@immutable
class HostEventsRouteState {
  const HostEventsRouteState({
    required this.status,
    this.uid,
    this.organizers = const <Club>[],
    this.error,
    this.stackTrace,
    this.errorContext = AppErrorContext.club,
  });

  final HostEventsRouteStatus status;
  final String? uid;
  final List<Club> organizers;
  final Object? error;
  final StackTrace? stackTrace;
  final AppErrorContext errorContext;
}

enum HostEventsWorkspaceStatus { loading, error, empty, populated }

enum HostEventsView { upcoming, past }

enum HostEventsGrouping { day, month }

@immutable
class HostEventsWorkspaceState {
  const HostEventsWorkspaceState({
    required this.status,
    this.activeSections = const <HostEventsSection>[],
    this.pastSections = const <HostEventsSection>[],
    this.repeatSource,
    this.hasMoreActive = false,
    this.hasMorePast = false,
    this.loadingMoreActive = false,
    this.loadingMorePast = false,
    this.activeLoadMoreError,
    this.pastError,
    this.pastStackTrace,
    this.error,
    this.stackTrace,
  });

  factory HostEventsWorkspaceState.fromEvents({
    required Iterable<Event> events,
    required DateTime now,
    Iterable<PrivateEventSetupInventoryItem> unpublishedUpcoming =
        const <PrivateEventSetupInventoryItem>[],
    Iterable<PrivateEventSetupInventoryItem> unpublishedHistory =
        const <PrivateEventSetupInventoryItem>[],
    Iterable<Event> cancelledEvents = const <Event>[],
    String? featuredEventId,
    bool hasMoreActive = false,
    bool hasMorePast = false,
    bool loadingMoreActive = false,
    bool loadingMorePast = false,
    Object? activeLoadMoreError,
    Object? pastError,
    StackTrace? pastStackTrace,
  }) {
    final active = events.where((event) => !event.isCancelled).toList();
    final past = active.where((event) => !event.endTime.isAfter(now)).toList()
      ..sort((a, b) => b.endTime.compareTo(a.endTime));
    final repeatSource = past.where(_canRepeatEvent).firstOrNull;
    final currentAndUpcoming = active.where(
      (event) => event.endTime.isAfter(now),
    );
    final upcomingRows =
        <HostEventLifecycleRowData>[
          for (final event in currentAndUpcoming)
            HostEventLifecycleRowData.fromEvent(event: event, now: now),
          for (final setup in unpublishedUpcoming)
            HostEventLifecycleRowData.fromUnpublished(setup: setup, now: now),
        ]..sort((a, b) {
          final aLive = a.event != null && !a.startTime.isAfter(now);
          final bLive = b.event != null && !b.startTime.isAfter(now);
          if (aLive != bLive) return aLive ? -1 : 1;
          return a.startTime.compareTo(b.startTime);
        });
    final visibleActive = featuredEventId == null
        ? upcomingRows
        : upcomingRows.where((row) => row.id != featuredEventId).toList();

    final historyRows = <HostEventLifecycleRowData>[
      for (final event in past)
        HostEventLifecycleRowData.fromEvent(event: event, now: now),
      for (final event in cancelledEvents)
        HostEventLifecycleRowData.fromEvent(event: event, now: now),
      for (final setup in unpublishedHistory)
        HostEventLifecycleRowData.fromUnpublished(setup: setup, now: now),
    ]..sort((a, b) => b.startTime.compareTo(a.startTime));

    final activeSections = _eventSections(
      visibleActive,
      now,
      HostEventsGrouping.day,
    );
    final pastSections = _eventSections(
      historyRows,
      now,
      HostEventsGrouping.month,
    );

    return HostEventsWorkspaceState(
      // The operational spotlight is the richer representation of the
      // featured event, so the timeline remains populated when it has no
      // additional condensed rows.
      status:
          visibleActive.isEmpty &&
              historyRows.isEmpty &&
              !hasMoreActive &&
              !hasMorePast &&
              activeLoadMoreError == null &&
              pastError == null
          ? HostEventsWorkspaceStatus.empty
          : HostEventsWorkspaceStatus.populated,
      activeSections: activeSections,
      pastSections: pastSections,
      repeatSource: repeatSource,
      hasMoreActive: hasMoreActive,
      hasMorePast: hasMorePast,
      loadingMoreActive: loadingMoreActive,
      loadingMorePast: loadingMorePast,
      activeLoadMoreError: activeLoadMoreError,
      pastError: pastError,
      pastStackTrace: pastStackTrace,
    );
  }

  final HostEventsWorkspaceStatus status;
  final List<HostEventsSection> activeSections;
  final List<HostEventsSection> pastSections;
  final Event? repeatSource;
  final bool hasMoreActive;
  final bool hasMorePast;
  final bool loadingMoreActive;
  final bool loadingMorePast;
  final Object? activeLoadMoreError;
  final Object? pastError;
  final StackTrace? pastStackTrace;
  final Object? error;
  final StackTrace? stackTrace;

  bool get canRepeat => repeatSource != null;
  bool get canLoadMoreActive => hasMoreActive && !loadingMoreActive;
  bool get canLoadMorePast => hasMorePast && !loadingMorePast;

  String repeatLabel(AppLocalizations l10n) {
    final event = repeatSource;
    if (event == null) {
      return l10n.hostsHostHomeScreenStateVisiblecopyRepeatLast;
    }
    final label = event.eventFormat.label.trim();
    return label.isEmpty
        ? l10n.hostsHostHomeScreenStateVisiblecopyRepeatLast
        : l10n.hostsHostHomeScreenStateVisiblecopyRepeatLabel(label: label);
  }

  String emptyTitle(AppLocalizations l10n) =>
      l10n.hostsHostHomeScreenStateEmptytitleNoUpcomingEvents;

  String emptyBody(AppLocalizations l10n) =>
      l10n.hostsHostHomeScreenStateEmptybodyCreateYourNextEvent;
}

List<HostEventsSection> _eventSections(
  Iterable<HostEventLifecycleRowData> rows,
  DateTime now,
  HostEventsGrouping grouping,
) {
  final sections = <String, List<HostEventLifecycleRowData>>{};
  for (final row in rows) {
    final date = row.sectionDate;
    final key = grouping == HostEventsGrouping.day
        ? '${date.year}-${date.month}-${date.day}'
        : '${date.year}-${date.month}';
    sections.putIfAbsent(key, () => <HostEventLifecycleRowData>[]).add(row);
  }
  return List<HostEventsSection>.unmodifiable([
    for (final entry in sections.entries)
      HostEventsSection(
        key: entry.key,
        date: entry.value.first.sectionDate,
        grouping: grouping,
        isToday: DateUtils.isSameDay(entry.value.first.sectionDate, now),
        includeYear: entry.value.first.sectionDate.year != now.year,
        rows: List<HostEventLifecycleRowData>.unmodifiable(entry.value),
      ),
  ]);
}

@immutable
class HostEventsSection {
  const HostEventsSection({
    required this.key,
    required this.date,
    required this.grouping,
    required this.isToday,
    required this.includeYear,
    required this.rows,
  });

  final String key;
  final DateTime date;
  final HostEventsGrouping grouping;
  final bool isToday;
  final bool includeYear;
  final List<HostEventLifecycleRowData> rows;

  String label(AppLocalizations l10n) {
    if (grouping == HostEventsGrouping.month) {
      return DateFormat.yMMMM(l10n.localeName).format(date);
    }
    final dateLabel = DateFormat(
      includeYear ? 'EEE, d MMM y' : 'EEE, d MMM',
      l10n.localeName,
    ).format(date);
    return isToday ? l10n.hostEventsTodayDate(date: dateLabel) : dateLabel;
  }
}

/// One timeline row — either a published event (rich `Event` document) or
/// an organizer-only event still in setup (`publicationState: 'private'`,
/// projected through the light inventory reader). Private and published
/// share the `events` collection and one list; publication is a state on
/// the event, not a separate event kind.
@immutable
class HostEventLifecycleRowData {
  const HostEventLifecycleRowData._({
    required this.isToday,
    required this.isLive,
    required this.isPast,
    this.event,
    this.unpublished,
  });

  factory HostEventLifecycleRowData.fromEvent({
    required Event event,
    required DateTime now,
  }) {
    return HostEventLifecycleRowData._(
      event: event,
      isToday: DateUtils.isSameDay(event.startTime, now),
      isLive: !event.startTime.isAfter(now) && event.endTime.isAfter(now),
      isPast: !event.endTime.isAfter(now),
    );
  }

  factory HostEventLifecycleRowData.fromUnpublished({
    required PrivateEventSetupInventoryItem setup,
    required DateTime now,
  }) {
    final sectionDate = DateTime.tryParse(setup.localDate);
    return HostEventLifecycleRowData._(
      unpublished: setup,
      isToday: sectionDate != null && DateUtils.isSameDay(sectionDate, now),
      isLive: false,
      isPast:
          setup.status == 'cancelled' ||
          !DateTime.fromMillisecondsSinceEpoch(
            setup.startTimeMillis,
          ).isAfter(now),
    );
  }

  final Event? event;
  final PrivateEventSetupInventoryItem? unpublished;
  final bool isToday;
  final bool isLive;
  final bool isPast;

  String get id => event?.id ?? unpublished!.eventId;
  bool get isUnpublished => unpublished != null;
  bool get isCancelled =>
      event?.isCancelled ?? unpublished?.status == 'cancelled';

  /// The instant used for ordering rows inside a scope.
  DateTime get startTime =>
      event?.startTime ??
      DateTime.fromMillisecondsSinceEpoch(unpublished!.startTimeMillis);

  /// The event-local day used for section grouping. Unpublished rows carry
  /// the authored local date; decoding the instant would group by the
  /// viewer's timezone instead of the event's.
  DateTime get sectionDate {
    final setup = unpublished;
    if (setup == null) return event!.startTime;
    return DateTime.tryParse(setup.localDate) ?? startTime;
  }

  String get title => event?.title ?? unpublished!.name;

  List<String> facts(AppLocalizations l10n, {required String time}) {
    final setup = unpublished;
    if (setup != null) {
      final city = defaultCityOptions
          .where(
            (option) =>
                option.effectiveCityId == setup.city.cityId &&
                option.effectiveMarketId == setup.city.marketId,
          )
          .firstOrNull;
      final schedule = '$time · ${city?.label ?? setup.city.cityId}';
      return [
        if (isPast)
          '${DateFormat.MMMEd(l10n.localeName).format(sectionDate)} · $schedule'
        else
          schedule,
        isCancelled
            ? l10n.hostEventsRowCancelled
            : setup.detailsConfigured
            ? l10n.hostEventsRowUnpublished
            : l10n.hostEventsRowSetupPending,
      ];
    }
    final event = this.event!;
    final dateTime = isPast
        ? '${DateFormat.MMMEd(l10n.localeName).format(event.startTime)} · $time'
        : time;
    final location = event.locationName.trim();
    final schedule = location.isEmpty ? dateTime : '$dateTime · $location';
    return [
      isLive ? l10n.hostEventsLiveSchedule(schedule: schedule) : schedule,
      if (isCancelled)
        l10n.hostEventsRowCancelled
      else if (isPast)
        l10n.hostEventsAttended(count: event.attendedCount)
      else if (event.capacityLimit > 0)
        l10n.hostEventsRegisteredCapacity(
          count: event.signedUpCount,
          capacity: event.capacityLimit,
        )
      else
        l10n.hostEventsRegistered(count: event.signedUpCount),
    ];
  }
}

bool _canRepeatEvent(Event event) => CreateEventPrefill.canRepeat(event);
