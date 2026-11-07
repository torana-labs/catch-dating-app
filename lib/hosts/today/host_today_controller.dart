import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_today_controller.g.dart';

/// Which organizer Today is for, who is looking, and the minute it is.
@immutable
class HostTodayRequest {
  HostTodayRequest({
    required this.organizerId,
    required this.accountId,
    required DateTime now,
    this.cityName,
  }) : now = DateTime(now.year, now.month, now.day, now.hour, now.minute);

  final String organizerId;
  final String accountId;

  /// The screen's clock, to the minute: it moves events between upcoming,
  /// live and over without a new read.
  final DateTime now;

  /// The organizer's city: the report's fallback timezone and its currency.
  final String? cityName;

  ActiveOrganizerEventsQuery get eventsQuery =>
      ActiveOrganizerEventsQuery(organizerId: organizerId, day: now);

  @override
  bool operator ==(Object other) =>
      other is HostTodayRequest &&
      other.organizerId == organizerId &&
      other.accountId == accountId &&
      other.now == now &&
      other.cityName == cityName;

  @override
  int get hashCode => Object.hash(organizerId, accountId, now, cityName);
}

/// Device-local attendance writes still waiting to reach the server, read
/// once each time Today opens.
@riverpod
Future<HostAttendanceOutboxSummary> hostTodayAttendanceOutbox(
  Ref ref,
  String accountId,
) => ref
    .read(hostAttendanceOutboxProvider)
    .loadAll(accountId: accountId, now: ref.read(appClockProvider).now());

/// Today, composed from its read owners: the organizer's events, the
/// attention queue and the roster of the featured event are listeners, the
/// thirty-day report is the cached host-reports read, and the local
/// attendance outbox joins the attention queue. Nothing here invalidates a
/// read after a write.
@riverpod
HostTodayState hostTodayController(Ref ref, HostTodayRequest request) {
  final now = request.now;
  final eventsValue = ref.watch(
    watchActiveEventsForOrganizerProvider(request.eventsQuery),
  );
  final events = eventsValue.value;
  if (events == null) {
    return switch (eventsValue) {
      AsyncValue(:final error?, :final stackTrace) => HostTodayState(
        status: HostTodayStatus.error,
        error: error,
        stackTrace: stackTrace,
      ),
      _ => const HostTodayState.loading(),
    };
  }

  final active =
      events
          .where((event) => !event.isCancelled && event.endTime.isAfter(now))
          .toList()
        ..sort((a, b) {
          final aLive = _isLive(a, now);
          if (aLive != _isLive(b, now)) return aLive ? -1 : 1;
          return a.startTime.compareTo(b.startTime);
        });
  final weekEnd = now.add(hostTodayOperationsHorizon);
  final featured = active
      .where((event) => !event.startTime.isAfter(weekEnd))
      .firstOrNull;
  final stats = _stats(ref, request);

  return HostTodayState(
    status: featured == null ? HostTodayStatus.empty : HostTodayStatus.content,
    tonight: featured == null ? null : _tonight(ref, featured, now),
    needsYou: _needsYou(ref, request, active, featured),
    thisWeek: List<Event>.unmodifiable(
      active.where(
        (event) =>
            !identical(event, featured) && !event.startTime.isAfter(weekEnd),
      ),
    ),
    lastThirtyDays: stats ?? const <HostTodayStat>[],
    statsPending: stats == null,
  );
}

/// Starts again the reads behind what failed: the events listener for a
/// screen error, the attention listener when it ended in an error, and the
/// outbox read. A healthy listener is left alone.
void retryHostTodayReads(WidgetRef ref, HostTodayRequest request) {
  ref.invalidate(watchActiveEventsForOrganizerProvider(request.eventsQuery));
  if (ref.read(hostAttentionProjectionProvider(request.organizerId)).hasError) {
    ref.invalidate(hostAttentionProjectionProvider(request.organizerId));
  }
  ref.invalidate(hostTodayAttendanceOutboxProvider(request.accountId));
}

bool _isLive(Event event, DateTime now) =>
    !event.startTime.isAfter(now) && event.endTime.isAfter(now);

HostTodayTonight _tonight(Ref ref, Event event, DateTime now) {
  final roster = ref.watch(hostEventRosterInsightsProvider(event.id)).value;
  final attendees = ref.watch(watchEventAttendeesProvider(event.id)).value;
  return HostTodayTonight(
    event: event,
    isLive: _isLive(event, now),
    newFaces:
        roster == null ||
            roster.sourceCoverage == HostRosterInsightCoverage.missing
        ? null
        : roster.rows
              .where(
                (row) =>
                    row.signals.contains(HostRosterInsightSignal.firstTime),
              )
              .length,
    people: [
      for (final attendee in (attendees ?? const []).take(3))
        attendee.displayName,
    ],
  );
}

HostTodayNeedsYou _needsYou(
  Ref ref,
  HostTodayRequest request,
  List<Event> active,
  Event? featured,
) {
  final attention = catchAsyncStateFromAsyncValue(
    ref.watch(hostAttentionProjectionProvider(request.organizerId)),
  );
  final outbox = catchAsyncStateFromAsyncValue(
    ref.watch(hostTodayAttendanceOutboxProvider(request.accountId)),
  );
  final projection = attention.value;
  // Rebuild from the original sources, never from an already merged list.
  final items = <HostAttentionItem>[
    ...?projection?.items,
    if (outbox.value case final summary?)
      ..._attendanceItems(
        summary,
        activeEvents: active,
        accountId: request.accountId,
        now: request.now,
      ),
  ]..sort(compareHostAttentionItems);
  final doors = featured?.startTime;
  return HostTodayNeedsYou(
    items: List<HostAttentionItem>.unmodifiable(items),
    dueBeforeDoors: doors == null || !doors.isAfter(request.now)
        ? 0
        : items.where((item) => item.dueAt.isBefore(doors)).length,
    checking: projection == null || !projection.isComplete || outbox.isLoading,
    failed: (attention.hasError && projection == null) || outbox.hasError,
  );
}

/// The thirty-day report as stats, or null while it is first read. A failed
/// read gives no stats rather than an error, since the rest of Today stands.
List<HostTodayStat>? _stats(Ref ref, HostTodayRequest request) {
  final session = ref.watch(authenticatedSessionProvider).value;
  if (session == null) return null;
  final timezone =
      ref.watch(hostAnalyticsDeviceTimezoneProvider).value ??
      marketForCityName(request.cityName).timeZone;
  final report = catchAsyncStateFromAsyncValue(
    ref.watch(
      hostAnalyticsProvider(
        HostAnalyticsRead(
          session,
          HostAnalyticsQuery(
            organizerId: request.organizerId,
            granularity: HostAnalyticsGranularity.week,
            timezone: timezone,
          ),
        ),
      ),
    ),
  );
  final cards = report.value?.data.summaryCards;
  if (cards == null) {
    return report.hasError ? const <HostTodayStat>[] : null;
  }
  HostTodayStat? stat(
    String id,
    HostTodayStatKind kind, {
    String? currencyCode,
  }) {
    final card = cards.where((card) => card.id == id).firstOrNull;
    if (card == null || card.status == HostAnalyticsMetricStatus.missing) {
      return null;
    }
    return HostTodayStat(
      kind: kind,
      value: card.value,
      previousValue: card.previousValue,
      currencyCode: currencyCode,
    );
  }

  return List<HostTodayStat>.unmodifiable([
    ?stat(HostAnalyticsMetricIds.bookings, HostTodayStatKind.bookings),
    ?stat(
      HostAnalyticsMetricIds.revenue,
      HostTodayStatKind.ticketSales,
      currencyCode: currencyCodeForCityName(request.cityName),
    ),
  ]);
}

/// Device-local attendance writes as attention items: a write that needs a
/// look is due now, any other is due once its review time passes.
Iterable<HostAttentionItem> _attendanceItems(
  HostAttendanceOutboxSummary outbox, {
  required List<Event> activeEvents,
  required String accountId,
  required DateTime now,
}) sync* {
  final eventsById = <String, Event>{
    for (final event in activeEvents) event.id: event,
  };
  for (final entry in outbox.entries) {
    final needsReview = entry.status == HostAttendanceOutboxStatus.needsReview;
    final reviewAt = entry.createdAt.add(HostAttendanceOutbox.reviewAfter);
    yield HostAttentionItem(
      id: 'local-attendance-${entry.clientOperationId}',
      kind: HostAttentionKind.attendanceSync,
      scope: HostAttentionScope.event,
      sourceOwner: HostAttentionSourceOwner.hostAttendanceOutbox,
      sourceId: entry.clientOperationId,
      sourceRevision: [
        entry.expectedRevision,
        entry.desiredCheckedIn,
        entry.status.name,
        entry.lastErrorCode ?? '',
      ].join(':'),
      eventId: entry.eventId,
      status: HostAttentionStatus.open,
      consequence: HostAttentionConsequence.requiresReconciliation,
      blocking: false,
      urgency: needsReview
          ? HostAttentionUrgency.immediate
          : HostAttentionUrgency.upcoming,
      destination: HostAttentionDestination(
        route: HostAttentionDestinationRoute.hostEventManage,
        section: 'guests',
        eventId: entry.eventId,
      ),
      context: HostAttentionContext(
        eventName: eventsById[entry.eventId]?.title,
        count: 1,
        errorCode: entry.lastErrorCode,
      ),
      dedupeKey: 'attendanceSync:${entry.clientOperationId}',
      policyVersion: hostAttentionPolicyVersion,
      resolutionVersion: 1,
      assignedHostUid: accountId,
      openedAt: entry.createdAt,
      dueAt: needsReview ? now : reviewAt,
      // Local observations remain actionable until replayed or dismissed.
      expiresAt: null,
    );
  }
}
