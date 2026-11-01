// architecture: provider-free
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';

HostTodayRouteState buildHostTodayRouteState({
  required CatchAsyncState<String?> uid,
  CatchAsyncState<List<Organizer>>? organizers,
}) {
  if (uid.hasError) {
    return HostTodayRouteState(
      status: HostTodayRouteStatus.error,
      error: uid.error,
      stackTrace: uid.stackTrace,
      errorContext: AppErrorContext.auth,
    );
  }

  final currentUid = uid.value;
  if (currentUid == null) {
    return uid.isLoading
        ? const HostTodayRouteState(status: HostTodayRouteStatus.loading)
        : const HostTodayRouteState(status: HostTodayRouteStatus.authRequired);
  }

  final organizerValue = organizers;
  if (organizerValue == null || organizerValue.isLoading) {
    return HostTodayRouteState(
      status: HostTodayRouteStatus.loading,
      uid: currentUid,
    );
  }
  if (organizerValue.hasError) {
    return HostTodayRouteState(
      status: HostTodayRouteStatus.error,
      uid: currentUid,
      error: organizerValue.error,
      stackTrace: organizerValue.stackTrace,
    );
  }

  final resolved = List<Organizer>.unmodifiable(
    organizerValue.value ?? const <Organizer>[],
  );
  return HostTodayRouteState(
    status: resolved.isEmpty
        ? HostTodayRouteStatus.empty
        : HostTodayRouteStatus.loaded,
    uid: currentUid,
    organizers: resolved,
  );
}

HostTodayState buildHostTodayState(
  CatchAsyncState<HostTodayFeedData> feed, {
  required DateTime now,
  required AppLocalizations l10n,
}) {
  if (feed.hasError) {
    return HostTodayState(
      status: HostTodayStatus.error,
      error: feed.error,
      stackTrace: feed.stackTrace,
    );
  }
  if (feed.isLoading) {
    return const HostTodayState(status: HostTodayStatus.loading);
  }

  final data = feed.value;
  final activeEvents =
      (data?.activeEvents ?? const <Event>[])
          .where((event) => !event.isCancelled && event.endTime.isAfter(now))
          .toList()
        ..sort((a, b) {
          final aIsLive = !a.startTime.isAfter(now) && a.endTime.isAfter(now);
          final bIsLive = !b.startTime.isAfter(now) && b.endTime.isAfter(now);
          if (aIsLive != bIsLive) return aIsLive ? -1 : 1;
          return a.startTime.compareTo(b.startTime);
        });
  final featuredEvent = activeEvents.firstOrNull;
  final attentionItems = (data?.attentionItems ?? const [])
      .map((item) => HostTodayAttentionData.fromItem(item, l10n))
      .toList(growable: false);
  final attentionIssues =
      data?.attentionIssues ?? const <HostTodayAttentionIssue>[];
  if (featuredEvent == null &&
      attentionItems.isEmpty &&
      attentionIssues.isEmpty &&
      data?.historyError == null) {
    if (data?.hasPendingSources ?? false) {
      return const HostTodayState(status: HostTodayStatus.loading);
    }
    return HostTodayState(
      status: HostTodayStatus.empty,
      hasPastEvents: data?.hasPastEvents ?? false,
    );
  }

  final laterEvents = activeEvents
      .skip(1)
      .where(
        (event) =>
            !event.startTime.isAfter(now.add(hostTodayOperationsHorizon)),
      )
      .take(3)
      .map((event) => HostTodayEventRowData.fromEvent(event: event, now: now))
      .toList(growable: false);

  return HostTodayState(
    status: HostTodayStatus.content,
    featuredEvent: featuredEvent,
    attentionItems: List<HostTodayAttentionData>.unmodifiable(attentionItems),
    attentionIssues: List<HostTodayAttentionIssue>.unmodifiable(
      attentionIssues,
    ),
    attentionCountIsComplete:
        data != null &&
        !data.attentionPending &&
        !data.attendancePending &&
        data.attentionIssues.isEmpty &&
        data.localAttendanceMerged &&
        data.attentionCoverage.map((c) => c.kind).toSet().length ==
            HostAttentionKind.values.length &&
        data.attentionCoverage.every(
          (c) =>
              c.state == HostAttentionCoverageState.complete ||
              (c.state == HostAttentionCoverageState.clientMergeRequired &&
                  c.kind == HostAttentionKind.attendanceSync),
        ),
    laterEvents: List<HostTodayEventRowData>.unmodifiable(laterEvents),
    hasPastEvents: data?.hasPastEvents ?? false,
    hasPendingSources: data?.hasPendingSources ?? false,
    historyError: data?.historyError,
    historyStackTrace: data?.historyStackTrace,
  );
}
