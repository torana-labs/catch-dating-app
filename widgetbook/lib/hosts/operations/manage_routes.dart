import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'manage_fixture.dart';
import 'preview.dart';

final _hostManageDisabledInviteLinks = <EventInviteLink>[
  HostOperationsFixtures.inviteLinks.first.copyWith(
    id: 'design-host-link-disabled-edge',
    label: 'Alumni WhatsApp paused',
    source: 'whatsapp alumni',
    openCount: 88,
    requestCount: 14,
    confirmedCount: 6,
    checkedInCount: 3,
    catcherCount: 2,
    chatStartedCount: 2,
    disabledAt: HostOperationsFixtures.now.subtract(const Duration(hours: 3)),
    updatedAt: HostOperationsFixtures.now.subtract(const Duration(hours: 3)),
  ),
];

final _hostManageLongLabelInviteLinks = <EventInviteLink>[
  HostOperationsFixtures.inviteLinks.first.copyWith(
    id: 'design-host-link-long-label-source',
    label: 'Partner newsletter referral with venue concierge follow-up',
    source: 'partner newsletter / co-working founders circle / June RSVP push',
    openCount: 214,
    requestCount: 43,
    confirmedCount: 18,
    checkedInCount: 9,
    catcherCount: 5,
    chatStartedCount: 7,
    disabledAt: null,
    updatedAt: HostOperationsFixtures.now.subtract(const Duration(minutes: 25)),
  ),
];

@widgetbook.UseCase(
  name: 'Route and section states',
  type: HostEventManageRouteScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostEventManageRouteAndSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostEventManageRouteScreen',
    contractId: 'screen.host.event.manage',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            clubValue: const AsyncLoading<Club?>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            clubValue: AsyncError<Club?>(
              StateError('Club fetch failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route offline',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            clubValue: AsyncError<Club?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'event not found',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            eventValue: AsyncData<Event?>(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'unauthorized host',
        child: const WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            uid: HostOperationsFixtures.guestUid,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'setup workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'guests workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.guests,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'live workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.live,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'report workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.report,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'invite links loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            inviteLinksValue: AsyncLoading<List<EventInviteLink>>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'invite links error',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            inviteLinksValue: AsyncError<List<EventInviteLink>>(
              StateError('Invite links failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'invite links offline',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            inviteLinksValue: AsyncError<List<EventInviteLink>>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'disabled invite link',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            inviteLinksValue: AsyncData<List<EventInviteLink>>(
              _hostManageDisabledInviteLinks,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long invite labels',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            inviteLinksValue: AsyncData<List<EventInviteLink>>(
              _hostManageLongLabelInviteLinks,
            ),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'guest roster loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.guests,
            attendanceValue: AsyncLoading<AttendanceSheetViewModel?>(),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'attendee profiles loading',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            initialSection: HostEventManageSection.guests,
            attendeeProfilesValue:
                AsyncLoading<Map<String, (String, String?)>>(),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'private access unavailable',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostManageRouteScope(
            privateAccessValue: AsyncData<EventPrivateAccess?>(null),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'attendance mutation pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostManageAttendanceMutationRoutePreview(
            mode: _HostManageAttendanceMutationPreviewMode.pending,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'attendance mutation error',
        child: WidgetbookHostDeviceFrame(
          child: _HostManageAttendanceMutationRoutePreview(
            mode: _HostManageAttendanceMutationPreviewMode.error,
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'live Event Success operations',
        child: WidgetbookHostDeviceFrame(
          child: _HostManageLiveOperationsRoutePreview(),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: TextScaler.linear(2),
            child: WidgetbookHostManageRouteScope(),
          ),
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: WidgetbookHostManageRouteScope(),
          ),
        ),
      ),
    ],
  );
}

enum _HostManageAttendanceMutationPreviewMode { pending, error }

class _HostManageAttendanceMutationRoutePreview extends StatelessWidget {
  const _HostManageAttendanceMutationRoutePreview({required this.mode});

  final _HostManageAttendanceMutationPreviewMode mode;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final event = widgetbookPrivateEvent.copyWith(
      startTime: now.subtract(const Duration(minutes: 45)),
      endTime: now.add(const Duration(minutes: 45)),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: now).copyWith(
      activeStepIndex: 1,
      status: EventSuccessPlanStatus.live,
      frozenAt: now,
    );
    return _HostManageAttendanceMutationPreview(
      mode: mode,
      child: WidgetbookHostManageRouteScope(
        event: event,
        initialSection: HostEventManageSection.live,
        planValue: AsyncData<EventSuccessPlan?>(plan),
      ),
    );
  }
}

class _HostManageAttendanceMutationPreview extends ConsumerStatefulWidget {
  const _HostManageAttendanceMutationPreview({
    required this.mode,
    required this.child,
  });

  final _HostManageAttendanceMutationPreviewMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManageAttendanceMutationPreview> createState() =>
      _HostManageAttendanceMutationPreviewState();
}

class _HostManageAttendanceMutationPreviewState
    extends ConsumerState<_HostManageAttendanceMutationPreview> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    _resetMutations();
    switch (widget.mode) {
      case _HostManageAttendanceMutationPreviewMode.pending:
        _runPending(HostEventBookingController.createWaitlistOfferMutation);
        break;
      case _HostManageAttendanceMutationPreviewMode.error:
        _runError(
          HostEventBookingController.markAttendanceMutation,
          StateError('Widgetbook attendance mutation failed'),
        );
        break;
    }
  }

  void _resetMutations() {
    HostEventBookingController.markAttendanceMutation.reset(ref);
    HostEventBookingController.approveJoinRequestMutation.reset(ref);
    HostEventBookingController.declineJoinRequestMutation.reset(ref);
    HostEventBookingController.createWaitlistOfferMutation.reset(ref);
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

Event _hostManageLiveRevealEvent(Event event) {
  return event.copyWith(
    eventFormat: EventFormatSnapshot.custom(
      label: 'trivia night',
      interactionModel: EventInteractionModel.teamRotations,
    ),
    distanceKm: 0,
    capacityLimit: 30,
    bookedCount: 24,
    checkedInCount: 18,
  );
}

EventSuccessPlan _hostManageLivePlanForModule({
  required Event event,
  required DateTime now,
  required String moduleId,
}) {
  final basePlan = EventSuccessPlan.defaultForEvent(
    event,
    now: now,
  ).copyWith(status: EventSuccessPlanStatus.live, frozenAt: now);
  final runtime = EventSuccessRuntime(plan: basePlan, event: event, now: now);
  final steps = runtime.runOfShowSteps;
  final activeIndex = steps.indexWhere(
    (step) => step.moduleIds.contains(moduleId),
  );
  return basePlan.copyWith(activeStepIndex: activeIndex < 0 ? 0 : activeIndex);
}

List<EventSuccessAssignment> _hostManageMicroPodAssignments({
  required Event event,
  required DateTime now,
  String source = 'widgetbook_fixture',
}) {
  return [
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.guestUid,
      label: 'Pod A',
      title: 'Pace Pod A',
      peerUids: const [
        HostOperationsFixtures.secondGuestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      now: now,
      source: source,
    ),
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.secondGuestUid,
      label: 'Pod A',
      title: 'Pace Pod A',
      peerUids: const [
        HostOperationsFixtures.guestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      now: now,
      source: source,
    ),
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.waitlistUid,
      label: 'Pod B',
      title: 'Pace Pod B',
      peerUids: const [HostOperationsFixtures.guestUid],
      now: now,
      source: source,
    ),
  ];
}

EventSuccessAssignment _hostManageAssignment({
  required Event event,
  required String uid,
  required String label,
  required String title,
  required List<String> peerUids,
  required DateTime now,
  String source = 'widgetbook_fixture',
}) {
  return EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: event.id,
      moduleId: EventSuccessModuleCatalog.microPods.id,
      uid: uid,
    ),
    eventId: event.id,
    clubId: event.clubId,
    uid: uid,
    moduleId: EventSuccessModuleCatalog.microPods.id,
    label: label,
    displayTitle: title,
    displaySubtitle: 'Start here, then follow the host cue.',
    peerUids: peerUids,
    unitKind: 'pods',
    unitLabel: label,
    source: source,
    createdAt: now.subtract(const Duration(minutes: 12)),
    updatedAt: now,
  );
}

List<EventSuccessAssignment> _hostManageRotationAssignments({
  required Event event,
  required DateTime now,
}) {
  final round0 = event.startTime.add(const Duration(minutes: 15));
  final round1 = round0.add(const Duration(minutes: 15));
  return [
    _hostManageRotationAssignment(
      event: event,
      uid: HostOperationsFixtures.guestUid,
      peerUids: const [
        HostOperationsFixtures.secondGuestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      slots: [
        _hostManageRotationSlot(
          index: 0,
          startsAt: round0,
          peerUid: HostOperationsFixtures.secondGuestUid,
          compatibility: 'mutual_interest',
        ),
        _hostManageRotationSlot(
          index: 1,
          startsAt: round1,
          peerUid: HostOperationsFixtures.waitlistUid,
          compatibility: 'questionnaire_match',
        ),
      ],
      now: now,
    ),
    _hostManageRotationAssignment(
      event: event,
      uid: HostOperationsFixtures.secondGuestUid,
      peerUids: const [HostOperationsFixtures.guestUid],
      slots: [
        _hostManageRotationSlot(
          index: 0,
          startsAt: round0,
          peerUid: HostOperationsFixtures.guestUid,
          compatibility: 'mutual_interest',
        ),
      ],
      now: now,
    ),
  ];
}

EventSuccessAssignment _hostManageRotationAssignment({
  required Event event,
  required String uid,
  required List<String> peerUids,
  required List<EventSuccessRotationSlot> slots,
  required DateTime now,
}) {
  return EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: event.id,
      moduleId: EventSuccessModuleCatalog.guidedRotations.id,
      uid: uid,
    ),
    eventId: event.id,
    clubId: event.clubId,
    uid: uid,
    moduleId: EventSuccessModuleCatalog.guidedRotations.id,
    label: 'Rotation schedule',
    displayTitle: 'Guided rotation schedule',
    displaySubtitle: 'Host-edited preview schedule.',
    peerUids: peerUids,
    rotationSlots: slots,
    source: 'host_override_v1',
    createdAt: now.subtract(const Duration(minutes: 12)),
    updatedAt: now,
  );
}

EventSuccessRotationSlot _hostManageRotationSlot({
  required int index,
  required DateTime startsAt,
  required String peerUid,
  required String compatibility,
}) {
  return EventSuccessRotationSlot(
    roundIndex: index,
    label: 'Round ${index + 1}',
    startsAt: startsAt,
    endsAt: startsAt.add(const Duration(minutes: 15)),
    peerUid: peerUid,
    compatibility: compatibility,
  );
}

List<EventSuccessPreference> _hostManagePreferences({
  required Event event,
  required DateTime now,
}) {
  return [
    EventSuccessPreference(
      id: eventSuccessPreferenceId(
        eventId: event.id,
        uid: HostOperationsFixtures.waitlistUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      uid: HostOperationsFixtures.waitlistUid,
      microPodsOptedOut: false,
      guidedRotationsOptedOut: false,
      createdAt: now.subtract(const Duration(minutes: 20)),
      updatedAt: now.subtract(const Duration(minutes: 3)),
    ),
  ];
}

List<EventSuccessWingmanRequest> _hostManageWingmanRequests({
  required Event event,
  required DateTime now,
}) {
  return [
    EventSuccessWingmanRequest(
      id: eventSuccessWingmanRequestId(
        eventId: event.id,
        uid: HostOperationsFixtures.guestUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      requesterUid: HostOperationsFixtures.guestUid,
      targetUid: HostOperationsFixtures.secondGuestUid,
      status: EventSuccessWingmanRequestStatus.active,
      hostVisibleConsent: true,
      note: 'Pair me if it feels natural.',
      createdAt: now.subtract(const Duration(minutes: 8)),
      updatedAt: now.subtract(const Duration(minutes: 2)),
    ),
    EventSuccessWingmanRequest(
      id: eventSuccessWingmanRequestId(
        eventId: event.id,
        uid: HostOperationsFixtures.waitlistUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      requesterUid: HostOperationsFixtures.waitlistUid,
      targetUid: HostOperationsFixtures.guestUid,
      status: EventSuccessWingmanRequestStatus.active,
      hostVisibleConsent: true,
      note: 'I would like a quick intro near the host table.',
      createdAt: now.subtract(const Duration(minutes: 5)),
      updatedAt: now.subtract(const Duration(minutes: 1)),
    ),
  ];
}

List<PublicProfile> _hostManageProfilesFor(List<String> uids) {
  const names = <String, String>{
    HostOperationsFixtures.guestUid: 'Aarav Mehta',
    HostOperationsFixtures.secondGuestUid: 'Rhea Kapoor',
    HostOperationsFixtures.waitlistUid: 'Kabir Jain',
  };
  return [
    for (final uid in uids.toSet())
      PublicProfile(
        uid: uid,
        name: names[uid] ?? 'Guest',
        age: 29,
        gender: Gender.man,
        city: 'Mumbai',
      ),
  ];
}

class _HostManageLiveOperationsRoutePreview extends StatelessWidget {
  const _HostManageLiveOperationsRoutePreview();

  @override
  Widget build(BuildContext context) {
    final now = HostOperationsFixtures.now;
    final event = _hostManageLiveRevealEvent(widgetbookPrivateEvent);
    final assignments = _hostManageMicroPodAssignments(event: event, now: now);
    final rotationAssignments = _hostManageRotationAssignments(
      event: event,
      now: now,
    );
    final preferences = _hostManagePreferences(event: event, now: now);
    final wingmanRequests = _hostManageWingmanRequests(event: event, now: now);
    final assignmentPeerProfiles = _hostManageProfilesFor(
      widgetbookHostManageAssignmentParticipantUids(assignments),
    );
    final rotationPeerProfiles = _hostManageProfilesFor(
      widgetbookHostManageAssignmentParticipantUids(rotationAssignments),
    );
    final wingmanProfiles = _hostManageProfilesFor(
      widgetbookHostManageWingmanProfileUids(wingmanRequests),
    );

    return WidgetbookHostManageRouteScope(
      club: widgetbookClub,
      event: event,
      planValue: AsyncData<EventSuccessPlan?>(
        _hostManageLivePlanForModule(
          event: event,
          now: now,
          moduleId: EventSuccessModuleCatalog.liveReveal.id,
        ),
      ),
      scorecardValue: const AsyncLoading<EventSuccessScorecard?>(),
      assignments: assignments,
      rotationAssignments: rotationAssignments,
      preferences: preferences,
      wingmanRequests: wingmanRequests,
      assignmentPeerProfiles: assignmentPeerProfiles,
      rotationPeerProfiles: rotationPeerProfiles,
      wingmanProfiles: wingmanProfiles,
      participations: HostOperationsFixtures.participations,
      initialSection: HostEventManageSection.live,
      initialParticipantSearchQuery: 'rhea',
    );
  }
}
