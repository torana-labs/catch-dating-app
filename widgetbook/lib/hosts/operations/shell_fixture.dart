import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_roadmap_provider.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_view_model.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'role_theme.dart';

/// The organizer CRM rollup every host shell preview reads.
HostCrmSummary widgetbookHostCrmSummary(String organizerId) => HostCrmSummary(
  organizerId: organizerId,
  contactCount: 214,
  pastAttendeeCount: 148,
  repeatAttendeeCount: 37,
  linkedAccountCount: 92,
  importedContactCount: 61,
  whatsappOptInCount: 74,
  smsOptInCount: 29,
  truncated: false,
  inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
  whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
  smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
);

class WidgetbookHostShellScope extends StatelessWidget {
  const WidgetbookHostShellScope({
    super.key,
    required this.child,
    this.uid = 'design-host-owner',
    this.hostedOrganizers,
    this.ownedOrganizers,
    this.hostProfileStream,
    this.hostedOrganizersStream,
    this.ownedOrganizersStream,
    this.organizerEventStreams = const {},
    this.paymentAccountValue,
    this.analyticsRepository = const HostFixtureAnalyticsRepository(),
    this.themeMode = ThemeMode.light,
  });

  final Widget child;
  final String? uid;
  final List<Organizer>? hostedOrganizers;
  final List<Organizer>? ownedOrganizers;
  final Stream<HostProfile?>? hostProfileStream;
  final Stream<List<Organizer>>? hostedOrganizersStream;
  final Stream<List<Organizer>>? ownedOrganizersStream;
  final Map<String, Stream<List<Event>>> organizerEventStreams;
  final AsyncValue<HostPaymentAccount?>? paymentAccountValue;
  final HostAnalyticsRepository analyticsRepository;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final effectiveHostedOrganizers = hostedOrganizers ?? HostOperationsFixtures.organizers;
    final effectiveOwnedOrganizers =
        ownedOrganizers ??
        [HostOperationsFixtures.primaryOrganizer, HostOperationsFixtures.dinnerOrganizer];
    final effectiveUid = uid ?? widgetbookHostUid;
    final eventOrganizerIds = <String>{
      for (final organizer in HostOperationsFixtures.organizers) organizer.id,
      for (final organizer in effectiveHostedOrganizers) organizer.id,
      for (final organizer in effectiveOwnedOrganizers) organizer.id,
      ...organizerEventStreams.keys,
    };
    final organizersById = <String, Organizer>{
      for (final organizer in HostOperationsFixtures.organizers) organizer.id: organizer,
      for (final organizer in effectiveHostedOrganizers) organizer.id: organizer,
      for (final organizer in effectiveOwnedOrganizers) organizer.id: organizer,
    };
    final overrides = [
      programEventsControllerProvider.overrideWith((ref, request) {
        final controller = ProgramEventsController(
          isActorCurrent: () => true,
          fetchPage: ({cursor, programId}) async =>
              OrganizerProgramInventoryPage(programs: const []),
          mutate: (_, _) async =>
              throw StateError('Preview inventory is read only'),
          onMutation: (_) {},
        );
        ref.onDispose(controller.dispose);
        unawaited(controller.refresh());
        return controller;
      }),
      hostTodayPreferenceProvider.overrideWith(
        (ref, scope) async => const HostTodayPreference.skipped(),
      ),
      hostTodayRoadmapProvider.overrideWith(
        (ref, scope) => const HostTodayRoadmapEvidence(),
      ),
      hostTodayFeedControllerProvider.overrideWith2(
        (_) => _WidgetbookHostTodayFeedController(organizerEventStreams),
      ),
      hostEventsTimelineControllerProvider.overrideWith2(
        (_) => _WidgetbookHostEventsTimelineController(organizerEventStreams),
      ),
      uidProvider.overrideWithValue(AsyncData<String?>(uid)),
      watchHostProfileProvider(effectiveUid).overrideWith(
        (ref) =>
            hostProfileStream ??
            Stream<HostProfile?>.value(HostOperationsFixtures.hostProfile),
      ),
      watchOrganizersHostedByProvider(effectiveUid).overrideWith(
        (ref) =>
            hostedOrganizersStream ?? Stream<List<Organizer>>.value(effectiveHostedOrganizers),
      ),
      watchOrganizersOwnedByProvider(effectiveUid).overrideWith(
        (ref) =>
            ownedOrganizersStream ?? Stream<List<Organizer>>.value(effectiveOwnedOrganizers),
      ),
      watchHostPaymentAccountsProvider(effectiveUid).overrideWithValue(
        switch (paymentAccountValue) {
          AsyncData(:final value) => AsyncData(
            value == null ? const [] : [value],
          ),
          AsyncError(:final error, :final stackTrace) =>
            AsyncError<List<HostPaymentAccount>>(error, stackTrace),
          _ => const AsyncLoading<List<HostPaymentAccount>>(),
        },
      ),
      hostOrganizerEditControllerProvider.overrideWithValue(
        const _NoopHostOrganizerEditActions(),
      ),
      hostPaymentAccountControllerProvider.overrideWithValue(
        const _NoopHostPaymentAccountActions(),
      ),
      hostAnalyticsRepositoryProvider.overrideWithValue(analyticsRepository),
      hostTrackingSettingsRepositoryProvider.overrideWithValue(
        const _WidgetbookTrackingSettingsRepository(),
      ),
    ];
    for (final clubId in eventOrganizerIds) {
      final organizer = organizersById[clubId];
      if (organizer != null) {
        overrides.add(
          organizerDetailViewModelProvider(clubId).overrideWithValue(
            AsyncData<OrganizerDetailViewModel?>(
              OrganizerDetailViewModel(
                organizer: organizer,
                isHost: true,
                isMember: false,
                upcomingEvents:
                    HostOperationsFixtures.eventsByOrganizer[clubId] ?? const [],
                reviews: const [],
                userProfile: uid == null ? null : HostOperationsFixtures.owner,
                uid: uid,
                isAuthenticated: uid != null,
              ),
            ),
          ),
        );
      }
      overrides.addAll([
        watchEventsForOrganizerProvider(clubId).overrideWith(
          (ref) =>
              organizerEventStreams[clubId] ??
              Stream<List<Event>>.value(
                HostOperationsFixtures.eventsByOrganizer[clubId] ?? const [],
              ),
        ),
        hostCrmSummaryProvider(
          clubId,
        ).overrideWithValue(AsyncData(widgetbookHostCrmSummary(clubId))),
      ]);
    }

    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: overrides,
        child: WidgetbookThemedHostPreview(themeMode: themeMode, child: child),
      ),
    );
  }
}

class _WidgetbookHostTodayFeedController extends HostTodayFeedController {
  _WidgetbookHostTodayFeedController(this.eventStreamsByOrganizer);

  final Map<String, Stream<List<Event>>> eventStreamsByOrganizer;

  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) async {
    final events = await _readWidgetbookEvents(
      ref,
      eventStreamsByOrganizer[request.organizerId] ??
          Stream<List<Event>>.value(
            HostOperationsFixtures.eventsByOrganizer[request.organizerId] ??
                const [],
          ),
    );
    return HostTodayFeedData(
      activeEvents: events
          .where((event) => event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      attentionItems: widgetbookTodayAttentionItems(
        events.where((event) => event.endTime.isAfter(request.sessionBoundary)),
        request.sessionBoundary,
      ),
    );
  }
}

List<HostAttentionItem> widgetbookTodayAttentionItems(
  Iterable<Event> events,
  DateTime now,
) {
  final event = events.firstOrNull;
  if (event == null) return const <HostAttentionItem>[];
  return <HostAttentionItem>[
    HostAttentionItem(
      id: 'widgetbook-attention-${event.id}',
      kind: HostAttentionKind.eventWaitlistReview,
      scope: HostAttentionScope.event,
      sourceOwner: HostAttentionSourceOwner.events,
      sourceId: event.id,
      sourceRevision: 'widgetbook-${event.waitlistCount}',
      eventId: event.id,
      status: HostAttentionStatus.open,
      consequence: HostAttentionConsequence.risksGuestExperience,
      blocking: false,
      urgency: HostAttentionUrgency.immediate,
      destination: HostAttentionDestination(
        route: HostAttentionDestinationRoute.hostEventManage,
        section: 'guests',
        eventId: event.id,
      ),
      context: HostAttentionContext(
        eventName: event.title,
        count: event.waitlistCount == 0 ? 6 : event.waitlistCount,
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
}

class _WidgetbookHostEventsTimelineController
    extends HostEventsTimelineController {
  _WidgetbookHostEventsTimelineController(this.eventStreamsByOrganizer);

  final Map<String, Stream<List<Event>>> eventStreamsByOrganizer;

  @override
  Future<HostEventsTimelineData> build(
    HostEventsTimelineRequest request,
  ) async {
    final stream =
        eventStreamsByOrganizer[request.organizerId] ??
        Stream<List<Event>>.value(
          HostOperationsFixtures.eventsByOrganizer[request.organizerId] ?? const [],
        );
    final events = await _readWidgetbookEvents(ref, stream);
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

Future<List<Event>> _readWidgetbookEvents(
  Ref ref,
  Stream<List<Event>> stream,
) async {
  final completer = Completer<List<Event>>();
  late final StreamSubscription<List<Event>> subscription;
  subscription = stream.listen(
    (events) {
      if (!completer.isCompleted) completer.complete(events);
      unawaited(subscription.cancel());
    },
    onError: (Object error, StackTrace stackTrace) {
      if (!completer.isCompleted) completer.completeError(error, stackTrace);
      unawaited(subscription.cancel());
    },
  );
  ref.onDispose(() => unawaited(subscription.cancel()));
  return completer.future;
}

final class _NoopHostOrganizerEditActions implements HostOrganizerEditActions {
  const _NoopHostOrganizerEditActions();

  @override
  Future<void> updateOrganizer({
    required String clubId,
    required UpdateOrganizerPatch patch,
  }) async {}

  @override
  Future<List<HostPickedOrganizerPhoto>> pickOrganizerPhotos({int? limit}) async =>
      const [];

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

final class _NoopHostPaymentAccountActions
    implements HostPaymentAccountActions {
  const _NoopHostPaymentAccountActions();

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

class _WidgetbookTrackingSettingsRepository
    implements HostTrackingSettingsRepository {
  const _WidgetbookTrackingSettingsRepository();
  @override
  Future<HostTrackingSettings> read(String organizerId) async =>
      HostTrackingSettings(
        organizerId: organizerId,
        revision: 0,
        metaPixelId: null,
        googleMeasurementId: null,
        enabled: false,
        publicationAllowed: false,
        canEdit: true,
        editBlockedReason: 'none',
      );
  @override
  Future<HostTrackingSettings> save(
    SetOrganizerTrackingSettingsCallableRequest request,
  ) async => HostTrackingSettings(
    organizerId: request.organizerId,
    revision: request.expectedRevision + 1,
    metaPixelId: request.metaPixelId,
    googleMeasurementId: request.googleMeasurementId,
    enabled: false,
    publicationAllowed: false,
    canEdit: true,
    editBlockedReason: 'none',
  );
}
