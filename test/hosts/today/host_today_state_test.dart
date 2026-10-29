import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_view_model.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../clubs/clubs_test_helpers.dart' show buildClub, buildEvent;

final _l10n = AppLocalizationsEn();

void main() {
  test('Today route state exhaustively maps auth and organizer branches', () {
    final authError = StateError('auth failed');
    final organizerError = StateError('organizers failed');

    expect(
      buildHostTodayRouteState(
        uid: const CatchAsyncState<String?>.loading(),
      ).status,
      HostTodayRouteStatus.loading,
    );
    expect(
      buildHostTodayRouteState(
        uid: const CatchAsyncState<String?>.data(null),
      ).status,
      HostTodayRouteStatus.authRequired,
    );
    final failedAuth = buildHostTodayRouteState(
      uid: CatchAsyncState<String?>.error(authError, StackTrace.current),
    );
    expect(failedAuth.status, HostTodayRouteStatus.error);
    expect(failedAuth.errorContext, AppErrorContext.auth);

    expect(
      buildHostTodayRouteState(
        uid: const CatchAsyncState<String?>.data('host-1'),
        organizers: const CatchAsyncState.loading(),
      ).status,
      HostTodayRouteStatus.loading,
    );
    final failedOrganizers = buildHostTodayRouteState(
      uid: const CatchAsyncState<String?>.data('host-1'),
      organizers: CatchAsyncState.error(organizerError, StackTrace.current),
    );
    expect(failedOrganizers.status, HostTodayRouteStatus.error);
    expect(failedOrganizers.errorContext, AppErrorContext.club);
    expect(
      buildHostTodayRouteState(
        uid: const CatchAsyncState<String?>.data('host-1'),
        organizers: const CatchAsyncState.data([]),
      ).status,
      HostTodayRouteStatus.empty,
    );
    final loaded = buildHostTodayRouteState(
      uid: const CatchAsyncState<String?>.data('host-1'),
      organizers: CatchAsyncState.data([buildClub()]),
    );
    expect(loaded.status, HostTodayRouteStatus.loaded);
    expect(loaded.organizers.single.id, 'club-1');
  });

  test('Today prioritizes live work and maps the projected queue', () {
    final now = DateTime(2026, 6, 15, 12);
    final live = buildEvent(
      id: 'live',
      startTime: DateTime(2026, 6, 15, 10),
      endTime: DateTime(2026, 6, 15, 14),
    );
    final next = buildEvent(
      id: 'next',
      startTime: DateTime(2026, 6, 15, 17),
      waitlistedCount: 6,
    );
    final later = buildEvent(
      id: 'later',
      startTime: DateTime(2026, 6, 16, 20),
      waitlistedCount: 2,
    );
    final outsideHorizon = buildEvent(
      id: 'outside-horizon',
      startTime: DateTime(2026, 6, 23, 13),
    );

    final state = buildHostTodayState(
      CatchAsyncState<HostTodayFeedData>.data(
        HostTodayFeedData(
          activeEvents: [outsideHorizon, later, next, live],
          pastEvents: const [],
          attentionItems: [
            _attentionItem(
              now,
              eventId: next.id,
              eventName: next.title,
              count: 6,
            ),
            _attentionItem(
              now,
              eventId: later.id,
              eventName: later.title,
              count: 2,
              urgency: HostAttentionUrgency.soon,
            ),
          ],
        ),
      ),
      now: now,
      l10n: _l10n,
    );

    expect(state.status, HostTodayStatus.content);
    expect(state.featuredEvent, live);
    expect(state.laterEvents.map((row) => row.event.id), ['next', 'later']);
    expect(state.attentionItems.map((data) => data.item.eventId), [
      'next',
      'later',
    ]);
    expect(state.attentionItems.first.title, 'Review waitlist');
    expect(
      state.attentionItems.first.item.destination.route,
      HostAttentionDestinationRoute.hostEventManage,
    );
    expect(state.attentionItems.map((data) => data.item.urgency), [
      HostAttentionUrgency.immediate,
      HostAttentionUrgency.soon,
    ]);
  });

  test('Today keeps non-event attention visible without a spotlight', () {
    final now = DateTime(2026, 6, 15, 12);
    final application = _attentionItem(
      now,
      kind: HostAttentionKind.applicationReview,
      scope: HostAttentionScope.application,
      sourceOwner: HostAttentionSourceOwner.organizerApplications,
      eventId: null,
      subjectLabel: 'Asha Singh',
      route: HostAttentionDestinationRoute.hostApplications,
      applicationId: 'application-1',
    );

    final state = buildHostTodayState(
      CatchAsyncState<HostTodayFeedData>.data(
        HostTodayFeedData(
          activeEvents: const [],
          pastEvents: const [],
          attentionItems: [application],
        ),
      ),
      now: now,
      l10n: _l10n,
    );

    expect(state.status, HostTodayStatus.content);
    expect(state.featuredEvent, isNull);
    expect(state.attentionItems.single.title, 'Review application');
    expect(
      state.attentionItems.single.body,
      'Asha Singh is waiting for a decision.',
    );
  });

  test('Today has display copy for every deliverable attention kind', () {
    final now = DateTime(2026, 6, 15, 12);
    final kinds = [
      HostAttentionKind.eventLiveOperations,
      HostAttentionKind.eventAssistanceCaseReview,
      HostAttentionKind.eventAssistanceDeliveryReview,
      HostAttentionKind.eventWaitlistReview,
      HostAttentionKind.eventJoinRequestReview,
      HostAttentionKind.applicationReview,
      HostAttentionKind.providerSyncFailure,
      HostAttentionKind.formAutomationFailure,
      HostAttentionKind.payoutSetup,
      HostAttentionKind.attendanceSync,
    ];

    final data = [
      for (final kind in kinds)
        HostTodayAttentionData.fromItem(
          _attentionItem(
            now,
            kind: kind,
            eventId: 'event-1',
            eventName: 'Sunday Run',
            subjectLabel: 'Asha Singh',
            count: 3,
            provider: 'razorpay',
          ),
          _l10n,
        ),
    ];

    expect(data.map((item) => item.title).toSet(), hasLength(kinds.length));
    expect(data.every((item) => item.body.isNotEmpty), isTrue);
    expect(data.every((item) => item.primaryActionLabel.isNotEmpty), isTrue);
  });

  test('Today preserves partial attention failures beside event content', () {
    final now = DateTime(2026, 6, 15, 12);
    final event = buildEvent(startTime: now.add(const Duration(hours: 4)));
    final error = StateError('attention failed');
    final issue = HostTodayAttentionIssue(
      source: HostTodayAttentionIssueSource.serverProjection,
      error: error,
      stackTrace: StackTrace.current,
    );

    final state = buildHostTodayState(
      CatchAsyncState<HostTodayFeedData>.data(
        HostTodayFeedData(
          activeEvents: [event],
          pastEvents: const [],
          attentionIssues: [issue],
        ),
      ),
      now: now,
      l10n: _l10n,
    );

    expect(state.status, HostTodayStatus.content);
    expect(state.featuredEvent, event);
    expect(state.attentionItems, isEmpty);
    expect(state.attentionIssues.single.error, error);
  });

  test('Today maps loading, error, and empty history context', () {
    final now = DateTime(2026, 6, 15, 12);
    final error = StateError('today failed');
    final stackTrace = StackTrace.current;

    expect(
      buildHostTodayState(
        const CatchAsyncState<HostTodayFeedData>.loading(),
        now: now,
        l10n: _l10n,
      ).status,
      HostTodayStatus.loading,
    );
    final errorState = buildHostTodayState(
      CatchAsyncState<HostTodayFeedData>.error(error, stackTrace),
      now: now,
      l10n: _l10n,
    );
    expect(errorState.status, HostTodayStatus.error);
    expect(errorState.error, error);

    final emptyState = buildHostTodayState(
      CatchAsyncState<HostTodayFeedData>.data(
        HostTodayFeedData(
          activeEvents: const [],
          pastEvents: [
            buildEvent(
              id: 'past',
              startTime: DateTime(2026, 6, 14, 9),
              endTime: DateTime(2026, 6, 14, 10),
            ),
          ],
        ),
      ),
      now: now,
      l10n: _l10n,
    );
    expect(emptyState.status, HostTodayStatus.empty);
    expect(emptyState.hasPastEvents, isTrue);
  });
}

HostAttentionItem _attentionItem(
  DateTime now, {
  HostAttentionKind kind = HostAttentionKind.eventWaitlistReview,
  HostAttentionScope scope = HostAttentionScope.event,
  HostAttentionSourceOwner sourceOwner = HostAttentionSourceOwner.events,
  required String? eventId,
  String? eventName,
  String? subjectLabel,
  int? count,
  String? provider,
  HostAttentionUrgency urgency = HostAttentionUrgency.immediate,
  HostAttentionDestinationRoute route =
      HostAttentionDestinationRoute.hostEventManage,
  String? applicationId,
}) => HostAttentionItem(
  id: 'attention-${kind.name}-$eventId',
  kind: kind,
  scope: scope,
  sourceOwner: sourceOwner,
  sourceId: eventId ?? applicationId ?? 'source-1',
  sourceRevision: 'revision-1',
  eventId: eventId,
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.delaysResponse,
  blocking: false,
  urgency: urgency,
  destination: HostAttentionDestination(
    route: route,
    section: route == HostAttentionDestinationRoute.hostEventManage
        ? 'guests'
        : null,
    eventId: eventId,
    applicationId: applicationId,
  ),
  context: HostAttentionContext(
    eventName: eventName,
    subjectLabel: subjectLabel,
    count: count,
    provider: provider,
  ),
  dedupeKey: '${kind.name}:${eventId ?? applicationId}',
  policyVersion: 1,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: now,
  dueAt: now,
  expiresAt: null,
);
