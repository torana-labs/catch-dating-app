import 'dart:async';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/companion/event_success_companion_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_keys.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_workspace_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_setup_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_section_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_host_live_page_body.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart'
    show buildEvent, buildEventParticipation, buildPublicProfile, buildUser;
import '../test_pump_helpers.dart';
import 'event_success_live_test_helpers.dart';

part 'event_success_companion_flow_tests.dart';
part 'event_success_companion_profiles_tests.dart';
part 'event_success_host_live_tests.dart';
part 'event_success_host_setup_tests.dart';
part 'event_success_live_host_completion_tests.dart';

final _l10n = AppLocalizationsEn();

void main() {
  _registerEventSuccessHostSetupTests();
  _registerEventSuccessHostLiveTests();
  _registerEventSuccessCompanionFlowTests();
  _registerEventSuccessCompanionProfilesTests();
}

EventSuccessPlan _withGuidedRotations(EventSuccessPlan plan) {
  final moduleIds = {
    ...plan.selectedModuleIds,
    EventSuccessModuleCatalog.guidedRotations.id,
  }.toList()..sort();
  return plan.copyWith(selectedModuleIds: moduleIds);
}

EventSuccessPlan _withLiveReveal(EventSuccessPlan plan) {
  final moduleIds = {
    ...plan.selectedModuleIds,
    EventSuccessModuleCatalog.liveReveal.id,
  }.toList()..sort();
  return plan.copyWith(selectedModuleIds: moduleIds);
}

EventSuccessPlan _racketPlan(Event event) {
  final moduleIds =
      EventSuccessPlaybookLibrary.pickleball.moduleIds
          .where(
            (id) =>
                id != EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
          )
          .toList()
        ..sort();
  return EventSuccessPlan.defaultForEvent(event, now: event.startTime).copyWith(
    playbookId: EventSuccessPlaybookLibrary.pickleball.id,
    selectedModuleIds: moduleIds,
  );
}

Event _racketEvent({required DateTime startTime, required DateTime endTime}) {
  return buildEvent(
    startTime: startTime,
    endTime: endTime,
    eventFormat: const EventFormatSnapshot(
      activityKind: ActivityKind.pickleball,
      interactionModel: EventInteractionModel.pairedRotations,
      defaultPlaybookId: 'pickleball_rotations',
      // These tests exercise the assignment-payload ceremony. Rank formats
      // use the standings-payload ceremony covered by the focused T7 tests.
      eventSuccessPrimitives: {'unitOutcome': 'none'},
    ),
    distanceKm: 0,
    meetingPoint: 'Court 2 by the clubhouse',
  );
}

extension on EventSuccessAssignment {
  EventSuccessAssignment copyWithPeerUids(List<String> peerUids) {
    return EventSuccessAssignment(
      id: id,
      eventId: eventId,
      clubId: clubId,
      uid: this.uid,
      moduleId: moduleId,
      label: label,
      displayTitle: displayTitle,
      displaySubtitle: displaySubtitle,
      peerUids: peerUids,
      rotationSlots: rotationSlots,
      groupRotationSlots: groupRotationSlots,
      source: source,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

EventSuccessAssignment _assignment({
  required Event event,
  required String uid,
  required String label,
  required DateTime now,
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
    displayTitle: label,
    displaySubtitle: 'Generated pod.',
    peerUids: const [],
    source: 'server_v1',
    createdAt: now,
    updatedAt: now,
  );
}

EventSuccessAssignment _rotationAssignment({
  required Event event,
  required String uid,
  required String peerUid,
  required DateTime now,
  required int roundCount,
  String source = 'server_v1',
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
    label: 'Guided rotations',
    displayTitle: '$roundCount guided rotation${roundCount == 1 ? '' : 's'}',
    displaySubtitle: '15-minute pairings during the event.',
    peerUids: [peerUid],
    rotationSlots: [
      for (var index = 0; index < roundCount; index++)
        EventSuccessRotationSlot(
          roundIndex: index,
          label: 'Round ${index + 1}',
          startsAt: now.add(Duration(minutes: index * 15)),
          endsAt: now.add(Duration(minutes: (index + 1) * 15)),
          peerUid: peerUid,
          compatibility: 'mutual_interest',
        ),
    ],
    source: source,
    createdAt: now,
    updatedAt: now,
  );
}

EventSuccessWingmanRequest _wingmanRequest({
  required Event event,
  required String requesterUid,
  required String targetUid,
  required DateTime now,
  String? note,
}) {
  return EventSuccessWingmanRequest(
    id: eventSuccessWingmanRequestId(eventId: event.id, uid: requesterUid),
    eventId: event.id,
    clubId: event.clubId,
    requesterUid: requesterUid,
    targetUid: targetUid,
    status: EventSuccessWingmanRequestStatus.active,
    hostVisibleConsent: true,
    note: note,
    createdAt: now,
    updatedAt: now,
  );
}

EventAttendee _accountabilityAttendee({
  required Event event,
  required String id,
  required String displayName,
}) {
  final checkedInAt = event.startTime.add(const Duration(minutes: 5));
  return EventAttendee(
    id: id,
    eventId: event.id,
    clubId: event.clubId,
    organizerId: event.organizerId,
    displayName: displayName,
    searchName: displayName.toLowerCase(),
    source: EventAttendeeSource.hostImport,
    status: EventAttendeeStatus.checkedIn,
    createdAt: event.startTime,
    updatedAt: checkedInAt,
    checkedInAt: checkedInAt,
  );
}

Finder _toggle(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchToggleInput && widget.semanticLabel == label,
  );
}

class _WingmanTestFirebaseFunctions extends Fake implements FirebaseFunctions {
  _WingmanTestFirebaseFunctions(this._firestore, {required this.requesterUid});

  final FirebaseFirestore _firestore;
  final String requesterUid;

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return _WingmanTestHttpsCallable(
      name,
      firestore: _firestore,
      requesterUid: requesterUid,
    );
  }
}

class _FakeEventSuccessLiveEffectsController
    extends EventSuccessLiveEffectsController {
  _FakeEventSuccessLiveEffectsController();

  final List<EventSuccessLiveEffectKind> playedKinds = [];

  @override
  Future<void> play(EventSuccessLiveEffectKind kind) async {
    playedKinds.add(kind);
  }
}

class _WingmanTestHttpsCallable extends Fake implements HttpsCallable {
  _WingmanTestHttpsCallable(
    this.name, {
    required this._firestore,
    required this.requesterUid,
  });

  final String name;
  final FirebaseFirestore _firestore;
  final String requesterUid;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    final payload = Map<String, Object?>.from(parameters as Map);
    final eventId = payload['eventId'] as String;
    if (name == 'submitEventSuccessWingmanRequest') {
      final now = Timestamp.fromDate(DateTime(2026, 5, 21));
      await _firestore
          .collection('eventSuccessWingmanRequests')
          .doc(
            eventSuccessWingmanRequestId(eventId: eventId, uid: requesterUid),
          )
          .set({
            'eventId': eventId,
            'clubId': 'club-1',
            'requesterUid': requesterUid,
            'targetUid': payload['targetUid'],
            'status': 'active',
            'hostVisibleConsent': true,
            'note': payload['note'],
            'createdAt': now,
            'updatedAt': now,
          });
    } else if (name == 'withdrawEventSuccessWingmanRequest') {
      await _firestore
          .collection('eventSuccessWingmanRequests')
          .doc(
            eventSuccessWingmanRequestId(eventId: eventId, uid: requesterUid),
          )
          .update({'status': 'withdrawn'});
    }
    return _WingmanTestHttpsCallableResult<T>(null as T);
  }
}

class _WingmanTestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  _WingmanTestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}
