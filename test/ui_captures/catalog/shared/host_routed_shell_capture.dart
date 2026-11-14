// Capture fi// Capture fi// Capture fixtur// Capture fixtures sh// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/routing/shell/host_shell_screen.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_platform/schema_contracts/generated/host_attention_policies.g.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'
    show AsyncData, AsyncError, AsyncLoading, AsyncValue;
import 'package:go_router/go_router.dart';

class HostRoutedShellCapture extends StatefulWidget {
  const HostRoutedShellCapture({
    super.key,
    required this.initialLocation,
    required this.activeIndex,
    required this.child,
  });

  final String initialLocation;

  /// Which index route shows [child]: 0 Today, 1 Events, 2 Audience and
  /// 3 Inbox (both under People), 4 Organizer.
  final int activeIndex;
  final Widget child;

  @override
  State<HostRoutedShellCapture> createState() => HostRoutedShellCaptureState();
}

class HostRoutedShellCaptureState extends State<HostRoutedShellCapture> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(AppRole.host);
    _router = GoRouter(
      initialLocation: widget.initialLocation,
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) =>
              HostShellScreen(navigationShell: navigationShell),
          branches: [
            _branch([('/host/today', 0)]),
            _branch([('/host/events', 1)]),
            _branch([('/host/audience', 2), ('/host/inbox', 3)]),
            _branch([('/host/organizer', 4)]),
          ],
        ),
      ],
    );
  }

  StatefulShellBranch _branch(List<(String, int)> indexes) {
    return StatefulShellBranch(
      routes: [
        for (final (path, index) in indexes)
          GoRoute(
            path: path,
            builder: (context, state) => index == widget.activeIndex
                ? widget.child
                : const SizedBox.shrink(),
          ),
      ],
    );
  }

  @override
  void dispose() {
    _router.dispose();
    AppConfig.resetEntrypointRoleOverrideForTesting();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(AppRole.host);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: Theme.of(context),
      routerConfig: _router,
      builder: (context, child) =>
          CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
    );
  }
}

List<Object> hostOperationsProviderOverrides({
  List<OrganizerProgramListRow> programRows = const [],
  List<Organizer>? hostedOrganizers,
  List<Organizer>? ownedOrganizers,
  AsyncValue<HostProfile?>? hostProfile,
  AsyncValue<List<Organizer>>? hostedOrganizersAsync,
  AsyncValue<List<Organizer>>? ownedOrganizersAsync,
  Map<String, AsyncValue<List<Event>>> organizerEvents = const {},
  AsyncValue<HostPaymentAccount?>? paymentAccountValue,
  HostAnalyticsRepository analyticsRepository =
      const HostFixtureAnalyticsRepository(),
  Map<String, List<HostAttentionItem>>? attentionByOrganizer,
}) {
  final uid = HostOperationsFixtures.hostUid;
  final hosted = hostedOrganizers ?? HostOperationsFixtures.organizers;
  final owned =
      ownedOrganizers ??
      [
        HostOperationsFixtures.primaryOrganizer,
        HostOperationsFixtures.dinnerOrganizer,
      ];
  final eventOrganizerIds = <String>{
    for (final organizer in HostOperationsFixtures.organizers) organizer.id,
    for (final organizer in hosted) organizer.id,
    for (final organizer in owned) organizer.id,
    ...organizerEvents.keys,
  };
  final organizersById = <String, Organizer>{
    for (final organizer in HostOperationsFixtures.organizers)
      organizer.id: organizer,
    for (final organizer in hosted) organizer.id: organizer,
    for (final organizer in owned) organizer.id: organizer,
  };
  final timelineEventsByOrganizer = <String, List<Event>>{
    for (final organizerId in eventOrganizerIds)
      organizerId: switch (organizerEvents[organizerId]) {
        AsyncData<List<Event>>(:final value) => value,
        _ =>
          HostOperationsFixtures.eventsByOrganizer[organizerId] ??
              const <Event>[],
      },
  };

  return [
    programEventsControllerProvider.overrideWith((ref, request) {
      final controller = ProgramEventsController(
        isActorCurrent: () => true,
        fetchPage: ({cursor, programId}) async =>
            OrganizerProgramInventoryPage(programs: programRows),
        mutate: (_, _) async =>
            throw StateError('Preview inventory is read only'),
        onMutation: (_) {},
      );
      ref.onDispose(controller.dispose);
      unawaited(controller.refresh());
      return controller;
    }),
    watchActiveEventsForOrganizerProvider.overrideWith(
      (ref, query) => Stream.value(
        timelineEventsByOrganizer[query.organizerId] ?? const <Event>[],
      ),
    ),
    hostAttentionProjectionProvider.overrideWith(
      (ref, organizerId) => Stream.value(
        HostAttentionProjection(
          organizerId: organizerId,
          policyVersion: hostAttentionPolicyVersion,
          items:
              attentionByOrganizer?[organizerId] ??
              captureTodayAttentionItems(
                timelineEventsByOrganizer[organizerId] ?? const <Event>[],
                HostOperationsFixtures.now,
              ),
          coverage: hostAttentionCatalogCoverage,
          evaluatedAt: HostOperationsFixtures.now,
          sourceCoverage: HostAttentionSourceCoverage.complete,
        ),
      ),
    ),
    hostTodayAttendanceOutboxProvider.overrideWith(
      (ref, accountId) async => const HostAttendanceOutboxSummary([]),
    ),
    hostAnalyticsDeviceTimezoneProvider.overrideWith(
      (ref) async => 'Asia/Kolkata',
    ),
    hostEventsTimelineControllerProvider.overrideWith2(
      (_) => CaptureHostEventsTimelineController(timelineEventsByOrganizer),
    ),
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(HostOperationsFixtures.owner),
    ),
    if (hostProfile == null)
      watchHostProfileProvider(
        uid,
      ).overrideWith((ref) => Stream.value(HostOperationsFixtures.hostProfile))
    else
      watchHostProfileProvider(uid).overrideWithValue(hostProfile),
    if (hostedOrganizersAsync == null)
      watchOrganizersHostedByProvider(
        uid,
      ).overrideWith((ref) => Stream.value(hosted))
    else
      watchOrganizersHostedByProvider(
        uid,
      ).overrideWithValue(hostedOrganizersAsync),
    if (ownedOrganizersAsync == null)
      watchOrganizersOwnedByProvider(
        uid,
      ).overrideWith((ref) => Stream.value(owned))
    else
      watchOrganizersOwnedByProvider(
        uid,
      ).overrideWithValue(ownedOrganizersAsync),
    watchHostPaymentAccountsProvider(
      uid,
    ).overrideWithValue(switch (paymentAccountValue) {
      AsyncData(:final value) => AsyncData(value == null ? const [] : [value]),
      AsyncError(:final error, :final stackTrace) =>
        AsyncError<List<HostPaymentAccount>>(error, stackTrace),
      _ => const AsyncLoading<List<HostPaymentAccount>>(),
    }),
    hostOrganizerEditControllerProvider.overrideWithValue(
      const CaptureNoopHostOrganizerEditActions(),
    ),
    hostPaymentAccountControllerProvider.overrideWithValue(
      const CaptureNoopHostPaymentAccountActions(),
    ),
    hostAnalyticsRepositoryProvider.overrideWithValue(analyticsRepository),
    for (final organizerId in eventOrganizerIds)
      organizerEventDraftsProvider(
        organizerId: organizerId,
      ).overrideWithValue(const AsyncData<List<EventDraft>>([])),
    for (final organizer in organizersById.values)
      organizerDetailViewModelProvider(organizer.id).overrideWithValue(
        AsyncData<OrganizerDetailViewModel?>(
          OrganizerDetailViewModel(
            organizer: organizer,
            isHost: true,
            isMember: false,
            upcomingEvents: switch (organizerEvents[organizer.id]) {
              AsyncData<List<Event>>(:final value) => value,
              _ =>
                HostOperationsFixtures.eventsByOrganizer[organizer.id] ??
                    const <Event>[],
            },
            reviews: const [],
            userProfile: HostOperationsFixtures.owner,
            uid: uid,
            isAuthenticated: true,
          ),
        ),
      ),
    for (final organizerId in eventOrganizerIds)
      if (organizerEvents.containsKey(organizerId))
        watchEventsForOrganizerProvider(
          organizerId,
        ).overrideWithValue(organizerEvents[organizerId]!)
      else
        watchEventsForOrganizerProvider(organizerId).overrideWith(
          (ref) => Stream.value(
            HostOperationsFixtures.eventsByOrganizer[organizerId] ??
                const <Event>[],
          ),
        ),
  ];
}

List<HostAttentionItem> captureTodayAttentionItems(
  Iterable<Event> events,
  DateTime now,
) => [
  for (final event in events)
    if (event.waitlistCount > 0 &&
        !event.effectiveEventPolicy.admissionPolicy.manualApprovalRequired)
      HostAttentionItem(
        id: 'capture-attention-${event.id}',
        kind: HostAttentionKind.eventWaitlistReview,
        scope: HostAttentionScope.event,
        sourceOwner: HostAttentionSourceOwner.events,
        sourceId: event.id,
        sourceRevision: 'capture-${event.waitlistCount}',
        eventId: event.id,
        status: HostAttentionStatus.open,
        consequence: HostAttentionConsequence.risksGuestExperience,
        blocking: false,
        urgency: event.startTime.difference(now) <= const Duration(hours: 24)
            ? HostAttentionUrgency.immediate
            : event.startTime.difference(now) <= const Duration(hours: 72)
            ? HostAttentionUrgency.soon
            : HostAttentionUrgency.upcoming,
        destination: HostAttentionDestination(
          route: HostAttentionDestinationRoute.hostEventManage,
          section: 'guests',
          eventId: event.id,
        ),
        context: HostAttentionContext(
          eventName: event.title,
          count: event.waitlistCount,
        ),
        dedupeKey: 'eventWaitlistReview:${event.id}',
        policyVersion: 1,
        resolutionVersion: 1,
        assignedHostUid: null,
        openedAt: now,
        dueAt: event.startTime.subtract(const Duration(hours: 24)),
        expiresAt: event.endTime,
      ),
];

class CaptureHostEventsTimelineController extends HostEventsTimelineController {
  CaptureHostEventsTimelineController(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<HostEventsTimelineData> build(
    HostEventsTimelineRequest request,
  ) async {
    final events = eventsByOrganizer[request.organizerId] ?? const <Event>[];
    return HostEventsTimelineData(
      activeEvents: events
          .where((event) => event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      activeCursor: null,
      pastCursor: null,
      hasMoreActive: false,
      hasMorePast: false,
    );
  }
}

final class CaptureNoopHostOrganizerEditActions
    implements HostOrganizerEditActions {
  const CaptureNoopHostOrganizerEditActions();

  @override
  Future<void> updateOrganizer({
    required String organizerId,
    required UpdateOrganizerPatch patch,
  }) async {}

  @override
  Future<List<HostPickedOrganizerPhoto>> pickOrganizerPhotos({
    int? limit,
  }) async => const [];

  @override
  Future<HostPickedOrganizerLogo?> pickOrganizerLogo() async => null;

  @override
  Future<HostOrganizerMediaSaveResult> updateOrganizerMedia({
    required Organizer organizer,
    List<HostOrganizerMediaInput>? photoInputs,
    HostPickedOrganizerLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostOrganizerMediaProgress>? onProgress,
  }) async => HostOrganizerMediaSaveResult(
    photoInputs: photoInputs,
    logo: logo,
    failures: const {},
    attached: true,
  );

  @override
  Future<void> discardOrganizerMedia({
    required List<HostOrganizerMediaInput> photoInputs,
    HostPickedOrganizerLogo? logo,
  }) async {}
}

final class CaptureNoopHostPaymentAccountActions
    implements HostPaymentAccountActions {
  const CaptureNoopHostPaymentAccountActions();

  @override
  Future<void> refreshStatus(HostPaymentProvider provider) async {}

  @override
  Future<void> startOnboarding({
    required HostPaymentProvider provider,
    required String country,
    required String defaultCurrency,
    RazorpayHostOnboardingDetails? razorpayDetails,
  }) async {}
}
